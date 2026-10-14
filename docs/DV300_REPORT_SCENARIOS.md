# Reporting Scenario Evidence

Checked: 11 October 2026, milestone worktree, base `7935b36`, uncommitted.

This index maps 37 case groups to assertions in existing tests. Parameterised
inputs count as one group, not as separate scenarios. The groups cover report
entry, recovery, assessment receipts and evidence/publication rules. They are
automated evidence, not 37 human walkthroughs or a Gemini provider demo.

## Sources And Runs

- **Trust**: `src/utils/trust.test.ts`, 33 tests passed at 13:43 SAST.
- **Flow**: `apps/mobile/src/screens/ConfirmScreen.flow.tsx`, 22 tests passed at
  13:44 and 13:46 SAST. React Native, account entry, storage and network calls use mocks.
- **Queue**: `src/lib/riskQueue.test.ts`, five tests passed at 13:43 SAST.
- **Database**: `scripts/checkin-database-qa.mjs` passed at 13:44 SAST against
  in-memory PostgreSQL. It exercises migrations, roles and SQL functions;
  it does not call a provider or use the hosted database.

Run from the milestone worktree:

```powershell
pnpm exec vitest run src/utils/trust.test.ts src/lib/riskQueue.test.ts
pnpm exec vitest run --config vitest.mobile.config.ts apps/mobile/src/screens/ConfirmScreen.flow.tsx
$env:KNOGO_PGLITE_MODULE='C:\Users\poals\.codex\worktrees\dv300-milestone\KNOGO\.codex-artifacts\test-runtime\node_modules\@electric-sql\pglite\dist\index.js'
node scripts/checkin-database-qa.mjs
```

## Case Groups

All groups below passed in those runs. The test name is the lookup key in the
source file. Assertions were read before this index was written.

| ID | Source | Test Name |
| --- | --- | --- |
| R01 | Trust | rejects malformed resolver evidence rather than strengthening a negative (%j) |
| R02 | Trust | rejects missing resolver evidence and an invalid clock |
| R03 | Trust | accepts the database's public evidence without private account or risk data |
| R04 | Trust | keeps valid checks when another claim is malformed |
| R05 | Trust | does not revive legacy booleans after a malformed or unsupported snapshot |
| R06 | Trust | keeps uncertainty for an inconsistent public claim (%j) |
| R07 | Trust | rejects future claim times and evidence even when expiry is in the future |
| R08 | Trust | expires from the evidence even if a cached claim extends its own deadline |
| R09 | Trust | does not treat two accounts as sufficient negative evidence |
| R10 | Trust | labels eligible negative evidence likely closed, never Closed |
| R11 | Trust | keeps uncertainty when risk assessment fails, is absent or reports coordination |
| R12 | Trust | does not count duplicate accounts twice |
| R13 | Trust | keeps venue and community statements in a conflict |
| R14 | Trust | rejects unverified representatives and expired or future evidence |
| R15 | Trust | keeps trading separate from service availability |
| R16 | Trust | validates risk output and rejects injected reasons or extra fields |
| R17 | Flow | stops after six reads and leaves a manual retry |
| R18 | Flow | stops polling when the review completes |
| R19 | Flow | does not poll a %s receipt (expired/unavailable grouped) |
| R20 | Flow | replaces the scheduled poll when manually checking |
| R21 | Flow | ignores a response received after unmount and schedules no more reads |
| R22 | Flow | keeps the submitted report ID and shows its queued review without claiming Gemini ran |
| R23 | Flow | shows a provider assessment with its limits and keeps raw model data out of the screen |
| R24 | Flow | keeps the report saved when its assessment fails and retries only the read |
| R25 | Flow | returns sign-in to review and requires a separate submit action |
| R26 | Flow | preserves a signed-in draft when submission fails |
| R27 | Flow | reviews a closure on its own without inferring kitchen or busyness |
| R28 | Flow | keeps one question visible and requires a choice before continuing |
| R29 | Flow | allows optional checks to be skipped without inventing answers |
| R30 | Flow | keeps reporting available when draft storage cannot be read |
| R31 | Flow | starts a separate report when the router changes venues |
| R32 | Flow | does not restore an old venue draft after switching venues |
| R33 | Flow | waits for place loading before announcing a missing venue |
| R34 | Flow | restores answers for review without submitting them |
| R35 | Flow | does not overwrite a choice made before storage finishes loading |
| R36 | Flow | keeps a stale draft out of the form |
| R37 | Flow | saves signed-out answers before showing account access |

R29 restores a draft containing answers to all three optional checks, skips
each one, then asserts that both saved and submitted answers contain only the
three retained checks. Nothing submits before the submit action; that action
submits once. This assertion was added and passed at 13:46, without changing
application behaviour.

## Backend Corroboration

The database script also asserts duplicate-answer rejection, submission
cooldown, no direct confirmation writes, visitor/report-author boundaries,
blocked and anonymous contributor handling, inactive venues, source URL
validation, disagreement/expiry, unknown risk after insufficient context,
queue/provider caps and author-only receipt states. These checks support the
groups above; they are not added to the 37 count.

The Docker/browser proofs in `DV300_MILESTONE_EVIDENCE.md` cover signup return
without auto-submit, submitted report persistence, expired evidence and
disagreement with both sources retained. They are separate from this unit/flow
index and use invented test records.

## Remaining Proof

- The pitch's minimum 30 reporting scenarios have a 37-group automated index.
  This is not proof of 30 manual, device or provider-backed scenarios.
- A real Gemini response through backend and UI remains required. R18/R23
  supply mocked receipts; their wording does not establish a provider call.
- No outside-tester observations or Android/TalkBack results are recorded.
- Full migration replay is not proved by the in-memory script's fixture schema.
- Milestone Testing remains Needs verification until the outside test is done.
