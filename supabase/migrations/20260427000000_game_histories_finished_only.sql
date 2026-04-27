delete from public.game_histories
where status = 'scheduled';

alter table public.game_histories
  alter column status drop default;

alter table public.game_histories
  drop constraint if exists game_histories_status_check;

alter table public.game_histories
  add constraint game_histories_status_check
  check (status in ('finished', 'cancelled'));
