# Gemini Report Test

Prepared 12 October 2026. This is a test plan, not evidence of a Google request.

## Boundary

report-risk version 2 requires RISK_TEST_ACTOR_ID before enabled testing can
claim jobs. The provider adapter refuses the entire context if any account ID
differs from that test account. Rejection happens before quota reservation or
Google access. Missing/empty/invalid scope blocks the worker. Do not remove this
boundary or use a normal user account for the invented report test.

The check does not prove that the chosen account's answers are invented. Use
a dedicated account and a venue identified as a test, with no personal input.
Do not run a scheduler. Recheck the queue before a manual worker invocation;
it must contain only the test jobs. A context rejection can still record a
disabled assessment on a claimed job, so this is not permission to drain a
queue containing other users' reports.

## User Setup

Open the KNOGO project in Supabase Dashboard, then Edge Functions > Secrets.
Keep GEMNINI_API_KEY where it is. This is the name the user chose; the worker
reads that spelling. Generate a value of at least 32 characters
for each name below using a password manager's generator. Use two values,
not one shared value, and do not reuse an account password.

| Name | Purpose |
| --- | --- |
| RISK_WORKER_SECRET | Authorises a server worker invocation; never goes to the app. |
| RISK_PSEUDONYM_SECRET | HMAC key for replacing account, venue and report IDs before Google access. |

Save them in Supabase secrets, not in chat, Git or Expo. Tell Codex only that
they are saved. Values must remain server-side. Manual worker invocation
still needs an authorised mechanism for supplying its credential; saving a
secret does not demonstrate that invocation.

Leave GEMINI_FREE_TIER_CONFIRMED unset or false. Leave the Gemini database gate
disabled. RISK_TEST_ACTOR_ID is configuration for the test account, not its
password; it will be selected after the test data scope is approved.

## Agent Setup And Verification

The user approved one test account, one venue, one invented report sent to
Google, and disabling the provider afterwards. The user also requires approval
before browser access to credential pages. Secret values must not be revealed
or copied by the agent. The user operates credential forms and authenticated
worker invocation; the agent can check the resulting database records.

Hosted checkpoint on 12 October: KNOGO Test Venue exists at
knogo-gemini-test-venue, tagged test-only. Gemini is disabled at five calls
per 25-hour window and one per minute. report-risk version 5 reads
GEMNINI_API_KEY. There are no hosted accounts or reports at this checkpoint.

Next user step: open Authentication > Users in hosted KNOGO. Choose Add user
then Create user. Use knogo-review-test@example.test and a generated test-only
password; do not send an invitation to this invented address. If the form
offers automatic confirmation, use it only for this fixture account. Leave
the project's email-confirmation setting unchanged. This admin-created fixture
does not demonstrate hosted email delivery. Tell the agent only that it exists,
not its password. Keep the credential for signing in to the hosted preview.

1. Obtain approval for creating a test venue and test account in hosted KNOGO,
   and for sending only the invented observations to Google's unpaid service.
   State that unpaid input/output can be reviewed and used to improve products.
2. Recheck billing/limits and confirm there are no non-test jobs or reports.
3. Create only the approved fixture, with a test-only account credential.
   Never weaken sign-in rules for normal accounts or use a public venue.
4. Configure RISK_TEST_ACTOR_ID for that account. Keep the app's existing
   Docker environment separate; use a preview connected to hosted KNOGO for
   this test. Existing Mailpit confirmation proves Docker, not hosted signup.
5. Reduce the Gemini test cap to five per 25-hour window and one per minute.
   Obtain approval before setting the provider gate and free-tier flag true.
6. Submit the invented observation through the app after review. Check that
   one job and one report exist, then manually run the worker once.
7. Read the author-only receipt through the app. A valid assessment with
   insufficient_context may have unknown risk; that still proves a provider
   response, not that the observation is true. Record source, model and time.
8. Verify saved-report recovery without resubmitting. Do not fabricate a
   provider failure or present a mocked response as Google evidence.
9. Disable the provider gate after the test. Do not delete fixtures without
   approval; retain them as identified test data until cleanup is agreed.

## Checks Recorded

- Eight scope regressions failed before the boundary and passed after it.
- Core/server suite: 262 tests passed. Root/shared TypeScript passed.
- Hosted readiness before preparation: zero accounts, reports and queued jobs;
  Gemini database gate false. This dated observation must be rechecked.
- Worker version 2 deployed. No Google request, secret retrieval, test fixture
  creation, scheduler or provider activation performed during preparation.
