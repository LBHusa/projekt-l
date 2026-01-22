# Projekt L - System Audit & Stabilisierung

## What This Is

Ein gamifiziertes Self-Improvement-System (Next.js 14 + TypeScript + Supabase) mit Quests, Habits, Skills und Factions über verschiedene Lebensdomänen (Körper, Geist, Seele, Finanzen, Soziales, Karriere). Diese Initiative fokussiert sich auf systematisches Testing, Security-Härtung und Bug-Fixes, um das bestehende System vollständig funktionsfähig und sicher zu machen, bevor neue Features entwickelt werden.

## Core Value

**Bestehendes System vollständig funktionsfähig und sicher machen, bevor neue Features hinzugefügt werden.**

Wenn nur eine Sache funktionieren muss: Kritische Security-Bugs (hardcoded User IDs, fehlende RLS Policies) sind behoben und das XP-System vergibt XP korrekt über alle Datenflüsse (Quest → XP → Skill → Faction).

## Requirements

### Validated

<!-- Existierende Capabilities aus der Codebase -->

- ✓ User Authentication (Supabase Auth, signup, login, session management) — existing
- ✓ Dashboard with character stats, quick actions, recent activity — existing
- ✓ Skill system with domains, factions, hierarchical skill trees — existing
- ✓ Habit tracking with XP generation and streak counting — existing
- ✓ Quest system with creation, completion, failure tracking — existing
- ✓ XP & Progression system (level calculation, achievements) — existing
- ✓ Activity logging for audit trail — existing
- ✓ Faction-specific pages (Körper, Geist, Seele, Finanzen, Soziales, Karriere) — existing
- ✓ AI integration (Claude API for Skillbot/Questmaster) — existing
- ✓ Google Calendar integration — existing
- ✓ Telegram bot integration (webhook handlers) — existing
- ✓ Notion API integration — existing
- ✓ Web Push Notifications — existing
- ✓ Theme support (dark mode via next-themes) — existing
- ✓ Responsive UI (Tailwind CSS, Framer Motion animations) — existing

### Active

<!-- Audit/Fix-Initiative Requirements -->

**Security (P0 - Kritisch):**
- [ ] **SEC-01**: Remove hardcoded User IDs from soziales page
- [ ] **SEC-02**: Remove hardcoded User IDs from karriere page
- [ ] **SEC-03**: Implement RLS policies for all tables (quests, habits, skills, factions, user_stats, notifications, ai_conversations, journal_entries)
- [ ] **SEC-04**: Verify auth bypass protection on all protected pages
- [ ] **SEC-05**: Implement input validation to prevent XSS in Quest title/description
- [ ] **SEC-06**: Implement input validation to prevent XSS in Habit tracking
- [ ] **SEC-07**: Implement input validation for Profile editing
- [ ] **SEC-08**: Verify API routes have proper authentication (requireAuth pattern)
- [ ] **SEC-09**: Verify Health Import webhook has API key check
- [ ] **SEC-10**: Audit error messages for sensitive data leakage

**XP System (P0 - Kritisch):**
- [ ] **XP-01**: Verify Quest completion triggers XP update correctly
- [ ] **XP-02**: Verify Habit tracking triggers Faction XP update correctly
- [ ] **XP-03**: Verify Skill XP accumulation is correct
- [ ] **XP-04**: Verify Faction XP calculation from Skills is correct
- [ ] **XP-05**: Verify Level Up threshold triggers correctly
- [ ] **XP-06**: Validate user_stats table updates on XP changes

**E2E Testing (P1 - Hoch):**
- [ ] **TEST-01**: Dashboard navigation to all sections functional
- [ ] **TEST-02**: Quests - Create, Complete, Fail workflows
- [ ] **TEST-03**: Habits - Track positive/negative, verify streak counter
- [ ] **TEST-04**: Skills - Display all skills, open details, verify XP bars
- [ ] **TEST-05**: Factions - Display all 6 factions with correct XP/Level
- [ ] **TEST-06**: Profile - Display data, Edit mode, Save persistence
- [ ] **TEST-07**: Settings - All categories functional, toggles work
- [ ] **TEST-08**: Soziales - Birthday display, social interactions
- [ ] **TEST-09**: Karriere - Career data display
- [ ] **TEST-10**: Geist/Journal - Create entries, display history

**Data Flow Validation (P1 - Hoch):**
- [ ] **FLOW-01**: End-to-end Quest → XP → Skill → Faction flow verified
- [ ] **FLOW-02**: End-to-end Habit → XP → Faction flow verified
- [ ] **FLOW-03**: Level Up animation/notification triggers correctly
- [ ] **FLOW-04**: Activity log captures all XP-generating actions

**Build & Deployment (P2 - Medium):**
- [ ] **BUILD-01**: npm run build completes without TypeScript errors
- [ ] **BUILD-02**: No console errors in production build

### Out of Scope

- **Neue Features entwickeln** — Fokus liegt auf Stabilisierung bestehender Features, nicht auf neuen Capabilities
- **DNS/HTTPS Setup** — Blockiert durch fehlenden DNS-Eintrag für supabase.projekt-l.husatech-cloud.de
- **Performance-Optimierung** — Nur wenn kritische Performance-Bugs entdeckt werden; generelles Tuning ist außerhalb des Scopes
- **UI/UX Redesign** — Design bleibt wie es ist; nur Bug-Fixes an UI-Komponenten
- **Infrastructure Upgrades** — Nginx Reverse Proxy, SSL Certificates warten auf DNS

## Context

**Technische Umgebung:**
- Next.js 16.1.1 (App Router)
- React 19.2.3
- TypeScript 5.9.3
- Supabase (Auth + PostgreSQL)
- Multiple externe APIs: Claude AI, Google Calendar, Telegram, Notion
- Deployment: Vercel (angenommen)

**Bekannte Issues:**
- Hardcoded User IDs in soziales/page.tsx und karriere/page.tsx (Task #103 aus Archon)
- Health Import API verwendet Mock-Daten statt echte Daten (Task #103 aus Archon)
- Telegram Bot benötigt RLS-Isolierung mit chat_id mapping (Task #66 aus Archon)
- 16 offene Tasks aus Legacy Archon-System dokumentiert
- Codebase bereits gemappt in .planning/codebase/

**Gamification-System Komplexität:**
- 6 Factions (Körper, Geist, Seele, Finanzen, Soziales, Karriere)
- Hierarchische Skill-Trees mit Prerequisites und Synergien
- XP-Fluss: Quest/Habit → Skill → Faction → Level Up
- Activity Logging für alle XP-Änderungen

**Externe Integrationen:**
- Google Calendar für Event-Sync
- Telegram Bot für Notifications/Commands
- Notion für Content-Management
- Claude AI für Skillbot und Questmaster

## Constraints

- **Tech Stack**: Next.js 14, TypeScript, Supabase, React 19 — Keine Änderungen am Stack, nur Fixes
- **Timeline**: ASAP — Keine harte Deadline, aber dringend (Beta-Ready so schnell wie möglich)
- **Backward Compatibility**: Bestehende Features müssen weiterhin funktionieren — Breaking Changes nur wenn absolut notwendig
- **Data Integrity**: User-Daten dürfen nicht verloren gehen oder korrupt werden — Alle DB-Änderungen müssen durch Migrations erfolgen
- **Security**: Alle RLS Policies müssen vor Beta-Release implementiert sein — Keine Kompromisse bei Datensicherheit

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| GSD Workflow für Projekt-Management | Strukturierte Planung und Ausführung mit atomaren Commits | — Pending |
| Security-Bugs als P0 priorisieren | Datenlecks und Auth-Bypass verhindern vor Beta-Release | — Pending |
| Playwright für E2E Testing | Reale Browser-Tests statt Mock-Tests für kritische User-Flows | — Pending |
| Brownfield-Ansatz | Validated Requirements aus existierender Codebase ableiten | — Pending |
| Systematisches Testing vor Fixes | Vollständiger Überblick über alle Bugs bevor Reparatur | — Pending |

---
*Last updated: 2026-01-22 after initialization*
