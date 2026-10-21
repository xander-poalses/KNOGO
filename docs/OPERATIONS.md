# KNOGO Data And Report Operations

## Fuel Prices

`fuel-prices` is a public reference-data Edge endpoint. POST with no body requests the shared daily check; GET reads only. Private RPCs and writes are service-role only. `knogo_private.fuel_prices` holds one row: enabled flag, attempt/check timestamps, error enum and at most two snapshots. No secrets, user details or raw documents are stored there. Never log service keys.

Activation is the singleton's `enabled` flag. Set it false to stop source work and serving reference amounts; manual entries still work. Do not reset `attempt_day` or rotate `attempt_id` to force retries. A failed run waits for the next SAST day. Read `attempt_day`, `attempted_at`, `checked_at` and `error_code` to diagnose, not provider secrets. Source work uses no Gemini or paid API. Public requests still consume Supabase's hosting quota.

Reference freshness is 48 hours from a successful source check. A published replacement expires its predecessor at the replacement's effective time. A failed check never extends either date. No expiry is inferred from a monthly calendar. Review source terms before a commercial release or changing the source document. Setup is in the [README](../README.md#fuel-price-service).

## Place Data

- Review each active place source at least every 90 days.
- Import changes as inactive records, review the generated report, then activate them.
- Deactivate a closed or unverified place instead of deleting it.
- Record source links and check dates in the import batch.
- Do not publish copied photos without permission.

## Community Reports

- Keep the trust thresholds in the database; Gemini does not establish truth. See `COMMUNITY_RULES.md` for the closure conditions.
- Opposing usable reports produce a disagreement, not an operator-selected winner.
- Community status expires after four hours in the public status view.
- Limit one report per account and place every 15 minutes and 30 report batches per day.
- Block an account in `blocked_contributors` when abuse is confirmed and record the reason.
- Do not edit report history during a dispute. Record any operator action in the incident notes.

## Report Automation

19 October deployment record: report-risk version 15, minute dispatch and hourly retention at minute 36. Three reports across two accounts and three places completed through Cron. First cleanup succeeded at 13:36 SAST, with contribution counters preserved. This is a dated record, not a fresh deployment check. Follow the [README](../README.md#report-worker) for setup.

- Minute job: `knogo-report-risk`, calling `knogo_private.dispatch_report_risk()` only when eligible work and quota exist.
- Hourly job: `knogo-report-retention`, calling `knogo_private.purge_expired_reports()` with a 500-row batch per detail family.
- Switches: singleton `knogo_private.report_automation.dispatch_enabled` and `retention_enabled`, both false on installation.
- Stop Gemini by setting dispatch and the Gemini provider row to disabled. Keep retention enabled; submission remains available.
- Set Gemini caps to the approved 100 per rolling 25 hours/UTC day and five per rolling minute only at activation. Other apps/keys in the Google project share its allowance.
- Monitor singleton `last_state`, queue counts by state/outcome, Cron success counts, and pg_net status codes. Do not dump request headers, Vault values, report contents or provider transcripts.
- Quota/configuration waits do not append assessment rows or consume attempts. Actual failures stop after three attempts or four hours.
- Cleanup removes batches strictly older than 24 hours and cascades answers, audit logs, jobs, assessments and trust decisions. Legacy confirmations use the same cutoff. Profiles, places, hours and venue access are not cleanup targets.
- Check eligible row counts and profile counters before activation and after the first run. Deletion frees space for reuse; it does not guarantee a smaller database file on disk.
- Hosted pg_net grants are managed and remain readable to SQL login roles. Keep `net` outside the Data API; the verified app request returned 406/PGRST106. Do not interpret a successful REVOKE migration as a changed grant. Never dump queued headers through tools.
- Keep rolling reservation timestamps for 25 hours, usage-day counters for three UTC days and these jobs' completed Cron history for 24 hours. Confirm pg_net response TTL and queue grants before activation.

## Incidents

- Freeze reports by revoking RPC execute access when report integrity is at risk.
- Check Supabase Auth, API and Postgres logs, then Sentry errors for the matching release.
- Correct wrong place data through a reviewed import batch.
- Tell testers what changed when an incident affects visible status.
