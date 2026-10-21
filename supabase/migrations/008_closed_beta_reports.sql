-- Closed Beta Reports

create table if not exists public.report_batches (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  report_source text not null check (report_source in ('in_person', 'phone', 'online')),
  source_url text,
  outcome text not null default 'pending' check (outcome in ('pending', 'accepted', 'conflict')),
  accepted_signals text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint report_batches_online_source_check check (
    report_source <> 'online' or source_url ~* '^https?://'
  ),
  constraint report_batches_source_url_length check (source_url is null or length(source_url) <= 2048)
);

alter table public.confirmations
  add column if not exists report_batch_id uuid references public.report_batches(id) on delete cascade;

create table if not exists public.blocked_contributors (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason text not null,
  blocked_at timestamptz not null default now(),
  blocked_until timestamptz
);

create table if not exists public.report_audit_log (
  id bigint generated always as identity primary key,
  report_batch_id uuid not null references public.report_batches(id) on delete cascade,
  action text not null check (action in ('submitted', 'accepted', 'conflict', 'blocked')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.kitchen_hours_submissions (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_of_week text not null,
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  constraint kitchen_hours_day_check check (day_of_week in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  constraint kitchen_hours_time_check check (is_closed or (open_time is not null and close_time is not null))
);

create index if not exists report_batches_place_created_idx on public.report_batches(place_id, created_at desc);
create index if not exists report_batches_user_created_idx on public.report_batches(user_id, created_at desc);
create index if not exists confirmations_consensus_idx on public.confirmations(place_id, confirmation_type, value, created_at desc);
create index if not exists kitchen_hours_consensus_idx on public.kitchen_hours_submissions(place_id, day_of_week, created_at desc);

drop trigger if exists apply_confirmation_after_insert on public.confirmations;
drop function if exists public.apply_confirmation_to_live_status();

drop policy if exists "Users can insert own confirmations" on public.confirmations;
revoke all on public.confirmations from anon, authenticated;

alter table public.report_batches enable row level security;
alter table public.blocked_contributors enable row level security;
alter table public.report_audit_log enable row level security;
alter table public.kitchen_hours_submissions enable row level security;

create policy "Users can read own report batches"
on public.report_batches for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own confirmations"
on public.confirmations for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read own kitchen hour submissions"
on public.kitchen_hours_submissions for select to authenticated
using ((select auth.uid()) = user_id);

grant select on public.report_batches, public.confirmations, public.kitchen_hours_submissions to authenticated;
revoke all on public.blocked_contributors, public.report_audit_log from anon, authenticated;

create or replace function public.submit_status_report(
  p_place_id text,
  p_report_source text,
  p_source_url text,
  p_answers jsonb
)
returns table (
  report_id uuid,
  outcome text,
  accepted_signals text[],
  confirmations jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
  v_answer jsonb;
  v_type text;
  v_value text;
  v_matches integer;
  v_other_values integer;
  v_accepted text[] := '{}';
  v_conflict boolean := false;
begin
  if v_user_id is null then raise exception 'You need to sign in before reporting a status.' using errcode = '42501'; end if;
  if not exists (select 1 from public.places where id = p_place_id and is_active) then raise exception 'This place is not available.' using errcode = '22023'; end if;
  if p_report_source not in ('in_person', 'phone', 'online') then raise exception 'Choose how you checked this place.' using errcode = '22023'; end if;
  if p_report_source = 'online' and coalesce(p_source_url, '') !~* '^https?://' then raise exception 'Add a valid source page.' using errcode = '22023'; end if;
  if jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) = 0 or jsonb_array_length(p_answers) > 6 then raise exception 'Submit between one and six answers.' using errcode = '22023'; end if;
  if exists (select 1 from public.blocked_contributors where user_id = v_user_id and (blocked_until is null or blocked_until > now())) then raise exception 'This account cannot submit reports.' using errcode = '42501'; end if;
  if exists (select 1 from public.report_batches where user_id = v_user_id and place_id = p_place_id and created_at > now() - interval '15 minutes') then raise exception 'Please wait before reporting this place again.' using errcode = '42900'; end if;
  if (select count(*) from public.report_batches where user_id = v_user_id and created_at > now() - interval '24 hours') >= 30 then raise exception 'Daily report limit reached. Try again tomorrow.' using errcode = '42900'; end if;

  for v_answer in select value from jsonb_array_elements(p_answers)
  loop
    v_type := v_answer->>'type';
    v_value := trim(v_answer->>'value');
    if not (
      (v_type = 'open_status' and v_value in ('open', 'closed')) or
      (v_type = 'kitchen_status' and v_value in ('yes', 'no')) or
      (v_type = 'busy_level' and v_value in ('quiet', 'normal', 'busy', 'packed')) or
      (v_type = 'walk_ins' and v_value in ('yes', 'no')) or
      (v_type = 'card_machine' and v_value in ('yes', 'no', 'cash_only')) or
      (v_type = 'backup_power' and v_value in ('normal', 'limited', 'closed'))
    ) then
      raise exception 'A report answer is not valid.' using errcode = '22023';
    end if;
  end loop;
  if (select count(distinct item->>'type') from jsonb_array_elements(p_answers) item) <> jsonb_array_length(p_answers) then
    raise exception 'Submit each status once.' using errcode = '22023';
  end if;

  insert into public.report_batches (place_id, user_id, report_source, source_url)
  values (p_place_id, v_user_id, p_report_source, case when p_report_source = 'online' then trim(p_source_url) else null end)
  returning id into v_report_id;

  insert into public.confirmations (place_id, user_id, confirmation_type, value, location_verified, report_batch_id)
  select p_place_id, v_user_id, item->>'type', trim(item->>'value'), false, v_report_id
  from jsonb_array_elements(p_answers) item;

  for v_answer in select value from jsonb_array_elements(p_answers)
  loop
    v_type := v_answer->>'type';
    v_value := trim(v_answer->>'value');
    select count(distinct user_id) into v_matches
    from public.confirmations
    where place_id = p_place_id and confirmation_type = v_type and value = v_value and created_at >= now() - interval '4 hours';
    select count(distinct value) into v_other_values
    from public.confirmations
    where place_id = p_place_id and confirmation_type = v_type and value <> v_value and created_at >= now() - interval '4 hours';

    if v_matches >= 2 then
      v_accepted := array_append(v_accepted, v_type);
      insert into public.live_statuses (place_id, busy_level, last_confirmed_at, confidence_score, source, updated_at)
      values (p_place_id, 'unknown', now(), 76, 'community', now())
      on conflict (place_id) do update set last_confirmed_at = now(), confidence_score = 76, source = 'community', updated_at = now();

      if v_type = 'open_status' then
        update public.live_statuses set is_open = (v_value = 'open'), is_service_available = case when v_value = 'closed' then false else is_service_available end where place_id = p_place_id;
      elsif v_type = 'kitchen_status' then
        update public.live_statuses set is_service_available = (v_value = 'yes') where place_id = p_place_id;
      elsif v_type = 'busy_level' and v_value in ('quiet', 'normal', 'busy', 'packed') then
        update public.live_statuses set busy_level = v_value where place_id = p_place_id;
      elsif v_type = 'walk_ins' and v_value in ('yes', 'no') then
        update public.live_statuses set accepts_walk_ins = (v_value = 'yes') where place_id = p_place_id;
      elsif v_type = 'card_machine' and v_value in ('yes', 'no', 'cash_only') then
        update public.live_statuses set card_machine_working = (v_value = 'yes') where place_id = p_place_id;
      elsif v_type = 'backup_power' and v_value in ('normal', 'limited', 'closed') then
        update public.live_statuses set has_backup_power = (v_value = 'normal') where place_id = p_place_id;
      end if;
    elsif v_other_values > 0 then
      v_conflict := true;
    end if;
  end loop;

  update public.report_batches
  set outcome = case when cardinality(v_accepted) > 0 then 'accepted' when v_conflict then 'conflict' else 'pending' end,
      accepted_signals = v_accepted
  where id = v_report_id;

  insert into public.report_audit_log (report_batch_id, action, details)
  values (v_report_id, case when cardinality(v_accepted) > 0 then 'accepted' when v_conflict then 'conflict' else 'submitted' end,
    jsonb_build_object('accepted_signals', v_accepted));

  insert into public.profiles (user_id, contribution_count) values (v_user_id, jsonb_array_length(p_answers))
  on conflict (user_id) do update set contribution_count = public.profiles.contribution_count + excluded.contribution_count, updated_at = now();

  return query select v_report_id,
    case when cardinality(v_accepted) > 0 then 'accepted' when v_conflict then 'conflict' else 'pending' end,
    v_accepted,
    coalesce((select jsonb_agg(to_jsonb(c)) from public.confirmations c where c.report_batch_id = v_report_id), '[]'::jsonb);
end;
$$;

revoke all on function public.submit_status_report(text, text, text, jsonb) from public, anon;
grant execute on function public.submit_status_report(text, text, text, jsonb) to authenticated;

create or replace function public.submit_kitchen_hours(
  p_place_id text,
  p_day_of_week text,
  p_open_time time,
  p_close_time time,
  p_is_closed boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_matches integer;
  v_sort integer;
begin
  if v_user_id is null then raise exception 'You need to sign in before submitting kitchen hours.' using errcode = '42501'; end if;
  if p_day_of_week not in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') then raise exception 'Choose a valid day.' using errcode = '22023'; end if;
  if not p_is_closed and (p_open_time is null or p_close_time is null) then raise exception 'Add opening and closing times.' using errcode = '22023'; end if;
  if exists (select 1 from public.blocked_contributors where user_id = v_user_id and (blocked_until is null or blocked_until > now())) then raise exception 'This account cannot submit hours.' using errcode = '42501'; end if;

  insert into public.kitchen_hours_submissions (place_id, user_id, day_of_week, open_time, close_time, is_closed)
  values (p_place_id, v_user_id, p_day_of_week, p_open_time, p_close_time, p_is_closed);

  select count(distinct user_id) into v_matches from public.kitchen_hours_submissions
  where place_id = p_place_id and day_of_week = p_day_of_week and open_time is not distinct from p_open_time
    and close_time is not distinct from p_close_time and is_closed = p_is_closed;

  if v_matches >= 5 then
    v_sort := array_position(array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'], p_day_of_week);
    delete from public.place_hours where place_id = p_place_id and hours_type = 'kitchen' and day_of_week = p_day_of_week;
    insert into public.place_hours (place_id, hours_type, day_of_week, open_time, close_time, is_closed, sort_order)
    values (p_place_id, 'kitchen', p_day_of_week, p_open_time, p_close_time, p_is_closed, v_sort);
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.submit_kitchen_hours(text, text, time, time, boolean) from public, anon;
grant execute on function public.submit_kitchen_hours(text, text, time, time, boolean) to authenticated;

create or replace view public.current_live_statuses
with (security_invoker = true)
as
select
  place_id,
  case when source = 'community' and last_confirmed_at < now() - interval '4 hours' then null else is_open end as is_open,
  case when source = 'community' and last_confirmed_at < now() - interval '4 hours' then null else is_service_available end as is_service_available,
  case when source = 'community' and last_confirmed_at < now() - interval '4 hours' then null else accepts_walk_ins end as accepts_walk_ins,
  case when source = 'community' and last_confirmed_at < now() - interval '4 hours' then 'unknown' else busy_level end as busy_level,
  case when source = 'community' and last_confirmed_at < now() - interval '4 hours' then null else has_backup_power end as has_backup_power,
  case when source = 'community' and last_confirmed_at < now() - interval '4 hours' then null else card_machine_working end as card_machine_working,
  case when source = 'community' and last_confirmed_at < now() - interval '4 hours' then null else last_confirmed_at end as last_confirmed_at,
  case when source = 'community' and last_confirmed_at < now() - interval '4 hours' then 0 else confidence_score end as confidence_score,
  case when source = 'community' and last_confirmed_at < now() - interval '4 hours' then 'unknown' else source end as source,
  updated_at
from public.live_statuses;

grant select on public.current_live_statuses to anon, authenticated;
