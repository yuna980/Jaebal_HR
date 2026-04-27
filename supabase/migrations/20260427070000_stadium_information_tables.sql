create extension if not exists moddatetime schema extensions;

create table if not exists public.stadium_information (
  id bigint generated always as identity primary key,
  stadium_name text not null unique,
  address text not null default '',
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now()
);

create table if not exists public.stadium_food_vendors (
  id bigint generated always as identity primary key,
  stadium_name text not null references public.stadium_information(stadium_name) on update cascade on delete restrict,
  vendor_name text not null,
  main_menu text not null default '',
  location_description text not null default '',
  display_order integer not null default 0,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (stadium_name, vendor_name, main_menu, location_description)
);

create table if not exists public.stadium_goods_shops (
  id bigint generated always as identity primary key,
  stadium_label text not null,
  stadium_name text not null references public.stadium_information(stadium_name) on update cascade on delete restrict,
  shop_location text not null default '',
  opening_hours text not null default '',
  display_order integer not null default 0,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (stadium_label, shop_location)
);

create table if not exists public.stadium_parking_lots (
  id bigint generated always as identity primary key,
  stadium_name text not null references public.stadium_information(stadium_name) on update cascade on delete restrict,
  parking_location text not null default '',
  fee_description text not null default '',
  note text not null default '',
  display_order integer not null default 0,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (stadium_name, parking_location)
);

alter table public.stadium_information enable row level security;
alter table public.stadium_food_vendors enable row level security;
alter table public.stadium_goods_shops enable row level security;
alter table public.stadium_parking_lots enable row level security;

drop policy if exists "stadium_information_select_public" on public.stadium_information;
create policy "stadium_information_select_public"
on public.stadium_information
for select
to anon, authenticated
using (true);

drop policy if exists "stadium_food_vendors_select_public" on public.stadium_food_vendors;
create policy "stadium_food_vendors_select_public"
on public.stadium_food_vendors
for select
to anon, authenticated
using (true);

drop policy if exists "stadium_goods_shops_select_public" on public.stadium_goods_shops;
create policy "stadium_goods_shops_select_public"
on public.stadium_goods_shops
for select
to anon, authenticated
using (true);

drop policy if exists "stadium_parking_lots_select_public" on public.stadium_parking_lots;
create policy "stadium_parking_lots_select_public"
on public.stadium_parking_lots
for select
to anon, authenticated
using (true);

drop trigger if exists handle_stadium_information_updated_at on public.stadium_information;
create trigger handle_stadium_information_updated_at
before update on public.stadium_information
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_stadium_food_vendors_updated_at on public.stadium_food_vendors;
create trigger handle_stadium_food_vendors_updated_at
before update on public.stadium_food_vendors
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_stadium_goods_shops_updated_at on public.stadium_goods_shops;
create trigger handle_stadium_goods_shops_updated_at
before update on public.stadium_goods_shops
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_stadium_parking_lots_updated_at on public.stadium_parking_lots;
create trigger handle_stadium_parking_lots_updated_at
before update on public.stadium_parking_lots
for each row execute procedure extensions.moddatetime(updated_at);

insert into public.stadium_information (stadium_name, address)
values
  ('잠실야구장', '서울특별시 송파구 올림픽로 25'),
  ('SSG랜더스필드', '인천광역시 미추홀구 매소홀로 618'),
  ('사직야구장', '부산광역시 동래구 사직로 45'),
  ('고척스카이돔', '서울특별시 구로구 경인로 430'),
  ('한화생명볼파크', '대전광역시 중구 대종로 373'),
  ('KT위즈파크', '경기도 수원시 장안구 경수대로 893'),
  ('삼성 라이온즈 파크', '대구광역시 수성구 야구전설로 1'),
  ('기아 챔피언스 필드', '광주광역시 북구 서림로 10'),
  ('창원NC파크', '경상남도 창원시 마산회원구 삼호로 63')
on conflict (stadium_name) do update set
  address = excluded.address;

insert into public.stadium_food_vendors (stadium_name, vendor_name, main_menu, location_description, display_order)
values
  ('잠실야구장', '타코잇', '타코, 나초', '1루 2층 / 3루 2층', 1),
  ('잠실야구장', '통빱', '김치말이국수, 잔치국수, 우동', '1루 2.5층 / 3루 2층', 2),
  ('잠실야구장', '잠실원샷', '치킨, 칠리새우, 크림새우 콜팝', '1루 2층 / 3루 1~2층', 3),
  ('잠실야구장', '꺼꾸잽이 초장집', '컵육회, 컵막회', '1루 2층', 4),
  ('잠실야구장', '보영만두', '쫄면, 군만두', '3루 2층', 5),
  ('잠실야구장', '우이락', '고추튀김', '3층 중앙', 6),
  ('SSG랜더스필드', '스테이션', '크림새우', '2층 1루', 7),
  ('SSG랜더스필드', '우이락', '고추튀김, 감자전, 쫄면', '2층 바베큐존 뒤', 8),
  ('SSG랜더스필드', '민영활어공장', '컵물회, 초밥', '1층 3루 끝부분', 9),
  ('SSG랜더스필드', '북촌손만두', '튀김만두, 굴림만두', '1층 3루 동선상', 10),
  ('SSG랜더스필드', '국대떡볶이', '떡볶이', '1층 3루 동선상', 11),
  ('SSG랜더스필드', '오레오츄러스', '츄러스, 아이스크림 츄러스', '1층 3루 입장 후 근처', 12),
  ('SSG랜더스필드', '버거샵', '수제버거, 프렌치프라이', '중앙 3층 032게이트 / 3층 1루측 B3', 13),
  ('사직야구장', '반할크림새우', '크림새우', '1루 2층 124게이트', 14),
  ('사직야구장', '크리스피크림도넛', '도넛, 밀크쉐이크', '1루 2층 125게이트', 15),
  ('사직야구장', '스테프핫도그', '핫도그, 카사바칩', '3루 3층 331게이트', 16),
  ('사직야구장', '보영만두', '군만두, 쫄면', '3루 2층 326게이트', 17),
  ('사직야구장', '계란빵클럽', '계란빵, 막걸리슬러시', '3루측 2층 4게이트 옆', 18),
  ('고척스카이돔', '쉬림프셰프', '크림새우, 마라크림새우', '내야 2층 4번 통로 맞은편', 19),
  ('고척스카이돔', '스테프핫도그', '핫도그', '내야 2층 11번 통로 맞은편', 20),
  ('고척스카이돔', '펠리스돔', '치즈스테이크', '내야 2층 5~6번 통로 사이', 21),
  ('고척스카이돔', '맘스터치', '싸이버거, 불고기버거', '내야 4층 26~27번 통로 사이', 22),
  ('고척스카이돔', '알통떡강정', '소떡소떡, 감자핫도그', '외야 3층 4번 통로 맞은편', 23),
  ('고척스카이돔', '올떡', '떡볶이, 튀김, 순대', '외야 3층 2~3번 통로 사이', 24),
  ('한화생명볼파크', '더본테이스티 고투웍', '크림새우', '2층 3루 내야 끝쪽', 25),
  ('한화생명볼파크', '농심가락', '열무국수, 떡볶이, 라면', '3루 1층 3-1 게이트 또는 3-2 게이트', 26),
  ('한화생명볼파크', '바로그집', '떡볶이, 김말이', '1루 1-1 게이트', 27),
  ('한화생명볼파크', '브리쉘프라이', '감자튀김', '3루 1층 3-1 게이트 또는 3-2 게이트', 28),
  ('한화생명볼파크', 'BBQ', '콜팝, 치킨', '2층 중앙(입구)', 29),
  ('한화생명볼파크', '아라마크', '핫도그, 나초', '2층 1루', 30),
  ('KT위즈파크', '보영만두', '군만두, 쫄면', '2층 중앙매장', 31),
  ('KT위즈파크', '진미통닭', '후라이드치킨', '2층 중앙매장', 32),
  ('KT위즈파크', '본수원갈비', '갈비', '2층 중앙매장', 33),
  ('KT위즈파크', '웍스터', '볶음/중식류', '2층 중앙매장', 34),
  ('KT위즈파크', '브리쉘프라이', '감자튀김', '2층 중앙매장', 35),
  ('KT위즈파크', '샤오마라', '마라꼬치', '3루 L2 C', 36),
  ('삼성 라이온즈 파크', '스테이션', '크림새우, 칠리새우', '5층 SKY 3루 근처', 37),
  ('삼성 라이온즈 파크', '만재네', '김치말이국수, 삼겹살', '2층 외야석 3루 근처', 38),
  ('삼성 라이온즈 파크', '서문빙수', '팥빙수, 망고빙수, 파인애플빙수', '3층 내야석 중앙~3루 사이', 39),
  ('삼성 라이온즈 파크', '전설꼬치', '닭꼬치', '3층 내야석 중앙~3루 사이', 40),
  ('삼성 라이온즈 파크', '해피치즈스마일', '떡볶이, 분식', '2층 푸드스트리트 / 3층 내야석 중앙~3루 사이', 41),
  ('기아 챔피언스 필드', '스테이션', '크림새우', '1루 K8 106~104구역 앞', 42),
  ('기아 챔피언스 필드', '파파존스', '피자', '3층 1루', 43),
  ('기아 챔피언스 필드', 'BHC', '뿌링미니콜팝', '3층 K8 1루 104구역 앞', 44),
  ('기아 챔피언스 필드', 'XOXO핫도그', '핫도그, 감자튀김', '3층 1루(K8~K9 구역 인근), 4층 1루', 45),
  ('기아 챔피언스 필드', '마성떡볶이', '떡볶이', '3층 3루', 46),
  ('기아 챔피언스 필드', '인크커피', '야구공빵', '1층 1루', 47),
  ('창원NC파크', '우이락', '고추튀김', '1층 1루', 48),
  ('창원NC파크', '스테이션', '크림새우', '1층 3루', 49),
  ('창원NC파크', '북촌손만두', '냉면, 만두', '1층 3루', 50),
  ('창원NC파크', '만재네', '고기류, 김치말이국수', '1층 1루 / 외야', 51),
  ('창원NC파크', 'BHC', '치킨', '1층 중앙 / 외야, 2층 1루', 52),
  ('창원NC파크', '브리쉘프라이', '감자튀김', '외야', 53)
on conflict (stadium_name, vendor_name, main_menu, location_description) do update set
  display_order = excluded.display_order;

insert into public.stadium_goods_shops (stadium_label, stadium_name, shop_location, opening_hours, display_order)
values
  ('잠실야구장(LG 트윈스 홈경기 기준)', '잠실야구장', '내부: 1루 내야 / 외부: 중앙 매표소 옆(외야 1~3게이트 옆)', '주중 경기일 기준 경기시작 1시간 30분 전 ~ 경기 종료 30분 후까지 운영
주말 경기일 기준 경기시작 2시간 전 ~ 경기종료 30분 후까지 운영
비경기일 기준 오후 3시 ~ 8시 (단, 월요일 휴무)', 1),
  ('잠실야구장(두산 베어스 홈경기 기 기준)', '잠실야구장', '외야 3루 출입구에서 제1매표소 방향', '경기일 경기 시작 2시간 전 ~ 종료 후 30분 / 비경기일 15:00 ~ 20:00 (월요일 휴무)', 2),
  ('SSG랜더스필드', 'SSG랜더스필드', '내야 3번 게이트 / 외야 7번 게이트', '홈경기일 10:00 ~ 19:00 / 원정경기일 10:00 ~ 17:00 / 월요일, 홈경기 없는 주말 휴무 / 비시즌 10:00 ~ 17:00 (주말·공휴일 휴무)', 3),
  ('사직야구장', '사직야구장', '정문 1층 야외 / 3층', '운영시간 명시 확인 안 됨', 4),
  ('고척스카이돔', '고척스카이돔', 'C게이트 옆', '경기일 경기 시작 2시간 전 ~ 종료 후 30분 / 비경기일 미운영', 5),
  ('한화생명볼파크', '한화생명볼파크', '2층 중앙쯤, 중앙 게이트 에스컬레이터 타고 올라가면 바로 보임', '정확한 상설 운영시간 확인 안 됨', 6),
  ('KT위즈파크', 'KT위즈파크', '1층 티켓 발권 부스 옆', '경기 종료 후 30분까지 확인', 7),
  ('삼성 라이온즈 파크', '삼성 라이온즈 파크', '3루 출입구 쪽, CU 지나 조금 더 가면 위치', '경기 있는 날 10:00 ~ 경기 종료까지 / 비경기일 10:00 ~ 17:00', 8),
  ('기아 챔피언스 필드', '기아 챔피언스 필드', '야구장 외부 3루쪽 4출입구 옆', '경기 시작 2시간 30분 전 ~ 경기 종료 후 30분', 9),
  ('창원NC파크', '창원NC파크', 'Gate 1 옆', '홈경기일 경기 시작 3시간 전 ~ 종료 후 30분 / 홈경기 없는 날 13:00 ~ 19:00 / 매주 월요일 휴무', 10)
on conflict (stadium_label, shop_location) do update set
  stadium_name = excluded.stadium_name,
  opening_hours = excluded.opening_hours,
  display_order = excluded.display_order;

insert into public.stadium_parking_lots (stadium_name, parking_location, fee_description, note, display_order)
values
  ('잠실야구장', '잠실종합운동장 주차장 / 한강공원 잠실지구 주차장 / 탄천주차장', '한강공원 잠실지구 소형 3,000원 / 중형 6,000원 / 대형 9,000원(1일)
송파탄천 7시간 2,000원, 이후 1시간당 1,000원', '경기일 혼잡 매우 심함. 잠실야구장 바로 붙은 주차장보다 탄천주차장을 대체지로 많이 씀.', 1),
  ('SSG랜더스필드', '구장 지상주차장 + 지하 1~4층', '승용차 2,000원 / 15인승 이상 승합 4,000원 / 25인승 이상 버스 6,000원(전일권)', '입차 후 15분 이내 무료 회차. 프로야구·콘서트 등 대규모 행사 때는 행사 시작 3시간 전~종료 1시간 후 선불제.', 2),
  ('사직야구장', '부산사직종합운동장 부설주차장', '공식 확인 안 됨', '', 3),
  ('고척스카이돔', '구장 내 일반주차 불가, 인근 생각공장 구로, 고척산업용품종합상가, 중앙유통단지, 구로기계공구상가 안내', '생각공장 10분 1,000원 · 고척산업용품종합상가 30분 1,000원 · 중앙유통단지 30분 1,000원', '공식 안내상 고척돔 내 주차 불가. 일반 관람객은 인근 민영/상가 주차장 이용 구조.', 4),
  ('한화생명볼파크', '구장 인근 임시 공영주차장(예: 대사문화공원 예정지, 대전화교소학교 부지)', '무료 확인', '최근 대전시·중구가 임시 공영주차장을 추가 개방. 다만 면수 제한이 커서 조기 만차 가능성 높음.', 5),
  ('KT위즈파크', '수원종합운동장 부설주차장', '30분 600원 / 이후 10분당 300원 / 1일 최대 7,000원', '경기일 사전주차 예약제 운영 안내가 확인됨. 만차 시 인근 공영주차장 대체 이용 권장.', 6),
  ('삼성 라이온즈 파크', '구장 주차장 이용 가능', '공식 확인 안 됨', '', 7),
  ('기아 챔피언스 필드', '구장 인근 주차장 이용', '공식 확인 안 됨', '', 8),
  ('창원NC파크', '양덕공영주차장, NC주차장, 양지주차장, 알뜰주차장', '공식 확인 안 됨', '양덕공영주차장의 경우, 경기 종료 후 1시간까지 무료', 9)
on conflict (stadium_name, parking_location) do update set
  fee_description = excluded.fee_description,
  note = excluded.note,
  display_order = excluded.display_order;
