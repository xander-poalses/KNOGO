# Milestone Merge Checklist

Checked 11 October 2026. This is merge preparation, not approval to merge,
deploy, push, archive the worktree or enable Gemini.

## Checks Passed

- Milestone worktree: 254 core/browser tests and 404 mobile flow tests.
- Milestone worktree: mobile TypeScript and root/shared TypeScript build.
- Original checkout: mobile TypeScript and eight BranchMap flow tests.
- Region migration: baseline and legacy schemas, including repeat application.
- Trip database: permissions, disabled defaults, caps, rollover and kill switch.
- Report database: trust rules, queue, blocking, receipts and role boundaries.
- Docker API: signup, confirmation, login, persisted reports and logout.
- No overlap between the two folders' changed/untracked file lists.
- No worktree path references found in app code, shared code, scripts or SQL.
- Server/mobile environment files are ignored by Git.
- Account/report preview, test inbox and trip preview returned HTTP 200.

These results do not prove a Gemini response, Android behaviour, WCAG
conformance or that the complete database can be rebuilt in one command.
Warnings from React test timing and dependency deprecations remain.

## Gates Before Merging

- [x] Whole-branch review completed; one receipt retry finding resolved with
      a failing-then-passing database regression and a passing core suite.
- [ ] Gemini backend request and result shown in the app with invented input.
- [x] Hosted report changes approved and applied on 11 October; report-risk
      version 1 deployed with Gemini's database gate disabled. This does not
      approve provider activation or sending user reports to Google.
- [ ] Test data boundary checked before any Gemini request. A made-up target
      alone is insufficient: worker context may include other users' reports.
- [ ] Outside tester feedback recorded and blocking flow issues resolved.
- [ ] Android checks performed, or a browser-only milestone limit accepted.
- [ ] Destination branch and treatment of existing edits confirmed.

## Merge And Cleanup Order

1. Recheck both folders for changes made since this audit.
2. Preserve the original checkout's BranchMap edits, lockfile edit and new
   BranchMap/ExpoGoSkeleton files. Do not reset or overwrite them.
3. Commit milestone changes without ignored credentials, logs or artifacts.
4. Merge into the agreed destination branch without pushing.
5. Run suites and TypeScript from the original KNOGO folder. Test account,
   report, place and trip flows from a preview served from that folder.
6. Check which backend the preview uses. Do not copy Docker credentials or
   environment files over hosted configuration without choosing the target.
7. Preserve any needed ignored configuration; stop only preview processes
   started for this worktree. Do not stop unrelated apps or delete Docker data.
8. Archive the worktree through Codex after verification. Its recovery snapshot
   is not a backup of ignored files. Do not rewrite Git history for cleanup.

No merge, push or cleanup was performed. Hosted report changes were approved
and applied after the merge-preparation audit; Gemini remains disabled.
