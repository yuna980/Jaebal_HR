alter table public.stadium_food_vendors
add column if not exists is_best boolean not null default false;

update public.stadium_food_vendors
set is_best = false;

update public.stadium_food_vendors
set is_best = true
where (stadium_name = '잠실야구장' and vendor_name = '통빱')
   or (stadium_name = '잠실야구장' and vendor_name = '잠실원샷')
   or (stadium_name = 'SSG랜더스필드' and vendor_name = '스테이션')
   or (stadium_name = 'SSG랜더스필드' and vendor_name = '민영활어공장')
   or (stadium_name = '사직야구장' and vendor_name = '송헌집')
   or (stadium_name = '사직야구장' and vendor_name = '보영만두')
   or (stadium_name = '고척스카이돔' and vendor_name = '쉬림프셰프')
   or (stadium_name = '한화생명볼파크' and vendor_name = '농심가락')
   or (stadium_name = '한화생명볼파크' and vendor_name = '바로그집')
   or (stadium_name = 'KT위즈파크' and vendor_name = '보영만두')
   or (stadium_name = 'KT위즈파크' and vendor_name = '본수원갈비')
   or (stadium_name = '삼성 라이온즈 파크' and vendor_name = '해피치즈스마일')
   or (stadium_name = '기아 챔피언스 필드' and vendor_name = '광주원샷')
   or (stadium_name = '창원NC파크' and vendor_name = '수내닭꼬치');
