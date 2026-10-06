create table if not exists public.place_groups (
  id text primary key,
  slug text not null unique,
  name text not null,
  category_id text not null references public.place_categories(id),
  description text,
  website text,
  image_url text,
  features text[] not null default '{}',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.places
  add column if not exists group_id text references public.place_groups(id),
  add column if not exists image_url text;

create index if not exists idx_place_groups_category_active
  on public.place_groups (category_id, is_active, sort_order, name);

create index if not exists idx_places_group_active
  on public.places (group_id, is_active);

alter table public.place_groups enable row level security;

drop policy if exists "Place groups are readable" on public.place_groups;
create policy "Place groups are readable"
  on public.place_groups
  for select
  to anon, authenticated
  using (is_active = true);

grant select on public.place_groups to anon, authenticated;
grant select on public.places to anon, authenticated;
