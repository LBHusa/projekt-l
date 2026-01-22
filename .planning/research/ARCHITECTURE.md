# Architecture Research: Security Audits & E2E Testing Integration

**Domain:** Next.js 15 + Supabase Full-Stack App with Gamification System
**Researched:** 2026-01-22
**Confidence:** HIGH

## Standard Architecture for Next.js + Supabase Security & Testing

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Pages   │  │Components│  │  Hooks   │  │   UI     │    │
│  │ (App Dir)│  │          │  │          │  │ Elements │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
├───────┴─────────────┴─────────────┴─────────────┴───────────┤
│                   AUTHENTICATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │   Middleware (Token Refresh + Route Protection)     │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌──────────────┐              ┌──────────────┐            │
│  │ Client Auth  │              │ Server Auth  │            │
│  │ (Browser)    │              │ (SSR/API)    │            │
│  └──────────────┘              └──────────────┘            │
├─────────────────────────────────────────────────────────────┤
│                     DATA ACCESS LAYER (DAL)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │  Habits  │  │  Quests  │  │  Skills  │  │ Factions │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │           │
│       └─────────────┴─────────────┴─────────────┘           │
│                          │                                  │
│                   ┌──────┴───────┐                          │
│                   │ Auth Helper  │                          │
│                   └──────┬───────┘                          │
├──────────────────────────┴───────────────────────────────────┤
│                      API LAYER                               │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │    API Routes (Server Actions + REST Endpoints)      │   │
│  │    • Server-side Auth (getUser())                    │   │
│  │    • Input Validation (Zod)                          │   │
│  │    • Business Logic                                  │   │
│  └──────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    DATABASE LAYER                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Supabase PostgreSQL + Auth                   │   │
│  │         • RLS Policies (Row-Level Security)          │   │
│  │         • Indexes (Performance)                      │   │
│  │         • Triggers (Data Integrity)                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

      ┌─────────────────────────────────────────────────┐
      │          TESTING & AUDIT LAYER                  │
      ├─────────────────────────────────────────────────┤
      │  ┌──────────────┐         ┌──────────────┐     │
      │  │ Playwright   │         │ Vitest Unit  │     │
      │  │ E2E Tests    │         │ Tests        │     │
      │  └──────────────┘         └──────────────┘     │
      │  ┌──────────────────────────────────────────┐  │
      │  │   Security Audit Components              │  │
      │  │   • RLS Policy Validator                 │  │
      │  │   • Auth Bypass Scanner                  │  │
      │  │   • Input Validation Checker             │  │
      │  └──────────────────────────────────────────┘  │
      └─────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Middleware** | Token refresh, route protection (public vs protected) | `middleware.ts` with `@supabase/ssr` + `getUser()` |
| **Data Access Layer** | All database queries, enforce userId filtering | `src/lib/data/` with barrel exports |
| **Auth Helper** | Centralize session retrieval, provide userId | `auth-helper.ts` with `getCurrentUserId()` |
| **API Routes** | Server-side auth, input validation, business logic | `/api` routes using `createClient()` from `server.ts` |
| **RLS Policies** | Database-level authorization (who sees what rows) | SQL policies in `supabase/migrations/` |
| **Playwright Tests** | E2E browser testing, critical user flows | `e2e/` directory with `.spec.ts` files |
| **Vitest Tests** | Unit/integration testing, XP calculations, helpers | `src/__tests__/` directory |

## Recommended Project Structure for Security & Testing

```
projekt-l/
├── src/
│   ├── app/
│   │   ├── api/                    # API Routes with server-side auth
│   │   │   ├── habits/
│   │   │   │   ├── create/route.ts     # POST with getUser() auth
│   │   │   │   └── list/route.ts       # GET with getUser() auth
│   │   │   └── [other-features]/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   ├── signup/
│   │   │   └── logout/
│   │   └── [feature-pages]/
│   ├── lib/
│   │   ├── data/                   # Data Access Layer (DAL)
│   │   │   ├── index.ts            # Barrel exports
│   │   │   ├── habits.ts           # Uses auth-helper
│   │   │   ├── quests.ts
│   │   │   ├── skills.ts
│   │   │   └── factions.ts
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser client
│   │   │   ├── server.ts           # Server client (SSR, API)
│   │   │   ├── middleware.ts       # Middleware client
│   │   │   └── admin.ts            # Service role (RLS bypass)
│   │   ├── auth-helper.ts          # getCurrentUserId(), isAuthenticated()
│   │   └── validation/             # Zod schemas (NEW)
│   │       ├── habits.ts           # Habit input schemas
│   │       ├── quests.ts           # Quest input schemas
│   │       └── common.ts           # Shared validation rules
│   ├── middleware.ts               # Route protection, token refresh
│   └── __tests__/                  # Unit/Integration tests
│       ├── xp.test.ts
│       ├── habits-integration.test.ts
│       └── factions.test.ts
├── e2e/                             # Playwright E2E tests (NEW)
│   ├── auth.setup.ts               # Shared auth setup
│   ├── fixtures/                   # Test fixtures
│   │   ├── users.ts                # Test user data
│   │   └── habits.ts               # Test habit data
│   ├── features/                   # Feature-based tests
│   │   ├── auth.spec.ts            # Login, signup, logout
│   │   ├── quests.spec.ts          # Create, complete, fail quests
│   │   ├── habits.spec.ts          # Track habits, verify streaks
│   │   ├── skills.spec.ts          # Display skills, XP bars
│   │   ├── factions.spec.ts        # Faction XP, level up
│   │   └── profile.spec.ts         # Profile edit, settings
│   ├── security/                   # Security-focused tests (NEW)
│   │   ├── auth-bypass.spec.ts     # Protected route access
│   │   ├── xss-prevention.spec.ts  # XSS input attempts
│   │   └── hardcoded-ids.spec.ts   # Verify no hardcoded UIDs
│   ├── flows/                      # Critical data flows (NEW)
│   │   ├── quest-to-xp.spec.ts     # Quest → XP → Skill → Faction
│   │   └── habit-to-xp.spec.ts     # Habit → XP → Faction
│   └── helpers/
│       ├── auth.ts                 # Login helper with storageState
│       └── db.ts                   # Test DB cleanup
├── supabase/
│   ├── migrations/
│   │   └── [timestamp]_*.sql       # Schema + RLS policies
│   ├── seed.sql                    # Test data (optional)
│   └── config.toml
├── security/                        # Security audit scripts (NEW)
│   ├── rls-validator.ts            # Verify RLS on all tables
│   ├── api-auth-scanner.ts         # Check all API routes have auth
│   └── input-validation-checker.ts # Verify Zod schemas exist
├── playwright.config.ts            # Playwright configuration
├── vitest.config.ts                # Vitest configuration
└── .env.example                    # Environment variables template
```

### Structure Rationale

- **`src/lib/data/`**: Centralized Data Access Layer enforces consistent auth patterns and makes security audits easier
- **`src/lib/validation/`**: Zod schemas in separate files enable reuse across client/server and testability
- **`e2e/features/`**: Feature-based organization mirrors user workflows, easier to maintain
- **`e2e/security/`**: Dedicated security tests ensure critical vulnerabilities are caught in CI
- **`e2e/flows/`**: End-to-end data flow tests validate the most complex system behaviors (Quest → XP → Faction)
- **`security/`**: Automated audit scripts run in CI to catch new vulnerabilities before deployment

## Architectural Patterns

### Pattern 1: Defense-in-Depth Authentication

**What:** Multi-layered security where authentication is verified at EVERY data access point, not just middleware.

**When to use:** Always in production Next.js + Supabase apps (2026 best practice after CVE-2025-29927)

**Trade-offs:**
- **Pros:** Maximum security, prevents auth bypass even if middleware is compromised
- **Cons:** More code repetition, slightly more server requests

**Example:**
```typescript
// ❌ WRONG: Only middleware protection (vulnerable to bypass)
// middleware.ts
export async function middleware(request: NextRequest) {
  const user = await supabase.auth.getUser();
  if (!user) return redirect('/login');
  return NextResponse.next();
}

// ✅ CORRECT: Defense-in-Depth
// middleware.ts - First layer
export async function middleware(request: NextRequest) {
  const user = await supabase.auth.getUser(); // Token refresh
  if (!user && !isPublicRoute) return redirect('/login');
  return NextResponse.next();
}

// src/app/api/habits/create/route.ts - Second layer
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser(); // ← CRITICAL

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... business logic
}

// src/lib/data/habits.ts - Third layer (optional but recommended)
export async function getHabits(userId?: string): Promise<Habit[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId); // ← Auth check
  const supabase = createBrowserClient();

  const { data } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', resolvedUserId); // ← Fourth layer: RLS policy

  return data || [];
}
```

**Critical Rule:** NEVER trust `supabase.auth.getSession()` in server code. Always use `getUser()` which revalidates with the Auth server.

### Pattern 2: Data Access Layer (DAL) with Centralized Auth

**What:** All database queries go through `src/lib/data/` functions that enforce userId filtering and use centralized auth helper.

**When to use:** Every database read/write in the application

**Trade-offs:**
- **Pros:** Single source of truth for data access, easy to audit, prevents auth mistakes
- **Cons:** Requires discipline to not bypass DAL with direct Supabase calls

**Example:**
```typescript
// src/lib/auth-helper.ts
export async function getCurrentUserId(): Promise<string> {
  const supabase = createBrowserClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Not authenticated - please login');
  }

  return user.id;
}

// src/lib/data/habits.ts
import { getUserIdOrCurrent } from '@/lib/auth-helper';

export async function getHabits(userId?: string): Promise<Habit[]> {
  const resolvedUserId = await getUserIdOrCurrent(userId); // ← Centralized
  const supabase = createBrowserClient();

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', resolvedUserId); // ← Always filter by userId

  if (error) throw error;
  return data || [];
}

// Components/Pages use DAL, never direct Supabase
import { getHabits } from '@/lib/data/habits';

function HabitsPage() {
  const [habits, setHabits] = useState([]);

  useEffect(() => {
    getHabits().then(setHabits); // ← Clean, auth handled in DAL
  }, []);
}
```

### Pattern 3: RLS Policies as Final Defense

**What:** PostgreSQL Row Level Security policies enforce database-level authorization, even if application code fails.

**When to use:** EVERY table that stores user-specific data

**Trade-offs:**
- **Pros:** Bulletproof security, catches bypasses in app code, compliance-friendly
- **Cons:** Requires careful indexing for performance, debugging can be harder

**Example:**
```sql
-- supabase/migrations/20260122_rls_policies.sql

-- Enable RLS on habits table
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own habits
CREATE POLICY "Users can view own habits"
  ON habits
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can only insert their own habits
CREATE POLICY "Users can create own habits"
  ON habits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own habits
CREATE POLICY "Users can update own habits"
  ON habits
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own habits
CREATE POLICY "Users can delete own habits"
  ON habits
  FOR DELETE
  USING (auth.uid() = user_id);

-- CRITICAL: Index for performance (RLS uses auth.uid() on every query)
CREATE INDEX idx_habits_user_id ON habits USING btree (user_id);
```

**Performance Note:** Without the index on `user_id`, RLS policies can slow queries by 100x+ on large tables.

### Pattern 4: Input Validation with Zod (Client + Server)

**What:** Define validation schemas once with Zod, use on both client (React Hook Form) and server (API routes).

**When to use:** Every form, every API endpoint

**Trade-offs:**
- **Pros:** DRY principle, type safety, prevents XSS/injection, better UX
- **Cons:** Adds dependency, requires learning Zod API

**Example:**
```typescript
// src/lib/validation/habits.ts
import { z } from 'zod';

export const habitCreateSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .trim()
    .regex(/^[^<>]*$/, 'Name cannot contain < or >'), // XSS prevention
  description: z.string()
    .max(500, 'Description too long')
    .optional(),
  icon: z.string().emoji().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  xpReward: z.number().min(1).max(1000),
  frequency: z.enum(['daily', 'weekly', 'custom']),
  factions: z.array(z.object({
    factionId: z.string().uuid(),
    weight: z.number().min(0).max(100),
  })).min(1, 'At least one faction required'),
});

export type HabitCreateInput = z.infer<typeof habitCreateSchema>;

// Client: src/components/habits/HabitForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { habitCreateSchema } from '@/lib/validation/habits';

function HabitForm() {
  const form = useForm({
    resolver: zodResolver(habitCreateSchema), // ← Client validation
  });

  const onSubmit = async (data: HabitCreateInput) => {
    await fetch('/api/habits/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  };
}

// Server: src/app/api/habits/create/route.ts
import { habitCreateSchema } from '@/lib/validation/habits';

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Server-side validation (NEVER trust client)
  const validation = habitCreateSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.flatten() },
      { status: 400 }
    );
  }

  const input = validation.data; // ← Type-safe, validated

  // ... create habit
}
```

### Pattern 5: Playwright Auth Setup with Storage State

**What:** Authenticate once in global setup, save session to file, reuse across all tests.

**When to use:** E2E tests that require authentication (most tests)

**Trade-offs:**
- **Pros:** Fast tests (no repeated login), realistic session handling
- **Cons:** Requires careful cleanup between test runs

**Example:**
```typescript
// e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Login via Supabase Auth
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpassword123');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/');

  // Verify auth by checking for user-specific element
  await expect(page.locator('text=Welcome back')).toBeVisible();

  // Save signed-in state to file
  await page.context().storageState({ path: authFile });
});

// e2e/features/habits.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' }); // ← Reuse auth

test('create habit', async ({ page }) => {
  await page.goto('/habits');
  // Already authenticated! No login needed
  await page.click('button:has-text("New Habit")');
  // ... test habit creation
});

// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'], // ← Run setup first
    },
  ],
});
```

## Data Flow

### Authentication Flow

```
[User Login]
    ↓
[Client] → POST /auth/login → [Supabase Auth API]
    ↓                              ↓
[Supabase Auth] ← Session Token + Cookies
    ↓
[Middleware] → On every request:
    │          1. Refresh token if expired
    │          2. Check route protection
    │          3. Redirect if unauthorized
    ↓
[Page/Component] → Render (user available)
```

### Protected API Request Flow

```
[User Action] (e.g., "Create Habit")
    ↓
[Client Component] → validate with Zod → POST /api/habits/create
    ↓                                          ↓
                                    [API Route Handler]
                                          ↓
                          1. Auth: supabase.auth.getUser()
                          2. Validate: habitCreateSchema.safeParse()
                          3. Business Logic: Calculate XP
                          4. DB Insert: adminClient.from('habits').insert()
                                          ↓
                          [PostgreSQL + RLS Policy Check]
                                          ↓
                          Verify: auth.uid() = user_id
                                          ↓
                          [Return Success/Error]
                                          ↓
[Client] ← Update UI (optimistic or refetch)
```

### Critical XP Flow (Quest → XP → Skill → Faction)

```
[User Completes Quest]
    ↓
[QuestCard] → onClick handler → POST /api/quests/[id]/complete
    ↓
[API Route]
    ↓
1. Auth: getUser()
2. Validate: Quest belongs to user
3. Update: quest.status = 'completed'
4. Calculate: XP from quest.xp_reward
5. DB Transaction:
    ├─ Update quest (completed_at)
    ├─ Log activity_log (quest_completed, +XP)
    ├─ Update skill XP (primary skill)
    │   └─ Trigger: Recalculate skill level
    ├─ Update faction XP (skill's faction)
    │   └─ Trigger: Recalculate faction level
    └─ Check achievements (level up milestones)
    ↓
[Response] → { success, newXP, levelUp, achievements }
    ↓
[Client] → Optimistic UI update
         → Confetti if level up
         → Refetch faction stats
```

**This flow MUST be tested end-to-end** in `e2e/flows/quest-to-xp.spec.ts` because it involves:
- Multiple tables (quests, skills, factions, activity_log, achievements)
- Complex calculations (XP thresholds, level formulas)
- Triggers and transactions

### State Management Flow

```
[Component Mount]
    ↓
useEffect(() => {
  fetchData(); // ← Calls DAL function (getHabits, getSkills, etc.)
})
    ↓
[DAL Function] → getCurrentUserId() → Supabase Query + RLS
    ↓
[Component State] ← setData(result)
    ↓
[Render with Data]

[User Action] (e.g., track habit)
    ↓
[Event Handler] → POST /api/habits/track
    ↓
[API Success]
    ↓
[Optimistic Update OR Refetch]
    ↓
[Re-render]
```

## Security Integration Points

### 1. Middleware Layer

**Integration:** `src/middleware.ts`

**Responsibilities:**
- Refresh expired auth tokens (critical for Supabase sessions)
- Redirect unauthenticated users from protected routes
- Allow public routes (login, signup, webhooks)

**Security Checks:**
- ✅ Uses `getUser()` not `getSession()` (prevents token replay attacks)
- ✅ Public routes whitelist (explicit, not implicit)
- ✅ Redirects preserve query params (UX + security)

**Common Pitfall:** Not excluding `/api/` routes properly can cause CORS issues with webhooks.

### 2. API Route Layer

**Integration:** `src/app/api/**/route.ts`

**Responsibilities:**
- Authenticate every request with `supabase.auth.getUser()`
- Validate input with Zod schemas
- Use admin client only for RLS-safe operations
- Return appropriate HTTP status codes (401, 403, 400, 500)

**Security Checks:**
- ✅ Every POST/PUT/DELETE has auth check
- ✅ Input validation before DB operations
- ✅ Error messages don't leak sensitive data
- ✅ Admin client only used when necessary (e.g., service-to-service calls)

**Example Audit:**
```typescript
// security/api-auth-scanner.ts
import { glob } from 'glob';
import fs from 'fs';

const routeFiles = await glob('src/app/api/**/route.ts');
const missingAuth = [];

for (const file of routeFiles) {
  const content = fs.readFileSync(file, 'utf-8');

  // Skip public webhooks
  if (file.includes('webhook')) continue;

  // Check for auth pattern
  if (!content.includes('supabase.auth.getUser()')) {
    missingAuth.push(file);
  }
}

if (missingAuth.length > 0) {
  console.error('❌ Routes missing auth check:', missingAuth);
  process.exit(1);
}

console.log('✅ All API routes have auth checks');
```

### 3. Database Layer (RLS Policies)

**Integration:** `supabase/migrations/*_rls_policies.sql`

**Responsibilities:**
- Enable RLS on ALL user-data tables
- Define SELECT, INSERT, UPDATE, DELETE policies
- Index columns used in policies (`user_id`, `auth.uid()`)
- Audit policies regularly

**Security Checks:**
- ✅ RLS enabled on every table
- ✅ Policies enforce `auth.uid() = user_id`
- ✅ No overly permissive policies (e.g., `true` for SELECT)
- ✅ Service role bypasses RLS (by design) but only used server-side

**Example RLS Audit:**
```sql
-- security/rls-validator.sql
-- Run this query to find tables WITHOUT RLS enabled

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('schema_migrations', 'supabase_functions');

-- Expected: 0 rows (all tables should have rowsecurity = true)
```

**Automation:**
```typescript
// security/rls-validator.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for admin queries
);

const { data, error } = await supabase.rpc('check_rls_enabled');

if (error) throw error;

const tablesWithoutRLS = data.filter((t: any) => !t.rowsecurity);

if (tablesWithoutRLS.length > 0) {
  console.error('❌ Tables without RLS:', tablesWithoutRLS);
  process.exit(1);
}

console.log('✅ All tables have RLS enabled');
```

### 4. Data Access Layer (DAL)

**Integration:** `src/lib/data/*.ts`

**Responsibilities:**
- Centralize all database queries
- Enforce userId filtering on every query
- Use `auth-helper.ts` for consistent auth
- Log errors without exposing sensitive data

**Security Checks:**
- ✅ Every query filters by `user_id`
- ✅ No raw SQL (use query builder)
- ✅ Errors are caught and sanitized
- ✅ No hardcoded user IDs

**Example Audit:**
```bash
# security/check-hardcoded-ids.sh
#!/bin/bash

# Find hardcoded UUIDs in code (common security mistake)
grep -r -E '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' \
  src/app src/lib \
  --exclude-dir=node_modules \
  --exclude-dir=.next \
  --exclude='*.test.ts' \
  --exclude='database.types.ts'

# Exit with error if any found
if [ $? -eq 0 ]; then
  echo "❌ Found hardcoded UUIDs in code!"
  exit 1
fi

echo "✅ No hardcoded UUIDs found"
```

### 5. Input Validation Layer

**Integration:** `src/lib/validation/*.ts` + `src/app/api/**/route.ts`

**Responsibilities:**
- Define Zod schemas for all inputs
- Validate on both client (UX) and server (security)
- Sanitize strings to prevent XSS
- Enforce business rules (max XP, valid enums, etc.)

**Security Checks:**
- ✅ Regex patterns prevent XSS (`/^[^<>]*$/`)
- ✅ Max lengths prevent DoS
- ✅ Enum validation prevents invalid states
- ✅ Server ALWAYS validates (never trust client)

**Example:**
```typescript
// src/lib/validation/common.ts
import { z } from 'zod';

// Reusable validators
export const safeString = z.string()
  .trim()
  .regex(/^[^<>]*$/, 'Cannot contain < or >'); // Prevent basic XSS

export const uuid = z.string().uuid();

export const xpAmount = z.number()
  .int()
  .min(0)
  .max(10000); // Prevent unrealistic XP

// src/lib/validation/quests.ts
import { safeString, uuid, xpAmount } from './common';

export const questCreateSchema = z.object({
  title: safeString.min(1).max(100),
  description: safeString.max(500).optional(),
  xpReward: xpAmount,
  skillId: uuid,
  factionId: uuid,
});
```

## E2E Testing Integration Points

### 1. Playwright Configuration

**Integration:** `playwright.config.ts`

**Key Settings:**
- **testDir:** `'./e2e'` (separate from unit tests)
- **baseURL:** `'http://localhost:3000'` (dev server)
- **timeout:** `30000` (30s for complex flows)
- **retries:** `1` on CI, `0` locally (flaky test detection)
- **workers:** `4` (parallel execution)
- **use.storageState:** `'e2e/.auth/user.json'` (authenticated tests)

**Example:**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : 4,

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json', // ← Authenticated by default
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
});
```

### 2. Test Organization

**Integration:** `e2e/` directory structure

**Categories:**
1. **features/** - Feature workflows (create quest, track habit, etc.)
2. **security/** - Security tests (auth bypass, XSS, hardcoded IDs)
3. **flows/** - Critical data flows (Quest → XP → Faction)
4. **helpers/** - Shared utilities (auth, DB cleanup, assertions)

**Example Test:**
```typescript
// e2e/features/quests.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'e2e/.auth/user.json' });

test.describe('Quest Management', () => {
  test('create and complete quest', async ({ page }) => {
    await page.goto('/quests');

    // Create quest
    await page.click('button:has-text("New Quest")');
    await page.fill('input[name="title"]', 'Test Quest');
    await page.fill('textarea[name="description"]', 'Complete E2E test');
    await page.selectOption('select[name="skillId"]', 'skill-uuid-here');
    await page.fill('input[name="xpReward"]', '50');
    await page.click('button[type="submit"]');

    // Verify creation
    await expect(page.locator('text=Test Quest')).toBeVisible();

    // Complete quest
    await page.click('button:has-text("Complete"):near(text=Test Quest)');

    // Verify XP update
    await expect(page.locator('.xp-notification')).toContainText('+50 XP');

    // Verify faction XP increased
    await page.goto('/factions');
    const factionXP = await page.locator('.faction-xp').first().textContent();
    expect(parseInt(factionXP!)).toBeGreaterThan(0);
  });
});
```

### 3. Security Test Patterns

**Integration:** `e2e/security/*.spec.ts`

**Focus Areas:**
- Auth bypass attempts (access protected routes without login)
- XSS prevention (inject `<script>` tags in inputs)
- Hardcoded UID detection (navigate to pages, check for specific UIDs in HTML)

**Example:**
```typescript
// e2e/security/auth-bypass.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: undefined }); // ← NOT authenticated

test('protected routes redirect to login', async ({ page }) => {
  const protectedRoutes = [
    '/',
    '/quests',
    '/habits',
    '/skills',
    '/factions/koerper',
    '/profile',
  ];

  for (const route of protectedRoutes) {
    await page.goto(route);
    await page.waitForURL('/auth/login');
    expect(page.url()).toContain('/auth/login');
  }
});

// e2e/security/xss-prevention.spec.ts
test('XSS in quest title is sanitized', async ({ page }) => {
  await page.goto('/quests');
  await page.click('button:has-text("New Quest")');

  const xssPayload = '<script>alert("XSS")</script>';
  await page.fill('input[name="title"]', xssPayload);
  await page.click('button[type="submit"]');

  // Should see validation error OR sanitized text (NOT script execution)
  const errorVisible = await page.locator('text=Cannot contain < or >').isVisible();
  const scriptExecuted = await page.evaluate(() => window.document.title.includes('XSS'));

  expect(errorVisible || !scriptExecuted).toBeTruthy();
});

// e2e/security/hardcoded-ids.spec.ts
test('no hardcoded user IDs in HTML', async ({ page }) => {
  const pagesToCheck = ['/soziales', '/karriere', '/profile'];

  for (const route of pagesToCheck) {
    await page.goto(route);
    const html = await page.content();

    // Check for UUID pattern (common hardcoded ID format)
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const matches = html.match(uuidRegex);

    // Filter out legitimate UUIDs (e.g., in data attributes, valid IDs)
    const suspiciousUUIDs = matches?.filter(uuid => {
      // Allow UUIDs in data-id, data-key, etc.
      return !html.includes(`data-id="${uuid}"`) &&
             !html.includes(`id="${uuid}"`);
    });

    expect(suspiciousUUIDs).toEqual([]);
  }
});
```

### 4. Data Flow Testing

**Integration:** `e2e/flows/*.spec.ts`

**Purpose:** Test critical multi-step, multi-table flows that can't be easily unit-tested.

**Example:**
```typescript
// e2e/flows/quest-to-xp.spec.ts
import { test, expect } from '@playwright/test';

test('Quest completion updates XP across all layers', async ({ page }) => {
  await page.goto('/');

  // 1. Get initial faction XP
  const initialFactionXP = await page.locator('[data-faction="koerper"] .xp-value').textContent();
  const initialXP = parseInt(initialFactionXP!);

  // 2. Create quest for Körper faction
  await page.goto('/quests');
  await page.click('button:has-text("New Quest")');
  await page.fill('input[name="title"]', 'E2E XP Flow Test');
  await page.selectOption('select[name="factionId"]', 'koerper');
  await page.fill('input[name="xpReward"]', '100');
  await page.click('button[type="submit"]');

  // 3. Complete quest
  await page.click('button:has-text("Complete"):near(text=E2E XP Flow Test)');

  // 4. Verify activity log
  await page.goto('/');
  const activityLog = page.locator('.activity-log').first();
  await expect(activityLog).toContainText('E2E XP Flow Test');
  await expect(activityLog).toContainText('+100 XP');

  // 5. Verify faction XP increased
  await page.goto('/factions/koerper');
  const newFactionXP = await page.locator('.faction-xp-total').textContent();
  const newXP = parseInt(newFactionXP!);

  expect(newXP).toBe(initialXP + 100);

  // 6. Verify skill XP increased (if quest was linked to skill)
  await page.goto('/skills');
  // ... verify skill XP

  // 7. Check for level up notification (if applicable)
  const levelUpNotification = await page.locator('.level-up-notification').isVisible();
  // Assert based on expected level threshold
});
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **0-1k users** | Current architecture is fine. Single PostgreSQL instance, RLS policies, Next.js on Vercel/single server. |
| **1k-10k users** | Add database connection pooling (Supavisor), enable pg_stat_statements for query monitoring, optimize RLS policies with better indexes. |
| **10k-100k users** | Consider read replicas for Supabase, implement caching layer (Redis) for frequently accessed data (faction stats, skill trees), move complex XP calculations to database functions/triggers. |
| **100k+ users** | Evaluate splitting into microservices (Auth service, XP calculation service), use message queues for async operations (level up notifications), consider CDN for static assets, implement rate limiting on API routes. |

### Scaling Priorities

1. **First bottleneck: Database queries without indexes**
   - **Symptom:** Slow page loads, high database CPU
   - **Fix:** Add indexes on `user_id`, `faction_id`, `skill_id`, `created_at` columns used in WHERE clauses
   - **Tool:** `pg_stat_statements` to find slow queries
   - **Prevention:** Include index creation in every migration that adds filterable columns

2. **Second bottleneck: RLS policy performance**
   - **Symptom:** Queries take >500ms even with indexes
   - **Fix:** Simplify policies (avoid subqueries), use JWT claims for role-based checks, consider caching user roles
   - **Tool:** `EXPLAIN ANALYZE` on slow queries
   - **Prevention:** Benchmark RLS policies with realistic data sizes (10k+ rows per user)

3. **Third bottleneck: XP calculation complexity**
   - **Symptom:** Quest completion takes >2s, locks database rows
   - **Fix:** Move calculations to PostgreSQL functions, use database triggers for automatic updates, batch XP updates
   - **Tool:** Database transaction monitoring
   - **Prevention:** Write XP calculations as pure functions, test with race conditions

## Anti-Patterns

### Anti-Pattern 1: Middleware-Only Authentication

**What people do:** Rely solely on middleware to protect routes, skip auth checks in API routes.

**Why it's wrong:** Middleware can be bypassed (e.g., CVE-2025-29927), leading to unauthorized data access.

**Do this instead:** Defense-in-depth (see Pattern 1) - auth at middleware, API routes, and RLS.

**Detection:**
```bash
# Scan for API routes without auth
grep -L "supabase.auth.getUser()" src/app/api/**/route.ts
```

### Anti-Pattern 2: Using `getSession()` in Server Code

**What people do:** Call `supabase.auth.getSession()` in API routes or Server Components.

**Why it's wrong:** `getSession()` reads from cookies without validating with Auth server, enabling token replay attacks.

**Do this instead:** Always use `supabase.auth.getUser()` which revalidates tokens.

**Detection:**
```bash
# Find dangerous getSession() usage
grep -r "getSession()" src/app/api src/app/**/page.tsx
```

### Anti-Pattern 3: Hardcoded User IDs

**What people do:** Copy/paste user IDs during development, forget to remove before production.

**Why it's wrong:** Exposes data from one user to all users (critical security bug).

**Do this instead:** Always use `getCurrentUserId()` from auth-helper.

**Detection:** See `e2e/security/hardcoded-ids.spec.ts` and `security/check-hardcoded-ids.sh`.

### Anti-Pattern 4: No Input Validation on Server

**What people do:** Only validate on client with React Hook Form, trust client data in API.

**Why it's wrong:** Attackers bypass client validation and send malicious payloads directly to API.

**Do this instead:** Always validate with Zod in API routes, even if client validates.

**Detection:**
```typescript
// security/input-validation-checker.ts
const apiRoutes = await glob('src/app/api/**/route.ts');
const missingValidation = [];

for (const file of apiRoutes) {
  const content = fs.readFileSync(file, 'utf-8');

  // Check for Zod validation
  if (content.includes('POST') && !content.includes('.safeParse(')) {
    missingValidation.push(file);
  }
}

if (missingValidation.length > 0) {
  console.error('❌ API routes missing input validation:', missingValidation);
  process.exit(1);
}
```

### Anti-Pattern 5: Service Role in Client Code

**What people do:** Use `SUPABASE_SERVICE_ROLE_KEY` in browser to bypass RLS "for convenience".

**Why it's wrong:** Service role key exposed = complete database access for attackers.

**Do this instead:** Only use service role in server-side code (`admin.ts`), never in client.

**Detection:**
```bash
# Check for service role in client code
grep -r "SUPABASE_SERVICE_ROLE_KEY" src/components src/app/**/page.tsx src/lib
```

### Anti-Pattern 6: Missing RLS Policies

**What people do:** Create table, forget to enable RLS and add policies.

**Why it's wrong:** Anyone with anon key can read/write ALL data in that table.

**Do this instead:** Enable RLS in same migration as table creation, add policies immediately.

**Detection:** See `security/rls-validator.sql` and `security/rls-validator.ts`.

### Anti-Pattern 7: Optimistic UI Without Rollback

**What people do:** Update UI immediately on user action, ignore API errors.

**Why it's wrong:** UI shows incorrect state if API fails (e.g., XP added but DB transaction failed).

**Do this instead:** Optimistic update + error handling that reverts on failure.

**Example:**
```typescript
// ❌ WRONG: No error handling
const trackHabit = async (habitId: string) => {
  setHabits(prev => prev.map(h =>
    h.id === habitId ? { ...h, current_streak: h.current_streak + 1 } : h
  )); // Optimistic update

  await fetch(`/api/habits/${habitId}/track`, { method: 'POST' });
  // What if this fails? UI is now wrong!
};

// ✅ CORRECT: Rollback on error
const trackHabit = async (habitId: string) => {
  const previousHabits = habits; // Save previous state

  // Optimistic update
  setHabits(prev => prev.map(h =>
    h.id === habitId ? { ...h, current_streak: h.current_streak + 1 } : h
  ));

  try {
    const res = await fetch(`/api/habits/${habitId}/track`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to track habit');
  } catch (error) {
    // Rollback on error
    setHabits(previousHabits);
    toast.error('Failed to track habit. Please try again.');
  }
};
```

## Implementation Build Order

Based on dependencies between audit/testing components, recommended implementation order:

### Phase 1: Foundation (Week 1)
1. **RLS Policies** - Enable RLS on all tables, add basic policies
2. **Input Validation** - Create Zod schemas for existing forms
3. **Auth Helper Consolidation** - Ensure all DAL uses `auth-helper.ts`

**Why this order:** RLS is the final defense layer and should be in place before testing. Input validation prevents XSS during development. Auth helper ensures consistent auth before we audit it.

### Phase 2: API Security (Week 1-2)
4. **API Route Auth Audit** - Add `getUser()` to all routes
5. **Error Sanitization** - Remove sensitive data from error messages
6. **Service Role Cleanup** - Move admin client usage to server-only

**Why this order:** API routes are the main attack surface. Securing them early prevents vulnerabilities from persisting.

### Phase 3: Testing Infrastructure (Week 2)
7. **Playwright Setup** - Install, configure, create `auth.setup.ts`
8. **Test Fixtures** - Create test users, seed data scripts
9. **Helper Functions** - Auth helpers, DB cleanup, custom assertions

**Why this order:** Testing infrastructure must be solid before writing tests. Fixtures and helpers make tests maintainable.

### Phase 4: E2E Tests (Week 2-3)
10. **Auth Tests** - Login, signup, logout, session persistence
11. **Feature Tests** - Critical workflows (quests, habits, skills)
12. **Security Tests** - Auth bypass, XSS, hardcoded IDs

**Why this order:** Auth tests validate testing setup. Feature tests catch regressions. Security tests catch vulnerabilities.

### Phase 5: Flow Tests (Week 3)
13. **Quest → XP Flow** - End-to-end quest completion to faction XP
14. **Habit → XP Flow** - Habit tracking to faction XP
15. **Level Up Flow** - Trigger level up, verify notifications

**Why this order:** Flow tests depend on feature tests passing. They're complex and need stable foundation.

### Phase 6: Automation (Week 3-4)
16. **Security Audit Scripts** - RLS validator, API scanner, hardcoded ID checker
17. **CI Integration** - Add tests to GitHub Actions
18. **Monitoring** - Error tracking, performance monitoring

**Why this order:** Automation ensures security checks run on every commit. CI catches regressions before production.

### Dependencies Diagram

```
┌─────────────────┐
│  RLS Policies   │ ← Foundation (everything depends on this)
└────────┬────────┘
         │
    ┌────┴─────────────────────────┐
    │                              │
┌───▼──────────────┐    ┌──────────▼─────────┐
│ Input Validation │    │ Auth Helper        │
└───┬──────────────┘    └──────────┬─────────┘
    │                              │
    └────────┬─────────────────────┘
             │
      ┌──────▼──────────┐
      │ API Route Auth  │
      └──────┬──────────┘
             │
      ┌──────▼──────────────┐
      │ Playwright Setup    │
      └──────┬──────────────┘
             │
      ┌──────▼──────────────┐
      │ Feature Tests       │
      └──────┬──────────────┘
             │
      ┌──────▼──────────────┐
      │ Security Tests      │
      └──────┬──────────────┘
             │
      ┌──────▼──────────────┐
      │ Flow Tests          │
      └──────┬──────────────┘
             │
      ┌──────▼──────────────┐
      │ Automation Scripts  │
      └─────────────────────┘
```

## Sources

**RLS & Supabase Security:**
- [Best Practices for Supabase | Security, Scaling & Maintainability](https://www.leanware.co/insights/supabase-best-practices)
- [RLS Policies - Next.js Supabase](https://makerkit.dev/docs/next-supabase/row-level-security)
- [Supabase Row Level Security Explained With Real Examples](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c)
- [Row Level Security | Supabase Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [RLS Performance and Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Production Checklist | Supabase Docs](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase Security | Supabase Docs](https://supabase.com/docs/guides/security)

**Next.js Authentication Patterns:**
- [Next.js in 2026: Mastering Middleware, Server Actions, and Edge Functions](https://medium.com/@Amanda0/next-js-in-2026-mastering-middleware-server-actions-and-edge-functions-for-full-stack-d4ce24d61eea)
- [App Router: Adding Authentication | Next.js](https://nextjs.org/learn/dashboard-app/adding-authentication)
- [Complete Authentication Guide for Next.js App Router in 2025](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router)
- [Guides: Authentication | Next.js](https://nextjs.org/docs/app/guides/authentication)
- [Protecting Routes in Next.js with Supabase Authentication](https://medium.com/@chaitanya99j/protecting-routes-in-next-js-with-supabase-authentication-741634cc5019)
- [How to Implement Authentication Middleware with Next.js and Supabase](https://supalaunch.com/blog/nextjs-middleware-supabase-auth)
- [Supabase Auth with the Next.js App Router](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

**Input Validation with Zod:**
- [Handling Forms in Next.js with next/form, Server Actions, useActionState, and Zod Validation](https://medium.com/@sorayacantos/handling-forms-in-next-js-with-next-form-server-actions-useactionstate-and-zod-validation-15f9932b0a9e)
- [Type safe Server Actions in your Next.js project | next-safe-action](https://next-safe-action.dev/)
- [How to Use React Hook Form + Zod with Next.js Server Actions](https://medium.com/@ctrlaltmonique/how-to-use-react-hook-form-zod-with-next-js-server-actions-437aaca3d72d)

**Playwright E2E Testing:**
- [Testing: Playwright | Next.js](https://nextjs.org/docs/app/guides/testing/playwright)
- [Unit and E2E Tests with Vitest & Playwright](https://strapi.io/blog/nextjs-testing-guide-unit-and-e2e-tests-with-vitest-and-playwright)
- [End-to-End Testing Your Next.js App with Playwright](https://medium.com/@natanael280198/end-to-end-testing-your-next-js-app-with-playwright-75ada18447ac)
- [Guide to Playwright end-to-end testing in 2026](https://www.deviqa.com/blog/guide-to-playwright-end-to-end-testing-in-2025/)
- [Integrating Playwright with Next.js — The Complete Guide](https://dev.to/mehakb7/integrating-playwright-with-nextjs-the-complete-guide-34io)

**Playwright + Supabase Authentication:**
- [Login at Supabase via REST API in Playwright E2E Test](https://mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test)
- [How to test auth flows with Playwright and Next.js](https://testdouble.com/insights/how-to-test-auth-flows-with-playwright-and-next-js)
- [Testing Supabase Magic Login in CI with Playwright](https://www.bekapod.dev/articles/supabase-magic-login-testing-with-playwright/)
- [Testing with Next.js 15, Playwright, MSW, and Supabase](https://micheleong.com/blog/testing-with-nextjs-15-and-playwright-msw-and-supabase)

---
*Architecture research for: Next.js 15 + Supabase Security Audits & E2E Testing*
*Researched: 2026-01-22*
