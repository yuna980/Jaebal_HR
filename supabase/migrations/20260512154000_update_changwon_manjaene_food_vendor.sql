update public.stadium_food_vendors
set
  main_menu = '삼겹살 도시락',
  location_description = '1층 128블럭'
where stadium_name = '창원NC파크'
  and vendor_name = '만재네'
  and main_menu = '고기류, 김치말이국수'
  and location_description = '1층 1루 / 외야';
