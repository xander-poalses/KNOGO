import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

if (!process.env.KNOGO_PGLITE_MODULE) throw new Error('Set KNOGO_PGLITE_MODULE to the PGlite module path.');
const { PGlite } = await import(pathToFileURL(process.env.KNOGO_PGLITE_MODULE).href);
const db = new PGlite();
const migration = await readFile(new URL('../supabase/migrations/20261001221614_trip_provider_caps.sql', import.meta.url), 'utf8');
try {
  await db.exec('create role anon; create role authenticated; create role service_role;');
  // Deliberately no place/report tables or trust migration: this must stand alone.
  await db.exec(migration);
  const reserve = async (provider) => (await db.query('select public.reserve_trip_provider_call($1) as allowed', [provider])).rows[0].allowed;
  const counters = async () => (await db.query('select * from knogo_trip_private.provider_usage order by provider,day')).rows;
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(reserve('routes'), /permission denied/);
    for (const table of ['provider_limits', 'provider_usage', 'provider_call_windows']) {
      await assert.rejects(db.query(`select * from knogo_trip_private.${table}`), /permission denied/);
      await assert.rejects(db.query(`delete from knogo_trip_private.${table}`), /permission denied/);
    }
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  assert.equal(await reserve('routes'), false);
  assert.equal(await reserve('addresses'), false);
  assert.equal(await reserve('gemini'), false);
  assert.equal(await reserve(null), false);
  await db.exec('reset role');
  assert.deepEqual(await counters(), []);
  const limits = (await db.query('select * from knogo_trip_private.provider_limits order by provider')).rows;
  assert.deepEqual(limits, [
    { provider: 'addresses', daily_limit: 100, minute_limit: 10, enabled: false },
    { provider: 'routes', daily_limit: 100, minute_limit: 10, enabled: false },
  ]);
  const rls = (await db.query("select relrowsecurity from pg_class c join pg_namespace n on c.relnamespace=n.oid where n.nspname='knogo_trip_private' and c.relkind='r'")).rows;
  assert.equal(rls.length, 3); assert.ok(rls.every(row => row.relrowsecurity));
  for (const update of ['daily_limit=101', 'minute_limit=11', 'daily_limit=0', 'minute_limit=0']) {
    await assert.rejects(db.exec(`update knogo_trip_private.provider_limits set ${update} where provider='routes'`), /check constraint/);
  }
  await db.exec("update knogo_trip_private.provider_limits set enabled=true,daily_limit=3,minute_limit=2 where provider='routes'");
  await db.exec('set role service_role');
  assert.deepEqual(await Promise.all([reserve('routes'), reserve('routes'), reserve('routes')]), [true, true, false]);
  assert.equal(await reserve('addresses'), false);
  await db.exec('reset role');
  assert.equal((await counters())[0].calls, 2);
  await db.exec("update knogo_trip_private.provider_usage set day=day-1 where provider='routes'");
  assert.equal(await reserve('routes'), false); // Midnight does not bypass the minute cap.
  await db.exec("update knogo_trip_private.provider_call_windows set reserved_at=array[clock_timestamp()-interval '61 seconds'] where provider='routes'");
  assert.equal(await reserve('routes'), true);
  await db.exec("update knogo_trip_private.provider_call_windows set reserved_at='{}' where provider='routes'");
  assert.deepEqual(await Promise.all([reserve('routes'), reserve('routes'), reserve('routes')]), [true, true, false]);
  const before = await counters();
  await db.exec(migration); // Reapplication must not reset usage, caps or enablement.
  assert.deepEqual(await counters(), before);
  assert.equal((await db.query("select enabled from knogo_trip_private.provider_limits where provider='routes'")).rows[0].enabled, true);
  assert.equal(await reserve('routes'), false);
  await db.exec("update knogo_trip_private.provider_limits set enabled=false where provider='routes'");
  assert.equal(await reserve('routes'), false);
  assert.deepEqual(await counters(), before);
  assert.equal((await db.query("select count(*)::integer as count from pg_tables where schemaname='public'")).rows[0].count, 0);
  console.log('Trip database QA passed: standalone setup, RLS, server-only RPC, disabled defaults, caps, UTC reset, retry and kill switch. No hosted changes.');
} finally { await db.close(); }
