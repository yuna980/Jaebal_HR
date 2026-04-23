create extension if not exists moddatetime schema extensions;

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

alter table public.profiles
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.fan_diaries
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.attendance_records
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.attendance_records enable row level security;

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

drop trigger if exists handle_attendance_records_updated_at on public.attendance_records;
create trigger handle_attendance_records_updated_at
before update on public.attendance_records
for each row execute procedure extensions.moddatetime(updated_at);

alter table public.fan_diaries
  drop column if exists is_attending;
