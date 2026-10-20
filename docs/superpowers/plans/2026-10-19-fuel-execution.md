# Fuel Execution

Plan: `2026-10-19-background-fuel-prices.md`. User approved implementation and activation for the non-commercial test app. No commits or worktrees requested.

- Task 1: source parser tests passed (5); source probe extracted six records from the current government ZIP. No model request.
- Task 2: disposable SQL QA and three Edge request/background tests passed. Hosted migration `20261019202911_background_fuel_prices` and function version 1 deployed, enabled and verified.
- Task 3: feed/calculation tests passed (20), FuelContext/TripPlanner tests passed (34), final full mobile suite passed (509), root suite passed (306); mobile/core/root TypeScript passed. Root suite initially caught Deno tests; now separated by runtime in config.
- Task 4: source-use basis documented for non-commercial tests; one final review completed and both findings fixed with regressions. Hosted run completed in about three seconds, six rows matched, repeated requests shared the same day/attempt, core client accepted hosted response. Android and next-day device proof remain, not blockers to the enabled server feature.

Ruling: use code-only Word-table parsing, not Gemini. The downloaded publication has a table; no model, secret or quota change is required. A changed layout stops the refresh rather than guessing prices.

Ruling: the live DOCX has several sections in one Word table, while the first fixture had separate tables. Parser and regression cover both without relaxing pair/date validation.

Ruling: public prices use a guest Edge endpoint (`verify_jwt=false`), with no personal data or client writes. Database claim/finish/read RPCs are service-role only. One database claim limits upstream work even if clients repeat POST. Public traffic still consumes hosting request quota.

Ruling: use a single lock row with bounded JSON snapshots rather than separate tables. Function grants/RLS enforce the same boundary with fewer objects. No migrations affecting reports were changed.

Final review: two findings accepted. Added failing regressions for published replacement expiry in the cached wire snapshot and for source-freshness invalidation while a price surface remains open. SQL now derives expiry from the next published effective date; the provider invalidates and reads the shared snapshot at expiry. No invented monthly expiry.

Ruling: the migration file was generated with the CLI, then renamed to the exact hosted migration version returned by Supabase so future migration history matches. SQL behaviour was not changed after applying it (only a comment was added).

Ruling: no saved browser fuel preferences or tester accounts were changed for proof. The core client used memory-only inputs against the hosted endpoint. Cost if wrong: device-specific rendering/network issues can still require a phone check.

Deferred: no commercial rights claim, coastal diesel inference, fallback provider, model parser or monitoring dashboard. Existing report/auth advisor findings were not changed. No commits/pushes and no deletion of the dirty checkout's work.
