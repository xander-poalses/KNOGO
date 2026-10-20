# Background Fuel Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Check DMPR publications once per South African day for everyone and show validated fuel references without blocking the app.

**Architecture:** A public Edge endpoint returns a shared snapshot and atomically claims the day's source check. A server background task downloads the government's ZIP, reads its Word price table and commits active/pending snapshots. Parsing uses code, not Gemini; the client keeps overrides and shows `Getting prices` only while no reference exists.

**Tech Stack:** Existing TypeScript, Supabase Postgres/Edge Functions, React Native and Vitest; server-only `fflate@0.8.3` for ZIP streaming and `@xmldom/xmldom@0.9.12` for XML. Pin server imports and lock resolution. No phone dependency or native rebuild for ingestion.

**Spec:** `docs/superpowers/specs/2026-10-19-background-fuel-prices-design.md`

**Execution status:** Implemented, reviewed and enabled on 19 October 2026. The original task checkboxes below preserve the plan; verified results and remaining device checks are in `2026-10-19-fuel-execution.md` and `docs/FUEL_DATA_SETUP.md`.

## Global Constraints

- No billing, subscriptions, trials, provider/model changes or Gemini requests.
- No report-review changes, secret reads, commits, pushes or worktree changes.
- One refresh claim per date in `Africa/Johannesburg`, shared across guests and accounts. No same-day retry or force bypass.
- Keep active and next snapshots plus one refresh-state row. No raw documents, daily archive or user data in fuel storage.
- Preserve overrides, consumption, grade and region. Fail closed when source structure or validity cannot be established.
- Activation remains off until source-use conditions and hosted checks pass.
- Existing dirty files belong to ongoing work. Read them before editing and retain their changes.

## Review Focus

- A future publication appears before its effective date: retain today's set and switch only at the published time. Task 2 tests this.
- A client keeps reading a cache: still request the server check on entry/foreground, without starting duplicate upstream work. Tasks 2 and 3 test this.
- Background work stops mid-run: stop the spinner after 90 seconds; do not create a same-day retry. Tasks 2 and 3 test this.
- A ZIP/XML changes shape or expands beyond its advertised size: abort before publishing or exhausting memory. Task 1 tests this.
- A region is absent: no substituted grade, zone, inferred amount or stale automatic price. Tasks 1 and 3 test this.

## Source Proof

Bounded HTTPS GET on 19 October 2026 returned 576,486 bytes from the DMPR download endpoint linked by its October index entry. The ZIP contains nine documents. The breakdown DOCX has six supported rows dated 07 October 2026; coastal diesel is absent. The XLSX uses zones, identifies petrol pump prices and diesel wholesale prices, and must not be treated as a broad-region mapping without more source evidence. Do not bundle this month's prices as defaults.

## Task 1: Download And Parse The Publication

Archive SHA-256 for the inspected download: `7443da1f8f54d6a975eadf025aef7dadbc8e9e856b1409ae03a1654c637637ea`. This is audit evidence, not a hard-coded allowlist for future publications.

**Files:** Create `supabase/functions/_shared/fuelPublication.ts`, `supabase/functions/_shared/fuelPublication.test.ts`; add a synthetic DOCX fixture through the tests, not a copied archive. Update `docs/FUEL_DATA_SETUP.md` with source access evidence.

**Interfaces:**
- `fetchFuelPublications(now: Date, fetcher: typeof fetch): Promise<FuelPublication[]>`
- `parseFuelBreakdown(xml: string, effectiveAt: string): FuelPublicationRow[]`
- `FuelPublicationRow = { grade: FuelGrade; region: FuelRegion; zarPerLitre: number; kind: 'retail_reference' | 'wholesale_reference' }`
- `FuelPublication = { effectiveAt: string; effectiveUntil: null; sourceUrl: string; hash: string; records: FuelPublicationRow[] }`
- Use type-only imports from the core trip module. Return the current publication and, if announced, the next one; at most two.

- [ ] Write failing Deno tests: six synthetic October rows parse to four petrol/two inland diesel references; 2988 cents becomes 29.88 rand; 0.05% maps to 500 ppm and 0.005% to 50 ppm. Paraffin/LPG are ignored. Missing coastal diesel stays absent.
- [ ] Add tests rejecting duplicate/partial supported tables, missing units, invalid dates, mixed publication dates, unexpected grade labels, external XML entities, DTDs and malformed XML. Require the index effective date to match every supported row.
- [ ] Add fetch tests for index changes, relative URLs, credential-bearing URLs, HTTP downgrade, unapproved redirect hosts, timeouts, oversized body, ZIP paths/duplicates/encryption, truncated archives and decompression bombs.
- [ ] Run the tests and confirm failure before adding parser code.
- [ ] Implement the functions using a DOM parser and streaming ZIP reader. Never evaluate workbook formulas, run macros, extract to disk or execute document text. Reject DTD/entity declarations and parser errors. Allow only the reviewed DMPR index, observed `bit.ly` expansion and DMPR download path with numeric parameters; validate each redirect, maximum three.
- [ ] Enforce 15 seconds per fetch, 60 seconds for source work, 2 MiB index, 10 MiB ZIP, 64 entries, 20 MiB total decompressed and 2 MiB per selected XML. Count emitted bytes, not only declared lengths. Read only the matching breakdown DOCX and its `word/document.xml`; hash that document. Fail if it is missing or duplicated. Parse date headings rather than hard-coding month names, item IDs or link positions.
- [ ] Rerun Deno tests with only fixture reads enabled. Perform one bounded source-only probe using the downloaded archive and assert six records; do not write prices to hosted storage. Record the archive/document hashes and extraction outcome, not raw documents or price defaults.

## Task 2: Shared Snapshot And Daily Claim

**Files:** Generate a migration named `background_fuel_prices` with the Supabase CLI; create `supabase/functions/fuel-prices/index.ts`, `supabase/functions/_shared/fuelPrices.ts`, `supabase/functions/_shared/fuelPrices.test.ts` and `scripts/fuel-prices-database-qa.mjs`. Update `supabase/config.toml` for the public endpoint.

**Interfaces:**
- `claim_fuel_price_refresh()` returns a server-issued attempt UUID or null; service role only.
- `finish_fuel_price_refresh(attempt_id uuid, publications jsonb, error_code text)` validates ownership and bounds, then commits or preserves previous snapshots; service role only.
- `read_fuel_price_snapshot()` returns `{version:2,currency:'ZAR',unit:'ZAR/litre',records,updateState:'idle'|'pending'|'failed',checkedAt}`; service role only, exposed to clients through the Edge endpoint, not a public privileged RPC.
- Every record uses the core field names plus wire `price` and `forecast:false`. `effectiveUntil` may be null. `checkedAt` is the last successful source check, never the client fetch time.
- GET `fuel-prices` reads only. POST with no payload reads and claims today's check. Neither accepts source URLs, dates, prices or force flags. Return pending plus the current snapshot before background work completes.

- [ ] Write SQL tests in a disposable PGlite database: concurrent claims yield one UUID; dates use SAST at 22:00 UTC; guests/authenticated roles cannot claim, finish or mutate state; stale UUIDs cannot finish another day's attempt; invalid publications fail without replacing prices.
- [ ] Test same-day failures, interrupted attempts and disabled state; no reclaims until next day. Assert one state row and at most two snapshots/16 price records after many days. Future publication must not overwrite active prices or be served early; time-based reads choose the pending set when due without another upstream call.
- [ ] Write Edge tests for GET-only polling, POST coalescing, invalid bodies/methods, no user identity requirement, unchanged document hash and background completion after the response. No claim may start two background tasks.
- [ ] Run both sets and confirm failure, then implement the migration and handler using existing server RPC/JSON response patterns and `EdgeRuntime.waitUntil`.
- [ ] Keep state in the private schema, RLS enabled, explicit role grants and empty search paths. No keys in responses or logs. Set server feature activation false by default. Select snapshots only if source check age is under 48 hours and any published expiry has not passed. An unsuccessful refresh cannot extend freshness. A pending attempt older than 90 seconds reads as failed but cannot be reclaimed that day.
- [ ] Validate all SQL finish inputs, amounts, source URL, enum pairs, timestamps, uniqueness and row limits independently of the parser. Replace bounded snapshots atomically. Reject a partial replacement when a previously supplied pair disappears unexpectedly.
- [ ] Run SQL QA, Deno tests/check and security advisors. Generate migration using CLI help, not an invented filename. Do not edit applied report migrations or expose `net` schema. Keep hosted activation separate from local verification.

## Task 3: Price Contract And Client State

**Files:** Modify `packages/core/src/trip.ts`, `packages/core/src/fuelFeed.ts`, `apps/mobile/src/fuelFeed.ts`, `apps/mobile/src/state/FuelContext.tsx`, `apps/mobile/src/components/TripPlanner.tsx`; update `src/utils/fuelFeed.test.ts`, `src/utils/trip.test.ts`, `apps/mobile/src/state/FuelContext.flow.tsx`, `apps/mobile/src/components/TripPlanner.flow.tsx` and any cache-version fixtures found by `rg`.

**Interfaces:**
- Change `FuelPriceRecord.effectiveUntil` to `string | null`; do not accept omitted or malformed expiry fields.
- Feed wire/cache version 2; `FuelFeedResult` gains `updateState: 'idle' | 'pending' | 'failed'`. Existing exported functions remain the entry points.
- `fuelFeed.load()` POSTs once per startup/foreground even with a usable device cache; `fuelFeed.poll()` GETs without upstream claims. Keep per-device in-flight coalescing. Use the existing configured Supabase URL/public key through its app adapter, never a service key. Keep legacy custom-feed configuration disabled rather than silently changing third-party HTTP semantics.
- `FuelContext` retains `pricesLoading`, preferences, save and refresh contracts. A refresh cannot overwrite preference fields.

- [ ] Write failing core tests for version 2, null expiry, strict timestamps, 48-hour source freshness, future dates, rejected version-1 cache, manual override precedence, no cache timestamp extension, empty pending snapshots and invalid record rejection.
- [ ] Write failing mobile tests: mount and active foreground trigger once, cached reference remains visible, GET polling stops after completion/failure/90 seconds/background/unmount, concurrent callers do not clear loading early, failed refresh preserves an in-date price, and rejected promises do not leave loading stuck.
- [ ] Write TripPlanner tests for `Getting prices` only with no reference and a pending fetch; `Price unavailable` after failure; no loading label when a manual price exists; distance calculations work without price. Nullable expiry shows source-check/effective dates without inventing an end date. Diesel retains wholesale warning.
- [ ] Run these tests and confirm failure, then implement only the contract/state/UI changes above. Poll every five seconds while a price consumer is visible and the app is active, at most 90 seconds; remove timers/listeners on cleanup. Use the existing source-details surface for attribution and dates, not extra explanatory UI.
- [ ] Rerun core/mobile tests and both TypeScript checks. Read TripPlanner's current dirty contents before editing; retain route and layout work from other changes.

## Task 4: Source-Use Gate And Hosted Proof

**Files:** Update `docs/FUEL_DATA_SETUP.md`, `docs/FUEL_AND_VENUE_QA.md` and `docs/OPERATIONS.md` with configuration, limits, attribution and recovery instructions.

- [ ] Review the DMPR terms against the downloaded material's ownership. Record whether this non-commercial test use, attribution and device caching are covered. If third-party rights or scope remain unresolved, leave activation off and tell the user what is needed. No Gemini transmission is planned.
- [ ] Run root/mobile tests, TypeScript checks, source-parser tests, disposable SQL QA and code review. Fix findings; do not commit or push unrelated files.
- [ ] Only after the gate passes, deploy the fuel migration/function and enable the feature for this test release. Keep billing off. Check role boundaries and source access from the hosted runtime, not just this PC.
- [ ] Open from two clients/accounts: prove one server attempt, close the triggering app, then verify the shared snapshot finishes. Verify effective dates/amounts against the retrieved table and verify that no Gemini quota was consumed.
- [ ] Check `Getting prices`, retained price while checking, manual entry and both colour modes on Android/browser. Report separately which device checks need the user; no claim that browser tests prove Android rendering.
- [ ] Document remaining source outage/layout risks and the no-same-day-retry trade-off. Mark implementation complete only when the hosted path works; local mocks are not hosted proof.

## Review Gate

Verification commands (use the installed Deno executable when it is not on PATH):

```powershell
deno test supabase/functions/_shared/fuelPublication.test.ts supabase/functions/_shared/fuelPrices.test.ts
deno check supabase/functions/fuel-prices/index.ts
node scripts/fuel-prices-database-qa.mjs
node node_modules/vitest/vitest.mjs run
node node_modules/vitest/vitest.mjs run --config vitest.mobile.config.ts
node node_modules/typescript/bin/tsc -b
node packages/core/node_modules/typescript/bin/tsc --noEmit -p packages/core/tsconfig.json
node apps/mobile/node_modules/typescript/bin/tsc --noEmit -p apps/mobile/tsconfig.json
```

Expected: every command exits 0, tests pass, no type errors. The SQL harness uses the existing PGlite runtime via `KNOGO_PGLITE_MODULE`, never the hosted database. Add network/read permissions only to the separate source probe, not to fixture-only Deno tests.

User approved execution. Implementation ran inline with one final reviewer. Source, hosted background work, daily lock, price values, core client parsing and trip calculation are verified; see the execution ledger for tests and device checks still to do.
