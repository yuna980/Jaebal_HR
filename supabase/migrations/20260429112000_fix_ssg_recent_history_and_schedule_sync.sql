insert into public.game_histories (
  season_year,
  game_date,
  home_team_id,
  away_team_id,
  stadium,
  home_score,
  away_score,
  status,
  note,
  winning_pitcher_name,
  losing_pitcher_name,
  last_synced_at
)
values (
  2026,
  '2026-04-28',
  'hanwha',
  'ssg',
  '대전',
  7,
  6,
  'finished',
  '-',
  '쿠싱',
  '박시후',
  now()
)
on conflict (season_year, game_date, home_team_id, away_team_id) do update set
  stadium = excluded.stadium,
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  status = excluded.status,
  note = excluded.note,
  winning_pitcher_name = excluded.winning_pitcher_name,
  losing_pitcher_name = excluded.losing_pitcher_name,
  last_synced_at = excluded.last_synced_at;

select cron.unschedule('sync-kbo-game-histories-daily')
where exists (select 1 from cron.job where jobname = 'sync-kbo-game-histories-daily');

select cron.schedule(
  'sync-kbo-game-histories-daily',
  '0 14 * * *',
  $$
  select
    net.http_post(
      url:= (select decrypted_secret from vault.decrypted_secrets where name = 'kbo_sync_games_project_url') || '/functions/v1/sync-games',
      headers:= jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'kbo_sync_games_secret')
      ),
      body:= '{"mode":"daily"}'::jsonb
    ) as request_id;
  $$
);

