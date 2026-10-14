# Report-risk queue setup

This is a setup guide, not a deployment. No scheduler, secrets or Gemini access have been enabled by this work. Do not run setup against the hosted project until deployment is authorised and the account/free-tier review in `TRUST_TRIP_PROVIDERS.md` is complete.

## Hosted Checkpoint: 11 October 2026

The user approved hosted report migrations and worker deployment with Gemini
disabled. Applied checkin_hardening (20261011214152), trust_model_and_venue_claims
(20261011214204) and report_assessment_receipts (20261011214216) to KNOGO
ivzofixdjcgkwalfzmmy. report-risk version 1 is ACTIVE. This checkpoint supersedes
the initial undeployed state above; it does not authorise provider activation.

The Gemini database gate remains false, with caps of 50/day and 5/minute.
Missing and incorrect worker credentials returned 401. No worker invocation
with credentials, Gemini call, scheduler or venue-code delivery was configured
or demonstrated. The worker authenticates its own bearer secret; gateway JWT
verification is off for this service-to-service handler, not for app sign-in.

Private tables have RLS and app roles have no schema access or worker-RPC
execution privileges. The receipt RPC is signed-in and author-only. Guest
status reads returned 61 active places. Counts before and after deployment:
66 places, zero accounts, zero reports and zero confirmations. No deletions
were performed. Trip caps remained 100/day and 10/minute, enabled.

Security advisor findings were reviewed: no-policy RLS on private tables is
default-deny, and the callable SECURITY DEFINER read/write RPCs are intentional
API boundaries with access checks. These notices are not a claim of no security
risk. See [private-table policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy),
[guest RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
and [signed-in RPCs](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

## Behaviour

Test preparation on 12 October deployed report-risk version 2, still disabled.
Enabled tests now require a server-held RISK_TEST_ACTOR_ID; mixed-account
context is rejected before Google access. See [Gemini test](GEMINI_TEST.md)
for secret setup, queue isolation and the approval gates. This test scope is
not a production data-handling policy or approval to use user reports.

- A report-batch insert enqueues a job in the same transaction. Rollback also rolls back the job. Community browsing and reporting do not wait for Gemini.
- Each worker claims one job at a time using `FOR UPDATE SKIP LOCKED`. The lease lasts two minutes. Each invocation handles at most three jobs.
- Finishing requires the lease ID. Recording the assessment and releasing or completing the job happen in one transaction. A stale or duplicate finish cannot write an assessment.
- A crash leaves a lease that another invocation may claim after expiry. A report gets at most three attempts. Disabled access and quota use a 15-minute delay. Other failures use 30 seconds after attempt one and 120 seconds after attempt two.
- Jobs stop after three attempts or four hours. Failure outcomes record unknown risk. They do not approve a negative claim or require daily owner review.
- Context includes the target report and up to 99 other recent reports across accounts and venues. The target and account/venue identifiers are HMAC pseudonyms before transmission. Blocked accounts and timestamps from the future are excluded.
- Queue rows and assessment controls are not available to app users. The worker response contains counts, not report content, account IDs or source URLs.

## One-time server setup

1. Confirm the Gemini project's free allowance, no billing, terms and data handling. Set day and rolling-minute limits below that account's limits. Keep provider enablement false until this is done.
2. When deployment is authorised, apply the pending trust migration and deploy `report-risk`. Set `GEMNINI_API_KEY` (the user's saved spelling), `GEMINI_RISK_MODEL`, `GEMINI_FREE_TIER_CONFIRMED`, `RISK_PSEUDONYM_SECRET` and `RISK_WORKER_SECRET` as server secrets. Never put these in Expo variables.
3. The endpoint uses its own worker-secret check. Configure its gateway for that authentication scheme, rather than trying to use the worker secret as a Supabase user JWT. A mobile token must not authorise it.
4. Enable `pg_cron` and `pg_net`, then use Vault for the function URL and worker secret. Check the project's Edge invocation allowance before scheduling. Each non-idle minute may cause one invocation; the database should skip invocation when no jobs are due.
5. Create a minute scheduler using the template below. The template is not included in a migration and has not been executed. It follows the [Supabase scheduling guide](https://supabase.com/docs/guides/functions/schedule-functions).

Vault names used by this template are `knogo_risk_function_url` and `knogo_risk_worker_secret`. Store the function URL and worker secret through the dashboard. Do not paste secrets into a shared SQL file or chat.

```sql
select cron.schedule('knogo-report-risk', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name='knogo_risk_function_url'),
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='knogo_risk_worker_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 140000
  )
  where exists (
    select 1 from knogo_private.report_risk_jobs
    where state in ('waiting','leased') and available_at<=now()
      and (lease_until is null or lease_until<=now())
  );
$job$);
```

## Verification after deployment

Use a non-production report and check that submission creates one job. An anonymous or signed-in app user must not claim/finish a job. A request without the worker secret must return 401. A worker call with `{}` should record an assessment or an unknown-risk failure. Retry after a lease timeout, then check that an old lease cannot finish. Confirm limits, expiry and disagreement still come from application rules.

These checks have run in the in-memory database and worker unit tests, not against the hosted project. Deno checks pass for the risk and trip Edge Functions. Live scheduler delivery, free-tier usage and provider responses remain unverified.

## Operation without daily review

Cron attempts due jobs. Transient failures retry within the ceilings above; remaining failures become uncertainty and diagnostics. No owner approval queue is needed for individual reports. Monitor service health and spend guards during release checks. Do not retry exhausted jobs without a new configuration/incident decision.

To stop assessment without stopping community reports, set the `gemini` provider limit row to disabled and unschedule `knogo-report-risk`. No reports need to be deleted.
