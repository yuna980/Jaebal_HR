create extension if not exists moddatetime schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  favorite_team_id text,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now()
);

create table if not exists public.fan_diaries (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null,
  game_date text not null,
  venue text not null default '',
  result text not null default '-',
  review text not null default '',
  rating integer not null default 0 check (rating between 0 and 5),
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (user_id, team_id, game_date)
);

create table if not exists public.attendance_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  team_id text not null,
  game_date text not null,
  venue text not null default '',
  is_attending boolean not null default false,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (user_id, team_id, game_date)
);

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  game_reminder_enabled boolean not null default true,
  attendance_tip_enabled boolean not null default true,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now()
);

create table if not exists public.notification_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null default 'web_push',
  endpoint text not null,
  keys jsonb not null default '{}'::jsonb,
  platform text not null default 'web',
  user_agent text not null default '',
  is_active boolean not null default true,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (user_id, channel, endpoint)
);

create table if not exists public.game_histories (
  id bigint generated always as identity primary key,
  season_year integer not null,
  game_date date not null,
  home_team_id text not null,
  away_team_id text not null,
  stadium text not null default '',
  home_score integer,
  away_score integer,
  status text not null check (status in ('finished', 'cancelled')),
  note text not null default '',
  winning_pitcher_name text,
  losing_pitcher_name text,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  last_synced_at timestamptz(1) not null default now(),
  unique (season_year, game_date, home_team_id, away_team_id)
);

create table if not exists public.game_schedules (
  id bigint generated always as identity primary key,
  season_year integer not null,
  game_date date not null,
  game_time text not null default '',
  home_team_id text not null,
  away_team_id text not null,
  stadium text not null default '',
  note text not null default '',
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (season_year, game_date, home_team_id, away_team_id)
);

create table if not exists public.notification_deliveries (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_schedule_id bigint not null references public.game_schedules(id) on delete cascade,
  notification_type text not null,
  channel text not null default 'web_push',
  status text not null check (status in ('pending', 'sent', 'failed', 'skipped')),
  sent_at timestamptz(1),
  error_message text,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (user_id, game_schedule_id, notification_type, channel)
);

create index if not exists notification_subscriptions_user_active_idx
on public.notification_subscriptions (user_id, channel, is_active);

create index if not exists notification_deliveries_game_type_idx
on public.notification_deliveries (game_schedule_id, notification_type, channel, status);

create table if not exists public.game_lineups (
  id bigint generated always as identity primary key,
  game_schedule_id bigint references public.game_schedules(id) on delete cascade,
  season_year integer not null,
  game_date date not null,
  game_time text not null default '',
  home_team_id text not null,
  away_team_id text not null,
  home_starting_pitcher jsonb,
  away_starting_pitcher jsonb,
  home_batting_order jsonb not null default '[]'::jsonb,
  away_batting_order jsonb not null default '[]'::jsonb,
  is_lineup_out boolean not null default false,
  pitcher_synced_at timestamptz(1),
  lineup_synced_at timestamptz(1),
  last_attempted_at timestamptz(1),
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (season_year, game_date, home_team_id, away_team_id)
);

create table if not exists public.stadiums (
  id bigint generated always as identity primary key,
  stadium_name text not null unique,
  address text not null default '',
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now()
);

create table if not exists public.stadium_food_vendors (
  id bigint generated always as identity primary key,
  stadium_name text not null references public.stadiums(stadium_name) on update cascade on delete restrict,
  vendor_name text not null,
  category text not null default '',
  main_menu text not null default '',
  location_description text not null default '',
  is_best boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (stadium_name, vendor_name, main_menu, location_description)
);

create table if not exists public.stadium_goods_shops (
  id bigint generated always as identity primary key,
  stadium_label text not null,
  stadium_name text not null references public.stadiums(stadium_name) on update cascade on delete restrict,
  shop_location text not null default '',
  opening_hours text not null default '',
  display_order integer not null default 0,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (stadium_label, shop_location)
);

create table if not exists public.stadium_parking_lots (
  id bigint generated always as identity primary key,
  stadium_name text not null references public.stadiums(stadium_name) on update cascade on delete restrict,
  parking_location text not null default '',
  fee_description text not null default '',
  note text not null default '',
  display_order integer not null default 0,
  created_at timestamptz(1) not null default now(),
  updated_at timestamptz(1) not null default now(),
  unique (stadium_name, parking_location)
);

alter table public.profiles
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.fan_diaries
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.fan_diaries
  drop column if exists is_attending;

alter table public.attendance_records
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.notification_preferences
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.notification_subscriptions
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.notification_deliveries
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.game_histories
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1),
  alter column last_synced_at type timestamptz(1);

alter table public.game_schedules
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.game_lineups
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.stadiums enable row level security;
alter table public.stadium_food_vendors enable row level security;
alter table public.stadium_goods_shops enable row level security;
alter table public.stadium_parking_lots enable row level security;

alter table public.profiles enable row level security;
alter table public.fan_diaries enable row level security;
alter table public.attendance_records enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_subscriptions enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.game_histories enable row level security;
alter table public.game_schedules enable row level security;
alter table public.game_lineups enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "fan_diaries_select_own" on public.fan_diaries;
create policy "fan_diaries_select_own"
on public.fan_diaries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "fan_diaries_insert_own" on public.fan_diaries;
create policy "fan_diaries_insert_own"
on public.fan_diaries
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "fan_diaries_update_own" on public.fan_diaries;
create policy "fan_diaries_update_own"
on public.fan_diaries
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "fan_diaries_delete_own" on public.fan_diaries;
create policy "fan_diaries_delete_own"
on public.fan_diaries
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "attendance_records_select_own" on public.attendance_records;
create policy "attendance_records_select_own"
on public.attendance_records
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "attendance_records_insert_own" on public.attendance_records;
create policy "attendance_records_insert_own"
on public.attendance_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "attendance_records_update_own" on public.attendance_records;
create policy "attendance_records_update_own"
on public.attendance_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "attendance_records_delete_own" on public.attendance_records;
create policy "attendance_records_delete_own"
on public.attendance_records
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own"
on public.notification_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "notification_preferences_insert_own" on public.notification_preferences;
create policy "notification_preferences_insert_own"
on public.notification_preferences
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "notification_preferences_update_own" on public.notification_preferences;
create policy "notification_preferences_update_own"
on public.notification_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notification_subscriptions_select_own" on public.notification_subscriptions;
create policy "notification_subscriptions_select_own"
on public.notification_subscriptions
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "notification_subscriptions_insert_own" on public.notification_subscriptions;
create policy "notification_subscriptions_insert_own"
on public.notification_subscriptions
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "notification_subscriptions_update_own" on public.notification_subscriptions;
create policy "notification_subscriptions_update_own"
on public.notification_subscriptions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "notification_deliveries_select_own" on public.notification_deliveries;
create policy "notification_deliveries_select_own"
on public.notification_deliveries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "game_histories_select_public" on public.game_histories;
create policy "game_histories_select_public"
on public.game_histories
for select
to anon, authenticated
using (true);

drop policy if exists "game_schedules_select_public" on public.game_schedules;
create policy "game_schedules_select_public"
on public.game_schedules
for select
to anon, authenticated
using (true);

drop policy if exists "game_lineups_select_public" on public.game_lineups;
create policy "game_lineups_select_public"
on public.game_lineups
for select
to anon, authenticated
using (true);

drop policy if exists "stadiums_select_public" on public.stadiums;
create policy "stadiums_select_public"
on public.stadiums
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

drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at
before update on public.profiles
for each row execute procedure extensions.moddatetime(updated_at);

create or replace function public.handle_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is null or coalesce(new.is_anonymous, false) then
    return new;
  end if;

  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_profile();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute function public.handle_auth_user_profile();

create or replace function public.delete_current_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users
  where id = current_user_id;
end;
$$;

revoke all on function public.delete_current_user() from public;
grant execute on function public.delete_current_user() to authenticated;

drop trigger if exists handle_fan_diaries_updated_at on public.fan_diaries;
create trigger handle_fan_diaries_updated_at
before update on public.fan_diaries
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_attendance_records_updated_at on public.attendance_records;
create trigger handle_attendance_records_updated_at
before update on public.attendance_records
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_notification_preferences_updated_at on public.notification_preferences;
create trigger handle_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_notification_subscriptions_updated_at on public.notification_subscriptions;
create trigger handle_notification_subscriptions_updated_at
before update on public.notification_subscriptions
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_notification_deliveries_updated_at on public.notification_deliveries;
create trigger handle_notification_deliveries_updated_at
before update on public.notification_deliveries
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_game_histories_updated_at on public.game_histories;
create trigger handle_game_histories_updated_at
before update on public.game_histories
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_game_schedules_updated_at on public.game_schedules;
create trigger handle_game_schedules_updated_at
before update on public.game_schedules
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_game_lineups_updated_at on public.game_lineups;
create trigger handle_game_lineups_updated_at
before update on public.game_lineups
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_stadiums_updated_at on public.stadiums;
create trigger handle_stadiums_updated_at
before update on public.stadiums
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
      '%치킨%', '%콜팝%', '%튀김%', '%닭꼬치%', '%감자전%'
    ]) then '치킨/튀김'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%국수%', '%우동%', '%라면%', '%냉면%', '%쫄면%', '%김치말이%', '%잔치국수%'
    ]) then '면요리'
    when lower(coalesce(vendor_name_input, '') || ' ' || coalesce(main_menu_input, '')) like any (array[
      '%새우%', '%물회%', '%초밥%', '%막회%', '%육회%', '%활어%'
    ]) then '해산물'
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
