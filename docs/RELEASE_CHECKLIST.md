# KNOGO Android Closed Beta Checklist

## Accounts

- [ ] Choose the KNOGO domain and support email.
- [ ] Configure Supabase custom SMTP and add DNS records.
- [ ] Change the Auth email template to show `{{ .Token }}` as a six-digit code.
- [ ] Set OTP expiry and delivery rate limits in Supabase Auth.
- [ ] Create Expo, Google Play Console, Sentry and PostHog projects.

## Tester Build And Backend

- [x] Add a store-distribution testing profile with Skip and production without Skip.
- [x] Add persistent guest sessions, report notices, receipts and guest account labels.
- [x] Add a database switch, off by default, for guest reporting.
- [x] Deploy the guest-reporting migration to the KNOGO Supabase project.
- [x] Test submission, receipt access, rate limits, venue restrictions and switch-off.
- [x] Pause hosted Gemini processing pending Google Free tier verification.
- [ ] Enable anonymous sign-ins in Supabase Auth > Sign In / Providers.
- [x] Enable `knogo_private.testing_settings.guest_reporting_enabled` in the hosted project.
- [ ] Verify Gemini's Google project is Free tier before resuming assessments.
- [ ] Confirm testers understand that all reports share KNOGO's database.

## EAS

- [ ] Run `eas init` from `apps/mobile` and commit the generated project ID.
- [ ] Add preview and production Supabase values to the matching EAS environments.
- [ ] Add `SENTRY_AUTH_TOKEN` as a sensitive EAS value.
- [ ] Configure Sentry's organisation/project and CLI before enabling tester source-map uploads; the testing profile currently sets `SENTRY_DISABLE_AUTO_UPLOAD=true`.
- [ ] Add public Sentry, PostHog and support values to preview and production.
- [ ] Run `eas build --platform android --profile preview` and install the APK.
- [ ] Run `eas build --platform android --profile testing` for the Play testing bundle.
- [ ] Keep the upload keystore and recovery details; never upload a debug-signed bundle.
- [ ] Install the Play-delivered build on Android without Metro or a PC running.

## Store And Policy

- [ ] Publish the privacy notice, terms and community rules at public URLs.
- [ ] Complete the Play Console identity, content rating and Data Safety forms.
- [ ] Add app copy, icon, phone screenshots and support contact.
- [x] Add Settings > Request account deletion and a support email action.
- [ ] Publish the account/data deletion request page and test the support process.
- [ ] Add invited testers to the internal or closed testing track.

## Test Gate

- [ ] Check Skip is present in testing and absent in production.
- [ ] Submit as a guest, restart, and verify the guest identity and report remain.
- [ ] Switch from a guest to an email/Google account; do not transfer report ownership.
- [ ] Check another tester sees the report through the hosted database.
- [ ] Disable the server switch and confirm guest reports stop contributing to trust.

- [ ] Test OTP send, invalid code, expired code, session restore and sign-out.
- [ ] Test pending, accepted and conflicting reports with separate accounts.
- [ ] Test report rate limits and a blocked account.
- [ ] Test live and cached data, network failure and recovery.
- [ ] Test search, Explore, groups, details, Saved, Settings and external actions.
- [ ] Test small and large Android phones, safe areas, keyboard, back and text scaling.
- [ ] Confirm Sentry faults and PostHog events contain no private report or account data.
- [ ] Complete two weeks without a release-blocking crash or data-loss fault.

## Rollback

1. Stop the Play test release or remove new testers.
2. Set the report feature entry point off in the next update if report integrity is affected.
3. Revoke authenticated execute access to `submit_status_report` for an immediate report freeze.
4. Build the prior source with a higher version code and roll it out through Play.
5. Keep report and audit rows for investigation. Do not delete evidence during an incident.

## Before Public Launch

1. Turn off `guest_reporting_enabled` and Supabase anonymous sign-ins.
2. Confirm guest evidence is excluded from live trust and review.
3. Build using the production profile; never promote the tester bundle unchanged.
4. Complete the closed-test requirement shown by Play Console and apply for production access.
