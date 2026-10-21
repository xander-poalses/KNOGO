-- Activate
begin;
update public.places set is_active = true, updated_at = now() where id in ('shell-lynnwood-motors', 'shell-glenwood', 'shell-moreleta-motors', 'supa-quick-menlyn', 'builders-warehouse-woodlands');
update public.place_groups set is_active = true, updated_at = now() where id in ('shell', 'supa-quick', 'builders-warehouse');
insert into public.live_statuses (place_id, busy_level, confidence_score, source) select id, 'unknown', 0, 'unknown' from public.places where id in ('shell-lynnwood-motors', 'shell-glenwood', 'shell-moreleta-motors', 'supa-quick-menlyn', 'builders-warehouse-woodlands') on conflict (place_id) do nothing;
commit;