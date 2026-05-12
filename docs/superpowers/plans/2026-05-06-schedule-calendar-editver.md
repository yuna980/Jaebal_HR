# Schedule Calendar Editver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the schedule calendar to match `calendar_editver.md` while preserving the existing full detail modal behind a secondary action.

**Architecture:** Extend calendar preview data with opponent/home-away information, restyle `ScheduleCalendarCell`, and change date click behavior to select an inline dark detail card first. The existing modal opens only when the user taps `경기 상세 보기`.

**Tech Stack:** Next.js App Router, React client state, inline CSS, lucide-react icons.

---

### Task 1: Calendar Preview Model

**Files:**
- Modify: `src/lib/scheduleCalendarView.ts`
- Test: `scripts/verify-schedule-calendar-view.ts`

- [ ] Extend `CalendarGamePreview` with `opponent`, `isHome`, `score`, and `time`.
- [ ] Keep existing badge/tone values so current result logic remains compatible.
- [ ] Run `npx tsx scripts/verify-schedule-calendar-view.ts`.

### Task 2: Minimal Calendar Cell Redesign

**Files:**
- Modify: `src/components/ScheduleCalendarCell.tsx`

- [ ] Move date label to the top-left of each cell.
- [ ] Render opponent in the cell center as the strongest text.
- [ ] Render win/loss/draw/cancel/pending badges with bordered pastel labels.
- [ ] Render future home/away as low-emphasis icon/text.
- [ ] Apply active border, scale, and shadow on selected cells.

### Task 3: Inline Detail Card

**Files:**
- Modify: `src/app/schedule/page.tsx`

- [ ] Change calendar click from opening the modal directly to selecting a date/game.
- [ ] Add an inline dark detail card below the calendar.
- [ ] Add `경기 상세 보기` button in the card to open the existing modal.
- [ ] Keep the existing modal and diary behavior intact.

### Task 4: Verify and Deploy

**Files:**
- No source files beyond Tasks 1-3.

- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Deploy with `npx vercel --prod --yes`.
- [ ] Confirm `/schedule` returns `200`.

### Self-Review

- Spec coverage: Covers minimal cells, active state, progressive disclosure, and preservation of existing modal.
- Placeholder scan: No placeholders remain.
- Type consistency: Uses existing `KboMatch` and `CalendarGamePreview` model.
