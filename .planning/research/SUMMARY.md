# Project Research Summary

**Project:** Projekt L - Security Audit & E2E Testing
**Domain:** Next.js + Supabase Gamification App Security
**Researched:** 2026-01-22
**Confidence:** HIGH

## Executive Summary

Projekt L is a Next.js 15 + Supabase gamification application requiring a comprehensive security audit and E2E testing implementation. Based on extensive research into Next.js + Supabase security patterns (2026), this project needs a multi-layered security approach: Row Level Security (RLS) policies at the database level, authentication checks in API routes and middleware, and input validation with Zod. The critical vulnerability CVE-2025-29927 (middleware authorization bypass) and the January 2025 Supabase breach (CVE-2025-48757, 170+ exposed databases) demonstrate that middleware-only authentication is insufficient.

The recommended approach is **defense-in-depth security**: RLS policies as the final protection layer, Zod for input validation against XSS, Playwright for E2E testing of critical user flows, and pgTAP for database-level RLS testing. The current codebase has hardcoded user IDs in multiple locations (SEC-01, SEC-02) which must be fixed before any security testing can proceed. The gamification system's complex XP flows (Quest → Skill → Faction → Level) require end-to-end validation that unit tests cannot provide.

The primary risk is **incomplete RLS coverage leading to data exposure**. Research shows 83% of exposed Supabase databases involve RLS misconfigurations. Mitigation requires enabling RLS on all 49 tables immediately, creating specific policies for each operation (SELECT/INSERT/UPDATE/DELETE), indexing columns used in policies to prevent 100x+ performance degradation, and testing with real user sessions rather than mocked auth. The secondary risk is **over-investing in E2E tests**, creating slow (30+ minutes), flaky test suites. Mitigation requires focusing E2E tests on critical security boundaries and data flows while using Vitest for business logic.

## Key Findings

### Recommended Stack

Projekt L's current stack (Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3, Supabase JS 2.89.0, Vitest 4.0.16) is production-ready and requires only three critical additions for security and testing.

**Core additions needed:**
- **Zod 4.3.5**: Input validation and schema validation — CRITICAL for XSS prevention (SEC-05, SEC-06, SEC-07). Version 4 is 6.5x faster than v3 with built-in validators (z.email(), z.url(), z.jwt()). TypeScript-first, industry standard for Next.js in 2026.
- **isomorphic-dompurify 2.26.0+**: HTML sanitization for both client and server — CRITICAL for XSS prevention. Works with Next.js Server Components (v2.26.0 fixed "window is not defined" errors). Supports jsdom (server) and native DOM (client).
- **Playwright 1.57.0+**: End-to-end browser testing — Official Next.js recommendation. Latest version uses Chrome for Testing (more stable), supports auth state caching and IndexedDB storage state. Essential for testing auth bypass scenarios and data flows.

**Supporting tools:**
- **pgTAP**: Database unit testing via Supabase extension — Official Supabase recommendation for RLS testing. Provides transaction-isolated tests with helper functions from @usebasejump/supabase-test-helpers.
- **AuditYourApp / SupaExplorer**: External SaaS security scanners for RLS — Free audit tools that scan for unprotected tables, misconfigured RLS, and leaked API keys. Use before production deployment.

**Already installed (no action needed):**
- Vitest 4.0.16, @testing-library/react 16.3.1, jsdom 27.4.0 — Use for unit/integration tests

### Expected Features

Research into Next.js + Supabase security audits reveals clear expectations for production-ready applications.

**Must have (table stakes):**
- **RLS Policy Coverage** — All tables with user_id must have SELECT/INSERT/UPDATE/DELETE policies. Missing this = open database.
- **RLS Policy Testing** — Test with multiple user contexts, verify data isolation. Enable RLS from day one, don't defer.
- **Auth Bypass Prevention** — Protected pages require authentication via middleware + route handlers + RLS (multi-layer).
- **Input Validation (XSS)** — Validate all user inputs with Zod before database operations. React provides some protection, but Server Actions need explicit validation.
- **Hardcoded Credential Scan** — No hardcoded User IDs, API keys, or tokens in code. Immediate security breach if present.
- **Authentication on API Routes** — API routes are public by default, must explicitly protect with requireAuth pattern.
- **Environment Variable Security** — Never expose service_role keys to client. Only use NEXT_PUBLIC_ prefix for safe variables.
- **Error Message Sanitization** — Error messages shouldn't leak sensitive data (user IDs, internal paths). Generic messages for production.

**Should have (competitive/thorough audit):**
- **E2E Test Coverage (Playwright)** — Catches real-world auth bypass scenarios that mock tests miss. Test full user journeys with real browser.
- **Data Flow Validation** — Gamification apps have complex XP flows (Quest → Skill → Faction → Level). End-to-end validation required.
- **Database Trigger Testing** — Triggers handle XP calculations; bugs here cause silent failures. Test with pgTAP.
- **Multi-User Context Testing** — RLS bugs only appear when testing as different users simultaneously. Create test users, verify isolation.
- **Performance Impact of RLS** — Complex RLS policies with joins can slow queries 100x+. Index auth.uid() = user_id columns.
- **Webhook Authentication** — External webhooks (Telegram, Health Import) need API key verification.
- **Audit Logging Coverage** — All XP-generating actions in activity_log for debugging. Verify Quest completion, Habit tracking captured.
- **Content Security Policy (CSP)** — Protects against XSS even if input validation fails. Next.js middleware with nonce-based CSP.

**Defer (v2+ / post-beta):**
- Load Testing (Apache JMeter, 100+ concurrent users) — Only if performance issues discovered
- Secrets Manager Integration (HCP Vault Secrets) — Currently using .env, acceptable for beta
- Rate Limiting — Implement if AI costs spike from abuse
- Visual Regression Testing — Optional for UI consistency

### Architecture Approach

The standard Next.js + Supabase architecture for security and testing follows a **defense-in-depth pattern with multi-layered authorization**. The key insight from research is that authentication must be verified at EVERY data access point, not just middleware, due to CVE-2025-29927 (middleware bypass vulnerability).

**Major components:**
1. **Authentication Layer** — Middleware (token refresh + route protection) + Server Auth (getUser() in API routes) + Client Auth (browser). NEVER rely on middleware alone. ALWAYS use getUser() not getSession() in server code.
2. **Data Access Layer (DAL)** — All database queries go through src/lib/data/ functions that enforce userId filtering and use centralized auth-helper.ts. Prevents scattered auth checks and bypasses.
3. **RLS Policies (Final Defense)** — PostgreSQL Row Level Security enforces authorization at database level even if application code fails. All tables MUST have RLS enabled with specific policies for SELECT/INSERT/UPDATE/DELETE.
4. **Input Validation Layer** — Zod schemas defined once in src/lib/validation/, used on both client (React Hook Form for UX) and server (API routes for security). Server ALWAYS validates.
5. **Testing & Audit Layer** — Playwright E2E tests for critical user flows and security boundaries. pgTAP tests for RLS policies with transaction isolation. Automated security audit scripts in CI/CD.

**Critical architectural principle:** Defense-in-depth means RLS policies protect even if middleware is bypassed, API routes check auth even if middleware passes, and Zod validates server-side even if client validates. No single layer is trusted.

### Critical Pitfalls

Research into Supabase security incidents and Next.js vulnerabilities reveals recurring patterns.

1. **RLS Enabled But No Policies = Complete Lockout** — Enabling RLS without creating policies immediately blocks ALL access, even for authenticated users. PostgreSQL's RLS model is deny-by-default. ALWAYS create SELECT/INSERT/UPDATE/DELETE policies in the SAME migration that enables RLS. Test with real user sessions immediately.

2. **Middleware-Only Authorization (CVE-2025-29927)** — Implementing auth checks ONLY in Next.js middleware allows attackers to bypass security with x-middleware-subrequest header. Never rely on middleware alone. Implement multi-layered authorization: middleware AND route handlers AND RLS. Upgrade to Next.js 12.3.5+, 13.5.9+, 14.2.25+, or 15.2.3+.

3. **Missing Indexes on RLS Policy Columns** — RLS policies without indexes cause 100x+ performance degradation. Queries like `auth.uid() = user_id` evaluate on EVERY row without a B-tree index on user_id. Create indexes in same migration as RLS policies. Use EXPLAIN ANALYZE to verify Index Scan, not Seq Scan.

4. **service_role Key Exposed to Client** — Using service_role key in client-side code bypasses ALL RLS policies, granting full database access to anyone who can read JavaScript bundle. NEVER use service_role in client components. Only use anon key for client, service_role server-side only.

5. **Forgetting to Enable RLS Before Production (CVE-2025-48757)** — In January 2025, 170+ applications built with Lovable had exposed databases because RLS was never enabled. 83% of exposed Supabase databases involve RLS misconfigurations. Enable RLS on ALL tables from day one, not "later." Use Supabase Dashboard warnings and security advisors.

6. **Not Testing with Real User Sessions** — RLS policies work with hardcoded test UUIDs but fail in production because auth.uid() returns null for unauthenticated requests. Test RLS with Supabase's auth.signIn() in E2E tests, use SQL Editor's "Execute as user" feature, never test with service_role client.

7. **Hardcoded User IDs in Production Code** — Copy/paste user IDs during development, forget to remove before production. Exposes data from one user to all users (critical security bug). Always use getCurrentUserId() from auth-helper, never hardcode. Scan codebase for UUID patterns.

## Implications for Roadmap

Based on research, suggested phase structure follows the dependency chain: RLS policies (foundation) → Input validation → API security → Testing infrastructure → E2E tests → Security hardening.

### Phase 1: Security Foundation (RLS + Input Validation)
**Rationale:** RLS policies are the final defense layer and must be in place before any testing. The CVE-2025-48757 breach shows 83% of Supabase exposures involve RLS misconfigurations. Hardcoded user IDs (SEC-01, SEC-02) block all multi-user testing and must be fixed first.

**Delivers:**
- RLS policies on all 49 tables (SELECT/INSERT/UPDATE/DELETE)
- Indexes on all RLS policy columns (user_id, faction_id, skill_id)
- Zod schemas for Quest/Habit/Profile forms
- Server-side validation in all Server Actions
- Removal of hardcoded user IDs

**Addresses:**
- SEC-01, SEC-02: Remove hardcoded User IDs
- SEC-03: Implement RLS policies
- SEC-05, SEC-06, SEC-07: Input validation with Zod
- Table stakes: RLS policy coverage, input validation

**Avoids:**
- Pitfall 1: RLS enabled but no policies
- Pitfall 3: Missing indexes (100x slowdown)
- Pitfall 5: Forgetting RLS before production
- Pitfall 7: Hardcoded user IDs in production

### Phase 2: API Security Audit
**Rationale:** API routes are the main attack surface. CVE-2025-29927 proves middleware-only auth is insufficient. Must add getUser() to all routes before testing can validate security.

**Delivers:**
- Auth checks (getUser()) in all API routes
- Error message sanitization (no sensitive data leaks)
- Service role usage moved to server-only
- API route audit script for CI/CD

**Addresses:**
- SEC-04: Verify auth bypass protection
- SEC-08: API routes have requireAuth
- SEC-10: Error message sanitization
- Table stakes: Authentication on API routes

**Avoids:**
- Pitfall 2: Middleware-only authorization
- Pitfall 4: service_role exposed to client

### Phase 3: E2E Testing Infrastructure
**Rationale:** Testing infrastructure must be solid before writing tests. Playwright setup with auth state caching and test fixtures makes tests maintainable. Establishing this early prevents accumulation of untested security vulnerabilities.

**Delivers:**
- Playwright 1.57.0+ installation and configuration
- Auth setup script (auth.setup.ts) with storageState
- Test fixtures (users, habits, quests)
- Helper functions (auth, DB cleanup, assertions)

**Addresses:**
- TEST-01: Playwright setup
- Infrastructure for TEST-02 through TEST-10

**Avoids:**
- Pitfall 6: Not testing with real user sessions
- Anti-pattern: Over-investing in E2E tests (establish scope early)

### Phase 4: Critical E2E Tests
**Rationale:** Focus on critical paths that can't be unit tested: auth flows, data flow validation (Quest → XP → Faction), and security boundaries. Research shows over-investing in E2E tests creates slow (30+ min), flaky suites. Keep focused.

**Delivers:**
- Auth tests (login, signup, logout, session persistence)
- Feature tests (Quest CRUD, Habit tracking, Skill display)
- Security tests (auth bypass attempts, XSS prevention, hardcoded ID detection)
- Data flow tests (Quest → XP → Skill → Faction end-to-end)

**Addresses:**
- TEST-02 through TEST-10: E2E coverage
- XP-01 through XP-06: XP system data flows
- FLOW-01 through FLOW-04: End-to-end validation
- Should have: E2E test coverage, data flow validation

**Avoids:**
- Pitfall 6: Not testing with real sessions
- Pitfall 9: Over-investing in E2E tests (keep under 10 min runtime)

### Phase 5: Database Testing & Security Hardening
**Rationale:** pgTAP provides transaction-isolated RLS testing that application-level tests cannot achieve. Security audit scripts catch regressions in CI/CD before production deployment.

**Delivers:**
- pgTAP tests for RLS policies (all tables)
- Multi-user context testing (3+ test users)
- Database trigger testing (XP calculations)
- Automated security audit scripts (RLS validator, API scanner, hardcoded ID checker)
- CI/CD integration (GitHub Actions)

**Addresses:**
- RLS policy testing with transaction isolation
- Multi-user context testing
- Database trigger testing
- Should have: Performance impact of RLS, audit logging coverage

**Avoids:**
- Pitfall 7: Incomplete endpoint testing (test all PostgREST operators)
- Technical debt: Skipping RLS during prototyping

### Phase Ordering Rationale

**Dependency chain:**
1. RLS policies must exist before they can be tested (Phase 1 → Phase 5)
2. Input validation prevents XSS during development and testing (Phase 1 → Phase 4)
3. API security must be in place before E2E tests validate it (Phase 2 → Phase 4)
4. Testing infrastructure must be solid before writing tests (Phase 3 → Phase 4)
5. E2E tests validate features before database-level testing (Phase 4 → Phase 5)

**Architectural grouping:**
- Phase 1 establishes database-level security (RLS + validation)
- Phase 2 secures application layer (API routes, middleware)
- Phases 3-4 validate security with real user flows
- Phase 5 automates security checks for CI/CD

**Pitfall avoidance:**
- Early RLS implementation prevents CVE-2025-48757 (170+ exposed databases)
- Multi-layer auth prevents CVE-2025-29927 (middleware bypass)
- Focused E2E scope prevents slow, flaky test suites
- Real session testing prevents production RLS failures

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** RLS policy patterns for complex gamification data model — Research faction weight calculations, hierarchical skills, XP propagation triggers. Verify policy performance with EXPLAIN ANALYZE.
- **Phase 4:** Data flow testing for XP calculations — Research transaction testing patterns, race condition simulation, trigger validation. Complex multi-table flows need careful test design.

Phases with standard patterns (skip research-phase):
- **Phase 2:** API security audit — Well-documented Next.js patterns. Standard auth checks, error sanitization, service role cleanup.
- **Phase 3:** Playwright setup — Official Next.js + Playwright docs cover auth setup comprehensively. Supabase auth integration documented.
- **Phase 5:** pgTAP testing — Supabase docs provide clear pgTAP patterns. @usebasejump/supabase-test-helpers standardizes auth testing.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm, official docs (Next.js, Supabase, Zod, Playwright). Zod 4.3.5 confirmed January 2026, Playwright 1.57.0 verified via release notes. |
| Features | HIGH | Based on authoritative sources: Next.js security guide, Supabase RLS docs, OWASP best practices. Table stakes vs differentiators validated across 15+ production security audits. |
| Architecture | HIGH | Defense-in-depth pattern confirmed by multiple CVE analyses (CVE-2025-29927, CVE-2025-48757). Next.js + Supabase auth patterns from official docs. DAL pattern from Supabase best practices. |
| Pitfalls | HIGH | All critical pitfalls backed by CVE reports, Supabase security incident analysis, and production breach postmortems. Warning signs verified from real-world debugging experiences. |

**Overall confidence:** HIGH

### Gaps to Address

Research was comprehensive for security patterns and E2E testing, but two areas need validation during implementation:

- **Faction Weight Calculation RLS Performance**: The gamification system has 6 factions with weighted XP distribution. Research shows complex joins in RLS policies can cause 100x+ slowdown, but specific performance characteristics of weighted faction calculations need benchmarking with realistic data (10K+ quests/habits per user). Address during Phase 1 with EXPLAIN ANALYZE on policies.

- **Race Condition Testing for Concurrent Habit Tracking**: Multiple research sources mention race conditions in XP calculations but don't provide specific testing patterns for gamification systems. Need to determine how to simulate concurrent habit tracking (2+ users logging habits simultaneously affecting same faction XP). Address during Phase 4 planning with Playwright concurrent test patterns or k6 load testing research.

## Sources

### Primary (HIGH confidence)
- [Next.js Official Docs - Content Security Policy](https://nextjs.org/docs/app/guides/content-security-policy) — CSP implementation patterns
- [Next.js Official Docs - Authentication](https://nextjs.org/docs/app/guides/authentication) — Auth patterns for App Router
- [Next.js Official Docs - Testing: Playwright](https://nextjs.org/docs/app/guides/testing/playwright) — Official Playwright integration
- [Supabase Docs - Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — Authoritative RLS patterns
- [Supabase Docs - RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — Index optimization, caching
- [Supabase Docs - pgTAP Testing](https://supabase.com/docs/guides/database/extensions/pgtap) — Official database testing guide
- [Supabase Docs - Auth with Next.js App Router](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) — Server vs client auth patterns
- [Zod Official Docs](https://zod.dev/) — v4 features, built-in validators
- [Playwright Official Docs - Release Notes](https://playwright.dev/docs/release-notes) — Version 1.57.0 features
- [CVE-2025-29927 Analysis](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) — Next.js middleware bypass technical details
- [CVE-2025-48757 Analysis](https://deepstrike.io/blog/hacking-thousands-of-misconfigured-supabase-instances-at-scale) — Supabase RLS breach postmortem

### Secondary (MEDIUM confidence)
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/) — Comprehensive 2026 security patterns
- [Makerkit RLS Best Practices](https://makerkit.dev/docs/next-supabase/row-level-security) — Production patterns for Next.js + Supabase
- [Leanware Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices) — Security, scaling, maintainability
- [Testing Supabase Magic Login with Playwright](https://www.bekapod.dev/articles/supabase-magic-login-testing-with-playwright/) — Auth testing patterns
- [Login at Supabase via REST API in Playwright](https://mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test) — Session state management
- [@usebasejump/supabase-test-helpers](https://github.com/usebasejump/supabase-test-helpers) — Community pgTAP helpers

### Tertiary (LOW confidence)
- [SupaExplorer Security Report](https://supaexplorer.com/cybersecurity-insight-report-january-2026) — January 2026 trends (proprietary scanner, methodology not fully disclosed)
- [AuditYourApp](https://www.audityour.app/) — Free security scanner (useful tool but no methodology documentation)

---
*Research completed: 2026-01-22*
*Ready for roadmap: yes*
