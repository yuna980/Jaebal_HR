create or replace function public.infer_stadium_food_category(
  vendor_name_input text,
  main_menu_input text
)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%떡볶이%', '%순대%', '%김말이%', '%분식%', '%만두%', '%소떡%', '%떡강정%'
    ]) then '분식'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%국수%', '%우동%', '%라면%', '%냉면%', '%쫄면%', '%김치말이%', '%잔치국수%'
    ]) then '면요리'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%새우%', '%물회%', '%초밥%', '%막회%', '%육회%', '%활어%'
    ]) then '해산물'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%치킨%', '%콜팝%', '%튀김%', '%닭꼬치%', '%감자전%'
    ]) then '치킨/튀김'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%버거%', '%핫도그%', '%치즈스테이크%', '%카사바칩%'
    ]) then '버거/핫도그'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%빙수%', '%도넛%', '%츄러스%', '%커피%', '%빵%', '%밀크쉐이크%', '%아이스크림%'
    ]) then '디저트/카페'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%피자%'
    ]) then '피자'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%마라%', '%웍%', '%중식%', '%볶음%'
    ]) then '중식'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%갈비%', '%삼겹살%', '%고기%'
    ]) then '고기류'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%타코%', '%나초%'
    ]) then '스낵/멕시칸'
    else '간식/기타'
  end;
$$;

create or replace function public.set_stadium_food_vendor_category()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT'
    or new.vendor_name is distinct from old.vendor_name
    or new.main_menu is distinct from old.main_menu
    or coalesce(new.category, '') = ''
  then
    new.category := public.infer_stadium_food_category(new.vendor_name, new.main_menu);
  end if;

  return new;
end;
$$;

drop trigger if exists set_stadium_food_vendor_category_before_write on public.stadium_food_vendors;
create trigger set_stadium_food_vendor_category_before_write
before insert or update on public.stadium_food_vendors
for each row execute function public.set_stadium_food_vendor_category();

update public.stadium_food_vendors
set category = public.infer_stadium_food_category(vendor_name, main_menu);

