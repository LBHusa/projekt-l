# Testing Patterns

**Analysis Date:** 2026-01-22

## Test Framework

**Runner:**
- Vitest 4.0.16
- Config: `vitest.config.ts`
- Environment: jsdom (browser-like environment)

**Assertion Library:**
- Vitest built-in expect API (compatible with Jest)
- Imported from 'vitest': `expect`

**Run Commands:**
```bash
npm run test              # Run tests in watch mode
npm run test:run         # Run tests once (CI mode)
npm run test:coverage    # Run tests with coverage report
```

## Test File Organization

**Location:**
- Co-located with source code in `src/__tests__/` directory
- Shared test setup in `src/__tests__/setup.ts`

**Naming:**
- Pattern: `[feature].test.ts` (e.g., `xp.test.ts`, `factions.test.ts`)
- Test files for utilities, not for components (focus on business logic)

**Structure:**
```
src/__tests__/
├── setup.ts                      # Global test setup & mocks
├── xp.test.ts                    # XP calculation tests
├── factions.test.ts              # Faction level tests
├── activity-log.test.ts          # Activity logging tests
├── parsers.test.ts               # Import parser tests
├── contacts-types.test.ts        # Contact type tests
├── habits-integration.test.ts    # Habit integration tests
├── faction-ids.test.ts           # Faction ID tests
└── weisheit.test.ts              # Weisheit system tests
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  describe('Function Name', () => {
    it('does something specific', () => {
      // Arrange
      const input = someValue;

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

**Patterns:**
- Top-level `describe` for feature/system
- Nested `describe` for individual functions
- `it` blocks describe specific behavior
- AAA pattern: Arrange, Act, Assert (implicit in structure)
- One assertion per `it` block preferred, multiple assertions allowed if testing one behavior

## Mocking

**Framework:** Vitest's `vi` module

**Global Mocks Setup:**
Location: `src/__tests__/setup.ts`

```typescript
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

**Patterns:**
- Mock Supabase client for all tests (setup.ts)
- Return chainable objects that resolve to `{ data: T | null, error: Error | null }`
- Mock RPC calls for stored procedures
- Testing library imports: `@testing-library/jest-dom`, `@testing-library/react`

**What to Mock:**
- External API calls (Supabase)
- Database operations
- Network requests
- Third-party services

**What NOT to Mock:**
- Pure calculation functions (e.g., XP formulas)
- Date/time (unless testing time-based behavior)
- Built-in JavaScript functions

## Fixtures and Factories

**Test Data:**
```typescript
// From activity-log.test.ts
const mockActivities: Partial<ActivityLog>[] = [
  {
    id: '1',
    activity_type: 'xp_gained',
    faction_id: 'karriere',
    xp_amount: 100,
    occurred_at: '2024-01-15T10:00:00Z',
  },
  // ... more mock data
];
```

**Location:**
- Mock data defined in test files (not extracted to fixtures)
- Inline constants for small datasets
- Descriptive variable names (e.g., `mockActivities`, `mockAccounts`)

**Characteristics:**
- Use partial types when not all fields needed
- Include realistic test values
- ISO date strings for timestamps (YYYY-MM-DDTHH:mm:ssZ)
- Faction IDs as string literals matching actual IDs

## Coverage

**Requirements:** Not enforced (no coverage threshold in config)

**Configuration:**
Location: `vitest.config.ts`

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/__tests__/setup.ts',
    '**/*.d.ts',
    '**/*.config.*',
    '**/types/**',
  ],
}
```

**View Coverage:**
```bash
npm run test:coverage    # Generates HTML report in coverage/
```

**Excluded from Coverage:**
- Setup files
- Type definition files
- Configuration files
- Type-only exports

## Test Types

**Unit Tests:**
- Scope: Pure functions (XP calculations, parsers, formatters)
- Approach: Test input/output relationships
- Examples: `xp.test.ts`, `factions.test.ts`, `parsers.test.ts`
- No mocking of the function under test, only external dependencies

**Integration Tests:**
- Scope: Functions that interact with Supabase
- Approach: Mock Supabase, test business logic flow
- Examples: `habits-integration.test.ts`, `activity-log.test.ts`
- Test data flows between functions

**E2E Tests:**
- Status: Not found (would use Playwright per CLAUDE.md)
- Scope: Full user workflows (for future implementation)
- Tool: Playwright MCP Server (when implemented)

## Common Patterns

**Boundary Testing:**
```typescript
it('returns level 1 for 0 XP', () => {
  expect(calculateFactionLevel(0)).toBe(1);
});

it('returns level 1 for negative XP', () => {
  expect(calculateFactionLevel(-100)).toBe(1);
});

it('handles boundary cases correctly', () => {
  expect(calculateFactionLevel(399)).toBe(1);      // Just below
  expect(calculateFactionLevel(400)).toBe(2);      // Exactly at
  expect(calculateFactionLevel(401)).toBe(2);      // Just above
});
```

**Range/Iteration Testing:**
```typescript
it('never returns less than 1', () => {
  for (let i = -100; i <= 100; i += 10) {
    expect(calculateFactionLevel(i)).toBeGreaterThanOrEqual(1);
  }
});

it('always returns an integer (floored)', () => {
  for (let level = 1; level <= 50; level++) {
    const xp = xpForLevel(level);
    expect(Number.isInteger(xp)).toBe(true);
  }
});
```

**Formula Validation:**
```typescript
it('uses floor(sqrt(xp/100)) formula correctly', () => {
  // Level 1: 0-99 XP
  expect(calculateFactionLevel(0)).toBe(1);
  expect(calculateFactionLevel(99)).toBe(1);

  // Level 2: 400 XP (sqrt(400/100) = 2)
  expect(calculateFactionLevel(400)).toBe(2);

  // Level 5: 2,500 XP (sqrt(2500/100) = 5)
  expect(calculateFactionLevel(2500)).toBe(5);
});
```

**Cumulative Testing:**
```typescript
it('is cumulative (each level adds more)', () => {
  let prevTotal = 0;
  for (let level = 1; level <= 10; level++) {
    const total = totalXpForLevel(level);
    expect(total).toBeGreaterThan(prevTotal);
    prevTotal = total;
  }
});
```

**Array/List Testing:**
```typescript
it('XP requirements grow predictably', () => {
  const xpRequirements = [];
  for (let level = 1; level <= 10; level++) {
    xpRequirements.push(xpForFactionLevel(level));
  }

  expect(xpRequirements).toEqual([100, 400, 900, 1600, 2500, 3600, 4900, 6400, 8100, 10000]);
});
```

**Error Case Testing:**
```typescript
it('handles empty CSV', () => {
  const result = parseGoogleCSV('');
  expect(result.errors).toContain('CSV ist leer oder hat keine Daten');
  expect(result.contacts).toHaveLength(0);
});

it('handles missing first name with warning', () => {
  const csv = `Given Name,Family Name
,Doe
John,Smith`;

  const result = parseGoogleCSV(csv);
  expect(result.contacts).toHaveLength(1);
  expect(result.warnings.length).toBeGreaterThan(0);
});
```

**Async Testing:**
```typescript
// Tests use async/await naturally
export async function updateFactionStats(
  factionId: FactionId,
  xpAmount: number,
): Promise<UserFactionStats> {
  // ... test mocks return Promises
}

// Tests are standard Vitest async
it('handles level up correctly', async () => {
  // If async function needed
});
```

## Test Examples from Codebase

**XP System Test:**
Location: `src/__tests__/xp.test.ts` (207 lines)
- Tests 7 functions: xpForLevel, totalXpForLevel, levelFromXp, progressToNextLevel, addXp, formatXp, getLevelTier
- 46 test cases
- Examples of boundary testing, formula validation, cumulative tests

**Faction Level Test:**
Location: `src/__tests__/factions.test.ts` (145 lines)
- Tests faction level calculation formulas
- Validates quadratic scaling (level^2 * 100)
- Tests inverse relationships between functions

**Parser Tests:**
Location: `src/__tests__/parsers.test.ts` (100+ lines shown)
- Tests CSV parsing with Google Contacts format
- Tests vCard parsing
- Tests error handling and warnings
- Tests German date format handling

---

*Testing analysis: 2026-01-22*
