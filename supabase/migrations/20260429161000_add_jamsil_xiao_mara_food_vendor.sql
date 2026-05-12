insert into public.stadium_food_vendors (
  stadium_name,
  vendor_name,
  category,
  main_menu,
  location_description,
  display_order
)
values
  ('잠실야구장', '샤오마라', '중식', '마라꼬치', '3,4층 1루', 7)
on conflict (stadium_name, vendor_name, main_menu, location_description)
do update set
  category = excluded.category,
  display_order = excluded.display_order;

update public.stadium_food_vendors
set category = '중식'
where stadium_name = '잠실야구장'
  and vendor_name = '샤오마라'
  and main_menu = '마라꼬치'
  and location_description = '3,4층 1루';
