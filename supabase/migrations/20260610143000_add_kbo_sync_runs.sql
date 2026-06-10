create table if not exists public.kbo_sync_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  mode text not null check (mode in ('daily', 'backfill')),
  status text not null default 'started' check (status in ('started', 'success', 'failed')),
  dry_run boolean not null default false,
  seasons integer[] not null default '{}',
  total_processed integer not null default 0,
  total_saved integer not null default 0,
  summaries jsonb not null default '[]'::jsonb,
  error_message text
);

create index if not exists kbo_sync_runs_started_at_idx
on public.kbo_sync_runs (started_at desc);

create index if not exists kbo_sync_runs_status_started_at_idx
on public.kbo_sync_runs (status, started_at desc);

alter table public.kbo_sync_runs enable row level security;

revoke all on public.kbo_sync_runs from anon;
revoke all on public.kbo_sync_runs from authenticated;

create or replace function public.get_game_result_sync_gaps(limit_count integer default 10)
returns table (
  season_year integer,
  game_date date,
  away_team_id text,
  home_team_id text,
  stadium text
)
language sql
security definer
set search_path = internal, public
as $$
  select
    gaps.season_year,
    gaps.game_date,
    gaps.away_team_id,
    gaps.home_team_id,
    gaps.stadium
  from internal.game_result_sync_gaps gaps
  order by gaps.game_date desc
  limit greatest(0, least(limit_count, 100));
$$;

revoke all on function public.get_game_result_sync_gaps(integer) from public;
revoke all on function public.get_game_result_sync_gaps(integer) from anon;
revoke all on function public.get_game_result_sync_gaps(integer) from authenticated;
grant execute on function public.get_game_result_sync_gaps(integer) to service_role;
