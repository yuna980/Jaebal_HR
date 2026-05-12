import { fetchRegularSeasonGames } from '../supabase/functions/_shared/kbo';

function sql(value: unknown) {
  if (value === null || value === undefined || value === '') return 'null';
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value: unknown) {
  return value === null || value === undefined ? 'null' : String(value);
}

async function main() {
  const year = Number(process.argv[2] ?? new Date().getFullYear());
  const fromDate = process.argv[3] ?? `${year}-03-01`;
  const months = process.argv
    .slice(4)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 12);
  const targetMonths = months.length > 0 ? months : Array.from({ length: 8 }, (_, index) => index + 3);

  const rows = [];
  for (const month of targetMonths) {
    const games = await fetchRegularSeasonGames(year, month);
    rows.push(...games.filter((game) => game.gameDate >= fromDate && (game.status === 'finished' || game.status === 'cancelled')));
  }

  const unique = new Map<string, (typeof rows)[number]>();
  for (const game of rows) {
    unique.set(`${game.seasonYear}-${game.gameDate}-${game.homeTeamId}-${game.awayTeamId}`, game);
  }

  console.log('begin;');

  if (unique.size > 0) {
    const values = [...unique.values()]
      .map(
        (game) => `(${game.seasonYear}, ${sql(game.gameDate)}, ${sql(game.homeTeamId)}, ${sql(game.awayTeamId)}, ${sql(
          game.stadium,
        )}, ${sqlNumber(game.homeScore)}, ${sqlNumber(game.awayScore)}, ${sql(game.status)}, ${sql(
          game.note ?? '-',
        )}, ${sql(game.winningPitcherName)}, ${sql(game.losingPitcherName)}, now())`,
      )
      .join(',\n');

    console.log(`
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
${values}
on conflict (season_year, game_date, home_team_id, away_team_id) do update set
  stadium = excluded.stadium,
  home_score = excluded.home_score,
  away_score = excluded.away_score,
  status = excluded.status,
  note = excluded.note,
  winning_pitcher_name = excluded.winning_pitcher_name,
  losing_pitcher_name = excluded.losing_pitcher_name,
  last_synced_at = excluded.last_synced_at;`);
  }

  console.log('commit;');
  console.error(`Generated ${unique.size} game history rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
