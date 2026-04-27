import assert from 'node:assert/strict';
import { buildCalendarGamePreview } from '../src/lib/scheduleCalendarView';
import type { KboMatch } from '../src/lib/kboScraper';

const myTeamId = 'ssg';

const awayGame: KboMatch = {
  day: '04.23(목)',
  date: '04.23',
  dayOfWeek: '목',
  time: '18:30',
  matchRaw: 'SSG vs 삼성',
  awayTeam: 'SSG',
  homeTeam: '삼성',
  awayScore: null,
  homeScore: null,
  stadium: '대구',
  status: 'scheduled',
  note: '-',
};

const preview = buildCalendarGamePreview(awayGame, myTeamId);
assert.equal(preview.badge, '원정');
assert.equal(preview.isMyTeamGame, true);
assert.equal(preview.tone, 'scheduled');

const finishedGame: KboMatch = {
  ...awayGame,
  awayScore: 5,
  homeScore: 2,
  status: 'finished',
};

const finishedPreview = buildCalendarGamePreview(finishedGame, myTeamId);
assert.equal(finishedPreview.badge, '승');
assert.equal(finishedPreview.tone, 'finished');

console.log('schedule calendar preview test passed');
