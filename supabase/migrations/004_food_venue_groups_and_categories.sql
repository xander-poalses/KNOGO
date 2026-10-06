begin;

insert into public.place_categories (id, name, slug, is_active) values
  ('quick_bites', 'Quick Bites', 'quick-bites', true),
  ('bar', 'Bar', 'bar', true)
on conflict (id) do update set name = excluded.name, slug = excluded.slug, is_active = true;

insert into public.place_groups (id, slug, name, category_id, website, is_active) values
  ('aroma-coffee', 'aroma-coffee', 'Aroma Gourmet Coffee Roastery', 'quick_bites', 'https://www.aroma.co.za/', true),
  ('burger-king', 'burger-king', 'Burger King', 'quick_bites', 'https://www.burgerking.co.za/', true),
  ('casa-bella', 'casa-bella', 'Casa Bella', 'restaurant', 'https://www.casabellarestaurants.co.za/', true),
  ('cowfish', 'cowfish', 'Cowfish', 'restaurant', 'https://www.cowfish.co.za/', true),
  ('fireroom', 'fireroom', 'Fireroom', 'restaurant', 'https://www.fireroom.co.za/', true),
  ('fleisherei', 'fleisherei', 'Fleisherei', 'restaurant', 'https://www.fleisherei.co.za/', true),
  ('forti', 'forti', 'Forti', 'restaurant', 'https://www.forti.co.za/', true),
  ('kauai', 'kauai', 'Kauai', 'quick_bites', 'https://www.kauai.co.za/', true),
  ('kfc', 'kfc', 'KFC', 'quick_bites', 'https://order.kfc.co.za/', true),
  ('king-pie', 'king-pie', 'King Pie', 'quick_bites', 'https://www.kingpie.co.za/', true),
  ('kream', 'kream', 'Kream', 'restaurant', 'https://kreamrestaurant.co.za/', true),
  ('krispy-kreme', 'krispy-kreme', 'Krispy Kreme', 'quick_bites', 'https://krispykreme.co.za/', true),
  ('kung-fu-kitchen', 'kung-fu-kitchen', 'Kung Fu Kitchen', 'restaurant', null, true),
  ('lucky-bread', 'lucky-bread', 'Lucky Bread', 'quick_bites', 'https://www.luckybread.co.za/', true),
  ('lupa-osteria', 'lupa-osteria', 'Lupa Osteria', 'restaurant', 'https://lupa.co.za/', true),
  ('milky-lane', 'milky-lane', 'Milky Lane', 'quick_bites', 'https://www.milky-lane.co.za/', true),
  ('mochachos', 'mochachos', 'Mochachos', 'quick_bites', 'https://www.mochachos.com/', true),
  ('moloko', 'moloko', 'Moloko', 'bar', null, true),
  ('moo-moos', 'moo-moos', 'Moo Moo''s', 'restaurant', 'https://www.moo-moos.co.za/', true),
  ('ogalito', 'ogalito', 'O''Galito', 'restaurant', 'https://ogalito.com/', true),
  ('panarottis', 'panarottis', 'Panarottis', 'restaurant', 'https://www.panarottis.com/', true),
  ('parrots', 'parrots', 'Parrots', 'restaurant', null, true),
  ('pizza-hut', 'pizza-hut', 'Pizza Hut', 'quick_bites', 'https://www.pizzahut.co.za/', true),
  ('rockets', 'rockets', 'Rockets', 'bar', 'https://rockets.co.za/', true),
  ('seattle-coffee', 'seattle-coffee', 'Seattle Coffee Company', 'quick_bites', 'https://seattlecoffeecompany.co.za/', true),
  ('starbucks', 'starbucks', 'Starbucks', 'quick_bites', 'https://www.starbucks.co.za/', true),
  ('tashas', 'tashas', 'Tashas', 'restaurant', 'https://www.tashascafe.com/', true),
  ('the-daily-coffee-cafe', 'the-daily-coffee-cafe', 'The Daily Coffee Cafe', 'quick_bites', 'https://thedailycoffeecafe.co.za/', true),
  ('the-rock', 'the-rock', 'The Rock', 'restaurant', 'https://www.therockrestaurant.co.za/', true),
  ('tranna', 'tranna', 'Tranna', 'restaurant', 'https://www.tranna.co.za/', true),
  ('tribeca', 'tribeca', 'Tribeca Coffee', 'quick_bites', 'https://www.tribecacoffee.co.za/', true),
  ('vida-e-caffe', 'vida-e-caffe', 'vida e caffe', 'quick_bites', 'https://www.vidacaffe.com/', true),
  ('vovo-telo', 'vovo-telo', 'Vovo Telo', 'quick_bites', 'https://vovotelo.co.za/', true),
  ('wok-n-roll', 'wok-n-roll', 'Wok n Roll', 'restaurant', 'https://www.woknroll.co.za/', true)
on conflict (id) do update set name = excluded.name, category_id = excluded.category_id, website = excluded.website, is_active = true, updated_at = now();

update public.places set category_id = 'quick_bites' where id in (
  'aroma-hazelwood','burger-king-castle-gate','kauai-castle-gate','kfc-castle-gate','kfc-hazeldean','kfc-the-grove','king-pie-woodlands','kings-meat-deli-lynnwood-bridge','krispy-kreme-castle-gate','lucky-bread-castle-gate','lucky-bread-hazelwood','milky-lane-menlyn','milky-lane-the-grove','mochachos-menlyn','mugg-and-bean-woodlands','mugg-and-bean-the-grove','nandos-castle-gate','nandos-menlyn','nandos-woodhill','pizza-hut-hazeldean','rocomamas-castle-gate','rocomamas-garsfontein','rocomamas-menlyn','rocomamas-the-grove','seattle-coffee-castle-gate','starbucks-castle-gate','the-daily-coffee-cafe-woodlands','tribeca-standard-lynnwood-bridge','vida-e-caffe-hazeldean','vida-e-caffe-lynnwood-bridge','vovo-telo-lynnwood-bridge'
);
update public.places set category_id = 'bar' where id in ('burnt-castle-gate','hillside-tavern','moloko-menlyn','rockets-menlyn','summit-grill-menlyn','tasos-bar-grill-hazelwood','the-goat-hazelwood');
update public.places set category_id = 'restaurant' where category_id in ('restaurant','cafe') and id not in (
  'aroma-hazelwood','burger-king-castle-gate','kauai-castle-gate','kfc-castle-gate','kfc-hazeldean','kfc-the-grove','king-pie-woodlands','kings-meat-deli-lynnwood-bridge','krispy-kreme-castle-gate','lucky-bread-castle-gate','lucky-bread-hazelwood','milky-lane-menlyn','milky-lane-the-grove','mochachos-menlyn','mugg-and-bean-woodlands','mugg-and-bean-the-grove','nandos-castle-gate','nandos-menlyn','nandos-woodhill','pizza-hut-hazeldean','rocomamas-castle-gate','rocomamas-garsfontein','rocomamas-menlyn','rocomamas-the-grove','seattle-coffee-castle-gate','starbucks-castle-gate','the-daily-coffee-cafe-woodlands','tribeca-standard-lynnwood-bridge','vida-e-caffe-hazeldean','vida-e-caffe-lynnwood-bridge','vovo-telo-lynnwood-bridge','burnt-castle-gate','hillside-tavern','moloko-menlyn','rockets-menlyn','summit-grill-menlyn','tasos-bar-grill-hazelwood','the-goat-hazelwood'
);

update public.places set group_id = values_map.group_id
from (values
  ('aroma-hazelwood','aroma-coffee'),('burger-king-castle-gate','burger-king'),('casa-bella-menlyn','casa-bella'),('cowfish-lynnwood-bridge','cowfish'),('fireroom-castle-gate','fireroom'),('fleisherei-hazeldean','fleisherei'),('forti-grill-and-bar','forti'),('forti-too','forti'),('vee-and-forti','forti'),('kauai-castle-gate','kauai'),('kfc-castle-gate','kfc'),('kfc-hazeldean','kfc'),('kfc-the-grove','kfc'),('king-pie-woodlands','king-pie'),('kream-brooklyn','kream'),('krispy-kreme-castle-gate','krispy-kreme'),('kung-fu-kitchen-hazeldean','kung-fu-kitchen'),('lucky-bread-castle-gate','lucky-bread'),('lucky-bread-hazelwood','lucky-bread'),('lupa-osteria-lynnwood-bridge','lupa-osteria'),('milky-lane-menlyn','milky-lane'),('milky-lane-the-grove','milky-lane'),('mochachos-menlyn','mochachos'),('moloko-menlyn','moloko'),('moo-moos-menlyn','moo-moos'),('ogalito-woodlands','ogalito'),('panarottis-menlyn','panarottis'),('panarottis-the-grove','panarottis'),('parrots-menlyn','parrots'),('pizza-hut-hazeldean','pizza-hut'),('rockets-menlyn','rockets'),('seattle-coffee-castle-gate','seattle-coffee'),('starbucks-castle-gate','starbucks'),('tashas-lynnwood-bridge','tashas'),('the-daily-coffee-cafe-woodlands','the-daily-coffee-cafe'),('the-rock-hazelwood','the-rock'),('tranna-hazeldean','tranna'),('tribeca-standard-lynnwood-bridge','tribeca'),('vida-e-caffe-hazeldean','vida-e-caffe'),('vida-e-caffe-lynnwood-bridge','vida-e-caffe'),('vovo-telo-lynnwood-bridge','vovo-telo'),('wok-n-roll-woodlands','wok-n-roll')
) as values_map(place_id, group_id)
where public.places.id = values_map.place_id;

update public.place_groups set category_id = 'quick_bites', updated_at = now() where id in ('mugg-and-bean','nandos','rocomamas');
update public.place_categories set is_active = false where id = 'cafe';

commit;
