import type { KboMatch } from '@/lib/kboScraper';

export type GameResultLabel = '승' | '패' | '무';

interface PitcherDecisionDisplay {
  label: '승' | '패';
  name: string;
}

interface PitcherNoneDisplay {
  mode: 'none';
  summaryLabel: null;
  summaryText: null;
  away: null;
  home: null;
}

interface PitcherDrawDisplay {
  mode: 'draw';
  summaryLabel: '무승부';
  summaryText: '무승부 경기라 승/패 투수가 없습니다';
  away: null;
  home: null;
}

interface PitcherDecisionStateDisplay {
  mode: 'decision';
  summaryLabel: null;
  summaryText: null;
  away: PitcherDecisionDisplay;
  home: PitcherDecisionDisplay;
}

export type PitcherDisplay =
  | PitcherNoneDisplay
  | PitcherDrawDisplay
  | PitcherDecisionStateDisplay;

export function buildResultSummary(game: KboMatch): { away: GameResultLabel; home: GameResultLabel } | null {
  if (game.status !== 'finished') return null;

  const awayScore = game.awayScore ?? 0;
  const homeScore = game.homeScore ?? 0;

  return {
    away: awayScore > homeScore ? '승' : awayScore < homeScore ? '패' : '무',
    home: homeScore > awayScore ? '승' : homeScore < awayScore ? '패' : '무',
  };
}

export function buildPitcherDisplay(game: KboMatch): PitcherDisplay {
  const result = buildResultSummary(game);

  if (!result) {
    return {
      mode: 'none',
      summaryLabel: null,
      summaryText: null,
      away: null,
      home: null,
    };
  }

  if (result.away === '무' && result.home === '무') {
    return {
      mode: 'draw',
      summaryLabel: '무승부',
      summaryText: '무승부 경기라 승/패 투수가 없습니다',
      away: null,
      home: null,
    };
  }

  return {
    mode: 'decision',
    summaryLabel: null,
    summaryText: null,
    away:
      result.away === '승'
        ? { label: '승', name: game.winningPitcherName || '정보 없음' }
        : { label: '패', name: game.losingPitcherName || '정보 없음' },
    home:
      result.home === '승'
        ? { label: '승', name: game.winningPitcherName || '정보 없음' }
        : { label: '패', name: game.losingPitcherName || '정보 없음' },
  };
}
