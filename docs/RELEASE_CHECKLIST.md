# KNOGO Android Closed Beta Checklist

## Accounts

- [ ] Choose the KNOGO domain and support email.
- [ ] Configure Supabase custom SMTP and add DNS records.
- [ ] Change the Auth email template to show `{{ .Token }}` as a six-digit code.
- [ ] Set OTP expiry and delivery rate limits in Supabase Auth.
- [ ] Create Expo, Google Play Console, Sentry and PostHog projects.

## EAS

- [ ] Run `eas init` from `apps/mobile` and commit the generated project ID.
- [ ] Add preview and production Supabase values to the matching EAS environments.
- [ ] Add `SENTRY_AUTH_TOKEN` as a sensitive EAS value.
- [ ] Add public Sentry, PostHog and support values to preview and production.
- [ ] Run `eas build --platform android --profile preview` and install the APK.
- [ ] Run `eas build --platform android --profile production` for the Play Console bundle.

## Store And Policy

- [ ] Publish the privacy notice, terms and community rules at public URLs.
- [ ] Complete the Play Console identity, content rating and Data Safety forms.
- [ ] Add app copy, icon, phone screenshots and support contact.
- [ ] Add account deletion instructions and test the support process.
- [ ] Add invited testers to the internal or closed testing track.

## Test Gate

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
4. Restore the prior signed Android build in the Play Console.
5. Keep report and audit rows for investigation. Do not delete evidence during an incident.
