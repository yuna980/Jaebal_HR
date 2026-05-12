alter table public.stadiums
add column if not exists public_transport_directions text not null default '';

update public.stadiums
set public_transport_directions = case stadium_name
  when '잠실야구장' then '2호선 종합운동장역 6·7번 출구'
  when 'SSG랜더스필드' then '인천1호선 문학경기장역 2번 출구'
  when '사직야구장' then '부산 3호선 사직역 1번 출구, 종합운동장역 11번 출구'
  when '고척스카이돔' then '1호선 구일역 2번 출구'
  when '한화생명볼파크' then '급행4, 513, 604 탑승 후 한밭종합운동장 하차'
  when 'KT위즈파크' then '1호선 화서역 하차 → 19번 버스 탑승 후 수원KT위즈파크, 경기도청소년활동진흥센터 하차(택시로 10분 소요)

수원역 하차 → 310, 900, 7-1A, 7-2, 777, 2007, 3000, 7770번 버스 탑승 후 수원KT위즈파크, 경기도청소년활동진흥센터 하차(택시로 10분 소요)

성균관대역 하차 → 62-1, 99-2번 버스 탑승 후 장안지하차도, 수원KT위즈파크 하차(택시로 10분 소요)'
  when '삼성 라이온즈 파크' then '대구 2호선 수성알파시티(삼성라이온즈파크)역 4·5번 출구'
  when '기아 챔피언스 필드' then '10, 44, 50, 57, 80, 111, 131, 189, 1002(심야) 탑승 후 기아 챔피언스 필드 인근 하차'
  when '창원NC파크' then '100, 106, 160, 53, 540 탑승 후 창원NC파크 인근 하차'
  else public_transport_directions
end;
