-- Trust Model And Venue Claims
begin;
create schema if not exists knogo_private;
revoke all on schema knogo_private from public, anon, authenticated;

create table knogo_private.trust_rules (
  id boolean primary key default true check (id),
  lifetime_seconds integer not null default 14400 check (lifetime_seconds between 300 and 14400),
  negative_accounts integer not null default 3 check (negative_accounts >= 3),
  account_age_seconds integer not null default 86400 check (account_age_seconds >= 86400),
  negative_span_seconds integer not null default 900 check (negative_span_seconds >= 900),
  negative_sources integer not null default 2 check (negative_sources between 2 and 3)
);
insert into knogo_private.trust_rules(id) values (true);

create table knogo_private.report_risk_assessments (
  id uuid primary key default gen_random_uuid(),
  report_batch_id uuid not null references public.report_batches(id) on delete cascade,
  risk text not null check (risk in ('low','medium','high','unknown')),
  reasons text[] not null default '{}',
  model text,
  assessed_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '4 hours',
  outcome text not null check (outcome in ('assessed','disabled','timeout','quota','malformed','provider_error'))
);
create index report_risk_batch_time_idx on knogo_private.report_risk_assessments(report_batch_id, assessed_at desc);
create table knogo_private.report_risk_jobs (
  report_id uuid primary key references public.report_batches(id) on delete cascade,
  state text not null default 'waiting' check(state in ('waiting','leased','complete','exhausted','expired')),
  attempts integer not null default 0 check(attempts between 0 and 3),
  available_at timestamptz not null default now(),
  expires_at timestamptz not null,
  lease_id uuid,
  lease_until timestamptz,
  last_outcome text,
  finished_at timestamptz
);
create index report_risk_jobs_ready_idx on knogo_private.report_risk_jobs(available_at) where state in ('waiting','leased');
alter table knogo_private.report_risk_jobs enable row level security;
revoke all on knogo_private.report_risk_jobs from public,anon,authenticated;
create function knogo_private.enqueue_report_risk() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into knogo_private.report_risk_jobs(report_id,expires_at) values(new.id,new.created_at+interval '4 hours') on conflict do nothing;
 return new;
end;
$$;
create trigger queue_report_risk after insert on public.report_batches for each row execute function knogo_private.enqueue_report_risk();

create table knogo_private.venue_phone_sources (
  place_id text primary key references public.places(id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  source_url text not null check (source_url ~ '^https://'),
  source_version uuid not null default gen_random_uuid(),
  checked_at timestamptz not null,
  enabled boolean not null default false
);
create table knogo_private.venue_claim_challenges (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_source_checked_at timestamptz not null,
  phone_source_version uuid not null,
  phone_snapshot text not null check(phone_snapshot ~ '^\+[1-9][0-9]{7,14}$'),
  delivery_state text not null default 'reserved' check(delivery_state in ('reserved','sent','failed')),
  verification_lease uuid,
  verification_until timestamptz,
  provider_reference text,
  channel text not null check (channel in ('sms','voice')),
  attempts integer not null default 0 check (attempts between 0 and 5),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  consumed_at timestamptz
);
create index venue_claim_user_created_idx on knogo_private.venue_claim_challenges(user_id,created_at desc);
create index venue_claim_phone_created_idx on knogo_private.venue_claim_challenges(phone_snapshot,created_at desc);
create table knogo_private.venue_representatives (
  place_id text not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references knogo_private.venue_claim_challenges(id),
  verified_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  revoked_at timestamptz,
  primary key(place_id,user_id)
);
create table knogo_private.venue_updates (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_type text not null check (check_type in ('open_status','kitchen_status','busy_level','walk_ins','card_machine','backup_power')),
  value text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '4 hours'
);
create index venue_updates_place_time_idx on knogo_private.venue_updates(place_id,created_at desc);
create table knogo_private.venue_disputes (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  check_type text not null,
  claimed_value text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '4 hours',
  update_id uuid not null references knogo_private.venue_updates(id)
);
create table knogo_private.trust_decisions (
  id bigint generated always as identity primary key,
  report_batch_id uuid not null references public.report_batches(id) on delete cascade,
  rules_version integer not null default 1,
  states jsonb not null,
  created_at timestamptz not null default now()
);
create index trust_decisions_report_idx on knogo_private.trust_decisions(report_batch_id);
alter table knogo_private.trust_rules enable row level security;
alter table knogo_private.report_risk_assessments enable row level security;
alter table knogo_private.venue_phone_sources enable row level security;
alter table knogo_private.venue_claim_challenges enable row level security;
alter table knogo_private.venue_representatives enable row level security;
alter table knogo_private.venue_updates enable row level security;
alter table knogo_private.venue_disputes enable row level security;
alter table knogo_private.trust_decisions enable row level security;
revoke all on all tables in schema knogo_private from public,anon,authenticated;

create function knogo_private.phone_source_changed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (new.phone_e164,new.source_url,new.enabled) is distinct from (old.phone_e164,old.source_url,old.enabled) then
  new.source_version:=gen_random_uuid();
  update knogo_private.venue_representatives set revoked_at=now() where place_id=old.place_id and revoked_at is null;
 else new.source_version:=old.source_version; end if;
 return new;
end;
$$;
create trigger revoke_changed_venue_phone before update on knogo_private.venue_phone_sources for each row execute function knogo_private.phone_source_changed();

create function knogo_private.venue_access_valid(p_place_id text,p_user_id uuid) returns boolean
language sql security definer set search_path='' stable as $$
 select exists(select 1 from knogo_private.venue_representatives r
  join knogo_private.venue_claim_challenges c on c.id=r.challenge_id
  join knogo_private.venue_phone_sources s on s.place_id=r.place_id join public.places p on p.id=r.place_id
  where r.place_id=p_place_id and r.user_id=p_user_id and r.revoked_at is null and r.expires_at>now()
    and c.consumed_at is not null and c.delivery_state='sent' and c.phone_source_version=s.source_version
    and c.phone_snapshot=s.phone_e164 and s.enabled and p.is_active and s.checked_at<=now() and s.checked_at>now()-interval '180 days'
    and exists(select 1 from auth.users u where u.id=r.user_id and not coalesce(u.is_anonymous,false))
    and not exists(select 1 from public.blocked_contributors b where b.user_id=r.user_id and (b.blocked_until is null or b.blocked_until>now())));
$$;

create function public.start_venue_claim(p_place_id text,p_user_id uuid,p_channel text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare source knogo_private.venue_phone_sources%rowtype; challenge uuid;
begin
 if p_user_id is null or not exists(select 1 from auth.users where id=p_user_id and not coalesce(is_anonymous,false)) then raise exception 'Sign in before claiming a venue.' using errcode='42501'; end if;
 if p_channel is null or p_channel not in ('sms','voice') then raise exception 'Choose SMS or voice.' using errcode='22023'; end if;
 if exists(select 1 from public.blocked_contributors where user_id=p_user_id and (blocked_until is null or blocked_until>now())) then raise exception 'This account cannot claim a venue.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('claim-user:'||p_user_id::text,0));
 select s.* into source from knogo_private.venue_phone_sources s join public.places p on p.id=s.place_id
 where s.place_id=p_place_id and p.is_active and s.enabled and s.checked_at<=now() and s.checked_at>now()-interval '180 days' for share of s;
 if not found then raise exception 'No phone source is available for verification.' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended('claim-phone:'||source.phone_e164,0));
 if exists(select 1 from knogo_private.venue_claim_challenges where user_id=p_user_id and place_id=p_place_id and created_at>now()-interval '1 minute') then raise exception 'Wait before requesting another code.' using errcode='42900'; end if;
 if (select count(*) from knogo_private.venue_claim_challenges where user_id=p_user_id and created_at>now()-interval '24 hours')>=3
   or (select count(*) from knogo_private.venue_claim_challenges where phone_snapshot=source.phone_e164 and created_at>now()-interval '1 hour')>=3
   or (select count(*) from knogo_private.venue_claim_challenges where phone_snapshot=source.phone_e164 and created_at>now()-interval '24 hours')>=10 then raise exception 'Venue verification limit reached.' using errcode='42900'; end if;
 insert into knogo_private.venue_claim_challenges(place_id,user_id,phone_source_checked_at,phone_source_version,phone_snapshot,channel)
 values(p_place_id,p_user_id,source.checked_at,source.source_version,source.phone_e164,p_channel) returning id into challenge;
 return jsonb_build_object('challengeId',challenge,'phone',source.phone_e164,'channel',p_channel);
end;
$$;

create function public.attach_venue_claim_delivery(p_challenge_id uuid,p_user_id uuid,p_reference text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_reference is not null and length(trim(p_reference)) not between 1 and 200 then raise exception 'Delivery reference is not valid.' using errcode='22023'; end if;
 update knogo_private.venue_claim_challenges c set provider_reference=p_reference,delivery_state=case when p_reference is null then 'failed' else 'sent' end
 where c.id=p_challenge_id and c.user_id=p_user_id and c.delivery_state='reserved' and c.expires_at>now() and c.consumed_at is null
   and exists(select 1 from knogo_private.venue_phone_sources s where s.place_id=c.place_id and s.source_version=c.phone_source_version and s.enabled and s.phone_e164=c.phone_snapshot);
 return found;
end;
$$;

create function public.begin_venue_claim_verification(p_challenge_id uuid,p_user_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare challenge knogo_private.venue_claim_challenges%rowtype; attempt uuid;
begin
 select * into challenge from knogo_private.venue_claim_challenges c where c.id=p_challenge_id and c.user_id=p_user_id for update;
 if not found or challenge.delivery_state<>'sent' or challenge.provider_reference is null or challenge.consumed_at is not null or challenge.expires_at<=now() or challenge.attempts>=5
   or not exists(select 1 from knogo_private.venue_phone_sources s join public.places p on p.id=s.place_id where s.place_id=challenge.place_id and s.source_version=challenge.phone_source_version and s.phone_e164=challenge.phone_snapshot and s.enabled and p.is_active and s.checked_at<=now() and s.checked_at>now()-interval '180 days')
   or not exists(select 1 from auth.users where id=p_user_id and not coalesce(is_anonymous,false))
   or exists(select 1 from public.blocked_contributors where user_id=p_user_id and (blocked_until is null or blocked_until>now())) then raise exception 'This verification is unavailable or has expired.' using errcode='42501'; end if;
 if challenge.verification_until>now() then raise exception 'A code check is in progress.' using errcode='42900'; end if;
 attempt:=gen_random_uuid();
 update knogo_private.venue_claim_challenges set attempts=attempts+1,verification_lease=attempt,verification_until=now()+interval '1 minute' where id=p_challenge_id;
 return jsonb_build_object('attemptId',attempt,'reference',challenge.provider_reference,'phone',challenge.phone_snapshot);
end;
$$;

create function public.finish_venue_claim_verification(p_challenge_id uuid,p_user_id uuid,p_attempt_id uuid,p_verified boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare challenge knogo_private.venue_claim_challenges%rowtype; source knogo_private.venue_phone_sources%rowtype;
begin
 select * into challenge from knogo_private.venue_claim_challenges c where c.id=p_challenge_id and c.user_id=p_user_id for update;
 if not found or p_attempt_id is null or challenge.verification_lease is null or challenge.verification_until is null or challenge.consumed_at is not null or challenge.expires_at<=now() or challenge.verification_lease is distinct from p_attempt_id or challenge.verification_until<=now() or challenge.delivery_state<>'sent' or challenge.provider_reference is null then return false; end if;
 select * into source from knogo_private.venue_phone_sources s where s.place_id=challenge.place_id for share;
 if not found or not source.enabled or source.source_version<>challenge.phone_source_version or source.phone_e164<>challenge.phone_snapshot or source.checked_at>now() or source.checked_at<=now()-interval '180 days'
   or not exists(select 1 from public.places where id=challenge.place_id and is_active)
   or not exists(select 1 from auth.users where id=p_user_id and not coalesce(is_anonymous,false))
   or exists(select 1 from public.blocked_contributors where user_id=p_user_id and (blocked_until is null or blocked_until>now())) then return false; end if;
 update knogo_private.venue_claim_challenges set verification_lease=null,verification_until=null,consumed_at=case when p_verified is true then now() end where id=p_challenge_id;
 if p_verified is not true then return false; end if;
 insert into knogo_private.venue_representatives(place_id,user_id,challenge_id) values(challenge.place_id,p_user_id,p_challenge_id)
 on conflict(place_id,user_id) do update set challenge_id=excluded.challenge_id,verified_at=now(),expires_at=now()+interval '90 days',revoked_at=null;
 return true;
end;
$$;
revoke all on function public.start_venue_claim(text,uuid,text),public.attach_venue_claim_delivery(uuid,uuid,text),public.begin_venue_claim_verification(uuid,uuid),public.finish_venue_claim_verification(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.start_venue_claim(text,uuid,text),public.attach_venue_claim_delivery(uuid,uuid,text),public.begin_venue_claim_verification(uuid,uuid),public.finish_venue_claim_verification(uuid,uuid,uuid,boolean) to service_role;

create function knogo_private.check_answer(p_type text,p_value text) returns boolean
language sql immutable set search_path = '' as $$
 select coalesce((p_type='open_status' and p_value in ('open','closed')) or
  (p_type in ('kitchen_status','walk_ins') and p_value in ('yes','no')) or
  (p_type='busy_level' and p_value in ('quiet','normal','busy','packed')) or
  (p_type='card_machine' and p_value in ('yes','no','cash_only')) or
  (p_type='backup_power' and p_value in ('normal','limited','closed')),false)
$$;

create function public.read_place_trust(p_place_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  cfg knogo_private.trust_rules;
  v_check_type text;
  evidence jsonb;
  claim jsonb;
  claims jsonb := '{}'::jsonb;
  report_value text;
  opposing integer;
  venue_count integer;
  eligible integer;
  methods integer;
  span_seconds numeric;
  checked_at timestamptz;
  expiry timestamptz;
  state text;
  rule_code text;
  is_negative boolean;
begin
 if not exists(select 1 from public.places where id=p_place_id and is_active) then return jsonb_build_object('version',1,'claims','{}'::jsonb); end if;
 select * into cfg from knogo_private.trust_rules where id;
 foreach v_check_type in array array['open_status','kitchen_status','busy_level','walk_ins','card_machine','backup_power'] loop
  with community as (
    select distinct on(c.user_id) c.id::text as id,c.user_id::text as actor,c.value,'community'::text as source,
      b.report_source as method,c.created_at as reported_at,c.created_at+make_interval(secs=>cfg.lifetime_seconds) as expires_at,
      coalesce(r.risk,'unknown') as risk,u.created_at as account_created_at,false as verified
    from public.confirmations c join public.report_batches b on b.id=c.report_batch_id join auth.users u on u.id=c.user_id
    left join lateral(select a.risk from knogo_private.report_risk_assessments a where a.report_batch_id=b.id and a.expires_at>now() order by a.assessed_at desc,a.id desc limit 1) r on true
    where c.place_id=p_place_id and c.confirmation_type=v_check_type and c.created_at>now()-make_interval(secs=>cfg.lifetime_seconds) and c.created_at<=now()
      and not coalesce(u.is_anonymous,false) and knogo_private.check_answer(c.confirmation_type,c.value)
      and not exists(select 1 from public.blocked_contributors x where x.user_id=c.user_id and (x.blocked_until is null or x.blocked_until>now()))
    order by c.user_id,c.created_at desc,c.id desc
  ), venues as (
    select distinct on(v.user_id) v.id::text as id,v.user_id::text as actor,v.value,'venue'::text as source,
      null::text as method,v.created_at as reported_at,v.expires_at,'low'::text as risk,null::timestamptz as account_created_at,true as verified
    from knogo_private.venue_updates v join knogo_private.venue_representatives rep on rep.place_id=v.place_id and rep.user_id=v.user_id
    where v.place_id=p_place_id and v.check_type=v_check_type and v.expires_at>now() and v.created_at<=now() and v.created_at>now()-make_interval(secs=>cfg.lifetime_seconds)
      and knogo_private.venue_access_valid(v.place_id,v.user_id) and knogo_private.check_answer(v.check_type,v.value)
    order by v.user_id,v.created_at desc,v.id desc
  ), usable as (select * from community where risk<>'high' union all select * from venues)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'actorId',id,'type',v_check_type,'value',value,'source',source,'checkedBy',method,
      'reportedAt',reported_at,'expiresAt',expires_at,'verifiedRepresentative',verified) order by reported_at,id),'[]'::jsonb),
    min(value),count(distinct value),count(*) filter(where source='venue'),
    count(*) filter(where source='community' and risk='low' and reported_at-account_created_at>=make_interval(secs=>cfg.account_age_seconds)),
    count(distinct method) filter(where source='community' and risk='low' and reported_at-account_created_at>=make_interval(secs=>cfg.account_age_seconds)),
    extract(epoch from (max(reported_at) filter(where source='community' and risk='low' and reported_at-account_created_at>=make_interval(secs=>cfg.account_age_seconds))-
      min(reported_at) filter(where source='community' and risk='low' and reported_at-account_created_at>=make_interval(secs=>cfg.account_age_seconds)))),
    max(reported_at),min(expires_at)
  into evidence,report_value,opposing,venue_count,eligible,methods,span_seconds,checked_at,expiry from usable;
  is_negative := (v_check_type='open_status' and report_value='closed') or (v_check_type in ('kitchen_status','walk_ins') and report_value='no') or
    (v_check_type='card_machine' and report_value<>'yes') or (v_check_type='backup_power' and report_value<>'normal');
  if jsonb_array_length(evidence)=0 then state:='unknown';rule_code:='no_usable_evidence';
  elsif opposing>1 then state:='disagree';rule_code:='opposing_evidence';
  elsif venue_count>0 then state:='venue_update';rule_code:='verified_phone_representative_statement';
  elsif not coalesce(is_negative,false) then state:='community_indication';rule_code:='community_observation';
  elsif eligible>=cfg.negative_accounts and methods>=cfg.negative_sources and span_seconds>=cfg.negative_span_seconds then state:='likely_negative';rule_code:='negative_product_threshold';
  else state:='unknown';rule_code:='negative_evidence_needs_review'; end if;
  claim:=jsonb_build_object('state',state,'value',case when state in ('unknown','disagree') then null else report_value end,'evidence',evidence,
    'reportedAt',case when state='unknown' then null else checked_at end,'expiresAt',case when state='unknown' then null else expiry end,'rule',rule_code);
  claims:=claims||jsonb_build_object(v_check_type,claim);
 end loop;
 return jsonb_build_object('version',1,'claims',claims);
end;
$$;
revoke all on function public.read_place_trust(text) from public;
grant execute on function public.read_place_trust(text) to anon,authenticated;

alter function public.submit_status_report(text,text,text,jsonb) set schema knogo_private;
alter function knogo_private.submit_status_report(text,text,text,jsonb) rename to capture_report;
create or replace function knogo_private.capture_report(p_place_id text,p_report_source text,p_source_url text,p_answers jsonb)
returns table(report_id uuid,outcome text,accepted_signals text[],confirmations jsonb)
language plpgsql security definer set search_path='' as $$
declare reporter uuid:=auth.uid(); saved_id uuid; answer jsonb;
begin
 if reporter is null or not exists(select 1 from auth.users where id=reporter and not coalesce(is_anonymous,false)) then raise exception 'Sign in before submitting a report.' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended('report-user:'||reporter::text,0));
 perform pg_advisory_xact_lock(hashtextextended('report-place:'||coalesce(p_place_id,''),0));
 if not exists(select 1 from public.places where id=p_place_id and is_active) then raise exception 'This place is not available.' using errcode='22023'; end if;
 if p_report_source is null or p_report_source not in ('in_person','phone','online') then raise exception 'Choose how you checked this place.' using errcode='22023'; end if;
 if p_report_source='online' and coalesce(trim(p_source_url),'')!~* '^https?://[^/[:space:]]+[^[:space:]]*$' then raise exception 'Add a source page URL.' using errcode='22023'; end if;
 if length(p_source_url)>2048 then raise exception 'The source URL is too long.' using errcode='22023'; end if;
 if p_answers is null or jsonb_typeof(p_answers)<>'array' then raise exception 'Submit an array of answers.' using errcode='22023'; end if;
 if jsonb_array_length(p_answers) not between 1 and 6 then raise exception 'Submit between one and six answers.' using errcode='22023'; end if;
 if exists(select 1 from public.blocked_contributors where user_id=reporter and (blocked_until is null or blocked_until>now())) then raise exception 'This account cannot submit reports.' using errcode='42501'; end if;
 if exists(select 1 from public.report_batches where user_id=reporter and place_id=p_place_id and created_at>now()-interval '15 minutes') then raise exception 'Please wait before reporting this place again.' using errcode='42900'; end if;
 if (select count(*) from public.report_batches where user_id=reporter and created_at>now()-interval '24 hours')>=30 then raise exception 'Daily report limit reached.' using errcode='42900'; end if;
 for answer in select value from jsonb_array_elements(p_answers) loop
  if jsonb_typeof(answer)<>'object' or not coalesce(knogo_private.check_answer(answer->>'type',trim(answer->>'value')),false) then raise exception 'A report answer is not valid.' using errcode='22023'; end if;
 end loop;
 if (select count(distinct item->>'type') from jsonb_array_elements(p_answers) item)<>jsonb_array_length(p_answers) then raise exception 'Submit each status once.' using errcode='22023'; end if;
 insert into public.report_batches(place_id,user_id,report_source,source_url)
 values(p_place_id,reporter,p_report_source,case when p_report_source='online' then trim(p_source_url) end) returning id into saved_id;
 insert into public.confirmations(place_id,user_id,confirmation_type,value,location_verified,report_batch_id)
 select p_place_id,reporter,item->>'type',trim(item->>'value'),false,saved_id from jsonb_array_elements(p_answers) item;
 insert into public.report_audit_log(report_batch_id,action,details) values(saved_id,'submitted',jsonb_build_object('trust_version',1));
 insert into public.profiles(user_id,contribution_count) values(reporter,jsonb_array_length(p_answers))
 on conflict(user_id) do update set contribution_count=public.profiles.contribution_count+excluded.contribution_count,updated_at=now();
 return query select saved_id,'pending'::text,'{}'::text[],coalesce((select jsonb_agg(to_jsonb(c)) from public.confirmations c where c.report_batch_id=saved_id),'[]'::jsonb);
end;
$$;
revoke all on function knogo_private.capture_report(text,text,text,jsonb) from public,anon,authenticated;
create function public.submit_status_report(p_place_id text,p_report_source text,p_source_url text,p_answers jsonb)
returns table(report_id uuid,outcome text,accepted_signals text[],confirmations jsonb)
language plpgsql security definer set search_path='' as $$
declare saved record; snapshot jsonb; states jsonb; result_state text;
begin
 if auth.uid() is null then raise exception 'Sign in before submitting a report.' using errcode='42501'; end if;
 select * into saved from knogo_private.capture_report(p_place_id,p_report_source,p_source_url,p_answers);
 snapshot:=public.read_place_trust(p_place_id);
 select jsonb_object_agg(key,value->'state') into states from jsonb_each(snapshot->'claims');
 result_state:=case when exists(select 1 from jsonb_each(snapshot->'claims') where value->>'state'='disagree') then 'conflict' else 'pending' end;
 update public.report_batches b set outcome=result_state,accepted_signals='{}' where b.id=saved.report_id;
 insert into knogo_private.trust_decisions(report_batch_id,states) values(saved.report_id,states);
 return query select saved.report_id,result_state,'{}'::text[],saved.confirmations;
end;
$$;
revoke all on function public.submit_status_report(text,text,text,jsonb) from public,anon;
grant execute on function public.submit_status_report(text,text,text,jsonb) to authenticated;

create function public.publish_venue_update(
  p_place_id text,
  p_check_type text,
  p_value text,
  p_dispute boolean default false
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_id uuid;
begin
  if auth.uid() is null
    or not knogo_private.venue_access_valid(p_place_id, auth.uid()) then
    raise exception 'Verify access to the venue phone before publishing.'
      using errcode = '42501';
  end if;

  if not knogo_private.check_answer(p_check_type, p_value) then
    raise exception 'Choose a supported answer.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('venue-update:' || p_place_id || auth.uid()::text, 0)
  );

  if exists (
    select 1
    from knogo_private.venue_updates
    where place_id = p_place_id
      and user_id = auth.uid()
      and created_at > now() - interval '5 minutes'
  ) then
    raise exception 'Wait five minutes before publishing again.'
      using errcode = '42900';
  end if;

  insert into knogo_private.venue_updates (
    place_id, user_id, check_type, value
  )
  values (p_place_id, auth.uid(), p_check_type, p_value)
  returning id into result_id;

  if p_dispute then
    insert into knogo_private.venue_disputes (
      place_id, user_id, check_type, claimed_value, update_id
    )
    values (p_place_id, auth.uid(), p_check_type, p_value, result_id);
  end if;

  return result_id;
end;
$$;
revoke all on function public.publish_venue_update(text, text, text, boolean)
  from public, anon;
grant execute on function public.publish_venue_update(text, text, text, boolean)
  to authenticated;

create function public.read_venue_access(p_place_id text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare representative knogo_private.venue_representatives%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in before managing a venue.' using errcode='42501'; end if;
 if not knogo_private.venue_access_valid(p_place_id,auth.uid()) then
  return jsonb_build_object('verified',false,'verifiedAt',null,'expiresAt',null);
 end if;
 select * into representative from knogo_private.venue_representatives where place_id=p_place_id and user_id=auth.uid();
 return jsonb_build_object('verified',true,'verifiedAt',representative.verified_at,'expiresAt',representative.expires_at);
end;
$$;
revoke all on function public.read_venue_access(text) from public,anon;
grant execute on function public.read_venue_access(text) to authenticated;

create or replace view public.current_live_statuses with(security_invoker=true) as
select p.id as place_id,
  case snapshot#>>'{claims,open_status,value}' when 'open' then true when 'closed' then false end as is_open,
  case snapshot#>>'{claims,kitchen_status,value}' when 'yes' then true when 'no' then false end as is_service_available,
  case snapshot#>>'{claims,walk_ins,value}' when 'yes' then true when 'no' then false end as accepts_walk_ins,
  coalesce(snapshot#>>'{claims,busy_level,value}','unknown') as busy_level,
  case snapshot#>>'{claims,backup_power,value}' when 'normal' then true when 'limited' then false when 'closed' then false end as has_backup_power,
  case snapshot#>>'{claims,card_machine,value}' when 'yes' then true when 'no' then false when 'cash_only' then false end as card_machine_working,
  null::timestamptz as last_confirmed_at,0 as confidence_score,'unknown'::text as source,
  null::timestamptz as updated_at,'{}'::jsonb as signal_confirmed_at,snapshot as trust_snapshot
from public.places p cross join lateral(select public.read_place_trust(p.id) as snapshot) trust where p.is_active;
grant select on public.current_live_statuses to anon,authenticated;
create table knogo_private.provider_limits (
  provider text primary key check(provider in ('routes','addresses','gemini')),
  daily_limit integer not null check(daily_limit between 1 and 1000),
  minute_limit integer not null check(minute_limit between 1 and case provider when 'routes' then 30 when 'addresses' then 60 else 5 end),
  enabled boolean not null default false
);
insert into knogo_private.provider_limits(provider,daily_limit,minute_limit) values('routes',1000,30),('addresses',500,60),('gemini',50,5);
create table knogo_private.provider_usage (
  provider text not null references knogo_private.provider_limits,
  day date not null,
  calls integer not null default 0,
  primary key(provider,day)
);
create table knogo_private.provider_call_windows (
  provider text primary key references knogo_private.provider_limits,
  reserved_at timestamptz[] not null default '{}'
);
alter table knogo_private.provider_limits enable row level security;
alter table knogo_private.provider_usage enable row level security;
alter table knogo_private.provider_call_windows enable row level security;
revoke all on knogo_private.provider_limits,knogo_private.provider_usage,knogo_private.provider_call_windows from public,anon,authenticated;
create function public.reserve_provider_call(p_provider text) returns boolean
language plpgsql security definer set search_path='' as $$
declare max_calls integer; max_minute_calls integer; is_enabled boolean; reserved integer; minute_calls integer;
  request_time timestamptz; recent_calls timestamptz[];
begin
 select daily_limit,minute_limit,enabled into max_calls,max_minute_calls,is_enabled
 from knogo_private.provider_limits where provider=p_provider for update;
 if not coalesce(is_enabled,false) then return false; end if;
 request_time:=clock_timestamp();
 select coalesce(array_agg(call_time),'{}'::timestamptz[]) into recent_calls
 from knogo_private.provider_call_windows w cross join lateral unnest(w.reserved_at) as calls(call_time)
 where w.provider=p_provider and call_time>request_time-interval '25 hours';
 if cardinality(recent_calls)>=max_calls then return false; end if;
 select count(*) into minute_calls from unnest(recent_calls) as calls(call_time)
 where call_time>request_time-interval '60 seconds';
 if minute_calls>=max_minute_calls then return false; end if;
 insert into knogo_private.provider_usage(provider,day,calls) values(p_provider,(request_time at time zone 'UTC')::date,1)
 on conflict(provider,day) do update set calls=knogo_private.provider_usage.calls+1 where knogo_private.provider_usage.calls<max_calls
 returning calls into reserved;
 if reserved is null then return false; end if;
 insert into knogo_private.provider_call_windows(provider,reserved_at) values(p_provider,array_append(recent_calls,request_time))
 on conflict(provider) do update set reserved_at=excluded.reserved_at;
 return true;
end;
$$;
revoke all on function public.reserve_provider_call(text) from public,anon,authenticated;
grant execute on function public.reserve_provider_call(text) to service_role;

create function public.report_risk_context(p_report_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.report_batches where id=p_report_id) then return null; end if;
 return (select jsonb_agg(to_jsonb(records)) from(
  select b.id as report_id,b.user_id as actor_id,b.place_id as venue_id,b.report_source as method,
    floor(extract(epoch from b.created_at)/300) as time_bucket,
    (select jsonb_agg(jsonb_build_object('type',c.confirmation_type,'value',c.value)) from public.confirmations c where c.report_batch_id=b.id) as answers
  from public.report_batches b where b.created_at>now()-interval '4 hours' and b.created_at<=now()
    and exists(select 1 from auth.users u where u.id=b.user_id and not coalesce(u.is_anonymous,false))
    and not exists(select 1 from public.blocked_contributors bc where bc.user_id=b.user_id and (bc.blocked_until is null or bc.blocked_until>now()))
  order by (b.id=p_report_id) desc,b.created_at desc limit 100
 ) records);
end;
$$;
revoke all on function public.report_risk_context(uuid) from public,anon,authenticated;
grant execute on function public.report_risk_context(uuid) to service_role;
create function public.record_report_risk(p_report_id uuid,p_risk text,p_reasons text[],p_model text,p_outcome text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_outcome<>'assessed' then p_risk:='unknown';p_reasons:='{}'; end if;
 if p_risk not in ('low','medium','high','unknown') or p_reasons is null or cardinality(p_reasons)>6 or
   not p_reasons<@array['timing_cluster','repeated_pattern','cross_venue_burst','source_concentration','insufficient_context','no_pattern_detected']::text[] then raise exception 'Risk result is not valid.' using errcode='22023'; end if;
 if 'insufficient_context'=any(p_reasons) then p_risk:='unknown'; end if;
 insert into knogo_private.report_risk_assessments(report_batch_id,risk,reasons,model,outcome) values(p_report_id,p_risk,p_reasons,p_model,p_outcome);
 insert into knogo_private.trust_decisions(report_batch_id,states)
 select p_report_id,jsonb_build_object('assessment_outcome',p_outcome,'risk',p_risk,'snapshot',public.read_place_trust(place_id)->'claims') from public.report_batches where id=p_report_id;
end;
$$;
revoke all on function public.record_report_risk(uuid,text,text[],text,text) from public,anon,authenticated;
grant execute on function public.record_report_risk(uuid,text,text[],text,text) to service_role;

create function public.claim_report_risk_job() returns table(report_id uuid,lease_id uuid)
language plpgsql security definer set search_path='' as $$
begin
 update knogo_private.report_risk_jobs j set state=case when j.expires_at<=now() then 'expired' else 'exhausted' end,
   finished_at=now(),lease_id=null,lease_until=null
 where j.state in ('waiting','leased') and (j.expires_at<=now() or (j.attempts>=3 and coalesce(j.lease_until,now())<=now()));
 return query
 with ready as (
  select j.report_id from knogo_private.report_risk_jobs j
  where j.state in ('waiting','leased') and j.available_at<=now() and j.expires_at>now()
    and j.attempts<3 and (j.lease_until is null or j.lease_until<=now())
  order by j.available_at,j.report_id limit 1 for update skip locked
 )
 update knogo_private.report_risk_jobs j set state='leased',attempts=j.attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 from ready where j.report_id=ready.report_id returning j.report_id,j.lease_id;
end;
$$;
revoke all on function public.claim_report_risk_job() from public,anon,authenticated;
grant execute on function public.claim_report_risk_job() to service_role;

create function public.finish_report_risk_job(p_report_id uuid,p_lease_id uuid,p_risk text,p_reasons text[],p_model text,p_outcome text) returns boolean
language plpgsql security definer set search_path='' as $$
declare job knogo_private.report_risk_jobs%rowtype; terminal boolean;
begin
 select * into job from knogo_private.report_risk_jobs j where j.report_id=p_report_id for update;
 if not found or job.state<>'leased' or job.lease_id is distinct from p_lease_id or job.lease_until<=now() or job.expires_at<=now() then return false; end if;
 perform public.record_report_risk(p_report_id,p_risk,p_reasons,p_model,p_outcome);
 terminal:=p_outcome='assessed' or job.attempts>=3;
 update knogo_private.report_risk_jobs j set state=case when p_outcome='assessed' then 'complete' when terminal then 'exhausted' else 'waiting' end,
  available_at=now()+case when p_outcome in ('quota','disabled') then interval '15 minutes' else make_interval(secs=>30*power(4,job.attempts-1)::integer) end,
  last_outcome=p_outcome,finished_at=case when terminal then now() end,lease_id=null,lease_until=null
 where j.report_id=p_report_id;
 return true;
end;
$$;
revoke all on function public.finish_report_risk_job(uuid,uuid,text,text[],text,text) from public,anon,authenticated;
grant execute on function public.finish_report_risk_job(uuid,uuid,text,text[],text,text) to service_role;

insert into knogo_private.report_risk_jobs(report_id,expires_at)
select b.id,b.created_at+interval '4 hours' from public.report_batches b where b.created_at>now()-interval '4 hours' and b.created_at<=now() on conflict do nothing;
revoke all on all functions in schema knogo_private from public,anon,authenticated;
commit;
