# Stack Research - Security & Testing for Next.js + Supabase

**Domain:** Security Testing, RLS Implementation, E2E Testing for Next.js + Supabase Gamification App
**Researched:** 2026-01-22
**Confidence:** HIGH

## Recommended Stack

### Core Technologies (Already in Use)

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.1 | App Router, React framework | Current stable version, full App Router support with Server Components |
| React | 19.2.3 | UI framework | Latest stable version, compatible with Next.js 16 |
| TypeScript | 5.9.3 | Type safety | Latest stable version, tested with Zod v4 |
| Supabase JS | 2.89.0 | Database client | Latest version with improved type safety and RLS support |
| Supabase SSR | 0.8.0 | Server-side auth | Required for Next.js App Router authentication patterns |
| Vitest | 4.0.16 | Unit testing | Already in use, fast, TypeScript-first, compatible with React Testing Library |

### Security Testing & Validation

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Zod | 4.3.5 | Input validation & schema validation | **CRITICAL for XSS prevention**. Version 4 is 6.5x faster than v3, includes built-in validators (z.email(), z.url(), z.jwt(), etc.), TypeScript-first, industry standard for Next.js apps in 2026 |
| isomorphic-dompurify | 2.26.0+ | HTML sanitization (client & server) | **CRITICAL for XSS prevention**. Works with Next.js Server Components (v2.26.0 fixed "window is not defined" errors), supports both jsdom (server) and native DOM (client), 1.2M+ weekly downloads |
| dompurify | 3.3.1 | Peer dependency for isomorphic-dompurify | Fast, actively maintained (since 2014), protects against XSS, DOM clobbering, and prototype pollution |

### RLS Testing & Database Testing

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| pgTAP | latest (Postgres extension) | Database unit testing | **Official Supabase recommendation**. Transaction-isolated tests, designed specifically for Postgres/RLS testing, standard in Supabase ecosystem 2026 |
| @usebasejump/supabase-test-helpers | latest | Helper functions for pgTAP | Community-maintained, provides `tests.create_supabase_user()` and `tests.authenticate_as()` for auth/RLS testing, widely used in Supabase community |

### E2E Testing

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| Playwright | 1.57.0+ | End-to-end browser testing | **Official Next.js recommendation**. Latest version uses Chrome for Testing (more stable), supports auth state caching, IndexedDB storage state, smart wait assertions, multi-browser testing (Chromium/Firefox/WebKit) |
| @playwright/test | 1.57.0+ | Playwright test runner | Matches Playwright version, TypeScript support, parallel test execution |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | 16.3.1 | Component testing | Already installed - use for unit tests of React components, complements Playwright for integration tests |
| @testing-library/jest-dom | 6.9.1 | DOM matchers for tests | Already installed - enhances Vitest with readable assertions |
| @vitest/coverage-v8 | 4.0.16 | Code coverage reporting | Already installed - use to track test coverage for security-critical code paths |
| jsdom | 27.4.0 | DOM simulation for Node.js | Already installed - required for isomorphic-dompurify server-side sanitization |

### Development & Security Audit Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| AuditYourApp | Supabase RLS scanner | **External SaaS** - free security audit for RLS rules, unprotected RPCs, leaked API keys. Paste-and-scan, no setup required. Use before production deployment |
| SupaExplorer | Supabase security scanner | **OAuth-based** - free audit via Supabase OAuth, scans RLS configurations. Proprietary scanner (not open source) |
| Supabase Dashboard RLS Tester | Built-in policy testing | **FREE, built-in** - test queries as specific users in Supabase Dashboard. Use during RLS development |
| Supabase CLI (supabase test) | Local pgTAP test runner | **FREE, official** - runs pgTAP tests via `supabase test db`. Uses pg_prove by default. Essential for CI/CD |
| Mailpit | Email testing (local) | **Auto-included** - available at localhost:54324 when running `supabase start`. Test Auth emails locally |

## Installation

```bash
# Security validation (CRITICAL for SEC-05, SEC-06, SEC-07)
npm install zod@^4.3.5

# XSS sanitization (CRITICAL for SEC-05, SEC-06, SEC-07)
npm install isomorphic-dompurify@^2.26.0

# E2E Testing (for TEST-01 through TEST-10)
npm install -D @playwright/test@^1.57.0
npx playwright install  # Install browser binaries

# pgTAP helpers for RLS testing (for SEC-03, XP-01 through XP-06)
# Note: Install in supabase/tests directory, not npm
# See: https://github.com/usebasejump/supabase-test-helpers

# Already installed (no action needed):
# - vitest@4.0.16
# - @testing-library/react@16.3.1
# - @testing-library/jest-dom@6.9.1
# - @vitest/coverage-v8@4.0.16
# - jsdom@27.4.0
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Zod 4.x | Valibot | Use Valibot if bundle size is critical (<1kb vs Zod's 14kb). Zod has better ecosystem support and more built-in validators in v4 |
| isomorphic-dompurify | sanitize-html | Use sanitize-html if you need Node.js-only sanitization with custom parsing rules. isomorphic-dompurify is better for isomorphic Next.js apps |
| Playwright | Cypress | Use Cypress if team already familiar with it. Playwright is faster (parallel by default), has better TypeScript support, and is officially recommended by Next.js in 2026 |
| pgTAP | Application-level RLS tests | Use app-level tests only as supplement. pgTAP provides transaction isolation that app-level tests cannot achieve |
| Zod | Yup | Avoid Yup - Zod has better TypeScript inference, more active development, and is the standard in Next.js ecosystem 2026 |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| express-validator | Designed for Express.js, not Next.js App Router or Server Actions | Zod (works seamlessly with Next.js Server Actions and tRPC) |
| joi | Verbose API, poor TypeScript inference, less active development | Zod (TypeScript-first, concise, 6.5x faster in v4) |
| DOMPurify directly (without isomorphic wrapper) | Causes "window is not defined" errors in Next.js Server Components | isomorphic-dompurify (handles both server/client) |
| Selenium | Slow, verbose API, outdated architecture | Playwright (faster, better DX, official Next.js recommendation) |
| Jest (for new Next.js projects) | Slower than Vitest, more configuration needed | Vitest (already installed, faster, better ESM support) |
| Manually writing RLS test SQL | Error-prone, no transaction isolation, hard to maintain | pgTAP with supabase-test-helpers (structured, reusable, isolated) |
| Client-side validation only | Can be bypassed, not secure | Always validate on server with Zod (defense in depth) |
| Service role key in client code | **SECURITY CRITICAL** - bypasses ALL RLS policies, grants full database access | Never use service_role on client. Use anon key with RLS policies |

## Stack Patterns by Security Requirement

### Pattern 1: Input Validation (SEC-05, SEC-06, SEC-07)

**For all user input (Quest titles, Habit tracking, Profile editing):**
- **Client-side**: Zod schema validation in forms for instant feedback
- **Server-side**: Same Zod schema in Server Actions/API routes (defense in depth)
- **Sanitization**: isomorphic-dompurify for any HTML content rendering
- **CSP**: Next.js middleware with nonce for script-src and style-src

```typescript
// Shared schema (use in both client forms and server actions)
import { z } from 'zod';

const questSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  xp: z.number().int().min(0).max(10000)
});

// Server Action
import DOMPurify from 'isomorphic-dompurify';

export async function createQuest(formData: FormData) {
  const validated = questSchema.parse({
    title: formData.get('title'),
    description: formData.get('description'),
    xp: Number(formData.get('xp'))
  });

  // Sanitize HTML if needed
  const clean = {
    ...validated,
    description: validated.description
      ? DOMPurify.sanitize(validated.description)
      : undefined
  };

  // Insert to Supabase...
}
```

### Pattern 2: RLS Policy Testing (SEC-03)

**For all tables (quests, habits, skills, factions, user_stats, notifications, ai_conversations, journal_entries):**
- **Development**: Use Supabase Dashboard RLS tester to prototype policies
- **Automated testing**: pgTAP tests in `supabase/tests/` directory
- **CI/CD**: Run `supabase test db` in GitHub Actions before deployment
- **Audit**: Use AuditYourApp or SupaExplorer before production launch

```sql
-- supabase/tests/001-quests-rls.test.sql
BEGIN;
SELECT plan(4);

-- Setup
SELECT tests.create_supabase_user('user1');
SELECT tests.create_supabase_user('user2');
SELECT tests.authenticate_as('user1');

INSERT INTO quests (id, user_id, title) VALUES (1, tests.get_supabase_uid('user1'), 'My Quest');

-- Test: User can read their own quest
SELECT ok(
  (SELECT COUNT(*) FROM quests WHERE id = 1) = 1,
  'User can read their own quest'
);

-- Test: User cannot read other user quests
SELECT tests.authenticate_as('user2');
SELECT ok(
  (SELECT COUNT(*) FROM quests WHERE id = 1) = 0,
  'User cannot read other user quests'
);

-- Test: User cannot update other user quests
SELECT throws_ok(
  'UPDATE quests SET title = ''Hacked'' WHERE id = 1',
  'User cannot update other user quests'
);

-- Test: User cannot delete other user quests
SELECT throws_ok(
  'DELETE FROM quests WHERE id = 1',
  'User cannot delete other user quests'
);

SELECT * FROM finish();
ROLLBACK;
```

### Pattern 3: E2E Testing (TEST-01 through TEST-10)

**For all critical user flows:**
- **Authentication state**: Cache auth state to `playwright/.auth/user.json` for reuse
- **Test isolation**: Use unique user IDs or database reset between tests
- **Parallel execution**: Configure Playwright to run tests in parallel (default)
- **Visual regression**: Optional - use `page.screenshot()` for critical UI states

```typescript
// tests/e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'testpassword');
  await page.click('button[type="submit"]');
  await page.waitForURL('http://localhost:3000/dashboard');

  // Save auth state
  await page.context().storageState({
    path: 'playwright/.auth/user.json'
  });
});

// tests/e2e/quests.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test('TEST-02: Create, Complete, Fail Quest workflows', async ({ page }) => {
  // Create Quest
  await page.goto('http://localhost:3000/quests');
  await page.click('button:has-text("New Quest")');
  await page.fill('input[name="title"]', 'Test Quest');
  await page.fill('input[name="xp"]', '100');
  await page.click('button:has-text("Create")');

  // Verify appears in list
  await expect(page.locator('text=Test Quest')).toBeVisible();

  // Complete Quest
  await page.click('button:has-text("Complete"):near(text=Test Quest)');
  await expect(page.locator('text=+100 XP')).toBeVisible();

  // Verify Quest is completed
  await expect(page.locator('text=Test Quest').locator('..')).toHaveClass(/completed/);
});
```

### Pattern 4: Content Security Policy (SEC-05, SEC-06, SEC-07)

**For XSS prevention:**
- **Next.js 16.1.1+ with nonce-based CSP** (requires dynamic rendering)
- **Generate nonce in middleware** using `crypto.randomUUID()`
- **Set CSP headers** with `script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'`
- **Access nonce in Server Components** via `headers().get('x-nonce')`

**Note**: CSP with nonce disables static optimization and ISR. For this project (authenticated app with dynamic data), this is acceptable.

## Version Compatibility

| Package | Compatible With | Notes |
|---------|------------------|-------|
| Zod 4.3.5 | TypeScript 5.5+ | Tested with TypeScript 5.9.3 ✓ |
| isomorphic-dompurify 2.26.0+ | Next.js 13/14/15/16 | v2.26.0 fixes "window is not defined" in Server Components |
| Playwright 1.57.0+ | Next.js 16.1.1 | Official Next.js compatibility, webServer config works with App Router |
| Supabase JS 2.89.0 | Supabase SSR 0.8.0 | Both required for Next.js App Router auth patterns |
| Vitest 4.0.16 | React 19.2.3 | Compatible with @testing-library/react 16.3.1 |
| pgTAP | Supabase CLI latest | Built-in extension, enabled via Dashboard or migration |

## CI/CD Integration

### GitHub Actions Recommended Workflow

```yaml
# .github/workflows/security-tests.yml
name: Security & E2E Tests

on: [pull_request]

jobs:
  rls-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase test db

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e

  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage
```

## Migration Path from Current State

### Phase 1: Input Validation (SEC-05, SEC-06, SEC-07)
1. Install Zod and isomorphic-dompurify
2. Create shared validation schemas for Quests, Habits, Profile
3. Add server-side validation to all Server Actions
4. Add client-side validation to forms
5. Sanitize any HTML rendering with DOMPurify

### Phase 2: RLS Policies (SEC-03)
1. Enable pgTAP extension in Supabase Dashboard
2. Install supabase-test-helpers in `supabase/tests/`
3. Write RLS policies for each table (quests, habits, skills, etc.)
4. Write pgTAP tests for each policy (SELECT, INSERT, UPDATE, DELETE)
5. Run `supabase test db` locally to validate
6. Apply policies to production via migration

### Phase 3: E2E Testing (TEST-01 through TEST-10)
1. Install Playwright
2. Create auth setup script to cache login state
3. Write E2E tests for each critical flow
4. Configure CI/CD to run tests on PRs
5. Set up visual regression testing (optional)

### Phase 4: Security Hardening (SEC-01, SEC-02, SEC-04, SEC-08, SEC-09, SEC-10)
1. Remove hardcoded user IDs (SEC-01, SEC-02)
2. Audit all protected pages for auth checks (SEC-04)
3. Verify API routes use `requireAuth` pattern (SEC-08)
4. Add API key check to webhook handlers (SEC-09)
5. Audit error messages for sensitive data leaks (SEC-10)
6. Run AuditYourApp or SupaExplorer scan

## Sources

**Validation & Sanitization:**
- [Zod Official Docs](https://zod.dev/) — Latest v4 features, built-in validators
- [Zod NPM](https://www.npmjs.com/package/zod) — Version 4.3.5 confirmed
- [isomorphic-dompurify GitHub](https://github.com/kkomelin/isomorphic-dompurify) — Next.js compatibility notes
- [DOMPurify Official](https://dompurify.com/) — XSS protection mechanisms
- [Next.js XSS Prevention Guide](https://medium.com/@kayahuseyin/xss-attacks-in-next-js-how-to-secure-your-app-like-a-pro-9a81d3513d62) — 2026 best practices
- [Next.js Security Checklist](https://blog.arcjet.com/next-js-security-checklist/) — Comprehensive security guide

**RLS & Database Testing:**
- [Supabase RLS Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — Authoritative RLS patterns
- [Supabase pgTAP Testing](https://supabase.com/docs/guides/database/extensions/pgtap) — Official testing guide
- [Advanced pgTAP Testing](https://supabase.com/docs/guides/local-development/testing/pgtap-extended) — Transaction isolation patterns
- [Supabase Test Helpers GitHub](https://github.com/usebasejump/supabase-test-helpers) — Community helpers
- [Basejump pgTAP Guide](https://usebasejump.com/blog/testing-on-supabase-with-pgtap) — Practical tutorial
- [Next.js Supabase RLS Best Practices](https://makerkit.dev/docs/next-supabase/row-level-security) — 2026 patterns

**E2E Testing:**
- [Next.js Playwright Official Guide](https://nextjs.org/docs/app/guides/testing/playwright) — Official integration
- [Playwright Release Notes](https://playwright.dev/docs/release-notes) — Version 1.57.0 features
- [Playwright NPM](https://www.npmjs.com/package/playwright) — Version confirmation
- [Testing Auth Flows with Playwright](https://testdouble.com/insights/how-to-test-auth-flows-with-playwright-and-next-js) — Auth state caching pattern

**Security Auditing:**
- [AuditYourApp](https://www.audityour.app/) — Supabase security scanner
- [SupaExplorer](https://supaexplorer.com/cybersecurity-insight-report-january-2026) — January 2026 security report
- [Supabase Security Testing Docs](https://supabase.com/docs/guides/security/security-testing) — Official audit tools
- [Supabase Security Retro 2025](https://supabase.com/blog/supabase-security-2025-retro) — Recent security improvements

**CSP & XSS Prevention:**
- [Next.js CSP Guide](https://nextjs.org/docs/app/guides/content-security-policy) — Official nonce-based CSP setup
- [Next.js Security Guide 2025](https://www.turbostarter.dev/blog/complete-nextjs-security-guide-2025-authentication-api-protection-and-best-practices) — Comprehensive patterns

---
*Stack research for: Next.js + Supabase Security & Testing*
*Researched: 2026-01-22*
*Confidence: HIGH — All versions verified via official documentation and package registries (npm, GitHub releases) as of January 2026*
