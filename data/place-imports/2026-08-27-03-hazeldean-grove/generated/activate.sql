-- Generated KNOGO activation: 2026-08-27-03-hazeldean-grove
begin;
update public.places set is_active = true, updated_at = now() where id in ('fleisherei-hazeldean', 'kfc-hazeldean', 'kung-fu-kitchen-hazeldean', 'pizza-hut-hazeldean', 'tranna-hazeldean', 'vida-e-caffe-hazeldean', 'milky-lane-the-grove', 'kfc-the-grove', 'panarottis-the-grove', 'mugg-and-bean-the-grove', 'rocomamas-the-grove');
update public.place_groups set is_active = true, updated_at = now() where id in ('mugg-and-bean', 'rocomamas');
insert into public.live_statuses (place_id, busy_level, confidence_score, source) select id, 'unknown', 0, 'unknown' from public.places where id in ('fleisherei-hazeldean', 'kfc-hazeldean', 'kung-fu-kitchen-hazeldean', 'pizza-hut-hazeldean', 'tranna-hazeldean', 'vida-e-caffe-hazeldean', 'milky-lane-the-grove', 'kfc-the-grove', 'panarottis-the-grove', 'mugg-and-bean-the-grove', 'rocomamas-the-grove') on conflict (place_id) do nothing;
commit;