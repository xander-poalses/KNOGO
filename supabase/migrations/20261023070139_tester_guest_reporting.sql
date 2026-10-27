-- Tester Reporting
begin;

create table knogo_private.testing_settings (
 id boolean primary key default true check(id),
 guest_reporting_enabled boolean not null default false
);
insert into knogo_private.testing_settings default values;
alter table knogo_private.testing_settings enable row level security;
revoke all on knogo_private.testing_settings from public,anon,authenticated;

create function knogo_private.test_guests_enabled() returns boolean
language sql stable set search_path='' as $$
 select coalesce((select guest_reporting_enabled from knogo_private.testing_settings where id),false);
$$;
revoke all on function knogo_private.test_guests_enabled() from public,anon,authenticated;

do $$
declare signature text; definition text; updated text;
begin
 foreach signature in array array[
  'knogo_private.capture_report(text,text,text,jsonb)',
  'knogo_private.report_notice_account()',
  'public.read_place_trust(text)',
  'public.read_report_assessment(uuid)'
 ] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  updated:=replace(definition,'not coalesce(u.is_anonymous,false)',
   '(not coalesce(u.is_anonymous,false) or knogo_private.test_guests_enabled())');
  updated:=replace(updated,'not coalesce(is_anonymous,false)',
   '(not coalesce(is_anonymous,false) or knogo_private.test_guests_enabled())');
  if updated=definition then raise exception 'Guest report guard missing in %',signature; end if;
  execute updated;
 end loop;
end;
$$;

create or replace view knogo_private.reviewable_reports with (security_invoker=true) as
 select b.* from public.report_batches b
 join public.places p on p.id=b.place_id and p.is_active
 join auth.users u on u.id=b.user_id and (not coalesce(u.is_anonymous,false) or knogo_private.test_guests_enabled())
 join knogo_private.report_review_notices n on n.user_id=b.user_id and n.version='2026-10-19' and n.accepted_at<=b.created_at
 where b.created_at>now()-interval '4 hours' and b.created_at<=now()
 and not exists(select 1 from public.blocked_contributors bc where bc.user_id=b.user_id and (bc.blocked_until is null or bc.blocked_until>now()));
revoke all on knogo_private.reviewable_reports from public,anon,authenticated;

commit;
