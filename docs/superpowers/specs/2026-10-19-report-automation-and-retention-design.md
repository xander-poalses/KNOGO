# Report Automation And Retention

Date: 19 October 2026.
Status: design for user review. Not implemented or deployed.
Priority: this work takes precedence over directory expansion, map styling and trip-planner recovery work.

## Outcome

A signed-in adult test user submits a report at any active KNOGO place. The report is stored and processed without a PC, terminal command or the app remaining open. Gemini reviews reporting patterns, not truth or venue availability. Users see the result or the reason review cannot run. Report detail is deleted after 24 hours, with account counters retained.

The user confirmed:

- Report-detail retention: 24 hours.
- Live evidence lifetime remains four hours.
- Testing is restricted to people aged 18+.
- Google AI Studio shows Gemini 3.5 Flash Lite: RPM 1/15, TPM 266/250k, RPD 1/500. Interpret these as usage/limit, not a one-request allowance.
- No spending, billing activation or paid upgrade.
- Remove test-account and test-venue allowlists. Do not remove authentication, privacy or abuse boundaries.

## Current Evidence

Read-only hosted checks on 19 October found:

- Nine report batches, nine jobs, one assessment and ten trust-decision rows.
- Eight reports older than 24 hours; none older than seven days.
- Database size 14,404,755 bytes. This is not a claim about all project quotas.
- Gemini enabled at one request/day and one/minute.
- The latest test report was saved and queued with zero processing attempts.
- No pg_cron or pg_net extension; Vault is installed. No matching local worker process was found.
- The worker requires RISK_TEST_ACTOR_ID and claims only knogo-gemini-test-venue.
- The existing context query spans recent accounts/places, but the worker filters it to the test fixture.
- Reports expire as live evidence after four hours but lack a deletion schedule.
- public.profiles.contribution_count counts submitted answers, not report batches. Preserve that meaning and do not count it again during cleanup.
- Confirmations, report audit rows, jobs, assessments and trust decisions reference report_batches with ON DELETE CASCADE.

## Approach

Use the existing queue and worker, started by Supabase Cron through pg_net. Store the service-to-service credential in Vault. Keep the existing worker-secret authentication and service-role-only queue functions. This uses the existing backend rather than introducing another hosting provider or making the phone responsible for background processing.

Alternatives considered: client-triggered processing stops being dependable when the app closes and risks exposing invocation authority; a separate hosted runner adds configuration and another service. Neither is needed for this scope.

## Submission And Privacy

1. Keep the sign-in-before-report flow.
2. Before the first report under this policy, require acknowledgement of 18+ testing and the report-review/retention notice. Store notice version and acknowledgement time against the authenticated account, without date of birth.
3. Enforce the acknowledgement server-side; the client cannot acknowledge for another account. Preserve existing report validation, throttling and blocked-account rules.
4. Do not retroactively treat existing accounts or reports as having acknowledged this notice. Existing report data can expire/delete under the retention policy without being sent to Google.
5. Include context only from accounts/reports covered by the notice. Keep the context bounded to the target and a maximum of 99 other reports from the four-hour evidence window.
6. Send only allowed answer enums, check-method enums, relative five-minute time buckets and within-request pseudonyms for observation/account/place relationships. No emails, names, source URLs, addresses, coordinates, raw UUIDs, absolute timestamps, free text, profile histories or credentials.
7. Scope pseudonyms to a review request so Google cannot use a stable identifier to join a person's history across reviews. This is data minimisation, not a claim that pseudonymisation automatically makes data anonymous or compliant.
8. Bound serialized request size and output tokens so five requests/minute remain below the supplied token allowance, including prompt/schema overhead. Reject malformed or oversized input before provider access.
9. Update the app notice, support/privacy copy and other reporting clients affected by the server requirement. A self-declared age gate does not prove age or establish legal compliance.

Google's unpaid-service terms permit use of input/output for product improvement and human review, and instruct developers not to submit personal, sensitive or confidential information. The 18+ test gate and data boundary must be reviewed before expanding beyond this test audience. No paid tier is proposed.

## Queue And Automatic Dispatch

- Retain atomic report-and-job insertion, row leases, SKIP LOCKED claiming and lease-checked finish.
- Replace the fixture-only worker path with claiming across eligible accounts and active places. Keep a bounded per-invocation workload, initially at most three reports.
- Run a server dispatch check every minute. Invoke the Edge Function only when eligible work is due, the provider is enabled, the credential is configured and budget is available.
- Prevent overlapping dispatches from generating an unbounded number of worker invocations. Queue leases remain the final duplicate-processing boundary.
- Perform no provider HTTP call inside a transaction that holds report or quota row locks.
- Use the existing atomic provider reservation as the final quota guard. Dispatch readiness checks do not themselves reserve a Gemini call.
- Proposed KNOGO caps: 100 calls per rolling 25-hour window, five per rolling minute, below the supplied 500/day and 15/minute allowance. Keep the UTC-day counter too; do not raise billing or quotas.
- Quota/configuration waits must not consume the report's provider-attempt allowance. A report should not burn three attempts while the same known limit remains in effect.
- Retry provider/network failures with bounded backoff. Reuse the lease for a retried finish; do not retry an uncertain provider request immediately and claim it was only one call.
- Stop work when the four-hour evidence/review window ends. Do not spend provider budget reviewing expired reports.
- A missing credential, disabled provider, exhausted budget or failed worker remains visible as a service condition, not a permanent spinner or a claim that the report was rejected.
- No worker secret, service-role key or Vault value is sent to the app, printed in diagnostics, included in migration source or exposed by a public RPC.

## Retention And Storage

- Run cleanup on the server, initially hourly, deleting report batches whose created_at is more than 24 hours old. This means data becomes eligible at 24 hours and is removed by the next successful run, not an exact-to-the-second deletion guarantee.
- Delete in bounded batches. Do not delete accounts, profiles, places, hours or venue-representative access.
- Let existing cascades remove linked answers, report audit rows, risk jobs, assessments and trust-decision records.
- Inspect legacy confirmations without a batch reference. Delete expired legacy report observations under the same cutoff without removing place facts or current observations.
- Preserve contribution_count; submission already increments it. Do not increment during cleanup, reconstruct it from retained rows or mistake deletion for loss of accumulated contributions.
- Do not persist per-user venue histories, duplicate report JSON, model transcripts or an accuracy/trust score for later use. Keep account policy acknowledgement and existing counters as bounded per-account data.
- Reduce trust-decision diagnostic payloads to the fields required for debugging. Do not keep snapshots of other users' report evidence as a second archive.
- Bound cron run history and provider-usage diagnostics. Retain only recent operational counters; preserve the quota windows needed to enforce the 25-hour limit. Do not delete current quota reservations to regain allowance.
- Do not store provider responses in app profiles. pg_net response/request queues and access privileges need checking so scheduler credentials are not exposed and network history remains bounded.
- Cleanup is idempotent and does not depend on Gemini succeeding. It can run even when the provider is disabled.
- Deleting rows allows Postgres space reuse; do not promise an immediate reduction in the database file size. No VACUUM FULL, table rebuild, database reset or account deletion is part of this work.
- Before first hosted deletion, record counts/affected table scope and prove the cutoff/cascades/counter preservation in a disposable database. The user has approved the 24-hour policy; any broader deletion needs another decision.

## Receipt And Status Experience

- Report saved is distinct from review queued, reviewing, complete, unavailable, deferred by a limit, expired or removed by retention.
- Poll in a bounded way, with a usable refresh action and no indefinite loading state. Surface a reason/next retry time where it can be disclosed without private queue data.
- Preserve author-only receipt access. Another account must not read or distinguish private report receipts, including after deletion.
- After retention removes detail, an author can receive a retention explanation without preserving an ever-growing tombstone table. An unknown/deleted report ID must not expose another user's existence.
- Replace "Your report remains in the record" wording that would contradict 24-hour retention.
- Refresh the place after assessment changes without resubmitting the report. Do not imply Gemini alone changes status or that one closure report establishes a closure.
- Keep the current trust thresholds and opposing evidence rules. This work does not create a new reputation score or weaken closure safeguards.

## Deployment Boundary

1. Build and test the code/migrations without switching the hosted worker to all accounts.
2. Review the schema/privileges and deployment diff, including every delete and cascade.
3. The user supplies the existing worker credential into Vault through a masked/local or dashboard flow. The agent does not inspect credential pages or read plaintext secrets. Edge Function secrets are not automatically available inside Postgres Vault.
4. Verify credential presence using existence checks only. No plaintext Vault reads through tools.
5. Deploy compatible database functions/client handling, then the worker, then the scheduler and retention jobs. Prevent the current test worker from consuming general jobs during the transition.
6. Require acknowledgements before new general-user reports become eligible for Google processing. Do not silently process the old queue under the new policy.
7. Prove a scheduled run without invoking it manually. Keep the app closed during part of the check to prove it is not the trigger.
8. Keep a kill switch for dispatch/provider access. Pausing Gemini must not stop report submission or retention maintenance.

## Acceptance Checks

- Two signed-in adult test accounts can submit at two different active places, not only the fixture venue. Test observations must be identified/approved so no real venue receives an invented live status.
- Each report is saved once and processed by the scheduler without a terminal command.
- The author sees the matching assessment and a place refresh; other accounts cannot read the receipt.
- Provider input inspection proves the data boundary, target inclusion and pseudonym scope.
- Invalid/missing acknowledgement, malformed data, blocked accounts and anonymous access are rejected at the server boundary.
- Wrong/missing worker credentials cannot claim jobs, access private data or execute cleanup.
- Quota, timeout, malformed output, disabled provider and lease recovery leave reports intact and receipts understandable.
- Simulated quota contention cannot exceed limits; no per-account exception bypasses global free-tier caps.
- Reports younger than 24 hours survive cleanup. Older batches and every linked detail row are removed. Legacy/orphan handling is covered. Profiles, places and contribution counters are unchanged.
- Repeating cleanup or scheduler dispatch does not double-count contributions or duplicate completed assessments.
- Recent report data is not retained indirectly in trust snapshots, queue logs or app-profile caches.
- All affected repository/mobile tests, type checks and disposable SQL/RLS tests pass. Record current warnings and native/provider checks rather than presenting mocks as deployment proof.
- A hosted scheduler cycle, no-op/idle check, retention run and kill-switch check pass. No new chargeable service, billing activation or credential exposure occurs.

## Evidence And Sources

Repository: `supabase/functions/report-risk/index.ts`, `_shared/providerServices.ts`, `_shared/riskQueue.ts`; trust/report/scoped-claim migrations; shared Supabase client; ConfirmScreen and ReportAssessmentReceipt; account/profile and SQL QA code.

Official sources reviewed on 19 October:

- [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions): Cron, pg_net and Vault.
- [pg_net](https://supabase.com/docs/guides/database/extensions/pg_net): HTTP work starts after commit; beta API requires version/schema checks.
- [Supabase pricing](https://supabase.com/pricing): Free includes 500 MB database size and 500,000 Edge invocations; this is not a live account-usage reading or uptime guarantee.
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits): project-level RPM/TPM/RPD; active limits are shown in AI Studio and capacity can vary.
- [Gemini terms](https://ai.google.dev/gemini-api/terms): age, unpaid-service data use and restrictions. User-supplied current model quotas are recorded above; no secret page was inspected.

Open setup item: user entry of the worker credential into Vault. Current account billing/usage was not re-opened in a browser; no promise of unlimited free reviews or legal compliance is made.
