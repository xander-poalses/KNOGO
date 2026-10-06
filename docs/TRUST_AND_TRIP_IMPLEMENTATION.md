# Trust and venue trip planning

## Scope and completion gates

The attachment dated 1 October 2026 is the scope. This checklist tracks implementation and verification, not a reduction of that scope. No deployments or purchases are authorised.

- [ ] Replace two-account consensus with server-enforced trust rules, source/time/expiry per claim, conflicts and no unqualified community closure.
- [ ] Remove accuracy-like confidence scores from the experience.
- [ ] Integrate Gemini risk assessment with pseudonyms, structured output, failure handling, budgets and diagnosis records.
- [ ] Implement venue claims to a KNOGO-held phone from an independent source, OTP, updates and disputes with no report deletion.
- [ ] Add expandable planning to venue pages without authentication or another tab.
- [ ] Implement location or address origin, departure, outbound and return routes, arrival and navigation.
- [ ] Implement South African overnight schedule comparison with separate service hours.
- [ ] Implement once-per-feature skippable fuel onboarding and Settings persistence.
- [ ] Implement fuel arithmetic, grades, regions, override and a researched feed with source/date/rights/cache handling.
- [ ] Document provider costs, free limits, payment requirements and failure behaviour before adoption.
- [ ] Test server authorisation, trust rules, AI failure, fuel, schedules, storage, permissions and offline failure.
- [ ] Run repo checks and inspect venue flow in both themes; preserve Home, Explore, Saved and reporting.
- [ ] Record credentials, cost approvals and phone QA that remain. Do not mark the full goal complete while any gate remains.

## Gate Review, 5 October 2026

This is not a completion claim. The attachment remains the scope. File and
test evidence proves code behaviour only within the tested boundaries.

| Requirement | Evidence inspected | Remaining proof or work |
| --- | --- | --- |
| Password and Google access, restore, refresh, sign-out | AccountForm, googleSignIn, callback screen, storage, PlacesContext; mobile/account/core API tests | Google provider disabled at last hosted check; email delivery, redirects and account/device QA needed. Tokens currently use AsyncStorage, not encrypted device storage. |
| Dashboard, status/hours/trip sheets and floating contact | PlaceDetailScreen, PlaceSheet, TripPlanner; flow tests and recorded browser light/dark checks | Native safe areas, text scaling, TalkBack and hardware Back are not verified. |
| Backdrop before sheet, input focus, haptics | StagedModal and HapticPressable tests; recorded browser focus checks | Phone motion, keyboard and vibration need device checks. |
| Trust, source/time/expiry/conflict, no unqualified community closure or accuracy score | Core trust tests, mobile status tests, pending trust SQL and disposable database harness | Trust migration absent at last hosted check. Deployment is not authorised by the attachment; hosted RPC/RLS checks needed after approval. |
| Gemini pattern risk, JSON validation, privacy, uncertain fallback and caps | providerServices, riskQueue, worker entry tests, trust SQL quota tests; 5 October model/terms review | Credentials, project quota/billing verification, data-use decision and scheduler deployment are open. No live assessment proven. |
| Venue-held sourced phone, SMS/voice, updates/disputes without deleting reports | VenueScreen, venueClaims handler, claim lifecycle and database/HTTP tests | Production delivery is null. No approved zero-cost messaging provider, source rows, deployed claim function or end-to-end verification. |
| Anonymous trip planning, origin/departure/return, distance/duration/arrival/navigation | TripPlanner, tripApi and trip tests; trip-only hosted function/caps check | Phone GPS and provider-backed route/address/return recovery still need QA. Mock responses are not integration proof. |
| South African schedules and separate service timing | trip/time/arrival tests and planner presentation | Verify on phone against a route result and overnight/missing schedules. Listed hours must not become verified live claims. |
| Consumption, tank fills, grades/region/override, persistence and once-per-feature onboarding | FuelPreferencesForm, FuelContext, fuel storage/trip tests; root layout | Settings/planner setup exists. First-launch prompt removed by later redesign; decision requested, not counted complete. |
| Fuel feed units, dates, source, rights, diesel basis, cache and failure | fuelFeed contract/cache tests and FUEL_DATA_SETUP review | Feed disabled. Upstream data rights, effective intervals, coverage and hosted ingestion remain unresolved; manual override is not a feed substitute. |
| Preserve search, Explore, Saved and reporting | Search/filter/core tests, screen tests, refresh and Saved persistence tests | Full phone flow, offline recovery and report submission against deployed trust model remain open. |
| Checks and documentation | 326 mobile tests, 241 core/web tests, type checks, SQL harness, Android export, MyProblems; Deno 2.9.6 checks all three server entries | Current Android export includes account and diagnostics fixes. Expo Doctor flags 14 patch updates; Sentry setup missing; deployment/device checks remain open. |

No spending, messaging, billing, trust deployment or account creation follows
from this gate review. Setup steps are in ACCOUNT_SETUP, RISK_QUEUE_SETUP,
VENUE_VERIFICATION and FUEL_DATA_SETUP. A passing row of tests cannot close a
provider, deployment or phone gate.

## Product Rules

These are application choices, not research conclusions or probabilities of truth.

- Structured observations expire after four hours. Device calculations reject expired evidence and future timestamps.
- Each account contributes its latest observation for each check. Distinct accounts are not proof of distinct people.
- Any opposing usable observation makes that check read Reports disagree, including venue/community disagreements.
- An open observation may be shown as Community reports open. This is not a guarantee about a future arrival.
- A negative community indication requires at least three accounts aged at least 24 hours, at least two check methods, a 15-minute span, and a low-risk assessment. It is labelled Likely closed or Likely not serving, never an unqualified closure.
- Missing, malformed, timed-out or unavailable risk assessment cannot enable a negative indication. Medium risk preserves uncertainty; high-risk observations do not contribute to the status. No accusation is shown.
- A verified venue update is a statement by someone who received a code at a sourced venue number, not proof of legal ownership. The statement does not delete community evidence.
- Every claim carries its evidence, check time, expiry and rule code. No accuracy-like percentage is presented.

## Work state

### Hosted check, 4 October 2026

Supabase MCP and the public Auth settings endpoint were read without changing
the project, sending messages, signing in or submitting reports.

- Project `ivzofixdjcgkwalfzmmy` is `ACTIVE_HEALTHY`. Earlier INACTIVE notes
  below are historical and do not describe this check.
- Email access is enabled, signup is enabled, and email auto-confirm is off.
  Google access is disabled. The Expo Google enablement flag is absent.
  Password code exists, but account creation, delivery and sign-in have not
  been tested against the hosted service with an account.
- Hosted migration history contains the earlier closed-beta report migrations
  and the trip-only cap migration, not the trust-model migration.
- The actual `knogo_private.trust_rules`, `report_risk_jobs` and
  `venue_claim_challenges` tables are absent. The new trust model, Gemini queue
  and venue claim lifecycle must not be described as live.
- The only listed Edge Function is `trip-planner`, ACTIVE, version 2.
- `knogo_trip_private.provider_limits` enables both addresses and routes at
  100/day and 10/minute. Reading these rows did not consume routing quota.
  This verifies stored caps, not provider response or phone behaviour.

Local checks on 5 October: 326 mobile tests and mobile TypeScript pass.
Android export `.expo/trust-dashboard-current-export` completes with modal
readiness, separated startup reads, session validation, the in-flight refresh
guard and ordered Saved persistence included. All 241 core/website tests and
the in-memory trust/RLS/provider-cap/venue-claim harness pass on 5 October.
The export includes the report-registration review URL correction, account-form
completion guard and diagnostics filtering. Eight diagnostics tests cover app
payload limits and the JavaScript Sentry filter, not native transport or hosted
provider collection. The export contains 3937 modules and 49 assets.
Ten risk-worker entry-handler tests cover caller authentication, request
validation and failure redaction with simulated server calls. Website
TypeScript passes. A pinned `pnpm.cmd dlx deno@2.9.6 check` subsequently passes
for trip-planner, report-risk and venue-claim entry points. No workspace
dependency change or deployment was needed. Handler/type tests still do not
prove hosted worker behaviour or provider delivery.
The undeployed trust migration also enforces provider daily limits over a
rolling 25-hour window, alongside minute/UTC counters. The SQL harness verifies
rollover rejection and expiry/pruning. This does not enable Gemini or prove an
account's free allowance, token quota, billing state or data-use suitability.
Expo Doctor passes 20/21 checks, with 14 SDK 57 patch-version updates flagged.
The export also warns about missing Sentry organisation/project configuration.
Neither a bundle nor these tests prove hosted account or phone behaviour.
Chrome checked the dashboard disclosure commands, hours in both themes,
Escape/focus return and contact dimensions at four widths. Subsequent Chrome
checks confirm address and Home search focus after sheet entrance. Phone
keyboard, haptics, safe areas, TalkBack and hardware back remain unverified.

Required next gates: Google provider credentials/redirect setup and account
QA; explicit authorisation before deploying the trust migration/functions;
Gemini account terms/quota configuration; a permitted SMS/voice delivery
provider; fuel-feed rights/date/coverage confirmation; and phone QA.
No deployment or spending was performed during this check.

4 October database verification: `scripts/checkin-database-qa.mjs` passes
against disposable in-memory Postgres after adding account-block and inactive
venue cases. It checks report rejection, removal of blocked evidence from
claims, block expiry, blocked venue claims and updates, inactive public-view
removal, online source URL validation and denial of self-unblocking. Existing
checks also cover trust expiry/conflicts, provider reservations, risk-job
leases and venue phone verification boundaries. No hosted migration, provider
request or messaging delivery was performed. Hosted verification remains a
completion gate.

4 October filter/presentation continuation: shared report filters now read current trust claims at the filter call's timestamp. Legacy booleans, expired claims and conflicts do not satisfy report filters. Trading and kitchen filters remain separate. Area/cuisine/search and listed-hours filtering keep their existing behaviour. The retired confidence filter is ignored for stored-state compatibility; its website selector and active confidence badges were removed. DTO score fields and unused legacy helpers remain for compatibility, not as evidence.

The claim label, colour and source/time/expiry summary now live in core and are reused by mobile and Vite. Website practical checks no longer render bare legacy Working/Issue answers. Website status badges do not colour a legacy closed boolean red. Website data projection wakes at evidence expiry and checks time on foreground return. Save keyboard events no longer trigger the enclosing website card's navigation handler. This is trust alignment, not a website redesign or release.

Checks: 200 root tests and 171 mobile tests pass; core, mobile and root TypeScript pass; Vite production build passes. Tests cover each report filter's fresh/expired/legacy states, conflicts, kitchen separation, retired score filters, website expiry/foreground return, source-labelled closure, badge colour and Save keyboard behaviour. Browser layout and phone testing remain unverified for these edits. No hosted changes or provider calls were made.

Android export of the shared filter/presentation changes passes (3,874 modules, 49 assets). Sentry organisation/project configuration is still unset. The full goal remains open.

4 October cache/contract continuation: cache restore validates venue/group fields, status fields, hours, supported features, duplicate IDs and fetch timestamps. A malformed venue/group record rejects the cache. A damaged trust snapshot keeps venue facts but supplies unknown claims, without reviving legacy booleans. The Supabase mapper applies the same snapshot parser. Failure to remove a rejected cache no longer rejects mobile startup's cache read.

Public snapshot validation checks claim states/values, evidence sources, phone-verification labels, check methods and timestamp intervals. Unknown/conflict claims cannot supply status booleans. Future or expired evidence clears the claim, even when cached claim metadata has a later expiry. Object-shaped enum fields are rejected without string coercion. The parser drops private risk/account fields and does not rerun eligibility using public evidence IDs. These checks protect parsing and presentation, not data authenticity: database authorisation and aggregation remain the authority. Synthetic test claims now include source/time evidence rather than empty evidence arrays.

Checks for this pass: 187 root tests and 171 mobile tests pass. Core, mobile and root TypeScript checks pass. Tests include the database's nullable check-method field, damaged/unsupported snapshots, contradictory public states, future evidence, extended deadlines, malformed cache records, storage cleanup failure and device cache round trips. No migration, deployment, purchase or provider request was made. Visual/phone QA, the website claim audit, provider configuration and hosted trust verification remain open.

Android export after the mapper and enum guards passes (3,874 modules, 49 assets). Sentry organisation/project configuration remains unset. This export does not verify hosted reporting or a phone session.

4 October claim-display continuation: the mobile data context now projects expiry from the received snapshot at the next claim boundary and on foreground return. Raw fetch/cache data is not rewritten or used to infer a new claim. Search cards use trust labels for trading and practical checks instead of legacy booleans. Group search cards show branch counts, not a claim that a franchise is open. Explore's Status now selection requires a current trust indication of open. List/branch status colours distinguish reports, conflict and missing evidence; branch-sheet details retain source, check time and expiry in South African time. Tile accessible names retain the same provenance, with venue details providing the evidence disclosure.

Verification for this continuation: 163 root tests and 167 mobile tests pass, including report-boundary timing, foreground return, timer cleanup, card labels, legacy-answer suppression and expiry in accessible names. Core, mobile and root TypeScript checks pass. Android export passes (3,874 modules). Metro rebuilt a cache it could not read; the export completed. The localhost HTTP check returned 200, but the in-app browser timed out on both localhost and 127.0.0.1, so no visual or phone pass is claimed. The attempted preview process exited because port 8081 already had a server; that server was not stopped. The website's claim-display audit, provider setup/deployment gates and device checks remain open.

4 October continuation: the arrival result now exposes trading and kitchen/service schedule comparisons through an Hours at arrival sheet, including time remaining and closing times in South African time. Missing service hours remain unavailable instead of falling back to trading hours. The main result stays short; no status claim is inferred from the comparison. Shared action buttons now preserve base styles and caller accessibility state, announce loading and disable repeat taps. Regression tests cover these behaviours.

The 2 October place-flow redesign superseded the first-open fuel modal and the Figma Glance/Expanded presentation. Current device location and leaving now are defaults, with origin, time, fuel and source details in sheets. The map is not part of the current place flow. These are subsequent user directions, not completion of the attachment's original onboarding requirement. Provider credentials, messaging costs/approval, trust deployment and phone testing remain gates. The full goal stays open.

2 October hosted trip deployment: user authorised this feature's deployment. Only trip-provider caps and trip-planner were deployed, without the trust/reporting migration. ORS configuration, 100/day and 10/minute caps and the mobile endpoint are set. Hosted address lookup, outbound/return geometry and key/origin rejection checks pass. UI/phone map QA and commercial-release terms remain pending. This does not authorise deployment of the wider trust goal or spending.

2 October: trip setup is now independent of the trust migration. `20261001221614_trip_provider_caps.sql` provides a trip-only private schema and server-only reservation RPC, with 100/day and 10/minute ceilings for each service, disabled by default. In-memory Postgres checks pass without report tables; no hosted migration or deployment is performed. Account quota period/terms and hosted concurrency remain unverified.

The R0 route-preview pass adds Leaflet 1.9.4 for browser maps, react-native-maps route rendering for Android and validated ORS GeoJSON coordinates. Tests reject malformed geometry and enforce quota failure without provider calls. Keys and hosted deployment remain out of this pass. See `ZERO_COST_TRIP_SETUP.md`; the broader goal is not complete.

R0 pass checks: 149 tests, root/core/mobile TypeScript and Android/web exports pass. Provider-backed route rendering and phone gestures are not verified. The localhost browser opened an empty accessibility document and the reload timed out, so this pass does not claim browser visual QA.

Repository inspection found the prior reporting flow, four-hour expiry, device cache, email-link authentication, Settings themes and navigation. No trust-risk service, venue claim, planner, fuel onboarding or fuel preferences existed at inspection.

Implemented in this working tree: trust reducer, risk JSON validation, trust migration, claim/update/dispute tables, representative-authorised update RPC, evidence-derived public status view, status UI wiring, fuel calculations, South African overnight schedule calculations, fuel onboarding and Settings, expandable venue planner, route/address adapters, pseudonymised Gemini adapter and server request caps.

Verification so far: 145 unit tests, root/core/mobile TypeScript checks and Android export pass after trip-client failure handling. In-memory Postgres checks passed after the venue controls. Deno checks passed before the fuel-feed changes; the function entry points were not changed. Browser inspection confirms the disconnected-feed message, missing-price behaviour and Settings link. Provider keys have not been used. No migration or function has been deployed.

Provider reservations now enforce rolling 60-second caps and UTC day caps. Tests cover disabled providers, server-only access, rejection without consuming reservations, window expiry and day-boundary behaviour. The pending trust migration replaces the legacy report writer, so new reports no longer create a two-account result or an accuracy-like score. Report insertion still enforces validation, cooldowns, account blocking, duplicate checks and the day limit. Risk reservation failures and insufficient-context responses retain unknown risk.

The submit flow was inspected in the browser. A missing check method or source URL now produces an alert instead of an unexplained disabled button. No venue report was sent during that check.

Report insertion now enqueues risk assessment in the same transaction. The worker uses leases, a three-attempt ceiling, expiry and backoff; tests cover rollback, rejected/stale leases, crash recovery, retry exhaustion and app-user permission denial. Assessments identify the target through a pseudonym instead of treating the context as a blanket judgement. Deno checks pass for both Edge Functions. Scheduler setup is documented in `RISK_QUEUE_SETUP.md`, but has not been run.

Fuel storage regression tests and browser inspection in both themes have run. The inspection found and fixed the disappearing fuel save message, onboarding failure feedback, legacy cached status styling and the planner's invalid-coordinate directions command. `FUEL_AND_VENUE_QA.md` records the checks and their limits.

The venue-claim database lifecycle now checks the server-held phone source, delivery state, verification leases, expiry, account/phone request limits and source changes. Tests cover foreign-account access, missing leases, failed delivery, five-attempt exhaustion and representative revocation. `VENUE_VERIFICATION.md` records these product rules. No SMS or voice call was sent.

The venue claim Edge handler derives account identity from Supabase Auth, rejects client identity/phone/verification overrides and requires provider plus database approval. Nine HTTP tests cover its boundary and failure paths. Its production delivery adapter is null: no messaging, mock code or hosted deployment is enabled.

The mobile venue screen includes email return, SMS/voice channel selection, code entry, caller access lookup, updates and disputes. Signed-out browser QA and tests have run; hosted sign-in, messaging and representative publishing remain unverified. No code can be delivered in the current configuration.

Fuel research now covers FulTank, Fuel SA, zaref, the SA Fuel API announcement and DMPR sources. None has been adopted. `FUEL_DATA_SETUP.md` records prices, trials, unit/coverage evidence, rights questions and expected request costs. The client/cache contract and source/date/failure UI are implemented behind configuration; no current prices or invented records are shipped. Reference prices need an effective end timestamp, terms confirmation and a retention period.

Trip-client requests now have a 20-second timeout covering connection and response parsing, caller cancellation, timer cleanup and network/quota feedback. Twelve tests cover missing configuration, coordinate validation, malformed routes and addresses, missing attribution, duplicate addresses, invalid JSON, timeout, cancellation and network failure. Requests strip GPS accuracy, altitude and other fields, sending only latitude and longitude. Returned addresses and routes retain only contract fields. Changing departure/return options cancels the pending planner request; accepted results retain the return option used for that request. Browser QA checks the option controls and disconnected address-search feedback. Provider-backed routing and phone permission behaviour remain unverified.

The Figma place-screen reference now drives the name/area row, fuel/status strip and Glance/Expanded controls. Existing header and weekly-hours components remain code; screenshot layers are not embedded. The fuel strip receives the planner calculation rather than the example Figma amount. Trading claims remain qualified and retain their evidence below the strip; kitchen status stays separate. Reporting, Save, actions, practical checks, group navigation and Settings access remain available. Shop-price comparisons are deferred in TODO.md. Mapbox is researched but not adopted: the native wrapper cannot run in Expo Go, standard billing has no spend cap, and no-card demo caps need account verification. See `MAPBOX_REVIEW.md`. No map screenshot or blank map container is shipped.

Pending independent implementation: further source/rights investigation, upstream fuel ingestion, permission/offline regression coverage and the remaining claim-display audit. Provider selection/cost approval, hosted fuel endpoint, scheduler delivery, phone QA and configured-provider checks are also pending. Supabase reports the hosted project as INACTIVE; no restore was performed. See `TRUST_TRIP_PROVIDERS.md` for costs, setup and blocks. The full goal is not complete.
# Continuation checks, 4 October 2026

The shared trust resolver now rejects unsupported report sources/checking methods, malformed identities and timestamps, and a non-finite clock. Nine regression cases cover these boundaries, including inputs that previously could supply the third account or second checking method for a negative threshold. This is a shared-code guard, not evidence that hosted database submission rules have been deployed or checked.

Verification: 209 repository tests and 172 mobile tests passed; core and mobile TypeScript checks passed. This pass did not run an Android export or a browser/phone flow. The fuel-source recheck is recorded in `FUEL_DATA_SETUP.md`: free-read docs and a response were retrieved, but price intervals, diesel basis and reuse rights remain unresolved. No feed, paid service or trust migration was activated. Venue OTP delivery, Gemini setup/terms, hosted trust verification, fuel ingestion and device QA remain completion gates.
