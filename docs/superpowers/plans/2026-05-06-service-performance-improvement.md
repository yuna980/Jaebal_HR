# Service Performance Improvement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce perceived loading time on Home, Schedule, Stadium Info, and My pages by removing unnecessary blocking states, reducing API fan-out, and caching stable data safely.

**Architecture:** Keep the current client hooks, but add one consolidated dashboard API for first-screen data and move slow secondary data out of the critical render path. Use short server/client caches for frequently-read DB data and longer cache for stable stadium information.

**Tech Stack:** Next.js App Router 16, React client hooks, Supabase, Vercel Functions, localStorage memory cache.

---

### Task 1: Establish Performance Baseline

**Files:**
- Create: `scripts/measure-production-performance.mjs`

- [ ] **Step 1: Add a repeatable production timing script**

Create `scripts/measure-production-performance.mjs`:

```js
const urls = [
  '/',
  '/dashboard',
  '/schedule',
  '/stadiums',
  '/profile',
  '/api/game-schedules/today?teamId=nc',
  '/api/game-schedules/month?year=2026&month=5',
  '/api/lineup?teamId=nc&date=20260506',
  '/api/weather?stadium=%EB%AC%B8%ED%95%99&time=18%3A30',
  '/api/team-stats?teamId=nc&seasonYear=2026',
];

const origin = process.env.PERF_ORIGIN ?? 'https://jaebal-hr.vercel.app';

for (const path of urls) {
  const url = `${origin}${path}`;
  const start = performance.now();
  const response = await fetch(url, { redirect: 'follow' });
  const bytes = (await response.arrayBuffer()).byteLength;
  const total = performance.now() - start;
  console.log(`${response.status} ${Math.round(total)}ms ${bytes}b ${url}`);
}
```

- [ ] **Step 2: Run the script**

Run:

```bash
node scripts/measure-production-performance.mjs
```

Expected: `/dashboard`, `/profile`, and DB/API routes show real timing numbers that can be compared after changes.

### Task 2: Stop Weather From Blocking Home First Paint

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Change dashboard loading condition**

Replace:

```ts
const dashboardLoading =
  todayGameScheduleLoading ||
  Boolean(myTeamGame?.stadium && !weatherLoaded);
```

with:

```ts
const dashboardLoading = todayGameScheduleLoading;
```

- [ ] **Step 2: Show weather as progressive data**

Keep the weather chip conditional:

```tsx
{weather && (
  <div>{Math.round(weather.temperature ?? 0)}℃ · 강수 {(weather.precipitation ?? 0).toFixed(1)}mm · 미세먼지 {weather.airQualityLabel ?? '-'}</div>
)}
```

Do not add a full-page spinner for weather. The match card should render first, then the weather chip appears when ready.

- [ ] **Step 3: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass. Home should no longer wait for `/api/weather`.

### Task 3: Add a Dashboard Summary API to Reduce Fan-Out

**Files:**
- Create: `src/app/api/dashboard/summary/route.ts`
- Modify: `src/app/dashboard/page.tsx`
- Create: `src/hooks/useDashboardSummary.ts`

- [ ] **Step 1: Create a single summary endpoint**

Create `src/app/api/dashboard/summary/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { KBO_TEAMS } from '@/data/teams';
import { checkRateLimit, isValidTeamId } from '@/lib/apiSecurity';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const TEAM_BY_ID = Object.fromEntries(KBO_TEAMS.map((team) => [team.id, team.name]));

function getKstToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function toDashboardDate(gameDate: string) {
  const [, , month, day] = gameDate.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/) ?? [];
  return month && day ? `${month}.${day}` : gameDate;
}

export async function GET(request: Request) {
  const rateLimit = checkRateLimit(request, 'dashboard-summary');
  if (!rateLimit.allowed) {
    return NextResponse.json({ success: false, message: '요청이 너무 많아요.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId') ?? '';
  const date = searchParams.get('date') ?? getKstToday();
  const teamIds = KBO_TEAMS.map((team) => team.id);

  if (!isValidTeamId(teamId, teamIds)) {
    return NextResponse.json({ success: false, message: '잘못된 팀 정보입니다.' }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ success: false, message: 'DB 연결 정보가 없습니다.' }, { status: 500 });
  }

  const { data: schedule, error: scheduleError } = await supabase
    .from('game_schedules')
    .select('season_year, game_date, game_time, home_team_id, away_team_id, stadium, note')
    .eq('game_date', date)
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .maybeSingle();

  if (scheduleError) {
    return NextResponse.json({ success: false, message: '오늘 경기 일정을 가져오지 못했습니다.' }, { status: 500 });
  }

  if (!schedule) {
    return NextResponse.json({ success: true, schedule: null, lineup: null, recentGames: [] });
  }

  const [{ data: history }, { data: lineup }, { data: recentGames }] = await Promise.all([
    supabase
      .from('game_histories')
      .select('home_score, away_score, status, note, winning_pitcher_name, losing_pitcher_name')
      .eq('season_year', schedule.season_year)
      .eq('game_date', schedule.game_date)
      .eq('home_team_id', schedule.home_team_id)
      .eq('away_team_id', schedule.away_team_id)
      .maybeSingle(),
    supabase
      .from('game_lineups')
      .select('home_starting_pitcher, away_starting_pitcher, home_batting_order, away_batting_order, is_lineup_out, home_team_id, away_team_id')
      .eq('game_date', schedule.game_date)
      .eq('home_team_id', schedule.home_team_id)
      .eq('away_team_id', schedule.away_team_id)
      .maybeSingle(),
    supabase
      .from('game_histories')
      .select('game_date, home_team_id, away_team_id, home_score, away_score, status')
      .eq('season_year', schedule.season_year)
      .eq('status', 'finished')
      .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
      .order('game_date', { ascending: false })
      .limit(5),
  ]);

  const awayTeam = TEAM_BY_ID[schedule.away_team_id] ?? schedule.away_team_id;
  const homeTeam = TEAM_BY_ID[schedule.home_team_id] ?? schedule.home_team_id;
  const note = history?.note && history.note !== '-' ? history.note : schedule.note;

  return NextResponse.json({
    success: true,
    schedule: {
      day: toDashboardDate(String(schedule.game_date)),
      date: toDashboardDate(String(schedule.game_date)),
      dayOfWeek: '',
      time: schedule.game_time,
      matchRaw: `${awayTeam} vs ${homeTeam}`,
      awayTeam,
      homeTeam,
      awayScore: history?.away_score ?? null,
      homeScore: history?.home_score ?? null,
      stadium: schedule.stadium,
      status: note.includes('취소') ? 'cancelled' : history?.status ?? 'scheduled',
      note: note || null,
      winningPitcherName: history?.winning_pitcher_name ?? null,
      losingPitcherName: history?.losing_pitcher_name ?? null,
      savePitcherName: null,
    },
    lineup,
    recentGames: recentGames ?? [],
  });
}
```

- [ ] **Step 2: Create a hook for the summary**

Create `src/hooks/useDashboardSummary.ts` that mirrors the existing localStorage cache pattern in `useTodayGameSchedule.ts`, with cache key `dashboard-summary-cache-v1`, TTL `5 * 60 * 1000`, and endpoint `/api/dashboard/summary?teamId=${teamId}`.

- [ ] **Step 3: Switch Home to the summary hook for first-screen data**

In `src/app/dashboard/page.tsx`, replace separate first-screen hooks:

```ts
useGameScheduleMonth(...)
useTodayGameSchedule(...)
useKboLineup(...)
```

with `useDashboardSummary(myTeam?.id)` for today schedule, recent games, and lineup. Keep weather and roster separate because they are non-critical.

- [ ] **Step 4: Verify API count drops**

Open the browser network panel or run production timing before/after. Expected: Home first screen requires one dashboard summary API instead of multiple DB-backed APIs.

### Task 4: Cache Stadium Info Server Rendering

**Files:**
- Modify: `src/app/stadiums/page.tsx`

- [ ] **Step 1: Stop forcing no-store for stable stadium data**

Replace:

```ts
export const dynamic = 'force-dynamic';
export const revalidate = 0;
```

with:

```ts
export const revalidate = 3600;
```

- [ ] **Step 2: Verify page freshness requirement**

After stadium data edits, redeploy or use `revalidatePath('/stadiums')` in a future admin operation. This service currently edits data manually, so hourly caching is acceptable and removes repeated 1.3s server render waits.

- [ ] **Step 3: Verify**

Run:

```bash
npm run build
node scripts/measure-production-performance.mjs
```

Expected: `/stadiums` TTFB improves after deployment and warm cache.

### Task 5: Add HTTP Cache Headers for DB APIs

**Files:**
- Modify: `src/app/api/game-schedules/month/route.ts`
- Modify: `src/app/api/team-stats/route.ts`
- Modify: `src/app/api/game-histories/head-to-head/route.ts`

- [ ] **Step 1: Add short CDN caching to monthly schedule**

Return JSON with:

```ts
return NextResponse.json(
  { success: true, schedules, missingResults, source: 'db' },
  { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
);
```

- [ ] **Step 2: Add short CDN caching to team stats**

Return JSON with:

```ts
return NextResponse.json(
  { success: true, stats },
  { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
);
```

- [ ] **Step 3: Add longer CDN caching to previous-season head-to-head**

Return JSON with:

```ts
return NextResponse.json(
  { success: true, record, source: 'db' },
  { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } }
);
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass. Repeated production API calls should have lower TTFB once Vercel cache is warm.

### Task 6: Deploy and Compare

**Files:**
- No source changes

- [ ] **Step 1: Deploy**

Run:

```bash
npx vercel --prod --yes
```

Expected: deployment succeeds and aliases to `https://jaebal-hr.vercel.app`.

- [ ] **Step 2: Compare timings**

Run:

```bash
node scripts/measure-production-performance.mjs
```

Expected improvements:
- Home no longer waits for weather before rendering.
- `/stadiums` TTFB drops after cache warmup.
- Repeated monthly schedule/team stats/head-to-head calls are faster.
- API fan-out on Home first screen is lower.

### Self-Review

- Spec coverage: Covers current observed bottlenecks: blocking weather, multiple DB API calls, uncached stadium SSR, repeated DB API calls.
- Placeholder scan: No TBD/TODO placeholders remain.
- Type consistency: Uses existing `KboMatch` response shape and existing hook/cache conventions.
