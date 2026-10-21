-- Replace Areas With Regions
create table if not exists public.regions (
  id text primary key,
  name text not null,
  slug text not null unique,
  region_type text not null,
  parent_id text references public.regions(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint regions_region_type_check check (
    region_type in (
      'country',
      'province',
      'municipality',
      'city_town',
      'suburb_area'
    )
  ),
  constraint regions_no_self_parent check (parent_id is null or parent_id <> id)
);

insert into public.regions (id, name, slug, region_type, parent_id, sort_order) values
  ('south-africa', 'South Africa', 'south-africa', 'country', null, 1),
  ('gauteng', 'Gauteng', 'gauteng', 'province', 'south-africa', 1)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  region_type = excluded.region_type,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;

do $$
begin
if to_regclass('public.areas') is not null then
insert into public.regions (id, name, slug, region_type, parent_id, sort_order)
select distinct lower(replace(country, ' ', '-')), country, lower(replace(country, ' ', '-')), 'country', null, 1
from public.areas
on conflict (id) do nothing;

insert into public.regions (id, name, slug, region_type, parent_id, sort_order)
select distinct lower(replace(province, ' ', '-')), province, lower(replace(province, ' ', '-')), 'province', lower(replace(country, ' ', '-')), 1
from public.areas
on conflict (id) do nothing;
end if;
end;
$$;

insert into public.regions (id, name, slug, region_type, parent_id, sort_order) values
  ('city-of-tshwane', 'City of Tshwane Metropolitan Municipality', 'city-of-tshwane', 'municipality', 'gauteng', 1),
  ('pretoria', 'Pretoria', 'pretoria', 'city_town', 'city-of-tshwane', 1)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  region_type = excluded.region_type,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;

do $$
begin
if to_regclass('public.areas') is not null then
insert into public.regions (id, name, slug, region_type, parent_id, sort_order)
select id, name, slug, 'suburb_area', 'pretoria', row_number() over (order by name)
from public.areas
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  region_type = excluded.region_type,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order;
end if;
end;
$$;

alter table public.places
  add column if not exists region_id text references public.regions(id);

do $$
begin
if exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'places' and column_name = 'area_id'
) then
update public.places
set region_id = area_id
where region_id is null
  and area_id is not null;
end if;
end;
$$;

alter table public.places
  alter column region_id set not null;

drop index if exists places_area_id_idx;
create index if not exists regions_parent_id_idx on public.regions(parent_id);
create index if not exists regions_region_type_idx on public.regions(region_type);
create index if not exists places_region_id_idx on public.places(region_id);

alter table public.regions enable row level security;

drop policy if exists "Public can read regions" on public.regions;
create policy "Public can read regions"
on public.regions for select
to anon, authenticated
using (true);

grant select on public.regions to anon, authenticated;

alter table public.places
  drop constraint if exists places_area_id_fkey;

alter table public.places
  drop column if exists area_id;

drop table if exists public.areas;
