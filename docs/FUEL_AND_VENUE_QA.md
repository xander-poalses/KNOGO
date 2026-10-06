# Fuel and venue QA

## Fuel persistence continuation, 4 October 2026

`FuelContext` now orders device writes, normalises the stored/displayed value through the same parser and ignores a startup restore after a save succeeds. A failed write leaves the prior preferences intact and does not block the next write. Five provider tests cover restore, restore/save ordering, overlapping save/save/clear, write failure/retry and read failure without invented values.

Five form tests cover dashboard values with decimal commas, grade/region selection, the two-full-fills requirement, clearing invalid drafts, write failure with draft retention and repeat-save protection. Tank consumption is checked with a floating-point tolerance rather than an exact decimal equality. All 185 mobile tests and the mobile TypeScript check passed. These checks use storage/component mocks, not an Android restart or a price provider. The Android export from the return-leg pass predates this provider change; no export was run in this continuation.

The sections below retain the earlier browser evidence and its limits. The first-open fuel modal was removed under the later screen-flow direction; storage-marker tests do not prove an active onboarding screen. The settings form and planner fuel sheet remain available without signing in.

Checked 1 October 2026 against the workspace and the Expo web app at localhost:8081. Browser data came from a cache marked over seven days old. This is not proof of hosted Supabase, provider or Android-phone behaviour.

## Checks completed

- Fuel storage tests cover installs without a feature marker, skip/restart, save/restart, Settings edits, clearing, malformed JSON, invalid versions and read/write failures. Existing saved-place storage is left alone.
- In the browser, saved 7.4 L/100 km, petrol 95, inland and R24.12/litre as test inputs. Reload restored the fields. Save and clear messages remained visible after fixing the form remount. Cleared the test inputs afterwards.
- Inspected the venue planner in Light and Dark at 375 pixels. Checked root width versus scroll width at 320, 375, 414 and 768 pixels; no page-width overflow was reported. This does not replace text-scaling or Android safe-area checks.
- Address search without a configured service showed an error and did not invent a result. The venue, navigation and reporting entry remained available.
- Home search for Stoetbul showed branch suggestions. Selecting Stoetbul Parkview opened `/restaurants/stoetbul-parkview` and dismissed search.
- Saved Cappuccinos Menlyn, opened it from Saved, then removed that test save. The saved Padstal entry was preserved. Explore category choices remained available.
- Opened reporting from Stoetbul Parkview and returned through Back to place. No report or email was submitted.
- Restored the theme to System and cleared the viewport override after the checks.

## Fixes from inspection

- Fuel onboarding keeps a storage failure message visible and offers retry or continue without saving. Continuing does not pretend that the feature marker was written.
- Fuel form updates when stored preferences load, without remounting after every save. A ref prevents repeat save taps during a write.
- Settings refers to the email-link flow that this build uses.
- Venue hours are labelled as listed trading hours, separate from the live claim.
- A legacy cached value without a trust snapshot cannot colour the status as closed or show a busy claim. Trust claim evidence remains the source for live checks.
- Planner directions cannot use missing/invalid coordinates. The location timeout is cleared when the request ends; coordinates are still not retained after collapse/unmount.

## Checks that remain

- Expo Go or a development build: onboarding skip/completion after app restart, hardware back, keyboard, safe areas and text scaling.
- Location denied, location timeout and offline route requests on a phone.
- Configured address and route provider responses, attribution and return calculations on device.
- Fuel feed, its permitted cache, source/effective dates and failure state. Only a user price override is wired at present.
- Hosted report submission, email callback, scheduler delivery and venue verification after configuration and deployment approval.

The unit suite has 104 passing tests. Root and mobile TypeScript checks and Android export pass. These results do not close the remaining integration gates.
