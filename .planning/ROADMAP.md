# Roadmap: Projekt L - Vision Implementation "Digitaler Spiegel"

## Overview

This roadmap implements the core vision: A gamified life-tracking system that transforms from a "passive tracker" to a "living digital mirror" through real consequences (HP/Death), proactive AI companionship (Memory + Telegram), and visual rewards (Gold + Equipment). The journey spans 11 weeks across 4 phases, building on the security-hardened foundation from the previous milestone.

## Milestones

### Milestone 1: System Audit & Security (COMPLETE)
- **Status:** COMPLETE (2026-01-23)
- **Phases:** 6/6 complete
- **Deliverables:** RLS policies, E2E tests (126+), security audit scripts, CI/CD

### Milestone 2: Vision Implementation (CURRENT)
- **Status:** Phase 1 COMPLETE, Phase 2 PLANNED
- **Timeline:** 11 Wochen
- **Goal:** HP-System, AI Memory, Telegram Chat, Equipment Shop

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (1.1, 2.1): Urgent insertions if needed

- [x] **Phase 1: Fairness & Proaktivität** - Streak Insurance, Proaktive Notifications, Health-Habit Link
- [ ] **Phase 2: Konsequenzen (HP/Death)** - HP System, Damage/Heal Triggers, Death/Respawn, Prestige
- [ ] **Phase 3: Lebendiger Buddy** - AI Memory, Telegram AI Chat, Gold System, Proaktive Quests
- [ ] **Phase 4: Visuelle Belohnungen** - 2D Equipment System, Shop, Weekly AI Reports

## Phase Details

### Phase 1: Fairness & Proaktivität (Woche 1-2) - COMPLETE
**Goal**: Die App wird "fair" und "lebendig" - Streak Insurance verhindert Frustration, proaktive Erinnerungen aktivieren User.
**Depends on**: Milestone 1 (Security) - COMPLETE
**Requirements**: FAIR-01, FAIR-02, FAIR-03, FAIR-04
**Success Criteria** (what must be TRUE):
  1. Streak Insurance verhindert 80% der Streak-Breaks (Token können eingelöst werden)
  2. 1+ proaktive Notification pro aktivem User/Tag (bei vernachlässigten Factions)
  3. Health Imports auto-completen passende Habits (Apple Watch → Habit)
  4. Quest-Expiration Notifications werden 24h vorher gesendet
**Plans:** 4 plans in 2 waves

Plans:
- [x] 01-01-PLAN.md — Streak Insurance Token System (DB + API + UI) [Wave 1]
- [x] 01-02-PLAN.md — Proaktive Lebensbereich-Erinnerungen (Cron + Notifications) [Wave 2]
- [x] 01-03-PLAN.md — Health Import → Habit Auto-Complete Link [Wave 1]
- [x] 01-04-PLAN.md — Quest-Expiration Notifications [Wave 2]

### Phase 2: Konsequenzen - HP/Death System (Woche 3-5)
**Goal**: Echte Stakes durch HP-System - User erlebt Konsequenzen für Vernachlässigung und Belohnungen für Konsistenz.
**Depends on**: Phase 1 (COMPLETE)
**Requirements**: HP-01, HP-02, HP-03, HP-04, HP-05, HP-06
**Success Criteria** (what must be TRUE):
  1. HP-System live und stabil (user_health + health_events Tabellen)
  2. Damage Triggers funktionieren (Quest fail: -10, Streak break: -5, Inaktivität: -5/Tag)
  3. Heal Triggers funktionieren (Quest complete: +10-40, Habit: +5, Mood: +2)
  4. Death & Respawn Flow funktioniert (3 Lives, XP-Verlust bei Tod)
  5. Prestige System aktiv bei 0 Lives (Soft Reset mit Boni)
  6. Health Bar UI zeigt HP animiert, Danger Zone Warnings bei < 20 HP
**Plans:** 6 plans in 4 waves

Plans:
- [ ] 02-01-PLAN.md — Health Database Schema (user_health + health_events tables, RLS, apply_hp_change RPC) [Wave 1]
- [ ] 02-02-PLAN.md — Data Layer & Death Flow (health.ts functions, XP loss on death) [Wave 2]
- [ ] 02-03-PLAN.md — Damage Triggers (Quest fail, Streak break, Inactivity cron) [Wave 3]
- [ ] 02-04-PLAN.md — Heal Triggers (Quest complete, Habit done, Mood log) [Wave 3]
- [ ] 02-05-PLAN.md — Health Bar UI (HealthBar component + dashboard integration) [Wave 3]
- [ ] 02-06-PLAN.md — Prestige & Danger Zone (Prestige modal + API, DangerZoneAlert, verification) [Wave 4]

### Phase 3: Lebendiger Buddy (Woche 6-8)
**Goal**: Der Buddy wird real - er erinnert sich an Gespräche, ist via Telegram erreichbar, und der User verdient Gold.
**Depends on**: Phase 2
**Requirements**: MEM-01, MEM-02, TEL-01, GOLD-01, QUEST-01
**Success Criteria** (what must be TRUE):
  1. AI Conversation Memory funktioniert (letzte 50 Messages + Summary als Context)
  2. Wöchentlicher Summary-Generator läuft (Cron)
  3. Telegram AI Chat funktioniert Ende-zu-Ende (freier Text → Claude → Antwort)
  4. Gold wird bei Quest/Habit Completion vergeben
  5. Proaktive Quest-Generierung basierend auf Faction-Balance
**Plans:** TBD (4 Deliverables)

Plans:
- [ ] 03-01-PLAN.md — AI Conversation Memory (conversation_history + user_summaries)
- [ ] 03-02-PLAN.md — Telegram AI Chat (Two-Way)
- [ ] 03-03-PLAN.md — Gold-System (user_currency + Rewards)
- [ ] 03-04-PLAN.md — Proaktive Quest-Generierung

### Phase 4: Visuelle Belohnungen (Woche 9-11)
**Goal**: Visuelle Progression durch 2D Equipment, Shop und AI-powered Weekly Reports.
**Depends on**: Phase 3
**Requirements**: EQUIP-01, EQUIP-02, REPORT-01
**Success Criteria** (what must be TRUE):
  1. 2D Equipment System funktioniert (Layered Avatar mit Head/Body/Accessory)
  2. Equipment Shop funktioniert (Gold → Equipment kaufen)
  3. Weekly AI Report wird automatisch generiert (Sonntag, AI Insights)
  4. User Feedback: "Die App fühlt sich lebendig an"
**Plans:** TBD (3 Deliverables)

Plans:
- [ ] 04-01-PLAN.md — Layered 2D Equipment System
- [ ] 04-02-PLAN.md — Equipment Shop
- [ ] 04-03-PLAN.md — Weekly AI Reflection Reports

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

### Milestone 1: System Audit (COMPLETE)
| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Foundation | 6/6 | COMPLETE | 2026-01-23 |
| 2. API Security Audit | 2/2 | COMPLETE | 2026-01-23 |
| 3. E2E Testing Infrastructure | N/A | COMPLETE | 2026-01-23 |
| 4. Critical User Workflows | 3/3 | COMPLETE | 2026-01-23 |
| 5. XP System Validation | 5/5 | COMPLETE | 2026-01-23 |
| 6. Database Testing & Security | 4/4 | COMPLETE | 2026-01-23 |

### Milestone 2: Vision Implementation (CURRENT)
| Phase | Plans Complete | Status | Target |
|-------|----------------|--------|--------|
| 1. Fairness & Proaktivität | 4/4 | COMPLETE | Woche 1-2 |
| 2. Konsequenzen (HP/Death) | 0/6 | PLANNED | Woche 3-5 |
| 3. Lebendiger Buddy | 0/4 | BLOCKED | Woche 6-8 |
| 4. Visuelle Belohnungen | 0/3 | BLOCKED | Woche 9-11 |
