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

alter table public.game_lineups
  alter column created_at type timestamptz(1),
  alter column updated_at type timestamptz(1);

alter table public.game_lineups enable row level security;

drop policy if exists "game_lineups_select_public" on public.game_lineups;
create policy "game_lineups_select_public"
on public.game_lineups
for select
to anon, authenticated
using (true);

drop trigger if exists handle_game_lineups_updated_at on public.game_lineups;
create trigger handle_game_lineups_updated_at
before update on public.game_lineups
for each row execute procedure extensions.moddatetime(updated_at);
