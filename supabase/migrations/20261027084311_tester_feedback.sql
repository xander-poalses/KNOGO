begin;

create table knogo_private.tester_feedback (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('suggestion','bug')),
 message text not null check (char_length(btrim(message)) between 10 and 2000),
 app_version text not null check (char_length(btrim(app_version)) between 1 and 64),
 created_at timestamptz not null default now()
);
create index tester_feedback_user_created on knogo_private.tester_feedback(user_id,created_at);
alter table knogo_private.tester_feedback enable row level security;
revoke all on knogo_private.tester_feedback from public,anon,authenticated;
grant select,delete on knogo_private.tester_feedback to service_role;

create function public.submit_tester_feedback(p_kind text,p_message text,p_app_version text) returns uuid
language plpgsql security definer set search_path='' as $$
declare tester uuid:=auth.uid(); receipt uuid;
begin
 if tester is null or not exists(select 1 from auth.users where id=tester and raw_app_meta_data->'tester_feedback'='true'::jsonb) then
  raise exception 'This account is not approved for tester feedback.' using errcode='42501';
 end if;
 if p_kind is null or p_kind not in ('suggestion','bug') or p_message is null or char_length(btrim(p_message)) not between 10 and 2000 or p_app_version is null or char_length(btrim(p_app_version)) not between 1 and 64 then
  raise exception 'Invalid feedback.' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('tester-feedback:'||tester::text,0));
 if (select count(*) from knogo_private.tester_feedback where user_id=tester and created_at>now()-interval '1 hour')>=5 then
  raise exception 'You have sent five messages this hour. Try again later.' using errcode='P0001';
 end if;
 insert into knogo_private.tester_feedback(user_id,kind,message,app_version) values(tester,p_kind,btrim(p_message),btrim(p_app_version)) returning id into receipt;
 return receipt;
end;
$$;
revoke all on function public.submit_tester_feedback(text,text,text) from public,anon;
grant execute on function public.submit_tester_feedback(text,text,text) to authenticated;

commit;
