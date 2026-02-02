# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Den User durch echte Stakes, proaktive Begleitung und spuerbare Belohnungen motivieren, sein Leben bewusst auf der Meta-Ebene zu gestalten.
**Current focus:** Vision Implementation - Phase 3 COMPLETE, ready for Phase 4

## Current Position

Milestone: 2 of 2 (Vision Implementation)
Phase: 3 of 4 (Lebendiger Buddy) - COMPLETE
Plan: 6 of 6 complete (P3-01a, P3-01b, P3-01c, P3-02, P3-03, P3-04)
Status: Phase 3 complete
Last activity: 2026-02-02 - Completed 03-PLAN.md (Lebendiger Buddy)

Progress: [████████████████████] 100% (Phase 3 complete - 16/17 plans)

## Milestone Overview

### Milestone 1: System Audit & Security (COMPLETE)
- **Completed:** 2026-01-23
- **Phases:** 6/6
- **Tests:** 126+ E2E, 271 unit tests
- **Key Deliverable:** Security-hardened foundation

### Milestone 2: Vision Implementation (CURRENT)
- **Status:** Phase 3 COMPLETE, Phase 4 ready
- **Timeline:** 11 Wochen (4 Phasen)
- **Target:** HP-System, AI Memory, Telegram Chat, Equipment

## Phase 3 Tasks

| ID | Task | Status | Assignee |
|----|------|--------|----------|
| P3-01a | Conversation Storage (Supabase) | `done` | GSD Executor |
| P3-01b | RAG Memory mit Qdrant | `done` | GSD Executor |
| P3-01c | Memory API & Integration | `done` | GSD Executor |
| P3-02 | Telegram AI Chat (Two-Way) | `done` | GSD Executor |
| P3-03 | Gold-System | `done` | GSD Executor |
| P3-04 | Proaktive Quest-Generierung | `done` | GSD Executor |

### Success Criteria Phase 3
- [x] AI Conversation Memory mit Hybrid-RAG funktioniert (Qdrant + Supabase)
- [x] USER-ISOLIERUNG: Jeder User sieht NUR seine eigenen Gespräche (user_id Filter)
- [x] Sliding Window: 50 Messages für Kurzzeit-Context
- [x] Weekly Summary Generator läuft (Cron, via scheduler)
- [x] Semantische Suche funktioniert
- [x] Memory-Export: User kann Daten exportieren (GDPR)
- [x] Telegram AI Chat mit Quick-Action Buttons funktioniert
- [x] Gold wird bei Quest/Habit Completion vergeben (inkl. Streak-Boni)
- [x] Proaktive Quest-Generierung mit Ruhetage-Respekt

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
| 2026-02-02 | 02-03 | Quest failure applies fixed -10 HP | Simplicity over difficulty-based |
| 2026-02-02 | 02-03 | Streak break only damages if previousStreak > 0 | No punishment for day 0 |
| 2026-02-02 | 02-03 | Inactivity check runs at 3 AM daily | Off-peak hours |
| 2026-02-02 | 02-03 | Max 25 HP inactivity damage (5 days) | Prevent death spiral |
| 2026-02-02 | 02-05 | HealthBar at top of dashboard main content | Maximum visibility for HP status |
| 2026-02-02 | 02-05 | max-w-md centered layout | Readable across screen sizes |
| 2026-02-02 | 02-04 | Quest HP varies by difficulty (10/15/25/40) | Harder quests = bigger reward |
| 2026-02-02 | 02-04 | Only positive habits grant HP | Negative habit avoidance is its own reward |
| 2026-02-02 | 02-04 | Mood logging grants +2 HP | Small reward to encourage daily check-in |
| 2026-02-02 | 03 | projekt_l_memory collection only | Protects HUSATECH production collections |
| 2026-02-02 | 03 | 3072 dimensions (text-embedding-3-large) | Consistent with HUSATECH RAG system |
| 2026-02-02 | 03 | 50 message sliding window | 2-3 days context, good token/quality balance |
| 2026-02-02 | 03 | 20 AI messages/day rate limit | Prevents API abuse while allowing meaningful use |
| 2026-02-02 | 03 | 100 gold starting balance | Gives new users immediate purchasing power |
| 2026-02-02 | 03 | Streak milestones not every completion | Prevents gold inflation |
| 2026-02-02 | 03 | Neutral-wise quest notification tone | Per CONTEXT.md specifications |
| 2026-02-02 | 03 | Quest suggestions vs direct creation | User agency - they choose to accept |

## Blockers

None currently.

## Recent Activity

| Date | Event | Details |
|------|-------|---------|
| 2026-02-02 | Phase 3 Complete | Lebendiger Buddy (6/6 tasks, 21 min) |
| 2026-02-02 | P3-04 Complete | Proaktive Quest-Generierung |
| 2026-02-02 | P3-03 Complete | Gold System |
| 2026-02-02 | P3-02 Complete | Telegram AI Chat |
| 2026-02-02 | P3-01c Complete | Memory API & Integration |
| 2026-02-02 | P3-01b Complete | RAG Memory mit Qdrant |
| 2026-02-02 | P3-01a Complete | Conversation Storage |
| 2026-02-02 | Phase 2 Complete | HP/Death System (6/6 plans) |
| 2026-02-02 | Plan 02-06 Complete | Prestige & Danger Zone (4 tasks, 8 min) |
| 2026-02-01 | Plan 01-04 Complete | Quest Expiration Notifications |
| 2026-02-01 | GSD Planning | PROJECT.md, ROADMAP.md, STATE.md, Phase Plans erstellt |

## Session Context

### Last Session
- **Date:** 2026-02-02 13:11 UTC
- **Focus:** Phase 3 Complete
- **Completed:** 03-PLAN.md (6/6 tasks)
- **Outcome:** AI Memory, Telegram Chat, Gold System, Proactive Quests

### Resume Information
- **Stopped at:** Phase 3 complete
- **Resume file:** None (no active checkpoint)
- **Next:** Phase 4 - 2D Equipment & Shop

## Key Metrics

### Codebase Status
- **Existing Features:** 33 Pages, 125+ Components, 62+ APIs
- **Test Coverage:** 126+ E2E Tests, 271 Unit Tests
- **Build Status:** Passing
- **Security Audit:** 3/3 Checks passing
- **Cron Schedulers:** 5 active (reminder, proactive, quest-expiry, health-inactivity, proactive-quest)

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
| **HP/Death System** | 100% | Phase 2 |
| **AI Memory (Hybrid RAG)** | 100% | Phase 3 |
| **Telegram AI Chat** | 100% | Phase 3 |
| **Gold System** | 100% | Phase 3 |
| **Proaktive Quest-Generierung** | 100% | Phase 3 |
| **2D Equipment** | 0% | Phase 4 |
| **Equipment Shop** | 0% | Phase 4 |
| **Weekly AI Reports** | 0% | Phase 4 |

**Overall Vision Progress:** ~76% (Phase 3 complete - 16/17 plans)

## Notes

- **Phase 1 COMPLETE:** All fairness and proactive notification features implemented
- **Phase 2 COMPLETE:** Full HP/Death system with damage/heal triggers, prestige, and UI
- **Phase 3 COMPLETE:** AI Memory, Telegram Chat, Gold System, Proactive Quests
- **Cron Infrastructure:** Now has 5 schedulers running
- **Qdrant Integration:** projekt_l_memory collection created (3072 dimensions)
- **Gold Economy:** Ready for Phase 4 shop implementation

## Technical Context

### Existing Infrastructure
- Next.js 14 (App Router) + React 19.2.3
- Supabase (PostgreSQL + Auth)
- Claude Sonnet 4.5 (AI Skill Bot)
- Web Push API (funktioniert)
- Telegram Bot API (now two-way!)
- Playwright E2E Testing
- Qdrant Vector DB (87.106.191.206:6333)

### New in Phase 3
- conversation_history table
- user_summaries table
- user_currency table
- currency_transactions table
- streak_milestone_awards table
- quest_suggestions table
- memory-rag.ts (Qdrant integration)
- telegram-ai.ts (Telegram AI chat)
- proactive-quest.ts (quest generation)
- GoldDisplay component
- 7 new API endpoints
- 5th cron scheduler (proactive-quest)
- @qdrant/js-client-rest dependency
- openai dependency

### To Research for Phase 4
- Equipment rendering approach (SVG vs Canvas vs WebGL)
- Shop item pricing balance
- Equipment slot system design

---

*Last updated: 2026-02-02 - Phase 3 Complete (6/6 tasks)*
