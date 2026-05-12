import type { KboMatch } from '@/lib/kboScraper';
import { TEAM_NAME_TO_ID } from '@/lib/kboScraper';

export type CalendarPreviewTone = 'scheduled' | 'finished' | 'cancelled' | 'pending_result';

export interface CalendarGamePreview {
  badge: '홈' | '원정' | '취소' | '승' | '패' | '무' | '확인중';
  tone: CalendarPreviewTone;
  isMyTeamGame: boolean;
  opponent: string;
  isHome: boolean;
  score: string | null;
  time: string;
}

export function buildCalendarGamePreview(game: KboMatch, myTeamId: string): CalendarGamePreview {
  const isHome = TEAM_NAME_TO_ID[game.homeTeam] === myTeamId;
  const isAway = TEAM_NAME_TO_ID[game.awayTeam] === myTeamId;
  const isMyTeamGame = isHome || isAway;
  const opponent = isHome ? game.awayTeam : game.homeTeam;
  const score =
    game.awayScore !== null && game.homeScore !== null
      ? `${game.awayScore}:${game.homeScore}`
      : null;

  if (game.status === 'cancelled') {
    return {
      badge: '취소',
      tone: 'cancelled',
      isMyTeamGame,
      opponent,
      isHome,
      score,
      time: game.time,
    };
  }

  if (game.status === 'finished') {
    const myScore = isHome ? game.homeScore ?? 0 : game.awayScore ?? 0;
    const opponentScore = isHome ? game.awayScore ?? 0 : game.homeScore ?? 0;

    return {
      badge: myScore > opponentScore ? '승' : myScore < opponentScore ? '패' : '무',
      tone: 'finished',
      isMyTeamGame,
      opponent,
      isHome,
      score,
      time: game.time,
    };
  }

  if (game.status === 'pending_result') {
    return {
      badge: '확인중',
      tone: 'pending_result',
      isMyTeamGame,
      opponent,
      isHome,
      score,
      time: game.time,
    };
  }

  return {
    badge: isHome ? '홈' : '원정',
    tone: 'scheduled',
    isMyTeamGame,
    opponent,
    isHome,
    score,
    time: game.time,
  };
}
