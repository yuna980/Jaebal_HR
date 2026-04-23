export interface TeamStandingSummary {
  teamId: string;
  total: number;
  win: number;
  loss: number;
  draw: number;
  winRate: number;
}

export interface GameHistoryForStats {
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
}

function emptyStanding(teamId: string): TeamStandingSummary {
  return {
    teamId,
    total: 0,
    win: 0,
    loss: 0,
    draw: 0,
    winRate: 0,
  };
}

export function buildStandings(
  games: GameHistoryForStats[],
  teamIds: string[]
): TeamStandingSummary[] {
  const standings = new Map(teamIds.map((teamId) => [teamId, emptyStanding(teamId)]));

  for (const game of games) {
    if (game.home_score === null || game.away_score === null) continue;

    const home = standings.get(game.home_team_id) ?? emptyStanding(game.home_team_id);
    const away = standings.get(game.away_team_id) ?? emptyStanding(game.away_team_id);

    home.total += 1;
    away.total += 1;

    if (game.home_score > game.away_score) {
      home.win += 1;
      away.loss += 1;
    } else if (game.home_score < game.away_score) {
      home.loss += 1;
      away.win += 1;
    } else {
      home.draw += 1;
      away.draw += 1;
    }

    standings.set(home.teamId, home);
    standings.set(away.teamId, away);
  }

  return Array.from(standings.values()).map((standing) => ({
    ...standing,
    winRate: standing.win + standing.loss > 0 ? standing.win / (standing.win + standing.loss) : 0,
  }));
}

export function getRank(standings: TeamStandingSummary[], teamId: string) {
  const sorted = [...standings].sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    if (b.win !== a.win) return b.win - a.win;
    return a.loss - b.loss;
  });

  return sorted.findIndex((standing) => standing.teamId === teamId) + 1;
}

export function formatWinRate(value: number) {
  return value.toFixed(3).replace(/^0/, '');
}
