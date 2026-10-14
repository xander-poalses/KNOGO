import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

if (!process.env.KNOGO_PGLITE_MODULE) throw new Error('Set KNOGO_PGLITE_MODULE to the installed PGlite module path.');
const { PGlite } = await import(pathToFileURL(process.env.KNOGO_PGLITE_MODULE).href);
const initial = await readFile(new URL('../supabase/migrations/001_initial_schema.sql', import.meta.url), 'utf8');
const migration = await readFile(new URL('../supabase/migrations/002_replace_areas_with_regions.sql', import.meta.url), 'utf8');

for (const legacy of [false, true]) {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    `);
    // PGlite has gen_random_uuid built in but does not bundle pgcrypto.
    await db.exec(initial.replace('create extension if not exists "pgcrypto";', ''));
    if (legacy) {
      await db.exec(`
        create table public.areas(id text primary key, name text, slug text, country text, province text);
        insert into public.areas values ('test-area', 'Test area', 'test-area', 'South Africa', 'Gauteng');
        alter table public.places add column area_id text references public.areas(id);
        alter table public.places alter column region_id drop not null;
        insert into public.places(id,slug,name,category_id,area_id,address,latitude,longitude)
          values ('test-place','test-place','Test place','restaurant','test-area','Test address',0,0);
      `);
    }
    await db.exec(migration);
    await db.exec(migration);
    assert.equal((await db.query("select to_regclass('public.areas') as table_name")).rows[0].table_name, null);
    assert.equal((await db.query("select count(*)::int as n from public.regions where id='pretoria'")).rows[0].n, 1);
    if (legacy) {
      assert.equal((await db.query("select region_id from public.places where id='test-place'")).rows[0].region_id, 'test-area');
      assert.equal((await db.query("select parent_id from public.regions where id='test-area'")).rows[0].parent_id, 'pretoria');
    }
    console.log(`${legacy ? 'Legacy areas' : 'Regions baseline'}: migration and repeat run passed.`);
  } finally {
    await db.close();
  }
}
