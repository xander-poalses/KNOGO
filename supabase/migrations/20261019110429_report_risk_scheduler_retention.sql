-- Report Risk Scheduler Retention
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

begin;
create table knogo_private.report_automation (
 id boolean primary key default true check(id),
 dispatch_enabled boolean not null default false,
 retention_enabled boolean not null default false,
 worker_url text not null default 'https://ivzofixdjcgkwalfzmmy.supabase.co/functions/v1/report-risk'
  check(worker_url='https://ivzofixdjcgkwalfzmmy.supabase.co/functions/v1/report-risk'),
 request_id bigint,
 dispatched_at timestamptz,
 last_state text check(last_state in ('disabled','idle','quota','missing_secret','pending','dispatched'))
);
insert into knogo_private.report_automation(id) values(true);
alter table knogo_private.report_automation enable row level security;
revoke all on knogo_private.report_automation from public,anon,authenticated;

create function knogo_private.dispatch_report_risk() returns bigint
language plpgsql security definer set search_path='' as $$
declare config knogo_private.report_automation%rowtype; worker_secret text; request bigint; readiness jsonb;
begin
 select * into config from knogo_private.report_automation where id for update skip locked;
 if not found then return null; end if;
 if not config.dispatch_enabled then
  update knogo_private.report_automation set last_state='disabled' where id; return null;
 end if;
 if config.dispatched_at>now()-interval '3 minutes' and not exists(select 1 from net._http_response where id=config.request_id and status_code between 200 and 599) then
  update knogo_private.report_automation set last_state='pending' where id; return null;
 end if;
 readiness:=public.report_risk_readiness();
 if not (readiness->>'ready')::boolean then
  update knogo_private.report_automation set last_state=case when readiness->>'reason'='quota' then 'quota' else 'disabled' end where id; return null;
 end if;
 if not exists(select 1 from knogo_private.report_risk_jobs j join knogo_private.reviewable_reports b on b.id=j.report_id
  where j.state in ('waiting','leased') and j.attempts<3 and j.available_at<=now() and j.expires_at>now() and coalesce(j.lease_until,now())<=now()) then
  update knogo_private.report_automation set last_state='idle' where id; return null;
 end if;
 select decrypted_secret into worker_secret from vault.decrypted_secrets where name='knogo_risk_worker_secret';
 if coalesce(length(worker_secret),0)=0 then
  update knogo_private.report_automation set last_state='missing_secret' where id; return null;
 end if;
 request:=net.http_post(url:=config.worker_url,body:='{}'::jsonb,
  headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||worker_secret),timeout_milliseconds:=55000);
 update knogo_private.report_automation set request_id=request,dispatched_at=now(),last_state='dispatched' where id;
 return request;
end;
$$;
revoke all on function knogo_private.dispatch_report_risk() from public,anon,authenticated;

create index report_batches_retention_idx on public.report_batches(created_at,id);
create index confirmations_legacy_retention_idx on public.confirmations(created_at,id) where report_batch_id is null;

create function knogo_private.purge_expired_reports(p_batch_size integer default 500) returns jsonb
language plpgsql security definer set search_path='' as $$
declare removed integer; legacy integer;
begin
 if p_batch_size is null or p_batch_size not between 1 and 1000 then raise exception 'Choose a batch size between 1 and 1000.' using errcode='22023'; end if;
 if not coalesce((select retention_enabled from knogo_private.report_automation where id),false) then return jsonb_build_object('reports',0,'legacyConfirmations',0); end if;
 with expired as (
  select id from public.report_batches where created_at<now()-interval '24 hours'
  order by created_at,id limit p_batch_size for update skip locked
 ) delete from public.report_batches b using expired e where b.id=e.id;
 get diagnostics removed=row_count;
 with expired as (
  select id from public.confirmations where report_batch_id is null and created_at<now()-interval '24 hours'
  order by created_at,id limit p_batch_size for update skip locked
 ) delete from public.confirmations c using expired e where c.id=e.id;
 get diagnostics legacy=row_count;
 delete from knogo_private.provider_usage where provider='gemini' and day<(now() at time zone 'UTC')::date-2;
 update knogo_private.provider_call_windows w set reserved_at=array(select t from unnest(w.reserved_at) t where t>clock_timestamp()-interval '25 hours') where provider='gemini';
 delete from cron.job_run_details where ctid in (
  select d.ctid from cron.job_run_details d join cron.job j on j.jobid=d.jobid
  where j.jobname in ('knogo-report-risk','knogo-report-retention') and d.end_time<now()-interval '24 hours'
  order by d.end_time limit 2000
 );
 return jsonb_build_object('reports',removed,'legacyConfirmations',legacy);
end;
$$;
revoke all on function knogo_private.purge_expired_reports(integer) from public,anon,authenticated;

select cron.schedule('knogo-report-risk','* * * * *','select knogo_private.dispatch_report_risk();');
select cron.schedule('knogo-report-retention','17 * * * *','select knogo_private.purge_expired_reports();');
select cron.alter_job(jobid,active:=false) from cron.job where jobname in ('knogo-report-risk','knogo-report-retention');
commit;
