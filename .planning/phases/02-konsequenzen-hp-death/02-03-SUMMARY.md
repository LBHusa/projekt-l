---
phase: 02-konsequenzen-hp-death
plan: 03
subsystem: database, api
tags: [postgresql, triggers, cron, hp-system, damage]

# Dependency graph
requires:
  - phase: 02-01
    provides: user_health table, apply_hp_change RPC function
  - phase: 02-02
    provides: health.ts data layer, death flow with XP loss
provides:
  - Quest failure trigger (-10 HP on quest.status = 'failed')
  - Streak break HP damage (-5 HP via habits/relapse API)
  - Inactivity damage cron (-5 HP/day after 3+ days inactive)
  - 4th cron scheduler (health-inactivity-scheduler)
affects: [02-04-heal-triggers, 02-05-hp-ui, 02-06-death-prestige]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - PostgreSQL AFTER UPDATE trigger for automatic HP damage
    - node-cron daily scheduler for periodic health checks
    - Duplicate prevention via same-day event check

key-files:
  created:
    - supabase/migrations/20260202_002_hp_damage_triggers.sql
    - src/app/api/health/inactivity-check/route.ts
    - src/lib/cron/health-inactivity-scheduler.ts
  modified:
    - src/app/api/habits/relapse/route.ts
    - src/instrumentation.ts

key-decisions:
  - "Quest failure applies fixed -10 HP (not difficulty-based) for simplicity"
  - "Streak break only damages if previousStreak > 0 (actual streak existed)"
  - "Inactivity check runs at 3 AM daily to avoid peak hours"
  - "Duplicate inactivity damage prevention via same-day event check"
  - "Max 25 HP inactivity damage caps punishment at 5 days"

patterns-established:
  - "Database trigger for automatic HP damage on status change"
  - "Application-level HP damage for complex business logic"
  - "SECURITY DEFINER on trigger functions for RLS bypass"

# Metrics
duration: 2min
completed: 2026-02-02
---

# Phase 02 Plan 03: HP Damage Triggers Summary

**PostgreSQL quest failure trigger, streak break damage in relapse API, and daily inactivity cron scheduler with 4th scheduler registered**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-02T07:38:49Z
- **Completed:** 2026-02-02T07:40:51Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Quest failure automatically applies -10 HP via PostgreSQL AFTER trigger
- Streak breaks apply -5 HP via application logic in habits/relapse API
- Daily inactivity cron scheduler runs at 3 AM, applies -5 HP per day (max 25 HP) for users inactive 3+ days
- Extended health_events constraint to include 'quest_failed' event type

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Quest Failure HP Trigger** - `9b76c63` (feat)
2. **Task 2: Add HP Damage to Streak Break Logic** - `518d930` (feat)
3. **Task 3: Implement Inactivity Cron Scheduler** - `dfe27ec` (feat)

## Files Created/Modified

- `supabase/migrations/20260202_002_hp_damage_triggers.sql` - Quest failure trigger + event type constraint update
- `src/app/api/health/inactivity-check/route.ts` - Inactivity damage calculation and application
- `src/lib/cron/health-inactivity-scheduler.ts` - Daily scheduler for inactivity checks
- `src/app/api/habits/relapse/route.ts` - Extended with -5 HP damage on streak breaks
- `src/instrumentation.ts` - Registered 4th scheduler (healthInactivityScheduler)

## Decisions Made

1. **Quest failure applies fixed -10 HP** - Not difficulty-based for simplicity; difficulty affects XP reward, not HP punishment
2. **Streak break only damages if previousStreak > 0** - No damage if user never had a streak (day 0 relapse)
3. **Inactivity check runs at 3 AM** - Off-peak hours, daily schedule for consistency
4. **Duplicate prevention via same-day check** - Query health_events for existing 'inactivity' event today before applying
5. **Max 25 HP from inactivity** - Caps punishment at 5 days equivalent, prevents death spiral

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HP damage system complete (quest failure, streak break, inactivity)
- Ready for 02-04: Heal triggers (quest completion, habit completion)
- Database schema supports all planned heal event types
- 4 cron schedulers now active in production

---
*Phase: 02-konsequenzen-hp-death*
*Completed: 2026-02-02*
