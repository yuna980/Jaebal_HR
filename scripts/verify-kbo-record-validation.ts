import assert from 'node:assert/strict';
import { validateKboGameRecord, type KboGameRecord } from '../supabase/functions/_shared/kbo.ts';

const validFinished: KboGameRecord = {
  seasonYear: 2026,
  gameDate: '2026-06-10',
  awayTeamId: 'ssg',
  homeTeamId: 'lg',
  stadium: '잠실',
  awayScore: 2,
  homeScore: 8,
  status: 'finished',
  note: '-',
  winningPitcherName: '임찬규',
  losingPitcherName: '김민준',
};

assert.deepEqual(validateKboGameRecord(validFinished), { valid: true });

assert.deepEqual(validateKboGameRecord({ ...validFinished, gameDate: '06.10' }), {
  valid: false,
  reason: 'invalid_game_date',
});

assert.deepEqual(validateKboGameRecord({ ...validFinished, awayTeamId: 'unknown' }), {
  valid: false,
  reason: 'invalid_team_id',
});

assert.deepEqual(validateKboGameRecord({ ...validFinished, awayTeamId: 'lg', homeTeamId: 'lg' }), {
  valid: false,
  reason: 'same_team',
});

assert.deepEqual(validateKboGameRecord({ ...validFinished, awayScore: null }), {
  valid: false,
  reason: 'finished_without_score',
});

assert.deepEqual(validateKboGameRecord({ ...validFinished, awayScore: -1 }), {
  valid: false,
  reason: 'invalid_score',
});

assert.deepEqual(
  validateKboGameRecord({
    ...validFinished,
    status: 'cancelled',
    awayScore: 1,
    homeScore: 0,
  }),
  {
    valid: false,
    reason: 'cancelled_with_score',
  }
);

console.log('kbo record validation verified');
