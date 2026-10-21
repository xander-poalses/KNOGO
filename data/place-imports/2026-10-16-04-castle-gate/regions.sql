-- Regions
insert into public.regions(id,name,slug,region_type,parent_id)
values('erasmus-park','Erasmus Park','erasmus-park','suburb_area','pretoria')
on conflict(id) do nothing;
