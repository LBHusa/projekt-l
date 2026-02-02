---
phase: 02-konsequenzen-hp-death
plan: 05
subsystem: ui
tags: [framer-motion, health-bar, react, animation, dashboard]

# Dependency graph
requires:
  - phase: 02-02
    provides: health.ts data layer with getUserHealth()
provides:
  - Animated HealthBar component with Framer Motion
  - HP bar color-coded by level (green/yellow/red)
  - Danger zone pulsing animation (< 20 HP)
  - Lives displayed as hearts (filled/empty)
  - Dashboard integration at top of main content
affects: [02-06-death-prestige-flow, future-ui-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HealthBar follows existing widget pattern (loading state, error handling)"
    - "Framer Motion for width animation on HP bar"
    - "Color-coded HP levels (flourishing/normal/struggling/danger)"

key-files:
  created:
    - src/components/health/HealthBar.tsx
  modified:
    - src/app/page.tsx

key-decisions:
  - "Place HealthBar at top of dashboard main content for maximum visibility"
  - "Use max-w-md centered layout for readability across screen sizes"
  - "Show lives as hearts inline with HP bar"

patterns-established:
  - "HealthBar auto-loads via getUserHealth() on mount"
  - "HP status levels: flourishing (80%+), normal (50-79%), struggling (20-49%), danger (<20%)"

# Metrics
duration: 4min
completed: 2026-02-02
---

# Phase 02 Plan 05: HP UI Components Summary

**Animated HealthBar component with Framer Motion, color-coded HP levels, pulsing danger zone, and dashboard integration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-02T07:40:38Z
- **Completed:** 2026-02-02T07:44:15Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created HealthBar component with smooth Framer Motion width animation
- Color-coded HP bar (green > yellow > red based on HP percentage)
- Danger zone (< 20 HP) shows pulsing red overlay for urgency
- Lives displayed as filled/empty hearts
- Loading skeleton state for seamless UX
- Dashboard integration at prominent top position

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HealthBar Component** - `fdda720` (feat)
2. **Task 2: Integrate HealthBar into Dashboard** - `a2bc4b3` (feat)

## Files Created/Modified
- `src/components/health/HealthBar.tsx` - Animated HP bar with Framer Motion, lives display, status text
- `src/app/page.tsx` - Dashboard integration with HealthBar at top of main content

## Decisions Made
- **Placement at top of main content:** HealthBar is positioned above Quick Actions grid for maximum visibility - users see their HP immediately on dashboard load
- **max-w-md centered layout:** Keeps HP bar readable and not too wide on large screens
- **Status text with context:** Different messages for danger/low/flourishing states provide emotional feedback

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- HealthBar component ready for real-time updates when damage/heal triggers fire
- Component can be reused in other views (profile, quest completion, etc.)
- Ready for 02-06 Death/Prestige Flow integration

---
*Phase: 02-konsequenzen-hp-death*
*Completed: 2026-02-02*
