begin;

alter table public.places
  add column if not exists image_source_url text,
  add column if not exists image_attribution text,
  add column if not exists image_checked_at date;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('place-images', 'place-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read place images" on storage.objects;
create policy "Public can read place images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'place-images');

commit;
