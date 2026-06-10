export type NormalizedGameStatus = 'scheduled' | 'finished' | 'cancelled' | 'pending_result';

export type GameHistoryForStatus = {
  status: 'scheduled' | 'finished' | 'cancelled';
  awayScore: number | null;
  homeScore: number | null;
  winningPitcherName: string | null;
  losingPitcherName: string | null;
};

export function hasCompleteScore(history: GameHistoryForStatus | null | undefined) {
  return Boolean(
    history &&
      typeof history.awayScore === 'number' &&
      typeof history.homeScore === 'number'
  );
}

export function isReliableFinishedHistory(
  gameDate: string,
  history: GameHistoryForStatus | null | undefined,
  today: string
) {
  if (!history || history.status !== 'finished' || !hasCompleteScore(history)) {
    return false;
  }

  if (gameDate < today) {
    return true;
  }

  return Boolean(history.winningPitcherName && history.losingPitcherName);
}

export function normalizeScheduleStatus({
  gameDate,
  history,
  note,
  today,
}: {
  gameDate: string;
  history?: GameHistoryForStatus | null;
  note?: string | null;
  today: string;
}): NormalizedGameStatus {
  if (note?.includes('취소')) {
    return 'cancelled';
  }

  if (isReliableFinishedHistory(gameDate, history, today)) {
    return 'finished';
  }

  if (gameDate < today && !history) {
    return 'pending_result';
  }

  return 'scheduled';
}
