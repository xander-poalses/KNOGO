-- Activate
begin;
do $check$ begin
  if (select count(*) from public.places where id in ('parkview-shopping-centre', 'clicks-parkview', 'postnet-woodhill', 'wolwespruit-mtb-trail-park') and not is_active and source_checked_at = '2026-10-17') <> 4 then raise exception 'Expected four checked inactive places'; end if;
  if (select count(*) from public.place_hours where place_id in ('parkview-shopping-centre', 'clicks-parkview', 'postnet-woodhill', 'wolwespruit-mtb-trail-park') and hours_type = 'opening' and source_url is not null and source_checked_at = '2026-10-17') <> 28 then raise exception 'Expected 28 sourced opening days'; end if;
  if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if;
end $check$;
update public.places set is_active = true, updated_at = now() where id in ('parkview-shopping-centre', 'clicks-parkview', 'postnet-woodhill', 'wolwespruit-mtb-trail-park');
update public.place_groups set is_active = true, updated_at = now() where id in ('clicks', 'postnet');
insert into public.live_statuses (place_id, busy_level, confidence_score, source) select id, 'unknown', 0, 'unknown' from public.places where id in ('parkview-shopping-centre', 'clicks-parkview', 'postnet-woodhill', 'wolwespruit-mtb-trail-park') on conflict (place_id) do nothing;
do $cap$ begin if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if; end $cap$;
commit;
