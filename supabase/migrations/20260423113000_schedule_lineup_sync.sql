select cron.unschedule('sync-kbo-lineup-pitchers-daily')
where exists (select 1 from cron.job where jobname = 'sync-kbo-lineup-pitchers-daily');

select cron.unschedule('sync-kbo-lineups-before-game')
where exists (select 1 from cron.job where jobname = 'sync-kbo-lineups-before-game');

select cron.schedule(
  'sync-kbo-lineup-pitchers-daily',
  '0 16 * * *',
  $$
  select
    net.http_post(
      url:= (select decrypted_secret from vault.decrypted_secrets where name = 'kbo_sync_games_project_url') || '/functions/v1/sync-lineups',
      headers:= jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'kbo_sync_games_secret')
      ),
      body:= '{"mode":"pitchers"}'::jsonb
    ) as request_id;
  $$
);

select cron.schedule(
  'sync-kbo-lineups-before-game',
  '*/10 3-11 * * *',
  $$
  select
    net.http_post(
      url:= (select decrypted_secret from vault.decrypted_secrets where name = 'kbo_sync_games_project_url') || '/functions/v1/sync-lineups',
      headers:= jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'kbo_sync_games_secret')
      ),
      body:= '{"mode":"due"}'::jsonb
    ) as request_id;
  $$
);
