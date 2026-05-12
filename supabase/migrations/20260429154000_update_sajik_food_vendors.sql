delete from public.stadium_food_vendors
where stadium_name = '사직야구장'
  and (
    vendor_name = '반할크림새우'
    or main_menu = '크림새우'
  );

insert into public.stadium_food_vendors (
  stadium_name,
  vendor_name,
  category,
  main_menu,
  location_description,
  display_order
)
values
  ('사직야구장', '송헌집', '간식', '숯불 소세지', '031게이트', 19),
  ('사직야구장', '코마모메', '일식', '텐동, 모밀', '1루 외야 2층 924 게이트', 20),
  ('사직야구장', '상하이마라꼬치', '중식', '마라꼬치', '1루 외야 922 게이트', 21),
  ('사직야구장', '밀락당', '디저트', '메론빵, 아이스크림', '1루 2층 123 게이트', 22)
on conflict (stadium_name, vendor_name, main_menu, location_description)
do update set
  category = excluded.category,
  display_order = excluded.display_order;

update public.stadium_food_vendors
set category = case vendor_name
  when '송헌집' then '간식'
  when '코마모메' then '일식'
  when '상하이마라꼬치' then '중식'
  when '밀락당' then '디저트'
  else category
end
where stadium_name = '사직야구장'
  and vendor_name in ('송헌집', '코마모메', '상하이마라꼬치', '밀락당');
