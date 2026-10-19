-- Activate only the two new PNA branches after readback verification.
begin;
do $cap$ begin if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if; end $cap$;
do $check$ begin
  if (select count(*) from public.places where id in ('pna-menlyn','pna-hazeldean') and not is_active and group_id='pna' and category_id='shops' and source_url='https://www.pna.co.za/pna-locations/' and source_checked_at='2026-10-18') <> 2 then raise exception 'Batch 12 expected two sourced inactive branches'; end if;
  if (select count(*) from public.place_hours where place_id in ('pna-menlyn','pna-hazeldean') and hours_type='opening' and source_url='https://www.pna.co.za/pna-locations/' and source_checked_at='2026-10-18') <> 14 then raise exception 'Batch 12 expected 14 sourced new-branch opening days'; end if;
end $check$;
update public.places set is_active=true,updated_at=now() where id in ('pna-menlyn','pna-hazeldean');
insert into public.live_statuses (place_id,busy_level,confidence_score,source) select id,'unknown',0,'unknown' from public.places where id in ('pna-menlyn','pna-hazeldean') on conflict (place_id) do nothing;
do $cap$ begin if pg_database_size(current_database()) > 113970579 then raise exception 'Pretoria East expansion reached its 100 MB growth cap'; end if; end $cap$;
commit;
