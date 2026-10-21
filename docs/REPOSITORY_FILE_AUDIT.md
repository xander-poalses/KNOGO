# Repository File Audit

This file records review history. Retention recommendations below describe the
initial review unless a cleanup section says otherwise. Setup now lives in
[README.md](../README.md#get-started), not in separate guides or handoffs.

Date: 21 October 2026  
Scope: all 617 files tracked by Git when the initial review started, plus the top-level local-output folders. This report and its CSV were added after that starting count. The Markdown cleanup below records the subsequent deletions.

## Decision

There are **seven removal candidates** and **two generated files to stop tracking**. Together they account for about 1.15 MB in the working tree. There are also media, concept artwork and agent-tool files that can be archived, depending on what you want the GitHub repository to contain.

The initial review deleted no files. The first Markdown cleanup removed eight files. The second cleanup removed 26 Markdown files and 17 coursework-evidence files at the user's request. No app code, configuration, database records, commit, push or history rewrite was part of these cleanups.

The [file-by-file inventory](REPOSITORY_FILE_INVENTORY.csv) retains one row for each of the initial 617 files: path, byte count at review, recommendation and reason. Deletions are marked Removed Markdown or Removed Evidence. It is a review record, not a live filesystem listing. Paths in this report are relative to the repository root.

## Setup And Evidence Cleanup

At the user's request, the second pass removed both KNOGO handoffs, the mobile
README, the combined coursework brief, service setup guides, implementation
and provider histories, coursework logs, QA notes and all 17 files under
docs/evidence. This includes screenshots and the milestone board, not the
mockups and code-excerpt images embedded by the README.

Build, authentication, report worker, trip, fuel and venue setup were moved
into the root README before deletion. Operations and backlog references were
updated. The original PDF briefs remain unchanged. Catalogue research and
import provenance are separate from coursework evidence and remain in place.

After both passes, 90 of the original 124 Markdown files remain. The CSV marks
34 Markdown deletions and 17 evidence deletions. These are documentation and
evidence changes, not permission to reset a database or change a release.

## Markdown Cleanup

On 21 October, the user requested removal of unused Markdown files. Removed:

- `docs/PLACE_TRIP_FLOW_QA.md`
- `docs/TASK_FLOW_RECHECK.md`
- `docs/superpowers/plans/2026-10-19-background-fuel-prices.md`
- `docs/superpowers/plans/2026-10-19-fuel-execution.md`
- `docs/superpowers/plans/2026-10-19-report-automation-and-retention.md`
- `docs/superpowers/plans/2026-10-19-report-automation-execution.md`
- `docs/superpowers/specs/2026-10-19-background-fuel-prices-design.md`
- `docs/superpowers/specs/2026-10-19-report-automation-and-retention-design.md`

These plans, specifications and flow notes had no references from retained readers outside the audit inventory. Their current guidance is covered by KNOGO_PROJECT_HANDOFF.md, FUEL_DATA_SETUP.md, RISK_QUEUE_SETUP.md and OPERATIONS.md. Pending device checks and report-policy limits remain documented there.

Retained setup, policy, design, backlog, coursework, catalogue-provenance and installed skill documents. Documentation does not need a code import to be in use. Markdown count changed from 124 to 116. Application code, configuration, databases and assets were not changed.

## How Files Were Checked

- Enumerated the Git index, not the dependency tree under node_modules.
- Read manifests, workspace configuration, build/test configuration, route layout and ignore rules.
- Scanned source imports, exports, literal require/import paths and asset references.
- Checked documentation references for proposed artwork and attachment removals.
- Compared file hashes for copies with identical contents.
- Distinguished code imports from file-based routes, platform variants, test discovery, deployment entries and manual scripts.
- Reviewed local folders separately from what GitHub receives.

This is a repository-retention review, not a proof that every export is reached at runtime. Dynamic paths, provider dashboards and coursework requirements can create uses outside the source graph. A file without an importer is not automatically unused.

## Remove Candidates

| Path | Evidence | Removal boundary |
| --- | --- | --- |
| `apps/mobile/assets/home/home-bottom.jpg` | No reference in tracked source or configuration; 253,172 bytes | Current Home uses community-meerkats.png instead |
| `apps/mobile/assets/home/home-bottom.png` | No reference in tracked source or configuration; 773,252 bytes | Same boundary as the JPG; archive if the artwork is wanted |
| `src/components/Badges/ConfidenceBadge.tsx` | No importer; 360 bytes | Remove this component, not Badges.module.css, which StatusBadge uses |
| `src/data/areas.ts` | No importer; 48 bytes; re-exports core areas | Remove the Vite wrapper, not packages/core/src/data/areas.ts |
| `.codex-remote-attachments/**/1-6389.jpg` | Attachment, no application reference; 47,335 bytes | Retain outside the repo if still wanted as evidence |
| `.codex-remote-attachments/**/1-6367.jpg` | Attachment, no application reference; 26,350 bytes | Same boundary |
| `.codex-remote-attachments/**/1-6369.jpg` | 50,290 bytes; hash-identical to docs/evidence/gemini-review-android-2026-10-14.jpg | Keep the evidence copy and remove the attachment copy |

The CSV records the attachment paths without wildcards. The attachments folder is tracked and is not covered by the current root ignore rules. A later cleanup should ignore it and stop tracking the chosen files, while preserving any local copies the user wants.

No other mobile source module was identified as a file-level removal candidate by the reference scan. This does not mean every function or style is used.

## Stop Tracking Generated Files

| Path | Why | Required follow-through |
| --- | --- | --- |
| `vite.config.js` | JavaScript emitted from vite.config.ts | Keep the TypeScript source; account for Vite's config discovery and regeneration |
| `vite.config.d.ts` | Declaration emitted from the same source | Keep tsconfig.node.json and its build role |

`tsconfig.node.json` includes vite.config.ts and can emit beside it. Removing these files without ignore/output handling allows them to return after a build. Vite can also load the JS config, so do not describe that file as having no effect while it remains present. Verify the testing interface after removing it.

These changes were not made as part of the review. They belong in the deletion pass after approval.

## Optional Archives

These are not app dependencies. They still carry design, process or coursework value.

| Paths | Footprint | Recommendation |
| --- | --- | --- |
| `knogo-app-icon-arrow-concept.png`, `knogo-app-icon-concept.png` | 2,373,088 bytes | Archive outside the code repo if the concepts are no longer needed; app.json uses assets under apps/mobile/assets |
| `KNOGO-style-tile.txt` | 1,655 bytes | Consolidate into DESIGN.md or the project handoff before removing |
| `docs/media/knogo-launch-59s.mp4`, `docs/media/knogo-promo-poster.png` | 7,292,531 bytes | Not referenced by the README or tracked application code; keep elsewhere if required for submission/promotion |
| `.agents/` and `skills-lock.json` | 41 files, 76,456 bytes | Optional for running the app, but currently supply agent guidance; remove together only if that guidance is no longer wanted in GitHub |
| `MyProblems.txt` | Historical issue log | Reconcile outstanding items and update its references before archiving |
| `briefs/`, `Contextual Info/` | Four files, about 3.50 MB | Keep for coursework unless submission requirements allow moving them; check permission to redistribute lecturer briefs |

The two icon concepts and unreferenced promo media alone account for about 9.67 MB. These are optional archives, not proof that they have no value.

`TODO.md` should stay but needs reconciliation. For example, it still describes a two-account consensus and older deployment gates, while the current code and later notes describe different trust rules. Deleting the backlog would hide work rather than resolve it.

## Keep These Files

| Area | Reason |
| --- | --- |
| `apps/mobile/app/` | Expo Router entry points are discovered by filename; they need not have importers |
| `apps/mobile/src/` | App implementation, except no source-file removal was established here |
| `*.native.ts`, `*.native.tsx` and default counterparts | Platform resolution selects different implementations; they are not duplicate files |
| `.flow.tsx`, `.test.ts`, `.test.tsx`, `.test.js`, test setup and test config | Test-runner inputs; absence from app imports is expected |
| `packages/core/` | Shared product rules, API contracts, validation, trust, data and calculations |
| `src/`, `public/`, `index.html`, Vite source config | Retain the Vite testing tool, minus the two unused wrappers listed above |
| `supabase/migrations/` | Deployment history and reproducibility; applied migrations are not disposable |
| `supabase/functions/` and deno.lock | Deployment entries and dependencies; handlers need not be imported by the app |
| `supabase/seed*.sql` | Database setup and local test fixtures, with ordering constraints |
| `data/place-imports/` | Catalogue sources, input formats, generated SQL, source evidence and before/after checks |
| `data/place-audits/`, `data/logo-audit/` | Catalogue provenance; not app code but evidence for published records |
| `scripts/` | Import, database QA and operational tools; some are invoked manually |
| `patches/expo-router@57.0.19.patch` | Referenced by pnpm-workspace.yaml and needed for the current router patch |
| Package manifests, pnpm lock/workspace files, TypeScript configs | Dependency resolution and build/test behaviour |
| `.env*.example` | Configuration templates, not credentials |
| `DESIGN.md`, current handoff, privacy/rules/setup/operations notes | Product and maintenance contracts |
| `docs/media/KnogoMockup1.png` through `KnogoMockup4.png` | Embedded by the README |
| Code-excerpt images under `docs/media/` | Embedded by the README; line-number filenames are historical captures |
| `docs/evidence/` | Coursework and test evidence; several documents link to it |

There are duplicate CSV headers and ID lists in import batches. Their location is part of each batch's input contract. Do not delete a batch's file merely because its hash matches another batch or the template.

The Vite tests also exercise core and backend rules. Removing all of src because KNOGO is a mobile app would remove test coverage as well as the testing interface. Retiring that harness would need a test migration, scripts/config changes and asset review.

## Local Files That Are Not Going to GitHub

The following were present locally but not tracked as repo content:

| Area | GitHub impact | Local cleanup caution |
| --- | --- | --- |
| `node_modules/`, pnpm store folders | Already excluded by ignore rules | Reinstallable, but removal affects local development and may affect other projects sharing a store |
| `dist/`, `dist-hardening/` | Already excluded | Rebuildable test/build output |
| `.expo/`, mobile Expo cache and generated expo-env.d.ts | Excluded | Regenerated by Expo; do not hand-edit generated directives |
| `.codex-artifacts/` | Already excluded | Includes build output; native rebuilding may need it recreated |
| `.codex-finalizer/`, `.firecrawl/` | Already excluded | Local tool state/research, not app runtime |
| `output/` | Already excluded | Contains APKs, screenshots and work output; preserve anything needed to install or prove a build |
| `knogo-dev.err.log`, `knogo-dev.out.log` | Already excluded by *.log | Diagnostic history, not a runtime input |
| `state/` | Empty and untracked | No file cleanup needed; Git does not store an empty folder |
| `.env.local` and other environment credentials | Excluded | Keep the device/backend setup intact; never delete credentials as routine cleanup |
| Generated mobile android/ios projects | Ignored by root rules | Local native edits/builds may exist; regeneration can lose changes |

The review did not recursively inspect dependencies, Git internals, credentials or every ignored build artefact. Those are not candidates for source-repository pruning.

No APKs, node_modules files or local environment credential files were found in the tracked-file list. This is not a secret-history audit.

## GitHub Size and History

The tracked working-tree files total about 35.26 MB after the comment/README edits. This is not the compressed Git repository size.

Deleting a tracked file removes it from a future commit, not from earlier Git history. It will not necessarily make an existing clone smaller. Removing history is a separate action that can affect collaborators; no history rewrite is proposed here.

For media that needs to remain available but not inside the code tree, consider release assets or a project evidence archive. Do not move README images without updating the embeds.

## Comment and README Changes in This Pass

- Removed 156 prose comments from 104 code/SQL/build files and replaced them with section headings at code boundaries.
- Retained five compiler, test or editor directives, including TypeScript references, ts-expect-error, Vitest environment and deprecated metadata. They are not decoration.
- Left dependency patches, third-party skill material, captured source pages and generated native/dependency files intact.
- Retained generated SQL header strings in the importer because they are already section headings; runtime string values were not changed.
- Replaced the root ignore-file prose comments with headings and removed a Hallmark HTML comment from DESIGN.md.
- Updated the root README to identify KNOGO as a mobile app. Removed Expo browser-use instructions and described Vite as a testing interface.
- Removed the browser-map setup paragraph from the mobile README. No web code or provider configuration was removed.

Safety context remains in project documentation rather than prose code comments:

- Milestone fixtures are local-only. Do not apply them to a hosted production database.
- Seed ordering is documented; db reset alone does not reconstruct the catalogue.
- Location-region inference covers the implemented Pretoria bounds, not the whole country.
- Provider failure must not block manual price entry or discard drafts.
- Keep session/account ordering, cancellation, telemetry filtering and permission checks intact.
- The comment cleanup changes no validation, trust, auth or database statements.

## Verification

- Before edits: 327 root tests and 541 mobile tests passed.
- After comment/README edits: the same 327 root tests and 541 mobile tests passed.
- Mobile, core and Vite application TypeScript checks passed.
- Source comparison checked that comment/header changes preserved executable code; SQL comparison excluded only comment lines.
- Git whitespace validation passed.

The test runs still print the existing React act, pointerEvents and React Router warnings seen before this work. No device build, physical-device check, hosted database test, provider call or Git-history secret scan was run. The SQL QA harness needs its separately configured PGlite module; no database was changed for this audit.

## Proposed Next Pass

1. Approve the seven removal candidates and generated-file handling.
2. Remove/untrack those paths and add the matching ignore rules.
3. Choose which optional artwork, media and process history to archive.
4. Update references for anything moved, then rerun tests, type checks and a Vite build.

Do not combine that pass with trust-policy changes, backend cleanup or an app release.
