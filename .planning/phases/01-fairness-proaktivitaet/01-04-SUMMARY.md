---
phase: 01-fairness-proaktivitaet
plan: 04
subsystem: notifications
tags: [cron, quest, notification, web-push]
dependency-graph:
  requires: [01-01, 01-03]
  provides: [quest-expiry-notifications, expiry-tracking-column]
  affects: [quests-table, instrumentation]
tech-stack:
  added: []
  patterns: [cron-scheduler, lazy-vapid-config, quiet-hours-check]
key-files:
  created:
    - supabase/migrations/20260201_quest_expiry_notification.sql
    - src/lib/cron/quest-expiry-scheduler.ts
  modified:
    - src/instrumentation.ts
    - src/lib/cron/proactive-scheduler.ts
decisions:
  - id: D04-1
    choice: "Hourly scheduler execution"
    reason: "24h window is long enough; hourly check is sufficient and reduces server load"
  - id: D04-2
    choice: "Mark quest as notified immediately after sending"
    reason: "Prevents duplicate notifications even if push delivery fails"
metrics:
  duration: 4 minutes
  completed: 2026-02-01
---

# Phase 01 Plan 04: Quest Expiration Notifications Summary

**One-liner:** Hourly cron scheduler warns users 24h before quest expiry via web-push, respecting quiet hours.

## What Was Built

1. **Database Migration** (`20260201_quest_expiry_notification.sql`)
   - Added `expiry_notified_at` column to quests table
   - Created partial index for efficient lookup of unnotified expiring quests

2. **Quest Expiry Scheduler** (`quest-expiry-scheduler.ts`)
   - Runs hourly at minute 0
   - Finds active quests expiring within 24 hours
   - Respects user quiet hours settings
   - Groups notifications by user for efficiency
   - Marks quests as notified to prevent duplicates
   - Includes quest type icons and formatted remaining time

3. **Instrumentation Integration** (`instrumentation.ts`)
   - Now initializes 3 schedulers: reminder, quest expiry, proactive
   - All schedulers use lazy VAPID configuration

## Key Implementation Details

### Query Strategy
```sql
-- Finds quests that:
-- 1. Are active
-- 2. Have an expiry date
-- 3. Haven't been notified yet
-- 4. Expire within 24 hours but haven't expired yet
.eq('status', 'active')
.not('expires_at', 'is', null)
.is('expiry_notified_at', null)
.lte('expires_at', in24Hours.toISOString())
.gt('expires_at', now.toISOString())
```

### Notification Content
- Title: Quest type icon + "Quest laeuft bald ab!"
- Body: Quest title + formatted remaining time
- URL: /quests
- Tag: quest-expiry-{id} (prevents multiple notifications for same quest)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed user_profiles array access in proactive-scheduler.ts**
- **Found during:** Build verification
- **Issue:** Supabase returns user_profiles as array from join, but code accessed it as object
- **Fix:** Added array extraction before accessing timezone property
- **Files modified:** src/lib/cron/proactive-scheduler.ts
- **Commit:** a135c86

## Verification Results

| Check | Status |
|-------|--------|
| Migration adds expiry_notified_at column | PASS |
| Scheduler exports initQuestExpiryScheduler | PASS |
| Scheduler queries quests expiring within 24h | PASS |
| Scheduler respects quiet hours | PASS |
| Scheduler marks quests as notified | PASS |
| instrumentation.ts initializes scheduler | PASS |
| TypeScript compiles without errors | PASS |

## Commits

| Hash | Description |
|------|-------------|
| a0fb4d7 | feat(01-04): add quest expiry notification tracking column |
| 9109062 | feat(01-04): create quest expiry notification scheduler |
| 78e43b1 | feat(01-04): initialize quest expiry scheduler in instrumentation |
| a135c86 | fix(01-04): fix user_profiles array access in proactive-scheduler |

## Files Changed

- `supabase/migrations/20260201_quest_expiry_notification.sql` (created)
- `src/lib/cron/quest-expiry-scheduler.ts` (created, 263 lines)
- `src/instrumentation.ts` (modified, now 3 schedulers)
- `src/lib/cron/proactive-scheduler.ts` (bugfix from parallel plan)

## Next Phase Readiness

Plan 01-04 completes Phase 1 (Fairness & Proaktivitaet). All 4 plans are now complete:
- 01-01: Streak Insurance Token System
- 01-02: Proaktive Lebensbereich-Erinnerungen (executed in parallel)
- 01-03: Health Import -> Habit Auto-Complete
- 01-04: Quest Expiration Notifications (this plan)

**Phase 1 Success Criteria:**
- [x] Streak Insurance Token System implemented
- [x] 1+ proaktive Notification pro aktivem User/Tag (proactive scheduler)
- [x] Health Imports auto-completen passende Habits
- [x] Quest-Expiration Notifications 24h vorher

Phase 1 is complete. Ready to proceed to Phase 2 (HP-System & Consequences).
