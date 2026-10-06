create extension if not exists "pgcrypto";

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

create table if not exists public.place_categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.places (
  id text primary key,
  slug text not null unique,
  name text not null,
  category_id text not null references public.place_categories(id),
  region_id text not null references public.regions(id),
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  phone text,
  website text,
  menu_url text,
  features text[] not null default '{}',
  tags text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.place_hours (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places(id) on delete cascade,
  hours_type text not null,
  day_of_week text not null,
  open_time time,
  close_time time,
  is_closed boolean not null default false,
  sort_order integer not null,
  constraint place_hours_hours_type_check check (hours_type in ('opening', 'kitchen')),
  constraint place_hours_sort_order_check check (sort_order between 1 and 7),
  constraint place_hours_unique_day unique (place_id, hours_type, day_of_week)
);

create table if not exists public.live_statuses (
  place_id text primary key references public.places(id) on delete cascade,
  is_open boolean,
  is_service_available boolean,
  accepts_walk_ins boolean,
  busy_level text not null default 'unknown',
  has_backup_power boolean,
  card_machine_working boolean,
  last_confirmed_at timestamptz,
  confidence_score integer not null default 0,
  source text not null default 'estimated',
  updated_at timestamptz not null default now(),
  constraint live_statuses_busy_level_check check (busy_level in ('quiet', 'normal', 'busy', 'packed', 'unknown')),
  constraint live_statuses_confidence_score_check check (confidence_score between 0 and 100),
  constraint live_statuses_source_check check (source in ('official', 'community', 'business', 'estimated', 'unknown'))
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  contribution_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or length(display_name) between 2 and 60),
  constraint profiles_contribution_count_check check (contribution_count >= 0)
);

create table if not exists public.confirmations (
  id uuid primary key default gen_random_uuid(),
  place_id text not null references public.places(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  confirmation_type text not null,
  value text not null,
  location_verified boolean not null default false,
  created_at timestamptz not null default now(),
  constraint confirmations_type_check check (
    confirmation_type in (
      'open_status',
      'kitchen_status',
      'busy_level',
      'walk_ins',
      'card_machine',
      'backup_power'
    )
  )
);

insert into public.place_categories (id, name, slug, is_active) values
  ('restaurant', 'Restaurant', 'restaurant', true),
  ('pharmacy', 'Pharmacy', 'pharmacy', true),
  ('cafe', 'Cafe', 'cafe', true),
  ('hardware', 'Hardware', 'hardware', true),
  ('vet', 'Vet', 'vet', true),
  ('petrol_station', 'Petrol Station', 'petrol-station', true),
  ('government_office', 'Government Office', 'government-office', true)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  is_active = excluded.is_active;

create index if not exists places_category_id_idx on public.places(category_id);
create index if not exists regions_parent_id_idx on public.regions(parent_id);
create index if not exists regions_region_type_idx on public.regions(region_type);
create index if not exists places_region_id_idx on public.places(region_id);
create index if not exists places_is_active_idx on public.places(is_active);
create index if not exists place_hours_place_id_idx on public.place_hours(place_id);
create index if not exists confirmations_place_id_created_at_idx on public.confirmations(place_id, created_at desc);
create index if not exists confirmations_user_id_created_at_idx on public.confirmations(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_places_updated_at on public.places;
create trigger set_places_updated_at
before update on public.places
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

create or replace function public.apply_confirmation_to_live_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_statuses (
    place_id,
    is_open,
    is_service_available,
    accepts_walk_ins,
    busy_level,
    has_backup_power,
    card_machine_working,
    last_confirmed_at,
    confidence_score,
    source,
    updated_at
  )
  values (
    new.place_id,
    null,
    null,
    null,
    'unknown',
    null,
    null,
    new.created_at,
    62,
    'community',
    now()
  )
  on conflict (place_id) do update set
    last_confirmed_at = new.created_at,
    confidence_score = least(96, greatest(public.live_statuses.confidence_score, 54) + 8),
    source = 'community',
    updated_at = now();

  if new.confirmation_type = 'open_status' then
    update public.live_statuses
    set
      is_open = case
        when new.value = 'open' then true
        when new.value = 'closed' then false
        else is_open
      end,
      is_service_available = case
        when new.value = 'closed' then false
        else is_service_available
      end
    where place_id = new.place_id;
  elsif new.confirmation_type = 'kitchen_status' then
    update public.live_statuses
    set is_service_available = case
      when new.value = 'yes' then true
      when new.value = 'no' then false
      else is_service_available
    end
    where place_id = new.place_id;
  elsif new.confirmation_type = 'busy_level' then
    update public.live_statuses
    set busy_level = case
      when new.value in ('quiet', 'normal', 'busy', 'packed') then new.value
      else busy_level
    end
    where place_id = new.place_id;
  elsif new.confirmation_type = 'walk_ins' then
    update public.live_statuses
    set accepts_walk_ins = case
      when new.value = 'yes' then true
      when new.value = 'no' then false
      else accepts_walk_ins
    end
    where place_id = new.place_id;
  elsif new.confirmation_type = 'card_machine' then
    update public.live_statuses
    set card_machine_working = case
      when new.value = 'yes' then true
      when new.value in ('no', 'cash_only') then false
      else card_machine_working
    end
    where place_id = new.place_id;
  elsif new.confirmation_type = 'backup_power' then
    update public.live_statuses
    set has_backup_power = case
      when new.value = 'normal' then true
      when new.value in ('limited', 'closed') then false
      else has_backup_power
    end
    where place_id = new.place_id;
  end if;

  insert into public.profiles (user_id, contribution_count)
  values (new.user_id, 1)
  on conflict (user_id) do update set
    contribution_count = public.profiles.contribution_count + 1,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists apply_confirmation_after_insert on public.confirmations;
create trigger apply_confirmation_after_insert
after insert on public.confirmations
for each row execute function public.apply_confirmation_to_live_status();

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user_profile() from public, anon, authenticated;
revoke all on function public.apply_confirmation_to_live_status() from public, anon, authenticated;

alter table public.regions enable row level security;
alter table public.place_categories enable row level security;
alter table public.places enable row level security;
alter table public.place_hours enable row level security;
alter table public.live_statuses enable row level security;
alter table public.profiles enable row level security;
alter table public.confirmations enable row level security;

drop policy if exists "Public can read regions" on public.regions;
create policy "Public can read regions"
on public.regions for select
to anon, authenticated
using (true);

drop policy if exists "Public can read active categories" on public.place_categories;
create policy "Public can read active categories"
on public.place_categories for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read active places" on public.places;
create policy "Public can read active places"
on public.places for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can read hours for active places" on public.place_hours;
create policy "Public can read hours for active places"
on public.place_hours for select
to anon, authenticated
using (
  exists (
    select 1
    from public.places
    where places.id = place_hours.place_id
      and places.is_active = true
  )
);

drop policy if exists "Public can read live statuses for active places" on public.live_statuses;
create policy "Public can read live statuses for active places"
on public.live_statuses for select
to anon, authenticated
using (
  exists (
    select 1
    from public.places
    where places.id = live_statuses.place_id
      and places.is_active = true
  )
);

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own confirmations" on public.confirmations;
create policy "Users can insert own confirmations"
on public.confirmations for insert
to authenticated
with check ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.regions to anon, authenticated;
grant select on public.place_categories to anon, authenticated;
grant select on public.places to anon, authenticated;
grant select on public.place_hours to anon, authenticated;
grant select on public.live_statuses to anon, authenticated;
grant select on public.profiles to authenticated;
revoke all on public.confirmations from anon, authenticated;
grant insert on public.confirmations to authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'rls_auto_enable'
  ) then
    revoke all on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
