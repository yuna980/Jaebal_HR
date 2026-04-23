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

alter table public.game_schedules
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.game_schedules enable row level security;

drop policy if exists "game_schedules_select_public" on public.game_schedules;
create policy "game_schedules_select_public"
on public.game_schedules
for select
to anon, authenticated
using (true);

drop trigger if exists handle_game_schedules_updated_at on public.game_schedules;
create trigger handle_game_schedules_updated_at
before update on public.game_schedules
for each row execute procedure extensions.moddatetime(updated_at);
