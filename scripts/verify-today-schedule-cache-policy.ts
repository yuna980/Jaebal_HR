import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getTodayScheduleCacheTtlMs } from '../src/lib/todayScheduleCache';
import type { KboMatch } from '../src/lib/kboScraper';

const MINUTE = 60 * 1000;

const baseGame: KboMatch = {
  day: '06.10(수)',
  date: '06.10',
  dayOfWeek: '수',
  time: '18:30',
  matchRaw: 'SSG vs LG',
  awayTeam: 'SSG',
  homeTeam: 'LG',
  awayScore: null,
  homeScore: null,
  stadium: '잠실',
  status: 'scheduled',
  note: '-',
};

function atKst(hour: number, minute: number, day = 10) {
  return new Date(Date.UTC(2026, 5, day, hour - 9, minute));
}

assert.equal(getTodayScheduleCacheTtlMs(null, atKst(12, 0)), 5 * MINUTE);
assert.equal(getTodayScheduleCacheTtlMs(baseGame, atKst(16, 29)), 5 * MINUTE);
assert.equal(getTodayScheduleCacheTtlMs(baseGame, atKst(16, 30)), 1 * MINUTE);
assert.equal(getTodayScheduleCacheTtlMs(baseGame, atKst(18, 30)), 30 * 1000);
assert.equal(getTodayScheduleCacheTtlMs(baseGame, atKst(22, 29)), 30 * 1000);
assert.equal(getTodayScheduleCacheTtlMs(baseGame, atKst(22, 30)), 1 * MINUTE);
assert.equal(getTodayScheduleCacheTtlMs(baseGame, atKst(0, 29, 11)), 1 * MINUTE);
assert.equal(getTodayScheduleCacheTtlMs(baseGame, atKst(0, 30, 11)), 5 * MINUTE);

assert.equal(
  getTodayScheduleCacheTtlMs({ ...baseGame, status: 'finished', awayScore: 2, homeScore: 8 }, atKst(21, 30)),
  1 * MINUTE
);

const bottomNavSource = readFileSync('src/components/BottomNav.tsx', 'utf8');
assert.equal(
  bottomNavSource.includes('prefetchTodayGameSchedule(myTeam?.id, getTodayDateString())'),
  false,
  'BottomNav must not prefetch today schedule with MM.DD date text'
);

console.log('today schedule cache policy verified');
