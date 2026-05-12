drop view if exists public.game_result_sync_gaps;

create schema if not exists internal;

revoke all on schema internal from public;
revoke all on schema internal from anon;
revoke all on schema internal from authenticated;

create or replace view internal.game_result_sync_gaps
with (security_invoker = true) as
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

revoke all on internal.game_result_sync_gaps from public;
revoke all on internal.game_result_sync_gaps from anon;
revoke all on internal.game_result_sync_gaps from authenticated;

grant usage on schema internal to service_role;
grant select on internal.game_result_sync_gaps to service_role;
