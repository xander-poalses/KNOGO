\set ON_ERROR_STOP on
-- Run only through the milestone Docker container. All fixture writes roll back.
begin;

do $$
begin
  if not exists(select 1 from public.places where id='milestone-browser-venue') then
    raise exception 'The milestone test venue is required.';
  end if;
  if not exists(select 1 from auth.users where email like 'milestone-browser-%@example.test' and email_confirmed_at is not null) then
    raise exception 'Complete the browser signup and email confirmation first.';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub',id::text,true)
from auth.users where email like 'milestone-browser-%@example.test'
and email_confirmed_at is not null order by created_at desc limit 1;

set local role anon;
do $$
begin
  perform id from public.places where id='milestone-browser-venue';
  if not found then raise exception 'Visitor must be able to read the test venue.'; end if;
  begin
    perform public.publish_venue_update('milestone-browser-venue','open_status','open',false);
    raise exception 'Visitor must not publish venue updates.';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_status_report('milestone-browser-venue','phone',null,'[{"type":"open_status","value":"open"}]'::jsonb);
    raise exception 'Visitor must not submit reports.';
  exception when insufficient_privilege then null;
  end;
end;
$$;

set local role authenticated;
do $$
begin
  if (public.read_venue_access('milestone-browser-venue')->>'verified')::boolean then
    raise exception 'Reporter must not start with venue access.';
  end if;
  begin
    perform public.publish_venue_update('milestone-browser-venue','open_status','open',false);
    raise exception 'Reporter must not publish venue updates.';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
-- This fixture proves role enforcement, not SMS delivery or ownership verification.
insert into knogo_private.venue_phone_sources(place_id,phone_e164,source_url,checked_at,enabled)
values('milestone-browser-venue','+27120000008','https://venue.example/test',now(),true);
with challenge as (
  insert into knogo_private.venue_claim_challenges
    (place_id,user_id,phone_source_checked_at,phone_source_version,phone_snapshot,channel,delivery_state,consumed_at)
  select place_id,auth.uid(),checked_at,source_version,phone_e164,'sms','sent',now()
  from knogo_private.venue_phone_sources where place_id='milestone-browser-venue'
  returning id,place_id,user_id
)
insert into knogo_private.venue_representatives(place_id,user_id,challenge_id)
select place_id,user_id,id from challenge;

set local role authenticated;
do $$
begin
  if not (public.read_venue_access('milestone-browser-venue')->>'verified')::boolean then
    raise exception 'Representative fixture must have venue access.';
  end if;
  if public.publish_venue_update('milestone-browser-venue','open_status','open',true) is null then
    raise exception 'Representative must be able to publish a venue update and dispute.';
  end if;
end;
$$;
reset role;
do $$
begin
  if not exists(select 1 from knogo_private.venue_disputes where place_id='milestone-browser-venue') then
    raise exception 'Representative dispute must persist within the transaction.';
  end if;
end;
$$;
rollback;
\echo PASS: visitor read/report boundary, reporter venue denial, representative update/dispute; fixture writes rolled back.
