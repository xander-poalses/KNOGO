\set ON_ERROR_STOP on
-- Local Docker demo only. Invented venues/reports; no Gemini assessments.
begin;
do $$
begin
  if (select count(*) from auth.users where email like 'milestone-browser-%@example.test' and email_confirmed_at is not null)<2 then
    raise exception 'Two confirmed browser test accounts are required.';
  end if;
end;
$$;

insert into public.places(id,slug,name,category_id,region_id,address,latitude,longitude,is_active)
values
  ('milestone-expired-venue','milestone-expired-venue','Expired Report Test','restaurant','pretoria','Test fixture, not a destination',0,0,true),
  ('milestone-conflict-venue','milestone-conflict-venue','Conflicting Reports Test','restaurant','pretoria','Test fixture, not a destination',0,0,true)
on conflict(id) do nothing;

with reporters as (
  select id,row_number() over(order by created_at,id) as n from auth.users
  where email like 'milestone-browser-%@example.test' and email_confirmed_at is not null
), fixtures(id,place_id,reporter,method,reported_at) as (
  values
    ('e0000000-0000-4000-8000-000000000001'::uuid,'milestone-expired-venue',1,'phone',now()-interval '5 hours'),
    ('e0000000-0000-4000-8000-000000000002'::uuid,'milestone-conflict-venue',1,'phone',now()),
    ('e0000000-0000-4000-8000-000000000003'::uuid,'milestone-conflict-venue',2,'in_person',now())
)
insert into public.report_batches(id,place_id,user_id,report_source,created_at)
select f.id,f.place_id,r.id,f.method,f.reported_at from fixtures f join reporters r on r.n=f.reporter
on conflict(id) do nothing;

insert into public.confirmations(id,place_id,user_id,confirmation_type,value,location_verified,created_at,report_batch_id)
select b.id,b.place_id,b.user_id,'open_status',
  case when b.id='e0000000-0000-4000-8000-000000000003'::uuid then 'closed' else 'open' end,
  false,b.created_at,b.id
from public.report_batches b where b.id in
  ('e0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000003')
on conflict(id) do nothing;

do $$
begin
  if (public.read_place_trust('milestone-expired-venue')#>>'{claims,open_status,state}') is distinct from 'unknown' then
    raise exception 'Expired fixture must not provide a live answer.';
  end if;
  if (public.read_place_trust('milestone-conflict-venue')#>>'{claims,open_status,state}') is distinct from 'disagree' then
    raise exception 'Conflict fixture must retain disagreement. Its reports expire after four hours.';
  end if;
  if (select count(*) from knogo_private.report_risk_assessments where report_batch_id in
    ('e0000000-0000-4000-8000-000000000001','e0000000-0000-4000-8000-000000000002','e0000000-0000-4000-8000-000000000003'))<>0 then
    raise exception 'These fixtures must not claim a Gemini assessment.';
  end if;
end;
$$;
commit;
\echo PASS: expired report is unknown; opposing reports disagree; no Gemini assessments inserted.
