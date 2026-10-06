-- Follow-up seed fix after seed_chain_restaurants.sql.
-- Crawdaddy's is mainstream enough to keep, but it should be grouped like other chains.

insert into public.regions (id, name, slug, region_type, parent_id, sort_order) values
  ('shere', 'Shere', 'shere', 'suburb_area', 'pretoria', 15)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  region_type = excluded.region_type,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;

insert into public.place_groups (
  id, slug, name, category_id, description, website, image_url, features, tags, is_active, sort_order
) values (
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

insert into public.places (
  id, slug, name, group_id, category_id, region_id, address, latitude, longitude,
  phone, website, menu_url, image_url, features, tags, is_active
) values
  (
    'crawdaddys-brooklyn',
    'crawdaddys-brooklyn',
    'Crawdaddy''s Brooklyn',
    'crawdaddys',
    'restaurant',
    'brooklyn',
    'Brooklyn Piazza, corner Middel and Dey Streets, Brooklyn, Pretoria, 0181',
    -25.7702,
    28.2327,
    '+27 12 460 0889',
    'https://crawdaddys.co.za',
    'https://crawdaddys.co.za',
    null,
    array['late_night', 'bar', 'walk_ins', 'takeaway', 'card_payments'],
    array['Seafood', 'Grill', 'Creole'],
    true
  ),
  (
    'crawdaddys-silver-lakes',
    'crawdaddys-silver-lakes',
    'Crawdaddy''s Silver Lakes',
    'crawdaddys',
    'restaurant',
    'shere',
    'Building 3, In Shere Lifestyle Centre, 4 Graham Road, Shere, Pretoria, 0084',
    -25.7821,
    28.3474,
    '+27 12 809 1188',
    'https://crawdaddys.co.za',
    'https://crawdaddys.co.za',
    null,
    array['late_night', 'bar', 'walk_ins', 'takeaway', 'card_payments', 'outdoor_seating'],
    array['Seafood', 'Grill', 'Creole'],
    true
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
values
  ('crawdaddys-brooklyn', true, null, null, 'unknown', null, null, null, 0, 'estimated'),
  ('crawdaddys-silver-lakes', true, null, null, 'unknown', null, null, null, 0, 'estimated')
on conflict (place_id) do update set
  is_open = excluded.is_open,
  source = excluded.source,
  updated_at = now();

delete from public.place_hours
where place_id in ('crawdaddys-brooklyn', 'crawdaddys-silver-lakes');

insert into public.place_hours (place_id, hours_type, day_of_week, open_time, close_time, is_closed, sort_order)
select p.place_id, 'opening', d.day_name, '11:00'::time, '22:00'::time, false, d.sort_order
from (
  values ('crawdaddys-brooklyn'), ('crawdaddys-silver-lakes')
) as p(place_id)
cross join (
  values
    ('Mon', 1), ('Tue', 2), ('Wed', 3), ('Thu', 4), ('Fri', 5), ('Sat', 6), ('Sun', 7)
) as d(day_name, sort_order);
