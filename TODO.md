# KNOGO TODO

This file is the project backlog. Add future work here under the closest priority.

## Now

- [ ] Complete the WCAG 2.2 AA release audit on Android and web.
  Acceptance: TalkBack, keyboard focus and modal return, 200% text scaling, touch targets, contrast, error messages and safe areas pass across the app. Place/trip surface tokens have contrast regression tests; that alone does not certify the app.

- [ ] Test the R0 trip estimate on an Android phone.
  Acceptance: one tap uses device location and the current time; address, departure and fuel sheets work; return estimates and permission/network failures pass. Map rendering was removed from the place flow on 2 October. Hosted address/route and rejection tests pass. Commercial-release terms and admission controls remain a release gate. No billing or paid fallback. Setup: [README](README.md#trip-service).

- [x] Redesign the place and trip flow around expectations and an estimate.
  Acceptance: schedule expectations remain separate from reports; details are on tap; maps and first-open fuel setup do not block the flow; unknown values are not repeated across the opening screen.

- [ ] Complete the trust model and venue trip-planning scope from the 1 October attachment.
  Acceptance: account, trust, trip, venue and failure paths are implemented and verified; credential and cost blocks follow the [README](README.md#backend-configuration) and release checklist. No deployment or spending is authorised by this backlog entry.

- [ ] Restore the inactive Supabase project and deploy the check-in hardening migration.
  Acceptance: check-in RPC is present, permissions pass, conflicting batches leave status unchanged and each check expires on its own timestamp.
- [ ] Complete email-link return and two-account check-in tests on Android.
  Acceptance: a guest draft returns from email and submits once, a first report stays pending, another account can confirm it, conflicts do not update status and restart preserves sign-in.

- [x] Add closed-beta report provenance and two-account consensus.
  Acceptance: reports record in-person, phone or online checks; online checks require a source URL; two accounts must match within four hours; conflicts do not change public status.
- [x] Add report rate limits, block records, audit records and four-hour status expiry.
  Acceptance: direct table inserts are blocked, reports go through one authenticated RPC, and stale community status reads as unknown.
- [x] Add a report-first email-link flow, report outcomes, account, support, policy and diagnostics consent screens.
  Acceptance: guests answer before authentication, pending answers stay on their device, the email link restores the session and submits the report, sign-out works, and reports show pending, accepted or conflict.
- [x] Add EAS profiles, Android versioning, release documents and rollback steps.
  Acceptance: development, preview APK and production bundle profiles exist without storing account secrets in the repo.
- [ ] Complete external beta accounts and production settings.
  Acceptance: domain, SMTP, Expo project, Play Console, Sentry, PostHog, public policy URLs and EAS environment values are configured.
- [ ] Complete signed Android preview testing for two weeks.
  Acceptance: the checklist in `docs/RELEASE_CHECKLIST.md` passes with no release-blocking crash or data-loss fault.

- [x] Reach 75 active Pretoria East restaurants with reviewed import batches.
  Acceptance: KNOGO has 79 active places, each with a checked address, coordinates, at least one contact route, cuisine tags, seven opening-hours rows and a live-status row.
- [x] Add a versioned mobile cache for places, groups and live status data.
  Acceptance: the last live response is restored after a failed launch, marked with its fetch time, treated as read-only and replaced after a live refresh.
- [x] Review active contact gaps and inactive candidates.
  Acceptance: all active places have a phone or website; unverified candidates remain inactive.
- [x] Batch 1: Menlyn.
- [x] Batch 2: Castle Gate and Erasmuskloof.
- [x] Batch 3: Hazeldean and The Grove.
- [x] Batch 4: Lynnwood Bridge and Woodlands.
- [x] Batch 5: Hazelwood and Woodlands coverage gaps.

## Next

- [x] Add five-user kitchen-hours consensus to the backend.
  Acceptance: collect authenticated kitchen-hour submissions, publish hours only after five distinct users agree, retain source history and never copy trading hours into unknown kitchen hours.
- [ ] Add the kitchen-hours submission screen after status reports pass beta testing.
  Acceptance: users can submit each day, see pending consensus and never see trading hours copied into an unknown kitchen schedule.

## Later

- [ ] Add the trip visual after the user supplies their concept.
  Acceptance: the visual supports the route estimate without becoming a map, navigation service or another setup step.

- [ ] Consider shop-price comparisons after community reporting and trip fuel budgeting.
  Acceptance: scope, sources, rights and update rules are agreed before implementation. No shop-price feed or comparison is part of the current place screen.
- [ ] Connect the Figma place-screen map after Mapbox access and build choice are agreed.
  Acceptance: no-card demo limits or billing approval are recorded; no automatic spend; web and Android map gestures, venue marker, theme, attribution and failure hiding pass QA. Native Mapbox needs a development build rather than Expo Go. See [README](README.md#android-app).
- [ ] Consider optional location context for in-person reports without blocking remote reports.
  Acceptance: location is consent-based, is not required for phone or online reports, and does not decide whether a report is accepted.
- [ ] Add first-open onboarding and permission explanations.
- [ ] Add contribution cooldowns, duplicate prevention and abuse controls.
- [ ] Add notifications once there is a clear user-controlled notification use case.
- [ ] Prepare the public Play Store release after the closed-beta gate passes.
