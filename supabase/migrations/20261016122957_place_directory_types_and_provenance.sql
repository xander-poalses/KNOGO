alter table public.places
  add column if not exists place_type text,
  add column if not exists source_url text,
  add column if not exists source_checked_at date,
  add column if not exists map_url text,
  add column if not exists data_notes text,
  add column if not exists service_details jsonb not null default '{}'::jsonb;
alter table public.place_groups
  add column if not exists source_url text,
  add column if not exists source_checked_at date;
alter table public.place_hours
  add column if not exists source_url text,
  add column if not exists source_checked_at date;
alter table public.places
  add constraint places_type_format check (place_type is null or place_type ~ '^[a-z][a-z0-9_]{0,79}$'),
  add constraint places_source_url_format check (source_url is null or (length(source_url)<=2048 and source_url ~ '^https?://[^[:space:]]+$')),
  add constraint places_map_url_format check (map_url is null or (length(map_url)<=2048 and map_url ~ '^https?://[^[:space:]]+$')),
  add constraint places_service_details_object check (jsonb_typeof(service_details)='object');
insert into public.place_categories(id,name,slug) values
 ('food_drink','Food & Drink','food-drink'),
 ('shops','Shops','shops'),
 ('automotive','Cars & Garages','cars-garages'),
 ('public_services','Public Services','public-services'),
 ('entertainment','Entertainment','entertainment'),
 ('sport_outdoors','Sport & Outdoors','sport-outdoors')
on conflict(id) do nothing;
comment on column public.places.source_url is 'Fact source, not a community status report or evidence of current opening.';
comment on column public.places.service_details is 'Source-backed service, booking and access details. Unknown facts stay absent.';
comment on column public.places.place_type is 'Place type within its category; for example supermarket or fuel_station.';
