-- Activate
begin;
update public.places set is_active = true, updated_at = now() where id in ('bakka-cafe-and-grill-menlyn', 'baobab-menlyn', 'cappuccinos-menlyn', 'casa-bella-menlyn', 'food-and-chain-menlyn', 'milky-lane-menlyn', 'mochachos-menlyn', 'moloko-menlyn', 'moo-moos-menlyn', 'nandos-menlyn', 'panarottis-menlyn', 'parrots-menlyn');
update public.place_groups set is_active = true, updated_at = now() where id in ('cappuccinos', 'nandos');
insert into public.live_statuses (place_id, busy_level, confidence_score, source) select id, 'unknown', 0, 'unknown' from public.places where id in ('bakka-cafe-and-grill-menlyn', 'baobab-menlyn', 'cappuccinos-menlyn', 'casa-bella-menlyn', 'food-and-chain-menlyn', 'milky-lane-menlyn', 'mochachos-menlyn', 'moloko-menlyn', 'moo-moos-menlyn', 'nandos-menlyn', 'panarottis-menlyn', 'parrots-menlyn') on conflict (place_id) do nothing;
commit;