select cron.unschedule('send-attendance-tip-web-push')
where exists (select 1 from cron.job where jobname = 'send-attendance-tip-web-push');

select cron.unschedule('send-game-lineup-web-push')
where exists (select 1 from cron.job where jobname = 'send-game-lineup-web-push');

select cron.schedule(
  'send-attendance-tip-web-push',
  '*/5 * * * *',
  $$
  select
    net.http_get(
      url:= (select decrypted_secret from vault.decrypted_secrets where name = 'jaebal_app_url') || '/api/notifications/send/attendance-tip',
      headers:= jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'jaebal_notification_cron_secret')
      )
    ) as request_id;
  $$
);

select cron.schedule(
  'send-game-lineup-web-push',
  '*/5 * * * *',
  $$
  select
    net.http_get(
      url:= (select decrypted_secret from vault.decrypted_secrets where name = 'jaebal_app_url') || '/api/notifications/send/game-lineup',
      headers:= jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'jaebal_notification_cron_secret')
      )
    ) as request_id;
  $$
);
