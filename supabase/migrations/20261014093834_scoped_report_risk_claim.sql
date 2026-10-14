begin;

create function public.claim_report_risk_job(p_actor_id uuid, p_place_id text)
returns table(report_id uuid, lease_id uuid)
language plpgsql security definer set search_path='' as $$
begin
  if p_actor_id is null or p_place_id is null or btrim(p_place_id)='' then
    raise exception 'Report review scope required';
  end if;
  update knogo_private.report_risk_jobs j
  set state=case when j.expires_at<=now() then 'expired' else 'exhausted' end,
      finished_at=now(),lease_id=null,lease_until=null
  from public.report_batches b
  where b.id=j.report_id and b.user_id=p_actor_id and b.place_id=p_place_id
    and j.state in ('waiting','leased')
    and (j.expires_at<=now() or (j.attempts>=3 and coalesce(j.lease_until,now())<=now()));
  return query
  with ready as (
    select j.report_id from knogo_private.report_risk_jobs j
    join public.report_batches b on b.id=j.report_id
    where b.user_id=p_actor_id and b.place_id=p_place_id
      and j.state in ('waiting','leased') and j.available_at<=now() and j.expires_at>now()
      and j.attempts<3 and (j.lease_until is null or j.lease_until<=now())
    order by j.available_at,j.report_id limit 1 for update of j skip locked
  )
  update knogo_private.report_risk_jobs j
  set state='leased',attempts=j.attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes'
  from ready where j.report_id=ready.report_id returning j.report_id,j.lease_id;
end;
$$;
revoke all on function public.claim_report_risk_job(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_report_risk_job(uuid,text) to service_role;

commit;
