-- Background Fuel Prices
create schema if not exists knogo_private;
create table knogo_private.fuel_prices (
 singleton boolean primary key default true check (singleton),
 enabled boolean not null default false,
 attempt_day date,
 attempt_id uuid,
 attempted_at timestamptz,
 checked_at timestamptz,
 error_code text,
 publications jsonb not null default '[]'::jsonb check(jsonb_typeof(publications)='array' and jsonb_array_length(publications)<=2)
);
alter table knogo_private.fuel_prices enable row level security;
insert into knogo_private.fuel_prices(singleton) values(true);
revoke all on knogo_private.fuel_prices from public,anon,authenticated;
grant usage on schema knogo_private to service_role;
grant select,update on knogo_private.fuel_prices to service_role;
create policy fuel_server on knogo_private.fuel_prices to service_role using(true) with check(true);

create function public.claim_fuel_price_refresh() returns uuid
language plpgsql security invoker set search_path='' as $$
declare claimed uuid;
begin
 update knogo_private.fuel_prices
 set attempt_day=(now() at time zone 'Africa/Johannesburg')::date,
     attempt_id=gen_random_uuid(),attempted_at=now(),error_code=null
 where singleton and enabled and (attempt_day is null or attempt_day<(now() at time zone 'Africa/Johannesburg')::date)
 returning attempt_id into claimed;
 return claimed;
end $$;

create function public.finish_fuel_price_refresh(p_attempt_id uuid,p_publications jsonb,p_error_code text default null) returns boolean
language plpgsql security invoker set search_path='' as $$
declare state knogo_private.fuel_prices; publication jsonb; item jsonb; seen text[]; pair text; dates timestamptz[]='{}'; effective timestamptz; price numeric; old_effective timestamptz; new_effective timestamptz;
begin
 select * into state from knogo_private.fuel_prices where singleton for update;
 if not state.enabled or state.attempt_id is distinct from p_attempt_id or state.attempt_day is distinct from (now() at time zone 'Africa/Johannesburg')::date or state.error_code is not null or state.checked_at>=state.attempted_at or state.attempted_at<now()-interval '90 seconds' then return false; end if;
 if p_error_code is not null then
  if p_error_code not in ('source_download','source_invalid','source_timeout','database_failed') then raise exception 'Invalid fuel error'; end if;
  update knogo_private.fuel_prices set error_code=p_error_code where singleton;
  return true;
 end if;
 if p_publications is null or jsonb_typeof(p_publications)<>'array' or jsonb_array_length(p_publications) not between 1 and 2 or octet_length(p_publications::text)>16384 then raise exception 'Invalid fuel publications'; end if;
 for publication in select value from jsonb_array_elements(p_publications) loop
  if jsonb_typeof(publication)<>'object' or not (publication ?& array['effectiveAt','effectiveUntil','sourceUrl','hash','records']) or publication->'effectiveUntil'<>'null'::jsonb
   or coalesce(publication->>'hash','') !~ '^[a-f0-9]{64}$'
   or coalesce(publication->>'sourceUrl','') !~ '^https://www\.dmpr\.gov\.za/API/Evotiva-UserFiles/FileActionsServices/DownloadFile\?ItemId=[0-9]+&ModuleId=[0-9]+&TabId=[0-9]+$'
   or coalesce(publication->>'effectiveAt','') !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$'
   or jsonb_typeof(publication->'records')<>'array' or jsonb_array_length(publication->'records')<>6 then raise exception 'Invalid fuel publication'; end if;
  effective=(publication->>'effectiveAt')::timestamptz;
  if effective=any(dates) or effective>now()+interval '62 days' then raise exception 'Invalid fuel effective date'; end if;
  dates=array_append(dates,effective); seen='{}';
  for item in select value from jsonb_array_elements(publication->'records') loop
   if jsonb_typeof(item)<>'object' or not(item ?& array['grade','region','kind','zarPerLitre']) or jsonb_typeof(item->'zarPerLitre')<>'number' then raise exception 'Invalid fuel record'; end if;
   pair=coalesce(item->>'grade','')||':'||coalesce(item->>'region','');
   if not(pair=any(array['petrol_93:inland','petrol_93:coastal','petrol_95:inland','petrol_95:coastal','diesel_50ppm:inland','diesel_500ppm:inland'])) or pair=any(seen) then raise exception 'Invalid fuel pair'; end if;
   price=(item->>'zarPerLitre')::numeric;
   if price<=0 or price>1000 or (item->>'kind') is distinct from (case when item->>'grade' like 'petrol_%' then 'retail_reference' else 'wholesale_reference' end) then raise exception 'Invalid fuel amount or basis'; end if;
   seen=array_append(seen,pair);
  end loop;
 end loop;
 select max(d) into new_effective from unnest(dates) d where d<=now();
 select max((p->>'effectiveAt')::timestamptz) into old_effective from jsonb_array_elements(state.publications) p where (p->>'effectiveAt')::timestamptz<=now();
 if new_effective is null or new_effective<old_effective then raise exception 'Fuel publication rollback'; end if;
 update knogo_private.fuel_prices set publications=p_publications,checked_at=now(),error_code=null where singleton;
 return true;
end $$;

create function public.read_fuel_price_snapshot() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('version',2,'currency','ZAR','unit','ZAR/litre','checkedAt',s.checked_at,
  'updateState',case when not s.enabled then 'failed' when s.error_code is not null then 'failed' when s.attempted_at>s.checked_at or (s.attempted_at is not null and s.checked_at is null) then case when s.attempted_at>now()-interval '90 seconds' then 'pending' else 'failed' end else 'idle' end,
  'records',coalesce((select jsonb_agg(jsonb_build_object('grade',r->>'grade','region',r->>'region','kind',r->>'kind','price',r->'zarPerLitre','effectiveAt',p->>'effectiveAt','effectiveUntil',(select min((n->>'effectiveAt')::timestamptz) from jsonb_array_elements(s.publications) n where (n->>'effectiveAt')::timestamptz>(p->>'effectiveAt')::timestamptz),'checkedAt',s.checked_at,'sourceUrl',p->>'sourceUrl','forecast',false))
   from (select value p from jsonb_array_elements(s.publications) where (value->>'effectiveAt')::timestamptz<=now() order by (value->>'effectiveAt')::timestamptz desc limit 1) active,
   lateral jsonb_array_elements(p->'records') r where s.enabled and s.checked_at>now()-interval '48 hours'), '[]'::jsonb))
 from knogo_private.fuel_prices s where singleton
$$;
revoke all on function public.claim_fuel_price_refresh(),public.finish_fuel_price_refresh(uuid,jsonb,text),public.read_fuel_price_snapshot() from public,anon,authenticated;
grant execute on function public.claim_fuel_price_refresh(),public.finish_fuel_price_refresh(uuid,jsonb,text),public.read_fuel_price_snapshot() to service_role;
