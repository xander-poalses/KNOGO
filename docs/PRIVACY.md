# KNOGO Privacy Notice

KNOGO stores account email addresses, saved places and submitted community reports so the service can work. Reports include the selected place, answers, check method, time and an online source link when supplied.

The tester build offers Skip sign-in. This creates a guest account ID and session without asking for an email or password. Guest reports share the same database, retention rules and review process as other reports. Signing out, clearing app data or reinstalling can lose access to the guest identity. Settings shows the guest ID for support and deletion requests. Creating or signing into an email account does not transfer guest reports to it.

On 23 October 2026, Gemini processing was paused while the Google billing tier is unverified. Reports can still be stored; automated assessments remain queued. The database caps remain in place. Re-enable processing only after checking the project's Free tier status in Google AI Studio.

## Report Review And Retention

The reporting release is for testers aged 18 or over. Before reporting, each account must acknowledge notice version `2026-10-19`. KNOGO stores its version and acceptance time, not a date of birth. This is an acknowledgement, not age verification.

After deployment and activation, Gemini reviews report patterns across eligible accounts and places. It does not decide whether a report is true or whether a place is open. Reports submitted before acknowledgement are not released to Google when an account accepts later.

The server sends selected enum answers, check methods, request-scoped aliases and five-minute time offsets. It excludes account/place IDs, names, email addresses, addresses, GPS, source links, profiles and free text. Context is capped at 100 reports and 20,000 ASCII characters. Google may use inputs and outputs from its unpaid service to improve its products, with human review. Do not put personal, sensitive or confidential information in reports. Google's processing and retention are separate from KNOGO's cleanup; see [Gemini terms](https://ai.google.dev/gemini-api/terms).

Live evidence and review work stop after four hours. Hourly cleanup removes report batches older than 24 hours, their answers, review records, queue jobs and report logs in bounded batches. A row can remain until the next cleanup run, or longer during an outage/backlog. Account contribution counters remain; KNOGO does not keep a report-history cache in the profile or calculate a trust score.

Deployment checkpoint, 19 October 2026: hosted processing and retention are active. Scheduled review completed for three reports across two accounts and three places. Scheduled cleanup removed the eight batches past the retention threshold; profile contribution counters were preserved. Android receipt/layout proof remains a separate check.

With consent, KNOGO sends crash details to Sentry and action counts to PostHog. KNOGO does not send email addresses, search text, coordinates, report answers or source links to these services. Session replay and automatic text capture are disabled.

Users may sign out in Settings. Account deletion and data correction requests are handled through the support contact configured in the app. This notice must be reviewed and published at a public URL before testing begins.
