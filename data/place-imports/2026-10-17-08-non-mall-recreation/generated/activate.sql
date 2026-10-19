-- Generated KNOGO activation: 2026-10-17-08-non-mall-recreation
begin;
do $check$ begin
  if (select count(*) from public.places where id in ('thrashers-garsfontein', 'create-wolwespruit') and not is_active and source_checked_at = '2026-10-17') <> 2 then raise exception 'Expected two new inactive recreation places'; end if;
  if (select count(*) from public.place_hours where place_id in ('thrashers-garsfontein', 'create-wolwespruit') and hours_type = 'opening' and source_url is not null and source_checked_at = '2026-10-17') <> 14 then raise exception 'Expected 14 sourced opening days'; end if;
  if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if;
end $check$;
update public.places set is_active = true, updated_at = now() where id in ('thrashers-garsfontein', 'create-wolwespruit');
update public.place_groups set is_active = true, updated_at = now() where id in ('create-ceramics');
insert into public.live_statuses (place_id, busy_level, confidence_score, source) select id, 'unknown', 0, 'unknown' from public.places where id in ('thrashers-garsfontein', 'create-wolwespruit') on conflict (place_id) do nothing;
do $cap$ begin if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if; end $cap$;
commit;
