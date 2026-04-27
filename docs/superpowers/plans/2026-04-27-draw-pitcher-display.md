# Draw Pitcher Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 무승부 경기에서 승리투수/패전투수 `NULL` 값을 "정보 없음"으로 보여주지 않고, 무승부 전용 안내 문구로 자연스럽게 노출한다.

**Architecture:** 승패 결과와 투수 표시 문구를 화면에서 직접 조합하지 말고, 작은 표시 전용 유틸 함수로 분리한다. 그런 다음 대진표 모달의 투수 영역과 같은 날 다른 경기 결과 목록이 모두 그 유틸을 사용하도록 맞춰서, 무승부 경기의 UX를 한 곳에서 통제한다.

**Tech Stack:** Next.js App Router, React 19, TypeScript, existing inline-style UI, Supabase-backed `KboMatch` data

---

## File Structure

- Modify: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/app/schedule/page.tsx`
  - 현재 승/패/무 결과 계산, 승패투수 라벨 계산, 같은 날 다른 경기 결과 문구 렌더링을 담당한다.
- Create: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/lib/gameResultDisplay.ts`
  - 경기 결과와 투수 문구를 UI 친화적인 표시 데이터로 변환하는 순수 함수만 둔다.
- Create: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/scripts/verify-draw-pitcher-display.ts`
  - 2026-04-26 KIA vs 롯데 같은 무승부 샘플을 넣어 결과 문구가 기대값대로 나오는지 확인하는 간단한 검증 스크립트.

### Task 1: Draw-aware result display helper

**Files:**
- Create: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/lib/gameResultDisplay.ts`
- Test: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/scripts/verify-draw-pitcher-display.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
assert.equal(summary.away, '무');
assert.equal(summary.home, '무');

const pitcherDisplay = buildPitcherDisplay(drawGame);
assert.equal(pitcherDisplay.mode, 'draw');
assert.equal(pitcherDisplay.summaryLabel, '무승부');
assert.equal(pitcherDisplay.summaryText, '무승부 경기라 승/패 투수가 없습니다');

console.log('draw pitcher display test passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-draw-pitcher-display.ts`
Expected: FAIL with module not found or exported function not found for `buildPitcherDisplay` / `buildResultSummary`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { KboMatch } from '@/lib/kboScraper';

export type GameResultLabel = '승' | '패' | '무';

export function buildResultSummary(game: KboMatch): { away: GameResultLabel; home: GameResultLabel } | null {
  if (game.status !== 'finished') return null;

  const awayScore = game.awayScore ?? 0;
  const homeScore = game.homeScore ?? 0;

  return {
    away: awayScore > homeScore ? '승' : awayScore < homeScore ? '패' : '무',
    home: homeScore > awayScore ? '승' : homeScore < awayScore ? '패' : '무',
  };
}

export function buildPitcherDisplay(game: KboMatch) {
  const result = buildResultSummary(game);

  if (!result) {
    return {
      mode: 'none' as const,
      summaryLabel: null,
      summaryText: null,
      away: null,
      home: null,
    };
  }

  if (result.away === '무' && result.home === '무') {
    return {
      mode: 'draw' as const,
      summaryLabel: '무승부',
      summaryText: '무승부 경기라 승/패 투수가 없습니다',
      away: null,
      home: null,
    };
  }

  return {
    mode: 'decision' as const,
    summaryLabel: null,
    summaryText: null,
    away: result.away === '승'
      ? { label: '승', name: game.winningPitcherName || '정보 없음' }
      : { label: '패', name: game.losingPitcherName || '정보 없음' },
    home: result.home === '승'
      ? { label: '승', name: game.winningPitcherName || '정보 없음' }
      : { label: '패', name: game.losingPitcherName || '정보 없음' },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-draw-pitcher-display.ts`
Expected: PASS with `draw pitcher display test passed`

- [ ] **Step 5: Commit**

```bash
git add /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/src/lib/gameResultDisplay.ts /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-draw-pitcher-display.ts
git commit -m "feat: add draw-aware pitcher display helper"
```

### Task 2: Apply draw display to the schedule modal and game list

**Files:**
- Modify: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/app/schedule/page.tsx`
- Test: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/scripts/verify-draw-pitcher-display.ts`

- [ ] **Step 1: Write the failing test expectation for rendered copy**

```ts
import assert from 'node:assert/strict';
import { buildPitcherDisplay } from '../src/lib/gameResultDisplay';
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

const pitcherDisplay = buildPitcherDisplay(drawGame);
assert.equal(pitcherDisplay.mode, 'draw');
assert.equal(`${pitcherDisplay.summaryLabel} · ${pitcherDisplay.summaryText}`, '무승부 · 무승부 경기라 승/패 투수가 없습니다');

console.log('draw UI copy test passed');
```

- [ ] **Step 2: Run test to verify the expectation matches helper output**

Run: `npx tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-draw-pitcher-display.ts`
Expected: PASS for helper output and ready to wire into UI.

- [ ] **Step 3: Replace inline result/pitcher logic in the schedule page**

```ts
import { buildPitcherDisplay, buildResultSummary } from '@/lib/gameResultDisplay';

const result = buildResultSummary(selectedGame);
const pitcherDisplay = buildPitcherDisplay(selectedGame);
```

```tsx
{selectedGame.status === 'finished' && pitcherDisplay.mode === 'decision' && pitcherDisplay.away && pitcherDisplay.home && (
  <div
    style={{
      marginTop: '14px',
      paddingTop: '14px',
      borderTop: '1px solid var(--border)',
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
    }}
  >
    <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--background)' }}>
      <div style={{ fontSize: '12px', color: awayResultTone.color, fontWeight: awayResultTone.fontWeight, marginBottom: '4px' }}>
        {pitcherDisplay.away.label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 800 }}>{pitcherDisplay.away.name}</div>
    </div>
    <div style={{ padding: '10px 12px', borderRadius: '12px', background: 'var(--background)' }}>
      <div style={{ fontSize: '12px', color: homeResultTone.color, fontWeight: homeResultTone.fontWeight, marginBottom: '4px' }}>
        {pitcherDisplay.home.label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 800 }}>{pitcherDisplay.home.name}</div>
    </div>
  </div>
)}
```

```tsx
{selectedGame.status === 'finished' && pitcherDisplay.mode === 'draw' && (
  <div
    style={{
      marginTop: '14px',
      padding: '12px 14px',
      borderTop: '1px solid var(--border)',
      color: 'var(--text-light)',
      fontSize: '13px',
      fontWeight: 700,
      textAlign: 'center',
    }}
  >
    <strong style={{ color: 'var(--text)' }}>{pitcherDisplay.summaryLabel}</strong>
    <span style={{ color: 'var(--text-light)' }}> · {pitcherDisplay.summaryText}</span>
  </div>
)}
```

```tsx
{game.status === 'finished' && (
  <div style={{ fontSize: '11px', color: 'var(--text-light)', marginTop: '6px' }}>
    {buildPitcherDisplay(game).mode === 'draw'
      ? '무승부 · 승패투수 없음'
      : `${game.winningPitcherName || '정보 없음'} 승 · ${game.losingPitcherName || '정보 없음'} 패`}
  </div>
)}
```

- [ ] **Step 4: Run verification commands**

Run: `npx tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-draw-pitcher-display.ts && npm run build`
Expected: helper script PASS and Next build PASS

- [ ] **Step 5: Commit**

```bash
git add /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/src/app/schedule/page.tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/src/lib/gameResultDisplay.ts /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-draw-pitcher-display.ts
git commit -m "feat: show draw-specific pitcher messaging"
```

## Self-Review

- Spec coverage: 무승부 경기에서 승/패 투수 `NULL` 처리, 모달 표시, 목록 표시를 모두 포함했다.
- Placeholder scan: `TODO`, `적절히`, `나중에` 같은 빈 문구 없이 실제 문구와 코드 조각을 넣었다.
- Type consistency: `KboMatch`, `buildResultSummary`, `buildPitcherDisplay`, `mode: 'draw' | 'decision' | 'none'`를 전 구간에서 같은 이름으로 사용했다.

Plan complete and saved to `docs/superpowers/plans/2026-04-27-draw-pitcher-display.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
