do $$
declare definition text;
begin
 if has_function_privilege('anon','public.submit_tester_feedback(text,text,text)','execute') then
  raise exception 'Public feedback execution is enabled.';
 end if;
 if has_table_privilege('authenticated','knogo_private.tester_feedback','select') or has_table_privilege('authenticated','knogo_private.tester_feedback','insert') then
  raise exception 'Client table access is enabled.';
 end if;
 if not has_function_privilege('authenticated','public.submit_tester_feedback(text,text,text)','execute') then
  raise exception 'Authenticated feedback execution is missing.';
 end if;
 if not (select relrowsecurity from pg_class where oid='knogo_private.tester_feedback'::regclass) then
  raise exception 'Feedback RLS is disabled.';
 end if;
 select pg_get_functiondef('public.submit_tester_feedback(text,text,text)'::regprocedure) into definition;
 if position('raw_app_meta_data' in definition)=0 or position('pg_advisory_xact_lock' in definition)=0 then
  raise exception 'Feedback approval or rate-limit guard is missing.';
 end if;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 begin
  perform public.submit_tester_feedback('suggestion','A suggestion for testing.','test');
  raise exception 'Missing identity was accepted.' using errcode='XX000';
 exception when insufficient_privilege then null;
 end;
end;
$$;
