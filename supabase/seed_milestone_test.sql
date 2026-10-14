-- Local report tests only. Never apply this fixture to hosted Supabase.
insert into public.places(id,slug,name,category_id,region_id,address,latitude,longitude,is_active)
values
  ('milestone-test-venue','milestone-test-venue','Report Test Venue','restaurant','pretoria','Test fixture, not a destination',0,0,true),
  ('milestone-browser-venue','milestone-browser-venue','KNOGO Test Venue','restaurant','pretoria','Test fixture, not a destination',0,0,true)
on conflict(id) do nothing;
