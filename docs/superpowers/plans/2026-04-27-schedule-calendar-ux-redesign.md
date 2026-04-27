# Schedule Calendar UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대진표 메뉴의 월간 캘린더를 좁은 모바일 화면에서도 한눈에 읽히도록 재구성하고, 경기 상세 정보는 선택된 날짜 영역으로 분리해 정보 밀도를 낮춘다.

**Architecture:** 기존 `src/app/schedule/page.tsx`에 몰려 있는 캘린더 렌더링을 "월간 셀 표시용 view model"과 "캘린더 셀 컴포넌트"로 나눈다. 월간 그리드에는 날짜, 오늘 표시, 내 팀 경기 여부, 짧은 상태 배지 정도만 남기고, 팀명 전체와 결과 세부 정보는 기존 모달/상세 카드가 책임지도록 역할을 분리한다.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Framer Motion, existing inline-style UI system

---

## File Structure

- Create: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/lib/scheduleCalendarView.ts`
  - 월간 셀에서 보여줄 짧은 텍스트, 배지 톤, 경기 유무를 계산하는 순수 함수.
- Create: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/components/ScheduleCalendarCell.tsx`
  - 캘린더 1칸 렌더링 전담. 날짜 숫자, 상태 배지, 내 팀 강조, 빈 셀 스타일을 담당.
- Modify: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/app/schedule/page.tsx`
  - 기존 7열 그리드 내부 인라인 마크업을 새 컴포넌트로 교체하고, 월간 개요용 보조 영역을 추가.
- Create: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/scripts/verify-schedule-calendar-view.ts`
  - 월간 셀 요약 문구가 기대대로 짧고 일관되게 생성되는지 확인하는 검증 스크립트.

## UX Direction Locked In

이 구현 계획에서는 아래 UX를 최종안으로 고정한다.

1. 캘린더 칸에는 `SSG VS 삼성` 같은 전체 팀명 문장을 넣지 않는다.
2. 캘린더 칸에는 아래 3가지만 남긴다.
   - 날짜 숫자
   - 경기 상태 배지 (`홈`, `원정`, `취소`, `종료`, `예정`)
   - 한 줄 요약 (`vs 삼성`, `vs 롯데`)
3. 스코어, 승/패/무, 승패투수, 라인업은 모달에서만 자세히 보여준다.
4. 월간 캘린더 상단에 `이번달 우리 팀 경기 N개` 같은 요약 줄을 추가해 사용자가 전체 밀도를 먼저 이해하게 한다.
5. 좁은 기기에서는 셀 높이를 키우기보다 정보량을 줄여서 가독성을 확보한다.

### Task 1: Build compact calendar view model

**Files:**
- Create: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/lib/scheduleCalendarView.ts`
- Create: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/scripts/verify-schedule-calendar-view.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';
import { buildCalendarGamePreview } from '../src/lib/scheduleCalendarView';
import type { KboMatch } from '../src/lib/kboScraper';

const myTeamId = 'ssg';

const homeGame: KboMatch = {
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

const preview = buildCalendarGamePreview(homeGame, myTeamId);
assert.equal(preview.label, 'vs 삼성');
assert.equal(preview.badge, '원정');
assert.equal(preview.isMyTeamGame, true);
assert.equal(preview.tone, 'scheduled');

console.log('schedule calendar preview test passed');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-schedule-calendar-view.ts`
Expected: FAIL with module not found for `scheduleCalendarView`

- [ ] **Step 3: Write minimal implementation**

```ts
import type { KboMatch } from '@/lib/kboScraper';
import { TEAM_NAME_TO_ID } from '@/lib/kboScraper';

export type CalendarPreviewTone = 'scheduled' | 'finished' | 'cancelled';

export interface CalendarGamePreview {
  label: string;
  badge: '홈' | '원정' | '취소' | '종료' | '예정';
  tone: CalendarPreviewTone;
  isMyTeamGame: boolean;
}

export function buildCalendarGamePreview(game: KboMatch, myTeamId: string): CalendarGamePreview {
  const isHome = TEAM_NAME_TO_ID[game.homeTeam] === myTeamId;
  const isAway = TEAM_NAME_TO_ID[game.awayTeam] === myTeamId;
  const isMyTeamGame = isHome || isAway;
  const opponent = isHome ? game.awayTeam : game.homeTeam;

  if (game.status === 'cancelled') {
    return {
      label: '경기 취소',
      badge: '취소',
      tone: 'cancelled',
      isMyTeamGame,
    };
  }

  if (game.status === 'finished') {
    return {
      label: `vs ${opponent}`,
      badge: '종료',
      tone: 'finished',
      isMyTeamGame,
    };
  }

  return {
    label: `vs ${opponent}`,
    badge: isHome ? '홈' : '원정',
    tone: 'scheduled',
    isMyTeamGame,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-schedule-calendar-view.ts`
Expected: PASS with `schedule calendar preview test passed`

- [ ] **Step 5: Commit**

```bash
git add /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/src/lib/scheduleCalendarView.ts /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-schedule-calendar-view.ts
git commit -m "feat: add compact schedule calendar view model"
```

### Task 2: Extract a dedicated calendar cell component

**Files:**
- Create: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/components/ScheduleCalendarCell.tsx`
- Modify: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/app/schedule/page.tsx:180-320`
- Test: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/scripts/verify-schedule-calendar-view.ts`

- [ ] **Step 1: Define the component props and failing expectation in code comments**

```ts
export interface ScheduleCalendarCellProps {
  label: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  disabled: boolean;
  preview: CalendarGamePreview | null;
  accentColor: string;
  accentBackground: string;
  onClick: () => void;
}
```

```ts
// Expected UI behavior:
// - 빈 칸은 반투명 박스로 유지
// - 경기 있는 칸은 날짜 숫자 아래에 badge 1개 + label 1줄만 표시
// - 전체 팀명 문장은 이 컴포넌트에서 절대 렌더링하지 않음
```

- [ ] **Step 2: Create the component shell**

```tsx
import type { CSSProperties } from 'react';
import type { CalendarGamePreview } from '@/lib/scheduleCalendarView';

interface ScheduleCalendarCellProps {
  label: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  disabled: boolean;
  preview: CalendarGamePreview | null;
  accentColor: string;
  accentBackground: string;
  onClick: () => void;
}

const toneStyles: Record<CalendarGamePreview['tone'], { badgeBg: string; badgeColor: string }> = {
  scheduled: { badgeBg: '#FFF4F4', badgeColor: '#E85D75' },
  finished: { badgeBg: '#F3F4F6', badgeColor: '#4B5563' },
  cancelled: { badgeBg: '#FEF2F2', badgeColor: '#DC2626' },
};

export default function ScheduleCalendarCell({
  label,
  isCurrentMonth,
  isToday,
  disabled,
  preview,
  accentColor,
  accentBackground,
  onClick,
}: ScheduleCalendarCellProps) {
  const tone = preview ? toneStyles[preview.tone] : null;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        minWidth: 0,
        minHeight: '92px',
        borderRadius: '16px',
        padding: '8px 6px',
        background: isCurrentMonth ? (isToday ? accentBackground : 'white') : 'rgba(255,255,255,0.45)',
        border: isToday ? `1.5px solid ${accentColor}` : '1px solid var(--border)',
        opacity: isCurrentMonth ? 1 : 0.45,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        justifyContent: 'space-between',
        gap: '6px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: isToday ? 800 : 700, color: isToday ? accentColor : 'var(--text)' }}>
          {label}
        </span>
      </div>

      {preview ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
          <span
            style={{
              alignSelf: 'flex-start',
              padding: '4px 7px',
              borderRadius: '9999px',
              fontSize: '10px',
              fontWeight: 800,
              background: tone?.badgeBg,
              color: tone?.badgeColor,
            }}
          >
            {preview.badge}
          </span>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              lineHeight: 1.2,
              color: preview.isMyTeamGame ? 'var(--text)' : 'var(--text-light)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {preview.label}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1 }} />
      )}
    </button>
  );
}
```

- [ ] **Step 3: Replace the inline grid cell markup in the page**

```tsx
const myGame = cell.games.find(
  (game) =>
    TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id ||
    TEAM_NAME_TO_ID[game.awayTeam] === myTeam.id
);

const preview = cell.isCurrentMonth && myGame
  ? buildCalendarGamePreview(myGame, myTeam.id)
  : null;
```

```tsx
<ScheduleCalendarCell
  key={cell.key}
  label={cell.label}
  isCurrentMonth={cell.isCurrentMonth}
  isToday={cell.isToday}
  disabled={!cell.isCurrentMonth || !hasGames}
  preview={preview}
  accentColor={myTeam.color}
  accentBackground={myTeam.bgSecondary}
  onClick={() => cell.date && openDayModal(cell.date, cell.games)}
/>
```

- [ ] **Step 4: Run verification**

Run: `npx tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/scripts/verify-schedule-calendar-view.ts && npm run build`
Expected: PASS and production build success

- [ ] **Step 5: Commit**

```bash
git add /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/src/components/ScheduleCalendarCell.tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/src/app/schedule/page.tsx /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/src/lib/scheduleCalendarView.ts
git commit -m "feat: simplify monthly schedule calendar cells"
```

### Task 3: Add a monthly summary strip above the grid

**Files:**
- Modify: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/app/schedule/page.tsx:140-230`
- Test: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/scripts/verify-schedule-calendar-view.ts`

- [ ] **Step 1: Define the summary counts in page logic**

```ts
const monthlyMyTeamGames = schedules.filter(
  (game) => TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id || TEAM_NAME_TO_ID[game.awayTeam] === myTeam.id
);

const monthlySummary = {
  total: monthlyMyTeamGames.length,
  home: monthlyMyTeamGames.filter((game) => TEAM_NAME_TO_ID[game.homeTeam] === myTeam.id).length,
  away: monthlyMyTeamGames.filter((game) => TEAM_NAME_TO_ID[game.awayTeam] === myTeam.id).length,
};
```

- [ ] **Step 2: Render a compact summary strip above weekday labels**

```tsx
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: '8px',
    marginBottom: '14px',
  }}
>
  {[
    { label: '이번달 경기', value: monthlySummary.total },
    { label: '홈 경기', value: monthlySummary.home },
    { label: '원정 경기', value: monthlySummary.away },
  ].map((item) => (
    <div
      key={item.label}
      style={{
        borderRadius: '14px',
        background: 'var(--background)',
        padding: '10px 12px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '11px', color: 'var(--text-light)', fontWeight: 700, marginBottom: '4px' }}>
        {item.label}
      </div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>{item.value}</div>
    </div>
  ))}
</div>
```

- [ ] **Step 3: Keep empty-month behavior intact**

```ts
// Summary strip should render only when schedules.length > 0
{!loading && schedules.length > 0 && (...summary strip...)}
```

- [ ] **Step 4: Run verification**

Run: `npm run build`
Expected: PASS with no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/src/app/schedule/page.tsx
git commit -m "feat: add monthly summary strip to schedule page"
```

### Task 4: Tighten modal language to match the lighter calendar grid

**Files:**
- Modify: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/src/app/schedule/page.tsx:520-920`
- Test: `/Users/ptk-a250027/Desktop/AI Coding/Jaebal_HR/scripts/verify-schedule-calendar-view.ts`

- [ ] **Step 1: Shorten top-of-modal heading hierarchy**

```tsx
<p style={{ fontSize: '12px', color: 'var(--text-light)', marginBottom: '4px' }}>
  {selectedGame.date} · {selectedGame.dayOfWeek}요일
</p>
<h3 style={{ fontSize: '20px' }}>
  {selectedGame.awayTeam} vs {selectedGame.homeTeam}
</h3>
```

- [ ] **Step 2: Make same-day game cards visually secondary to the selected game**

```tsx
background: isActive ? myTeam.bgSecondary : 'var(--background)',
border: isActive ? `1.5px solid ${myTeam.color}` : '1px solid transparent',
boxShadow: isActive ? '0 8px 18px rgba(15, 23, 42, 0.06)' : 'none',
```

- [ ] **Step 3: Keep detailed content only in modal/list, not back in the grid**

```ts
// Do not reintroduce full "SSG VS 삼성" multi-line text inside ScheduleCalendarCell.
// The grid stays compact; details belong only in modal sections below.
```

- [ ] **Step 4: Run verification**

Run: `npm run build`
Expected: PASS and schedule page keeps the same data behavior with lighter visual hierarchy

- [ ] **Step 5: Commit**

```bash
git add /Users/ptk-a250027/Desktop/AI\ Coding/Jaebal_HR/src/app/schedule/page.tsx
git commit -m "style: rebalance schedule modal hierarchy"
```

## Self-Review

- Spec coverage: 캘린더가 좌우로 찌부돼 보이는 문제를 직접 해결하는 방향으로 셀 정보량 축소, 상태 배지 분리, 월간 요약, 상세 정보 분리까지 포함했다.
- Placeholder scan: 각 작업마다 실제 파일 경로, 코드 예시, 실행 명령을 넣었고 `적당히`, `나중에`, `TODO` 같은 문구를 넣지 않았다.
- Type consistency: `buildCalendarGamePreview`, `CalendarGamePreview`, `ScheduleCalendarCell`, `monthlySummary` 이름을 전 구간에서 동일하게 사용했다.

Plan complete and saved to `docs/superpowers/plans/2026-04-27-schedule-calendar-ux-redesign.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
