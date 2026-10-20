begin;

create table knogo_private.report_review_notices (
 user_id uuid primary key references auth.users(id) on delete cascade,
 version text not null check (version='2026-10-19'),
 accepted_at timestamptz not null default now()
);
alter table knogo_private.report_review_notices enable row level security;
revoke all on knogo_private.report_review_notices from public,anon,authenticated;

create function knogo_private.report_notice_account() returns uuid
language plpgsql security definer set search_path='' as $$
declare reporter uuid:=auth.uid();
begin
 if reporter is null or not exists(select 1 from auth.users where id=reporter and not coalesce(is_anonymous,false)) then
  raise exception 'Sign in before reviewing the report notice.' using errcode='42501';
 end if;
 if exists(select 1 from public.blocked_contributors where user_id=reporter and (blocked_until is null or blocked_until>now())) then
  raise exception 'This account cannot submit reports.' using errcode='42501';
 end if;
 return reporter;
end;
$$;
revoke all on function knogo_private.report_notice_account() from public,anon,authenticated;

create function public.read_report_review_notice() returns jsonb
language plpgsql security definer set search_path='' as $$
declare reporter uuid:=knogo_private.report_notice_account();
begin
 return jsonb_build_object('version','2026-10-19','accepted',exists(
  select 1 from knogo_private.report_review_notices where user_id=reporter and version='2026-10-19'
 ));
end;
$$;

create function public.accept_report_review_notice(p_version text,p_adult_confirmed boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare reporter uuid:=knogo_private.report_notice_account();
begin
 if p_version is distinct from '2026-10-19' then raise exception 'Read the report notice again.' using errcode='22023'; end if;
 if p_adult_confirmed is distinct from true then raise exception 'Reporting is for testers aged 18 or over.' using errcode='22023'; end if;
 insert into knogo_private.report_review_notices(user_id,version) values(reporter,p_version)
 on conflict(user_id) do nothing;
 return public.read_report_review_notice();
end;
$$;
revoke all on function public.read_report_review_notice() from public,anon;
revoke all on function public.accept_report_review_notice(text,boolean) from public,anon;
grant execute on function public.read_report_review_notice(),public.accept_report_review_notice(text,boolean) to authenticated;

create or replace function public.submit_status_report(p_place_id text,p_report_source text,p_source_url text,p_answers jsonb)
returns table(report_id uuid,outcome text,accepted_signals text[],confirmations jsonb)
language plpgsql security definer set search_path='' as $$
declare reporter uuid:=knogo_private.report_notice_account(); saved record; snapshot jsonb; states jsonb; result_state text;
begin
 if not exists(select 1 from knogo_private.report_review_notices where user_id=reporter and version='2026-10-19') then
  raise exception 'Open Leave a report again and accept the report notice before submitting.' using errcode='42501';
 end if;
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

commit;
