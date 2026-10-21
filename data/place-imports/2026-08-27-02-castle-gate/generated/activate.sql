-- Activate
begin;
update public.places set is_active = true, updated_at = now() where id in ('burger-king-castle-gate', 'burnt-castle-gate', 'doppio-zero-castle-gate', 'fireroom-castle-gate', 'kauai-castle-gate', 'kfc-castle-gate', 'krispy-kreme-castle-gate', 'lucky-bread-castle-gate', 'old-school-castle-gate', 'seattle-coffee-castle-gate', 'starbucks-castle-gate');
update public.place_groups set is_active = true, updated_at = now() where id in ('doppio-zero');
insert into public.live_statuses (place_id, busy_level, confidence_score, source) select id, 'unknown', 0, 'unknown' from public.places where id in ('burger-king-castle-gate', 'burnt-castle-gate', 'doppio-zero-castle-gate', 'fireroom-castle-gate', 'kauai-castle-gate', 'kfc-castle-gate', 'krispy-kreme-castle-gate', 'lucky-bread-castle-gate', 'old-school-castle-gate', 'seattle-coffee-castle-gate', 'starbucks-castle-gate') on conflict (place_id) do nothing;
commit;