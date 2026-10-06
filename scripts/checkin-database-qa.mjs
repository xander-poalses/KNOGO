import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

// Run against an in-memory Postgres instance, never against the hosted project.
if (!process.env.KNOGO_PGLITE_MODULE) throw new Error('Set KNOGO_PGLITE_MODULE to the installed PGlite module path.');
const { PGlite } = await import(pathToFileURL(process.env.KNOGO_PGLITE_MODULE).href);
const db = new PGlite();
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create table public.places(id text primary key, is_active boolean default true);
    create table public.profiles(user_id uuid primary key, contribution_count integer default 0, updated_at timestamptz default now());
    create table public.confirmations(id uuid primary key default gen_random_uuid(), place_id text references public.places,
      user_id uuid references auth.users, confirmation_type text, value text, location_verified boolean, created_at timestamptz default now());
    alter table public.confirmations enable row level security;
    create table public.live_statuses(place_id text primary key references public.places, is_open boolean, is_service_available boolean,
      accepts_walk_ins boolean, busy_level text default 'unknown', has_backup_power boolean, card_machine_working boolean,
      last_confirmed_at timestamptz, confidence_score integer default 0, source text default 'unknown', updated_at timestamptz default now());
    alter table public.live_statuses enable row level security;
    create policy status_read on public.live_statuses for select using (true);
    grant select on public.live_statuses to anon, authenticated;
    create table public.place_hours(place_id text, hours_type text, day_of_week text, open_time time, close_time time, is_closed boolean, sort_order integer);
    insert into auth.users values ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
    insert into public.places(id) values ('agreement'),('conflict'),('expiry'),('validation');
  `);
  for (const file of ['008_closed_beta_reports.sql', '009_report_advisor_fixes.sql', '20260930123118_checkin_hardening.sql']) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8'));
  }
  await db.exec(await readFile(new URL('../supabase/migrations/20260930123118_checkin_hardening.sql', import.meta.url), 'utf8'));
  const login = (user) => db.query("select set_config('request.jwt.claim.sub', $1, false)", [`00000000-0000-0000-0000-00000000000${user}`]);
  const report = async (place, value, type = 'open_status') => (await db.query(
    'select * from public.submit_status_report($1, $2, $3, $4::jsonb)', [place, 'phone', null, JSON.stringify([{ type, value }])])).rows[0];

  await db.exec('set role authenticated');
  await login(1);
  assert.equal((await report('agreement', 'open')).outcome, 'pending');
  await assert.rejects(report('agreement', 'open'), /wait before reporting/);
  await login(2);
  assert.equal((await report('agreement', 'open')).outcome, 'accepted');
  assert.equal((await db.query("select is_open from public.current_live_statuses where place_id='agreement'")).rows[0].is_open, true);
  await login(3);
  assert.equal((await report('agreement', 'closed')).outcome, 'conflict');
  assert.equal((await db.query("select is_open from public.current_live_statuses where place_id='agreement'")).rows[0].is_open, true);
  await login(1);
  await report('conflict', 'open');
  await login(2);
  assert.equal((await report('conflict', 'closed')).outcome, 'conflict');
  await login(3);
  assert.equal((await report('conflict', 'open')).outcome, 'conflict');
  assert.equal((await db.query("select count(*)::int as n from public.current_live_statuses where place_id='conflict'")).rows[0].n, 0);
  await assert.rejects(db.query('select * from public.submit_status_report($1,$2,$3,$4::jsonb)', ['validation', 'phone', null, '[{"type":"open_status","value":null}]']), /answer is not valid/);
  await assert.rejects(db.query("insert into public.confirmations(place_id,user_id,confirmation_type,value) values ('validation',auth.uid(),'open_status','open')"), /permission denied/);
  assert.equal((await db.query('select count(*)::int as n from public.report_batches where user_id <> auth.uid()')).rows[0].n, 0);

  await db.exec('reset role');
  await db.exec(`insert into public.live_statuses(place_id,is_open,card_machine_working,source,signal_confirmed_at,last_confirmed_at)
    values ('expiry',true,true,'community',jsonb_build_object('open_status', now()-interval '5 hours','card_machine',now()),now());`);
  let status = (await db.query("select * from public.current_live_statuses where place_id='expiry'")).rows[0];
  assert.equal(status.is_open, null);
  assert.equal(status.card_machine_working, true);
  await db.exec("update public.live_statuses set signal_confirmed_at=jsonb_build_object('open_status',now()-interval '5 hours','card_machine',now()-interval '5 hours') where place_id='expiry'");
  status = (await db.query("select * from public.current_live_statuses where place_id='expiry'")).rows[0];
  assert.equal(status.source, 'unknown');
  assert.equal(status.card_machine_working, null);
  await db.exec('set role anon');
  await assert.rejects(report('validation', 'open'), /permission denied/);
  await db.exec('reset role');
  await db.exec("alter table auth.users add column created_at timestamptz default now()-interval '30 days', add column is_anonymous boolean not null default false; grant select on public.places to anon,authenticated;");
  await db.exec(await readFile(new URL('../supabase/migrations/20261001165604_trust_model_and_venue_claims.sql', import.meta.url), 'utf8'));
  await db.exec("insert into public.places(id) values('trust-insert')");
  await db.exec('set role authenticated');
  await login(1);
  assert.equal((await report('trust-insert','closed')).outcome,'pending');
  await assert.rejects(report('trust-insert','closed'), /wait before reporting/);
  await login(2);
  assert.equal((await report('trust-insert','closed')).outcome,'pending');
  await assert.rejects(db.query("select * from public.submit_status_report('validation','phone',null,'[{\"type\":\"open_status\",\"value\":null}]'::jsonb)"),/answer is not valid/);
  await assert.rejects(db.query("select * from public.submit_status_report('validation','phone',null,'[{\"type\":\"open_status\",\"value\":\"open\"},{\"type\":\"open_status\",\"value\":\"closed\"}]'::jsonb)"),/each status once/);
  assert.equal((await db.query("select count(*)::int as n from public.live_statuses where place_id='trust-insert'")).rows[0].n,0);
  assert.equal((await db.query("select trust_snapshot#>>'{claims,open_status,state}' as state,confidence_score from public.current_live_statuses where place_id='trust-insert'")).rows[0].state,'unknown');
  assert.equal((await db.query("select confidence_score from public.current_live_statuses where place_id='trust-insert'")).rows[0].confidence_score,0);
  await db.exec('reset role');
  await db.exec('set role anon');
  const trust = async (place) => (await db.query('select public.read_place_trust($1) as snapshot', [place])).rows[0].snapshot;
  assert.equal((await trust('agreement')).claims.open_status.state, 'disagree');
  assert.equal((await trust('expiry')).claims.open_status.state, 'unknown');
  await assert.rejects(db.query("select * from knogo_private.venue_representatives"), /permission denied/);
  await assert.rejects(db.query("select public.publish_venue_update('agreement','open_status','open',false)"), /permission denied/);
  await db.exec('set role authenticated');
  await login(1);
  await assert.rejects(db.query("select public.publish_venue_update('agreement','open_status','open',false)"), /Verify access/);
  await assert.rejects(db.query("delete from public.confirmations"), /permission denied/);
  await db.exec('reset role');
  await db.exec(`
    insert into public.places(id) values ('negative-trust');
    with batches as (
      insert into public.report_batches(place_id,user_id,report_source,created_at)
      select 'negative-trust',id,case when right(id::text,1)='1' then 'in_person' else 'phone' end,
        now()-make_interval(mins=>case when right(id::text,1)='1' then 30 else 5 end)
      from auth.users returning *
    ) insert into public.confirmations(place_id,user_id,confirmation_type,value,location_verified,report_batch_id,created_at)
      select place_id,user_id,'open_status','closed',false,id,created_at from batches;
  `);
  assert.equal((await trust('negative-trust')).claims.open_status.state,'unknown');
  await db.query("select public.record_report_risk((select id from public.report_batches where place_id='negative-trust' limit 1),'low',array['insufficient_context'],'test-model','assessed')");
  assert.equal((await db.query("select risk from knogo_private.report_risk_assessments where reasons=array['insufficient_context']")).rows[0].risk,'unknown');
  await db.exec('set role anon');
  await assert.rejects(db.query("select public.reserve_provider_call('routes')"), /permission denied/);
  await db.exec('set role authenticated');
  await assert.rejects(db.query("select public.reserve_provider_call('routes')"), /permission denied/);
  await assert.rejects(db.query("update knogo_private.provider_limits set enabled=true"), /permission denied/);
  await db.exec('reset role');
  const reserve = async (provider) => (await db.query('select public.reserve_provider_call($1) as allowed', [provider])).rows[0].allowed;
  assert.equal(await reserve('routes'), false);
  assert.equal(await reserve('unknown-provider'), false);
  await db.exec("update knogo_private.provider_limits set enabled=true,daily_limit=3,minute_limit=2 where provider='routes'");
  await db.exec('set role service_role');
  assert.deepEqual(await Promise.all([reserve('routes'),reserve('routes'),reserve('routes')]), [true,true,false]);
  await db.exec('reset role');
  assert.equal((await db.query("select calls from knogo_private.provider_usage where provider='routes'")).rows[0].calls,2);
  // Moving a day counter does not bypass the rolling minute window.
  await db.exec("update knogo_private.provider_usage set day=day-1 where provider='routes'");
  assert.equal(await reserve('routes'),false);
  await db.exec("update knogo_private.provider_call_windows set reserved_at=array[clock_timestamp()-interval '61 seconds'] where provider='routes'");
  assert.equal(await reserve('routes'),true);
  await db.exec("update knogo_private.provider_call_windows set reserved_at='{}' where provider='routes'");
  assert.deepEqual(await Promise.all([reserve('routes'),reserve('routes'),reserve('routes')]),[true,true,false]);
  assert.equal((await db.query("select calls from knogo_private.provider_usage where provider='routes' and day=(now() at time zone 'UTC')::date")).rows[0].calls,3);
  await assert.rejects(db.query("update knogo_private.provider_limits set minute_limit=31 where provider='routes'"), /check constraint/);
  // A provider day must not receive another allowance at UTC midnight.
  await db.exec("update knogo_private.provider_limits set enabled=true,daily_limit=3,minute_limit=2 where provider='gemini'");
  await db.exec(`insert into knogo_private.provider_usage(provider,day,calls)
    values('gemini',(now() at time zone 'UTC')::date-1,3);
    insert into knogo_private.provider_call_windows(provider,reserved_at)
    values('gemini',array[clock_timestamp()-interval '2 hours',clock_timestamp()-interval '3 hours',clock_timestamp()-interval '4 hours']);`);
  await db.exec('set role service_role');
  assert.equal(await reserve('gemini'),false);
  await db.exec('reset role');
  assert.equal((await db.query("select count(*)::int as n from knogo_private.provider_usage where provider='gemini' and day=(now() at time zone 'UTC')::date")).rows[0].n,0);
  await db.exec("update knogo_private.provider_call_windows set reserved_at=array[clock_timestamp()-interval '26 hours'] where provider='gemini'");
  await db.exec('set role service_role');
  assert.equal(await reserve('gemini'),true);
  await db.exec('reset role');
  assert.equal((await db.query("select cardinality(reserved_at) as n from knogo_private.provider_call_windows where provider='gemini'")).rows[0].n,1);
  await db.exec(`insert into knogo_private.report_risk_assessments(report_batch_id,risk,reasons,outcome)
    select id,'low',array['no_pattern_detected'],'assessed' from public.report_batches where place_id='negative-trust';`);
  assert.equal((await trust('negative-trust')).claims.open_status.state,'likely_negative');
  await db.exec(`update knogo_private.report_risk_assessments set risk='unknown',outcome='timeout'
    where report_batch_id in(select id from public.report_batches where place_id='negative-trust');`);
  assert.equal((await trust('negative-trust')).claims.open_status.state,'unknown');
  await db.exec("insert into public.report_batches(place_id,user_id,report_source,created_at) select 'validation','00000000-0000-0000-0000-000000000001','phone',now()-interval '1 hour' from generate_series(1,30)");
  await db.exec('set role authenticated');
  await login(1);
  await assert.rejects(report('validation','open'),/Daily report limit/);
  await db.exec('reset role');
  await db.exec("insert into knogo_private.venue_phone_sources(place_id,phone_e164,source_url,checked_at,enabled) values('negative-trust','+27120000001','https://venue.example/contacts',now(),true)");
  const claimUser='00000000-0000-0000-0000-000000000001';
  const startClaim=async(place,user=claimUser,channel='sms')=>(await db.query('select public.start_venue_claim($1,$2,$3) as challenge',[place,user,channel])).rows[0].challenge;
  const attachDelivery=async(id,user=claimUser,reference='test-delivery')=>(await db.query('select public.attach_venue_claim_delivery($1,$2,$3) as attached',[id,user,reference])).rows[0].attached;
  const beginVerify=async(id,user=claimUser)=>(await db.query('select public.begin_venue_claim_verification($1,$2) as attempt',[id,user])).rows[0].attempt;
  const finishVerify=async(id,attempt,verified,user=claimUser)=>(await db.query('select public.finish_venue_claim_verification($1,$2,$3,$4) as verified',[id,user,attempt,verified])).rows[0].verified;
  await db.exec('set role service_role');
  const venueClaim=await startClaim('negative-trust');
  assert.equal(venueClaim.phone,'+27120000001');
  assert.equal(await attachDelivery(venueClaim.challengeId),true);
  const venueAttempt=await beginVerify(venueClaim.challengeId);
  assert.equal(await finishVerify(venueClaim.challengeId,venueAttempt.attemptId,true),true);
  await db.exec('set role authenticated');
  await login(1);
  const venueAccess=(await db.query("select public.read_venue_access('negative-trust') as access")).rows[0].access;
  assert.equal(venueAccess.verified,true);
  assert.ok(venueAccess.verifiedAt && venueAccess.expiresAt);
  assert.equal('phone' in venueAccess,false);
  await db.query("select public.publish_venue_update('negative-trust','open_status','open',true)");
  assert.equal((await trust('negative-trust')).claims.open_status.state,'disagree');
  await assert.rejects(db.query('delete from public.confirmations'),/permission denied/);
  await login(2);
  assert.deepEqual((await db.query("select public.read_venue_access('negative-trust') as access")).rows[0].access,{verified:false,verifiedAt:null,expiresAt:null});
  await assert.rejects(db.query("select public.publish_venue_update('negative-trust','open_status','closed',false)"),/Verify access/);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int as n from knogo_private.venue_disputes')).rows[0].n,1);
  await db.exec("update public.confirmations set created_at=now()-interval '5 hours' where place_id='negative-trust'");
  assert.equal((await trust('negative-trust')).claims.open_status.state,'venue_update');
  await db.exec("update knogo_private.venue_updates set expires_at=now()-interval '1 minute'");
  assert.equal((await trust('negative-trust')).claims.open_status.state,'unknown');
  await db.exec('set role anon');
  await assert.rejects(db.query("select public.read_venue_access('negative-trust')"),/permission denied/);
  await assert.rejects(db.query('select * from public.claim_report_risk_job()'),/permission denied/);
  await assert.rejects(db.query('select * from knogo_private.report_risk_jobs'),/permission denied/);
  await db.exec('set role authenticated');
  await assert.rejects(db.query('select * from public.claim_report_risk_job()'),/permission denied/);
  await db.exec('reset role');
  // These rows live only in the disposable in-memory database.
  await db.exec('delete from knogo_private.report_risk_jobs');
  await db.exec("insert into public.report_batches(id,place_id,user_id,report_source) values ('11111111-1111-4111-8111-111111111111','validation','00000000-0000-0000-0000-000000000002','phone'),('22222222-2222-4222-8222-222222222222','validation','00000000-0000-0000-0000-000000000002','phone')");
  assert.equal((await db.query('select count(*)::int as n from knogo_private.report_risk_jobs')).rows[0].n,2);
  const claimJob=async()=> (await db.query('select * from public.claim_report_risk_job()')).rows[0];
  const finishJob=async(job,outcome='assessed',lease=job.lease_id)=>(await db.query('select public.finish_report_risk_job($1,$2,$3,$4,$5,$6) as finished', [job.report_id,lease,'low',['no_pattern_detected'],'test-model',outcome])).rows[0].finished;
  await db.exec('set role service_role');
  const firstJob=await claimJob();
  const secondJob=await claimJob();
  assert.notEqual(firstJob.report_id,secondJob.report_id);
  assert.equal(await claimJob(),undefined);
  assert.equal(await finishJob(firstJob,'assessed','99999999-9999-4999-8999-999999999999'),false);
  assert.equal(await finishJob(firstJob),true);
  assert.equal(await finishJob(firstJob),false);
  assert.equal(await finishJob(secondJob,'quota'),true);
  assert.equal(await claimJob(),undefined);
  await db.exec('reset role');
  let retry=(await db.query('select * from knogo_private.report_risk_jobs where report_id=$1',[secondJob.report_id])).rows[0];
  assert.equal(retry.state,'waiting');
  assert.equal(retry.attempts,1);
  assert.equal((await db.query('select risk from knogo_private.report_risk_assessments where report_batch_id=$1 order by assessed_at desc limit 1',[secondJob.report_id])).rows[0].risk,'unknown');
  await db.query("update knogo_private.report_risk_jobs set available_at=now()-interval '1 second' where report_id=$1",[secondJob.report_id]);
  const retryJob=await claimJob();
  assert.notEqual(retryJob.lease_id,secondJob.lease_id);
  assert.equal(await finishJob(secondJob),false);
  await db.query("update knogo_private.report_risk_jobs set lease_until=now()-interval '1 second' where report_id=$1",[secondJob.report_id]);
  const finalJob=await claimJob();
  assert.equal(await finishJob(retryJob),false);
  assert.equal(await finishJob(finalJob,'timeout'),true);
  assert.equal(await claimJob(),undefined);
  retry=(await db.query('select * from knogo_private.report_risk_jobs where report_id=$1',[secondJob.report_id])).rows[0];
  assert.equal(retry.state,'exhausted');
  assert.equal(retry.attempts,3);
  await db.exec("insert into public.report_batches(id,place_id,user_id,report_source,created_at) values ('33333333-3333-4333-8333-333333333333','validation','00000000-0000-0000-0000-000000000002','phone',now()-interval '5 hours')");
  assert.equal(await claimJob(),undefined);
  assert.equal((await db.query("select state from knogo_private.report_risk_jobs where report_id='33333333-3333-4333-8333-333333333333'")).rows[0].state,'expired');
  await db.exec("begin; insert into public.report_batches(id,place_id,user_id,report_source) values ('44444444-4444-4444-8444-444444444444','validation','00000000-0000-0000-0000-000000000002','phone'); rollback;");
  assert.equal((await db.query("select count(*)::int as n from knogo_private.report_risk_jobs where report_id='44444444-4444-4444-8444-444444444444'")).rows[0].n,0);
  await db.exec("insert into public.report_batches(id,place_id,user_id,report_source) values ('55555555-5555-4555-8555-555555555555','validation','00000000-0000-0000-0000-000000000002','phone')");
  for(let attempt=0;attempt<3;attempt++) {
    assert.equal((await claimJob()).report_id,'55555555-5555-4555-8555-555555555555');
    await db.exec("update knogo_private.report_risk_jobs set lease_until=now()-interval '1 second' where report_id='55555555-5555-4555-8555-555555555555'");
  }
  assert.equal(await claimJob(),undefined);
  assert.equal((await db.query("select state from knogo_private.report_risk_jobs where report_id='55555555-5555-4555-8555-555555555555'")).rows[0].state,'exhausted');
  await db.exec('set role anon');
  await assert.rejects(startClaim('negative-trust'),/permission denied/);
  await db.exec('set role authenticated');
  await assert.rejects(startClaim('negative-trust'),/permission denied/);
  await assert.rejects(finishVerify(venueClaim.challengeId,venueAttempt.attemptId,true),/permission denied/);
  await db.exec('reset role');
  await db.exec("insert into public.places(id) values('claim-checks'),('claim-change'),('claim-failure'),('claim-rate'),('claim-stale'),('claim-disabled'); insert into knogo_private.venue_phone_sources(place_id,phone_e164,source_url,checked_at,enabled) select id,'+27120000002','https://venue.example/contacts',case when id='claim-stale' then now()-interval '181 days' else now() end,id<>'claim-disabled' from public.places where id like 'claim-%'");
  const otherClaimUser='00000000-0000-0000-0000-000000000002';
  const thirdClaimUser='00000000-0000-0000-0000-000000000003';
  await assert.rejects(startClaim('claim-stale',otherClaimUser),/No phone source/);
  await assert.rejects(startClaim('claim-disabled',otherClaimUser),/No phone source/);
  const checkingClaim=await startClaim('claim-checks',otherClaimUser,'voice');
  assert.equal(checkingClaim.phone,'+27120000002');
  assert.equal(checkingClaim.channel,'voice');
  await assert.rejects(startClaim('claim-checks',otherClaimUser),/Wait before/);
  assert.equal(await finishVerify(checkingClaim.challengeId,null,true,otherClaimUser),false);
  assert.equal(await attachDelivery(checkingClaim.challengeId,claimUser),false);
  assert.equal(await attachDelivery(checkingClaim.challengeId,otherClaimUser),true);
  await assert.rejects(beginVerify(checkingClaim.challengeId,claimUser),/unavailable or has expired/);
  for(let attempt=0;attempt<5;attempt++) {
    const check=await beginVerify(checkingClaim.challengeId,otherClaimUser);
    await assert.rejects(beginVerify(checkingClaim.challengeId,otherClaimUser),attempt===4 ? /unavailable or has expired/ : /in progress/);
    assert.equal(await finishVerify(checkingClaim.challengeId,check.attemptId,false,otherClaimUser),false);
  }
  await assert.rejects(beginVerify(checkingClaim.challengeId,otherClaimUser),/unavailable or has expired/);
  assert.equal((await db.query('select count(*)::int as n from knogo_private.venue_representatives where user_id=$1',[otherClaimUser])).rows[0].n,0);
  const changingClaim=await startClaim('claim-change',otherClaimUser);
  assert.equal(await attachDelivery(changingClaim.challengeId,otherClaimUser),true);
  const changingAttempt=await beginVerify(changingClaim.challengeId,otherClaimUser);
  await db.exec("update knogo_private.venue_phone_sources set phone_e164='+27120000003' where place_id='claim-change'");
  assert.equal(await finishVerify(changingClaim.challengeId,changingAttempt.attemptId,true,otherClaimUser),false);
  const failedClaim=await startClaim('claim-failure',thirdClaimUser);
  assert.equal(await attachDelivery(failedClaim.challengeId,thirdClaimUser,null),true);
  await assert.rejects(beginVerify(failedClaim.challengeId,thirdClaimUser),/unavailable or has expired/);
  await db.exec("update knogo_private.venue_phone_sources set phone_e164='+27120000004' where place_id='negative-trust'");
  assert.notEqual((await db.query('select revoked_at from knogo_private.venue_representatives where place_id=$1',['negative-trust'])).rows[0].revoked_at,null);
  await db.exec('set role authenticated');
  await login(1);
  await assert.rejects(db.query("select public.publish_venue_update('negative-trust','open_status','open',false)"),/Verify access/);
  await db.exec('reset role');
  // Move the request history only in this disposable fixture to test a new day.
  await db.exec("update knogo_private.venue_claim_challenges set created_at=now()-interval '25 hours'");
  const expiredClaim=await startClaim('claim-checks',otherClaimUser);
  assert.equal(await attachDelivery(expiredClaim.challengeId,otherClaimUser),true);
  const expiredAttempt=await beginVerify(expiredClaim.challengeId,otherClaimUser);
  await db.query("update knogo_private.venue_claim_challenges set expires_at=now()-interval '1 second' where id=$1",[expiredClaim.challengeId]);
  assert.equal(await finishVerify(expiredClaim.challengeId,expiredAttempt.attemptId,true,otherClaimUser),false);
  await assert.rejects(beginVerify(expiredClaim.challengeId,otherClaimUser),/unavailable or has expired/);
  await db.exec("update knogo_private.venue_phone_sources set phone_e164='+27120000005' where place_id='claim-rate'");
  for(const user of [claimUser,otherClaimUser,thirdClaimUser]) await startClaim('claim-rate',user);
  await db.exec("update knogo_private.venue_claim_challenges set created_at=now()-interval '2 minutes' where place_id='claim-rate'");
  await assert.rejects(startClaim('claim-rate',claimUser),/verification limit/);
  await startClaim('claim-change',claimUser);
  await startClaim('claim-failure',claimUser);
  await assert.rejects(startClaim('negative-trust',claimUser),/verification limit/);
  // Anonymous Auth sessions carry the authenticated role, unlike signed-out visitors.
  await db.exec("insert into auth.users(id,is_anonymous) values('00000000-0000-0000-0000-000000000004',true); insert into public.places(id) values('anonymous-report');");
  await db.exec('set role authenticated');
  await login(4);
  await assert.rejects(report('anonymous-report','open'), /Sign in/);
  await login(5);
  await assert.rejects(report('anonymous-report','open'), /Sign in/);
  await db.exec('reset role');
  await db.exec('set role service_role');
  await assert.rejects(startClaim('claim-change','00000000-0000-0000-0000-000000000004'), /Sign in/);
  await db.exec('reset role');
  // Legacy anonymous evidence cannot become a public indication or AI context.
  await db.exec(`with batch as (
    insert into public.report_batches(place_id,user_id,report_source)
    values('anonymous-report','00000000-0000-0000-0000-000000000004','phone') returning *
  ) insert into public.confirmations(place_id,user_id,confirmation_type,value,location_verified,report_batch_id)
    select place_id,user_id,'open_status','open',false,id from batch;`);
  assert.equal((await trust('anonymous-report')).claims.open_status.state,'unknown');
  const context=(await db.query("select public.report_risk_context((select id from public.report_batches where place_id='anonymous-report')) as context")).rows[0].context;
  assert.ok(!(context ?? []).some(row => row.actor_id==='00000000-0000-0000-0000-000000000004'));
  const lifecycleUser='00000000-0000-0000-0000-000000000006';
  await db.exec(`insert into auth.users(id) values('${lifecycleUser}'); insert into public.places(id) values('account-lifecycle');
    insert into knogo_private.venue_phone_sources(place_id,phone_e164,source_url,checked_at,enabled)
    values('account-lifecycle','+27120000006','https://venue.example/contacts',now(),true);`);
  const lifecycleClaim=await startClaim('account-lifecycle',lifecycleUser);
  assert.equal(await attachDelivery(lifecycleClaim.challengeId,lifecycleUser),true);
  const lifecycleAttempt=await beginVerify(lifecycleClaim.challengeId,lifecycleUser);
  await db.query('update auth.users set is_anonymous=true where id=$1',[lifecycleUser]);
  await assert.rejects(beginVerify(lifecycleClaim.challengeId,lifecycleUser),/unavailable or has expired/);
  assert.equal(await finishVerify(lifecycleClaim.challengeId,lifecycleAttempt.attemptId,true,lifecycleUser),false);
  await db.query('update auth.users set is_anonymous=false where id=$1',[lifecycleUser]);
  assert.equal(await finishVerify(lifecycleClaim.challengeId,lifecycleAttempt.attemptId,true,lifecycleUser),true);
  await db.exec('set role authenticated');
  await login(6);
  await db.query("select public.publish_venue_update('account-lifecycle','open_status','open',false)");
  assert.equal((await trust('account-lifecycle')).claims.open_status.state,'venue_update');
  await db.exec('reset role');
  await db.query('update auth.users set is_anonymous=true where id=$1',[lifecycleUser]);
  await db.exec('set role authenticated');
  assert.equal((await db.query("select public.read_venue_access('account-lifecycle') as access")).rows[0].access.verified,false);
  await assert.rejects(db.query("select public.publish_venue_update('account-lifecycle','open_status','closed',false)"),/Verify access/);
  assert.equal((await trust('account-lifecycle')).claims.open_status.state,'unknown');
  await db.exec('reset role');
  const blockedUser='00000000-0000-0000-0000-000000000007';
  await db.exec(`insert into auth.users(id) values('${blockedUser}');
    insert into public.places(id,is_active) values('block-evidence',true),('block-submit',true),('inactive-submit',false);
    insert into knogo_private.venue_phone_sources(place_id,phone_e164,source_url,checked_at,enabled)
    values('block-evidence','+27120000007','https://venue.example/contacts',now(),true);`);
  await db.exec('set role authenticated');
  await login(7);
  await report('block-evidence','open');
  assert.equal((await trust('block-evidence')).claims.open_status.state,'community_indication');
  await assert.rejects(report('inactive-submit','open'), /place is not available/);
  await assert.rejects(db.query("select * from public.submit_status_report('block-submit','online','javascript:alert(1)','[{\"type\":\"open_status\",\"value\":\"open\"}]'::jsonb)"), /source page URL/);
  await db.exec('reset role');
  await db.query('insert into public.blocked_contributors(user_id,reason) values($1,$2)',[blockedUser,'Disposable QA fixture']);
  await db.exec('set role authenticated');
  assert.equal((await trust('block-evidence')).claims.open_status.state,'unknown');
  await assert.rejects(report('block-submit','open'), /account cannot submit/);
  await assert.rejects(db.query('delete from public.blocked_contributors where user_id=auth.uid()'), /permission denied/);
  await db.exec('reset role');
  await assert.rejects(startClaim('block-evidence',blockedUser), /account cannot claim/);
  await db.query("update public.blocked_contributors set blocked_until=now()-interval '1 second' where user_id=$1",[blockedUser]);
  await db.exec('set role authenticated');
  assert.equal((await trust('block-evidence')).claims.open_status.state,'community_indication');
  await report('block-submit','open');
  await db.exec('reset role');
  await db.exec("update public.places set is_active=false where id='block-evidence'");
  await db.exec('set role anon');
  assert.deepEqual(await trust('block-evidence'),{version:1,claims:{}});
  assert.equal((await db.query("select count(*)::int as n from public.current_live_statuses where place_id='block-evidence'")).rows[0].n,0);
  await db.exec('reset role');
  await db.query('update auth.users set is_anonymous=false where id=$1',[lifecycleUser]);
  await db.query('insert into public.blocked_contributors(user_id,reason) values($1,$2)',[lifecycleUser,'Disposable QA fixture']);
  await db.exec('set role authenticated');
  await login(6);
  assert.equal((await db.query("select public.read_venue_access('account-lifecycle') as access")).rows[0].access.verified,false);
  await assert.rejects(db.query("select public.publish_venue_update('account-lifecycle','open_status','open',false)"), /Verify access/);
  assert.equal((await trust('account-lifecycle')).claims.open_status.state,'unknown');
  await db.exec('reset role');
  console.log('PASS: report trust/RLS, provider limits, risk queue, venue claims, blocking, inactive venues and anonymous-account boundaries.');
} catch (error) {
  console.error(error.message);
  if (error.detail) console.error(error.detail);
  process.exitCode = 1;
} finally {
  await db.close();
}
