# Pretoria East Directory Expansion

## Scope

- Follow `docs/PLACE_CATEGORIES_AND_DATA.md`; Pretoria East only.
- Add source-backed places across Shops, Cars & Garages, Public Services, Entertainment and Sport & Outdoors. Keep Food & Drink records and routes compatible.
- Link chain branches to their operator group; leave independent places ungrouped. A shared shopping centre is not a shared business group.
- No invented hours, inferred community reports, paid providers or billing changes. Later scope adds remote place photos rather than logos, with online loading and an offline fallback; image work remains pending. Google search ranking does not establish permission to reuse a photo.
- Audit all 67 existing records after additions, including inactive records. Preserve test fixtures and community reports.
- Do not add outside-Pretoria-East records. Flag any existing out-of-scope records rather than silently relocate or delete them.
- Research the mall directories: Menlyn Park, Menlyn Maine Central Square, Woodlands, Castle Gate, The Grove, Parkview and other Pretoria East centres. Record tenants as businesses, not as branches of the mall. User confirmed Irene Village Mall is deferred; Pretoria East boundary stays in force.

## Baseline And Cap

Snapshot: `2026-10-16-before-expansion.json`, captured before changes.

| Measurement | Baseline |
| --- | ---: |
| Places | 67 |
| Groups | 45 |
| Hours rows | 462 |
| KNOGO database bytes | 13,970,579 |
| Cluster database bytes | 29,085,873 |
| Maximum added database bytes | 100,000,000 |
| KNOGO database stop threshold | 113,970,579 |

Use total database growth, including indexes and provenance, as a conservative cap. Check before and after each import transaction. The cap is a ceiling, not a target to fill.

## Progress

- [x] Inspect catalogue, importer, category mapping and report flow.
- [x] Save database snapshot without account or report data.
- [x] Verify Firecrawl balance: 972 credits before research; no new purchases.
- [x] Add type and fact-source provenance support; preserve unknown hours.
- [ ] Research and validate additions across all five expansion categories.
- [ ] Import inactive records, verify location, source, grouping and hours, then activate.
- [x] Make expansion categories discoverable without treating them as restaurants.
- [x] Keep kitchen questions and kitchen status out of non-food places.
- [ ] Audit existing businesses and apply evidence-backed improvements.
- [ ] Complete category-specific filters, not just category selection and kitchen guards.
- [ ] Add branch photo URL/source/attribution evidence and verify online loading, failed-image handling and the offline fallback. Do not claim that Google results establish usage rights.
- [ ] Review and redesign status/checks, place information and account creation against the requested Mobbin references; verify web and Android layouts, focus and text scaling.
- [ ] Verify data integrity, app checks and database growth; record counts and remaining gaps.

## Research Job

Firecrawl job `01a144ad-c4b0-71dc-9cda-9487bd4dcc0c`, thread `01a144ad-c4e0-754d-bc5e-77984cc1b4d1`, capped at 120 credits; external data providers disabled. Retrieve this job before starting another with the same scope. Results need source checks before import.

The job is terminal: it hit its credit cap. Its incomplete leads are saved in `2026-10-16-research-leads.json`, not imported as verified records. Continue with direct search and scrape calls, not another broad research job.

## Batch 01 Applied

`data/place-imports/2026-10-16-01-pretoria-east` contains CSV records, source links, dates and generated SQL.

| Added place | Group | Evidence |
| --- | --- | --- |
| Shell Lynnwood Motors | Shell | Brand locator: coordinates, phone, fuels and forecourt hours |
| Shell Glenwood Service Station | Shell | Brand locator: coordinates, phone, fuels, car wash and forecourt hours |
| Shell Moreleta Motors | Shell | Brand locator: coordinates, phone, fuels, cards and forecourt hours |
| Supa Quick Menlyn | Supa Quick | Branch page: GPS, phone, services and weekly hours |
| Builders Warehouse Woodlands | Builders Warehouse | Centre tenant page: shop, entrance, phone and branch-specific hours; published map pin is centre-level, not doorway-level |

- Imported inactive; checked all five had seven sourced opening days and matching group categories; then activated.
- Current total: 72 places, 67 active, 48 groups. No status claims invented.
- Database: 14,011,539 bytes; growth since baseline: 40,960 bytes (0.041 MB). Cap remains 100,000,000 added bytes.
- Hosted migration `20261016122957_place_directory_types_and_provenance` applied and copied to the matching repository migration file. CLI was unavailable through the sandbox; the filename/version came from hosted migration history, not an invented timestamp.
- Checks: importer/mapping/cache/category tests 30 passed; mobile suite 436 passed; subsequent hours-note regression 17 passed; mobile and web/core TypeScript passed.
- Browser checked at 390 x 844: six category choices fit, automotive results group Shell's three branches, Supa Quick opens, its hours match the source, and no kitchen status or kitchen-hours note appears. Viewport reset after checking. Android hardware not checked.
- Security advisors report existing private-schema RLS-without-policy notices, exposed SECURITY DEFINER RPC notices and disabled leaked-password protection. No RLS, function access or auth settings were changed in this task. Remediation references: https://supabase.com/docs/guides/database/database-linter and https://supabase.com/docs/guides/auth/password-security.

## Next Work

### Batch 02 Applied: The Grove

- Added 25 tenants: 22 shops, two entertainment venues and one ice rink, with 24 business groups. The rink remains ungrouped pending operator verification.
- Sources: both directory pages (`https://www.thegrovemall.co.za/the-grove-mall---stores` and `?b3ceaf86_page=2`), plus the published centre map widget on `https://www.thegrovemall.co.za/the-grove-mall---contact` (`data-widget-latlng=-25.7662976,28.3247035`).
- Tenant hours are unpublished, so no hours rows were created. Shared centre pins are labelled as such in `service_details` and `data_notes`, not presented as shop-door coordinates.
- Importer now permits shared centre pins only with matching centre identity, a coordinate source and notes. Unexplained coordinate duplication still fails. Importer checks: 10 passed.
- All 25 records staged inactive, verified for types, sources and group category consistency, then activated. No reports or live-status claims created.
- Current total: 97 places, 92 active, 72 groups. Database: 14,052,499 bytes; growth since baseline: 81,920 bytes (0.082 MB), below 100 MB.
- Raw Castle Gate contact page publishes `data-widget-latlng=-25.8185613,28.244004`. Baseline restaurant coordinates differ by more than 1 km; cross-check before the later audit correction rather than copying existing per-tenant offsets.

### Remaining Work

### Batch 03 Applied: Home Affairs Counter

- Added `home-affairs-fnb-the-grove`, type `home_affairs_counter`, in the Home Affairs group and Public Services category. This is a service counter within FNB, not a stand-alone government office.
- The Grove directory supplies shop U20 and phone 087 345 3355. FNB's search excerpt at `https://www.fnb.co.za/ways-to-bank/branch.html` lists Lynnwood (Grove Mall) among participating Smart ID and passport branches. Direct scrape failed; do not claim current eligibility or appointment requirements have been checked.
- Counter hours remain absent; notes explain the limits. Centre coordinates are not a counter entrance pin.
- Staged inactive, checked source/type/group and zero invented hours, then activated.
- Current total: 98 places, 93 active, 73 groups. Additions: 23 shops, four automotive, two entertainment, one sport/outdoors and one public service.
- Database: 14,093,459 bytes; growth since baseline: 122,880 bytes (0.123 MB), below 100 MB. No new status claims or pictures.

### Remaining Goal Scope

### Batch 04 Applied: Castle Gate

- Added 21 places (20 shops and Planet Fitness Waterkloof Ridge), with 16 new business groups. Existing chain groups reused for Builders, Checkers, Woolworths, Mr Price Home and PNA.
- Sources: both centre precinct directories and `https://www.planetfitness.co.za/gyms/waterkloof-ridge/`. Gym hours have seven sourced rows. Other tenant hours remain unknown.
- Added Erasmus Park region using the centre's published address. The generated import includes the region insert and both 100 MB cap guards.
- Staged inactive, checked 21 sources/types, zero group mismatches and seven hours rows, then activated. Two phones excluded from branch phone fields because their scope is not confirmed.
- Current total: 119 places, 114 active, 89 groups. Database: 14,150,803 bytes; growth: 180,224 bytes (0.180 MB).
- Importer checks permit shared mall addresses only with the same documented centre evidence used for shared pins; IDs and slugs still cannot repeat. Ten importer tests passed.

### Remaining Goal Scope (Current)

### Batch 05 Applied: Woodlands

- Added 33 places: 30 shops, one arcade, one car wash and one tyre/fitment centre. Six new groups; 27 places reuse chain groups already present.
- Directory source: `https://woodlandsboulevard.co.za/shops`. Direct tenant pages checked for Ackermans, Clicks, Computer Mania, Incredible Connection, Pick n Pay, Plush Carwash and Tiger Wheel & Tyre. Their seven-day schedules give 49 sourced hours rows.
- Pharmacy note distinguishes store hours from pharmacy/clinic service hours. Other tenant hours remain unknown. Shared centre pin and accuracy limits recorded on every row.
- Burnt Studios, PEP Home and Pringle were not added as active branches because the directory marks coming soon or refurbishment. Website "open now" labels were not used as community reports.
- Staged 33 inactive places, verified sources, group categories and 49 hours rows, then activated. No existing baseline businesses changed.
- Current total: 152 places, 147 active, 95 groups. Database: 14,158,995 bytes; growth since baseline: 188,416 bytes (0.188 MB).

### Remaining Goal Scope (After Batch 05)

1. Continue additions across all expansion categories and the mall ledger. Public Services, sport/outdoors, automotive types and mall coverage remain incomplete. The three batches are not completion.
   Include a mall-by-mall coverage ledger, source directories and tenant selection or exclusion reasons. Do not treat a handful of malls or tenants as full coverage of this request.
2. Research coordinates from published maps or branch data. Do not invent pin offsets to bypass duplicate-coordinate validation. If two tenants share a centre pin, extend validation to recognise documented co-location rather than move the pins.
3. Review branch hours separately from centre hours, service hours, phone-line hours and "today" snippets.
4. Then audit every baseline business against sources, recording unchanged, improved, unavailable or out-of-scope outcomes. Test fixture `knogo-gemini-test-venue` must remain untouched.

### Batch 06 Applied: Parkview And Wolwespruit

- Folder: `data/place-imports/2026-10-17-06-parkview`. Four candidate additions: Parkview Shopping Centre, Clicks Parkview, PostNet Woodhill and Wolwespruit MTB and Trail Park.
- Four schedules expand to 28 opening days. Every record has a contact route, map evidence, address, source and date. Clicks reuses its group; PostNet introduces one brand group. The centre and trail park stay ungrouped; their tenants are not branches of the host site.
- Clicks Sunday hours differ from the centre's hours. PostNet Woodhill is the Pretoria tenant, not PostNet Parkview in Johannesburg. Its privately operated status is explicit in notes and service details.
- Wolwespruit's general contact is its website/email. The emergency phone is not presented as the enquiry number. Its map script supplies a directions destination distinct from trail polylines.
- IndyKart is held because its page announces a move to Woodlands without a year. Virgin Active needs its weekly schedule, not today's opening span. The Flower Market needs corroboration of its older page, hours and phone.
- CSV and JSON parse checks pass; importer validation has zero errors, with warnings for omitted images, logos and menus. All 10 importer tests pass. Generated import includes before/after 100 MB cap guards and rejects IDs that already exist; activation requires four inactive sourced records and 28 sourced opening days.
- Staged four inactive records, verified all seven opening days, sources, coordinates and group categories, then activated. Live status starts unknown with confidence zero. No accounts, secrets or community reports read or changed.
- Current total: 156 places, 151 active and 96 groups. Database: 14,208,147 bytes, growth of 237,568 bytes (0.238 MB) since baseline. Still below the 100,000,000-byte growth cap.
- Sandbox package access blocked the first test attempt. A lockfile cache restore allowed importer tests to run, but the mobile install still lacks Expo's base TypeScript config and React Native source/type files. Mobile QA remains unverified while that install is repaired; do not claim a passing type check or browser session from this batch.
- Further cache relinking did not restore mobile source/config files. A separate-cache install stopped with `ERR_PNPM_PACKAGE_MANAGER_REMOVE_MODULES_DIR` / access denied. All repair processes have ended; the sandboxed process that grew in memory was terminated after its PID and command were verified. User asked to close dev terminals and run `pnpm.cmd install --frozen-lockfile` from the main folder. No package versions, billing, account data or secrets were changed. This is a mobile QA constraint, not a reason to stop source research or the remaining directory work.
- Goal still includes other malls, non-mall businesses, baseline audits, filters, photos and the three UI redesigns. These four records are not completion.

### Leads Awaiting Checks

### Batch 07 Applied: Menlyn And Pet Stores

- Folder: `data/place-imports/2026-10-17-07-menlyn-pet-stores`. Four new candidates: Clicks Menlyn Park, Clicks Menlyn Maine, Absolute Pets Menlyn Maine and Absolute Pets Parkview. Two updates: Absolute Pets The Grove and Woodlands, to replace unpublished hours with the operator's weekly schedules and add branch contact/shop details.
- Six complete schedules expand to 42 opening days. Restored only the locked CSV parser, checking its npm archive against the lockfile SHA512. Full importer validation then passed with zero errors, plus assert checks for clinic exceptions, conflict provenance, image preservation and cap guards. Mobile/Vitest dependency restoration remains separate and incomplete.
- Clicks pages publish branch map coordinates in HTML data attributes. Store/pharmacy opening hours are separate from Menlyn Park clinic hours, including the first/last Saturday exception.
- Absolute Pets' operator locator differs from the Menlyn Maine tenant page and two existing mall-directory phone values. Prefer the operator, with conflicting sources and prior values retained in notes/service details. Do not erase the discrepancy or claim both phone values were tested.
- The operator locator also supplies Faerie Glen and Hazeldean hours. Their coordinates are still unverified. Boardwalk in this source is Summerstrand, Gqeberha and is excluded.
- Exclusive Books' locator verifies Menlyn Park shop LF51 and phone but has no branch hours; footer contact hours are not store hours. Menlyn Park's tenant fetch still returned a browser challenge.
- Staged four additions inactive and left both existing branches active. Verified 42 opening days, matching sources/dates, group categories and no kitchen rows, then activated. Existing live-status fingerprints match before/after; new live status remains unknown. No reports were changed.
- After batch 07: 160 places, 155 active, 96 groups; database 14,232,723 bytes, growth 262,144 bytes. SQL includes cap, duplicate-ID and expected-prior-evidence guards. The 67-record baseline audit, remaining mall coverage, category filters, photos and UI work remain required.

### Batch 08 Applied: Non-Mall Recreation

- Folder: `data/place-imports/2026-10-17-08-non-mall-recreation`. Added Thrashers Padel & Skate (Garsfontein) and Create Wolwespruit (Erasmuskloof), with 14 sourced opening days. Thrashers stays ungrouped; Create uses its own brand group rather than the host park. No out-of-scope Red Barn place added.
- Thrashers uses the place coordinates in the operator's directions link, not the map camera centre. Create uses the host site's documented directions destination, labelled shared site-level accuracy. No fabricated offsets.
- Create's phone is WhatsApp-only, so its call field remains empty; website/booking and service details supply contact routes. Paint nights remain separate from daily hours. Its inline email mismatch is recorded rather than copied without checks.
- Importer validation and assert-based batch checks pass. Staged inactive, checked sources, coordinates, grouping, contact handling and 14 opening days, then activated under before/after cap guards. Both new live-status rows are unknown with confidence zero.
- Current total: 162 places, 157 active, 97 groups. Database 14,249,107 bytes; total growth 278,528 bytes (0.279 MB), below the 100 MB cap.
- The Climbing Barn is a held lead: its source gives Mooiplaats and weekday member access, not seven-day public walk-in hours. Location/boundary and access evidence need review before import.

### Batch 09 Applied: Woodlands Hours

- Folder: `data/place-imports/2026-10-17-09-woodlands-hours`. Updated 22 existing branches with 154 opening days, shop numbers, ground-floor entrances and tenant-specific source links. No new groups or places.
- Each tenant's Opening Times section was checked, not the mall header or open-now cards. Outdoor Warehouse and The Fun Company have their own schedules. Dis-Chem retail hours do not establish clinic/pharmacy service hours.
- Importer validation and assert checks passed. Before/after cap guards and prior-record checks passed. Database verification confirms all 22 active records have seven sourced days and unchanged live-status hashes.
- Checkers' 22:00-22:00 schedule is held as a conflict, not interpreted as 24-hour trading. Pick n Pay Clothing's page returned SSO-only content; Toys R Us needs a branch-specific South African source. Their hours remain unset.
- Totals: 162 places, 157 active, 97 groups. Database 14,331,027 bytes; growth 360,448 bytes (0.360 MB), below the 100 MB cap. Full mobile/browser/Vitest checks remain pending dependency restoration.

### Hours Evidence Gap: After Batch 09

Excludes the protected test venue. A complete weekly schedule is not proof that the place is open now. No partial-week schedules were present in this check.

| Category ID | Active places | Seven opening days | No published opening days |
| --- | ---: | ---: | ---: |
| automotive | 6 | 6 | 0 |
| bar | 6 | 6 | 0 |
| entertainment | 4 | 2 | 2 |
| public_services | 2 | 1 | 1 |
| quick_bites | 28 | 28 | 0 |
| restaurant | 27 | 27 | 0 |
| shops | 79 | 35 | 44 |
| sport_outdoors | 4 | 3 | 1 |

48 active non-test places still lack published opening days. Prioritise operator/tenant sources for those gaps as well as remaining mall coverage. Do not fill them with mall hours, support-line hours or guesses. Baseline fact audits and all product/UI requirements remain incomplete.

### Frontend Support: 18 October

- Dependency restoration succeeded from a separate local cache using the lockfile. Standard `pnpm.cmd typecheck:mobile` now passes without reinstalling. No package version changes were needed for this restore.
- Category filters now support place types and directory tags: Departments for shops, Services & fuel for automotive, Services for public facilities and Activities for entertainment/sport. Food cuisines remain separate. Type lists above ten choices have search. Filters clear without erasing the place query; category changes clear selections from the previous category.
- Browser checks confirmed type search and Bookshop selection, reducing Shops from 43 grouped/standalone entries to three. The filter sheet uses the existing 720 px sheet constraint on desktop.
- Status & checks separates report evidence from listed-hours expectations. Evidence is behind disclosure; practical checks remain in an accordion. Practical counts use evidence, including busy-level and conflicting reports, rather than treating every answer as a boolean.
- Place information groups address, directions, contact, branches and provenance. Source notes are behind disclosure; source links pass the existing action-link URL checks and failures remain in the sheet.
- Signup uses email and password steps, an accessible progress value and a change-email command. Mode changes clear passwords. Confirmation no longer claims a draft was saved before the survey. Existing sign-in/recovery/Google services and callback intents are preserved.
- Full mobile flow suite passed 461 tests, including the practical-count regression and filter-width change. Shared/web suite passed 287 tests; mobile and core type checks passed. Browser proof covers dark-mode phone status/sign-in, place information, listing disclosure and directory filtering. Android hardware, live signup submission, native keyboard handling and a complete light/dark viewport matrix remain unverified.
- The supplied Mobbin library URLs redirected to its home page. No gallery comparison, account access or paid plan is claimed. Photos, the baseline audit, remaining mall/non-mall coverage and per-type report-question review remain in the goal.

### Batch 10 Applied: Clicks The Grove

- Folder: `data/place-imports/2026-10-18-10-grove-clicks`. Updated one existing branch from the operator's source: seven store/pharmacy opening days, phone, pharmacy phone, operator map pin and separate clinic exceptions. Retained shop L21 and the mall phone/source conflict in provenance.
- Guarded the prior record and absence of hours, then verified every imported day/time/source/date and unchanged live-status hash. No groups, places, accounts, images or reports added.
- Totals remain 162 places, 157 active and 97 groups. Database 14,331,027 bytes; growth 360,448 bytes (0.360 MB). Now 47 active non-test places lack opening rows.

### Batch 11 Applied: Dis-Chem Castle Gate

- Folder: `data/place-imports/2026-10-18-11-castle-gate-dischem`. Updated one branch using the operator's store page: seven opening days, shop 23, directions pin, dispensary contact routes and service details. Prior centre coordinate provenance retained.
- Clinic Saturday appointments at the beginning/end of the month and DeliverD hours stay separate from store hours. The website's open-now banner was not imported as a report.
- Importer validation and assert checks passed. Prior-record, unchanged live-status and cap guards passed. Database readback matched all seven times, sources and dates.
- Totals remain 162 places, 157 active and 97 groups. Database 14,339,219 bytes; growth 368,640 bytes (0.369 MB). There are 46 active non-test places without opening rows. No accounts, secrets or community reports read or changed.

### Batch 12 Applied: PNA Branches

- Folder: `data/place-imports/2026-10-18-12-pna-branches`. Added PNA Menlyn and Hazeldean under the existing group. Updated Castle Gate, The Grove and Woodlands from the operator locator, with 35 opening days, branch emails, directions links and operator map pins.
- Operator branch cards were parsed using the installed HTML parser. Castle Gate opens 08:00 on weekdays and Saturday; Menlyn closes 21:00 on Friday/Saturday. These are branch schedules, not mall defaults. Holiday hours remain unknown.
- Woodlands' operator lists shop 6 while the mall lists shop 7; prefer the operator, retain the conflict and do not carry the old shop's entrance/floor into current fields. Grove's operator locality wording differs from its directory region; retained both rather than guessing a boundary change.
- Importer and assertion checks passed. All 35 opening days, identities, contacts, service details and activity states matched database readback. Pin comparison allowed 1e-10 degrees for Postgres JSON float formatting. Existing status hashes match; new branches have unknown status and confidence zero.
- Totals: 164 places, 159 active and 97 groups. Database 14,363,795 bytes; growth 393,216 bytes (0.393 MB). There are 44 active non-test places without opening rows. Cap guards passed. No accounts, secrets or community reports read or changed.
- Yuppiechef's locator exposed addresses but not weekly hours; its loading/reCAPTCHA content is not evidence of a schedule. Crazy Store needs branch identification. Neither was assigned guessed hours.

### Follow-Up: Filter Regression And Public Services

- Reused the shared food-category predicate for cuisine filters. The aggregate `food_drink` category now keeps cuisines instead of hiding/clearing them. Dining filters remain restricted to restaurants/bars; shops and public services still have no food filters.
- Two regression tests failed before the one-line fix and pass after it. Filter/context/dialog checks pass 33 tests; the full mobile suite passes 463 tests across 38 files, and mobile TypeScript passes. Browser selection of Pizza reduced Food & Drink from 39 grouped/standalone entries to five; the collapsed accordion retained Pizza. The synthetic `food_drink` record variant is covered by regression tests, not claimed as live database content. Android device checks remain unverified.
- Public-service research holds are recorded in `2026-10-18-public-service-holds.md`: Shere's street number conflicts between council and Waze; Glenstantia's contacts/hours lack current confirmation. Neither was imported.
- Batch 13 FNB guidance is researched but not applied. The SQL write was cancelled and readback confirmed no changes. Do not retry that update without the user's approval of its exact fields. This does not block local code checks or further source research.

### Batch 14 Applied: Non-Mall Cycle Shops

- Folder: `data/place-imports/2026-10-18-14-cycle-shops`. Added Hot Spot Cycles (Faerie Glen) and Lynnwood Cyclery (Die Wilgers) as Shops / bicycle_shop. Both remain ungrouped: selling a manufacturer's products does not establish a chain branch.
- Operator pages supply 14 opening days including Sunday closures. Lynnwood's 07:00 bike drop-off stays separate from 09:00 shop opening. Holiday exceptions and service enquiries stay in notes/service details.
- Hot Spot's operator shop 3B/address takes precedence over a supplier's shop 2 search excerpt. Its business pin comes from Waze. Lynnwood's operator address configuration supplies its pin; a centre listing corroborates Die Wilgers locality. Neither pin is claimed to be a doorway. Specialized's redirected US locator was rejected.
- Added Die Wilgers beneath Pretoria and to the importer allowlist; the mapper already reads area labels from database regions. Validation, batch assertions and all 11 importer tests pass. Staging SQL inserts only, without upserts or changes to catalogue rows. Full staged rows and hours were checked before activating only these two IDs.
- Final database readback: 166 places, 161 active and 97 groups. Database 14,371,987 bytes; growth 401,408 bytes (0.401 MB). The 100 MB cap passed. There are 44 active non-test places without opening rows. Both live statuses start unknown with confidence zero.
- FNB's full-record fingerprint matches its pre-batch value; the cancelled batch 13 update remains unapplied. No accounts or community reports read or changed.

### Photo Display Support And Reuse Hold

- Discovery list/grid tiles now use branch image URLs through the existing PlaceImage component, with the current PlaceLogo initial underneath. Missing/failed requests retain that fallback; stale errors for a previous URL do not suppress a replacement. Group tiles with multiple branches retain initials rather than presenting one branch as every branch.
- Expo Image `cachePolicy=none` avoids app photo-disk caching. Documentation checked at `https://docs.expo.dev/versions/latest/sdk/image/`. A loaded image is not actively cleared by network monitoring, and a failed URL retries on remount or URL change; native reconnect handling remains a follow-up, not claimed complete.
- Photo credit, check date and validated source link appear behind About this listing. Existing action-link validation rejects unsafe source URLs. No extra provider or dependency added.
- Google Images query `Hot Spot Cycles Pretoria`: the first visible image result in this browser was Bicycle South's shop photo. Its full displayed JPEG URL matches the source page's Open Graph image. That page was updated in 2017 and supplies no verified reuse licence; it does not prove the shop's 2026 appearance.
- Batch 15 stores research and a proposed four-photo-field update only. The write failed with an expired request-state error; readback proves the full place row, hours and status unchanged. No retry. User asked whether to hold for permission or use credited URLs with a rights warning. Until answered, do not apply this photo update or treat the photo-rights question as resolved.
- Eight regression tests added. Full mobile suite passes 471 tests across 39 files; mobile TypeScript passes. Android image rendering, native offline/reconnect behaviour and directory-wide image coverage remain unverified/incomplete. The wider photo requirement is not complete.
- Browser check at `/restaurants/category/shops?q=Hot%20Spot` shows one result and retains the H initial in list/grid without a photo URL. Switching layouts works and the preview has no captured console errors. This verifies the no-photo fallback, not actual-photo rendering or an offline transition. Preview photo remains held because no URL was written.

### Further Leads

- Woodlands tenant pages expose branch hours, contact details, shop numbers and the centre's published map pin. These are useful for shops, but label centre-level coordinates. `https://woodlandsboulevard.co.za/shop/builders-warehouse` links other tenants including Tiger Wheel & Tyre, Outdoor Warehouse and Absolute Pets.
- Wolwespruit park imported in batch 06 after checking its location-map directions destination. Its tenants, including Trek, Salomon and Create, remain separate research leads; do not copy park hours onto them or group them under the park.
- `https://www.tshwane.gov.za/?page_id=10059` confirms the Shere customer care walk-in centre at 43 Struben Road, Shere AH. The listed 012 358 9999 is the municipal call centre, not a confirmed direct branch phone. Hours and an entrance pin remain unverified, so it has not been imported. Other Region 6 centres on that page are not automatically within this Pretoria East scope.
- `https://silverlakes.co.za/contact-us/` lists the golf phone (012 809 0430), La Quinta Street and estate GPS 25 degrees 46 minutes 19.8 seconds south, 28 degrees 22 minutes 13.7 seconds east. Confirm whether that pin is the golf club or estate access before importing. Weekly hours not established.
- Menlyn tenant pages returned a browser challenge on direct fetch; research agent snippets are not enough to mark those pages verified.
- Do not import Hatfield, Centurion, Pretoria CBD, Pretoria North or Pretoria West. Existing Padstal Hatfield must be flagged in the later audit rather than deleted without review.

## Initial Findings (16 October)

- Existing app category mapping turns unknown category IDs into restaurants. Extend the allowlists before activating records.
- Explore currently lists only restaurants, quick bites and bars.
- The report form and detail page show kitchen checks without a category guard.
- The importer requires a full week of hours and deletes existing hours on update. Change this before using it for this task; lack of evidence must not become a closed day.
- Existing categories already include pharmacy, hardware, petrol station and government office, but none currently have places. Preserve legacy IDs and links.
