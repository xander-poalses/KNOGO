# Gemini Report Test

Prepared 12 October 2026. This is a test plan, not evidence of a Google request.

## Checkpoint: 14 October 2026

Worker version 8 and `scoped_report_risk_claim` are deployed to KNOGO. The
worker requires a test account scope even while the free-tier flag is false.
It calls the scoped queue RPC with that account and
`knogo-gemini-test-venue`. Only matching jobs can be claimed or expired by
this worker. The existing unscoped RPC remains available to server roles;
this test worker does not use it.

The test account and venue exist. The earlier fixture report has expired.
One report outside the fixture scope is waiting with zero attempts; it was
not claimed, changed or sent to Google. There are zero assessments. Gemini
remains disabled with caps of five calls per 25-hour window and one per minute.

Checks passed: 266 core/server tests, the in-memory database QA (including
scope isolation and app-role rejection), and root/shared TypeScript. Hosted
permissions allow only the server role to call the scoped RPC. A worker
request without its credential returned 401. No Google request was made.

Next human steps:

1. If `RISK_WORKER_SECRET` was not saved, replace that entry with a generated
   value of at least 32 characters and save it in a password manager. Do not
   send it in chat. Leave `GEMNINI_API_KEY` and the other secrets unchanged.
2. Confirm the KNOGO Google AI project still shows Free tier and no billing.
   [Google's pricing page](https://ai.google.dev/gemini-api/docs/pricing) lists
   input/output for `gemini-3.5-flash-lite` as free on that tier. It also says
   unpaid inputs/outputs may be used to improve products. Use fixture data only.
3. After those confirmations, sign in with the fixture account and submit one
   invented report to KNOGO Test Venue. The agent must recheck scope and expiry
   before enabling the provider for the test. Do not submit invented reports
   to catalogue venues.
4. The human supplies the saved worker credential in the authenticated worker
   invocation, without giving it to the agent. The agent checks the assessment
   and app receipt, then disables the provider. No scheduler is enabled.

The user has not retained the worker credential. Credential replacement and
the authenticated invocation remain human steps. This checkpoint supersedes
the setup steps and deployment versions below; the earlier entries are history.

## Boundary

### Verified Provider Response: 14 October 2026

The human invocation returned `completed=1, deferred=0`. The hosted database
confirms one Gemini reservation, an `assessed` result from
`gemini-3.5-flash-lite`, and a `complete` fixture job. Assessment time:
12:11:39 SAST. Result: `low`, reason `no_pattern_detected`. This is a reporting
pattern signal, not proof of venue status or truth.

The agent disabled the Gemini database gate after checking the result.
No scheduler was enabled. The response used the configured test account at
KNOGO Test Venue. The user supplied an Android development-build screenshot
showing `Gemini review complete`, `No pattern flagged. This does not prove
the report.`, and `Reviewed 12:11`. The phone receipt is now demonstrated.
Evidence: [Android receipt](evidence/gemini-review-android-2026-10-14.jpg).

### Invocation Checkpoint: 14 October

First authorised invocation returned 503 after 21.3 seconds. The fixture job
was leased with one attempt; provider usage and assessment tables were empty.
The claim RPC logged 200, with no context/finish response logged in that window.
The gate was disabled during diagnosis. A fixture-only database finish probe
passed inside a rolled-back subtransaction; it left no assessment behind.

Worker version 11 adds one retry for context/finish TimeoutError or AbortError,
never for claims or Google calls. Finish retries reuse the report and lease.
Each invocation handles one job. A 503 now includes a stage enum that the
masked invocation script can print without printing raw errors or credentials.
42 worker/provider tests pass. The one-request test gate was reopened with
zero reservations; its result still requires the human invocation.

The user confirmed Free tier and replacement of `RISK_WORKER_SECRET`. One
fixture report is ready. Worker version 10 filters context to that account
and KNOGO Test Venue before the provider adapter; the adapter's target and
account checks remain in place. Mixed-context regression tests pass.

The Gemini database gate is enabled for this manual test, with the cap reduced
to one call per 25-hour window and one per minute. No scheduler is enabled.
No request to Google has been demonstrated. The agent must disable the gate
after the user invokes the worker and the assessment is checked.

The user runs `scripts/invoke-report-risk.ps1` on their PC and supplies the
saved worker credential through its masked prompt. The script neither prints
the value nor writes it to a file. Its mocked self-check made no network call.
Only share the resulting counts or HTTP status, never the credential. Do not
retry a deferred result until the agent checks its database outcome.

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
