# Main Menu Visual Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Home, Schedule, Stadium Info, and My pages share one calm visual system.

**Architecture:** Update shared CSS tokens first so existing `.card`, `.container`, and navigation styles converge. Then make only small page-level adjustments where inline styles overpower the shared system.

**Tech Stack:** Next.js App Router, React, inline style objects, global CSS tokens.

---

### Task 1: Shared Visual Tokens

**Files:**
- Modify: `src/app/globals.css`
- Verify: `npm run lint`, `npm run build`

- [ ] **Step 1: Replace playful pink global tokens with neutral product tokens**

Set `--background` to `#F2F4F6`, `--card` to `#FFFFFF`, text colors to `#191F28`, `#4E5968`, `#8B95A1`, and border/shadow to soft gray. Keep `--primary` blue for shared non-team accents.

- [ ] **Step 2: Normalize shared card style**

Use a white background, 1px gray border, 20px radius, and a soft neutral shadow on `.card`. This makes Home and Schedule match Stadium Info and My without touching every card instance.

- [ ] **Step 3: Verify**

Run `npm run lint` and `npm run build`. Expected: both pass.

### Task 2: Page-Level Tone Cleanup

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/schedule/page.tsx`
- Verify: `npm run lint`, `npm run build`

- [ ] **Step 1: Soften Home main game card**

Keep team color as border/accent, but avoid heavy playful gradient dominance. Use white card surface with a subtle team-tinted header background.

- [ ] **Step 2: Keep Schedule calendar surface neutral**

Let the existing `.card` token handle the calendar container. Keep team color only on selected/accent states.

- [ ] **Step 3: Verify**

Run `npm run lint` and `npm run build`. Expected: both pass.
