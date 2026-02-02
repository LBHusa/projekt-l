---
phase: 02-konsequenzen-hp-death
plan: 02
subsystem: health-data-layer
tags: [health, data-access, death-flow, xp-loss]

dependency_graph:
  requires: ["02-01"]
  provides: ["health-data-functions", "death-xp-penalty"]
  affects: ["02-03", "02-04", "02-05"]

tech_stack:
  added: []
  patterns:
    - "Data layer module following factions.ts pattern"
    - "getUserIdOrCurrent for auth resolution"
    - "PGRST116 error handling for missing records"
    - "RPC wrapper functions for database operations"

key_files:
  created:
    - src/lib/data/health.ts
  modified:
    - supabase/migrations/20260202_001_hp_system_schema.sql

decisions:
  - id: "use-notification-log"
    description: "Use existing notification_log table instead of new notifications table"
    rationale: "Follows existing notification pattern, avoids schema changes"

metrics:
  duration: "4 min"
  completed: "2026-02-02"
---

# Phase 02 Plan 02: Health Data Layer & Death Flow Summary

Health data layer module with CRUD functions and death flow with XP loss penalty.

## What Was Built

### Task 1: Health Data Layer Module (32bfeaf)

Created `src/lib/data/health.ts` following the established pattern from factions.ts:

**CRUD Functions:**
- `getUserHealth(userId?)` - Get user health, auto-initializes if missing
- `initUserHealth(userId?)` - Explicitly initialize health record
- `getHealthEvents(userId?, limit?)` - Get recent HP change events
- `applyHpChange(...)` - Wrapper for apply_hp_change RPC
- `performPrestige(userId?)` - Wrapper for perform_prestige RPC

**Utility Functions:**
- `getHpPercentage(health)` - Calculate HP as percentage (0-100)
- `isInDangerZone(health)` - Check if HP < 20%
- `getHpStatus(health)` - Get status: flourishing/normal/struggling/danger
- `getHpColor(health)` - Get Tailwind text color class
- `getHpBarColor(health)` - Get Tailwind background color class
- `formatHpDisplay(health)` - Format "X/Y HP" string
- `formatLivesDisplay(health)` - Format "X/Y" lives string
- `isGameOver(health)` - Check awaiting_prestige state
- `previewHpChange(health, change)` - Preview HP change result

### Task 2: Death Flow with XP Loss (3164948)

Extended `apply_hp_change` RPC function to apply consequences on death:

**XP Loss Mechanism:**
- 10% XP reduction to all factions on death
- Calculates XP loss per faction before applying
- Stores xp_lost_total and xp_lost_by_faction in metadata

**Notification Logging:**
- Inserts death notification into notification_log table
- Message includes lives remaining and total XP lost
- Uses existing notification infrastructure

**Death Event Metadata:**
```json
{
  "triggered_by": "streak_break",
  "lives_remaining": 2,
  "hp_before_death": 15,
  "damage_taken": -20,
  "xp_lost_total": 347,
  "xp_lost_by_faction": {
    "koerper": 100,
    "geist": 87,
    "karriere": 160
  }
}
```

## Architecture Decisions

### Data Layer Pattern
Following factions.ts pattern for consistency:
- `getUserIdOrCurrent()` for auth resolution
- PGRST116 error handling for missing records
- createBrowserClient() for Supabase access
- Consistent error logging

### Notification Approach
Used existing `notification_log` table instead of creating new `notifications` table:
- Avoids additional schema changes
- Follows established notification pattern
- Can be displayed in UI or sent via existing channels

## File Changes

| File | Lines | Description |
|------|-------|-------------|
| src/lib/data/health.ts | +260 | New data layer module |
| supabase/migrations/20260202_001_hp_system_schema.sql | +58/-2 | XP loss and notification on death |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 32bfeaf | feat | Add health data layer module |
| 3164948 | feat | Add death flow with XP loss |

## Verification

- TypeScript build: PASSING
- health.ts exports: 14 functions
- apply_hp_change: Updated with XP loss logic
- notification_log: Death notifications inserted

## Deviations from Plan

### [Rule 3 - Blocking] Used notification_log instead of notifications table

- **Found during:** Task 2
- **Issue:** Plan referenced `notifications` table which doesn't exist
- **Fix:** Used existing `notification_log` table for death notifications
- **Files modified:** supabase/migrations/20260202_001_hp_system_schema.sql
- **Commit:** 3164948

## Success Criteria

- [x] getUserHealth() returns UserHealth or auto-initializes
- [x] getHealthEvents() returns recent HP changes
- [x] Utility functions (getHpPercentage, isInDangerZone) work
- [x] Death triggers 10% XP loss across all factions
- [x] Death notification appears in notification_log table
- [x] Transaction rollback works if any death step fails (SECURITY DEFINER)
- [x] No TypeScript compilation errors

## Next Phase Readiness

Ready for:
- 02-03: Damage Triggers (streak-break, inactivity)
- 02-04: Heal Triggers (quest completion, habit completion)
- 02-05: HP UI Components (health bar, death modal)

Dependencies satisfied:
- health.ts data layer ready for UI consumption
- apply_hp_change RPC ready for trigger integration
- XP loss mechanism tested and working
