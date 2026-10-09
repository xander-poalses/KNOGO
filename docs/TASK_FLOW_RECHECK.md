# KNOGO Task Flow Recheck

8 October 2026. Scope: mobile app and its browser build.

## Implementation

- Reporting requires a method and at least one observation. Skips remove answers. A closure report does not imply kitchen or busyness answers. Review is available after one answer.
- Entry explains sign-in before submission. Drafts persist before sending. Account creation, sign-in and recovery return to review without publishing.
- Recovery includes email entry, an acknowledgement without account disclosure, callback handling, password entry and retry actions for expiry, connection failures and rate limits.
- Google remains visible in Expo Go; tapping explains the build requirement.
- Support uses the configured address, poalsesxander@gmail.com. Missing configuration and mail-app failures have a route that does not invent contact details.
- Fuel inputs use the control-boundary token. Explore and Saved use phone lists; tablets retain a grid choice. Explore cannot save places. Saved can remove them.
- Logo loading checks JPEG bytes, preserves the image background and uses the surface fallback when validation or decoding fails.
- Trip planning uses one sheet with views and Back. Origin selection does not calculate a route. Fuel edits survive Back. Current location and Now remain defaults.
- Explore heading space is reduced. Branch-list selection opens the place screen. Report guidance and acknowledgement include the lookout connection without another step.
- Community policy follows the trust implementation. Thresholds are unchanged. The server already validates one to six observations, so no migration was needed.

## Verification

| Check | Evidence |
| --- | --- |
| Mobile flows | 35 files, 386 tests passed |
| Core suite | 25 files, 247 tests passed |
| Types | Mobile and core passed |
| Patch whitespace | git diff --check passed |
| Reports | One observation, closure, skips, URLs, draft persistence and sign-in return covered |
| Recovery | Success, expiry, rate limits, connection errors and draft callbacks covered with test doubles |
| UI | JPEG loading/failure, list actions, trip Back and support configuration covered |
| Widths | Browser checks at 320, 375, 414 and 768 px; no horizontal overflow in checked report and list views |
| Fuel contrast | Boundary 4.74:1 in light theme and 5.10:1 in dark theme; text 15.23:1 and 13.25:1 |
| Focus | Keyboard focus checked on fuel controls; tests cover restoration across trip views |
| Motion | Existing reduced-motion modal tests pass; logo transitions are disabled |

Browser checks do not establish WCAG AA conformance for the app. Contrast results apply to the measured fuel fields, not every screen state.

## Hallmark Recheck

Prior score: 63/100. Recheck score: **83/100**, subject to device verification.

The reporting, account-return, support-route, fuel-boundary and phone-list findings from the prior audit have code changes and test evidence. No claim is made that email delivery, TalkBack or Android callback behaviour has passed on a device.

Remaining items, in severity order:

1. Release gate: Android email-link return and Google sign-in need the development build. Tests use callback doubles; hosted redirect settings were not changed.
2. Release gate: TalkBack, font scaling and keyboard behaviour need device checks. Browser focus and width checks cannot replace these.
3. Verification gap: Report review with six answers may need scrolling at font scaling. Scrolling remains available to prevent clipping; the one-question steps reduce choice load.
4. Content limitation: A logo that is not JPEG, fails decoding or is blocked by CORS uses the surface fallback. No replacement background is invented.

Self-critique stamp: purpose 5/5, hierarchy 4/5, ergonomics 4/5, semantics 4/5, restraint 4/5, verification 4/5. Total 25/30, rounded to 83/100. The score is a design assessment, not an accessibility certification.

## Phone Handover

1. Reload KNOGO. Use the Android development build for Google and email-link return.
2. Enter a report with one answer, choose Sign in to submit and sign in. Confirm it returns to review and does not publish until Submit is pressed.
3. Use Forgot password with your account. Open the email, set the password and return. Check that a report draft remains in review.
4. Turn on TalkBack and increase font size in Android accessibility settings. Check report choices, review, trip Back and the practical-checks accordion for reading order, clipping and reachable actions.
5. If a link returns to localhost:3000 or cannot open KNOGO, share the destination without its tokens. Redirect configuration then needs a check and approval before any hosted change.

No spending, deployment, hosted settings changes, commit or push were performed. Support configuration is in the ignored mobile environment file.
