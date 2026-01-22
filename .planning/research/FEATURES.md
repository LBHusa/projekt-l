# Feature Landscape: Security Audit & Testing Systems

**Domain:** Next.js + Supabase Gamification App Security Audit
**Researched:** 2026-01-22

## Table Stakes

Features users (dev teams) expect from a comprehensive security audit. Missing these = incomplete audit.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **RLS Policy Coverage** | Core Supabase security model; missing RLS = open database | Medium | All tables with user_id must have policies for SELECT/INSERT/UPDATE/DELETE |
| **RLS Policy Testing** | Enable RLS from day one — Don't leave it for later | Medium | Test with multiple user contexts, verify data isolation |
| **Auth Bypass Prevention** | Protected pages must require authentication | Low | Middleware pattern verification, session checks |
| **Hardcoded Credential Scan** | Hardcoded User IDs/API keys = immediate security breach | Low | Grep for UUIDs, API keys, tokens in code |
| **Input Validation (XSS)** | React provides some protection, but Server Actions need explicit validation | Medium | Validate all user inputs with Zod/Valibot before DB operations |
| **CSRF Protection Verification** | Next.js Server Actions have built-in CSRF protection via Origin header check | Low | Verify custom route handlers don't bypass protection |
| **Authentication on API Routes** | API routes are public by default — must explicitly protect | Medium | Check requireAuth pattern on all /api routes |
| **Environment Variable Security** | Never expose service_role keys or secrets to client | Low | Verify NEXT_PUBLIC_ prefix only on safe vars |
| **SQL Injection Prevention** | Supabase client uses parameterized queries (built-in protection) | Low | Verify no raw SQL strings with user input |
| **Error Message Sanitization** | Error messages shouldn't leak sensitive data (user IDs, internal paths) | Low | Audit error handling, use generic messages for production |
| **Session Management Security** | HTTP-only cookies, SameSite attribute for session tokens | Low | Verify Supabase Auth uses secure cookie settings |
| **Data Access Layer (DAL)** | Centralized data access prevents scattered auth checks | High | All database queries go through DAL with auth verification |

## Differentiators

Features that distinguish a **thorough** audit from a **basic** audit.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **E2E Test Coverage (Playwright)** | Catches real-world auth bypass scenarios mock tests miss | High | Test full user journeys with real browser, not just unit tests |
| **Data Flow Validation** | Gamification apps have complex XP flows (Quest → Skill → Faction → Level) | High | End-to-end validation that XP triggers propagate correctly |
| **Database Trigger Testing** | Triggers handle XP calculations; bugs here cause silent failures | High | Test triggers with pgTAP, verify BEFORE vs AFTER semantics |
| **Multi-User Context Testing** | RLS bugs only appear when testing as different users simultaneously | Medium | Create test users, verify User A can't see User B's data |
| **Performance Impact of RLS** | Complex RLS policies with joins can slow queries 100x+ | Medium | Index auth.uid() = user_id columns, test query performance |
| **OAuth/External API Token Security** | Google Calendar, Telegram, Notion integrations need token rotation, mTLS | High | Verify tokens stored encrypted, scopes minimized, expiry handled |
| **Webhook Authentication** | External webhooks (Telegram, Health Import) need API key verification | Medium | Test webhook endpoints reject unauthenticated requests |
| **Rate Limiting** | Prevent abuse of AI endpoints (Claude, Gemini costs) | Medium | Verify rate limits on expensive operations |
| **Audit Logging Coverage** | All XP-generating actions should be in activity_log for debugging | Medium | Verify activity_log captures Quest completion, Habit tracking, Skill updates |
| **TypeScript Type Safety** | Database types auto-generated from Supabase schema prevent runtime errors | Low | Verify database.types.ts is up-to-date, no `any` types in data layer |
| **Content Security Policy (CSP)** | Protects against XSS even if input validation fails | Medium | Verify CSP headers in Next.js middleware |
| **Secrets Manager Integration** | Dedicated secrets manager (HCP Vault, AWS Secrets Manager) vs .env files | High | Rotate keys without deployment, audit access to secrets |
| **Security Advisor/Linting** | Automated detection of missing indexes, RLS misconfigurations | Low | Use Supabase Dashboard Security Advisor, integrate into CI/CD |
| **Load Testing** | Simulate concurrent users to find race conditions in XP calculations | High | Apache JMeter or k6, test 100+ concurrent Habit logs |

## Anti-Features

Features to explicitly **NOT** build. Common mistakes in security audits.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **One-and-Done Audit** | Security isn't a checkbox you tick off once and forget about. It's a continuous process. | Integrate security checks into CI/CD, schedule quarterly re-audits |
| **Tool Overload ("Toolapalooza")** | Tool fatigue occurs where security teams are overwhelmed by noise and alerts, and no one knows what's important. | Choose 3-5 focused tools: Playwright (E2E), pgTAP (DB), Zod (validation), Supabase Advisor (RLS) |
| **Testing Only Happy Paths** | Auth bypass bugs only appear in edge cases (expired session, concurrent requests) | Test negative cases: logged out user, wrong user, missing session |
| **Ignoring External Dependencies** | Many teams never audit the libraries their package uses, making similar mistakes when it comes to software security. | Run `npm audit`, keep dependencies updated, use Dependabot |
| **Service Role Key in Client Code** | service_role bypasses RLS and grants full database access; exposing it = game over | NEVER use service_role in frontend, only in backend API routes/serverless functions |
| **Testing in Production** | Run separate Supabase projects for each environment. Never test migrations directly in production. | Use local Supabase (supabase start), test in staging first |
| **Generic Error Messages as "Security"** | Overly generic errors frustrate users; balance security with UX | Log detailed errors server-side, show helpful (but safe) messages to users |
| **Skipping RLS for "Internal Tools"** | All pages are potentially public; one misconfigured route = data leak | Enable RLS on ALL tables, no exceptions |
| **Relying Solely on Client-Side Validation** | Client validation is UX, not security; attackers bypass it easily | Always validate server-side (Server Actions, API routes) |
| **Testing Without Real Authentication** | Mocking auth.uid() misses real Supabase session handling bugs | Use real Supabase Auth in tests, create test users via REST API |

## Feature Dependencies

```
Security Audit Feature Dependency Tree:

RLS Policies (Foundation)
  ├─> RLS Testing (requires policies to exist)
  │     └─> Multi-User Context Testing (requires test users)
  │
  ├─> Performance Testing (requires policies to benchmark)
  │     └─> Index Optimization (based on slow queries)
  │
  └─> Data Access Layer (enforces policies)

E2E Testing (Foundation)
  ├─> Auth Bypass Testing (requires E2E framework)
  ├─> Data Flow Validation (Quest → XP → Skill → Faction)
  │     └─> Trigger Testing (XP calculations in DB)
  │
  └─> Webhook Testing (external integrations)

Input Validation (Foundation)
  ├─> XSS Prevention (validates before rendering)
  ├─> SQL Injection Prevention (validates before queries)
  └─> Type Safety (TypeScript types from schema)
```

**Critical Path for Projekt L:**
1. Fix hardcoded User IDs (SEC-01, SEC-02) — **blocks all security testing**
2. Implement missing RLS policies (SEC-03) — **blocks multi-user testing**
3. Set up E2E test framework (TEST-01) — **enables all other E2E tests**
4. Validate data flows (FLOW-01, FLOW-02) — **verifies core gamification logic**

## MVP Recommendation

**For Beta-Ready Security Audit, prioritize:**

### P0 - Critical (Must Fix Before Beta)
1. **SEC-01/02**: Remove hardcoded User IDs
2. **SEC-03**: Implement RLS on all 49 tables (already have migration template)
3. **SEC-04**: Verify auth bypass protection (middleware check)
4. **SEC-05/06/07**: Input validation with Zod on Quest/Habit/Profile forms
5. **SEC-08**: Verify API routes have requireAuth
6. **XP-01 to XP-06**: Validate XP system data flows

### P1 - High Priority (Should Fix Before Beta)
7. **TEST-01 to TEST-10**: Playwright E2E tests for all major pages
8. **FLOW-01 to FLOW-04**: End-to-end data flow validation
9. **Trigger Testing**: Validate XP calculation triggers with pgTAP
10. **Multi-User Testing**: Create 3 test users, verify data isolation

### Defer to Post-Beta
- **Load Testing**: Apache JMeter with 100+ concurrent users (unless performance issues discovered)
- **Secrets Manager**: HCP Vault Secrets integration (currently using .env, acceptable for beta)
- **CSP Headers**: Content Security Policy (Next.js default protection sufficient for beta)
- **Rate Limiting**: API rate limits (implement if AI costs spike)

## Complexity Notes

**Why some features are HIGH complexity:**

- **E2E Testing**: Requires Playwright setup, auth state management, test data seeding, cleanup
- **Data Flow Validation**: Gamification has 6 factions, hierarchical skills, XP propagation through multiple tables
- **Trigger Testing**: pgTAP setup, understanding BEFORE vs AFTER triggers, transaction handling
- **DAL Implementation**: Refactoring existing data access, ensuring all queries go through centralized layer
- **External API Security**: OAuth token rotation, encryption at rest, scope minimization, handling token expiry
- **Load Testing**: Infrastructure for simulating users, analyzing results, fixing race conditions

**Medium complexity features are still significant:**
- RLS testing requires understanding Supabase Auth context, creating test users, cleaning up
- Performance testing requires query analysis, understanding EXPLAIN ANALYZE, index creation

## Testing Strategy for Projekt L

Based on the project context, recommended test approach:

### Phase 1: Foundation (Week 1)
- Fix hardcoded User IDs (enables proper auth testing)
- Verify RLS policies work (test with 2 users manually)
- Set up Playwright (enables all E2E tests)

### Phase 2: Coverage (Week 2)
- E2E tests for all 10 major page types
- Input validation on forms (Zod schemas)
- API route authentication verification

### Phase 3: Data Integrity (Week 3)
- End-to-end XP flow testing (Quest → Skill → Faction)
- Trigger testing with pgTAP
- Activity log coverage verification

### Phase 4: Security Hardening (Week 4)
- Multi-user RLS testing (3+ test users)
- Webhook authentication (Health Import, Telegram)
- Error message sanitization
- TypeScript type safety audit

### Phase 5: Polish (Post-Beta)
- Performance testing (RLS query optimization)
- Load testing (concurrent users)
- Security tooling integration (Supabase Advisor in CI/CD)

## Sources

**Next.js + Supabase Security:**
- [Next.js Authentication Complete Guide](https://vladimirsiedykh.com/blog/nextjs-authentication-complete-guide-authjs-supabase)
- [Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices)
- [How to Think About Security in Next.js](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Next.js Data Security Guide](https://nextjs.org/docs/app/guides/data-security)

**RLS Testing:**
- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview)
- [RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Row Level Security Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)

**E2E Testing with Playwright:**
- [Login at Supabase via REST API in Playwright](https://mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test)
- [Testing Supabase Magic Login with Playwright](https://www.bekapod.dev/articles/supabase-magic-login-testing-with-playwright/)
- [End-to-End Testing Auth Flows with Playwright and Next.js](https://testdouble.com/insights/how-to-test-auth-flows-with-playwright-and-next-js)

**Database Testing:**
- [Postgres Triggers - Supabase](https://supabase.com/docs/guides/database/postgres/triggers)
- [Testing Your Database - Supabase](https://supabase.com/docs/guides/database/testing)
- [pgTAP: Unit Testing - Supabase](https://supabase.com/docs/guides/database/extensions/pgtap)

**Security Best Practices:**
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/)
- [Complete Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices)
- [API Security Best Practices 2026](https://qodex.ai/blog/15-api-security-best-practices-to-secure-your-apis-in-2026)

**Anti-Patterns:**
- [Security Anti-Patterns - Designing Secure Software](https://designingsecuresoftware.com/text/ch4-anti-patterns/)
- [Common Security Anti Patterns - RSA Conference](https://www.rsaconference.com/Library/presentation/usa/2024/youre%20doing%20it%20wrong%20common%20security%20antipatterns)
- [NCSC Security Architecture Anti-Patterns](https://www.ncsc.gov.uk/whitepaper/security-architecture-anti-patterns)
