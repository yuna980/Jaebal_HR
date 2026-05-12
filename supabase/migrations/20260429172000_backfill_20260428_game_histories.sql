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
values
  (2026, '2026-04-28', 'doosan', 'samsung', '잠실', 4, 5, 'finished', '-', '김재윤', '김정우', now()),
  (2026, '2026-04-28', 'lotte', 'kiwoom', '사직', 5, 4, 'finished', '-', '현도훈', '알칸타라', now()),
  (2026, '2026-04-28', 'nc', 'kia', '창원', 5, 4, 'finished', '-', '임지민', '네일', now()),
  (2026, '2026-04-28', 'kt', 'lg', '수원', 6, 5, 'finished', '-', '김민수', '김진수', now()),
  (2026, '2026-04-28', 'hanwha', 'ssg', '대전', 7, 6, 'finished', '-', '쿠싱', '박시후', now())
on conflict (season_year, game_date, home_team_id, away_team_id) do update set
  stadium = excluded.stadium,
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  status = excluded.status,
  note = excluded.note,
  winning_pitcher_name = excluded.winning_pitcher_name,
  losing_pitcher_name = excluded.losing_pitcher_name,
  last_synced_at = excluded.last_synced_at;
