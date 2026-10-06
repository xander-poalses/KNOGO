begin;

update public.places
set is_active = false, updated_at = now()
where id = 'burnt-castle-gate';

insert into public.place_groups
  (id, slug, name, category_id, description, website, features, tags, is_active, sort_order)
values
  ('padstal', 'padstal', 'Padstal', 'bar', 'Pub and restaurant group with live music, sport and events.', 'https://www.padstal.co.za/', array['Live music','Live sport'], array['Pub','South African'], true, 0),
  ('stoetbul', 'stoetbul', 'Stoetbul', 'bar', 'South African bar, music venue and BraaiBar group.', null, array['Live music'], array['Bar','South African','Braai'], true, 0)
on conflict (id) do update set
  slug = excluded.slug, name = excluded.name, category_id = excluded.category_id,
  description = excluded.description, website = excluded.website,
  features = excluded.features, tags = excluded.tags, is_active = true,
  updated_at = now();

insert into public.places
  (id, slug, name, group_id, category_id, region_id, address, latitude, longitude, phone, website, features, tags, is_active)
values
  ('padstal-lynnwood','padstal-lynnwood','Padstal Lynnwood','padstal','bar','equestria','265 The Highway Street, Equestria, Pretoria',-25.7676689,28.3261915,'061 680 3388','https://www.padstal.co.za/',array['Live music','Live sport','Outdoor seating'],array['Pub','South African'],true),
  ('padstal-hatfield','padstal-hatfield','Padstal Hatfield','padstal','bar','pretoria','495 Hilda Street, Hatfield, Pretoria',-25.7519409,28.2350235,'012 362 7766','https://www.padstal.co.za/',array['Live music','Live sport'],array['Pub','South African'],true),
  ('padstal-hazelwood','padstal-hazelwood','Padstal Hazelwood','padstal','bar','hazelwood','Shop 1, Club 1, corner Dely Road and 18th Avenue, Hazelwood, Pretoria',-25.7853,28.2584,'071 470 2230','https://www.padstal.co.za/',array['Live music','Live sport'],array['Pub','South African'],true),
  ('stoetbul-parkview','stoetbul-parkview','Stoetbul Parkview','stoetbul','bar','moreleta-park','Parkview Shopping Centre, 24 Garsfontein Road, Pretoria',-25.817936,28.303591,'067 438 1738','https://www.facebook.com/StoetbulPretoria/',array['Live music','Live sport','Outdoor seating'],array['Bar','South African'],true),
  ('stoetbul-braaibar-olympus','stoetbul-braaibar-olympus','Stoetbul BraaiBar Olympus','stoetbul','bar','olympus','13 De Villebois Mareuil Drive, Olympus, Pretoria',-25.8072613,28.3302226,'072 825 1109','https://www.instagram.com/stoetbul_braaibar/',array['Live music','Outdoor seating'],array['Braai','Bar','South African'],true)
on conflict (id) do update set
  slug = excluded.slug, name = excluded.name, group_id = excluded.group_id,
  category_id = excluded.category_id, region_id = excluded.region_id,
  address = excluded.address, latitude = excluded.latitude, longitude = excluded.longitude,
  phone = excluded.phone, website = excluded.website, features = excluded.features,
  tags = excluded.tags, is_active = true, updated_at = now();

insert into public.live_statuses (place_id, busy_level, confidence_score, source)
select id, 'unknown', 0, 'unknown'
from public.places
where id in ('padstal-lynnwood','padstal-hatfield','padstal-hazelwood','stoetbul-parkview','stoetbul-braaibar-olympus')
on conflict (place_id) do nothing;

commit;
