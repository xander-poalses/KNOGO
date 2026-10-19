-- Generated KNOGO activation: 2026-10-17-07-menlyn-pet-stores
begin;
do $check$ begin
  if (select count(*) from public.places where id in ('clicks-menlyn-park', 'clicks-menlyn-maine', 'absolute-pets-menlyn-maine', 'absolute-pets-parkview') and not is_active and source_checked_at = '2026-10-17') <> 4 then raise exception 'Expected four new inactive places'; end if;
  if (select count(*) from public.places where id in ('absolute-pets-the-grove', 'absolute-pets-woodlands') and is_active and source_checked_at = '2026-10-17') <> 2 then raise exception 'Expected two existing active places'; end if;
  if (select count(*) from public.place_hours where place_id in ('clicks-menlyn-park', 'clicks-menlyn-maine', 'absolute-pets-menlyn-maine', 'absolute-pets-parkview', 'absolute-pets-the-grove', 'absolute-pets-woodlands') and hours_type = 'opening' and source_url is not null and source_checked_at = '2026-10-17') <> 42 then raise exception 'Expected 42 sourced opening days'; end if;
  if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if;
end $check$;
update public.places set is_active = true, updated_at = now() where id in ('clicks-menlyn-park', 'clicks-menlyn-maine', 'absolute-pets-menlyn-maine', 'absolute-pets-parkview', 'absolute-pets-the-grove', 'absolute-pets-woodlands');
update public.place_groups set is_active = true, updated_at = now() where id in ('clicks', 'absolute-pets');
insert into public.live_statuses (place_id, busy_level, confidence_score, source) select id, 'unknown', 0, 'unknown' from public.places where id in ('clicks-menlyn-park', 'clicks-menlyn-maine', 'absolute-pets-menlyn-maine', 'absolute-pets-parkview', 'absolute-pets-the-grove', 'absolute-pets-woodlands') on conflict (place_id) do nothing;
do $cap$ begin if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if; end $cap$;
commit;
