create or replace view public.game_result_sync_gaps as
select
  s.season_year,
  s.game_date,
  s.away_team_id,
  s.home_team_id,
  s.stadium,
  s.game_time,
  s.note,
  now() as checked_at
from public.game_schedules s
left join public.game_histories h
  on h.season_year = s.season_year
  and h.game_date = s.game_date
  and h.away_team_id = s.away_team_id
  and h.home_team_id = s.home_team_id
where
  s.game_date < (now() at time zone 'Asia/Seoul')::date
  and h.game_date is null
  and coalesce(s.note, '') not like '%취소%';

select cron.unschedule('sync-kbo-game-histories-daily')
where exists (select 1 from cron.job where jobname = 'sync-kbo-game-histories-daily');

select cron.schedule(
  'sync-kbo-game-histories-daily',
  '0 13,14,15,1 * * *',
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
