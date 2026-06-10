import assert from 'node:assert/strict';
import {
  isReliableFinishedHistory,
  normalizeScheduleStatus,
  type GameHistoryForStatus,
} from '../src/lib/gameStatus';

const today = '2026-06-10';

const finishedTodayWithDecision: GameHistoryForStatus = {
  status: 'finished',
  awayScore: 1,
  homeScore: 8,
  winningPitcherName: '임찬규',
  losingPitcherName: '김민준',
};

assert.equal(isReliableFinishedHistory(today, finishedTodayWithDecision, today), true);
assert.equal(normalizeScheduleStatus({ gameDate: today, history: finishedTodayWithDecision, today }), 'finished');

const inProgressStoredAsFinished: GameHistoryForStatus = {
  status: 'finished',
  awayScore: 1,
  homeScore: 8,
  winningPitcherName: null,
  losingPitcherName: null,
};

assert.equal(isReliableFinishedHistory(today, inProgressStoredAsFinished, today), false);
assert.equal(normalizeScheduleStatus({ gameDate: today, history: inProgressStoredAsFinished, today }), 'scheduled');

const pastFinishedWithoutDecision: GameHistoryForStatus = {
  status: 'finished',
  awayScore: 2,
  homeScore: 8,
  winningPitcherName: null,
  losingPitcherName: null,
};

assert.equal(isReliableFinishedHistory('2026-06-09', pastFinishedWithoutDecision, today), true);
assert.equal(
  normalizeScheduleStatus({ gameDate: '2026-06-09', history: pastFinishedWithoutDecision, today }),
  'finished'
);

assert.equal(normalizeScheduleStatus({ gameDate: '2026-06-09', today }), 'pending_result');
assert.equal(normalizeScheduleStatus({ gameDate: today, today }), 'scheduled');
assert.equal(normalizeScheduleStatus({ gameDate: today, today, note: '우천취소' }), 'cancelled');

console.log('game status normalization verified');
