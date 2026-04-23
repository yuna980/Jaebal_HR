create extension if not exists moddatetime schema extensions;

create table if not exists public.games (
  id bigint generated always as identity primary key,
  season_year integer not null,
  game_date date not null,
  home_team_id text not null,
  away_team_id text not null,
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

alter table public.games enable row level security;

drop policy if exists "games_select_public" on public.games;
create policy "games_select_public"
on public.games
for select
to anon, authenticated
using (true);

drop trigger if exists handle_games_updated_at on public.games;
create trigger handle_games_updated_at
before update on public.games
for each row execute procedure extensions.moddatetime(updated_at);
