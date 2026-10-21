-- Seed Chain Restaurants

insert into public.regions (id, name, slug, region_type, parent_id, sort_order) values
  ('rietvalleirand', 'Rietvalleirand', 'rietvalleirand', 'suburb_area', 'pretoria', 11),
  ('equestria', 'Equestria', 'equestria', 'suburb_area', 'pretoria', 12),
  ('hazeldean', 'Hazeldean', 'hazeldean', 'suburb_area', 'pretoria', 13),
  ('erasmuskloof', 'Erasmuskloof', 'erasmuskloof', 'suburb_area', 'pretoria', 14),
  ('shere', 'Shere', 'shere', 'suburb_area', 'pretoria', 15)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  region_type = excluded.region_type,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;

insert into public.place_groups (
  id, slug, name, category_id, description, website, image_url, features, tags, is_active, sort_order
) values
  (
    'doppio-zero',
    'doppio-zero',
    'Doppio Zero',
    'restaurant',
    'Italian, bakery and cafe-style dining with Pretoria East branches.',
    'https://doppio.co.za',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    array['family_friendly', 'takeaway', 'card_payments', 'outdoor_seating'],
    array['Italian', 'Cafe', 'Bakery'],
    true,
    10
  ),
  (
    'spur',
    'spur',
    'Spur',
    'restaurant',
    'Family steak ranches with several Pretoria East branches.',
    'https://www.spursteakranches.com',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
    array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'],
    array['Steakhouse', 'Burgers', 'Family'],
    true,
    20
  ),
  (
    'ocean-basket',
    'ocean-basket',
    'Ocean Basket',
    'restaurant',
    'Seafood and sushi chain with mall-based Pretoria East branches.',
    'https://www.oceanbasket.com',
    'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=1200&q=80',
    array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'],
    array['Seafood', 'Sushi', 'Mediterranean'],
    true,
    30
  ),
  (
    'crawdaddys',
    'crawdaddys',
    'Crawdaddy''s',
    'restaurant',
    'Seafood, grill and Creole-style restaurant chain with Pretoria East branches.',
    'https://crawdaddys.co.za',
    'https://images.unsplash.com/photo-1559737558-2f5a35f4523b?auto=format&fit=crop&w=1200&q=80',
    array['late_night', 'bar', 'walk_ins', 'takeaway', 'card_payments'],
    array['Seafood', 'Grill', 'Creole'],
    true,
    35
  ),
  (
    'rocomamas',
    'rocomamas',
    'RocoMamas',
    'restaurant',
    'Burger, ribs and wings chain with strong Pretoria East coverage.',
    'https://www.rocomamas.com',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    array['takeaway', 'card_payments', 'walk_ins'],
    array['Burgers', 'Ribs', 'Casual'],
    true,
    40
  ),
  (
    'nandos',
    'nandos',
    'Nando''s',
    'restaurant',
    'Afro-Portuguese chicken chain useful for quick sit-down and takeaway checks.',
    'https://www.nandos.co.za',
    'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?auto=format&fit=crop&w=1200&q=80',
    array['takeaway', 'card_payments', 'walk_ins'],
    array['Chicken', 'Portuguese', 'Casual'],
    true,
    50
  ),
  (
    'mugg-and-bean',
    'mugg-and-bean',
    'Mugg & Bean',
    'restaurant',
    'Coffee, breakfast and comfort food chain in Pretoria East malls.',
    'https://muggandbean.co.za',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80',
    array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'],
    array['Cafe', 'Breakfast', 'Coffee'],
    true,
    60
  ),
  (
    'papachinos',
    'papachinos',
    'Papachinos',
    'restaurant',
    'Family restaurant with kids play areas and Italian-leaning menus.',
    'https://www.papachinos.co.za',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=80',
    array['family_friendly', 'outdoor_seating', 'takeaway', 'card_payments'],
    array['Family', 'Italian', 'Pizza'],
    true,
    70
  ),
  (
    'cappuccinos',
    'cappuccinos',
    'Cappuccinos',
    'restaurant',
    'Cafe, pizza and comfort-food chain with a Woodlands branch.',
    'https://www.cappuccinos.co.za',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'],
    array['Cafe', 'Italian', 'Pizza'],
    true,
    80
  )
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  category_id = excluded.category_id,
  description = excluded.description,
  website = excluded.website,
  image_url = excluded.image_url,
  features = excluded.features,
  tags = excluded.tags,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.places
set is_active = false, updated_at = now()
where id in (
  'blos-cafe',
  'forti-grill-and-bar',
  'geet-indian-restaurant',
  'hillside-tavern',
  'kream-brooklyn',
  'rockets-menlyn',
  'summit-grill-menlyn',
  'tasos-bar-grill-hazelwood',
  'the-rock-hazelwood',
  'upper-east-side-hazelwood'
);

insert into public.places (
  id, slug, name, group_id, category_id, region_id, address, latitude, longitude,
  phone, website, menu_url, image_url, features, tags, is_active
) values
  (
    'doppio-zero-hazelwood', 'doppio-zero-hazelwood', 'Doppio Zero Hazelwood', 'doppio-zero',
    'restaurant', 'hazelwood', '24 Oaktree Avenue, Hazelwood, Pretoria, 0081', -25.779, 28.2563,
    '+27 61 516 1253', 'https://doppio.co.za/restaurant/hazelwood', 'https://doppio.co.za/restaurant/hazelwood',
    null, array['family_friendly', 'takeaway', 'card_payments', 'outdoor_seating'], array['Italian', 'Cafe', 'Bakery'], true
  ),
  (
    'doppio-zero-hazeldean', 'doppio-zero-hazeldean', 'Doppio Zero Hazeldean', 'doppio-zero',
    'restaurant', 'hazeldean', 'Shop No.42, Hazeldean Square, corner Graham and Silver Lakes Road, Pretoria, 0084', -25.7925, 28.3639,
    '+27 12 809 1149', 'https://doppio.co.za', 'https://doppio.co.za',
    null, array['family_friendly', 'takeaway', 'card_payments', 'outdoor_seating'], array['Italian', 'Cafe', 'Bakery'], true
  ),
  (
    'tucson-spur', 'tucson-spur', 'Tucson Spur', 'spur',
    'restaurant', 'rietvalleirand', 'Shop 8E and 9E, Cornwall View Shopping Centre, Piering Road, Rietvalleirand, Pretoria', -25.8294, 28.2624,
    '+27 12 345 6584', 'https://www.spursteakranches.com/za/restaurant/gauteng/pretoria/rietvalleirand/tucson-spur', 'https://www.spursteakranches.com/za/menu',
    null, array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'], array['Steakhouse', 'Burgers', 'Family'], true
  ),
  (
    'thunder-valley-spur', 'thunder-valley-spur', 'Thunder Valley Spur', 'spur',
    'restaurant', 'moreleta-park', 'Shop 54 A and B, Woodlands Boulevard, Philadelphia Road, Moreleta Park, Pretoria', -25.8193, 28.3045,
    '+27 12 997 5808', 'https://www.spursteakranches.com', 'https://www.spursteakranches.com/za/menu',
    null, array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'], array['Steakhouse', 'Burgers', 'Family'], true
  ),
  (
    'red-cloud-spur', 'red-cloud-spur', 'Red Cloud Spur', 'spur',
    'restaurant', 'menlyn', 'Shop G03, Time Square, 209 Aramist Avenue, Menlyn, Pretoria', -25.7861, 28.2785,
    '+27 12 247 5134', 'https://www.spursteakranches.com', 'https://www.spursteakranches.com/za/menu',
    null, array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'], array['Steakhouse', 'Burgers', 'Family'], true
  ),
  (
    'ocean-basket-menlyn', 'ocean-basket-menlyn', 'Ocean Basket Menlyn', 'ocean-basket',
    'restaurant', 'menlyn', 'Shop G168, Menlyn Shopping Centre, Atterbury Road, Menlyn, Pretoria', -25.7823, 28.2756,
    '+27 12 348 4330', 'https://www.oceanbasket.com', 'https://www.oceanbasket.com/menu',
    null, array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'], array['Seafood', 'Sushi', 'Mediterranean'], true
  ),
  (
    'ocean-basket-woodlands', 'ocean-basket-woodlands', 'Ocean Basket Woodlands', 'ocean-basket',
    'restaurant', 'moreleta-park', 'Shop 29, Woodlands Boulevard Shopping Centre, Garsfontein Road, Moreleta Park, Pretoria', -25.8193, 28.3045,
    '+27 12 997 7130', 'https://www.oceanbasket.com', 'https://www.oceanbasket.com/menu',
    null, array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'], array['Seafood', 'Sushi', 'Mediterranean'], true
  ),
  (
    'ocean-basket-castle-gate', 'ocean-basket-castle-gate', 'Ocean Basket Castle Gate', 'ocean-basket',
    'restaurant', 'erasmuskloof', 'Shop 17, Castle Gate Lifestyle Centre, Van Ryneveld Avenue, Pretoria', -25.8327, 28.2642,
    '+27 12 492 9273', 'https://www.oceanbasket.com', 'https://www.oceanbasket.com/menu',
    null, array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'], array['Seafood', 'Sushi', 'Mediterranean'], true
  ),
  (
    'crawdaddys-brooklyn', 'crawdaddys-brooklyn', 'Crawdaddy''s Brooklyn', 'crawdaddys',
    'restaurant', 'brooklyn', 'Brooklyn Piazza, corner Middel and Dey Streets, Brooklyn, Pretoria, 0181', -25.7702, 28.2327,
    '+27 12 460 0889', 'https://crawdaddys.co.za', 'https://crawdaddys.co.za',
    null, array['late_night', 'bar', 'walk_ins', 'takeaway', 'card_payments'], array['Seafood', 'Grill', 'Creole'], true
  ),
  (
    'crawdaddys-silver-lakes', 'crawdaddys-silver-lakes', 'Crawdaddy''s Silver Lakes', 'crawdaddys',
    'restaurant', 'shere', 'Building 3, In Shere Lifestyle Centre, 4 Graham Road, Shere, Pretoria, 0084', -25.7821, 28.3474,
    '+27 12 809 1188', 'https://crawdaddys.co.za', 'https://crawdaddys.co.za',
    null, array['late_night', 'bar', 'walk_ins', 'takeaway', 'card_payments', 'outdoor_seating'], array['Seafood', 'Grill', 'Creole'], true
  ),
  (
    'rocomamas-menlyn', 'rocomamas-menlyn', 'RocoMamas Menlyn', 'rocomamas',
    'restaurant', 'menlyn', 'Shop LF99 and 100, Menlyn Park, Atterbury Road, Menlyn, Pretoria', -25.7823, 28.2756,
    '+27 10 447 9788', 'https://www.rocomamas.com', 'https://www.rocomamas.com/menu',
    null, array['takeaway', 'card_payments', 'walk_ins'], array['Burgers', 'Ribs', 'Casual'], true
  ),
  (
    'rocomamas-garsfontein', 'rocomamas-garsfontein', 'RocoMamas Garsfontein', 'rocomamas',
    'restaurant', 'garsfontein', 'Shop 13, Garsfontein Corner, 649 Vercueil Street, Garsfontein, Pretoria', -25.7927, 28.3024,
    '+27 12 940 0024', 'https://www.rocomamas.com', 'https://www.rocomamas.com/menu',
    null, array['takeaway', 'card_payments', 'walk_ins'], array['Burgers', 'Ribs', 'Casual'], true
  ),
  (
    'rocomamas-castle-gate', 'rocomamas-castle-gate', 'RocoMamas Castle Gate', 'rocomamas',
    'restaurant', 'erasmuskloof', 'Castle Gate Lifestyle Centre, Solomon Mahlangu Drive, Pretoria', -25.8327, 28.2642,
    '+27 12 574 0499', 'https://www.rocomamas.com', 'https://www.rocomamas.com/menu',
    null, array['takeaway', 'card_payments', 'walk_ins'], array['Burgers', 'Ribs', 'Casual'], true
  ),
  (
    'nandos-castle-gate', 'nandos-castle-gate', 'Nando''s Castle Gate Drive Thru', 'nandos',
    'restaurant', 'erasmuskloof', 'Castle Gate Lifestyle Centre, corner Solomon Mahlangu Drive and Van Ryneveld Road, Pretoria', -25.8327, 28.2642,
    '+27 12 574 0475', 'https://www.nandos.co.za', 'https://www.nandos.co.za/eat/menu',
    null, array['takeaway', 'card_payments', 'walk_ins'], array['Chicken', 'Portuguese', 'Casual'], true
  ),
  (
    'nandos-woodhill', 'nandos-woodhill', 'Nando''s Woodhill Drive Thru', 'nandos',
    'restaurant', 'moreleta-park', 'Ground Floor, Parkview Shopping Centre, corner Garsfontein Road and Netcare Street, Pretoria', -25.8107, 28.3177,
    '+27 12 612 0251', 'https://www.nandos.co.za', 'https://www.nandos.co.za/eat/menu',
    null, array['takeaway', 'card_payments', 'walk_ins'], array['Chicken', 'Portuguese', 'Casual'], true
  ),
  (
    'mugg-and-bean-woodlands', 'mugg-and-bean-woodlands', 'Mugg & Bean Woodlands Boulevard', 'mugg-and-bean',
    'restaurant', 'moreleta-park', 'Shop 52, Woodlands Boulevard, Garsfontein Road, Moreleta Park, Pretoria', -25.8193, 28.3045,
    '+27 12 006 5454', 'https://muggandbean.co.za', 'https://muggandbean.co.za/menu',
    null, array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'], array['Cafe', 'Breakfast', 'Coffee'], true
  ),
  (
    'papachinos-silverlakes', 'papachinos-silverlakes', 'Papachinos Silverlakes', 'papachinos',
    'restaurant', 'silver-lakes', 'Graham Road, Silver Lakes, Pretoria, 0084', -25.7865, 28.354,
    '+27 12 809 3539', 'https://www.papachinos.co.za/silverlakes', 'https://www.papachinos.co.za/food-menu',
    null, array['family_friendly', 'outdoor_seating', 'takeaway', 'card_payments'], array['Family', 'Italian', 'Pizza'], true
  ),
  (
    'cappuccinos-woodlands', 'cappuccinos-woodlands', 'Cappuccinos Woodlands', 'cappuccinos',
    'restaurant', 'moreleta-park', 'Garsfontein Road, Moreleta Park, Pretoria, 0181', -25.817, 28.304,
    '+27 12 997 6562', 'https://www.cappuccinos.co.za', 'https://www.cappuccinos.co.za/menu',
    null, array['family_friendly', 'takeaway', 'card_payments', 'walk_ins'], array['Cafe', 'Italian', 'Pizza'], true
  )
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  group_id = excluded.group_id,
  category_id = excluded.category_id,
  region_id = excluded.region_id,
  address = excluded.address,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  phone = excluded.phone,
  website = excluded.website,
  menu_url = excluded.menu_url,
  image_url = excluded.image_url,
  features = excluded.features,
  tags = excluded.tags,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.live_statuses (
  place_id, is_open, is_service_available, accepts_walk_ins, busy_level,
  has_backup_power, card_machine_working, last_confirmed_at, confidence_score, source
)
select id, true, null, null, 'unknown', null, null, null, 0, 'estimated'
from public.places
where is_active = true
on conflict (place_id) do update set
  is_open = excluded.is_open,
  source = excluded.source,
  updated_at = now();

delete from public.place_hours
where place_id in (
  select id from public.places where group_id is not null
);

insert into public.place_hours (place_id, hours_type, day_of_week, open_time, close_time, is_closed, sort_order)
select p.id, 'opening', d.day_name, '08:00'::time, '22:00'::time, false, d.sort_order
from public.places p
cross join (
  values
    ('Mon', 1), ('Tue', 2), ('Wed', 3), ('Thu', 4), ('Fri', 5), ('Sat', 6), ('Sun', 7)
) as d(day_name, sort_order)
where p.group_id is not null;
