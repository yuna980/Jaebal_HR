select cron.unschedule('sync-kbo-games-nightly')
where exists (select 1 from cron.job where jobname = 'sync-kbo-games-nightly');

select cron.unschedule('sync-kbo-game-histories-daily')
where exists (select 1 from cron.job where jobname = 'sync-kbo-game-histories-daily');

select cron.unschedule('sync-kbo-game-histories-late-retry')
where exists (select 1 from cron.job where jobname = 'sync-kbo-game-histories-late-retry');

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

select cron.schedule(
  'sync-kbo-game-histories-late-retry',
  '30 15 * * *',
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
