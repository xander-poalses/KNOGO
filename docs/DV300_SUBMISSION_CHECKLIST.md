# KNOGO DV300 submission checklist

Prepared for Xander Poalses, 241322, Open Window.

Assessment based on the 19 October 2026 feature handover, repository documents
and DV300 requirements in `briefs/KNOGO_MainBrief.md`.

Application submission readiness estimate: **70%**. This is a planning estimate,
not a mark. Checked boxes below mean implementation or evidence exists within
the stated limits. They do not establish deployment or phone verification.

To update a box, change `- [ ]` to `- [x]`. Add evidence or a date below the task
when you complete it.

## Implementation and evidence recorded

- [x] Project concept addresses journeys wasted because a place is closed or cannot serve.
- [x] More than five screens implemented.
- [x] Search, categories, filters, groups and branch selection implemented.
- [x] Place details, hours, contact links and report evidence implemented.
- [x] Community reporting includes validation, review and receipts.
- [x] Trust rules cover disagreement, expiry and closure indications.
- [x] Gemini integration implemented and a completed test review demonstrated.
- [x] Trip planning and fuel calculations implemented.
- [x] Account creation, sign-in, recovery and session handling implemented.
- [x] Saved places, settings and persistence implemented.
- [x] Loading, failure, cache and retry states implemented.
- [x] Automated tests and TypeScript checks exist; 472 mobile tests and mobile TypeScript passed on 19 October.
- [x] Android build completed on 19 October; Mapbox module and ARM libraries found in the APK.
- [x] README, setup documents and evidence files exist.
- [x] Git history exists.

## 1. Verify the app on Android

- [x] Install the 19 October APK and confirm launch and Mapbox rendering.
- [x] Check navigation, branch selection and return actions.
- [x] Check signup, email confirmation, sign-in, recovery and sign-out.
- [ ] Demonstrate a report reaching Gemini and showing its assessment receipt.
- [ ] Resolve or document the worker's test-account/test-venue restriction for the assessed scope.
- [ ] Check trip origin search, departure time, arrival comparison and fuel estimates.
- [ ] Check denied permissions, connection failure, cache notices and recovery.
- [ ] Check TalkBack, text scaling, hardware Back, sheets and focus.

## 2. Complete testing and refinement evidence

- [x] Conduct user testing and record the build, device, tasks and observations.
- [x] Analyse peer feedback and record resulting changes and follow-up checks.
- [ ] Record how lecturer feedback changed the app.
- [ ] Identify and demonstrate create, read, update and delete operations, including persistence and permissions.
- [x] Refine category reporting for the assessed scope or document which categories support reporting.
- [ ] Audit demo places: hours, sources, coordinates and contact details.
- [ ] Run core/browser tests, mobile tests, TypeScript and the backend checks needed for the submitted flows.
- [ ] Record check results, dates and remaining limits.

Category-specific reporting remains incomplete. Kitchen questions are skipped for
non-food places, but some restaurant-origin checks still appear across categories.
Catalogue coverage need not include every Pretoria East business for submission.

## 3. Finish documentation and GitHub

- [ ] Add mockups or diagrams to the README.
- [ ] Add usage and navigation guidance to the README.
- [ ] Update the README scope to reflect the category expansion and survey direction.
- [ ] Document a reproducible backend/database setup, including migration and seed order.
- [ ] Add the demonstration video to the README.
- [ ] Check README commands, links, environment setup, author details, credits and references.
- [ ] Review submission changes and exclude credentials and unrelated artifacts.
- [ ] Commit and push submission code, assets, migrations and documentation.
- [ ] Confirm GitHub repository visibility and lecturer access against the brief.
- [ ] Confirm the GitHub version matches the demonstrated app.

## 4. Prepare the application hand-in

- [ ] Record a 5–8 minute product demonstration covering features, user interactions, AI and CRUD.
- [ ] Check the recording for legibility, sound and absence of desktop clutter or credentials.
- [ ] Keep a copy of the video available for the live demonstration.
- [ ] Rehearse the demonstration and prepare the app and services it needs.
- [ ] Practise explaining Gemini, trust rules, database access, CRUD and failure handling.
- [ ] Check Canvas instructions, file naming, links and upload requirements.
- [ ] Submit the required application deliverables and verify the submission receipt.

The supplied brief lists **28 October 2026 at 14:00** for the application.
Confirm against Canvas. The video instructions conflict between 5–8 and 5–10
minutes; 5–8 minutes falls within both ranges.

## 5. Industry insights and reflection

This is a separate DV deliverable. Completion was not established by the handover.

- [ ] Create a landscape presentation with name and student number on the cover.
- [ ] Include at least six insight slides with lessons and pull quotes from talks.
- [ ] Include at least two reflection slides covering career direction, industry expectations and the academic journey.
- [ ] Record the 5–8 minute reflection video with introduction, speaker lessons, career goals, industry reflections, an academic event and closing thoughts.
- [ ] Confirm participation in at least three industry talks.
- [ ] Submit the presentation and reflection video and verify the submission receipt.

The supplied brief lists **26 October 2026 at 23:59** for this deliverable.
Confirm against Canvas.

## After submission, unless part of the agreed assessed scope

These are product backlog items, not mandatory submission tasks from this review.

- [ ] Store publication and deployment; deployment is bonus work in the brief.
- [ ] Automatic fuel-price feed with source rights and ingestion.
- [ ] Venue SMS/voice verification with delivery-provider evidence.
- [ ] Cloud synchronisation of saved places.
- [ ] Push notifications, payments and bookings.
- [ ] Further catalogue coverage and permission-cleared place photos.

## Sources and limits

- [Feature handover](KNOGO_FEATURE_HANDOVER.md)
- [Combined brief, DV requirements in sections 5.3 and 5.4](../briefs/KNOGO_MainBrief.md)
- [README](../README.md)
- [Tester guide](DV300_TESTER_GUIDE.md)

This checklist does not replace Canvas or lecturer instructions. App, provider,
repository visibility and Canvas checks were not rerun when preparing it.
