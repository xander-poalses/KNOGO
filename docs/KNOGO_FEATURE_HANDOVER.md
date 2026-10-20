# KNOGO: Feature And Project Handover

Prepared: 19 October 2026.

Automation update, 19 October: per-account 18+ notice acknowledgement, eligible-account/place review, per-request provider aliases, quota readiness, server Cron dispatch, 24-hour retention and receipt wait reasons are deployed. The shared/web suite (304 tests), mobile suite (480 tests), SQL harnesses and type checks pass. Worker version 15 processed three reports across two accounts and three places through Cron. The first scheduled cleanup removed eight expired batches and retained profile counters. No passwords or server secret values were read. Android receipt/layout confirmation and remaining fault drills are not established by this evidence. Managed pg_net grants remain a platform constraint; the app Data API rejects its schema.

Purpose: give another chat the context needed to compare KNOGO with university requirements and return a task list. This is a feature inventory, not a claim that every feature is deployed, tested on a phone or ready for release.

## 1. Project Context

- Creator: Xander Poalses, Open Window. Project work relates to DV300 and UX300.
- Product: KNOGO. Tagline: "Know before you go."
- Problem: listed opening hours do not establish whether a place is operating or a service is available when someone visits.
- KNOGO combines a place directory, opening schedules, community observations and trip estimates to help someone decide whether to travel.
- Scope extends beyond restaurants. Shops were a survey priority. Garages, public services, entertainment and sport/outdoors form part of the expansion.
- Catalogue research is restricted to Pretoria East. Irene is deferred. A pre-existing Hatfield record is flagged for a scope decision, not removed without approval.
- The milestone is a progress review before the main hand-in. It is not the product name or a separate edition of KNOGO.
- The student's earlier "40%" statement described expected implementation progress. It was not a rubric score or a requirement to label the app 40% complete.
- The frontend was designed through code. The student confirmed that screenshots count instead of Figma for this review.
- Do not invent pitch roles, an ERD or a Figma deliverable. Check the lecturer's documents before listing any as requirements.
- The student has someone who can test the app. Do not claim that outside-user testing or its write-up is complete without the results.

## 2. How To Read This Handover

| Label | Meaning |
| --- | --- |
| Implemented | A code path or interface exists. This alone does not prove deployment or device behaviour. |
| Demonstrated | A test result or user demonstration exists, within the limits stated. |
| Conditional | Depends on configuration, provider access, network, permissions or server state. |
| Incomplete | Work remains. Do not present it as a working feature. |

The main interface is the Expo app in `apps/mobile`. It runs on Android and through React Native Web. A React/Vite interface also exists in `src`, but it is not proof of feature parity with the Expo app. iOS paths exist; no iOS release or device verification is claimed.

## 3. Navigation And Home

Implemented:

- Four tabs: Home, Explore, Saved and Settings.
- KNOGO header, brand artwork and information entry point.
- Home search opens a sheet with keyboard focus.
- Search by place name, chain/group, area, address, type and indexed tags, including cuisine where relevant.
- Suggestions link to a branch's detail page.
- Recent searches persist on the device and can be cleared.
- Search submission opens results; selecting a suggestion opens that place.
- Back actions connect category, group, place, account and reporting flows.
- The bottom navigation has a surface/shadow to separate it from scrolling content.

## 4. Explore And Discovery

Implemented:

- Category selection, category results, search results and nearby results.
- Stand-alone places and chain groups are represented separately.
- A group opens a branch-selection page instead of treating the chain as one physical venue.
- Branch names, area and status summaries appear in results.
- Result counts, loading placeholders, no-match states, errors and refresh actions.
- Pull-to-refresh where supported by the results screen.
- A "Status now" section uses report-derived indications, not a blanket promise that listed hours prove a place is open.
- Nearby discovery requests foreground location permission when used.
- Distances and ordering can use the device location. Area selection provides a fallback when location cannot be used.
- List/grid layout exists; the current mobile-width layout stays a list. Wider layouts can switch to a grid.
- Explore layout preference persists on the device.
- Saving from general discovery rows has been removed. Saving is available on place details; Saved supports removal.

### Categories

| Category | Scope and examples |
| --- | --- |
| Food & Drink | Restaurants, cafes, takeaways, fast food, bars and pubs. Earlier restaurant/bar/cafe categories remain supported. |
| Shops | Supermarkets, clothing, pharmacies, hardware, pet shops, book/stationery shops, bicycle shops and shopping centres. |
| Cars & Garages | Fuel stations, tyre/fitment centres, workshops and other automotive services. "Garage" uses the South African meaning. |
| Public Services | Home Affairs and other government counters, post offices, libraries and municipal services. |
| Entertainment | Cinemas, theatres, museums, attractions and gaming venues. |
| Sport & Outdoors | Gyms, golf, trails, climbing, parks and other activity facilities. |

These are category capabilities, not proof that every listed place type has catalogue coverage.

### Filters

- Filter sheet uses accordions with selection summaries and a clear-filters action.
- Area and place-type options come from the category's records.
- Non-food tags have contextual headings: Departments, Services & fuel, Services or Activities.
- Cuisine filters apply to food categories.
- Listed-hours-after and busy-level controls are restricted to restaurant/bar category contexts.
- Type options can be searched when the list needs it.
- Search text is retained through filter changes.
- Unsupported selections are cleared when changing category context.
- The removed "Community & venue checks" filter group is not presented as a general filter.
- Shared code still contains status-based filtering primitives. Do not mistake every internal filter field for a visible mobile control.

Incomplete: category-specific filtering needs a review against the growing catalogue. This is not a full service-availability filter for every place type.

## 5. Branch Selection And Maps

- Group page shows chain name, description, one branch-count heading and branch choices.
- Android/iOS branch-map code uses Mapbox. Browser-map code uses a separate Google Maps implementation and key.
- Mapbox uses light/dark styles with KNOGO marker treatment.
- Branch markers have labels and select the branch.
- Inline map panning/zooming is disabled so it does not compete with page scrolling.
- Expanding the map enables map interaction; it can be closed again.
- A location action requests permission and adds the user's icon when a position is obtained.
- Map fitting keeps branch markers in view; coordinates are checked before use.
- Map failures do not replace the branch list with a dead end.
- Mapbox attribution remains visible; SDK telemetry is disabled in this component.
- Expo Go cannot provide Mapbox's native code. A development APK is required.
- The latest fix defers SDK loading and checks for its native module. An APK without it gets an install message rather than a launch crash.

Demonstrated: on 19 October the Android build passed, and the APK was inspected for `RNMBXModule` and Mapbox ARM libraries. The user still needs to confirm installation, launch and map rendering on that build. Do not claim a phone check from a browser check.

## 6. Place Details

Implemented:

- Place name, area, back action and save/favourite heart.
- Status heading and, where relevant, a serving subheading.
- Report-age/evidence presentation rather than an accuracy percentage.
- Separate actions for recent reports, leaving a report, listed hours, trip planning and place information.
- Contact action opens contact/direction choices.
- Links for phone, website, menu and directions when supplied and valid.
- A missing contact or menu is not invented.
- Navigation to other branches where applicable.
- Refreshing a place/report snapshot and retrying when it fails.

### Status And Checks Sheet

- Separates community observations from expectations based on listed hours.
- Shows evidence, check method and time, including disagreements.
- Practical checks sit behind an accordion.
- Available checks include walk-ins, card machine, power and busy level.
- Missing evidence is shown as unknown/no recent check, not a positive answer.
- A report action remains available from the sheet.

### Listed Hours Sheet

- Shows the week's opening schedule and kitchen/service hours when records exist.
- Missing service hours remain unknown.
- Schedules may support overnight trading.
- A schedule is not a live status check or a promise about arrival.

### Place Information Sheet

- Address, directions and contact choices.
- Category/tags/features and branch navigation where available.
- "About this listing" accordion with source link, check date and data notes.
- Photo source/credit/check-date support when a photo exists.
- Data-correction/support entry and venue-representation entry.
- URL handling rejects unsupported/unsafe action links.

Limit: research metadata can exist in `service_details` without every field having a dedicated interface row. The UI must not be described as displaying all stored research fields.

## 7. Community Report Flow

- Browsing does not require an account.
- When live reporting needs an account, a sign-in/create-account sheet appears before the survey.
- The survey presents one question per step with progress, Back and Continue actions.
- Check method: at the venue, by phone or online.
- Online reports require a source URL.
- Current observation types: open/closed, kitchen serving, busy level, walk-ins, card machine and power.
- Busy choices: quiet, normal, busy or packed.
- Card choices include working, not working and cash only.
- Power choices include normal, limited and closed.
- Kitchen is skipped for non-food categories.
- A user can choose "Did not check" rather than invent an answer.
- Extra practical questions are optional through "Add more checks".
- Review step shows the method and answers, with edit actions.
- At least one observation is required before submission.
- Submission validation, in-flight protection and feedback handle failure or repeat taps.
- A pending report is saved around submission/auth recovery. Restoration is place-bound and age-limited; this is not a general offline report queue.
- Receipt distinguishes a recorded report from a guarantee of availability.
- The receipt can show a conflict outcome and the check method.
- Back-to-place navigation returns to the venue.

Incomplete: the current survey still uses restaurant-origin questions such as busy level and walk-ins across other categories. It does not yet implement all planned type-specific checks: fuel grades/pumps, government systems/queues, parcel counters, trail access, cinema sessions, workshop operations, etc. Hiding kitchen alone is not completion of category-aware reporting.

## 8. Report Trust And Status Rules

Implemented in shared logic and backend migrations/functions:

- Reports are evidence, not votes that establish truth.
- Observations have time, check method, provenance and expiry.
- Live evidence expires after four hours; expiry does not mean deleting the stored report.
- Each account contributes its latest usable observation for a check.
- Opposing usable evidence produces a disagreement instead of choosing a side.
- Negative community indications require three accounts aged at least 24 hours, two checking methods, a 15-minute span and low-risk assessments.
- Such an indication is labelled "Likely closed" or equivalent, not proof of closure.
- Missing, malformed or failed AI assessments cannot supply the evidence needed for a community closure indication.
- High-risk observations do not contribute to the displayed status. The UI does not accuse the reporter of lying.
- Venue statements and community evidence remain distinguishable.
- UI status is recalculated as evidence ages; expiry is not dependent only on restarting the app.
- Input validation and server-side access/rate rules support the flow.

These thresholds are product rules, not research-backed probabilities. Separate accounts are not proof of separate people. Historical docs that say the trust migration was absent refer to earlier dates and must not override the later deployment record.

## 9. Gemini Report Assessment

- A report can create a job in a server-side queue.
- The `report-risk` Edge Function is a worker, not an app request carrying a Gemini secret.
- The worker obtains context, reserves provider quota, calls Gemini, validates its response and records an assessment.
- Context uses pseudonymised identifiers. The model does not receive an account password or the server keys.
- Gemini checks reporting patterns for signs of coordination/abuse. It does not observe the venue, prove a report, track a crowd or determine who is lying.
- Failure handling covers disabled provider, quota, timeout, provider failure, malformed output and insufficient context.
- Queue processing uses leases and guarded completion to avoid overlapping work.
- The author can read the assessment receipt without gaining access to other authors' private receipts.
- Receipt states include waiting, reviewing, complete, unavailable and review-window ended.
- The UI polls waiting/reviewing states for a bounded number of checks and offers manual refresh.
- A failed assessment does not erase the report.
- Provider keys, worker credentials and pseudonymisation secrets remain server-side.

Demonstrated: the user supplied a screenshot showing "Gemini review complete", "No pattern flagged" and a review time after a worker result of `completed=1, deferred=0`. This proves a test result, not service for every user.

Current code limitation: the worker is restricted to `RISK_TEST_ACTOR_ID` and `knogo-gemini-test-venue`, and handles at most one job per invocation. Do not claim that ordinary public reports receive Gemini review. Provider enablement, scheduling and quota state must be checked before a demonstration; no live configuration was re-read for this handover.

## 10. Trip Planner

- Opens from a place without requiring sign-in.
- Origin can be device location or a searched address.
- Device location is permission-based and requested when needed.
- Address search returns choices; changing the origin invalidates the prior route estimate.
- Departure can be now or a chosen date/time.
- Past departure input is rejected.
- Requests a driving route through a backend service using openrouteservice.
- Shows route distance, duration and arrival time.
- Compares arrival with listed opening hours and kitchen/service hours when supplied.
- South African time and overnight schedules are handled in the calculation layer.
- A return-fuel toggle can request a return leg; return distance is not blindly assumed equal to outbound distance.
- Opens an external directions application/link.
- Cancels work on unmount/change and guards against overlapping requests.
- Handles denied location, no route, address failure, provider quota and missing configuration.
- Provider attribution and estimate limits are shown.

Limits: routes are estimates, not live-traffic predictions. An expected-open result at arrival is based on schedules, not a reservation or guarantee. Routes and geocoding need a network and provider availability. The user previously confirmed the trip calculator worked; the whole flow has not been rechecked on the 19 October APK.

## 11. Fuel Estimates And Preferences

- Enter consumption in litres per 100 kilometres.
- Alternatively calculate consumption from distance driven and litres used between two full-tank fills.
- Require confirmation of the full-tank method; a partial refill is not enough to establish consumption.
- Choose petrol 93, petrol 95, diesel 50 ppm or diesel 500 ppm.
- Choose the supported pricing region and/or enter a price-per-litre override.
- Accept decimal-comma entry where supported.
- Save, update and clear fuel preferences through Settings.
- Trip planner can add fuel details when missing.
- Calculate litres and cost in rand from route distance, consumption and price.
- Include return-leg fuel when selected.
- Route information can still be shown without a fuel-cost result.
- Fuel-feed code supports a configured source, terms acknowledgement, source/effective dates, validation and bounded caching.

Incomplete: do not claim an automatic fuel-price feed is operating. Source rights, ingestion and configuration remain gates. Manual price entry is not an automatic feed. Diesel reference prices may be wholesale rather than the pump price; the interface notes that distinction. Driving conditions, load and roads affect actual use.

## 12. Accounts And Authentication

- Email/password sign-in and account creation through Supabase Auth.
- Two-step signup: email, then password, with progress and ability to edit the email.
- Password visibility control, validation and busy/error feedback.
- Google OAuth flow and callback handling; subject to provider/redirect/build configuration.
- Email confirmation when required by the backend.
- Signup messaging does not claim that an email definitely arrived or that an existing account's password changed.
- Password recovery email and password-reset screen.
- Auth callbacks handle return URLs and report/venue destinations.
- Session restoration, refresh/adoption and sign-out.
- Android/iOS session persistence uses SecureStore; browser persistence differs.
- Native storage includes migration handling from the earlier storage path.
- Settings shows the signed-in email and account actions.
- Form errors use feedback components rather than turning every failure into a page-sized error.

Limits: do not claim email confirmation can be skipped just because it was discussed. Current backend policy determines confirmation. Google and email delivery need device/provider checks. Auth rate limits are not removed. Account deletion is a support request, not a completed self-service deletion flow.

## 13. Saved Places

- Save/unsave a place from its detail page with a heart.
- View saved places in the Saved tab.
- Remove a saved place from that list.
- Saved IDs persist on the device.
- Saved view supports loading, empty/error/cache states and refresh.
- A wider viewport can use grid/list presentation.

Limit: this is not a proven cross-device/cloud-synced favourites service. Do not describe local saved IDs as account-wide synchronisation or multiple named lists.

## 14. Settings, Support And Privacy

- Appearance choices: system, light and dark, with persistence.
- Fuel/trip preference setup and clearing.
- Sign-in/create-account and sign-out access.
- Support/data-correction screen opens an email application when a support address is configured.
- A place-specific correction can carry the place identifier in the email subject.
- Privacy/community-rules screen.
- Account deletion requests are directed through support.
- Diagnostics consent prompt; declining or closing leaves diagnostics off.
- Conditional Sentry crash reporting and PostHog action counts after consent/configuration.
- Telemetry code removes account/request data and restricts event properties. Search text, report answers, source links and coordinates are not intended telemetry payloads.
- Session replay and automatic lifecycle capture are disabled in the configured telemetry path.

Limits: no claim of a privacy-law compliance audit, hosted policy publication or complete deletion workflow. A telemetry setting in a data type does not mean every setting has a visible control. Native transport/privacy behaviour still needs verification beyond mocked tests.

## 15. Venue Representative Flow

Implemented interface/backend scaffolding:

- A signed-in user can request access to represent a venue.
- Verification targets a KNOGO-held, sourced phone number, not a number entered by the claimant.
- SMS/voice choices, challenge/code handling, attempt limits and expiry exist.
- Verified-access interface can publish updates or disputes about a check.
- Venue statements expire as live evidence and cannot delete community reports.
- Phone access is not proof of legal ownership.

Incomplete: an approved delivery provider and end-to-end phone verification are not established. Do not demonstrate this as an operating SMS/voice service or an owner administration platform. A screen or passing handler test is not message-delivery evidence.

## 16. Offline, Loading And Error Behaviour

- Place catalogue snapshots are cached on the device after successful fetches.
- When fetching fails, an existing cache can be used with its timestamp/staleness notice.
- Cache age threshold is seven days; that is separate from four-hour report evidence expiry.
- Cached evidence is not silently promoted to current truth.
- No cache/no data produces an error/retry or empty state, not an invented live catalogue.
- Recent searches, saved IDs, theme, fuel choices and pending report data have persistence paths.
- Account and network operations have validation, busy states and failure feedback.
- Missing map SDK/token/provider does not mean branch selection must stop.

Limits: caching does not make auth, report submission, AI, routing or map downloads work offline. There is no proven general offline synchronisation queue. Connectivity recovery and cache behaviour still need phone testing.

## 17. Place Data And Research

- Supabase PostgreSQL stores places, branch groups, regions, hours and report-related records.
- Directory records can include category, type, address, coordinates, phone, website, menu, tags, features, service details, source URL and check date.
- Opening and kitchen schedules are stored separately when sourced.
- Stand-alone businesses are not forced into a chain. Tenant businesses are not grouped under a mall as if the mall were their chain.
- Shared mall coordinates must be identified as centre-level, not presented as a verified shop entrance.
- Operator sources are preferred; source conflicts and gaps are recorded instead of invented facts.
- Catalogue imports use CSV validation, generated SQL/review artefacts and readback checks.
- New imports start inactive until checked. Existing inactive records are not silently activated during audits.
- Live reports/status and directory facts are treated as separate data.
- A growth cap of 100,000,000 bytes above the expansion baseline is enforced in the guarded batches.
- Research uses Firecrawl and operator/mall sources; import evidence remains in the repository.

Last readback checkpoint, 18 October: 166 places, 161 active, database 14,396,563 bytes. Growth from the 13,970,579-byte baseline: 425,984 bytes. These are dated values, not a live storage-quota reading on 19 October.

Coverage work includes Menlyn/Menlyn Maine entries, Grove, Castle Gate, Woodlands, Parkview/Woodhill and non-mall cycle/skate/trail businesses. This is not a complete inventory of Pretoria East or every tenant at every mall. Brooklyn, Lynnwood Bridge and other centres still need coverage/audit work.

Known data work:

- 44 active non-test places lacked opening rows at the last checkpoint.
- All 67 pre-expansion records were inventoried; only three Doppio branches have completed the documented operator facts-review batch in that baseline audit.
- Two Crawdaddy's branches have a researched/validated update batch, not yet applied. Do not count their proposed hours as saved.
- Five pre-existing inactive places remain preserved pending review.
- Test venue is identified as a fixture, not a business recommendation.
- FNB Grove service-guidance update is held following the user's SQL concern. Do not reapply without approval of that change.
- Kitchen hours, holiday changes, accessibility and entry requirements are not filled by guessing.

## 18. Images And Branding

- Business logos were removed from place presentation; initials remain a fallback.
- Image component accepts place-photo URLs, retaining initials when missing/loading fails.
- List/grid callers and photo attribution/source presentation are implemented.
- No binary photo needs to be stored in the database for this URL approach.
- Image requests use a no-cache policy in this component.
- Multi-branch group tiles do not use one branch photo to imply every branch looks the same.

Permission hold: Google ranking and credit do not grant reuse rights. The user said to hold Hot Spot's candidate photo until permission is confirmed. No candidate photo URL was applied. Other photos without reuse permission are also held. Do not claim photos avoid copyright risk merely because they are not logos or are hotlinked.

Offline limit: a loaded photo is not cleared by a connectivity monitor. A failed URL retries on remount or URL change; automatic reconnect retry is not implemented. Photo loading/offline transitions need Android verification.

## 19. UI And Accessibility Work

- Shared colours, typography, controls, modal/sheet surfaces and theme support.
- DM Sans typography and Lucide icons.
- Status/checks and place-information sheets were restructured.
- Signup and reporting use steps to reduce decisions per screen.
- Accordions hide detail until requested.
- Loading skeletons, toasts, retry states and disabled/busy controls.
- Accessibility roles, control labels, selection/expanded state and progress announcements.
- Modal staging, focus restoration/keyboard handling and reduced-motion support in relevant components.
- Haptic feedback for supported actions.
- Text/colour contrast tests exist.

Limits: no accessibility-conformance claim. TalkBack, text scaling, hardware Back, keyboard, safe-area, modal and motion behaviour need device checks. The aim of no survey scrolling is not proved across every device, font scale or answer-review length. Mobbin links were supplied for inspiration but redirected to a homepage in the earlier review; do not claim a completed screen-library comparison.

## 20. Architecture And Development

| Area | Implementation |
| --- | --- |
| Main app | Expo SDK 57, React Native 0.86, Expo Router, TypeScript |
| Browser preview | React Native Web through Expo |
| Other web interface | React/Vite in `src`; separate coverage limits |
| Shared logic | `packages/core`: types, API clients, filters, schedules, trust, cache and fuel/trip calculations |
| Accounts/database | Supabase Auth and PostgreSQL |
| Backend | SQL functions/RLS plus `trip-planner`, `report-risk` and `venue-claim` Edge Function code |
| AI | Gemini server adapter and report-risk queue |
| Maps | Mapbox on native; Google Maps browser implementation |
| Routing/geocoding | openrouteservice through the backend |
| Persistence | AsyncStorage for app data; SecureStore for native auth sessions |
| Diagnostics | Sentry/PostHog behind consent and configuration |
| Tests | Vitest, flow tests and database/worker QA scripts |
| Research/imports | CSV importer, guard/review/readback artefacts, source evidence |

- Server secrets must not be placed in `EXPO_PUBLIC_*` variables or sent to the client.
- Publishable client keys and public map tokens have a different role from server/provider secrets.
- Development APK needs Metro on the PC. It is not yet a standalone production/tester release.
- Native dependencies/configuration changes require an APK rebuild; JS reload cannot install a native module.
- Same-Wi-Fi development and APK download have been used without a USB cable.
- Local Supabase/Docker and Mailpit have been used for signup/report tests. Mailpit catches local test email; it is not Gmail or proof of hosted email delivery.
- Hosted Supabase and local Docker are separate environments, not automatically synchronised copies.
- Full migration replay needs attention: the repository notes catalogue seeds between migrations, so a bare reset is not proof of reproducibility.

## 21. Verification State

Checked on 19 October for the Mapbox launch fix:

- 472 mobile tests passed across 39 files.
- Mobile TypeScript check passed.
- Android `assembleDebug` passed using the local toolchain.
- APK inspection found the Mapbox module and libraries for ARM64 and ARMv7.
- The build download endpoint returned HTTP 200 with the APK size.
- User installation/launch/map check on that APK remains open.

Existing suites also cover shared/browser logic, trust, provider handling, SQL permissions, callbacks, storage, catalogue validation, modal behaviour and trip maths. Do not describe all of them as rerun on 19 October: the current pass reran the mobile suite and mobile type check, not every repository/backend check.

Test warnings remain in some React flow tests and a web pointer-events deprecation. Passing tests establish their assertions, not production uptime, live data completeness or accessibility compliance.

## 22. Not Implemented Or Not Established

- App Store/Play Store release or a standalone distribution workflow proven with testers.
- A complete Pretoria East catalogue and facts audit.
- Opening/service/holiday hours for every record.
- All category-specific report questions and operational filters.
- Automatic review of ordinary users' reports by Gemini; current worker is test-scoped.
- Crowd-presence tracking, background location monitoring or AI proof that a closure report is false.
- An approved automatic fuel-price feed with proven ingestion and rights.
- Venue SMS/voice delivery and a completed ownership/representative lifecycle on a phone.
- Cloud sync of saved places, named favourite lists, social follows or chat.
- Self-service account deletion or a full account-profile editor.
- Push alerts for saved places. A notifications field in storage is not a push feature.
- In-app booking, ordering, purchasing, payments or fuel purchases. Links may open an external service.
- Turn-by-turn in-app navigation or traffic prediction.
- User photo upload or a permission-cleared place-photo catalogue.
- A monetisation system, paid plan, subscriptions, ads or provider billing approval.
- Full offline operation, provider uptime guarantees or a guarantee that fetch errors can never occur.
- Security, privacy or accessibility certification.

## 23. What The University-Requirements Chat Should Return

Compare this inventory with the actual lecturer agreement/rubric, pitch and submission instructions supplied by the student. Do not turn every product ambition into a university requirement.

Return:

1. A requirement-by-requirement checklist, quoting or identifying the rubric source.
2. What can already be demonstrated, separating code/tests from phone/provider evidence.
3. Missing features versus missing evidence/documentation.
4. A task order for the time available before hand-in.
5. A demonstration sequence and the screenshots/video/testing results needed.
6. Any requirement that is unclear, rather than an invented assumption.
7. Work that can wait until after submission, with the reason.

Avoid declaring a completion percentage from test counts, catalogue size or this document's length. The student will bring the response back to the implementation chat before changes are made.

## 24. Source Map For Follow-Up

Paths below are relative to the KNOGO repository so another chat can locate evidence if the repository is supplied.

| Subject | Source |
| --- | --- |
| Home, discovery, saved and settings | `apps/mobile/src/screens/` |
| Place dashboard and sheets | `apps/mobile/src/screens/PlaceDetailScreen.tsx` |
| Report survey and receipt | `ConfirmScreen.tsx`, `apps/mobile/src/components/ReportAssessmentReceipt.tsx` |
| Signup and recovery | `apps/mobile/src/components/AccountForm.tsx`, `PasswordResetForm.tsx`, `apps/mobile/src/auth/` |
| Maps | `apps/mobile/src/components/BranchMap.native.tsx`, `BranchMap.tsx` |
| Trip/fuel UI | `TripPlanner.tsx`, `FuelPreferencesForm.tsx`, `apps/mobile/src/state/FuelContext.tsx` |
| Categories/filters | `packages/core/src/utils/categories.ts`, `filters.ts`, `apps/mobile/src/filterContext.ts` |
| Trust and reports | `packages/core/src/trust.ts`, `packages/core/src/lib/supabaseApi.ts`, `supabase/migrations/` |
| Provider/worker code | `supabase/functions/` |
| Session/cache/saved behaviour | `apps/mobile/src/state/PlacesContext.tsx`, `sessionStorage.native.ts`, `packages/core/src/placeCache.ts` |
| Diagnostics | `apps/mobile/src/telemetry.ts`, `components/TelemetryGate.tsx` |
| Catalogue plan and audit | `docs/PLACE_CATEGORIES_AND_DATA.md`, `data/place-audits/`, `data/place-imports/` |
| Android setup | `apps/mobile/README.md`, `docs/MAPBOX_REVIEW.md` |
| Test/demonstration material | `docs/DV300_TESTER_GUIDE.md`, `docs/DV300_REPORT_SCENARIOS.md`, `docs/evidence/` |
| Historical implementation notes | `docs/DV300_MILESTONE_PROGRESS.md`, `docs/TRUST_AND_TRIP_IMPLEMENTATION.md` |

Historical files contain earlier blockers and counts. Use dates and current code/readback evidence before treating those entries as current state. No credentials or secret values are included in this handover.
