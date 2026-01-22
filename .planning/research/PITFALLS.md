# Pitfalls Research

**Domain:** Next.js + Supabase Security Audit & Testing
**Researched:** 2026-01-22
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: RLS Enabled But No Policies = Complete Lockout

**What goes wrong:**
Enabling Row Level Security (RLS) on a table without creating any policies immediately blocks ALL access to that table, even for authenticated users. The database becomes inaccessible, breaking the entire application.

**Why it happens:**
Developers assume RLS works like a toggle — "turn it on, data is protected." They don't realize that PostgreSQL's RLS model is deny-by-default. Without explicit ALLOW policies, nobody can access the data, including legitimate users.

**How to avoid:**
- ALWAYS create policies in the SAME migration that enables RLS
- Test with real user sessions immediately after enabling RLS
- Use Supabase's policy templates as starting points
- Create separate policies for SELECT, INSERT, UPDATE, DELETE operations
- Include `TO authenticated` clause to specify which roles the policy applies to

**Warning signs:**
- Queries suddenly return empty results after enabling RLS
- "permission denied for table" errors in logs
- Frontend shows "no data" despite data existing in database
- Even admin users cannot access tables

**Phase to address:**
Phase 1 (RLS Implementation) — Before enabling RLS on any production table

---

### Pitfall 2: Using user_metadata for Authorization Decisions

**What goes wrong:**
Implementing RLS policies that check `auth.jwt() ->> 'user_metadata'` for authorization. Since users can modify their own metadata via `supabase.auth.update()`, attackers can escalate privileges by changing their metadata to gain unauthorized access.

**Why it happens:**
Developers confuse `user_metadata` (user-editable) with `app_metadata` (admin-only). The names are similar, and official docs don't always clarify which is secure for authorization.

**How to avoid:**
- NEVER use `raw_user_metadata` in RLS policies
- Use `raw_app_meta_data` instead (cannot be modified by users)
- Store authorization data (roles, permissions, team memberships) in dedicated database tables
- Verify authorization data server-side, not from JWT claims alone
- If using JWT claims, only trust `app_metadata` fields

**Warning signs:**
- RLS policies check `auth.jwt() ->> 'user_metadata'`
- Authorization logic relies on data users can self-update
- No server-side validation of role claims
- Users can "promote" themselves by editing profile

**Phase to address:**
Phase 1 (RLS Implementation) — During policy creation, validate all JWT claim usage

---

### Pitfall 3: Middleware-Only Authorization (CVE-2025-29927)

**What goes wrong:**
Implementing authentication/authorization checks ONLY in Next.js middleware allows attackers to bypass security by sending requests with `x-middleware-subrequest` header, completely circumventing access controls.

**Why it happens:**
Next.js middleware seems like the perfect place for auth checks — runs on every request, centralized logic. Developers assume middleware is a security boundary, but CVE-2025-29927 proved it can be bypassed with a single HTTP header.

**How to avoid:**
- Implement multi-layered authorization: middleware AND route handlers AND RLS
- Never rely on middleware alone for security decisions
- Filter/reject external requests containing `x-middleware-subrequest` header
- Upgrade to Next.js 12.3.5+, 13.5.9+, 14.2.25+, or 15.2.3+
- Validate authentication at the data layer (RLS policies) as last line of defense
- Add E2E tests that simulate header manipulation attacks

**Warning signs:**
- All auth logic is in `middleware.ts` with no API route checks
- Protected routes don't re-verify auth in Server Components
- No RLS policies backing up middleware checks
- Using affected Next.js versions (11.1.4-12.3.4, 13.0.0-13.5.8, 14.0-14.2.24, 15.0-15.2.2)

**Phase to address:**
Phase 1 (Security Audit) — Verify middleware is NOT the only auth layer

---

### Pitfall 4: Missing Indexes on RLS Policy Columns

**What goes wrong:**
RLS policies without indexes cause performance degradation of 100x+ on large tables. Queries that took milliseconds now take minutes, causing timeouts and degraded user experience.

**Why it happens:**
Developers write policies like `auth.uid() = user_id` without realizing this evaluates on EVERY row. Without a B-tree index on `user_id`, the database performs sequential scans on entire tables.

**How to avoid:**
- Create B-tree indexes on ALL columns used in RLS predicates
- Index foreign keys used in policies (e.g., `team_id`, `user_id`)
- Wrap function calls in SELECT to enable query optimizer caching: `(SELECT auth.uid()) = user_id`
- Use `EXPLAIN ANALYZE` to measure query performance with RLS enabled
- Add explicit filters in queries: `.eq('user_id', userId)` alongside RLS
- Include `TO authenticated` in policies to avoid unauthenticated RLS evaluation

**Warning signs:**
- Queries slow down dramatically after enabling RLS
- `EXPLAIN ANALYZE` shows "Seq Scan" instead of "Index Scan"
- Database CPU spikes when querying large tables
- Timeout errors on previously fast queries
- Function execution counts match row counts (function called per-row)

**Phase to address:**
Phase 1 (RLS Implementation) — Create indexes in same migration as RLS policies

---

### Pitfall 5: Stale JWT Authorization Data

**What goes wrong:**
User permissions change in the database (e.g., removed from team), but their JWT still contains old `app_metadata`. For up to 1 hour (default JWT expiry), the user retains access they should no longer have.

**Why it happens:**
JWTs are stateless and immutable. Authorization data embedded in tokens at login time doesn't update when database changes. Developers assume `auth.jwt()` reflects current database state.

**How to avoid:**
- Don't rely solely on JWT claims for critical authorization
- Query authorization data from database tables, not JWT
- If using JWT claims, force token refresh on permission changes
- Implement server-side permission checks that query current state
- Consider shorter JWT expiry times for high-security scenarios
- Use RLS policies that query current database state, not just JWT

**Warning signs:**
- Users retain access after being removed from teams
- Permission changes don't take effect until re-login
- RLS policies only check `auth.jwt()` without database lookups
- No token refresh mechanism on permission changes

**Phase to address:**
Phase 1 (RLS Implementation) — Design policies that query current state, not stale JWT

---

### Pitfall 6: service_role Key Exposed to Client

**What goes wrong:**
Using `service_role` key in client-side code completely bypasses ALL RLS policies, granting full database access to anyone who can read your JavaScript bundle. Attackers can read, modify, or delete any data.

**Why it happens:**
Developers want to bypass RLS during development or for "admin" features and mistakenly use `service_role` in frontend code. They don't realize this key is visible in browser DevTools.

**How to avoid:**
- NEVER use `service_role` key in client-side code
- Only use `anon` key for public/client access
- Keep `service_role` server-side only (API routes, server components)
- Use environment variable validation to prevent accidental client exposure
- Set up separate Supabase clients for server vs. client contexts
- Implement admin features via API routes that use `service_role` server-side

**Warning signs:**
- `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` without `NEXT_PUBLIC_` prefix but used in client components
- Direct Supabase client creation in Client Components with service role
- "Unauthorized" errors disappear when switching keys (sign of bypassed RLS)

**Phase to address:**
Phase 1 (Security Audit) — Scan codebase for service_role usage in client code

---

### Pitfall 7: Incomplete Endpoint Testing for RLS

**What goes wrong:**
RLS policies are tested with standard queries but fail to account for PostgREST's advanced operators (`gt`, `lt`, `neq`, `not.in`). Attackers use these operators to bypass restrictions and access unauthorized data.

**Why it happens:**
Testing focuses on happy paths (SELECT with eq filter) without considering how comparison operators behave with RLS. Policies that work for equality checks may leak data with range queries.

**How to avoid:**
- Test EVERY PostgREST operator: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `like`, `ilike`, `in`, `not.in`
- Try UUID-based queries with `gt` operator to return "all records after this UUID"
- Test with unauthenticated requests (no auth token)
- Test with authenticated users who shouldn't have access
- Use Supabase SQL Editor to run queries as specific users
- Create automated RLS tests that try bypass techniques

**Warning signs:**
- RLS policies only tested with `SELECT * WHERE id = X`
- No tests for range queries, pattern matching, or negation
- Policies work in development but leak data with creative queries
- E2E tests don't attempt adversarial queries

**Phase to address:**
Phase 2 (E2E Testing) — Include RLS bypass attempts in security test suite

---

### Pitfall 8: Forgetting to Enable RLS Before Production (CVE-2025-48757)

**What goes wrong:**
In January 2025, 170+ applications built with Lovable had exposed databases because RLS was never enabled. All data was publicly accessible via the `anon` key. 83% of exposed Supabase databases involve RLS misconfigurations.

**Why it happens:**
RLS is optional during development. Developers prototype without RLS, planning to "add it later," then forget before launch. There's no forcing function that requires RLS before production deployment.

**How to avoid:**
- Enable RLS on ALL tables from day one of development
- Use Supabase Studio's "RLS not enabled" warnings
- Add pre-deployment checklist: "All tables have RLS enabled?"
- Implement database linter that fails CI if tables lack RLS
- Use Supabase's security advisors to detect unprotected tables
- Make RLS enablement part of table creation migrations

**Warning signs:**
- Supabase Studio shows yellow warning icons on tables
- Security advisors report tables without RLS
- Can query production data without authentication
- Anon key has full read/write access

**Phase to address:**
Phase 1 (RLS Implementation) — Enable RLS on all existing tables immediately

---

### Pitfall 9: Over-Investing in E2E Tests (Slow, Flaky Test Suites)

**What goes wrong:**
Teams write E2E tests for every UI interaction, creating slow, flaky test suites that take 30+ minutes to run. Tests fail randomly due to timing issues, CSS selector changes, or race conditions. Development velocity plummets.

**Why it happens:**
"Best practice" guides recommend comprehensive E2E coverage. Developers assume more tests = better quality, without considering maintenance cost. They don't distinguish between critical paths (auth, payments) and low-risk features (button hover states).

**How to avoid:**
- Focus E2E tests on critical user flows only (auth, core features, data integrity)
- Use unit/integration tests for business logic
- Keep E2E suite under 10 minutes total runtime
- Test security boundaries with E2E (auth bypass, RLS enforcement)
- Avoid testing every permutation of UI states
- Use visual regression tests for UI, not E2E for every pixel
- Limit E2E to "happy path + critical error paths"

**Warning signs:**
- E2E suite takes 30+ minutes to run
- Tests fail intermittently without code changes
- Developers skip running tests locally due to slowness
- More time fixing flaky tests than actual bugs
- Every UI change breaks multiple E2E tests

**Phase to address:**
Phase 2 (E2E Testing) — Define critical paths BEFORE writing tests

---

### Pitfall 10: Not Testing with Real User Sessions

**What goes wrong:**
RLS policies work perfectly with hardcoded test UUIDs but fail in production because `auth.uid()` returns `null` for unauthenticated requests or behaves differently than test mocks.

**Why it happens:**
Testing uses fake user IDs or service role bypasses. Developers never actually log in as a real user and run queries through the client SDK. RLS policies assume auth context that doesn't exist in real usage.

**How to avoid:**
- Test RLS with Supabase's `auth.signIn()` in E2E tests
- Use Supabase SQL Editor's "Execute as user" feature
- Create test accounts with different permission levels
- Never test RLS with service_role client
- Verify `auth.uid()` is NOT NULL in policy logic
- Test both authenticated and unauthenticated scenarios

**Warning signs:**
- RLS tests pass but users report permission errors
- Policies check `auth.uid() = user_id` without NULL handling
- Tests use hardcoded UUIDs instead of real auth sessions
- SQL editor queries run as postgres user, not test users

**Phase to address:**
Phase 2 (E2E Testing) — All RLS tests must use real Supabase auth sessions

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping RLS during prototyping | Faster development, no auth friction | Forgotten before launch, leads to data breaches (CVE-2025-48757) | Never — enable from day one |
| Single permissive RLS policy instead of specific ones | Less code, "works for now" | Performance issues, hard to debug, security gaps | Never — write specific policies |
| Testing only happy paths | Faster test writing | Security bypasses go undetected until exploited | Only for non-critical features |
| Using service_role for admin features in client | Easier than proper RBAC | Complete security bypass if exposed | Never — always use API routes |
| Hardcoding user IDs for testing | Quick feature validation | Security vulnerability in production | Only in local dev, MUST remove before commit |
| Skipping indexes on RLS columns | Faster migration writing | 100x+ performance degradation on growth | Never — index in same migration |
| Relying on middleware alone for auth | Centralized auth logic | CVE-2025-29927 bypass vulnerability | Never — use multi-layer auth |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Supabase Auth | Checking `session` existence without verifying `session.user.id` matches RLS `auth.uid()` | Always validate both session AND RLS context in protected routes |
| Supabase Storage | Forgetting RLS applies to storage buckets too | Create storage RLS policies for upload/download, not just database |
| Next.js Server Actions | Assuming Server Actions are secure by default | Validate auth in EVERY Server Action, don't rely on middleware |
| API Route Handlers | Missing `requireAuth()` check in some routes | Create auth middleware that MUST be called in all protected routes |
| Supabase Realtime | Not filtering subscriptions with RLS-aware filters | Add `.eq('user_id', userId)` filters on subscriptions to prevent data leakage |
| MFA Integration | Assuming MFA is automatically enforced everywhere | Manually add `auth.jwt() ->> 'aal'` checks to RLS policies for MFA enforcement |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| No indexes on RLS policy columns | Queries timeout, 100x slower after RLS enabled | Create B-tree index on all RLS predicate columns | >1,000 rows per table |
| Per-row function evaluation in RLS | CPU spikes, slow queries, function called 100K+ times | Wrap functions in SELECT: `(SELECT auth.uid()) = user_id` | >10,000 rows per query |
| Complex joins in RLS policies | Sequential scans on every query | Reverse join direction, add indexes on foreign keys | >50,000 rows |
| Relying on RLS for filtering instead of queries | Unnecessary RLS evaluation overhead | Add explicit `.eq('user_id', userId)` filters in queries | >100,000 rows |
| Unauthenticated RLS evaluation | RLS runs even for public requests | Add `TO authenticated` clause to policies | High traffic (>1K req/min) |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Using `user_metadata` in RLS policies | Privilege escalation — users can edit their own metadata | Only use `app_metadata` or database tables for authorization |
| Missing MFA enforcement in RLS | Users bypass 2FA with direct API calls | Add `auth.jwt() ->> 'aal' = 'aal2'` to critical RLS policies |
| Exposing service_role key in client bundle | Complete RLS bypass, full database access | Use `anon` key for client, `service_role` only in API routes |
| Error messages leaking data structure | Attackers learn table schemas, column names | Sanitize error messages, log details server-side only |
| Forgetting RLS on "internal" tables | Admin tables exposed to public | Enable RLS on ALL tables, even staff-only ones |
| Not testing RLS with operator bypass techniques | Data leakage via `gt`, `lt`, `not.in` operators | Test all PostgREST operators in security test suite |
| Relying on Next.js middleware alone (CVE-2025-29927) | Complete auth bypass with single HTTP header | Multi-layer auth: middleware + API routes + RLS |
| Hardcoded user IDs in production code | Direct user impersonation, cross-account access | Always use `auth.uid()` or session data, never hardcode |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Generic "permission denied" errors | Users don't know why they can't access data | Return helpful messages: "You need to join a team first" |
| No loading states during RLS queries | Users see blank screens, assume app is broken | Add skeleton loaders for protected data fetches |
| RLS policy changes require re-login | Users lose access mid-session, forced logout | Design policies that check current database state, not just JWT |
| Enabling RLS breaks existing features | Features stop working, data disappears | Test ALL user flows after enabling RLS, before deploying |
| No fallback for missing RLS data | Empty states with no explanation | Show helpful empty states: "No quests yet — create one!" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **RLS Enabled:** Often missing actual policies — verify SELECT, INSERT, UPDATE, DELETE policies exist
- [ ] **Auth Protected Routes:** Often missing API route verification — verify Server Actions have auth checks
- [ ] **E2E Tests Passing:** Often missing security bypass tests — verify adversarial queries tested
- [ ] **Indexes Created:** Often missing RLS column indexes — verify `EXPLAIN ANALYZE` shows Index Scan
- [ ] **Input Validation:** Often missing server-side validation — verify client validation duplicated server-side
- [ ] **Error Handling:** Often exposes internal errors — verify production errors are sanitized
- [ ] **MFA Integration:** Often missing per-endpoint enforcement — verify RLS policies check AAL level
- [ ] **Service Role Usage:** Often accidentally exposed — verify only used in API routes/Server Components
- [ ] **JWT Refresh Logic:** Often missing permission change handling — verify stale tokens invalidated
- [ ] **Storage RLS:** Often forgotten after database RLS — verify bucket policies created

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| RLS enabled without policies (lockout) | LOW | 1. Disable RLS temporarily 2. Create proper policies 3. Re-enable RLS 4. Test immediately |
| Service role exposed in client | HIGH | 1. Rotate service_role key immediately 2. Audit all API access logs 3. Check for unauthorized data changes 4. Move to server-side only |
| Hardcoded user IDs in production | MEDIUM | 1. Identify all occurrences 2. Replace with `auth.uid()` 3. Deploy hotfix 4. Audit affected users |
| Missing indexes (slow queries) | LOW | 1. Create indexes with `CREATE INDEX CONCURRENTLY` 2. Monitor query performance 3. No downtime needed |
| Middleware-only auth (CVE-2025-29927) | MEDIUM | 1. Upgrade Next.js to patched version 2. Add RLS policies 3. Add API route auth checks 4. Test bypass attempts |
| user_metadata in RLS policies | HIGH | 1. Migrate to app_metadata or database tables 2. Create new policies 3. Force all users to re-login 4. Audit previous access |
| Stale JWT permissions | MEDIUM | 1. Implement token refresh on permission change 2. Shorten JWT expiry 3. Add database permission checks |
| E2E test suite too slow/flaky | MEDIUM | 1. Delete non-critical tests 2. Keep only critical paths 3. Move business logic to unit tests 4. Optimize selectors |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| RLS enabled without policies | Phase 1: RLS Implementation | All tables have SELECT/INSERT/UPDATE/DELETE policies |
| user_metadata in RLS policies | Phase 1: RLS Implementation | No policies check `raw_user_metadata` |
| Middleware-only auth | Phase 1: Security Audit | Auth checks in middleware AND API routes AND RLS |
| Missing indexes on RLS columns | Phase 1: RLS Implementation | EXPLAIN ANALYZE shows Index Scan, not Seq Scan |
| service_role exposed to client | Phase 1: Security Audit | Grep codebase, no service_role in client components |
| Hardcoded user IDs | Phase 1: Security Audit | No hardcoded UUIDs, all use auth.uid() |
| Incomplete endpoint testing | Phase 2: E2E Testing | Tests include gt/lt/neq operator bypass attempts |
| Not testing with real sessions | Phase 2: E2E Testing | All RLS tests use actual Supabase auth.signIn() |
| Over-investing in E2E tests | Phase 2: E2E Testing | E2E suite runs in <10 minutes, focuses on critical paths |
| Stale JWT permissions | Phase 1: RLS Implementation | Policies query database state, not just JWT |
| Forgetting RLS before production | Phase 1: RLS Implementation | Pre-deployment checklist requires all tables have RLS |

## Sources

- [Best Practices for Supabase | Security, Scaling & Maintainability](https://www.leanware.co/insights/supabase-best-practices)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Docs | Troubleshooting | RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Row-Level Recklessness: Testing Supabase Security | Precursor Security Ltd](https://www.precursorsecurity.com/security-blog/row-level-recklessness-testing-supabase-security)
- [CVE-2025-29927: Next.js Middleware Authorization Bypass - Technical Analysis](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass)
- [Authorization Bypass in Next.js Middleware (GitHub Advisory)](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw)
- [Hacking Thousands of Misconfigured Supabase Instances](https://deepstrike.io/blog/hacking-thousands-of-misconfigured-supabase-instances-at-scale)
- [Supabase MCP can leak your entire SQL database | General Analysis](https://www.generalanalysis.com/blog/supabase-mcp-blog)
- [Testing Next.js Applications: A Complete Guide](https://trillionclues.medium.com/testing-next-js-applications-a-complete-guide-to-catching-bugs-before-qa-does-a1db8d1a0a3b)
- [Security Considerations When Building a Next.js Application](https://medium.com/@farihatulmaria/security-considerations-when-building-a-next-js-application-and-mitigating-common-security-risks-c9d551fcacdb)

---
*Pitfalls research for: Next.js + Supabase Security Audit & Testing*
*Researched: 2026-01-22*
