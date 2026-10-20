begin;
-- pg_net request headers contain the worker credential; only server owners may inspect them.
revoke all on schema net from public,anon,authenticated;
revoke all on all tables in schema net from public,anon,authenticated;
revoke all on all functions in schema net from public,anon,authenticated;
commit;
