# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Den User durch echte Stakes, proaktive Begleitung und spuerbare Belohnungen motivieren, sein Leben bewusst auf der Meta-Ebene zu gestalten.
**Current focus:** Vision Implementation - Phase 2 IN PROGRESS

## Current Position

Milestone: 2 of 2 (Vision Implementation)
Phase: 2 of 4 (Konsequenzen & HP/Death System) - IN PROGRESS
Plan: 2 of 6 complete
Status: In progress
Last activity: 2026-02-02 - Completed 02-02-PLAN.md (Health Data Layer & Death Flow)

Progress: [████████░░] 33% (Phase 2 - 2/6 plans complete)

## Milestone Overview

### Milestone 1: System Audit & Security (COMPLETE)
- **Completed:** 2026-01-23
- **Phases:** 6/6
- **Tests:** 126+ E2E, 271 unit tests
- **Key Deliverable:** Security-hardened foundation

### Milestone 2: Vision Implementation (CURRENT)
- **Status:** Phase 2 in progress
- **Timeline:** 11 Wochen (4 Phasen)
- **Target:** HP-System, AI Memory, Telegram Chat, Equipment

## Phase 2 Tasks

| ID | Task | Status | Assignee |
|----|------|--------|----------|
| P2-01 | HP System Schema | `done` | GSD Executor |
| P2-02 | Health Data Layer & Death Flow | `done` | GSD Executor |
| P2-03 | Damage Triggers | `todo` | - |
| P2-04 | Heal Triggers | `todo` | - |
| P2-05 | HP UI Components | `todo` | - |
| P2-06 | Death/Prestige Flow | `todo` | - |

### Success Criteria Phase 2
- [x] user_health + health_events tables created
- [x] Health data layer with CRUD functions
- [x] Death triggers XP loss (10% per faction)
- [ ] Streak-Break deals damage to user HP
- [ ] Inactivity deals damage to user HP
- [ ] Quest/Habit completion heals user HP
- [ ] HP bar visible in dashboard
- [ ] Death modal and prestige flow

## Accumulated Decisions

| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| 2026-02-01 | 01-01 | FIFO token selection (oldest expiring first) | Fair usage, prevent waste |
| 2026-02-01 | 01-01 | 30-day default token expiration | Prevent hoarding, maintain urgency |
| 2026-02-01 | 01-01 | Separate RLS insert policy for system grants | Allow server-side token creation |
| 2026-02-01 | 01-03 | Workout type normalization via WORKOUT_TYPE_ALIASES map | Standardize various input formats |
| 2026-02-01 | 01-03 | Same-day duplicate prevention via logged_at comparison | Prevent double XP on repeated imports |
| 2026-02-01 | 01-03 | Minimum duration filter for mappings | Allow fine-grained control over triggers |
| 2026-02-01 | 01-04 | Hourly scheduler execution for quest expiry | 24h window is long enough; hourly check reduces load |
| 2026-02-01 | 01-04 | Mark quest as notified immediately after sending | Prevents duplicate notifications |
| 2026-02-02 | 02-01 | HP bounded 0-100 with CHECK constraints | Database enforces valid HP range |
| 2026-02-02 | 02-01 | Death respawns at full HP automatically | Immediate recovery, no manual reset needed |
| 2026-02-02 | 02-01 | awaiting_prestige blocks HP changes | Prevents damage/healing during game over state |
| 2026-02-02 | 02-01 | SECURITY DEFINER on RPC functions | Bypass RLS for system operations |
| 2026-02-02 | 02-02 | Use notification_log for death notifications | Follows existing notification pattern |
| 2026-02-02 | 02-02 | Track XP loss per faction in death metadata | Enables detailed death reports |

## Blockers

None currently.

## Recent Activity

| Date | Event | Details |
|------|-------|---------|
| 2026-02-02 | Plan 02-02 Complete | Health Data Layer & Death Flow (2 tasks, 4 min) |
| 2026-02-02 | Plan 02-01 Complete | HP System Schema (2 tasks, 4 min) |
| 2026-02-01 | Plan 01-04 Complete | Quest Expiration Notifications (3 tasks, 4 min) |
| 2026-02-01 | Plan 01-02 Complete | Proaktive Lebensbereich-Erinnerungen (executed in parallel) |
| 2026-02-01 | Plan 01-01 Complete | Streak Insurance Token System (5 tasks, 8 min) |
| 2026-02-01 | Plan 01-03 Complete | Health Import -> Habit Auto-Complete (6 tasks, 8 min) |
| 2026-02-01 | GSD Planning | PROJECT.md, ROADMAP.md, STATE.md, Phase Plans erstellt |
| 2026-02-01 | Analysis Complete | 7 Reports in /docs/ (VISION-ROADMAP, ROTER-FADEN, etc.) |
| 2026-01-23 | Milestone 1 Complete | Security Audit abgeschlossen (6/6 Phasen) |

## Session Context

### Last Session
- **Date:** 2026-02-02 07:35 UTC
- **Focus:** Health Data Layer & Death Flow
- **Completed:** 02-02-PLAN.md (2/2 tasks)
- **Outcome:** health.ts data layer, 10% XP loss on death

### Resume Information
- **Stopped at:** Completed 02-02-PLAN.md
- **Resume file:** None (no active checkpoint)
- **Next:** 02-03-PLAN.md - Damage Triggers

## Key Metrics

### Codebase Status
- **Existing Features:** 33 Pages, 120+ Components, 54+ APIs
- **Test Coverage:** 126+ E2E Tests, 271 Unit Tests
- **Build Status:** Passing
- **Security Audit:** 3/3 Checks passing
- **Cron Schedulers:** 3 active (reminder, proactive, quest-expiry)

### Vision Progress
| Feature | Status | Phase |
|---------|--------|-------|
| 7 Factions + XP | 100% | - |
| Quest Generation | 100% | - |
| Habit Tracking | 100% | - |
| Mood/Journal | 100% | - |
| Apple Health Import | 100% | - |
| **Health -> Habit Auto-Complete** | 100% | Phase 1 |
| **Streak Insurance** | 100% | Phase 1 |
| **Proaktive Notifications** | 100% | Phase 1 |
| **Quest Expiration Notifications** | 100% | Phase 1 |
| **HP/Death System** | 33% | Phase 2 |
| **AI Memory** | 0% | Phase 3 |
| **Telegram AI Chat** | 0% | Phase 3 |
| **Gold System** | 0% | Phase 3 |
| **2D Equipment** | 0% | Phase 4 |
| **Equipment Shop** | 0% | Phase 4 |
| **Weekly AI Reports** | 0% | Phase 4 |

**Overall Vision Progress:** ~62% (Phase 2 - 2/6 plans complete)

## Notes

- **Phase 1 COMPLETE:** All fairness and proactive notification features implemented
- **Phase 2 IN PROGRESS:** Schema + data layer complete, triggers next
- **Cron Infrastructure:** Now has 3 schedulers running (reminder, proactive, quest-expiry)
- **Notification-System:** Fully operational (Web Push + Telegram one-way)
- **Health Import:** Complete with auto-complete feature

## Technical Context

### Existing Infrastructure
- Next.js 14 (App Router) + React 19.2.3
- Supabase (PostgreSQL + Auth)
- Claude Sonnet 4.5 (AI Skill Bot)
- Web Push API (funktioniert)
- Telegram Bot API (one-way notifications)
- Playwright E2E Testing

### New in Phase 1
- streak_insurance_tokens table
- habit_health_mappings table
- proactive_notification_log table
- quests.expiry_notified_at column
- 3 cron schedulers in instrumentation.ts
- StreakInsuranceCard and UseTokenModal UI components
- HabitHealthMappingConfig UI component

### New in Phase 2 (so far)
- user_health table (HP, lives, prestige)
- health_events table (append-only event log)
- apply_hp_change RPC function (with XP loss on death)
- perform_prestige RPC function
- UserHealth and HealthEvent TypeScript types
- health.ts data layer module (14 functions)

### To Research for Phase 3
- AI Memory: Summary-based vs Vector-DB approach
- Telegram: Webhook fuer 2-Way Chat bereits vorhanden?

---

*Last updated: 2026-02-02 - Phase 2 Plan 2 Complete (02-02-PLAN.md)*
