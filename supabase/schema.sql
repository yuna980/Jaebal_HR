create extension if not exists moddatetime schema extensions;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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

create table if not exists public.game_histories (
  id bigint generated always as identity primary key,
  season_year integer not null,
  game_date date not null,
  home_team_id text not null,
  away_team_id text not null,
  stadium text not null default '',
  home_score integer,
  away_score integer,
  status text not null default 'scheduled' check (status in ('scheduled', 'finished', 'cancelled')),
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

alter table public.profiles enable row level security;
alter table public.fan_diaries enable row level security;
alter table public.attendance_records enable row level security;
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

drop trigger if exists handle_profiles_updated_at on public.profiles;
create trigger handle_profiles_updated_at
before update on public.profiles
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_fan_diaries_updated_at on public.fan_diaries;
create trigger handle_fan_diaries_updated_at
before update on public.fan_diaries
for each row execute procedure extensions.moddatetime(updated_at);

drop trigger if exists handle_attendance_records_updated_at on public.attendance_records;
create trigger handle_attendance_records_updated_at
before update on public.attendance_records
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
