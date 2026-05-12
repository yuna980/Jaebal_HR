alter table public.stadium_food_vendors
add column if not exists category text not null default '';

update public.stadium_food_vendors
set category = case
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%떡볶이%', '%순대%', '%김말이%', '%분식%', '%만두%', '%소떡%', '%떡강정%'
  ]) then '분식'
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%국수%', '%우동%', '%라면%', '%냉면%', '%쫄면%', '%김치말이%', '%잔치국수%'
  ]) then '면요리'
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%새우%', '%물회%', '%초밥%', '%막회%', '%육회%', '%활어%'
  ]) then '해산물'
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%치킨%', '%콜팝%', '%튀김%', '%닭꼬치%', '%감자전%'
  ]) then '치킨/튀김'
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%버거%', '%핫도그%', '%치즈스테이크%', '%카사바칩%'
  ]) then '버거/핫도그'
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%빙수%', '%도넛%', '%츄러스%', '%커피%', '%빵%', '%밀크쉐이크%', '%아이스크림%'
  ]) then '디저트/카페'
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%피자%'
  ]) then '피자'
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%마라%', '%웍%', '%중식%', '%볶음%'
  ]) then '중식'
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%갈비%', '%삼겹살%', '%고기%'
  ]) then '고기류'
  when lower(vendor_name || ' ' || main_menu) like any (array[
    '%타코%', '%나초%'
  ]) then '스낵/멕시칸'
  else '간식/기타'
end;

