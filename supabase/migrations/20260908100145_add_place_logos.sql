alter table public.place_groups
  add column if not exists logo_url text,
  add column if not exists logo_source_url text,
  add column if not exists logo_checked_at date;

alter table public.places
  add column if not exists logo_url text,
  add column if not exists logo_source_url text,
  add column if not exists logo_checked_at date;

comment on column public.place_groups.logo_url is 'Direct URL for a reviewed JPEG logo with its real background baked into the image.';
comment on column public.place_groups.logo_source_url is 'Official page where the logo asset was verified.';
comment on column public.places.logo_url is 'Direct URL for a reviewed JPEG logo with its real background baked into the image.';
