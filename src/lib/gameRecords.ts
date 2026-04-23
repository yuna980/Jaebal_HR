import { fetchKboSchedule, TEAM_NAME_TO_ID } from '@/lib/kboScraper';

export interface HeadToHeadRecord {
  total: number;
  win: number;
  loss: number;
  draw: number;
}

interface GameRecordLike {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
}

export function buildHeadToHeadRecord(
  games: GameRecordLike[],
  myTeamId: string,
  opponentTeamId: string
): HeadToHeadRecord {
  const targetGames = games.filter(
    (game) =>
      (game.homeTeamId === myTeamId && game.awayTeamId === opponentTeamId) ||
      (game.homeTeamId === opponentTeamId && game.awayTeamId === myTeamId)
  );

  return targetGames.reduce(
    (record, game) => {
      const isMyTeamHome = game.homeTeamId === myTeamId;
      const myScore = isMyTeamHome ? game.homeScore ?? 0 : game.awayScore ?? 0;
      const opponentScore = isMyTeamHome ? game.awayScore ?? 0 : game.homeScore ?? 0;

      record.total += 1;

      if (myScore > opponentScore) {
        record.win += 1;
      } else if (myScore < opponentScore) {
        record.loss += 1;
      } else {
        record.draw += 1;
      }

      return record;
    },
    { total: 0, win: 0, loss: 0, draw: 0 }
  );
}

export async function fetchHeadToHeadRecordFromKbo(
  myTeamId: string,
  opponentTeamId: string,
  seasonYear: number
) {
  const monthlySchedules = await Promise.all(
    [3, 4, 5, 6, 7, 8, 9, 10].map((month) =>
      fetchKboSchedule(seasonYear, month, { regularSeasonOnly: true })
    )
  );

  const dedupedGames = monthlySchedules
    .flat()
    .filter((game) => game.status === 'finished')
    .map((game) => ({
      key: `${seasonYear}-${game.date}-${game.awayTeam}-${game.homeTeam}-${game.time}`,
      game: {
        homeTeamId: game.homeTeam ? TEAM_NAME_TO_ID[game.homeTeam] ?? '' : '',
        awayTeamId: game.awayTeam ? TEAM_NAME_TO_ID[game.awayTeam] ?? '' : '',
        homeScore: game.homeScore,
        awayScore: game.awayScore,
      },
    }))
    .filter(({ game }) => game.homeTeamId && game.awayTeamId)
    .filter(
      (item, index, array) => array.findIndex((candidate) => candidate.key === item.key) === index
    )
    .map(({ game }) => game);

  return buildHeadToHeadRecord(dedupedGames, myTeamId, opponentTeamId);
}
