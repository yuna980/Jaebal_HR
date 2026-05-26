select cron.unschedule('sync-kbo-game-histories-daily')
where exists (select 1 from cron.job where jobname = 'sync-kbo-game-histories-daily');

select cron.schedule(
  'sync-kbo-game-histories-daily',
  -- UTC: 01, 06, 08, 10, 13, 14, 15
  -- KST: 10, 15, 17, 19, 22, 23, 24
  '0 1,6,8,10,13,14,15 * * *',
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
