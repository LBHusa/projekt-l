# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Unit Test Runner:**
- Framework: Vitest v4.0.16
- Environment: jsdom (browser-like DOM for React components)
- Config: `vitest.config.ts`

**E2E Test Framework:**
- Framework: Playwright v1.57.0
- Config: `playwright.config.ts`
- Base URL: `http://localhost:3050` (served from `npm run dev -- --port 3050`)

**Assertion Library:**
- Unit tests: Vitest's built-in `expect()` (matches Jest API)
- E2E tests: Playwright's built-in `expect()` (web-specific assertions)

**Run Commands:**
```bash
npm run test              # Vitest watch mode
npm run test:run         # Vitest single run
npm run test:coverage   # Generate coverage report (v8 provider)
npm run test:e2e         # Playwright tests (headless)
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:headed  # Playwright with visible browser
npm run test:e2e:debug   # Playwright debug mode
```

## Test File Organization

**Location:**
- Unit tests: Co-located in `src/__tests__/` directory
- E2E tests: Separate directory `tests/e2e/`
- Naming: Same filename as source with `.test.ts` or `.spec.ts` suffix

**Test Directory Structure:**
```
src/
├── __tests__/
│   ├── setup.ts              # Vitest setup (mocks, globals)
│   ├── xp.test.ts
│   ├── factions.test.ts
│   ├── habits-integration.test.ts
│   └── ...
└── lib/
    └── [source files]

tests/
└── e2e/
    ├── auth.setup.ts         # Playwright auth setup (runs once)
    ├── .auth/
    │   └── user.json         # Generated auth state
    ├── skills.spec.ts
    ├── quest-crud.spec.ts
    ├── habit-crud.spec.ts
    └── api-security.spec.ts
```

## Test Structure

**Unit Test Suite Organization:**

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  describe('Specific Function', () => {
    it('should behave in case X', () => {
      // Arrange
      const input = ...;

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expectedValue);
    });
  });
});
```

**Example from `src/__tests__/xp.test.ts`:**
```typescript
describe('XP System', () => {
  describe('xpForLevel', () => {
    it('returns 0 for level 0 or negative', () => {
      expect(xpForLevel(0)).toBe(0);
      expect(xpForLevel(-1)).toBe(0);
      expect(xpForLevel(-100)).toBe(0);
    });

    it('calculates XP correctly using 100 * level^1.5 formula', () => {
      // Level 1: 100 * 1^1.5 = 100
      expect(xpForLevel(1)).toBe(100);

      // Level 2: 100 * 2^1.5 ≈ 282
      expect(xpForLevel(2)).toBe(282);

      // Level 10: 100 * 10^1.5 ≈ 3162
      expect(xpForLevel(10)).toBe(3162);

      // Level 25: 100 * 25^1.5 = 12,500
      expect(xpForLevel(25)).toBe(12500);

      // Level 100: 100 * 100^1.5 = 100,000
      expect(xpForLevel(100)).toBe(100000);
    });

    it('always returns an integer (floored)', () => {
      for (let level = 1; level <= 50; level++) {
        const xp = xpForLevel(level);
        expect(Number.isInteger(xp)).toBe(true);
      }
    });
  });
});
```

**E2E Test Suite Organization:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name (TEST-XX)', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/feature-path');
    await page.waitForLoadState('domcontentloaded');
  });

  test('User can do action X', async ({ page }) => {
    // Arrange: Navigate/setup
    // Act: Perform action
    // Assert: Verify result
  });
});
```

**Example from `tests/e2e/skills.spec.ts`:**
```typescript
test.describe('Skills Display (TEST-04)', () => {
  test('Skills API returns skills for authenticated user', async ({ page }) => {
    const response = await page.request.get('/api/skills');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('skills');
    expect(Array.isArray(data.skills)).toBe(true);

    // If user has skills, verify structure
    if (data.skills.length > 0) {
      expect(data.skills[0]).toHaveProperty('id');
      expect(data.skills[0]).toHaveProperty('name');
    }
  });

  test('Skill detail page loads with progress display', async ({ page }) => {
    const response = await page.request.get('/api/skills');

    if (response.status() === 200) {
      const data = await response.json();
      if (data.skills && data.skills.length > 0) {
        const skillId = data.skills[0].id;

        await page.goto(`/skill/${skillId}`);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('h1, h2')).toBeVisible();
        await expect(page).toHaveURL(`/skill/${skillId}`);
        await expect(page.locator('main')).toBeVisible();
      }
    }
  });
});
```

## Mocking

**Framework:** Vitest's `vi` module (Jest-compatible API)

**Setup File Location:** `src/__tests__/setup.ts`

**Mocking Pattern - Supabase Client:**

```typescript
import { vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  createBrowserClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => Promise.resolve({ data: null, error: null })),
      delete: vi.fn(() => Promise.resolve({ data: null, error: null })),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));
```

**What to Mock:**
- Database clients (Supabase) - returns test data or empty results
- External API calls (OpenAI, Anthropic, etc.) - returns mock responses
- File system operations - simulated in memory
- Network requests - when integration test is not the goal

**What NOT to Mock:**
- Utility functions like `xpForLevel()` - test them as-is
- Date/Math utilities - only mock if testing time-dependent logic
- React hooks - usually test their behavior through components
- Business logic - should be tested without mocks when possible

**Playwright-Specific:**
- No mocking needed for UI tests (real browser interaction)
- Use `page.request.get()` for real API calls to test server
- Database state managed via E2E test server (`.env.local` credentials)

## Fixtures and Factories

**Test Data Pattern from Unit Tests:**

```typescript
// In xp.test.ts - data used inline for clarity
it('calculates level correctly', () => {
  // Just under level 2 threshold
  expect(levelFromXp(99)).toBe(1);

  // Exactly at level 2 threshold
  expect(levelFromXp(100)).toBe(1);

  // Just over level 2 threshold (100 + 282 = 382)
  expect(levelFromXp(382)).toBe(2);
});
```

**E2E Test Data Pattern:**

```typescript
// From quest-crud.spec.ts - fetch from API first
test('User can edit quest from detail page', async ({ page }) => {
  const response = await page.request.get('/api/quests');

  if (response.status() === 200) {
    const data = await response.json();
    const quests = data.quests || data;

    if (Array.isArray(quests) && quests.length > 0) {
      const questId = quests[0].id;
      // ... use questId for test
    }
  }
});
```

**Location:**
- Unit test fixtures: Inline in test files (no factory pattern detected)
- E2E test data: Fetched from running API server (Supabase database)
- Auth state: Pre-generated in `.auth/user.json` via auth.setup.ts

## Coverage

**Requirements:** Not enforced by CI
- Coverage reports generated by v8 provider
- Reporter types: `['text', 'json', 'html']`

**View Coverage:**
```bash
npm run test:coverage
# Generates: coverage/index.html (open in browser)
```

**Coverage Exclusions:**
- `node_modules/`
- `src/__tests__/setup.ts` (test infrastructure)
- `**/*.d.ts` (type declaration files)
- `**/*.config.*` (config files)
- `**/types/**` (type-only directories)

## Test Types

**Unit Tests:**

**Scope:** Individual function/module behavior
**Approach:**
- Test pure functions (XP calculations, validators)
- Test data layer queries with mocked Supabase
- Vitest with jsdom environment

**Examples:**
- `src/__tests__/xp.test.ts` - XP formula calculations
- `src/__tests__/factions.test.ts` - Faction level system
- `src/__tests__/parsers.test.ts` - Data parsing utilities
- `src/__tests__/habits-integration.test.ts` - Habit business logic

**Integration Tests:**

**Scope:** API routes, database operations
**Approach:**
- Test full request-response cycle
- Playwright making real HTTP requests to dev server
- Tests actually call Supabase (uses test user credentials)

**Examples:**
- `tests/e2e/skills.spec.ts` - Skills API and page loading
- `tests/e2e/api-security.spec.ts` - Authentication requirements
- `tests/e2e/quest-crud.spec.ts` - Full quest lifecycle

**E2E Tests:**

**Scope:** User workflows across pages
**Approach:**
- Playwright browser automation
- Real user interactions (click, type, submit)
- Tests full authentication flow and multi-page navigation
- Parallel disabled: `fullyParallel: false` (avoid test data conflicts)
- Single worker: `workers: 1`

**Configuration from `playwright.config.ts`:**
```typescript
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,           // Sequential execution
  forbidOnly: !!process.env.CI,   // Fail on test.only in CI
  retries: 3,                     // Retry flaky tests
  workers: 1,                     // Single worker (no concurrency)
  reporter: 'html',
  timeout: 90000,                 // 90s per test
  expect: { timeout: 15000 },     // 15s for assertions

  projects: [
    { name: 'setup' },                    // Auth setup
    { name: 'unauthenticated' },          // No auth tests
    { name: 'chromium' },                 // Desktop tests
    { name: 'mobile-chrome' },            // Mobile Chrome
    { name: 'mobile-safari' },            // Mobile Safari
  ],
});
```

**Test Project Isolation:**
- `setup`: Runs first, generates auth state
- `unauthenticated`: Tests API security (no auth)
- `chromium`: Main desktop tests (auth required)
- `mobile-*`: Responsive design tests (auth required)

## Common Patterns

**Async Testing (Vitest):**

```typescript
it('should complete async operation', async () => {
  const result = await getSkillsByDomain('some-id');
  expect(result).toEqual([]);
});

// Or with beforeEach setup
beforeEach(async () => {
  await setupTestData();
});
```

**Error Testing:**

```typescript
// Unit test: Mock error response
vi.mocked(createBrowserClient).mockImplementation(() => ({
  from: () => ({
    select: () => Promise.resolve({
      data: null,
      error: new Error('DB Error')
    })
  })
}));

expect(() => getSkills()).rejects.toThrow('DB Error');

// E2E test: Verify error response
test('API returns 401 for unauthenticated requests', async ({ request }) => {
  const response = await request.get('/api/quests');
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.error).toContain('Unauthorized');
});
```

**Navigation with Wait State:**

```typescript
// From quest-crud.spec.ts - retry pattern for flaky server
let lastError: Error | null = null;
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    await page.goto('/quests', {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    });
    await page.locator('body').waitFor({ state: 'visible', timeout: 15000 });
    return; // Success
  } catch (error) {
    lastError = error as Error;
    await page.waitForTimeout(1000 * (attempt + 1)); // Exponential backoff
  }
}
if (lastError) throw lastError;
```

**Element Interaction with Fallbacks:**

```typescript
// From quest-crud.spec.ts - flexible selector pattern
const editBtn = page.locator(
  'button:has-text("Bearbeiten"), button:has-text("Edit"), [data-testid="edit-quest"], a[href*="/edit"]'
).first();

if (await editBtn.isVisible()) {
  await editBtn.click();
  await page.waitForTimeout(500);
} else {
  // Test gracefully handles missing element
}
```

**Auth for E2E Tests:**

```typescript
// From auth.setup.ts - runs once before all tests
setup('authenticate as test user', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', process.env.E2E_TEST_USER_EMAIL || '');
  await page.fill('input[type="password"]', process.env.E2E_TEST_USER_PASSWORD || '');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
  await expect(page).toHaveURL('/');
  await page.context().storageState({ path: 'tests/e2e/.auth/user.json' });
});

// Other tests inherit auth:
projects: [
  {
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      storageState: 'tests/e2e/.auth/user.json',  // Reuse auth
    },
    dependencies: ['setup'],  // Run setup first
  }
]
```

## Test Gaps (Observed)

**Phase 1-3 Additions May Lack Tests:**
- New features added in recent phases may not have complete unit tests
- E2E tests provide good coverage for critical paths
- Security tests (`api-security.spec.ts`) validate auth and authorization
- Consider adding unit tests for new utility functions

**Key Testing Advice:**
- Every data layer function should have a unit test
- Every API route should have an E2E test (security + happy path)
- Components tested via E2E (no unit tests detected for UI)
- Mocking errors is critical for robustness

---

*Testing analysis: 2026-02-02*
