# Requirements

**Project:** Projekt L - System Audit & Stabilisierung
**Version:** v1.0 (Beta-Ready)
**Last Updated:** 2026-01-22

## v1 Requirements

Total: 32 requirements across 4 categories

### Security (P0 - Critical)

Must be implemented before Beta release. No compromises on data security.

| REQ-ID | Requirement | Rationale | Phase |
|--------|-------------|-----------|-------|
| SEC-01 | User can access soziales page with correct user-specific data (no hardcoded User IDs) | Current hardcoded ID exposes wrong user's data | TBD |
| SEC-02 | User can access karriere page with correct user-specific data (no hardcoded User IDs) | Current hardcoded ID exposes wrong user's data | TBD |
| SEC-03 | System prevents unauthorized access to other users' data via RLS policies on all tables (quests, habits, skills, factions, user_stats, notifications, ai_conversations, journal_entries) | CVE-2025-48757: 170+ exposed Supabase databases due to RLS misconfigurations | TBD |
| SEC-04 | Unauthenticated users cannot bypass auth to access protected pages | CVE-2025-29927: Next.js middleware authorization bypass vulnerability | TBD |
| SEC-05 | System sanitizes Quest title/description input to prevent XSS attacks | User-generated content can execute malicious scripts | TBD |
| SEC-06 | System sanitizes Habit input to prevent XSS attacks | User-generated content can execute malicious scripts | TBD |
| SEC-07 | System sanitizes Profile edit input to prevent XSS attacks | User-generated content can execute malicious scripts | TBD |
| SEC-08 | API routes verify authentication using getUser() pattern (not just middleware) | Defense-in-depth: middleware-only auth is vulnerable to bypass | TBD |
| SEC-09 | Health Import webhook validates API key before processing requests | Prevent unauthorized access to health data import | TBD |
| SEC-10 | Error messages do not leak sensitive data (stack traces, user IDs, tokens) | Data leakage through verbose errors is common vulnerability | TBD |

### XP System (P0 - Critical)

Core gamification logic must work correctly. If XP is broken, the entire app value proposition fails.

| REQ-ID | Requirement | Rationale | Phase |
|--------|-------------|-----------|-------|
| XP-01 | Quest completion triggers correct XP update in user_stats table | Known bug: Quest XP not always triggering | TBD |
| XP-02 | Habit tracking triggers correct Faction XP update | Known bug: Habit XP not always triggering | TBD |
| XP-03 | Skill XP accumulation persists correctly across sessions | XP must not be lost on logout/login | TBD |
| XP-04 | Faction XP correctly aggregates from all Skills in that faction | Faction weights must be calculated accurately | TBD |
| XP-05 | Level Up threshold triggers correctly when XP crosses boundary | Users expect immediate level up notification | TBD |
| XP-06 | user_stats table reflects current XP state after all XP-generating actions | Single source of truth for user progression | TBD |

### E2E Testing (P1 - High)

Comprehensive testing prevents regressions and validates fixes. Focuses on critical user paths only.

| REQ-ID | Requirement | Rationale | Phase |
|--------|-------------|-----------|-------|
| TEST-01 | Dashboard navigation to all sections (Quests, Habits, Skills, Factions, Profile, Settings) works correctly | Primary navigation must be functional | TBD |
| TEST-02 | Quest workflows (Create, Complete, Fail) work end-to-end | Core feature - quests drive XP progression | TBD |
| TEST-03 | Habit tracking (positive/negative) and streak counter work correctly | Core feature - habits drive daily engagement | TBD |
| TEST-04 | Skills page displays all skills, opens details, shows correct XP bars | Users track progression via skills page | TBD |
| TEST-05 | Factions page displays all 6 factions (Körper, Geist, Seele, Finanzen, Soziales, Karriere) with correct XP/Level | Factions are primary progression metric | TBD |
| TEST-06 | Profile page displays data, Edit mode persists changes correctly | Users manage identity via profile | TBD |
| TEST-07 | Settings page (all categories, toggles, theme switching) functions correctly | Settings control user experience | TBD |
| TEST-08 | Soziales page displays correct user data (birthdays, social interactions) | Social features drive engagement | TBD |
| TEST-09 | Karriere page displays correct user career data | Career tracking is core to life management | TBD |
| TEST-10 | Geist/Journal page creates entries and displays history | Journaling is core to mental health tracking | TBD |

### Data Flow Validation (P1 - High)

Complex multi-table flows must be validated end-to-end. Unit tests cannot catch these issues.

| REQ-ID | Requirement | Rationale | Phase |
|--------|-------------|-----------|-------|
| FLOW-01 | Quest → XP → Skill → Faction flow completes correctly end-to-end | Critical data flow: Quest completion must update all downstream tables | TBD |
| FLOW-02 | Habit → XP → Faction flow completes correctly end-to-end | Critical data flow: Habit tracking must update faction XP | TBD |
| FLOW-03 | Level Up animation/notification triggers when threshold is crossed | User feedback for progression milestones | TBD |
| FLOW-04 | Activity log captures all XP-generating actions for audit trail | Audit trail for debugging XP issues | TBD |

### Build & Deployment (P2 - Medium)

| REQ-ID | Requirement | Rationale | Phase |
|--------|-------------|-----------|-------|
| BUILD-01 | npm run build completes without TypeScript errors | TypeScript errors block deployment | TBD |
| BUILD-02 | Production build runs without console errors | Console errors indicate underlying issues | TBD |

## v2 Requirements

Deferred to post-Beta. Nice-to-have features that are not critical for initial release.

| REQ-ID | Requirement | Reason for Deferral |
|--------|-------------|---------------------|
| JOURNAL-01 | Journal entries overview page with filtering and search | Feature works but needs better UX (Task #71 from Archon) |
| PROFILE-01 | User can upload and edit profile picture | Non-critical aesthetic feature (Task #75 from Archon) |
| AI-01 | Skillbot learns from user interactions for personalized recommendations | Advanced AI feature, not core to v1 (Task #76 from Archon) |
| ONBOARD-01 | Onboarding questionnaire captures existing user skills/habits | Improves initial experience but not blocking (Task #77 from Archon) |
| QUEST-01 | Questmaster maintains conversation history/context across sessions | Enhances AI interaction but not critical (Task #79 from Archon) |
| HEALTH-01 | Health Import API uses real data instead of mock data | Non-blocking for Beta (Task #103 from Archon) |
| TELEGRAM-01 | Telegram Bot isolates users via RLS + chat_id mapping | Feature geparkt pending backend decision (Task #66 from Archon) |
| APPLE-01 | Apple Health integration via native app | Requires native iOS app, far future (Task #78 from Archon) |
| LOG-01 | Historical development logbook tracks project progression | Documentation feature, not user-facing (Task #74 from Archon) |

## Out of Scope

Explicitly excluded from this audit/stabilization initiative.

| Item | Reason |
|------|--------|
| Neue Features entwickeln | Fokus liegt auf Stabilisierung bestehender Features, nicht auf neuen Capabilities |
| DNS/HTTPS Setup | Blockiert durch fehlenden DNS-Eintrag für supabase.projekt-l.husatech-cloud.de |
| Performance-Optimierung | Nur wenn kritische Performance-Bugs entdeckt werden; generelles Tuning ist außerhalb des Scopes |
| UI/UX Redesign | Design bleibt wie es ist; nur Bug-Fixes an UI-Komponenten |
| Infrastructure Upgrades | Nginx Reverse Proxy, SSL Certificates warten auf DNS |

## Traceability

This section maps requirements to phases. Populated during roadmap creation.

| Phase | Goal | Requirements Addressed |
|-------|------|----------------------|
| TBD | TBD | TBD |

---

*Last updated: 2026-01-22 during GSD project initialization*
