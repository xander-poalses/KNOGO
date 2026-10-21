-- Update
begin;
do $cap$ begin if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if; end $cap$;
do $before$ begin
  perform 1 from public.places where id='hot-spot-cycles' for update;
  if not exists(select 1 from public.places p where id='hot-spot-cycles' and is_active and image_url is null and md5(to_jsonb(p)::text)='6a1402485361ca1e7a52b528d5c2257f') then raise exception 'Batch 15 place changed; recheck photo before writing'; end if;
end $before$;
update public.places set image_url='https://i0.wp.com/bicyclesouth.co.za/wp-content/uploads/2017/06/Hot-spot-cycles.jpg?fit=1080%2C866&ssl=1',image_source_url='https://bicyclesouth.co.za/listings/hot-spot-cycles/',image_attribution='Bicycle South (source page updated 2017; reuse rights not verified)',image_checked_at='2026-10-18',updated_at=now() where id='hot-spot-cycles';
do $after$ begin
  if not exists(select 1 from public.places p where id='hot-spot-cycles' and md5((to_jsonb(p)-'image_url'-'image_source_url'-'image_attribution'-'image_checked_at'-'updated_at')::text)='099e8a8a6a8986b3445e31864add9db9') then raise exception 'Batch 15 changed non-photo fields'; end if;
  if not exists(select 1 from public.live_statuses s where place_id='hot-spot-cycles' and md5(to_jsonb(s)::text)='1b84f7ea41d06a28d988471253680ceb') then raise exception 'Batch 15 changed live status'; end if;
  if (select md5(jsonb_agg(to_jsonb(h) order by hours_type,sort_order)::text) from public.place_hours h where place_id='hot-spot-cycles') <> '70ad8fd51cf67522ba64819b27f7e06a' then raise exception 'Batch 15 changed hours'; end if;
end $after$;
do $cap$ begin if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if; end $cap$;
commit;
