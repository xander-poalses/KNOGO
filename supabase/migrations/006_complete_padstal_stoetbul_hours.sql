begin;

-- Branch identity and contact details were checked on the owners' pages on 2026-08-28.
-- Hours were checked against current map listings because the owner pages do not publish full weekly hours.
delete from public.place_hours
where place_id in (
  'padstal-lynnwood',
  'padstal-hatfield',
  'padstal-hazelwood',
  'stoetbul-parkview',
  'stoetbul-braaibar-olympus'
) and hours_type = 'opening';

insert into public.place_hours
  (place_id, hours_type, day_of_week, open_time, close_time, is_closed, sort_order)
values
  ('padstal-lynnwood','opening','Mon','09:00','02:00',false,1),
  ('padstal-lynnwood','opening','Tue','09:00','02:00',false,2),
  ('padstal-lynnwood','opening','Wed','09:00','02:00',false,3),
  ('padstal-lynnwood','opening','Thu','09:00','02:00',false,4),
  ('padstal-lynnwood','opening','Fri','09:00','02:00',false,5),
  ('padstal-lynnwood','opening','Sat','09:00','02:00',false,6),
  ('padstal-lynnwood','opening','Sun','09:00','20:00',false,7),
  ('padstal-hatfield','opening','Mon','10:00','02:00',false,1),
  ('padstal-hatfield','opening','Tue','10:00','02:00',false,2),
  ('padstal-hatfield','opening','Wed','10:00','02:00',false,3),
  ('padstal-hatfield','opening','Thu','10:00','02:00',false,4),
  ('padstal-hatfield','opening','Fri','10:00','02:00',false,5),
  ('padstal-hatfield','opening','Sat','10:00','02:00',false,6),
  ('padstal-hatfield','opening','Sun',null,null,true,7),
  ('padstal-hazelwood','opening','Mon','10:00','02:00',false,1),
  ('padstal-hazelwood','opening','Tue','10:00','02:00',false,2),
  ('padstal-hazelwood','opening','Wed','10:00','02:00',false,3),
  ('padstal-hazelwood','opening','Thu','10:00','02:00',false,4),
  ('padstal-hazelwood','opening','Fri','10:00','02:00',false,5),
  ('padstal-hazelwood','opening','Sat','10:00','02:00',false,6),
  ('padstal-hazelwood','opening','Sun','10:00','20:00',false,7),
  ('stoetbul-parkview','opening','Mon',null,null,true,1),
  ('stoetbul-parkview','opening','Tue',null,null,true,2),
  ('stoetbul-parkview','opening','Wed','17:00','02:00',false,3),
  ('stoetbul-parkview','opening','Thu','17:00','02:00',false,4),
  ('stoetbul-parkview','opening','Fri','12:00','02:00',false,5),
  ('stoetbul-parkview','opening','Sat','17:00','02:00',false,6),
  ('stoetbul-parkview','opening','Sun',null,null,true,7),
  ('stoetbul-braaibar-olympus','opening','Mon','09:00','20:00',false,1),
  ('stoetbul-braaibar-olympus','opening','Tue','10:00','22:00',false,2),
  ('stoetbul-braaibar-olympus','opening','Wed','10:00','22:00',false,3),
  ('stoetbul-braaibar-olympus','opening','Thu','10:00','22:00',false,4),
  ('stoetbul-braaibar-olympus','opening','Fri','08:00','00:00',false,5),
  ('stoetbul-braaibar-olympus','opening','Sat','08:00','00:00',false,6),
  ('stoetbul-braaibar-olympus','opening','Sun','07:00','18:00',false,7);

commit;
