# KNOGO Project and Design Handoff

Updated: 21 October 2026  
Workspace: `C:\Users\poals\Documents\Web Apps\KNOGO`  
Purpose: give a designer or developer the product context, design system, behaviour contracts and state of the project.

This document describes the code at handoff time. It does not certify a release, backend deployment or device coverage. The workspace contains changes from ongoing work, including survey logic, motion and a report-sheet fix. Do not assume those changes have been committed or shipped to every device.

## 1. What KNOGO Is

**KNOGO: Know before you go.**

KNOGO helps people decide whether to travel to a place. Its starting point is the gap between a place's listed hours and what someone will find when they arrive. A business can be listed as open while its kitchen, card machine or other services are not operating.

The app combines a place directory, branch discovery, listed hours, community checks and trip estimates. The aim is to reduce a wasted trip without presenting a report as a guarantee.

The core decision loop is:

1. Find a place or branch.
2. See whether its status comes from listed hours or a report.
3. Check the services that matter for the visit.
4. Check travel time and fuel cost where inputs are available.
5. Contact the venue or open directions.
6. Leave a check to help the next person.

KNOGO is not a restaurant-review app. It does not centre star ratings, opinions, bookings, delivery or payments. It is not an emergency-information service. A community observation is evidence about a point in time, not a promise about arrival.

### Project Background and Audience

- Creator: Xander Poalses.
- Coursework: Open Window, DV300 and UX300.
- Geography: the catalogue is centred on Pretoria East. Records elsewhere do not establish coverage across South Africa.
- Audience: people checking places before leaving home, work or another stop; contributors making checks; and venues using the venue-access flow.
- Language: British English in a South African context. Use rand, kilometres, litres, 24-hour times and South African local-time context.
- State: beta. Provider setup, device testing and release checks remain separate work.

### Directory Categories

| Category | Product meaning |
| --- | --- |
| Food & Drink | Places where dining, kitchen status and cuisine may matter |
| Shops | Retail places and departments |
| Cars & Garages | Automotive services, garages and fuel-related discovery |
| Public Services | Service locations, not a promise of emergency coverage |
| Entertainment | Places and activities for going out |
| Sport & Outdoors | Sport, fitness and outdoor activities |

Some category identifiers predate these labels. Use the category helpers in the core package rather than replacing identifiers based on visible text.

## 2. Which App Is the Reference

There are two frontends in this repository.

| Code | Role | Handoff rule |
| --- | --- | --- |
| `apps/mobile` | Expo app for Android and React Native Web; iOS code paths also exist | Reference for the current product and design system |
| `src` | Separate React/Vite web interface | Has its own styles and behaviour; do not assume parity with Expo |
| `packages/core` | Types, validation, trust, reports, discovery and trip logic shared by clients | Reference for domain rules |
| `supabase` | Migrations and Edge Functions | Backend contracts and deployment work |

The browser preview on port 8081 is the Expo web experience when started from `apps/mobile`. It is not the same interface as the root Vite app.

The design system is implemented in code. No Figma file is established here as the design authority. Screenshots are evidence of a rendered state, not a replacement for theme tokens or source behaviour.

## 3. Navigation and Screen Model

The main tabs are **Home, Explore, Saved and Settings**. They are peer destinations, not steps in a wizard.

| Screen or surface | Job |
| --- | --- |
| Home | Brand, search and community mascot artwork |
| Explore | Nearby entry point and category choice |
| Browse | Search, filters, counts and place/group results |
| Group | Branch list and map for a brand or place group |
| Place detail | Venue identity, opening outlook, report access, hours, trip planning, save and contact |
| Status & checks sheet | Opening status and the supported service-check cards |
| Listed hours sheet | Weekly trading hours and kitchen hours where published |
| Plan your trip sheet | Origin, destination, map, route and fuel estimate |
| Report survey | Check method, applicable questions, review and submission |
| Saved | Saved places, with removal controls |
| Settings | Account, theme, fuel preferences and links to support and rules |
| Venue access | Claim and verification interface, subject to provider setup |

### Discovery Rules

Search can use names, groups, areas, addresses, place types, tags and cuisines where those fields apply. Recent searches are stored on the device and can be cleared.

A group is not a physical branch. A report must belong to the branch it describes. For example, Padstal Hatfield and Padstal Hazelwood are different records and reports must not leak between them.

Nearby discovery asks for location when used. Permission refusal must leave a route through manual area selection. Do not request location just to render the Home screen.

Filters come from the catalogue and category context:

- Cuisine is for food contexts.
- Tag labels can become Departments, Services & fuel, Services or Activities.
- Dining-specific listed-hours and busy-level filters follow the capability helpers; do not apply them to every category by label matching.
- **Other means places outside the named options. It is not a text-entry field.**
- The distance Other option covers beyond 50 km.
- Clearing filters must not erase the user's search query.
- Changing context must remove filters that the destination cannot use.
- Do not restore the removed general Community & venue checks filter group.

## 4. Status, Evidence and Trust

### Listed Hours Are Not Reports

The distinction between schedule and evidence is a product contract.

| Basis | Example wording | Meaning and treatment |
| --- | --- | --- |
| Schedule | Expected open / Expected closed | Inferred from listed hours, with neutral status treatment |
| Report | Open / Closed, with report age | Report-backed outlook under the trust rules |
| Conflict | Reports differ | Evidence conflicts; use warning treatment and a contact route |
| No usable schedule/evidence | Check before leaving | Do not manufacture an opening state |

Service expected is a schedule expectation. It is not equivalent to someone confirming service. The green fill on a command is a brand/action colour and does not prove a venue is open.

The place summary can show Open and an additional service line such as and Serving when report evidence supports them. The report age sits to the right of the status heading where space allows, then wraps. Clock refreshes must not trigger repeated status animation.

### Report Fields

Evidence is evaluated per claim. Opening, kitchen, walk-ins, card machine, power and busy level must not be collapsed into a confidence percentage.

Unknown or unchecked fields stay unknown. The interface must not infer that the card machine works because the venue is open, or that a kitchen serves because trading hours are listed.

### Current Trust Contract

The implementation in `packages/core/src/trust.ts` is the authority for local evaluation:

- Usable evidence has a four-hour lifetime.
- Evidence is deduplicated to the latest usable item per actor and source.
- Invalid, expired, future-dated or high-risk evidence is excluded under the evaluator's rules.
- Opposing evidence produces disagreement rather than an arbitrary winner.
- A community indication is not proof.
- The negative-community threshold uses three accounts, account age of at least 24 hours at reporting time, at least two check methods, a span of at least 15 minutes and low-risk assessments.
- A venue update requires the verified-representative condition.
- Claim states include unknown, community indication, likely negative, disagreement and venue update.

`docs/COMMUNITY_RULES.md` records a deployment check from 19 October. Its one-report/two-report policy discussion is not the implemented threshold above. Do not turn a proposal into current behaviour. The deployed backend was not queried again for this handoff.

Live evidence expiry and stored-record retention are different. The documented cleanup removes report detail older than 24 hours while retaining contribution counts. Provider retention is a separate matter.

### Gemini's Role

Gemini is used for report-risk and coordination patterns, not to determine whether a business is open. Coded answers, methods and timing patterns are used for assessment. Do not send email addresses, names, GPS or source links as assessment payloads.

The reporting notice covers the provider's unpaid-service terms and human-review possibility, with an 18+ acceptance step. App cleanup does not promise deletion from the provider's systems.

The receipt can show queued, reviewing, complete, unavailable or expired states. It polls every five seconds for up to two minutes, allows retry where applicable and stops when complete or expired. A received report is still received when assessment is unavailable. Missing or high-risk assessment is not evidence that a venue is closed.

## 5. Report Survey Contract

The survey was changed during the work leading to this handoff:

1. Choose how the check was made: in person, phone or online.
2. For online checks, provide an HTTP(S) source URL.
3. Ask whether the place is open.
4. A Closed answer goes to review without service questions.
5. Phone and online checks also go to review after opening status, even when Open.
6. In-person Open checks can ask kitchen status where food applies and busy level, with other checks available through Add more checks.
7. Show the review step and require Submit. Ending follow-up questions does not mean auto-submitting.

Phone/web checks only collect opening status. Do not revive kitchen, walk-in, card-machine, power or busy answers when the method changes. A Closed answer also strips those follow-up answers.

`getApplicableReportAnswers` in `packages/core/src/reportDraft.ts` applies this rule to restored drafts and answer changes, not just visible steps. This prevents stale hidden answers from being sent.

Additional constraints:

- Non-food places skip kitchen questions.
- Back navigation follows applicable steps.
- Skip means no claim, not a default answer.
- Draft validity is four hours.
- Draft restoration must not overwrite an edit already made in the current session.
- Drafts are scoped to the place and account context.
- Validate at submission, including after restoration.
- Retain the draft on network failure; clear it after success.
- Block duplicate submission while busy.
- Signing in must not submit a report without the user's Submit action.
- Account and notice requirements depend on the configured reporting environment; mock mode is not proof of production authentication behaviour.
- Report received is not a promise that the report has been accepted into live status or that Gemini ran.

## 6. Brand and Visual Direction

The current identity uses the KNOGO wordmark, meerkat mascot, DM Sans, green commands, black or paper-like backgrounds and rounded controls. The mascot links the product to watching, checking and community participation. Keep it as the supplied artwork rather than redrawing it or replacing it with a generic illustration.

Use brand artwork on Home and brand surfaces. Keep discovery, reports, maps and settings focused on their task. Do not add hero sections, promotional copy or decoration to operational sheets.

### Asset Inventory

Files under `apps/mobile/assets` include:

| Asset | Use |
| --- | --- |
| `knogo-logo.png` | Wordmark |
| `knogo-mascot.png` | Header mascot |
| `community-meerkats.png` | Home community artwork |
| `icon.png` | App icon |
| `adaptive-icon.png` | Android adaptive icon artwork |
| `splash.png` | Splash artwork |
| `home/` | Home-related media |
| `logos/` | Place/brand logos where provided |

Do not invent venue photos. Use a valid logo, supplied image or the existing letter fallback. Keep map attribution. Asset rights and promotional-use rights need their own check before release.

## 7. Colour System

Authority: `apps/mobile/src/theme.tsx`. Read colours through `useTheme()` or `useThemeStyles(factory)` so each component follows the selected theme.

Theme choices are system, light and dark. System is the default. The preference is stored under `knogo.themePreference`. Do not hard-code dark screenshot values into components.

### Surfaces, Text, Actions and Status

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `background` | `#F3F3E8` | `#000000` | Page canvas |
| `surface` | `#F6F7F2` | `#121817` | Cards and controls |
| `elevated` | `#e9ede7` | `#222c29` | Raised surface |
| `statusSurface` | `#e7e7df` | `#000000` | Status region |
| `tripSurface` | `#F6F7F2` | `#121816` | Trip surface |
| `sheetSurface` | `#e9ede7` | `#222c29` | Modal sheet |
| `sheetInset` | `#e1e6e0` | `#1a2220` | Content within a sheet |
| `control` | `#F6F7F2` | `#202a23` | Control state |
| `controlStrong` | `#e1e6e0` | `#2b372f` | Control emphasis/disabled fill |
| `controlBorder` | `#657168` | `#8b9b95` | Control boundary |
| `focus` | `#0b4f2f` | `#72d99c` | Focus indicator |
| `primary` | `#0b4f2f` | `#43c58a` | Brand/action |
| `primarySoft` | `#e1ece4` | `#203c31` | Action tint |
| `gold` | `#c8a13a` | `#d9b85e` | Accent |
| `coral` | `#a65742` | `#d7846d` | Accent |
| `success` | `#17623c` | `#72d99c` | Positive report state |
| `warning` | `#774d0b` | `#e0ad55` | Conflict/caution |
| `closed` | `#9c3c32` | `#f49185` | Negative report state |
| `text` | `#17221b` | `#edf4ee` | Main text |
| `muted` | `#505a52` | `#aebbb1` | Supporting text |
| `border` | `#d8ddd7a4` | `#35413956` | Surface boundary, including alpha |

The eight-digit border values contain alpha. Preserve that alpha rather than converting them to opaque six-digit colours.

### Compatibility and Utility Tokens

| Token | Light | Dark |
| --- | --- | --- |
| `white` | `#ffffff` | `#ffffff` |
| `paper` | `#f6f7f3` | `#101612` |
| `ink` | `#17221b` | `#edf4ee` |
| `green` | `#0b4f2f` | `#72d99c` |
| `greenSoft` | `#e1ece4` | `#203c2c` |
| `yellow` | `#c8a13a` | `#d9b85e` |
| `red` | `#9c3c32` | `#f49185` |
| `blue` | `#17623c` | `#72d99c` |
| `line` | `#d8ddd7` | `#354139` |
| `openDot` | `#72d99c` | `#72d99c` |
| `closedDot` | `#efb56d` | `#efb56d` |

These names are not all literal hues. For example, blue is green in this theme. Prefer semantic tokens such as primary, success and warning when extending the UI. Do not bulk-rename compatibility tokens without checking callers.

### Overlays and Image Treatments

| Token | Light | Dark |
| --- | --- | --- |
| `headerBorder` | `rgba(11,79,47,0.24)` | `rgba(114,217,156,0.22)` |
| `overlay` | `rgba(6,35,22,0.24)` | `rgba(0,0,0,0.58)` |
| `overlayStrong` | `rgba(23,32,24,0.34)` | `rgba(0,0,0,0.68)` |
| `searchOverlay` | `rgba(6,35,22,0.28)` | `rgba(0,0,0,0.62)` |
| `featureTint` | `rgba(11,79,47,0.07)` | `rgba(114,217,156,0.12)` |
| `imageShade` | `rgba(8,17,11,0.34)` | `rgba(3,8,5,0.42)` |
| `imageTextMuted` | `rgba(255,255,255,0.82)` | `rgba(255,255,255,0.82)` |
| `imageTextGhost` | `rgba(255,255,255,0.13)` | `rgba(255,255,255,0.13)` |
| `imageTextGhostSoft` | `rgba(255,255,255,0.12)` | `rgba(255,255,255,0.12)` |
| `unsavedHeart` | `rgba(0,0,0,0.24)` | `rgba(0,0,0,0.38)` |

Both themes use this `tileTones` sequence: `#164f3b`, `#8c4c3f`, `#315a70`, `#765d26`, `#51446d`, `#6f3f50`. These are tile treatments, not status meanings.

## 8. Fonts and Typography

The app loads **DM Sans** through `@expo-google-fonts/dm-sans` in the root layout.

| Token | Loaded family | Weight |
| --- | --- | --- |
| `fonts.regular` | `DMSans_400Regular` | 400 |
| `fonts.medium` | `DMSans_500Medium` | 500 |
| `fonts.semibold` | `DMSans_600SemiBold` | 600 |
| `fonts.bold` | `DMSans_700Bold` | 700 |
| `fonts.extraBold` | `DMSans_800ExtraBold` | 800 |

Use the loaded family tokens, not synthetic weights on a fallback font. Do not replace DM Sans with a system font as a design change.

There is no single exported typography scale. These are component values in the current implementation, expressed as font size / line height in React Native logical units:

| Role | Size / line | Weight |
| --- | --- | --- |
| Shared page title | 38 / 45 | 800 |
| Shared card title | 28 / 34 | 800 |
| Body | 15 / 21 | 400 |
| Eyebrow | 13 / component-defined | 800 |
| Button | 16 / 24 | 800 |
| Large button | 22 / 32 | 800 |
| Chip | 14 / 20 | 500 |
| Shared search input | 15 / component-defined | 400 |
| Notice title | 20 / 23 | 800 |
| Notice body | 14 / 20 | 400 |
| Back label | 14 / component-defined | 800 |
| Home headline | 44 / 58 | 800, uppercase |
| Home search input | 13 / component-defined | 400 |
| Venue name | 24 / 30 | 800 |
| Place outlook | 38 / 46 | 800 |
| Service line | 16 / 24 | 500 |
| Sheet opening status | 44 / 53 | 800 |
| Detail/schedule emphasis | 32 / 40 | 800 |
| Additional info | 22 / 32 | 800 |
| Report metadata | 14 / 21 | 500 |
| Place-sheet heading | 26 / 38 | 800 |
| Survey question | 26 / 33 | 800 |
| Survey review/success title | 32 / 37 | 800 |
| Survey helper | 14 / 20 | 400 |
| Settings title | 28 / 38 | 800 |
| Account label | 18 / 26 | 700 |
| Settings row | 16 / 24 | 500 |
| Result name | 17 / 23 | 600 |
| Result metadata | 13 / 19 | 400 |
| Result status | 12 / 18 | 500 |
| Group name, grid | 25 / 28 | 800 |
| Group name, list | 21 / 25 | 800 |
| Bottom-nav label | 10 / component-defined | 500 |

Fallback initials can be 96 / 112 or 132 / 150. They are artwork-like identity treatments, not sizes to reuse for headings.

Keep text scaling, wrapping, `minWidth: 0` and `flexShrink` behaviour. Do not size fonts from viewport width or add negative letter spacing. Compact labels exist below 14; their presence is not a claim that all accessibility checks passed.

## 9. Spacing, Shape and Elevation

React Native values are logical layout units. Do not copy physical screenshot pixels into code.

### Spacing Tokens

| Token | Value |
| --- | --- |
| `space.xs` | 6 |
| `space.sm` | 10 |
| `space.md` | 16 |
| `space.lg` | 24 |
| `space.xl` | 32 |

### Radius Tokens

| Token | Value | Use |
| --- | --- | --- |
| `tile`, `surface`, `control`, `inset` | 26 | Main app surfaces and controls |
| `sheet` | 40 | Sheet top corners |
| `check` | 11 | Check cards |
| `content` | 10 | Content details |
| `listInset` | 14 | List inset |
| `segment` | 22 | Segmented control |
| `checkLabel` | 3 | Check-card label strip |
| `indicator` | 4 | Checkbox indicator |
| `nav` | 33 | Tab dock |
| `navItem` | 28 | Tab destination |
| `round` | 999 | Circles/full rounding |

The 26-unit base is an existing KNOGO choice. Do not replace it with a generic card-radius rule when continuing this project.

### Control Sizes and Shadows

- `sizes.touch`: 44 minimum target.
- `sizes.control`: 52 baseline control height.
- `sizes.iconButton`: 44.
- Card shadow: colour `#17221b`, offset `(0, 2)`, opacity `0.05`, radius `5`, Android elevation `1`.
- Floating shadow: colour `#17221b`, offset `(0, 10)`, opacity `0.16`, radius `18`, Android elevation `10`.

## 10. Layout and Component Recipes

### Page and Responsive Layout

The shared Page is full width up to 720, centred, with padding 16 and gap 16. Its bottom allowance is 112 plus the safe-area inset so the tab dock does not cover content. Place detail reserves 164 plus the inset for its controls. Do not remove this space because a screenshot looks empty.

Mobile layouts favour a list. Wider layouts can use the existing grid preference and virtualised result components. A width cap does not mean fixed text height: names, status and supporting text must wrap without covering controls.

### Brand Header

- Height: 70 plus the top safe-area inset.
- Horizontal padding: 16; top padding: 8 plus the inset.
- Mascot: 33 by 57; wordmark: 92 by 35, separated by 2.
- The wordmark follows the theme text tint.
- Info icon: 18 inside a 44 target.
- Beta information popover: width 260, padding 13, radius 26 and floating shadow.
- Place counts come from data. Screenshot counts are not constants.

### Home

Home uses a 720 width cap and top padding 32. The intro has horizontal padding 16 and gap 18. The headline has a 360 width cap. Search is at least 60 high with a 40-circle arrow command. Community artwork uses contain sizing and bottom alignment rather than cropping. Bottom spacing accounts for the tab dock and safe area.

Home search has its own overlay, suggestions and recent searches. Keyboard avoidance and focus wait for the overlay's ready state. Preserve those focus guards when changing animation.

### Bottom Navigation

The dock sits at the bottom with top padding 12 and bottom padding 12 plus the safe area. Bar width is the lesser of window width minus 20 and 700. Height is 66, padding 5 and radius 33.

Each destination gets equal flex space, `minWidth: 0`, radius 28 and gap 2. The active destination uses primary fill with the background colour for its icon and label. Icons are 21 with stroke width 2.2. Use the existing Lucide icon family.

### ActionButton

| Property | Contract |
| --- | --- |
| Baseline | Minimum height 52; vertical padding 10, horizontal 17; gap 9; radius 26 |
| Large | Minimum height 66; label 22 / 32 |
| Green tone | Primary fill |
| Dark tone | Text-colour fill |
| Light tone | Surface fill with 1-unit control border |
| Disabled | Control-strong fill and disabled interaction |
| Busy | Spinner/label state; prevent duplicate action |
| Press | Opacity 0.92 |
| Web focus | 2-unit focus outline with offset 3 |

Use `HapticPressable` and the existing command component. Do not add a second haptic handler to a button that already has one. Icon-only commands need accessible names and tooltips on web where the symbol needs explanation.

### Chips, Inputs and Filters

Chips use checkbox semantics by default and radio semantics where one choice is allowed. Minimum height is 44, padding is 6 vertical / 8 horizontal and gap is 10. The 20-unit indicator has a 1.5 border; checkbox radius is 4, radio is circular. Selected state uses primary with a check or dot, not colour alone.

Shared search fields have minimum height 52, horizontal padding 14, gap 10, a 1-unit border and radius 26. Search icons are 18; filter icons are 19 inside a 44 target.

FilterSheet uses the staged modal and swipe header, a maximum height of 92%, safe-area handling, scrollable options and footer commands for Clear and Show results. Keep the result count and choices tied to the same state.

### Place Cards and Identity

Keep venue name, area and status in a scan-friendly hierarchy. Use logo/image components and their letter fallback. Group cards lead to branches; place cards lead to a physical location. Saved supports removing places; do not scatter new save controls across every surface without a product reason.

### Place Detail and Status & Checks

Opening status leads the page. The report age belongs beside it where space permits. The Service expected line no longer has an icon to its left.

View recent reports opens Status & checks. The sheet keeps the opening summary, report age and Additional info cards. The repeated report-count rows, Last confirmed drill-down rows, raw expiry and at-the-venue detail rows were removed at the user's request. Do not reintroduce them beneath cards that already answer the question.

Additional info is an accordion. Its label stays left and the arrow stays right. **Vertically centre both in the collapsed header.** This request does not mean centring the label horizontally. Collapsed top/bottom padding is 6; expanded bottom padding is 15.

Service cards only show fields supported by that place/report. Do not fill empty fields with Working or Yes. A busy-level card can span the width when present.

Contact remains a floating command above the tab dock, at bottom 92 plus the safe-area inset. Keep a route to contact details and directions without adding competing floating commands.

### PlaceSheet and Listed Hours

PlaceSheet combines StagedModal, keyboard avoidance and a scrollable body. Maximum width is 720; maximum height is window height minus top safe area minus 24. Sheet top corners use radius 40 and `sheetSurface`.

Header padding is top 24, bottom 16 and horizontal 24, with gap 10. The close icon is PanelBottomClose at 34, stroke 1.7, within a 44 target. The body has horizontal padding 14, gap 15 and bottom padding 24 plus the safe area.

Only the header is a swipe-to-dismiss area. Body scrolling must remain scrolling. Keep the close button, Android Back and web dismissal routes.

Listed hours uses weekly rows and a Today highlight. Kitchen hours appear only when published. Venue-specific source notes were removed from this sheet, leaving a 64-unit spacer to retain the layout; provenance is explained through the global rules/privacy context. Do not replace missing kitchen hours with trading hours.

## 11. Motion and Haptics

Motion supports state changes and dismissal. Do not add movement to every tap or report-age tick.

| Interaction | Current implementation |
| --- | --- |
| Accordion | Layout 180 ms; content fade in 180 ms, fade out 100 ms; arrow transition 180 ms |
| Accordion easing | Curve `(0.23, 1, 0.32, 1)` |
| Staged modal | Core React Native Animated; backdrop 120 ms, then content 220 ms with 48-unit offset |
| Swipe dismissal | Header gesture, shared values and one commit callback; no per-frame JS work |
| Swipe threshold | Travel above `min(140, viewportHeight * 0.25)`, or travel above 24 with velocity above 700 |
| Swipe return | 300 ms spring, damping ratio 0.8, carrying release velocity |
| Swipe exit | 300 ms, damping ratio 1, overshoot clamped |
| Survey step | 180 ms opacity/12-unit horizontal transition, direction follows navigation |
| Survey progress | 180 ms width transition on the positioned fill |
| Save | Pulse only when moving from unsaved to saved; 1 to 1.15 over 100 ms, then 1 over 140 ms |
| Receipt | Check fade of 200 ms; does not mean risk review approved the report |
| Status | Fade on value change, not each timer refresh |

Reduced-motion handling suppresses the corresponding travel, layout and pulse effects. Preserve OS preference listeners and unmount/reopen guards. Tabs and typing are not animated by this work.

### Android Regression to Preserve

A string CSS easing value passed web tests but caused the Android report sheet to fail, leaving the backdrop visible. Reanimated's `transitionTimingFunction` must receive its **`cubicBezier(0.23, 1, 0.32, 1)` object**, not the string `"cubic-bezier(...)"` in the affected native arrow transition. A web preview alone does not verify this path.

GestureHandlerRootView is needed at the root and modal gesture boundary. Do not remove it while tidying wrappers. Reopen/cancel revision guards prevent an old dismissal completion from closing a new sheet.

### Haptics

- Android uses the Virtual_Key haptic.
- iOS uses a Medium impact.
- Web is silent.
- Disabled and busy controls do not fire action haptics.
- One action should produce one haptic; a committed swipe gets one.
- Haptic failure must never block the action.

Current dependencies include Reanimated 4.5.1, Gesture Handler around 2.32.0 and Worklets 0.10.1. Check Expo compatibility before changing them.

## 12. Maps, Trips and Fuel

Native branch maps use Mapbox. Expo web uses the Google Maps implementation in `BranchMap.tsx`, not a `.web.tsx` file. Provider keys, module availability and network access affect rendering. Preserve attribution and the list/manual routes when maps fail.

Route distance and duration must come from a route provider. A marker or straight-line distance is not a driving route. Validate coordinates; do not display invented travel times while a request fails.

Fuel settings start unset. The app must not guess a vehicle's consumption. The canonical consumption unit is L/100 km; km/l input converts by reciprocal.

```text
litres = distanceKm / 100 * consumptionLitresPer100Km
costZar = litres * priceZarPerLitre
tankConsumption = litresAdded / kilometresTravelled * 100
```

Tank-fill consumption requires the full-to-full confirmation and positive, finite inputs. A price override takes precedence over a reference price. Fuel grade and inland/coastal region matter. Region inference is limited to the implemented Pretoria bounds, not the whole country.

Diesel references are wholesale values, not pump-price promises. Show validity and source context without implying a guaranteed bill. Driving, traffic, load and roads affect use. No live price is hard-coded into this handoff.

Trip planning compares arrival against listed hours in South African time, including overnight schedules. This is a planning indication, not confirmation that the venue will be open on arrival. If a return estimate doubles an outbound route rather than using a return leg, disclose that basis.

Open directions launches navigation outside KNOGO. KNOGO does not supply its own turn-by-turn engine. Errors should preserve origin, destination and user inputs, not substitute a zero-cost trip.

## 13. Accounts, Storage and Privacy

Supabase supplies configured authentication and report persistence. Email flows exist; Google sign-in depends on configuration. Recovery links and auth-return handling must remain distinct from report submission.

| Data | Storage/handling context |
| --- | --- |
| Native session credentials | SecureStore-backed session handling |
| Theme and preferences | Device storage/AsyncStorage |
| Recent searches and saved-place state | Local client state; do not promise cross-device sync without checking the implementation |
| Report drafts | Place/account-scoped local state with expiry and restoration guards |
| Submitted reports | Configured backend and its access rules |
| Location | Requested for nearby discovery/trips, not proof that a report is true |
| Diagnostics | Sentry/PostHog opt-in paths; refusal must not block use |

Do not include private payloads in diagnostics. Browser state and a phone's storage are separate even when the backend is shared. Only server-backed data from the same environment can be expected to match.

Venue claiming has a verification interface, but provider setup determines whether delivery works. Do not describe SMS, calls or verification as working or cost-free without checking the configured service.

Only publishable client configuration belongs in client bundles. Service-role keys, signing credentials and provider secrets must stay out of source, screenshots and handoff files. RLS and server validation are security boundaries, not substitutes for client validation or vice versa.

## 14. Code Map and Working Conventions

Paths below are relative to the workspace root stated at the top, so the handoff remains usable after moving the repository.

| Area | Source |
| --- | --- |
| Theme, fonts, spacing, radii | `apps/mobile/src/theme.tsx` |
| Root providers and fonts | `apps/mobile/app/_layout.tsx` |
| Tab layout | `apps/mobile/app/(tabs)/_layout.tsx` |
| Shared UI primitives | `apps/mobile/src/components/Ui.tsx` |
| Header/chrome | `apps/mobile/src/components/AppChrome.tsx` |
| Cards | `apps/mobile/src/components/PlaceCards.tsx` |
| Sheets | `PlaceSheet.tsx`, `FilterSheet.tsx`, `StagedModal.tsx` under mobile components |
| Motion | `Motion.tsx`, `SwipeSheet.tsx`, `swipeDismiss.ts` under mobile components |
| Haptics | `apps/mobile/src/haptics.native.ts` and `components/HapticPressable.tsx` |
| Home, discovery, group | `HomeScreen.tsx`, `BrowseScreen.tsx`, `GroupScreen.tsx` under mobile screens |
| Place and reporting | `PlaceDetailScreen.tsx`, `ConfirmScreen.tsx` under mobile screens |
| Settings, rules, support, venue | The corresponding files under `apps/mobile/src/screens` |
| Core model and rules | `packages/core/src` |
| Report-answer pruning | `packages/core/src/reportDraft.ts` |
| Evidence evaluation | `packages/core/src/trust.ts` |
| Fuel/trip calculations | `packages/core/src/trip.ts` |
| Vite theme | `src/styles/global.css` |
| Database and functions | `supabase/migrations`, `supabase/functions` |
| Catalogue sources | `data/place-imports` and import/validation scripts |
| Existing notes and audits | `docs` |

Tests include colocated `.flow.tsx` files, core tests and root Vite tests. A `.flow.tsx` filename here is part of the testing setup, not a duplicate production screen to edit independently of the actual implementation.

Use existing helpers before adding wrappers. Respect validation, busy guards, cancellation, focus restoration and data-preservation behaviour when editing a component. Do not reset the dirty worktree or replace user changes to simplify a patch.

An Expo Router patch exists at `patches/expo-router@57.0.19.patch` for initial-link navigation timing. Keep it until an upgrade has been tested against the same auth/deep-link paths.

## 15. Running and Checking the Project

The workspace uses pnpm 12.3.4. At handoff, the Expo app uses SDK 57, React Native 0.86.3 and React 19.2.3. The Vite frontend uses React 18.3.1. Treat these as recorded versions, not recommendations to upgrade without checking.

From the workspace root:

```powershell
pnpm dev
pnpm mobile
pnpm test
pnpm test:mobile-flow
pnpm typecheck:core
pnpm typecheck:mobile
pnpm exec tsc -b
```

`pnpm dev` starts Vite. `pnpm mobile` starts Expo's development-client workflow on the LAN. Use the mobile README for the web-preview and device commands. Confirm the process is running from this workspace, not another checkout on a nearby port.

Public environment variable names include `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_USE_MOCK_DATA`, `EXPO_PUBLIC_GOOGLE_MAPS_BROWSER_KEY`, `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`, `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_API_KEY` and `EXPO_PUBLIC_POSTHOG_HOST`. This list is not a replacement for the environment templates or runtime configuration. No secret values belong here.

### When Phone and Browser Reports Differ

Check these before changing trust rules or creating another report:

1. Same physical branch ID and slug, not just the same brand.
2. Same Supabase project and backend environment.
3. Mock-data flags and configuration embedded when each build started.
4. Whether the report is still within its evidence lifetime.
5. Whether the client refreshed after returning to the foreground.
6. Whether the local web preview is contacting an unavailable local backend.

The phone's localhost is the phone, not the development PC. A browser preview on another checkout or port can also have different environment configuration. A report visible on Padstal Hatfield should not appear on Padstal Hazelwood.

## 16. Builds and App Updates

The user's preference is to update the installed app without downloading an APK for every UI change. That delivery path is **not configured yet**.

At handoff, app config has version 0.1.0, Android version code 1 and runtime policy `appVersion`. The updates package is installed, but there is no configured updates URL or EAS project ID. Release channels are not established. The Expo session was not signed in when checked. The owner account remains to be confirmed.

Required follow-up: confirm Expo ownership, configure the update project and channels, make a compatible install and verify an update on a device. Do not claim an update was published. Changes to native modules still require an APK with those modules; a JS update cannot add them to an existing binary. Replacing an APK on the PC does not update a phone.

Development clients can load JS from Metro when connected. That is different from a standalone app receiving a hosted update.

### Build Notes From Recent Work

- Latest report-sheet test APK: `output/KNOGO-report-sheet-fix.apk`.
- It includes arm64-v8a and x86_64 for phone/emulator testing.
- Earlier motion/survey APKs do not include all later fixes.
- The local release build uses test/debug signing. It is not a Play-ready signing setup.
- Never uninstall the user's app just to work around a signing mismatch; that can remove local data.
- A generated, ignored native Gradle edit works around the Windows Hermes path containing spaces. It may not survive native regeneration.
- Build work used a 4 GB Java heap, 1.5 GB metaspace and at most four workers after a metaspace failure.
- Keep the existing Windows/CMake build notes and avoid a clean prebuild over local native edits without accounting for them.

## 17. Verification Record and Limits

These results are from the preceding implementation work, not new test runs made to write this document:

| Area | Recorded evidence |
| --- | --- |
| Mobile tests | 541 tests across 45 files passed after the report-sheet fix |
| Mobile typecheck | Passed in that work |
| Survey root regression tests | Focused set of 13 passed in the preceding survey work |
| Root suite history | 321 passed in an earlier run; not a current full-suite result |
| Android report sheet | API 36.1 emulator opened a place with a report, expanded Additional info, closed and reopened the sheet |
| Screenshot | `output/knogo-report-fixed.png` records that emulator check |
| APK | Report-sheet APK built and signature checked during that work |

No public report was created just for that emulator check. The emulator check does not establish iOS or physical-device coverage, release readiness, accessibility conformance or backend security.

For this document, source values and file references were checked. No hosted database audit, deployment, new APK, OTA publication or device session is implied.

## 18. Vite Theme Difference

The Vite interface uses DM Sans with system fallbacks, but its CSS theme has diverged. This table records that difference rather than proposing another palette.

| Token | Vite light | Vite dark |
| --- | --- | --- |
| background | `#f3f3e8` | `#111610` |
| surface | `#ebebd6` | `#18211d` |
| elevated | `#e8e0cd` | `#101d17` |
| primary | `#0b4f2f` | `#a9c47f` |
| primarySoft | `#dde8d6` | `#20351f` |
| gold | `#c8a13a` | `#d2b15a` |
| coral | `#9a6a42` | `#b98256` |
| success | `#1f7a4d` | `#78be82` |
| warning | `#a96d12` | `#d6a84a` |
| closed | `#b6463a` | `#dd776d` |
| text | `#172018` | `#f7f2e7` |
| muted | `#6b6659` | `#b8b09d` |
| border | `#d8d0be` | `#3f4939` |

Some CSS RGB aliases do not match their hex surface values. Do not mix these values into Expo or claim cross-client token parity. Aligning the frontends would be a separate scoped change.

## 19. Do Not Regress

- Keep schedule expectations distinct from report-backed status.
- Keep reports branch-scoped and claims field-scoped.
- Do not ask follow-up service questions after Closed or for phone/web checks.
- Strip hidden stale answers, not just their visible controls.
- Do not reintroduce report-count and raw-detail rows removed from Status & checks.
- Keep the collapsed Additional info header vertically centred.
- Keep the report age beside the status with a wrapping fallback.
- Preserve unknown values, absent hours and unset fuel inputs.
- Keep draft recovery, busy guards, error handling and explicit Submit.
- Keep tab/contact safe-area space and keyboard/focus handling.
- Keep reduced motion, keyboard access, accessible names and non-gesture close paths.
- Test native easing and gestures on Android; web success is insufficient.
- Do not present Gemini as a truth checker or a received report as an approved one.
- Do not promise remote updates before the update-delivery setup is verified.
- Do not reset production data, create public test reports or remove the user's app for convenience.

## 20. Follow-Up Work and Reading

### Follow-Up Priorities

1. Confirm the Expo owner and finish update delivery, then verify it on the installed app.
2. Check the report-sheet fix and swipe/scroll behaviour on the user's phone.
3. Keep backend deployment facts and trust-policy proposals separated when revising community rules.
4. Complete the release checklist, provider setup, signing and privacy checks before treating a build as a release.
5. Decide whether the Vite interface should be aligned, retained separately or retired; do not assume this decision has been made.

### Existing Project Documents

Read these from the workspace root. Historical notes may lag code; resolve conflicts against implementation and verified deployment evidence.

- `README.md`: project introduction, setup and repository structure.
- `apps/mobile/README.md`: Expo workflow and build notes.
- `docs/KNOGO_FEATURE_HANDOVER.md`: prior feature inventory and delivery context.
- `docs/COMMUNITY_RULES.md`: report policy and deployment notes.
- `docs/PRIVACY.md`: privacy and provider disclosures.
- `docs/CTA_GUIDELINES.md`: command hierarchy and labels.
- `docs/CTA_HAPTICS.md`: haptic conventions; compare against current native implementation.
- `docs/PLACE_CATEGORIES_AND_DATA.md`: catalogue/category context.
- `docs/ACCOUNT_SETUP.md`: authentication setup.
- `docs/RISK_QUEUE_SETUP.md`: report-assessment queue setup.
- `docs/ZERO_COST_TRIP_SETUP.md`: trip-provider setup context, not a permanent cost guarantee.
- `docs/FUEL_DATA_SETUP.md`: fuel data setup.
- `docs/VENUE_VERIFICATION.md`: venue-access setup.
- `docs/OPERATIONS.md`: operational tasks.
- `docs/RELEASE_CHECKLIST.md`: release checks, not proof they all passed.
- `docs/UI_STRESS_AUDIT.md` and `docs/MOBILE_SIZE_AUDIT.md`: prior UI audit evidence.

### Brief for the Next Contributor

Continue the existing Expo app. Reuse its DM Sans families, semantic light/dark colours, 26-unit control radii, safe-area layout and shared components. Keep the brand artwork. Ground status in its evidence basis, preserve unknowns and scope reports to the branch. Closed and remote checks only collect opening status before review. Keep user data through failures. Verify Android motion on Android. Treat OTA delivery, release signing and provider readiness as outstanding checks, not completed work.
