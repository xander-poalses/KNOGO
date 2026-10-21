-- Checkin Hardening
begin;

alter table public.live_statuses add column if not exists signal_confirmed_at jsonb not null default '{}'::jsonb;

create or replace function public.submit_status_report(
  p_place_id text, p_report_source text, p_source_url text, p_answers jsonb
)
returns table (report_id uuid, outcome text, accepted_signals text[], confirmations jsonb)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_report_id uuid;
  v_answer jsonb;
  v_type text;
  v_value text;
  v_matches integer;
  v_other_values integer;
  v_confirmed_at timestamptz;
  v_accepted text[] := '{}';
  v_conflict boolean := false;
  v_stamps jsonb := '{}'::jsonb;
begin
  if v_user_id is null then raise exception 'You need to sign in before reporting a status.' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('report-user:' || v_user_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('report-place:' || coalesce(p_place_id, ''), 0));
  if not exists (select 1 from public.places where id = p_place_id and is_active) then raise exception 'This place is not available.' using errcode = '22023'; end if;
  if p_report_source is null or p_report_source not in ('in_person', 'phone', 'online') then raise exception 'Choose how you checked this place.' using errcode = '22023'; end if;
  if p_report_source = 'online' and coalesce(p_source_url, '') !~* '^https?://[^[:space:]]+$' then raise exception 'Add a source page URL.' using errcode = '22023'; end if;
  if length(p_source_url) > 2048 then raise exception 'The source URL is too long.' using errcode = '22023'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then raise exception 'Submit an array of answers.' using errcode = '22023'; end if;
  if jsonb_array_length(p_answers) not between 1 and 6 then raise exception 'Submit between one and six answers.' using errcode = '22023'; end if;
  if exists (select 1 from public.blocked_contributors where user_id = v_user_id and (blocked_until is null or blocked_until > now())) then raise exception 'This account cannot submit reports.' using errcode = '42501'; end if;
  if exists (select 1 from public.report_batches where user_id = v_user_id and place_id = p_place_id and created_at > now() - interval '15 minutes') then raise exception 'Please wait before reporting this place again.' using errcode = '42900'; end if;
  if (select count(*) from public.report_batches where user_id = v_user_id and created_at > now() - interval '24 hours') >= 30 then raise exception 'Daily report limit reached.' using errcode = '42900'; end if;

  for v_answer in select value from jsonb_array_elements(p_answers) loop
    v_type := v_answer->>'type';
    v_value := trim(v_answer->>'value');
    if not coalesce((v_type = 'open_status' and v_value in ('open', 'closed')) or
      (v_type = 'kitchen_status' and v_value in ('yes', 'no')) or
      (v_type = 'busy_level' and v_value in ('quiet', 'normal', 'busy', 'packed')) or
      (v_type = 'walk_ins' and v_value in ('yes', 'no')) or
      (v_type = 'card_machine' and v_value in ('yes', 'no', 'cash_only')) or
      (v_type = 'backup_power' and v_value in ('normal', 'limited', 'closed')), false)
    then raise exception 'A report answer is not valid.' using errcode = '22023'; end if;
  end loop;
  if (select count(distinct item->>'type') from jsonb_array_elements(p_answers) item) <> jsonb_array_length(p_answers) then raise exception 'Submit each status once.' using errcode = '22023'; end if;

  insert into public.report_batches(place_id, user_id, report_source, source_url)
  values (p_place_id, v_user_id, p_report_source, case when p_report_source = 'online' then trim(p_source_url) else null end)
  returning id into v_report_id;
  insert into public.confirmations(place_id, user_id, confirmation_type, value, location_verified, report_batch_id)
  select p_place_id, v_user_id, item->>'type', trim(item->>'value'), false, v_report_id from jsonb_array_elements(p_answers) item;

  for v_answer in select value from jsonb_array_elements(p_answers) loop
    v_type := v_answer->>'type';
    v_value := trim(v_answer->>'value');
    with votes as (
      select distinct on (c.user_id) c.value, c.created_at from public.confirmations c
      where c.place_id = p_place_id and c.confirmation_type = v_type and c.created_at > now() - interval '4 hours'
        and c.report_batch_id is not null
      order by c.user_id, c.created_at desc, c.id desc
    )
    select count(*) filter (where value = v_value), count(*) filter (where value <> v_value),
      min(created_at) filter (where value = v_value)
    into v_matches, v_other_values, v_confirmed_at from votes;
    if v_other_values > 0 then v_conflict := true;
    elsif v_matches >= 2 then
      v_accepted := array_append(v_accepted, v_type);
      v_stamps := v_stamps || jsonb_build_object(v_type, v_confirmed_at);
    end if;
  end loop;

  if v_conflict then v_accepted := '{}'; end if;
  if cardinality(v_accepted) > 0 then
    insert into public.live_statuses(place_id, busy_level, confidence_score, source)
    values (p_place_id, 'unknown', 0, 'unknown') on conflict (place_id) do nothing;
    update public.live_statuses set
      is_open = null, is_service_available = null, accepts_walk_ins = null,
      busy_level = 'unknown', has_backup_power = null, card_machine_working = null
    where place_id = p_place_id and source <> 'community';
    for v_answer in select value from jsonb_array_elements(p_answers) loop
      v_type := v_answer->>'type';
      v_value := trim(v_answer->>'value');
      if not (v_type = any(v_accepted)) then continue; end if;
      update public.live_statuses set
        is_open = case when v_type = 'open_status' then v_value = 'open' else is_open end,
        is_service_available = case when v_type = 'kitchen_status' then v_value = 'yes' else is_service_available end,
        accepts_walk_ins = case when v_type = 'walk_ins' then v_value = 'yes' else accepts_walk_ins end,
        busy_level = case when v_type = 'busy_level' then v_value else busy_level end,
        has_backup_power = case when v_type = 'backup_power' then v_value = 'normal' else has_backup_power end,
        card_machine_working = case when v_type = 'card_machine' then v_value = 'yes' else card_machine_working end,
        signal_confirmed_at = signal_confirmed_at || jsonb_build_object(v_type, v_stamps->v_type),
        last_confirmed_at = (select max(value::timestamptz) from jsonb_each_text(signal_confirmed_at || v_stamps)),
        confidence_score = 76, source = 'community', updated_at = now()
      where place_id = p_place_id;
    end loop;
  end if;
  update public.report_batches set outcome = case when v_conflict then 'conflict' when cardinality(v_accepted) > 0 then 'accepted' else 'pending' end,
    accepted_signals = v_accepted where id = v_report_id;
  insert into public.report_audit_log(report_batch_id, action, details)
  values (v_report_id, case when v_conflict then 'conflict' when cardinality(v_accepted) > 0 then 'accepted' else 'submitted' end,
    jsonb_build_object('accepted_signals', v_accepted));
  insert into public.profiles(user_id, contribution_count) values (v_user_id, jsonb_array_length(p_answers))
  on conflict (user_id) do update set contribution_count = public.profiles.contribution_count + excluded.contribution_count, updated_at = now();
  return query select v_report_id, case when v_conflict then 'conflict' when cardinality(v_accepted) > 0 then 'accepted' else 'pending' end,
    v_accepted, coalesce((select jsonb_agg(to_jsonb(c)) from public.confirmations c where c.report_batch_id = v_report_id), '[]'::jsonb);
end;
$$;

revoke all on function public.submit_status_report(text,text,text,jsonb) from public, anon;
grant execute on function public.submit_status_report(text,text,text,jsonb) to authenticated;

create or replace view public.current_live_statuses with (security_invoker = true) as
select s.place_id,
  case when s.source <> 'community' or stamps ? 'open_status' then s.is_open else null end as is_open,
  case when s.source <> 'community' or stamps ? 'kitchen_status' then s.is_service_available else null end as is_service_available,
  case when s.source <> 'community' or stamps ? 'walk_ins' then s.accepts_walk_ins else null end as accepts_walk_ins,
  case when s.source <> 'community' or stamps ? 'busy_level' then s.busy_level else 'unknown' end as busy_level,
  case when s.source <> 'community' or stamps ? 'backup_power' then s.has_backup_power else null end as has_backup_power,
  case when s.source <> 'community' or stamps ? 'card_machine' then s.card_machine_working else null end as card_machine_working,
  case when s.source = 'community' then checked_at else s.last_confirmed_at end as last_confirmed_at,
  case when s.source = 'community' and checked_at is null then 0 else s.confidence_score end as confidence_score,
  case when s.source = 'community' and checked_at is null then 'unknown' else s.source end as source,
  s.updated_at,
  stamps as signal_confirmed_at
from public.live_statuses s
cross join lateral (
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) as stamps, max(value::timestamptz) as checked_at
  from jsonb_each_text(s.signal_confirmed_at)
  where value::timestamptz > now() - interval '4 hours' and value::timestamptz <= now()
) fresh;
grant select on public.current_live_statuses to anon, authenticated;
commit;
