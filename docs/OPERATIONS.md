# KNOGO Data And Report Operations

## Place Data

- Review each active place source at least every 90 days.
- Import changes as inactive records, review the generated report, then activate them.
- Deactivate a closed or unverified place instead of deleting it.
- Record source links and check dates in the import batch.
- Do not publish copied photos without permission.

## Community Reports

- Two accounts must match within four hours before status changes.
- A conflicting report leaves the public status unchanged.
- Community status expires after four hours in the public status view.
- Limit one report per account and place every 15 minutes and 30 report batches per day.
- Block an account in `blocked_contributors` when abuse is confirmed and record the reason.
- Do not edit report history during a dispute. Record any operator action in the incident notes.

## Incidents

- Freeze reports by revoking RPC execute access when report integrity is at risk.
- Check Supabase Auth, API and Postgres logs, then Sentry errors for the matching release.
- Correct wrong place data through a reviewed import batch.
- Tell testers what changed when an incident affects visible status.
