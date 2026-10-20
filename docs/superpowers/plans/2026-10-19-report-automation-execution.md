# Report Automation Execution

Approved scope: report automation and 24-hour retention. Follow the linked design and implementation plan dated 2026-10-19.

## Execution Rules

- Use this checkout. No worktree, commits or pushes.
- Implement in this chat; one subagent review after integrated checks.
- Test with the disposable database, not hosted report data.
- Do not inspect credentials. Vault setup remains a user action.
- Do not activate hosted processing or deletion before review and checks.

## Progress

- Implemented locally: account notice, server submission boundary and API validation.
- Implemented locally: queue eligibility, provider payload and quota recovery.
- Implemented locally: inactive scheduler, retention, receipt and reporting clients.
- Completed: one subagent review; four findings fixed and covered by tests.
- Deployed: five report migrations, report-risk version 15, minute dispatch and hourly retention.
- Verified: scheduled processing across two accounts and three places; first cleanup and counter preservation.
- Pending: explicit Android receipt/layout confirmation, hosted kill-switch drill and remaining edge-case checks. Do not infer these from SQL or mocks.

## Evidence

- Starting checkout: no uncommitted changes.
- Existing worker restricts claim and context to a test account/place.
- Existing report transaction owns validation, contribution counters and queue insertion; preserve it.
- Red/green: notice API failed six tests before implementation; 42 API tests now pass.
- Red/green: SQL notice functions absent, then all notice/ownership/atomic-count checks passed.
- Red/green: legacy jobs claimed before eligibility migration; after migration only post-acknowledgement reports claim.
- Red/green: payload used absolute buckets and reserved invalid input; scoped/relative/bounded tests now pass.
- Red/green: scheduler function absent and receipt reason absent; both SQL harnesses now pass with network stubs.
- Red/green: polling stopped at six reads; now stops at two minutes and permits manual refresh.
- Shared/web suite: 299 passed. Mobile suite: 479 passed. Existing React act/pointerEvents and Router warnings remain.
- Root, core and mobile TypeScript checks pass. Deno checks pass for report-risk.
- Hosted read-only preflight failed at the Supabase connector transport, before any database response. No hosted writes or deletion have run.
- User asked to add the worker credential to Vault; no value requested or inspected.

## Hosted Evidence, 19 October 2026

- User confirmed Vault entry creation. Existence check returned true; no plaintext credential read.
- Worker version 15 is active. Missing and incorrect credentials both returned 401.
- Dispatch runs every minute. Retention runs hourly at minute 36, chosen at activation so its first scheduled run could be observed without increasing its frequency.
- Application caps are 100 per rolling 25 hours/UTC day and five per rolling minute. No billing setting changed.
- Pre-cleanup scope: eight batches, 11 answers, eight audit rows, one assessment, eight jobs and nine trust decisions. No accounts, places, hours or venue access were cleanup targets.
- First retention Cron run succeeded at 13:36 SAST. No batches older than 24 hours remain at the verification checkpoint.
- Baseline profile counters: three profiles, 27 answers, checksum `396737a685cecc6b67c44c4fb4c31f3f`.
- At 21:06 SAST: three submitted reports across two accounts and three places have complete jobs and assessed results, with one attempt each. Three provider reservations were recorded in 25 hours. Dispatch is idle after processing.
- Current profile total is 36. Subtracting the nine answers submitted since activation reproduces the exact baseline counter checksum, proving cleanup did not reconstruct or decrement the counters.
- No report was seeded by the agent. User declined another fixture and submitted observations at existing places.
- The app browser shows the notice, unchecked acknowledgement and disabled Continue without a notice-load error. No acknowledgement was entered by the agent.

## Managed Transport Constraint

Migration `restrict_report_worker_transport` attempted revocation. Hosted readback proved it did not remove `supabase_admin` grants, despite migration success. The local ownership stub cannot establish hosted grant behaviour.

Supabase documents that these grants cannot be changed per project. App roles have no SQL login; a request using KNOGO's public client key and `Accept-Profile: net` returned HTTP 406 / PGRST106. Dispatch, cleanup, claim/context and readiness functions reject app-role execution. Keep `net` out of the Data API and do not give untrusted services SQL logins. Database login roles can read queued worker credentials while requests wait; no claim of per-role transport isolation is made.

Sources: https://supabase.com/docs/guides/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16 and https://supabase.com/docs/guides/troubleshooting/database-roles-can-read-request-headers-queued-by-pg_net-ad6357.

## Proposed Policy Change

User requested one report when there is no harm and a confirming report when there is harm. This is not implemented. Clarify harm versus the implication of an answer versus coordination risk before changing the database thresholds, core trust rules, UI contract or tests. Existing negative-claim thresholds remain in force.
