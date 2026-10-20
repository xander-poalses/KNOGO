import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Disposable Postgres only. Network, Vault and Cron are stubs, not deployment proof.
if (!process.env.KNOGO_PGLITE_MODULE) throw new Error('Set KNOGO_PGLITE_MODULE to the installed PGlite module path.');
const { PGlite } = await import(pathToFileURL(process.env.KNOGO_PGLITE_MODULE).href);
const db = new PGlite();
const migration = async name => db.exec(await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8'));
try {
 await db.exec(`
  create role anon; create role authenticated; create role service_role;
  create schema auth; create table auth.users(id uuid primary key,created_at timestamptz default now()-interval '2 days',is_anonymous boolean default false);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
  grant usage on schema auth to anon,authenticated;
  create table public.places(id text primary key,is_active boolean default true);
  create table public.profiles(user_id uuid primary key,contribution_count integer default 0,updated_at timestamptz default now());
  create table public.confirmations(id uuid primary key default gen_random_uuid(),place_id text references public.places,user_id uuid references auth.users,confirmation_type text,value text,location_verified boolean,created_at timestamptz default now());
  create table public.live_statuses(place_id text primary key references public.places,is_open boolean,is_service_available boolean,accepts_walk_ins boolean,busy_level text default 'unknown',has_backup_power boolean,card_machine_working boolean,last_confirmed_at timestamptz,confidence_score integer default 0,source text default 'unknown',updated_at timestamptz default now());
  create table public.place_hours(place_id text,hours_type text,day_of_week text,open_time time,close_time time,is_closed boolean,sort_order integer);
  create schema net; create table net.http_request_queue(id bigserial primary key);
  create table net._http_response(id bigint primary key,created timestamptz default now(),status_code integer);
  create function net.http_post(url text,body jsonb default '{}',params jsonb default '{}',headers jsonb default '{}',timeout_milliseconds integer default 1000) returns bigint language sql as $$ insert into net.http_request_queue default values returning id $$;
  grant usage on schema net to anon,authenticated;
  grant select on net.http_request_queue,net._http_response to anon,authenticated;
  create schema vault; create table vault.decrypted_secrets(name text primary key,decrypted_secret text);
  create view vault.secrets as select name from vault.decrypted_secrets;
  create schema cron; create table cron.job(jobid bigserial primary key,jobname text unique,schedule text,command text,active boolean default true);
  create table cron.job_run_details(jobid bigint,end_time timestamptz);
  create function cron.schedule(text,text,text) returns bigint language sql as $$ insert into cron.job(jobname,schedule,command) values($1,$2,$3) on conflict(jobname) do update set schedule=$2,command=$3 returning jobid $$;
  create function cron.alter_job(job_id bigint,schedule text default null,command text default null,database text default null,username text default null,active boolean default null) returns void language sql as $$ update cron.job set active=coalesce($6,cron.job.active) where jobid=$1 $$;
 `);
 for (const file of ['008_closed_beta_reports.sql','009_report_advisor_fixes.sql','20260930123118_checkin_hardening.sql','20261001165604_trust_model_and_venue_claims.sql','20261009134250_report_assessment_receipts.sql','20261014093834_scoped_report_risk_claim.sql','20261019110050_report_review_notice.sql','20261019110152_report_risk_automation_queue.sql']) await migration(file);
 const schedulerSql=await readFile(new URL('../supabase/migrations/20261019110429_report_risk_scheduler_retention.sql',import.meta.url),'utf8');
 await db.exec(schedulerSql.replace(/^create extension[^;]+;/gm,''));
 await migration('20261019110641_report_review_receipt_status.sql');
 await migration('20261019112958_restrict_report_worker_transport.sql');
 const scalar=async sql=>Object.values((await db.query(sql)).rows[0])[0];
 const dispatch=()=>scalar('select knogo_private.dispatch_report_risk()');
 assert.equal(await dispatch(),null);
 assert.equal(await scalar('select count(*)::int from net.http_request_queue'),0);
 assert.equal(await scalar('select count(*)::int from cron.job'),2);
 assert.equal(await scalar('select count(*)::int from cron.job where active'),0,'Installation must not activate work');
 await db.exec(`insert into auth.users(id) values('00000000-0000-0000-0000-000000000001');
  insert into public.profiles(user_id,contribution_count) values('00000000-0000-0000-0000-000000000001',42);
  insert into public.places(id) values('automation-fixture');
  insert into knogo_private.report_review_notices(user_id,version,accepted_at) values('00000000-0000-0000-0000-000000000001','2026-10-19',now()-interval '2 days');
  update knogo_private.provider_limits set enabled=true,daily_limit=100,minute_limit=5 where provider='gemini';
  update knogo_private.report_automation set dispatch_enabled=true,retention_enabled=true;
 `);
 assert.equal(await dispatch(),null,'Idle must not dispatch');
 await db.exec(`insert into public.report_batches(id,place_id,user_id,report_source) values('10000000-0000-0000-0000-000000000001','automation-fixture','00000000-0000-0000-0000-000000000001','phone')`);
 assert.equal(await dispatch(),null,'No Vault entry must not dispatch');
 await db.exec("set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)");
 assert.equal((await scalar("select public.read_report_assessment('10000000-0000-0000-0000-000000000001')")).reason,'setup');
 await db.exec('reset role');
 await db.exec("insert into vault.decrypted_secrets values('knogo_risk_worker_secret','test-only-not-a-credential')");
 assert.equal(typeof await dispatch(),'number');
 assert.equal(await dispatch(),null,'Do not overlap dispatches');
 await db.exec("update knogo_private.report_automation set dispatched_at=now()-interval '3 minutes'; update knogo_private.provider_limits set enabled=false where provider='gemini'");
 assert.equal(await dispatch(),null,'Provider kill switch');
 await db.exec("update knogo_private.provider_limits set enabled=true,daily_limit=1 where provider='gemini'; select public.reserve_provider_call('gemini')");
 assert.equal(await dispatch(),null,'Spent quota must not enqueue HTTP');
 await db.exec('set role service_role');
 assert.equal(await scalar('select count(*)::int from public.claim_report_risk_job()'),0,'Quota must not acquire a lease');
 await db.exec('reset role');
 await db.exec("set role authenticated; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false)");
 const waiting=await scalar("select public.read_report_assessment('10000000-0000-0000-0000-000000000001')");
 assert.equal(waiting.state,'queued');assert.equal(waiting.reason,'quota');assert.ok(waiting.retryAt);
 assert.equal(await scalar("select public.read_report_assessment('99999999-0000-0000-0000-000000000001')"),null);
 await db.exec('reset role');
 await assert.rejects(db.exec("update knogo_private.report_automation set worker_url='http://example.com'"),/check constraint/);
 await db.exec('set role authenticated');
 await assert.rejects(db.query('select * from net.http_request_queue'),/permission denied/);
 await assert.rejects(dispatch(),/permission denied/);
 await assert.rejects(db.query('select knogo_private.purge_expired_reports()'),/permission denied/);
 await db.exec('reset role');
 await assert.rejects(db.query('select knogo_private.purge_expired_reports(0)'),/batch size/);
 // A fixed transaction clock makes the exact 24-hour boundary test meaningful.
 await db.exec(`begin;
  insert into public.report_batches(id,place_id,user_id,report_source,created_at) values
   ('20000000-0000-0000-0000-000000000001','automation-fixture','00000000-0000-0000-0000-000000000001','phone',now()-interval '24 hours 1 second'),
   ('20000000-0000-0000-0000-000000000002','automation-fixture','00000000-0000-0000-0000-000000000001','phone',now()-interval '24 hours'),
   ('20000000-0000-0000-0000-000000000003','automation-fixture','00000000-0000-0000-0000-000000000001','phone',now()-interval '23 hours 59 minutes'),
   ('20000000-0000-0000-0000-000000000004','automation-fixture','00000000-0000-0000-0000-000000000001','phone',now()+interval '1 hour');
  insert into public.confirmations(place_id,user_id,confirmation_type,value,report_batch_id,created_at)
   select place_id,user_id,'open_status','open',id,created_at from public.report_batches;
  insert into public.report_audit_log(report_batch_id,action) select id,'submitted' from public.report_batches;
  insert into knogo_private.report_risk_assessments(report_batch_id,risk,outcome) select id,'unknown','timeout' from public.report_batches;
  insert into knogo_private.trust_decisions(report_batch_id,states) select id,'{}' from public.report_batches;
  insert into public.confirmations(place_id,user_id,confirmation_type,value,created_at) values('automation-fixture','00000000-0000-0000-0000-000000000001','open_status','open',now()-interval '25 hours');
  update knogo_private.report_risk_jobs set state='leased',lease_id='30000000-0000-0000-0000-000000000001',lease_until=now()+interval '2 minutes' where report_id='20000000-0000-0000-0000-000000000001';
 `);
 assert.deepEqual(await scalar('select knogo_private.purge_expired_reports()'),{reports:1,legacyConfirmations:1});
 for(const [table,column] of [['public.confirmations','report_batch_id'],['public.report_audit_log','report_batch_id'],['knogo_private.report_risk_assessments','report_batch_id'],['knogo_private.report_risk_jobs','report_id'],['knogo_private.trust_decisions','report_batch_id']]) {
  assert.equal(await scalar(`select count(*)::int from ${table} where ${column}='20000000-0000-0000-0000-000000000001'`),0,table);
 }
 assert.equal(await scalar('select count(*)::int from public.report_batches'),4);
 assert.equal(await scalar('select contribution_count from public.profiles'),42);
 assert.deepEqual(await scalar('select knogo_private.purge_expired_reports()'),{reports:0,legacyConfirmations:0});
 assert.equal(await scalar("select public.finish_report_risk_job('20000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','low','{no_pattern_detected}','gemini-test','assessed')"),false);
 assert.equal(await scalar("select cardinality(reserved_at) from knogo_private.provider_call_windows where provider='gemini'"),1,'Cleanup must not reset quota');
 await db.exec("update knogo_private.report_automation set retention_enabled=false");
 assert.deepEqual(await scalar('select knogo_private.purge_expired_reports()'),{reports:0,legacyConfirmations:0});
 await db.exec('rollback');
 console.log('PASS: scheduler boundaries, inactive setup, quota/kill switches, retention cutoff/cascades/counters and stale completion. No network calls.');
} catch(error) { console.error(error.message);process.exitCode=1; }
finally { await db.close(); }
