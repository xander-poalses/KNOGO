-- Activate
begin;
update public.places set is_active = true, updated_at = now() where id in ('home-affairs-fnb-the-grove');
update public.place_groups set is_active = true, updated_at = now() where id in ('home-affairs');
insert into public.live_statuses (place_id, busy_level, confidence_score, source) select id, 'unknown', 0, 'unknown' from public.places where id in ('home-affairs-fnb-the-grove') on conflict (place_id) do nothing;
commit;