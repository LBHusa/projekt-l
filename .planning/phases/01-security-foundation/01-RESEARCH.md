# Phase 1: Security Foundation - Research

**Researched:** 2026-01-22
**Domain:** Next.js 16.1 + Supabase Security Implementation
**Confidence:** HIGH

## Summary

Phase 1 focuses on eliminating critical security vulnerabilities in the existing codebase. The research identifies that the project already has **partial RLS coverage** (only 8 out of ~49 tables protected), uses `useAuth()` hook for authentication but lacks centralized auth helpers in the data layer, and has hardcoded UUIDs scattered across the codebase (particularly in test/API routes and domain references).

The standard approach for Next.js 16.1 + Supabase security involves:
1. **Defense-in-depth authentication** (middleware + API routes + RLS)
2. **Centralized Data Access Layer** (DAL) with auth helpers
3. **Input validation** using Zod (v4.3.5) on both client and server
4. **XSS prevention** with isomorphic-dompurify + CSP headers
5. **RLS policies with performance indexes** on all user-data tables

**Primary recommendation:** Implement RLS policies first (foundation layer), then add input validation, finally remove hardcoded UUIDs. Use defense-in-depth architecture with auth checks at every layer.

## Standard Stack

### Core Technologies (Already in Use)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.1 | App Router, React framework | Current stable, full App Router support, patched against CVE-2025-29927 |
| Supabase JS | 2.89.0 | Database client | Latest with improved RLS support, type safety |
| Supabase SSR | 0.8.0 | Server-side auth | Required for Next.js App Router auth patterns |
| TypeScript | 5.9.3 | Type safety | Latest stable, compatible with Zod v4 |
| React | 19.2.3 | UI framework | Latest stable, Next.js 16 compatible |

### Security & Validation

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.3.5 | Input validation | **CRITICAL for XSS prevention**. 6.5x faster than v3, built-in validators (email, url, jwt), TypeScript-first, industry standard 2026 |
| isomorphic-dompurify | 2.26.0+ | HTML sanitization | **CRITICAL for XSS prevention**. Works with Server Components (v2.26.0+ fixes SSR issues), supports both jsdom (server) and DOM (client) |
| dompurify | 3.3.1 | Peer dependency | Actively maintained since 2014, protects against XSS, DOM clobbering, prototype pollution |

### Already Installed (No Action Needed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Vitest | 4.0.16 | Unit testing | ✅ Already installed |
| @testing-library/react | 16.3.1 | Component testing | ✅ Already installed |
| jsdom | 27.4.0 | DOM simulation | ✅ Already installed (needed for isomorphic-dompurify) |

### Installation Required

```bash
# Security validation (CRITICAL for SEC-05, SEC-06, SEC-07)
npm install zod@^4.3.5

# XSS sanitization (CRITICAL for SEC-05, SEC-06, SEC-07)
npm install isomorphic-dompurify@^2.26.0
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff | When Alternative Makes Sense |
|------------|-----------|----------|------------------------------|
| Zod | Valibot | Valibot is smaller (<1kb vs 14kb) but Zod has better ecosystem support | Use Valibot only if bundle size is critical |
| isomorphic-dompurify | sanitize-html | sanitize-html is Node-only with custom parsing rules | Use only if you need Node-only sanitization |
| Zod | Yup | Yup has verbose API, poor TypeScript inference | Avoid Yup - Zod is the 2026 standard |

## Architecture Patterns

### Pattern 1: Defense-in-Depth Authentication

**What:** Multi-layered security where authentication is verified at EVERY data access point.

**When to use:** Always in production Next.js + Supabase apps (2026 best practice after CVE-2025-29927).

**Current state:** ✅ Middleware exists, ⚠️ Data layer lacks centralized auth helper, ❌ RLS incomplete.

**Example:**
```typescript
// Layer 1: Middleware (src/middleware.ts) - Token refresh
export async function middleware(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // ← Not getSession()!

  if (!user && !isPublicRoute) return redirect('/auth/login');
  return NextResponse.next();
}

// Layer 2: API Routes (src/app/api/**/route.ts)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... business logic
}

// Layer 3: Data Layer (src/lib/data/*.ts) - NEW PATTERN NEEDED
export async function getHabits(userId?: string): Promise<Habit[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId); // ← Auth helper
  const supabase = createBrowserClient();

  const { data } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', resolvedUserId); // ← Explicit filter

  return data || [];
}

// Layer 4: RLS Policy (supabase/migrations/*.sql)
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  USING (auth.uid() = user_id); -- ← Final defense
```

**Critical Rule:** NEVER trust `getSession()` in server code. Always use `getUser()` which revalidates with Auth server.

### Pattern 2: Centralized Auth Helper (NEEDS IMPLEMENTATION)

**What:** Single source of truth for user ID retrieval, used across all data access functions.

**When to use:** Every database read/write in the application.

**Current state:** ❌ Does not exist - each page uses `useAuth()` directly, data layer doesn't have auth helper.

**Implementation needed:**
```typescript
// src/lib/auth-helper.ts (NEW FILE)
import { createClient as createBrowserClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';

export async function getCurrentUserId(): Promise<string> {
  const supabase = createBrowserClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated - please login');
  }

  return user.id;
}

export async function getUserIdOrCurrent(userId?: string): Promise<string> {
  if (userId) return userId;
  return getCurrentUserId();
}

// Server-side version (for API routes)
export async function getCurrentUserIdServer(): Promise<string> {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated');
  }

  return user.id;
}
```

**Usage in data layer:**
```typescript
// src/lib/data/habits.ts (PATTERN TO APPLY)
import { getUserIdOrCurrent } from '@/lib/auth-helper';

export async function getHabits(userId?: string): Promise<Habit[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId);
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', resolvedUserId);

  if (error) throw error;
  return data || [];
}
```

### Pattern 3: RLS Policies with Performance Indexes

**What:** PostgreSQL Row Level Security enforces database-level authorization with B-tree indexes for performance.

**When to use:** EVERY table with user-specific data.

**Current state:** ⚠️ Only 8 tables have RLS (notification_settings, notification_log, recurring_flows, habit_reminders, etc.). Missing on core tables: quests, habits, skills, user_skills, factions, ai_conversations, journal_entries, etc.

**Standard RLS policy template:**
```sql
-- supabase/migrations/YYYYMMDD_rls_policies.sql

-- Enable RLS on table
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- SELECT policy
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT policy
CREATE POLICY "Users can create own habits"
  ON habits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- CRITICAL: Performance index
CREATE INDEX idx_habits_user_id ON habits USING btree (user_id);
```

**Performance optimization pattern:**
```sql
-- Wrap auth.uid() in SELECT for query optimizer caching
CREATE POLICY "Users can view own habits (optimized)"
  ON habits FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);
```

### Pattern 4: Input Validation with Zod (Client + Server)

**What:** Define validation schemas once, use on both client and server.

**When to use:** Every form, every API endpoint.

**Current state:** ❌ No Zod validation found in codebase.

**Implementation:**
```typescript
// src/lib/validation/habits.ts (NEW FILE)
import { z } from 'zod';

export const habitCreateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .trim()
    .regex(/^[^<>]*$/, 'Name cannot contain < or >'), // XSS prevention
  description: z.string().max(500).optional(),
  icon: z.string().emoji().optional(),
  xp_reward: z.number().min(1).max(1000),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  factions: z.array(z.object({
    faction_id: z.string().uuid(),
    weight: z.number().min(0).max(100),
  })).min(1),
});

export type HabitCreateInput = z.infer<typeof habitCreateSchema>;

// Client: React Hook Form integration
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

function HabitForm() {
  const form = useForm({
    resolver: zodResolver(habitCreateSchema),
  });
}

// Server: API Route validation
export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = habitCreateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.flatten() },
      { status: 400 }
    );
  }

  const input = validation.data; // Type-safe, validated
  // ... create habit
}
```

### Pattern 5: XSS Prevention with DOMPurify

**What:** Sanitize any HTML content before rendering, even after Zod validation.

**When to use:** Rendering user-generated content (Quest descriptions, Habit notes, Profile bios).

**Implementation:**
```typescript
// Server Component or API Route
import DOMPurify from 'isomorphic-dompurify';

export async function createQuest(data: QuestCreateInput) {
  const sanitized = {
    ...data,
    description: data.description
      ? DOMPurify.sanitize(data.description, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
          ALLOWED_ATTR: ['href']
        })
      : undefined
  };

  // Insert to database
}

// Client Component (if rendering HTML)
import DOMPurify from 'isomorphic-dompurify';

function QuestCard({ quest }: { quest: Quest }) {
  return (
    <div
      dangerouslySetInnerHTML={{
        __html: DOMPurify.sanitize(quest.description)
      }}
    />
  );
}
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| User ID from session | Custom session parsing | `auth.uid()` in RLS, `supabase.auth.getUser()` in app | Handles token refresh, expiry, validation |
| Input validation | Custom regex/checks | Zod schemas | Handles TypeScript inference, error messages, edge cases |
| HTML sanitization | Custom string replacement | DOMPurify | Protects against DOM clobbering, prototype pollution, new XSS vectors |
| Auth state management | Redux/Zustand for user | `useAuth()` hook with Supabase | Handles token refresh, SSR, session persistence |
| RLS policy testing | Manual SQL queries | pgTAP with transaction isolation | Transaction rollback, structured assertions, CI integration |
| Security auditing | Manual code review | Automated scripts + Supabase Advisor | Finds missing RLS, exposed service keys, unprotected routes |

**Key insight:** Security primitives (auth, validation, sanitization) have been battle-tested. Custom implementations miss edge cases discovered over years of production use.

## Common Pitfalls

### Pitfall 1: RLS Enabled Without Policies = Complete Lockout

**What goes wrong:** Enabling RLS on a table without creating policies blocks ALL access, even for authenticated users.

**Why it happens:** PostgreSQL RLS is deny-by-default. Developers assume it's a toggle.

**How to avoid:**
- Create policies in SAME migration that enables RLS
- Test with real user sessions immediately
- Use `TO authenticated` clause to specify role
- Create separate policies for SELECT, INSERT, UPDATE, DELETE

**Warning signs:**
- Queries return empty results after enabling RLS
- "permission denied for table" errors
- Frontend shows "no data" despite database having rows

**Relevant to:** SEC-03 (RLS implementation on 49 tables)

---

### Pitfall 2: Middleware-Only Authorization (CVE-2025-29927)

**What goes wrong:** Relying only on middleware allows attackers to bypass security with `x-middleware-subrequest` header.

**Why it happens:** Middleware seems like perfect centralized auth, but Next.js 12.3.4-15.2.2 had bypass vulnerability.

**How to avoid:**
- Implement auth at middleware AND route handlers AND RLS
- Use Next.js 16.1.1+ (already patched)
- Verify authentication in Server Components/Actions
- Add E2E tests simulating header manipulation

**Warning signs:**
- All auth logic in `middleware.ts` only
- No `getUser()` calls in API routes
- No RLS policies backing up middleware

**Relevant to:** SEC-01, SEC-02, SEC-04 (auth bypass prevention)

---

### Pitfall 3: Missing Indexes on RLS Policy Columns

**What goes wrong:** RLS policies without indexes cause 100x+ performance degradation on large tables.

**Why it happens:** `auth.uid() = user_id` evaluates on EVERY row. Without B-tree index, PostgreSQL does sequential scans.

**How to avoid:**
- Create index on EVERY column used in RLS predicates
- Index `user_id` column with BTREE
- Wrap `auth.uid()` in SELECT: `(SELECT auth.uid()) = user_id`
- Use `EXPLAIN ANALYZE` to verify Index Scan (not Seq Scan)

**Warning signs:**
- Queries slow down after enabling RLS
- `EXPLAIN ANALYZE` shows "Seq Scan"
- Database CPU spikes on queries
- Timeout errors on previously fast queries

**Performance note:** Without index, querying 10,000 habits can take 5+ seconds. With index: <50ms.

**Relevant to:** Phase 1 RLS implementation - must create indexes in same migration

---

### Pitfall 4: Hardcoded User IDs in Production Code

**What goes wrong:** Test UUIDs left in code expose one user's data to all users.

**Why it happens:** Copy/paste from development, forgotten before deployment.

**How to avoid:**
- ALWAYS use `getCurrentUserId()` from auth-helper
- Grep codebase for UUID pattern before deployment
- Add CI check for hardcoded UUIDs (exclude tests)
- Use TypeScript strict mode to catch missing auth

**Warning signs:**
- Hardcoded UUIDs in `src/app/**/*.tsx` or `src/lib/data/**/*.ts`
- Default user IDs in API routes (e.g., `|| "00000000-0000-0000-0000-000000000001"`)

**Current codebase findings:**
```bash
# Found hardcoded UUIDs:
src/app/page.tsx: FAMILIE_DOMAIN_ID = '77777777-7777-7777-7777-777777777777'
src/app/api/geist/stats/route.ts: userId || "00000000-0000-0000-0000-000000000001"
src/app/api/contacts/create/route.ts: Multiple domain IDs hardcoded
```

**Relevant to:** SEC-01, SEC-02 (removing hardcoded UUIDs from soziales/karriere)

---

### Pitfall 5: Using `getSession()` in Server Code

**What goes wrong:** `getSession()` reads cookies without validating with Auth server, enabling token replay attacks.

**Why it happens:** Developers don't understand difference between `getSession()` and `getUser()`.

**How to avoid:**
- NEVER use `getSession()` in Server Components, API routes, or Server Actions
- ALWAYS use `getUser()` which revalidates tokens
- Middleware can use `getSession()` ONLY for token refresh
- Add ESLint rule to ban `getSession()` in server code

**Warning signs:**
- `supabase.auth.getSession()` in `src/app/api/**/*.ts`
- `supabase.auth.getSession()` in Server Components

**Current codebase:** Need to audit - `useAuth()` hook may be using `getSession()`.

**Relevant to:** SEC-04, SEC-08 (auth bypass prevention)

---

### Pitfall 6: No Input Validation on Server

**What goes wrong:** Attackers bypass client validation and send malicious payloads directly to API.

**Why it happens:** Developers trust client-side validation (React Hook Form) without server-side checks.

**How to avoid:**
- Validate with Zod in API routes, even if client validates
- Define schema once, use on both client and server
- Server validation is SECURITY, client validation is UX
- Test API routes directly (bypass frontend)

**Warning signs:**
- API routes without `.safeParse()` calls
- Only client-side validation exists
- Direct database insert without validation

**Relevant to:** SEC-05, SEC-06, SEC-07 (XSS prevention in Quest/Habit/Profile)

---

### Pitfall 7: Forgetting RLS Before Production (CVE-2025-48757)

**What goes wrong:** In Jan 2025, 170+ Lovable apps exposed databases because RLS was never enabled. 83% of exposed Supabase databases involve RLS misconfigurations.

**Why it happens:** RLS is optional during development. Teams plan to "add it later," then forget.

**How to avoid:**
- Enable RLS on ALL tables from day one
- Use Supabase Studio RLS warnings
- Add pre-deployment checklist
- Implement CI linter that fails if tables lack RLS
- Make RLS enablement part of table creation migrations

**Warning signs:**
- Yellow warning icons in Supabase Studio
- Can query production data without authentication
- Anon key has full read/write access

**Current codebase:** ⚠️ Only 8 tables have RLS. ~41 tables unprotected.

**Relevant to:** SEC-03 (enabling RLS on 49 tables)

## Finding and Removing Hardcoded User IDs

### Detection Strategy

**1. Grep for UUID pattern:**
```bash
# Find all hardcoded UUIDs in source code
grep -r -E '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' \
  src/app src/lib \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude='*.test.ts' \
  --exclude='database.types.ts'
```

**2. Check for default fallbacks:**
```bash
# Find default user IDs in API routes
grep -r "userId.*||.*\"" src/app/api
```

**3. Inspect pages mentioned in requirements:**
```typescript
// src/app/soziales/page.tsx
// ✅ GOOD: Uses useAuth() hook, no hardcoded IDs
const { userId } = useAuth();
await getContactsByCategory('family'); // Uses userId from session

// src/app/karriere/page.tsx
// ✅ GOOD: Uses useAuth() hook, no hardcoded IDs
const { userId } = useAuth();
await getJobHistory(); // Uses userId from session
```

**Current findings:**
- ✅ soziales/karriere pages use `useAuth()` correctly
- ❌ API routes have hardcoded fallbacks (geist/stats, test routes, contacts/create)
- ❌ Domain IDs hardcoded in contacts API and homepage
- ⚠️ Data layer functions don't explicitly filter by userId (rely on RLS only)

### Remediation Steps

**Phase 1: Audit and document**
1. Run grep commands to find all UUIDs
2. Categorize: legitimate (domain IDs, skill IDs) vs security issues (user IDs)
3. Create list of files to fix

**Phase 2: Create auth-helper.ts**
```typescript
// src/lib/auth-helper.ts
export async function getCurrentUserId(): Promise<string> {
  const supabase = createBrowserClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error('Not authenticated');
  return user.id;
}
```

**Phase 3: Update data layer**
```typescript
// Before (VULNERABLE):
export async function getHabits(): Promise<Habit[]> {
  const supabase = createBrowserClient();
  const { data } = await supabase.from('habits').select('*');
  return data || [];
}

// After (SECURE):
import { getCurrentUserId } from '@/lib/auth-helper';

export async function getHabits(): Promise<Habit[]> {
  const userId = await getCurrentUserId();
  const supabase = createBrowserClient();
  const { data } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId);
  return data || [];
}
```

**Phase 4: Fix API routes**
```typescript
// Before (VULNERABLE):
const userId = searchParams.get('userId') || '00000000-0000-0000-0000-000000000001';

// After (SECURE):
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
const userId = user.id;
```

**Phase 5: Remove domain ID hardcoding**
```typescript
// Before (HARDCODED):
const FAMILIE_DOMAIN_ID = '77777777-7777-7777-7777-777777777777';

// After (DATABASE LOOKUP):
const { data: familieDomain } = await supabase
  .from('life_domains')
  .select('id')
  .eq('name', 'Familie')
  .single();
```

## RLS Migration Strategy (Zero-Downtime)

### Challenge
Enabling RLS on 49 tables with existing data requires careful migration to avoid:
- Downtime (users locked out)
- Data loss
- Performance degradation
- Breaking existing queries

### Strategy: Phased Rollout

**Phase 1: Preparation (No RLS enabled yet)**
1. Create auth-helper.ts
2. Update all data layer functions to use `getCurrentUserId()`
3. Add explicit `.eq('user_id', userId)` filters
4. Test all queries work with explicit filters
5. Create indexes on user_id columns
6. Deploy and verify no regressions

**Phase 2: RLS Enablement (Per-table rollout)**
1. Start with low-traffic tables (notification_settings - already done)
2. Create migration with RLS + policies + indexes in ONE migration
3. Test in staging with real user sessions
4. Monitor query performance with `pg_stat_statements`
5. Rollback if issues detected
6. Repeat for next table

**Phase 3: High-Risk Tables (Last)**
1. Leave critical tables for last (quests, habits, user_skills)
2. Enable RLS during low-traffic hours
3. Have rollback migration ready
4. Monitor error rates and query performance
5. Verify multi-user data isolation

### Example Migration

```sql
-- Migration: 20260122_rls_habits.sql

-- Step 1: Create index FIRST (can run on live system)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_user_id
  ON habits USING btree (user_id);

-- Step 2: Enable RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies (all operations)
CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own habits"
  ON habits FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Step 4: Verify no performance regression
-- Run EXPLAIN ANALYZE on typical queries
```

### Rollback Plan

```sql
-- Rollback migration if issues occur
ALTER TABLE habits DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own habits" ON habits;
DROP POLICY IF EXISTS "Users can create own habits" ON habits;
DROP POLICY IF EXISTS "Users can update own habits" ON habits;
DROP POLICY IF EXISTS "Users can delete own habits" ON habits;
-- Keep index - it helps even without RLS
```

### Testing RLS Policies

**Method 1: Supabase SQL Editor**
```sql
-- Test as specific user
SELECT auth.uid(); -- Shows current user
SELECT * FROM habits; -- Should only show current user's habits
```

**Method 2: E2E Tests (Playwright)**
```typescript
test('User A cannot see User B habits', async ({ page }) => {
  // Login as User A
  await loginAs(page, 'usera@test.com');
  await page.goto('/habits');
  const habitsA = await page.locator('[data-habit-id]').count();

  // Login as User B
  await loginAs(page, 'userb@test.com');
  await page.goto('/habits');
  const habitsB = await page.locator('[data-habit-id]').count();

  // Different users should see different habits
  expect(habitsA).not.toBe(habitsB);
});
```

**Method 3: Direct API Test**
```typescript
// Create two Supabase clients with different users
const userA = createClient(process.env.SUPABASE_URL, userAToken);
const userB = createClient(process.env.SUPABASE_URL, userBToken);

const { data: habitsA } = await userA.from('habits').select('*');
const { data: habitsB } = await userB.from('habits').select('*');

// habitsA and habitsB should have no overlap
const idsA = habitsA.map(h => h.id);
const idsB = habitsB.map(h => h.id);
expect(idsA.some(id => idsB.includes(id))).toBe(false);
```

## Performance Implications

### Index Strategy for RLS

**Tables needing indexes (49 total):**
```sql
-- All user-data tables need user_id index
CREATE INDEX CONCURRENTLY idx_habits_user_id ON habits(user_id);
CREATE INDEX CONCURRENTLY idx_quests_user_id ON quests(user_id);
CREATE INDEX CONCURRENTLY idx_user_skills_user_id ON user_skills(user_id);
CREATE INDEX CONCURRENTLY idx_user_factions_user_id ON user_factions(user_id);
CREATE INDEX CONCURRENTLY idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX CONCURRENTLY idx_ai_conversations_user_id ON ai_conversations(user_id);
-- ... repeat for all 49 tables
```

**Why CONCURRENTLY:**
- Doesn't lock table during creation
- Can run on production without downtime
- Takes longer but safe

### Query Performance Testing

**Before enabling RLS:**
```sql
-- Baseline query performance
EXPLAIN ANALYZE
SELECT * FROM habits
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Expected: "Index Scan using idx_habits_user_id"
-- Cost: ~0.29..8.31 rows=1
```

**After enabling RLS:**
```sql
-- Same query with RLS enabled
EXPLAIN ANALYZE
SELECT * FROM habits
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Should still use index
-- Cost should be similar (within 2x)
```

**Red flags:**
- "Seq Scan" instead of "Index Scan" = missing index
- Cost increases >5x = RLS policy too complex
- `auth.uid()` called per-row = need SELECT wrapper

### Optimization Patterns

**Pattern 1: Cache auth.uid() in policy**
```sql
-- Slow (calls auth.uid() for each row):
USING (auth.uid() = user_id)

-- Fast (calls auth.uid() once):
USING ((SELECT auth.uid()) = user_id)
```

**Pattern 2: Explicit query filters**
```typescript
// Helps query planner even with RLS
const { data } = await supabase
  .from('habits')
  .select('*')
  .eq('user_id', userId); // ← Explicit filter + RLS both apply
```

**Pattern 3: Composite indexes for complex queries**
```sql
-- For queries filtering by user_id + status
CREATE INDEX idx_quests_user_status ON quests(user_id, status);
```

## Testing Strategies

### Unit Tests (Vitest)

**What to test:**
- Auth helper functions return user ID
- Data layer functions throw when unauthenticated
- Validation schemas reject malicious input

```typescript
// src/lib/__tests__/auth-helper.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getCurrentUserId } from '@/lib/auth-helper';

describe('getCurrentUserId', () => {
  it('throws when user not authenticated', async () => {
    vi.mock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null })
        }
      })
    }));

    await expect(getCurrentUserId()).rejects.toThrow('Not authenticated');
  });

  it('returns user ID when authenticated', async () => {
    vi.mock('@/lib/supabase/client', () => ({
      createClient: () => ({
        auth: {
          getUser: async () => ({
            data: { user: { id: 'user-123' } },
            error: null
          })
        }
      })
    }));

    const userId = await getCurrentUserId();
    expect(userId).toBe('user-123');
  });
});
```

### Integration Tests (Vitest + Supabase)

**What to test:**
- RLS policies prevent cross-user data access
- Queries return only user's own data
- Unauthorized queries fail

```typescript
// src/lib/data/__tests__/habits-rls.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Habits RLS', () => {
  let userAClient, userBClient;

  beforeEach(async () => {
    // Create authenticated clients for two users
    userAClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    await userAClient.auth.signInWithPassword({
      email: 'usera@test.com',
      password: 'testpassword'
    });

    // Same for userB...
  });

  it('User A cannot query User B habits', async () => {
    const { data, error } = await userAClient
      .from('habits')
      .select('*');

    // Should only return User A's habits
    expect(data?.every(h => h.user_id === userA.id)).toBe(true);
  });
});
```

### E2E Tests (Playwright) - See STACK.md

E2E testing patterns are documented in `.planning/research/STACK.md` (Playwright section).

**Key E2E tests for Phase 1:**
1. User cannot access soziales page without login
2. User A sees only their own contacts on soziales page
3. User B sees different contacts than User A
4. Quest creation with `<script>` tag fails validation
5. Habit tracking with XSS payload is sanitized
6. Profile edit with malicious input is rejected

## Code Examples

### Complete Input Validation Flow

```typescript
// 1. Define schema (src/lib/validation/quests.ts)
import { z } from 'zod';

export const questCreateSchema = z.object({
  title: z.string()
    .min(1, 'Title required')
    .max(200, 'Title too long')
    .trim()
    .regex(/^[^<>]*$/, 'Cannot contain < or >'),
  description: z.string()
    .max(2000, 'Description too long')
    .trim()
    .optional(),
  xp_reward: z.number()
    .int()
    .min(1, 'XP must be positive')
    .max(10000, 'XP too high'),
  skill_id: z.string().uuid('Invalid skill ID'),
  faction_id: z.string().uuid('Invalid faction ID'),
  due_date: z.string().datetime().optional(),
});

export type QuestCreateInput = z.infer<typeof questCreateSchema>;

// 2. Client-side form validation
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { questCreateSchema } from '@/lib/validation/quests';

function QuestForm() {
  const form = useForm<QuestCreateInput>({
    resolver: zodResolver(questCreateSchema),
    defaultValues: {
      title: '',
      xp_reward: 50,
    }
  });

  const onSubmit = async (data: QuestCreateInput) => {
    const response = await fetch('/api/quests/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      form.setError('root', { message: error.message });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('title')} />
      {form.formState.errors.title && (
        <span className="error">{form.formState.errors.title.message}</span>
      )}
      {/* ... other fields */}
    </form>
  );
}

// 3. Server-side API validation + sanitization
import { NextRequest, NextResponse } from 'next/server';
import { questCreateSchema } from '@/lib/validation/quests';
import { createClient } from '@/lib/supabase/server';
import DOMPurify from 'isomorphic-dompurify';

export async function POST(request: NextRequest) {
  // Step 1: Authenticate
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Step 2: Parse and validate
  const body = await request.json();
  const validation = questCreateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Validation failed',
        details: validation.error.flatten().fieldErrors
      },
      { status: 400 }
    );
  }

  // Step 3: Sanitize HTML
  const sanitized = {
    ...validation.data,
    description: validation.data.description
      ? DOMPurify.sanitize(validation.data.description, {
          ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
          ALLOWED_ATTR: []
        })
      : undefined
  };

  // Step 4: Insert with user_id
  const { data: quest, error: dbError } = await supabase
    .from('quests')
    .insert({
      ...sanitized,
      user_id: user.id, // ← RLS will verify this matches auth.uid()
      status: 'active',
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (dbError) {
    console.error('Database error:', dbError);
    return NextResponse.json(
      { error: 'Failed to create quest' },
      { status: 500 }
    );
  }

  return NextResponse.json({ quest }, { status: 201 });
}
```

### Complete RLS Migration

```sql
-- Migration: 20260122_rls_quests_habits_skills.sql
-- Enables RLS on core gamification tables

BEGIN;

-- ============================================
-- 1. QUESTS TABLE
-- ============================================

-- Create index FIRST (before enabling RLS)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quests_user_id
  ON quests USING btree (user_id);

-- Enable RLS
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own quests"
  ON quests FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own quests"
  ON quests FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own quests"
  ON quests FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own quests"
  ON quests FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- 2. HABITS TABLE
-- ============================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_habits_user_id
  ON habits USING btree (user_id);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits"
  ON habits FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own habits"
  ON habits FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own habits"
  ON habits FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own habits"
  ON habits FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- 3. USER_SKILLS TABLE
-- ============================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_skills_user_id
  ON user_skills USING btree (user_id);

ALTER TABLE user_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own skills"
  ON user_skills FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can create own skills"
  ON user_skills FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own skills"
  ON user_skills FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete own skills"
  ON user_skills FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================
-- 4. USER_FACTIONS TABLE
-- ============================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_factions_user_id
  ON user_factions USING btree (user_id);

ALTER TABLE user_factions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own faction stats"
  ON user_factions FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own faction stats"
  ON user_factions FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Note: INSERT/DELETE handled by triggers, not direct user actions

COMMIT;

-- Verification queries (run after migration)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
-- Expected: Only system tables without RLS
```

## State of the Art

### Next.js 16.1 Security Patterns (2026)

| Old Approach (Pre-2024) | Current Approach (2026) | When Changed | Impact |
|-------------------------|-------------------------|--------------|--------|
| Middleware-only auth | Multi-layer auth (middleware + API + RLS) | CVE-2025-29927 (Jan 2025) | Prevents auth bypass |
| `getSession()` everywhere | `getUser()` in server code | Supabase SSR 0.5.0 (2024) | Prevents token replay |
| Client-only validation | Zod on client + server | Zod v4 (2025) | Prevents XSS/injection |
| Manual RLS testing | pgTAP + Playwright E2E | Supabase Testing Docs (2024) | Catches RLS bugs early |
| Service role in client | Anon key only, service_role server-side | CVE-2025-48757 (Jan 2025) | Prevents RLS bypass |

### Deprecated/Outdated Patterns

**Avoid these patterns (common in older tutorials):**

1. **`getSession()` in Server Components**
   - Why outdated: Doesn't revalidate tokens, enables replay attacks
   - Use instead: `getUser()` which validates with Auth server

2. **Middleware as only auth layer**
   - Why outdated: CVE-2025-29927 bypass with single header
   - Use instead: Defense-in-depth (middleware + API + RLS)

3. **RLS without indexes**
   - Why outdated: Works at small scale, breaks at >1,000 rows
   - Use instead: Index ALL columns in RLS predicates

4. **Generic error messages for all errors**
   - Why outdated: UX suffers, users don't know why auth failed
   - Use instead: Specific messages logged server-side, safe messages to client

5. **Hardcoding production secrets in .env**
   - Why outdated: Secrets Manager is now standard for production
   - Use instead: HCP Vault Secrets or AWS Secrets Manager (post-beta)

## Open Questions

### 1. Service Role Usage in Admin Operations

**What we know:**
- Codebase may need admin operations (seeding, migrations, bulk updates)
- Service role bypasses RLS (intentional)
- Current setup has admin.ts client

**What's unclear:**
- Which operations actually require service role?
- Are there any admin endpoints exposed to frontend?
- Should admin operations be in separate API routes with IP allowlist?

**Recommendation:**
- Audit all uses of admin client
- Move admin operations to separate `/api/admin/*` routes
- Add middleware IP allowlist for admin routes
- Document which operations need service role and why

---

### 2. Multi-Faction XP Attribution Security

**What we know:**
- Habits can contribute XP to multiple factions with weights
- habit_factions table maps habits to factions
- XP calculation happens in triggers

**What's unclear:**
- Do habit_factions RLS policies prevent users from creating invalid mappings?
- Can user A modify user B's habit faction weights?
- Are XP triggers properly scoped to user data?

**Recommendation:**
- Add RLS policies to habit_factions table
- Verify triggers only update current user's faction XP
- Test cross-user XP attribution in E2E tests

---

### 3. Shared/Public Data Tables

**What we know:**
- Some tables are reference data (skills, factions, life_domains)
- These should be readable by all users but not writable

**What's unclear:**
- Which tables are truly public vs user-specific?
- Should public tables have SELECT-only RLS?
- Do we need admin-only INSERT/UPDATE policies for reference data?

**Recommendation:**
- Create inventory of public vs private tables
- Public tables: RLS with SELECT for authenticated, INSERT/UPDATE for service_role only
- Document which tables are reference data in migration comments

---

### 4. Real-Time Subscriptions Security

**What we know:**
- Supabase Realtime can subscribe to table changes
- RLS applies to subscriptions but needs explicit filters

**What's unclear:**
- Does codebase use Realtime subscriptions?
- Are subscription filters scoped to user_id?
- Could users subscribe to other users' data changes?

**Recommendation:**
- Audit for `.subscribe()` calls in codebase
- Add `.eq('user_id', userId)` filters to all subscriptions
- Test subscriptions don't leak cross-user data

## Sources

### Primary (HIGH confidence)

**RLS & Supabase Security:**
- [Supabase RLS Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) - Authoritative RLS patterns
- [RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - Index optimization, auth.uid() caching
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod) - Pre-launch security checklist
- [Supabase Security Guide](https://supabase.com/docs/guides/security) - Service role, anon key, RLS enforcement

**Next.js Authentication:**
- [Next.js Authentication Guide](https://nextjs.org/docs/app/guides/authentication) - Official patterns for App Router
- [Supabase Auth with Next.js App Router](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) - Official integration guide
- [Next.js Security: Server Components & Actions](https://nextjs.org/blog/security-nextjs-server-components-actions) - Official security guidance

**Input Validation:**
- [Zod Official Docs](https://zod.dev/) - v4 features, built-in validators
- [DOMPurify Official](https://dompurify.com/) - XSS protection mechanisms
- [isomorphic-dompurify GitHub](https://github.com/kkomelin/isomorphic-dompurify) - Next.js compatibility

**CVE References:**
- [CVE-2025-29927: Next.js Middleware Authorization Bypass](https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass) - Technical analysis
- [GitHub Advisory GHSA-f82v-jwr5-mffw](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) - Official Next.js advisory
- [CVE-2025-48757: Supabase RLS Misconfiguration](https://deepstrike.io/blog/hacking-thousands-of-misconfigured-supabase-instances-at-scale) - 170+ apps exposed

### Secondary (MEDIUM confidence)

**Best Practices:**
- [Best Practices for Supabase](https://www.leanware.co/insights/supabase-best-practices) - Security, scaling, maintainability
- [Next.js Security Checklist 2026](https://blog.arcjet.com/next-js-security-checklist/) - Comprehensive checklist
- [Complete Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) - Authentication patterns

**Testing:**
- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview) - Official testing guide
- [Supabase pgTAP Testing](https://supabase.com/docs/guides/database/extensions/pgtap) - Database testing
- [Testing Auth Flows with Playwright](https://testdouble.com/insights/how-to-test-auth-flows-with-playwright-and-next-js) - Auth state management

### Tertiary (LOW confidence - for exploration only)

- Community blog posts on Supabase + Next.js patterns
- Stack Overflow discussions on RLS performance
- YouTube tutorials (verify against official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm, official documentation
- RLS patterns: HIGH - Official Supabase documentation, production examples
- Performance optimization: HIGH - Official Supabase troubleshooting guide
- Hardcoded UUID detection: HIGH - Direct codebase analysis
- Input validation patterns: HIGH - Official Zod v4 documentation
- Migration strategy: MEDIUM - Based on best practices, not project-specific testing

**Research date:** 2026-01-22
**Valid until:** ~60 days (March 2026) - Security landscape stable but monitor CVEs

**Key assumptions:**
- Next.js 16.1.1 has CVE-2025-29927 patch (verified in releases)
- Supabase project is on latest stable version (2.89.0 verified in package.json)
- Database has ~49 tables (estimated from migration files)
- Current auth uses Supabase Auth (verified in code)

**Codebase-specific findings:**
- ✅ soziales/karriere pages use `useAuth()` correctly
- ❌ 8/49 tables have RLS (notification_settings, habit_reminders, etc.)
- ❌ Hardcoded UUIDs in API routes (test endpoints, contacts/create)
- ⚠️ No centralized auth-helper.ts
- ⚠️ No Zod validation found
- ✅ Middleware exists and uses correct auth patterns
