begin;

create view knogo_private.reviewable_reports with (security_invoker=true) as
 select b.* from public.report_batches b
 join public.places p on p.id=b.place_id and p.is_active
 join auth.users u on u.id=b.user_id and not coalesce(u.is_anonymous,false)
 join knogo_private.report_review_notices n on n.user_id=b.user_id and n.version='2026-10-19' and n.accepted_at<=b.created_at
 where b.created_at>now()-interval '4 hours' and b.created_at<=now()
 and not exists(select 1 from public.blocked_contributors bc where bc.user_id=b.user_id and (bc.blocked_until is null or bc.blocked_until>now()));
revoke all on knogo_private.reviewable_reports from public,anon,authenticated;

create function public.report_risk_readiness() returns jsonb
language plpgsql security definer set search_path='' as $$
declare limits knogo_private.provider_limits%rowtype; recent timestamptz[]; retry_at timestamptz; used integer; request_time timestamptz:=clock_timestamp();
begin
 select * into limits from knogo_private.provider_limits where provider='gemini';
 if not coalesce(limits.enabled,false) then return jsonb_build_object('ready',false,'reason','disabled','retryAt',null); end if;
 select coalesce(array_agg(t order by t),'{}') into recent
 from knogo_private.provider_call_windows w cross join lateral unnest(w.reserved_at) as times(t)
 where w.provider='gemini' and t>request_time-interval '25 hours';
 if cardinality(recent)>=limits.daily_limit then retry_at:=recent[cardinality(recent)-limits.daily_limit+1]+interval '25 hours'; end if;
 select calls into used from knogo_private.provider_usage where provider='gemini' and day=(request_time at time zone 'UTC')::date;
 if coalesce(used,0)>=limits.daily_limit then retry_at:=greatest(retry_at,((request_time at time zone 'UTC')::date+1)::timestamp at time zone 'UTC'); end if;
 if (select count(*) from unnest(recent) t where t>request_time-interval '60 seconds')>=limits.minute_limit then
  retry_at:=greatest(retry_at,recent[cardinality(recent)-limits.minute_limit+1]+interval '60 seconds');
 end if;
 return jsonb_build_object('ready',retry_at is null,'reason',case when retry_at is null then null else 'quota' end,'retryAt',retry_at);
end;
$$;
revoke all on function public.report_risk_readiness() from public,anon,authenticated;
grant execute on function public.report_risk_readiness() to service_role;

create or replace function public.claim_report_risk_job() returns table(report_id uuid,lease_id uuid)
language plpgsql security definer set search_path='' as $$
begin
 update knogo_private.report_risk_jobs j set state=case when j.expires_at<=now() then 'expired' else 'exhausted' end,
  finished_at=now(),lease_id=null,lease_until=null
 where j.state in ('waiting','leased') and (j.expires_at<=now() or (j.attempts>=3 and coalesce(j.lease_until,now())<=now()));
 if not (public.report_risk_readiness()->>'ready')::boolean then return; end if;
 return query with ready as (
  select j.report_id from knogo_private.report_risk_jobs j join knogo_private.reviewable_reports b on b.id=j.report_id
  where j.state in ('waiting','leased') and j.available_at<=now() and j.expires_at>now()
   and j.attempts<3 and (j.lease_until is null or j.lease_until<=now())
  order by j.available_at,j.report_id limit 1 for update of j skip locked
 ) update knogo_private.report_risk_jobs j set state='leased',attempts=j.attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 from ready where j.report_id=ready.report_id returning j.report_id,j.lease_id;
end;
$$;

create or replace function public.report_risk_context(p_report_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from knogo_private.reviewable_reports where id=p_report_id) then return null; end if;
 return (select jsonb_agg(to_jsonb(records)) from (
  select b.id as report_id,b.user_id as actor_id,b.place_id as venue_id,b.report_source as method,
   floor(extract(epoch from b.created_at)/300) as time_bucket,
   (select jsonb_agg(jsonb_build_object('type',c.confirmation_type,'value',c.value) order by c.confirmation_type) from public.confirmations c where c.report_batch_id=b.id) as answers
  from knogo_private.reviewable_reports b
  order by (b.id=p_report_id) desc,b.created_at desc,b.id limit 100
 ) records);
end;
$$;

create or replace function public.record_report_risk(p_report_id uuid,p_risk text,p_reasons text[],p_model text,p_outcome text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from knogo_private.reviewable_reports where id=p_report_id) then return; end if;
 if p_outcome<>'assessed' then p_risk:='unknown';p_reasons:='{}'; end if;
 if p_risk is null or p_risk not in ('low','medium','high','unknown') or p_reasons is null or cardinality(p_reasons)>6 or
  not p_reasons<@array['timing_cluster','repeated_pattern','cross_venue_burst','source_concentration','insufficient_context','no_pattern_detected']::text[] then raise exception 'Risk result is not valid.' using errcode='22023'; end if;
 if 'insufficient_context'=any(p_reasons) then p_risk:='unknown'; end if;
 insert into knogo_private.report_risk_assessments(report_batch_id,risk,reasons,model,outcome,expires_at)
 select id,p_risk,p_reasons,p_model,p_outcome,created_at+interval '4 hours' from public.report_batches where id=p_report_id;
 insert into knogo_private.trust_decisions(report_batch_id,states) values(p_report_id,jsonb_build_object('assessment_outcome',p_outcome,'risk',p_risk));
end;
$$;

create or replace function public.finish_report_risk_job(p_report_id uuid,p_lease_id uuid,p_risk text,p_reasons text[],p_model text,p_outcome text) returns boolean
language plpgsql security definer set search_path='' as $$
declare job knogo_private.report_risk_jobs%rowtype; waiting boolean; terminal boolean;
begin
 select * into job from knogo_private.report_risk_jobs j where j.report_id=p_report_id for update;
 if not found or job.state<>'leased' or job.lease_id is distinct from p_lease_id or job.lease_until<=now() or job.expires_at<=now()
  or not exists(select 1 from knogo_private.reviewable_reports where id=p_report_id) then return false; end if;
 if p_outcome is null or p_outcome not in ('assessed','disabled','quota','malformed','timeout','provider_error') then raise exception 'Risk outcome is not valid.' using errcode='22023'; end if;
 waiting:=p_outcome in ('quota','disabled');
 if not waiting then perform public.record_report_risk(p_report_id,p_risk,p_reasons,p_model,p_outcome); end if;
 terminal:=p_outcome='assessed' or (not waiting and job.attempts>=3);
 update knogo_private.report_risk_jobs j set state=case when p_outcome='assessed' then 'complete' when terminal then 'exhausted' else 'waiting' end,
  attempts=case when waiting then greatest(0,j.attempts-1) else j.attempts end,
  available_at=now()+case when waiting then interval '1 minute' else make_interval(secs=>30*power(4,job.attempts-1)::integer) end,
  last_outcome=p_outcome,finished_at=case when terminal then now() end,lease_id=null,lease_until=null
 where j.report_id=p_report_id;
 return true;
end;
$$;

-- The former fixture overload cannot bypass account eligibility.
revoke execute on function public.claim_report_risk_job(uuid,text) from service_role;

commit;
