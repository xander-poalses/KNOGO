# Check-in setup and QA

## Database

The Supabase connector reported project `ivzofixdjcgkwalfzmmy` as `INACTIVE` on 30 September 2026. The check-in fixes are not deployed.

1. Open https://supabase.com/dashboard/project/ivzofixdjcgkwalfzmmy.
2. Restore the project if the dashboard shows it as paused. Wait for its database and Auth to start.
3. Tell Codex the project is restored. Codex must inspect migrations, deploy `supabase/migrations/20260930123118_checkin_hardening.sql`, then verify permissions and the status view. Do not run migration 008 again if its tables and policies exist.
4. Start QA only after that verification. Previous community values without per-check timestamps will read as unknown. They remain stored, but need reports before they can be presented as current.

## Email and redirect setup

1. Open Authentication > Sign In / Providers > Email. Enable email sign-in and allow sign-ups for this test. Keep email verification enabled.
2. Open Authentication > URL Configuration. Add these Redirect URLs for development:
   - `knogo://auth/callback` for an installed KNOGO build.
   - `http://localhost:8082/auth/callback` for web testing on port 8082.
   - `http://localhost:8081/auth/callback` if running on port 8081.
3. Expo Go does not register the KNOGO scheme. Its callback depends on Metro's address. If Metro shows `exp://192.168.1.20:8081`, add `exp://192.168.1.20:8081/--/auth/callback`. Substitute the address shown by your terminal. Update this entry if that address changes. Do not allow all hosts with a wildcard.
4. Start the app using `pnpm.cmd mobile` from the project root. Keep the phone connected to Metro. Open the email link on that phone, not on another device.
5. For tests without SMTP, use an email belonging to a member of the Supabase organisation. The default sender does not support arbitrary tester emails and has delivery limits. Do not give testers dashboard access to work around this.
6. To test with people outside that team, choose a domain and an SMTP provider. Verify the domain using the provider's DNS instructions, then enter its host, port, username, password, sender email and sender name in Authentication > SMTP Settings. SMTP credentials belong in Supabase, never in Expo env files.
7. Leave the email template as a link using `{{ .ConfirmationURL }}`. This build consumes email links, not six-digit codes. Disable provider link tracking if it rewrites Auth links.
8. For tester distribution, use an installed preview build with `knogo://auth/callback`. Expo Go remains a development test, not the release path.

Do not share email links, tokens, SMTP passwords or service-role keys in screenshots or chat. If a link fails, share only the error text and the host/path, without the query or fragment.

## QA sequence

Use a test place in a development project, or a venue whose status you have checked. The reporting RPC requires `is_active = true`, so an inactive record cannot receive test reports. Do not publish invented reports to a venue used by the public. Live consensus testing needs at least two accounts, and three for a conflict test. Configure SMTP before inviting those accounts.

1. Sign out. Open a place, choose Verify status and answer the questions. Choose At the venue, By phone or Online. Online must have an HTTP or HTTPS source URL.
2. Submit. The app should ask for email after collecting the answers. Enter your email, request the link and open the newest email on the same device. A link is single-use.
3. KNOGO should return, submit once and show Report received. The first account must not change the place status. In Supabase, the batch should be pending and all confirmations should have `location_verified = false`.
4. Close and reopen KNOGO. Settings should retain the account. Sign out, restart and check that it remains signed out.
5. With another account, submit matching answers within four hours. The batch should be accepted, the place should refresh and the matching checks should be displayed.
6. On another test place, submit conflicting answers from two accounts. Submit an answer matching the first account from a third account. All conflicting batches must leave public status unchanged, even with two matching accounts.
7. Tap Submit twice. Only one batch should be created. Reporting to the same place again within 15 minutes should show a cooldown message. Reports beyond 30 batches per account per day must be refused.
8. Turn off the network before submission. The app must show failure, not success. Turn it on and retry. If the database accepts a report but the follow-up fetch fails, the app should acknowledge receipt and offer refresh, not ask for another submission.
9. Leave a draft for four hours before opening its email link. The app should ask you to check the place again, not submit those answers as current.
10. Check expiry in the development database: an expired Open check must disappear even if the card-machine check was renewed. Expiry is measured from the supporting reports, not from opening the screen.

## Checks completed in code

- Core and mobile TypeScript checks.
- Android Expo export.
- Unit tests for session refresh, email-link errors, draft submission and per-check cache expiry.
- In-memory Postgres checks for migration reruns, consensus, conflict, cooldown, invalid answers, owner-only report reads, blocked direct inserts and anonymous RPC access.

Hosted migration deployment and phone/email QA remain outstanding. This is not a sign-off for release or an audit of every Supabase policy.
