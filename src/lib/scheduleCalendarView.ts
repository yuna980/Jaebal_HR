import type { KboMatch } from '@/lib/kboScraper';
import { TEAM_NAME_TO_ID } from '@/lib/kboScraper';

export type CalendarPreviewTone = 'scheduled' | 'finished' | 'cancelled';

export interface CalendarGamePreview {
  badge: '홈' | '원정' | '취소' | '승' | '패' | '무';
  tone: CalendarPreviewTone;
  isMyTeamGame: boolean;
}

export function buildCalendarGamePreview(game: KboMatch, myTeamId: string): CalendarGamePreview {
  const isHome = TEAM_NAME_TO_ID[game.homeTeam] === myTeamId;
  const isAway = TEAM_NAME_TO_ID[game.awayTeam] === myTeamId;
  const isMyTeamGame = isHome || isAway;
  if (game.status === 'cancelled') {
    return {
      badge: '취소',
      tone: 'cancelled',
      isMyTeamGame,
    };
  }

  if (game.status === 'finished') {
    const myScore = isHome ? game.homeScore ?? 0 : game.awayScore ?? 0;
    const opponentScore = isHome ? game.awayScore ?? 0 : game.homeScore ?? 0;

    return {
      badge: myScore > opponentScore ? '승' : myScore < opponentScore ? '패' : '무',
      tone: 'finished',
      isMyTeamGame,
    };
  }

  return {
    badge: isHome ? '홈' : '원정',
    tone: 'scheduled',
    isMyTeamGame,
  };
}
