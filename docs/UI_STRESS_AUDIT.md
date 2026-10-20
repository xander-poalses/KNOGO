# KNOGO UI Stress Audit

20 October 2026. The four findings below were fixed after approval. Original observations are retained for reference. No database records or schema were changed.

## Scope and Test View

Tested the shared list tile, virtualised list, place detail screen, filter sheet and fuel settings form. The dev route supplies fixtures at the props/context boundary. Existing components, layout rules and search code remain unchanged. Fuel saves remain in component state; fixture refresh and save-place actions do nothing. Fixture IDs start with `audit-` and do not refer to businesses. No reports were submitted.

Open <http://localhost:8081/dev/ui-audit?data=worst&surface=list&mode=dark&placeId=audit-0>.

Bottom controls: Demo data / Worst case / Empty / One / 1,000 rows; list / detail / filters / fuel; light / dark. Dataset, surface and theme persist in the URL. Select a row to inspect its detail screen. This route renders nothing outside web development builds. It does not change saved theme or fuel preferences.

## Findings

| # | Severity | Field and input | Observed result | Proposed fix |
|---|---|---|---|---|
| 1 | Broken | Search: `王秀英`, `Cafe`, `Café` | Chinese query returns all eight places; `Cafe` returns zero, although `Café` returns one. Shared normalisation discards letters outside ASCII instead of preserving letters and folding accents. | Preserve Unicode letters/numbers and normalise accents in `packages/core/src/utils/filters.ts:86`. Add Chinese, Arabic and accent-equivalence tests. |
| 2 | Broken | Place name: whitespace | List row has no name or initial; detail screen exposes a whitespace heading. SQL `text NOT NULL` does not reject whitespace; no name-length cap was found. This is a malformed-record case, not a claim that current business data is missing names. | Reject blank names at ingestion; show a fallback title for existing malformed records at `apps/mobile/src/components/PlaceCards.tsx:98` and the detail heading. Match validation to the data contract before choosing a length cap. |
| 3 | Ugly | Fallback image: emoji-first name | The title renders the emoji, but its fallback initial renders a replacement symbol. DOM contains a lone UTF-16 surrogate. | Take a grapheme or use an icon fallback instead of `charAt(0)` in `apps/mobile/src/components/PlaceLogo.tsx:7`. |
| 4 | Fragile | Fuel price `1001`; consumption above `100` | Save is rejected, but the message says "Enter a number above zero", even though the input is above zero. The user is not told the upper bound or which field failed. | Name the field and its permitted range in `apps/mobile/src/components/FuelPreferencesForm.tsx:37`; retain numeric validation. |

All four findings were reproduced in the browser, apart from the consumption upper-bound variant of #4, which followed the same inspected branch as the reproduced price case. Fix verification is below.

## Fix Verification

1. Shared search now preserves Unicode letters/numbers/marks and folds accents in the combining-diacritic block. Browser checks return one matching place for each of `Cafe`, Chinese and Arabic queries. Regression tests cover composed/decomposed accents, case and symbol-only queries. A query consisting only of discarded symbols no longer becomes an unfiltered search.
2. List/grid cards and the detail heading show `Unnamed place` for whitespace names without hiding or mutating the record. The importer already rejected whitespace names; new tests prove that existing guard. No migration or record edits were needed. No arbitrary name-length cap was introduced.
3. Fallback initials retain a leading letter/number and combining marks. Names beginning with emoji or without an initial use the existing location icon. Tests include a joined emoji sequence, whitespace and a decomposed accented initial. Browser rendering shows the icon instead of a replacement character.
4. Fuel errors now name the field and accepted range: consumption above 0 through 100 L/100 km, or at least 1 km/l; price above R0 through R1,000 per litre. Numeric validation and clear/retry behaviour remain. Browser check at 320 px shows the price message wrapping without overflow. Tests cover zero, negatives, NaN, Infinity, both consumption units and over-limit prices.

Verification: 321 core/web tests and 523 mobile tests passed; root and mobile TypeScript checks passed. Demo, Worst case, Empty, One and 1,000-row list fixtures were rerun after the fixes. The dev-only controls and fixtures remain. Hardware and environment limits below still apply.

## Decisions

- Keep place names wrapping. At 320 px, the longest detail title occupies seven lines, but remains readable and actions remain reachable. Truncation would hide the identity of the place.
- For malformed names, recommend an unnamed-place fallback plus ingestion rejection, rather than hiding the row and making an existing record inaccessible.
- Keep the emoji in the title. Use a grapheme-aware initial or an icon in the fallback image; either avoids a replacement symbol.

## What Held Up

- List and detail names wrap at 320 px without horizontal page overflow. The 64 px image box retains its dimensions.
- A one-letter name, empty area/cuisine/hours arrays and absent phone fields do not crash the inspected views.
- Accented, Vietnamese, Chinese and Arabic titles render. Search support is a separate failure above.
- A failed image request falls back without leaving a broken-image icon. Its fallback has the emoji issue above.
- Filter options with twelve cuisines and a multi-line cuisine label wrap; filter content scrolls and footer commands remain reachable.
- Empty and one-item fixtures render; the audit counter says `1 place`. This counter belongs to the harness, so it is not proof of every production counter.
- The 1,000-row fixture mounted 26 place buttons when measured at 320 px, not all 1,000. This proves windowing, not Android scroll performance.
- Light/dark fixtures render, including the fuel form. Negative/zero/non-finite values remain subject to the existing shared numeric guard; browser reproduction focused on the upper-bound price case.

## Data Surface Map

Limits below describe the inspected TypeScript contract and SQL definitions, not invented limits.

| Rendered value | Source | Type / limit | Optional or empty case |
|---|---|---|---|
| Name, heading, fallback initial, action/accessibility names | `Place.name` | string; no length cap found; SQL NOT NULL | Whitespace accepted by inspected SQL/type contract |
| Area and row metadata | `Place.area` | string; no cap found | Empty string tested |
| Address and contact labels | `Place.address`, `phone`, `website`, `menuUrl` | strings; no cap found | Phone/website/menu optional; long address and URL fixture supplied |
| Image/fallback | `imageUrl`, `name`, `id` | optional URL/string; no dimension cap in component | Absent/failed URL tested; fallback has fixed dimensions |
| Type, cuisines, features | `category`, `placeType`, `cuisine`, `features` | category/feature enums; type/cuisine strings and array counts unbounded in type | Empty arrays and twelve cuisines supplied |
| Trading/service text and tone | `currentStatus`, outlook helpers | booleans/null and status enums | Fixtures have estimates/no accepted evidence; not every trust state tested |
| Report ages and evidence rows | `currentStatus.trust` | schema-validated claim data | Accepted/conflicting report combinations not exercised in this pass |
| Opening and kitchen rows | `openingHours`, `kitchenHours` | arrays of day/time strings; no array cap in type | Empty opening-hours array supplied |
| Source note space | `dataNotes` | optional string, no cap found | Long note supplied; hours view now reserves space instead of showing note |
| List length, row IDs, saved state | array, `id`, `isSaved` | 0/1/8/1,000; string IDs | IDs unique; save actions inert in audit |
| Filter section counts/summaries/options | `PlaceFilters`, place-derived options | enums plus string arrays; no label cap found | Long labels; options scroll; sections expand/collapse |
| Distance range | `maxDistanceKm` | slider 1..50 or Other | Slider rendered; no device GPS requested |
| Query and empty result | `PlaceFilters.query`, shared search | string, no cap found | Empty, Chinese and accented queries tested |
| Consumption / unit | `FuelPreferences` and form draft | canonical >0 and <=100 L/100 km; reciprocal km/l | Null draft allowed; conversions use existing form |
| Price override | `FuelPreferences` and form draft | >0 and <=1000 R/litre | Null allowed; 1001 rejection reproduced |
| Grade / price region | enum choices | four grades; inland/coastal | Null options supported |
| Save state, validation and feedback labels | form state | fixed strings; async save guarded | Audit save in memory; no real settings persisted |

## Verification Limits

Viewport checks: 320x900, 537x984 and 2560x1440; list/detail screenshots inspected, filters and fuel inspected at narrow widths. Light and dark themes tested across the fixtures, not every combination of screen, dataset and width. Demo, Worst case, Empty, One and 1,000 rows exercised.

A 200% text stress check used a browser-side font/line-height override on the worst-case list. No page-width overflow appeared. This is not proof of OS font scaling or browser zoom: browser shortcut zoom did not change the emulated viewport. The audit toolbar is excluded from findings. Reload clears this environment override.

Not covered: Android hardware/font scaling/haptics, a full RTL application layout, authentication/account email extremes, submission/review flows, all trust/time boundary states, group/map interactions, trip routing/cost outputs, loading/offline states and exhaustive screenshot combinations. Arabic place text was exercised in the existing left-to-right layout. This is a scoped frontend stress pass, not certification of the whole app.

All four listed findings have been addressed. The fixture and dev-only controls remain for retesting.
