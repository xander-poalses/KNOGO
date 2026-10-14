# Check-in setup and QA

## Database

The hosted project was healthy at the read-only 9 October audit, but lacked
the trust migration and report-risk worker. Earlier INACTIVE notes are
historical. No hosted deployment is authorised for the milestone.

1. Use the Docker milestone backend and invented test venues for testing.
2. Confirm which migrations are applied before submitting reports. Trust rules
   replace the earlier two-account consensus; do not test that legacy policy
   as if it were the intended product.
3. Never reset the hosted database or reapply migrations without checking its
   state and obtaining deployment approval.
4. Keep evidence expiry separate from trading hours. Old reports remain stored
   but cannot be presented as live checks.

## Email and redirect setup

1. Open Authentication > Sign In / Providers > Email. Enable email sign-in and allow sign-ups for this test. Keep email verification enabled.
2. Open Authentication > URL Configuration. Add these Redirect URLs for development:
   - `knogo://auth/callback` for an installed KNOGO build.
   - `http://localhost:8082/auth/callback` for web testing on port 8082.
   - `http://localhost:8081/auth/callback` if running on port 8081.
3. Expo Go does not register the KNOGO scheme. Its callback depends on Metro's address. If Metro shows `exp://192.168.1.20:8081`, add `exp://192.168.1.20:8081/--/auth/callback`. Substitute the address shown by your terminal. Update this entry if that address changes. Do not allow all hosts with a wildcard.
4. Start the app using `pnpm.cmd mobile` from the project root. Keep the phone connected to Metro. Open the email link on that phone, not on another device.
5. For tests without SMTP, use an email belonging to a member of the Supabase organisation. The default sender does not support arbitrary tester emails and has delivery limits. Do not give testers dashboard access to work around this.
6. For milestone tests, use Docker's Mailpit inbox instead of external SMTP.
   If hosted delivery is considered later, check costs and obtain approval
   before buying a domain or enabling a provider. SMTP credentials belong in
   Supabase, never in Expo env files.
7. Leave the email template as a link using `{{ .ConfirmationURL }}`. This build consumes email links, not six-digit codes. Disable provider link tracking if it rewrites Auth links.
8. For tester distribution, use an installed preview build with `knogo://auth/callback`. Expo Go remains a development test, not the release path.

Do not share email links, tokens, SMTP passwords or service-role keys in screenshots or chat. If a link fails, share only the error text and the host/path, without the query or fragment.

## QA sequence

Use an invented venue in the Docker test database. The reporting RPC requires
`is_active = true`. Never publish invented reports to a public venue.
Opposing usable answers create disagreement. A likely-negative indication
requires three eligible accounts, two check methods, a 15-minute span and
low-risk assessments; it is not a two-account vote. See COMMUNITY_RULES.md.

1. Sign out. Open the test place, choose Leave a report and answer the questions.
   Choose At the venue, By phone or Online. Online needs an HTTP or HTTPS source URL.
2. Review your answers and choose Sign in to submit. Use the account flow;
   confirm in Mailpit if creating an account. Do not assume a session exists
   before confirmation.
3. Return to review. Account access must not submit the draft. Choose Submit
   check once; confirm Report received, the saved batch and its source.
   `location_verified` remains false. A report may supply a community indication,
   not proof of availability. Review unavailable must not mean report unsaved.
4. Close and reopen KNOGO. Settings should retain the account. Sign out, restart and check that it remains signed out.
5. Test the negative threshold using database fixtures for account age and
   time span. Without all conditions, including low-risk assessments, the
   result must remain uncertain. Do not fake those conditions in a live demo.
6. Submit opposing usable observations. The check must show Reports disagree,
   not select a winner by majority vote. Preserve source/time evidence.
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
