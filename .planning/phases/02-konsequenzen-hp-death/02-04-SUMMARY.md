---
phase: 02-konsequenzen-hp-death
plan: 04
subsystem: database
tags: [postgresql, triggers, hp-system, heal, quests, habits, mood]

# Dependency graph
requires:
  - phase: 02-01
    provides: user_health table, health_events table, apply_hp_change RPC
provides:
  - HP heal triggers for quest completion, habit completion, mood logging
  - quest_completion_hp_trigger on quests table
  - habit_completion_hp_trigger on habit_logs table
  - mood_log_hp_trigger on mood_logs table
affects: [02-05, 02-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HP heal triggers using apply_hp_change RPC"
    - "Difficulty-based rewards (easy=10, medium=15, hard=25, epic=40)"
    - "Conditional trigger based on habit_type"

key-files:
  created:
    - supabase/migrations/20260202120000_hp_heal_triggers.sql
  modified: []

key-decisions:
  - "All heal triggers in single migration file (semantic grouping)"
  - "Quest completion HP varies by difficulty (10/15/25/40)"
  - "Only positive habits grant HP (not negative habit avoidance)"
  - "Mood logging grants small +2 HP to encourage daily check-ins"

patterns-established:
  - "AFTER trigger pattern for HP changes"
  - "SECURITY DEFINER for trigger functions"
  - "Event logging via apply_hp_change RPC"

# Metrics
duration: 20min
completed: 2026-02-02
---

# Phase 2 Plan 4: HP Heal Triggers Summary

**Three PostgreSQL triggers that automatically grant HP for positive user actions: quest completion (+10/15/25/40), habit completion (+5), and mood logging (+2)**

## Performance

- **Duration:** 20 min
- **Started:** 2026-02-02T07:39:43Z
- **Completed:** 2026-02-02T07:59:21Z
- **Tasks:** 3
- **Files created:** 1

## Accomplishments

- Quest completion trigger with difficulty-based HP rewards (easy: +10, medium: +15, hard: +25, epic: +40)
- Habit completion trigger granting +5 HP for positive habits only
- Mood log trigger granting +2 HP for any mood entry
- Extended health_events constraints to include 'mood_log' event type and 'mood_logs' source table
- All triggers use apply_hp_change RPC ensuring HP caps at max_hp

## Task Commits

All three triggers were implemented in a single migration file (semantic grouping):

1. **Task 1-3: HP Heal Triggers** - `bb2b694` (feat)
   - Quest completion heal trigger
   - Habit completion heal trigger
   - Mood log heal trigger

## Files Created

- `supabase/migrations/20260202120000_hp_heal_triggers.sql` - All three HP heal triggers and constraint updates

## Decisions Made

1. **Single migration file** - All three heal triggers grouped together for semantic clarity (healing vs damage)
2. **Difficulty-based quest rewards** - Easy=10, Medium=15 (default), Hard=25, Epic=40 HP
3. **Positive habits only** - Only habits with habit_type='positive' grant HP heal
4. **Small mood reward** - +2 HP encourages daily mood tracking without being exploitable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed multiple migration issues**
- **Found during:** Task 1 (Database setup)
- **Issue:** Several existing migrations had syntax errors blocking Supabase start:
  - `20260116_rls_policies.sql` tried to create function in protected `auth` schema
  - `20260117200000_faction_names_fix.sql` used wrong column name `faction` instead of `faction_id`
  - `20260122_001_rls_verification_and_indexes.sql` used CONCURRENTLY in transactions
  - `20260201_proactive_notification_log.sql` used non-immutable DATE function in index
  - `20260201130000_streak_insurance_tokens.sql` used non-immutable NOW() in partial index
  - Multiple migrations had timestamp collisions (version conflicts)
- **Fix:**
  - Removed auth.user_id() wrapper function (auth.uid() already provided)
  - Fixed column name to faction_id
  - Removed CONCURRENTLY from CREATE INDEX statements
  - Added sent_date column for deduplication
  - Changed partial index to regular composite index
  - Renamed 15 migration files with consistent timestamps (YYYYMMDDHHMMSS)
- **Files modified:** 6 migration files, seed.sql
- **Verification:** Supabase start succeeds, all migrations apply
- **Committed in:** Not committed (infrastructure fixes for local dev only)

---

**Total deviations:** 1 auto-fixed (blocking infrastructure issues)
**Impact on plan:** No scope creep. Migration fixes were necessary to run local database for testing.

## Issues Encountered

- Local Supabase wouldn't start due to accumulated migration issues in codebase
- Required fixing multiple legacy migrations before new migration could be tested
- All fixes were backward-compatible and idempotent

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HP heal system complete: quest, habit, and mood triggers all functional
- Ready for 02-05: HP UI Components (HealthBar, damage/heal feedback)
- Ready for 02-06: Death/Prestige Flow

### Verification Commands

```sql
-- Test quest completion heal (hard = +25 HP)
UPDATE quests SET status = 'completed' WHERE id = '{quest_id}';

-- Test habit completion heal (+5 HP)
INSERT INTO habit_logs (user_id, habit_id, logged_at) VALUES ('{user_id}', '{habit_id}', NOW());

-- Test mood log heal (+2 HP)
INSERT INTO mood_logs (user_id, mood) VALUES ('{user_id}', 'good');

-- Verify heal events
SELECT * FROM health_events WHERE event_type IN ('quest_complete', 'habit_done', 'mood_log');
```

---
*Phase: 02-konsequenzen-hp-death*
*Completed: 2026-02-02*
