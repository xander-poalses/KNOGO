begin;
create or replace function public.read_report_assessment(p_report_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare report public.report_batches%rowtype; assessment knogo_private.report_risk_assessments%rowtype;
 job knogo_private.report_risk_jobs%rowtype; receipt_state text; reason text; retry_at timestamptz; readiness jsonb;
begin
 select b.* into report from public.report_batches b join auth.users u on u.id=b.user_id
 where b.id=p_report_id and b.user_id=auth.uid() and not coalesce(u.is_anonymous,false);
 if not found then return null; end if;
 select a.* into assessment from knogo_private.report_risk_assessments a where a.report_batch_id=report.id order by a.assessed_at desc,a.id desc limit 1;
 select j.* into job from knogo_private.report_risk_jobs j where j.report_id=report.id;
 if report.created_at+interval '4 hours'<=now() or job.state='expired' then receipt_state:='expired';
 elsif assessment.outcome='assessed' and assessment.expires_at>now() then receipt_state:='complete';
 elsif not exists(select 1 from knogo_private.reviewable_reports where id=report.id) then receipt_state:='unavailable';reason:='notice';
 elsif job.state='exhausted' then receipt_state:='unavailable';reason:='attempts';
 else
  readiness:=public.report_risk_readiness();
  if readiness->>'reason'='disabled' then receipt_state:='unavailable';reason:='disabled';
  elsif not coalesce((select dispatch_enabled from knogo_private.report_automation where id),false)
   or not exists(select 1 from vault.secrets where name='knogo_risk_worker_secret') or job.last_outcome='disabled' then
   receipt_state:='unavailable';reason:='setup';
  elsif job.state='leased' and job.lease_until>now() then receipt_state:='reviewing';
  elsif job.state in ('waiting','leased') then
   receipt_state:='queued';
   if readiness->>'reason'='quota' or (job.last_outcome='quota' and job.available_at>now()) then
    reason:='quota';retry_at:=greatest((readiness->>'retryAt')::timestamptz,job.available_at);
   elsif job.available_at>now() then retry_at:=job.available_at;
   end if;
  else receipt_state:='unavailable';reason:='setup';
  end if;
 end if;
 return jsonb_build_object('reportId',report.id,'state',receipt_state,
  'risk',case when receipt_state='complete' then assessment.risk end,
  'model',case when receipt_state='complete' then assessment.model end,
  'assessedAt',case when receipt_state='complete' then assessment.assessed_at end,
  'reason',reason,'retryAt',retry_at);
end;
$$;
revoke all on function public.read_report_assessment(uuid) from public,anon;
grant execute on function public.read_report_assessment(uuid) to authenticated;
commit;
