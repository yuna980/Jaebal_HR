insert into public.stadium_food_vendors (
  stadium_name,
  vendor_name,
  category,
  main_menu,
  location_description,
  display_order
)
values
  ('기아 챔피언스 필드', '광주원샷', '치킨', '커리치킨, 어니언탱지치킨', '3층 1루, 4층 1,3루', 48),
  ('창원NC파크', '수내닭꼬치', '간식', '닭꼬치', '외야 잔디석 뒤편', 54)
on conflict (stadium_name, vendor_name, main_menu, location_description)
do update set
  category = excluded.category,
  display_order = excluded.display_order;

update public.stadium_food_vendors
set category = case
  when stadium_name = '기아 챔피언스 필드' and vendor_name = '광주원샷' then '치킨'
  when stadium_name = '창원NC파크' and vendor_name = '수내닭꼬치' then '간식'
  else category
end
where (stadium_name = '기아 챔피언스 필드' and vendor_name = '광주원샷')
   or (stadium_name = '창원NC파크' and vendor_name = '수내닭꼬치');
