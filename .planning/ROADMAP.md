# Roadmap: Projekt L - System Audit & Stabilisierung

## Overview

This roadmap delivers a security-hardened, fully functional gamification system through systematic testing and bug fixes. The journey follows a defense-in-depth security approach: establishing RLS policies and input validation as the foundation, securing API routes and authentication flows, building comprehensive E2E testing infrastructure with Playwright, validating critical user workflows and data flows, and finally hardening with database-level testing and automated security audits. Each phase builds on the previous, ensuring no user data exposure while making the Quest → XP → Skill → Faction progression system work correctly across all flows.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4, 5, 6): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Security Foundation** - RLS policies, input validation, remove hardcoded IDs
- [ ] **Phase 2: API Security Audit** - Auth checks, error sanitization, service role cleanup
- [ ] **Phase 3: E2E Testing Infrastructure** - Playwright setup, auth helpers, test fixtures
- [ ] **Phase 4: Critical User Workflows** - Test Dashboard, Quests, Habits, Skills, Factions
- [ ] **Phase 5: XP System Validation** - End-to-end data flow testing, Level Up triggers
- [ ] **Phase 6: Database Testing & Security Hardening** - pgTAP tests, audit scripts, CI/CD

## Phase Details

### Phase 1: Security Foundation
**Goal**: Database-level security is in place and all user-specific pages load correct data
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-05, SEC-06, SEC-07
**Success Criteria** (what must be TRUE):
  1. User accessing soziales page sees only their own birthday data and social interactions (no hardcoded User IDs)
  2. User accessing karriere page sees only their own career data (no hardcoded User IDs)
  3. User cannot query another user's data via Supabase client (RLS policies enforced on all tables: quests, habits, skills, factions, user_stats, notifications, ai_conversations, journal_entries)
  4. Quest creation with malicious title/description does not execute scripts (XSS prevented via Zod + sanitization)
  5. Habit tracking with malicious input does not execute scripts (XSS prevented via Zod + sanitization)
  6. Profile editing with malicious input does not execute scripts (XSS prevented via Zod + sanitization)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 2: API Security Audit
**Goal**: All API routes verify authentication and errors never leak sensitive data
**Depends on**: Phase 1
**Requirements**: SEC-04, SEC-08, SEC-09, SEC-10
**Success Criteria** (what must be TRUE):
  1. Unauthenticated user attempting to access protected pages is redirected to login (middleware + route handler auth verified)
  2. API routes return 401 Unauthorized when called without valid session (getUser() pattern enforced, not just middleware)
  3. Health Import webhook rejects requests without valid API key
  4. Error messages displayed to users contain generic messages only (no stack traces, user IDs, or tokens visible)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 3: E2E Testing Infrastructure
**Goal**: Playwright testing environment is ready to validate security and features
**Depends on**: Phase 2
**Requirements**: TEST-01 (partial - infrastructure setup)
**Success Criteria** (what must be TRUE):
  1. Playwright can authenticate as test user and persist session across tests (auth.setup.ts with storageState working)
  2. Test database has fixtures for users, habits, quests, skills loaded before each test run
  3. Helper functions exist for common test operations (login, create quest, track habit, verify XP update)
  4. Tests can be run in parallel without data conflicts (transaction isolation or unique test user per worker)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 4: Critical User Workflows
**Goal**: All core features work correctly in real browser environment
**Depends on**: Phase 3
**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05, TEST-06, TEST-07, TEST-08, TEST-09, TEST-10
**Success Criteria** (what must be TRUE):
  1. User can navigate from Dashboard to all sections (Quests, Habits, Skills, Factions, Profile, Settings) and each page loads correctly
  2. User can create Quest, mark as complete, and verify Quest appears in completed list
  3. User can track positive/negative Habit and see streak counter increment correctly
  4. User can open Skills page, view all skills, click skill card to see details and XP progress bars display correctly
  5. User can view Factions page showing all 6 factions (Körper, Geist, Seele, Finanzen, Soziales, Karriere) with accurate XP and Level values
  6. User can edit Profile (change name, bio), save changes, and verify data persists after page reload
  7. User can open Settings, toggle theme between light/dark modes, and preference persists across sessions
  8. User accessing soziales page sees correct birthdays and social interaction data (no data from wrong user)
  9. User accessing karriere page sees correct career tracking data (no data from wrong user)
  10. User can create journal entry in Geist section and see entry appear in history list
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 5: XP System Validation
**Goal**: Complex XP data flows work correctly end-to-end with proper triggers and notifications
**Depends on**: Phase 4
**Requirements**: XP-01, XP-02, XP-03, XP-04, XP-05, XP-06, FLOW-01, FLOW-02, FLOW-03, FLOW-04
**Success Criteria** (what must be TRUE):
  1. User completes Quest and observes: XP awarded → Skill XP increases → Faction XP updates → user_stats table reflects new totals (Quest → XP → Skill → Faction flow verified)
  2. User tracks Habit and observes: Habit XP awarded → Faction XP updates based on habit domain → user_stats table reflects change (Habit → XP → Faction flow verified)
  3. User crosses Level Up threshold and observes: Level Up animation triggers → Notification displays → New level reflected in user_stats and Dashboard
  4. All XP-generating actions (Quest complete, Habit track, Skill unlock) appear in Activity Log with correct timestamps and XP amounts
  5. Skill XP persists correctly after logout and login (no XP loss across sessions)
  6. Faction XP correctly aggregates weighted XP from all Skills in that faction (weighted calculation verified)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

### Phase 6: Database Testing & Security Hardening
**Goal**: RLS policies validated at database level and security checks automated in CI/CD
**Depends on**: Phase 5
**Requirements**: BUILD-01, BUILD-02 (plus validation of all security/testing work)
**Success Criteria** (what must be TRUE):
  1. pgTAP tests verify RLS policies prevent cross-user data access on all tables (test runs as User A, attempts to query User B's data, verifies empty result)
  2. Database triggers for XP calculations execute correctly (pgTAP tests verify Quest completion triggers recalculate Faction XP accurately)
  3. Security audit script runs in CI/CD and fails build if: RLS disabled on any table, hardcoded User IDs detected, API routes missing auth checks
  4. npm run build completes without TypeScript errors
  5. Production build runs in browser without console errors (verified via Playwright test that checks console logs)
  6. Multi-user context test validates 3+ test users can interact simultaneously without data leakage (User A completes Quest while User B tracks Habit, each sees only their own data)
**Plans**: TBD

Plans:
- [ ] TBD during phase planning

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security Foundation | 0/TBD | Not started | - |
| 2. API Security Audit | 0/TBD | Not started | - |
| 3. E2E Testing Infrastructure | 0/TBD | Not started | - |
| 4. Critical User Workflows | 0/TBD | Not started | - |
| 5. XP System Validation | 0/TBD | Not started | - |
| 6. Database Testing & Security Hardening | 0/TBD | Not started | - |
