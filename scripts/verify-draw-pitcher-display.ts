import assert from 'node:assert/strict';
import { buildPitcherDisplay, buildResultSummary } from '../src/lib/gameResultDisplay';
import type { KboMatch } from '../src/lib/kboScraper';

const drawGame: KboMatch = {
  day: '04.26(일)',
  date: '04.26',
  dayOfWeek: '일',
  time: '14:00',
  matchRaw: 'KIA vs 롯데',
  awayTeam: 'KIA',
  homeTeam: '롯데',
  awayScore: 4,
  homeScore: 4,
  stadium: '사직',
  status: 'finished',
  note: '-',
  winningPitcherName: null,
  losingPitcherName: null,
};

const summary = buildResultSummary(drawGame);
assert.equal(summary?.away, '무');
assert.equal(summary?.home, '무');

const pitcherDisplay = buildPitcherDisplay(drawGame);
assert.equal(pitcherDisplay.mode, 'draw');
assert.equal(pitcherDisplay.summaryLabel, '무승부');
assert.equal(pitcherDisplay.summaryText, '무승부 경기라 승/패 투수가 없습니다');

console.log('draw pitcher display test passed');
