-- Kitchen Hours Permissions
begin;
do $$
declare definition text; updated text;
begin
 definition:=pg_get_functiondef('public.submit_kitchen_hours(text,text,time,time,boolean)'::regprocedure);
 updated:=replace(definition,'if v_user_id is null then',
  'if v_user_id is null or not exists(select 1 from auth.users where id=v_user_id and not coalesce(is_anonymous,false)) then');
 if updated=definition then raise exception 'Kitchen hours account guard missing'; end if;
 execute updated;
end;
$$;
commit;
