begin;

create function public.read_report_assessment(p_report_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
  report public.report_batches%rowtype;
  assessment knogo_private.report_risk_assessments%rowtype;
  job knogo_private.report_risk_jobs%rowtype;
  receipt_state text;
begin
  select b.* into report from public.report_batches b
  join auth.users u on u.id=b.user_id
  where b.id=p_report_id and b.user_id=auth.uid() and not u.is_anonymous;
  if not found then return null; end if;

  select a.* into assessment from knogo_private.report_risk_assessments a
  where a.report_batch_id=report.id order by a.assessed_at desc,a.id desc limit 1;
  select j.* into job from knogo_private.report_risk_jobs j where j.report_id=report.id;

  if report.created_at+interval '4 hours'<=now() or job.state='expired' then
    receipt_state:='expired';
  elsif assessment.outcome='assessed' and assessment.expires_at>now() then
    receipt_state:='complete';
  elsif job.state='exhausted'
    or not coalesce((select enabled from knogo_private.provider_limits where provider='gemini'),false) then
    receipt_state:='unavailable';
  elsif job.state='leased' and job.lease_until>now() then
    receipt_state:='reviewing';
  elsif job.state in ('waiting','leased') then
    receipt_state:='queued';
  else
    receipt_state:='unavailable';
  end if;

  -- No other reporters, pattern reasons or worker credentials leave this boundary.
  return jsonb_build_object(
    'reportId',report.id,'state',receipt_state,
    'risk',case when receipt_state='complete' then assessment.risk end,
    'model',case when receipt_state='complete' then assessment.model end,
    'assessedAt',case when receipt_state='complete' then assessment.assessed_at end
  );
end;
$$;
revoke all on function public.read_report_assessment(uuid) from public,anon;
grant execute on function public.read_report_assessment(uuid) to authenticated;

commit;
