-- Trip-only setup. No reporting, status, venue-claim or Gemini changes.
create schema if not exists knogo_trip_private;
revoke all on schema knogo_trip_private from public, anon, authenticated;

create table if not exists knogo_trip_private.provider_limits (
  provider text primary key check (provider in ('routes', 'addresses')),
  daily_limit integer not null check (daily_limit between 1 and 100),
  minute_limit integer not null check (minute_limit between 1 and 10),
  enabled boolean not null default false
);
insert into knogo_trip_private.provider_limits (provider, daily_limit, minute_limit)
values ('routes', 100, 10), ('addresses', 100, 10)
on conflict (provider) do nothing;

create table if not exists knogo_trip_private.provider_usage (
  provider text not null references knogo_trip_private.provider_limits,
  day date not null,
  calls integer not null default 0 check (calls >= 0),
  primary key (provider, day)
);
create table if not exists knogo_trip_private.provider_call_windows (
  provider text primary key references knogo_trip_private.provider_limits,
  reserved_at timestamptz[] not null default '{}'
);
alter table knogo_trip_private.provider_limits enable row level security;
alter table knogo_trip_private.provider_usage enable row level security;
alter table knogo_trip_private.provider_call_windows enable row level security;
revoke all on knogo_trip_private.provider_limits, knogo_trip_private.provider_usage,
  knogo_trip_private.provider_call_windows from public, anon, authenticated;

create or replace function public.reserve_trip_provider_call(p_provider text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  max_calls integer;
  max_minute_calls integer;
  is_enabled boolean;
  reserved integer;
  request_time timestamptz;
  recent_calls timestamptz[];
begin
  -- Serialise reservations for each provider without holding a lock during HTTP.
  select daily_limit, minute_limit, enabled
    into max_calls, max_minute_calls, is_enabled
  from knogo_trip_private.provider_limits where provider = p_provider for update;
  if not coalesce(is_enabled, false) then return false; end if;
  request_time := clock_timestamp();
  select coalesce(array_agg(call_time), '{}') into recent_calls
  from knogo_trip_private.provider_call_windows w
    cross join lateral unnest(w.reserved_at) as calls(call_time)
  where w.provider = p_provider and call_time > request_time - interval '60 seconds';
  if cardinality(recent_calls) >= max_minute_calls then return false; end if;
  insert into knogo_trip_private.provider_usage (provider, day, calls)
  values (p_provider, (request_time at time zone 'UTC')::date, 1)
  on conflict (provider, day) do update
    set calls = knogo_trip_private.provider_usage.calls + 1
    where knogo_trip_private.provider_usage.calls < max_calls
  returning calls into reserved;
  if reserved is null then return false; end if;
  insert into knogo_trip_private.provider_call_windows (provider, reserved_at)
  values (p_provider, array_append(recent_calls, request_time))
  on conflict (provider) do update set reserved_at = excluded.reserved_at;
  return true;
end;
$$;
revoke all on function public.reserve_trip_provider_call(text) from public, anon, authenticated;
grant execute on function public.reserve_trip_provider_call(text) to service_role;
