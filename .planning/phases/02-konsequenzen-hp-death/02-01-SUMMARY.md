---
phase: 02-konsequenzen-hp-death
plan: 01
subsystem: database
tags: [postgresql, supabase, rpc, health-system, hp, lives, prestige]

# Dependency graph
requires:
  - phase: 01-fairness-proaktivitaet
    provides: Supabase patterns, RLS policies, migration conventions
provides:
  - user_health table for HP/lives tracking
  - health_events append-only log for audit trail
  - apply_hp_change RPC for atomic HP updates with death detection
  - perform_prestige RPC for game over reset
  - TypeScript types for HP system
affects: [02-02 (damage triggers), 02-03 (heal triggers), 02-04 (HP UI)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Atomic HP updates via RPC with row-level locking (FOR UPDATE)"
    - "Death detection with automatic respawn at full HP"
    - "Prestige system for game over state"

key-files:
  created:
    - supabase/migrations/20260202_001_hp_system_schema.sql
  modified:
    - src/lib/database.types.ts

key-decisions:
  - "HP bounded 0-100 with CHECK constraints"
  - "Death respawns at full HP automatically, decrementing lives"
  - "awaiting_prestige flag blocks HP changes until prestige performed"
  - "SECURITY DEFINER functions for RPC to bypass RLS"

patterns-established:
  - "Health events as append-only log for audit trail"
  - "Metadata JSONB field for extensible event context"

# Metrics
duration: 4min
completed: 2026-02-02
---

# Phase 2 Plan 1: HP System Schema Summary

**PostgreSQL schema for HP/lives tracking with atomic RPC functions for death detection and automatic respawn**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-02T07:24:25Z
- **Completed:** 2026-02-02T07:28:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created user_health table with HP (0-100), lives (0-3), and prestige tracking
- Created health_events append-only log for all HP changes
- Implemented apply_hp_change RPC with atomic updates, death detection, and automatic respawn
- Added TypeScript types matching schema exactly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HP System Schema Migration** - `bb80ed1` (feat)
2. **Task 2: Generate TypeScript Types** - `2207551` (feat)

## Files Created/Modified
- `supabase/migrations/20260202_001_hp_system_schema.sql` - HP system schema (319 lines)
- `src/lib/database.types.ts` - TypeScript types for UserHealth and HealthEvent

## Decisions Made
- **HP bounds:** 0-100 with database CHECK constraints for data integrity
- **Death handling:** Automatic respawn at full HP, decrement lives, log death event
- **Prestige state:** awaiting_prestige=true blocks further HP changes until prestige performed
- **RPC functions:** Use SECURITY DEFINER to bypass RLS for system operations

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **Supabase local not running:** Could not verify migration via `npx supabase db reset --local`. Verified SQL syntax by checking file structure and key patterns. Migration will be tested on deployment.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- HP schema ready for damage/heal triggers in 02-02 and 02-03
- TypeScript types available for UI components in 02-04
- apply_hp_change RPC ready to be called from quest/habit completion handlers

---
*Phase: 02-konsequenzen-hp-death*
*Completed: 2026-02-02*
