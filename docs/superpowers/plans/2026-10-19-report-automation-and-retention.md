# Report Automation And Retention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for implementation in this session, or superpowers:subagent-driven-development if the user chooses task delegation. Steps use checkbox syntax for tracking.

**Goal:** Process eligible adult users' reports at all active places without manual worker calls, and delete report detail after 24 hours without losing account contribution counters.

**Architecture:** Keep the existing report transaction, Postgres queue, lease rules and Edge worker. Add account notice acknowledgement, server dispatch/retention functions and Cron jobs, with credentials in Vault. Extend the existing receipt contract and reporting screens rather than creating another backend or dashboard.

**Tech Stack:** Supabase Postgres, pg_cron, pg_net, Vault, Edge Functions/Deno, TypeScript, Expo/React Native, React/Vite, Vitest and the existing PGlite QA harness.

**Spec:** `docs/superpowers/specs/2026-10-19-report-automation-and-retention-design.md`, approved by the user on 19 October 2026.

## Global Constraints

- Work only on this report-processing priority. Preserve unrelated edits and the pending trip-planner design.
- No paid upgrade, billing activation, new provider or credential-page inspection. No secret values in code, chat, tool output or logs.
- Every eligible signed-in account and active place, not only the former test fixture. No anonymous, blocked or unacknowledged account bypass.
- 18+ testing; notice version and acknowledgement time, no date of birth.
- Four-hour live evidence/review window; 24-hour report retention, with hourly bounded cleanup.
- Proposed application limits: 100 calls per rolling 25 hours, five per rolling minute, with the existing UTC-day guard retained. These sit below the user-supplied 500/day, 15/minute and 250k tokens/minute model allowances.
- Keep `GEMNINI_API_KEY`, the existing saved spelling. Do not rename or inspect it.
- Preserve the meaning of `profiles.contribution_count`: submitted answers. Do not double-count on cleanup.
- No trust score, model transcript archive, per-user place history, new dependency or unrelated refactor.
- No automatic commits, pushes, worktree creation, database resets or broad data deletion.
- Create migration filenames with the installed Supabase CLI's `migration new` after checking `--help`; do not edit already-applied migrations.

## Review Focus

- Two accounts using one device: acknowledgement and receipt state must not cross the account boundary. Covered in Tasks 1 and 5.
- Quota becomes unavailable between dispatch and claim: no cap overrun or repeated attempt exhaustion. Covered in Tasks 2 and 3.
- Cleanup overlaps an active worker: recent reports survive, stale completion cannot recreate deleted detail. Covered in Tasks 2 and 4.
- An old client skips the age/notice gate: the server rejects with an actionable message, not silent acceptance. Covered in Tasks 1 and 5.
- An idle scheduler or deleted receipt: no duplicate HTTP dispatch, secret leak or growing tombstone archive. Covered in Tasks 3, 4 and 5.

## Task 1: Account Notice And Submission Boundary

**Files:** create a notice migration; extend `scripts/checkin-database-qa.mjs`, `packages/core/src/lib/supabaseApi.ts`, `packages/core/src/types/place.ts`, `packages/core/src/index.ts`, `src/lib/supabaseApi.test.ts`.

**Interfaces:** `public.read_report_review_notice() returns jsonb` returns `{version, accepted}` for the authenticated account; `public.accept_report_review_notice(p_version text, p_adult_confirmed boolean) returns jsonb` acknowledges only `auth.uid()`. Shared API methods `readReportReviewNotice()` and `acceptReportReviewNotice({version, adultConfirmed})` validate those results. Use policy version `2026-10-19`.

- [ ] Add failing SQL tests: unknown/old notice, false adult acknowledgement, anonymous identity, blocked reporter, account switching and another user's attempted acknowledgement.
- [ ] Run the disposable SQL harness and capture the failure before implementation.
- [ ] Add one private acknowledgement row per account with auth-user deletion cascade, RLS and no app table grants. Limit RPC privileges to authenticated users and validate the caller server-side.
- [ ] Gate report submission on this policy, preserving validation, cooldowns, profile counters and atomic job creation. Preserve old reports without silently acknowledging them or sending them to Google.
- [ ] Add shared API parsing/auth tests, including malformed payloads. Keep the existing report-submission signature compatible; return an actionable server error when acknowledgement is absent.
- [ ] Run the SQL harness, shared/API tests and core type check; verify that accepted reports still create exactly one batch/job and the expected contribution increment.

## Task 2: General Worker, Payload And Quota Recovery

**Files:** modify `supabase/functions/report-risk/index.ts`, `_shared/providerServices.ts`, `_shared/riskQueue.ts`; create queue/receipt migration changes; extend `src/lib/reportRiskEntry.test.ts`, `providerServices.test.ts`, `riskQueue.test.ts`, `scripts/checkin-database-qa.mjs`.

**Interfaces:** the worker continues to accept an authenticated `POST {}` and return `{completed, deferred}`. Replace fixture-scoped claim/context paths with eligible-account queue RPCs. A service-only readiness RPC returns `{ready, reason, retryAt}` without credentials. Worker claims no more than three jobs/invocation.

- [ ] Write failing tests for two acknowledged accounts at different active places, target-first context, excluded unacknowledged/blocked/anonymous accounts and expired reports.
- [ ] Write payload assertions: no UUID/email/address/source URL/GPS/name/absolute timestamp; relationships preserved within one request but pseudonyms differ between target requests. Bound the serialized context at 20,000 ASCII characters, output at 256 tokens, context at 100 reports; include prompt/schema overhead in the minute-budget proof.
- [ ] Replace stable cross-request HMAC identifiers with request-scoped pseudonyms and relative time buckets; validate enum-only context before quota reservation or fetch. Preserve structured-output validation and unknown-risk failure handling.
- [ ] Remove test-actor/venue gates only from the deployed general worker path; preserve worker-secret auth, free-tier guard, server keys and bounded work.
- [ ] Add concurrency tests for atomic quota reservation, readiness races, lease expiry, duplicate finishes and cleanup overlap. A known quota/configuration wait must not consume provider attempts; actual failures remain bounded.
- [ ] Stop obsolete review work at four hours. Do not silently replay old unacknowledged jobs when expanding scope. Replace full trust-snapshot diagnostic copies with bounded outcome/rule fields.
- [ ] Run worker/provider/queue tests and SQL harness, then Deno checks using the existing runtime. No Google call is needed for these tests.

## Task 3: Server Dispatch And Kill Switch

**Files:** create scheduler migration(s); add `scripts/report-automation-qa.mjs` using the existing PGlite dependency/runtime pattern; update `docs/RISK_QUEUE_SETUP.md` and `docs/OPERATIONS.md`.

**Interfaces:** `knogo_private.dispatch_report_risk() returns bigint` returns a pg_net request ID or null. It is not callable by anon/authenticated. Vault name `knogo_risk_worker_secret`; function URL is the known KNOGO `report-risk` endpoint. Cron job `knogo-report-risk` checks every minute. Maintain one bounded dispatch-state row to prevent overlapping invocations.

- [ ] Write failing tests with a stubbed pg_net schema: no eligible jobs, disabled provider, missing secret, spent quota, overlapping dispatch and malformed URL must not enqueue HTTP work. Do not stub a real Google response as deployment proof.
- [ ] Implement dispatch using existing queue readiness and provider reservation rules. Do not hold database locks across HTTP; pg_net dispatch starts after commit. Use Vault server-side, never return/read its plaintext through tools.
- [ ] Configure the dispatch job idempotently; a repeat migration/setup must not create duplicate cron jobs. Separate credential setup from scheduling activation.
- [ ] Add a kill switch check: provider/dispatch disabled means no new Gemini calls while submission and retention continue.
- [ ] Bound scheduler status and cron history; avoid per-idle-minute HTTP calls and unbounded request logging. Validate pg_net response TTL and queue grants on hosted Supabase before activation.
- [ ] Run the scheduler harness and review the SQL function privileges and search paths. Keep the migration/setup inactive until deployment gates and Vault existence checks pass.

## Task 4: Retention Without A Report Archive

**Files:** create retention migration; extend `scripts/report-automation-qa.mjs` and `scripts/checkin-database-qa.mjs`; update retention documentation.

**Interfaces:** `knogo_private.purge_expired_reports(p_batch_size integer default 500) returns jsonb` returns counts only. Batch-size range 1-1000. Cron job `knogo-report-retention` runs hourly. No app execution grants.

- [ ] Write failing boundary tests: 23h59m, exactly 24h, over 24h, future dates, current/expired leases, legacy confirmations with no batch, and a second cleanup run. Use the spec's strict `created_at < now() - interval '24 hours'` cutoff.
- [ ] Implement bounded batch deletion with existing cascades. Do not touch accounts, profiles, place catalogue/hours or venue access. Check legacy confirmations against the same cutoff.
- [ ] Assert every child table loses only the intended detail rows; current evidence survives. Assert profile counters are byte-for-byte unchanged and not reconstructed from retained reports.
- [ ] Bound provider-usage/day diagnostics and cron history; keep all reservation history required for the rolling 25-hour quota. No quota reset disguised as cleanup.
- [ ] Prove stale worker completion cannot recreate removed rows and recent trust diagnostics do not contain an archive of expired report content.
- [ ] Run disposable SQL tests. Before hosted activation, record dry-run counts and the exact table/cutoff scope. No account removal, truncation, reset or VACUUM FULL.

## Task 5: App Gate And Review Feedback

**Files:** modify `apps/mobile/src/screens/ConfirmScreen.tsx`, `components/ReportAssessmentReceipt.tsx`, `screens/LegalScreen.tsx`, `src/pages/ConfirmPage.tsx` and its API wrapper if needed; extend `ConfirmScreen.flow.tsx`, shared API tests and web form tests; update `docs/PRIVACY.md`, `COMMUNITY_RULES.md`, `KNOGO_FEATURE_HANDOVER.md`.

**Interfaces:** use Task 1's authenticated acknowledgement RPCs. Extend the existing `ReportAssessment` response with a validated reason enum and nullable retry time instead of exposing private jobs or model reasons. Keep author-only access. Shared client messages must handle a null/deleted receipt without revealing whether another user's report exists.

- [ ] Add failing flow tests for first use, accepted notice, adult acknowledgement refusal, save failure, account switching and an old client receiving the policy error.
- [ ] Add one consent/18+ step before reporting, using existing controls/sheets. Explain Gemini's purpose, unpaid-service data use and 24-hour deletion. Store no DOB or client-authored permission for another user.
- [ ] Add receipt tests for queued/reviewing/complete, quota wait, disabled/missing setup, expired and no-longer-available detail. Poll at five-second intervals for at most two minutes, never overlap reads, clean up timers on unmount and stop after terminal outcomes.
- [ ] Keep a usable refresh action after automatic polling stops. Replace the promise that reports stay stored forever. Refresh the place when a review becomes complete without resubmitting the report; distinguish this from approval of a closure.
- [ ] Check every report-submission caller and email/auth return path so the server policy is not a silent regression. Use existing pending-draft handling, not another growing client cache.
- [ ] Run the whole mobile suite, root/shared tests and type checks. Inspect report/notice/receipt in both themes and browser widths; record Android limits separately.

## Task 6: Review And Hosted Proof

**Files:** update the operation/setup/handover docs with verified dates, deployment versions, retention counts and remaining checks. No credential values or report contents in the evidence ledger.

- [ ] Review the full task diff, SQL grants/RLS, payload boundary, every delete and kill switch before deployment. Prefer one reviewer after integrated checks; no unrelated refactor.
- [ ] Recheck hosted functions/schema against local migrations. Use additive/compatible deployment order: policy/client handling, general queue/worker, then activated dispatch and cleanup. Never let the old fixture worker consume a general queue.
- [ ] Ask the user to enter the worker credential in Vault without sharing it. Verify name/existence only. A missing Vault credential blocks activation, not local implementation/tests.
- [ ] Reconfirm no billing change and apply the approved 100/day, five/minute application caps. Check actual project allowance before scheduling; do not use generic free limits as account-state proof.
- [ ] Apply reviewed migrations and deploy the worker, then check advisor notices and no-credential/wrong-credential rejection. Do not run destructive retries after an uncertain response; read back first.
- [ ] With approved adult test accounts and clearly identified test places, submit at least two reports across accounts/places. A second fixture place may be created only with approval; do not invent reports at real businesses.
- [ ] Observe an actual cron-triggered worker invocation and matching author receipts, with the app closed during part of the run. Do not manually invoke the worker and label it automatic.
- [ ] Verify first hosted cleanup against the dry-run counts, cascades and profile counters. Check idle dispatch, quota failure and kill switch without consuming paid capacity or deleting current reports.
- [ ] Mark completion only when automatic processing, privacy gates, scoped deletion and monitoring are proven. If credentials or phone proof remain, state that limit instead of calling the feature finished.

## Verification Commands

Use installed tools; do not bypass pnpm signature checks or reinstall unrelated dependencies.

```powershell
node node_modules/vitest/vitest.mjs run
node node_modules/vitest/vitest.mjs run --config vitest.mobile.config.ts
node apps/mobile/node_modules/typescript/bin/tsc --noEmit -p apps/mobile/tsconfig.json
node packages/core/node_modules/typescript/bin/tsc --noEmit -p packages/core/tsconfig.json
node node_modules/typescript/bin/tsc -b
node scripts/checkin-database-qa.mjs
node scripts/report-automation-qa.mjs
```

For the SQL harnesses, resolve and set `KNOGO_PGLITE_MODULE` to the existing installed PGlite module before running; do not download a substitute or use the hosted project as a test harness. Use the installed Deno toolchain for the Edge entry checks after locating it.

## Plan Review And Execution

Self-review: every spec section maps to a task; report deletion, profile-counter preservation, request data limits, quotas, worker auth, age/notice checks, two-account/two-place proof and actual scheduler proof are explicit gates. No application or hosted changes were made while writing this plan.

Recommended execution: implement in this session, task by task, with integrated tests and one review before deployment. The tasks share queue/receipt contracts, so one implementation context avoids repeatedly rebuilding those interfaces. Await the user's plan review and execution choice before product edits.
