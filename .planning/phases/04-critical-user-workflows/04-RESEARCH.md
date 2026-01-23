# Phase 4: Critical User Workflows - Research

**Researched:** 2026-01-23
**Domain:** End-to-End User Experience Testing with Playwright
**Confidence:** HIGH

## Summary

Phase 4 validates that all critical user workflows function correctly in a real browser environment. The research reveals a well-structured Next.js 14 App Router application with 29 pages, comprehensive data layer (30+ modules), and existing E2E infrastructure (25 passing tests). The application follows consistent patterns: client-side pages use `useAuth()` hook for authentication, API routes verify auth with `supabase.auth.getUser()`, and data operations flow through dedicated data layer modules.

The 10 requirements (TEST-01 through TEST-10) map to specific user journeys across navigation, CRUD operations, data persistence, and user isolation. The existing test infrastructure provides proven patterns for authentication setup, security validation, and API testing that should be extended to cover functional workflows.

**Primary recommendation:** Structure tests in 3 waves: (1) Navigation & Page Load, (2) CRUD Operations, (3) Data Persistence & Isolation. Use existing auth.setup.ts pattern, leverage storageState for authenticated sessions, and test against real database data to catch integration issues.

## Standard Stack

The established libraries/tools for E2E testing in this project:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright | Latest | Browser automation & E2E testing | Official recommendation for Next.js testing, supports multiple browsers |
| @playwright/test | Latest | Test runner with fixtures | Integrated test framework with built-in assertions and parallelization |
| Next.js 14 | 14.x | App Router framework | React framework with server/client components |
| Supabase | Latest | Auth + Database | Backend-as-a-Service with RLS policies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | Latest | Load test credentials | Reading E2E_TEST_USER_EMAIL/PASSWORD from .env.local |
| framer-motion | Latest | UI animations | Testing animated components (may need waitForTimeout) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright | Cypress | Playwright chosen for multi-browser support and better Next.js integration |
| Real DB data | Fixtures/Mocks | Project uses real data to catch integration issues (single worker prevents conflicts) |

**Installation:**
Already installed. No additional dependencies needed for Phase 4.

## Architecture Patterns

### Existing Test Structure
```
tests/e2e/
├── auth.setup.ts                    # Authenticates once, saves storageState
├── .auth/user.json                  # Persisted session (gitignored)
├── security-validation.spec.ts      # 11 security tests (XSS, auth)
└── api-security.spec.ts             # 14 API auth tests
```

### Recommended Test Structure for Phase 4
```
tests/e2e/
├── auth.setup.ts                    # [Existing] Login once
├── navigation.spec.ts               # TEST-01: Dashboard navigation
├── quests.spec.ts                   # TEST-02: Quest workflows
├── habits.spec.ts                   # TEST-03: Habit tracking
├── skills.spec.ts                   # TEST-04: Skills page
├── factions.spec.ts                 # TEST-05: Factions display
├── profile.spec.ts                  # TEST-06: Profile edit
├── settings.spec.ts                 # TEST-07: Settings & theme
├── soziales.spec.ts                 # TEST-08: Soziales data isolation
├── karriere.spec.ts                 # TEST-09: Karriere data isolation
└── geist.spec.ts                    # TEST-10: Journal entries
```

### Pattern 1: Authenticated Test with StorageState
**What:** All tests run with pre-authenticated session via auth.setup.ts
**When to use:** Every test that requires login (all Phase 4 tests)
**Example:**
```typescript
// playwright.config.ts already configured:
// - Setup project runs auth.setup.ts
// - Chromium project depends on setup
// - storageState: 'tests/e2e/.auth/user.json'

import { test, expect } from '@playwright/test';

test('user can navigate to quests page', async ({ page }) => {
  // No login needed - storageState provides authenticated session
  await page.goto('/quests');

  await expect(page).toHaveURL('/quests');
  await expect(page.locator('h1')).toContainText('Quests');
});
```

### Pattern 2: CRUD Operation Testing
**What:** Create → Verify → Cleanup pattern for testing data mutations
**When to use:** Testing Quest creation, Habit tracking, Profile edits, Journal entries
**Example:**
```typescript
test('user can create quest and verify in list', async ({ page }) => {
  // Navigate to creation page
  await page.goto('/quests/new');
  await page.waitForLoadState('networkidle');

  // Fill form with required fields
  const skillSelect = page.locator('select[name="skill_id"]');
  await skillSelect.waitFor({ state: 'visible' });
  await page.waitForTimeout(500); // Wait for options to load

  const options = await skillSelect.locator('option').all();
  if (options.length > 1) {
    const firstSkillValue = await options[1].getAttribute('value');
    await skillSelect.selectOption(firstSkillValue!);
  }

  await page.fill('input[name="title"]', 'E2E Test Quest');
  await page.fill('textarea[name="description"]', 'Test description');

  // Submit
  await page.click('button[type="submit"]');

  // Verify navigation to list
  await page.waitForURL('/quests');

  // Verify quest appears in list
  await expect(page.locator('text=E2E Test Quest')).toBeVisible();
});
```

### Pattern 3: Data Persistence Verification
**What:** Modify data → Reload page → Verify persistence
**When to use:** Testing Profile edits, Settings toggles, persistent state
**Example:**
```typescript
test('profile changes persist after page reload', async ({ page }) => {
  // Edit profile
  await page.goto('/profile/edit');
  await page.fill('input[name="display_name"]', 'E2E Test User');
  await page.fill('textarea[name="bio"]', 'E2E Test Bio');
  await page.click('button[type="submit"]');

  // Wait for save
  await page.waitForTimeout(1000);

  // Reload page
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Verify data persisted
  await expect(page.locator('input[name="display_name"]')).toHaveValue('E2E Test User');
  await expect(page.locator('textarea[name="bio"]')).toHaveValue('E2E Test Bio');
});
```

### Pattern 4: User Isolation Validation
**What:** Verify logged-in user sees only their data (no hardcoded UUIDs)
**When to use:** Testing soziales, karriere pages (TEST-08, TEST-09)
**Example:**
```typescript
// Source: tests/e2e/security-validation.spec.ts lines 126-147
test('User cannot see other user data on soziales page', async ({ page }) => {
  // Check that no hardcoded UUID appears in network requests
  const requests: string[] = [];
  page.on('request', req => {
    if (req.url().includes('00000000-0000-0000-0000-000000000001')) {
      requests.push(req.url());
    }
  });

  await page.goto('/soziales');
  await page.reload();

  expect(requests).toHaveLength(0);

  // Verify page loads user's data (not empty or wrong user's)
  await expect(page.locator('h1')).toContainText('Soziales');
});
```

### Anti-Patterns to Avoid
- **Test interdependence:** Each test should be independent. Don't rely on data from previous tests.
- **Hardcoded waits:** Use `waitForLoadState('networkidle')` or element visibility instead of `waitForTimeout()` when possible.
- **Parallel execution with shared data:** Use `workers: 1` in playwright.config.ts to prevent data conflicts (already configured).
- **Missing cleanup:** If test creates data, either accept it persists or implement cleanup (current strategy: tests use real data, single worker).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication setup | Manual login in every test | auth.setup.ts with storageState | Existing pattern saves 2-3 seconds per test, reduces flakiness |
| Form submission | Click submit + manual wait | `page.click() + page.waitForURL()` | Playwright auto-waits for navigation |
| Element availability | `page.waitForTimeout(1000)` | `element.waitFor({ state: 'visible' })` | More reliable, faster when element appears quickly |
| Dropdown selection | Find option by text manually | `select.selectOption(value)` | Built-in Playwright method handles edge cases |
| Network request tracking | Manual XMLHttpRequest mocking | `page.on('request')` listener | Playwright provides request interception |

**Key insight:** Playwright has built-in auto-waiting and retry logic. Explicit waits are only needed for animations or async data loading that doesn't trigger navigation.

## Common Pitfalls

### Pitfall 1: Select Dropdowns Loading Async
**What goes wrong:** Test tries to select option before dropdown options are populated
**Why it happens:** Client components fetch data (skills, domains) after initial render
**How to avoid:**
```typescript
const skillSelect = page.locator('select[name="skill_id"]');
await skillSelect.waitFor({ state: 'visible' });
await page.waitForTimeout(500); // Wait for options to load

const options = await skillSelect.locator('option').all();
if (options.length > 1) {
  const firstSkillValue = await options[1].getAttribute('value');
  await skillSelect.selectOption(firstSkillValue!);
}
```
**Warning signs:** "No options available" errors, selectOption fails with "value not found"

### Pitfall 2: Framer Motion Animations Interfering
**What goes wrong:** Elements are present but still animating when test tries to interact
**Why it happens:** framer-motion uses CSS transforms that complete after element visibility
**How to avoid:** Add small timeout after page load: `await page.waitForTimeout(300);`
**Warning signs:** "Element is not clickable" errors, clicks on wrong coordinates

### Pitfall 3: Testing Against Empty Data
**What goes wrong:** Test expects data to exist (habits, quests) but user has none
**Why it happens:** E2E test user may have clean database
**How to avoid:** Either seed test data or write tests that handle empty states gracefully
**Warning signs:** "Element not found" on list items, empty arrays returned

### Pitfall 4: Theme-Dependent Selectors
**What goes wrong:** Tests use color-based or theme-specific selectors that break on theme toggle
**Why it happens:** UI changes appearance in light vs dark mode
**How to avoid:** Use semantic selectors (`button[type="submit"]`, `h1`, `input[name="title"]`) instead of class names or colors
**Warning signs:** Tests pass in one theme, fail in another

### Pitfall 5: Race Conditions on Quest Completion
**What goes wrong:** Quest marked complete but XP update hasn't propagated
**Why it happens:** Multiple database operations in complete_quest flow (fallback logic lines 62-192 in route.ts)
**How to avoid:**
```typescript
await page.click('button:has-text("Complete")');
await page.waitForTimeout(1000); // Wait for XP propagation
await page.reload(); // Force fresh data
```
**Warning signs:** Quest shows completed but XP/level unchanged

## Code Examples

Verified patterns from existing test files:

### Authentication Setup (auth.setup.ts)
```typescript
// Source: tests/e2e/auth.setup.ts
import { test as setup } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate as test user', async ({ page }) => {
  await page.goto('/auth/login');

  await page.fill('input[type="email"]', process.env.E2E_TEST_USER_EMAIL || '');
  await page.fill('input[type="password"]', process.env.E2E_TEST_USER_PASSWORD || '');

  await page.click('button[type="submit"]');
  await page.waitForURL('/');

  // Save auth state for reuse
  await page.context().storageState({ path: authFile });
});
```

### Security Validation Pattern
```typescript
// Source: tests/e2e/security-validation.spec.ts lines 18-54
test('XSS payload in Quest title is rejected', async ({ page }) => {
  await page.goto('/quests/new');
  await page.waitForLoadState('networkidle');

  // Fill required fields first
  await page.fill('input[name="title"]', 'Valid Quest Title');

  const skillSelect = page.locator('select[name="skill_id"]');
  await skillSelect.waitFor({ state: 'visible' });
  await page.waitForTimeout(500);

  const options = await skillSelect.locator('option').all();
  if (options.length > 1) {
    await skillSelect.selectOption(await options[1].getAttribute('value')!);
  }

  // Now enter XSS payload
  await page.fill('input[name="title"]', '<script>alert("XSS")</script>');
  await page.fill('textarea[name="description"]', 'Normal description');

  await page.click('button[type="submit"]');

  // Verify error message
  await expect(page.locator('.error-message')).toContainText('Cannot contain');
});
```

### API Authentication Test
```typescript
// Source: tests/e2e/api-security.spec.ts lines 15-34
test('Unauthenticated API requests return 401', async ({ request }) => {
  const protectedEndpoints = [
    { method: 'GET', url: '/api/quests' },
    { method: 'GET', url: '/api/habits/list' },
    { method: 'GET', url: '/api/skills' },
  ];

  for (const endpoint of protectedEndpoints) {
    const response = await request.fetch(endpoint.url, {
      method: endpoint.method,
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toContain('Unauthorized');
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual login in each test | auth.setup.ts with storageState | Phase 3 (Jan 2026) | Saves ~2 seconds per test, reduces flakiness |
| Cypress for E2E | Playwright | Phase 3 (Jan 2026) | Better Next.js support, multi-browser testing |
| Test fixtures/mocks | Real database with single worker | Phase 3 (Jan 2026) | Catches real integration issues |
| Hardcoded test user ID | useAuth() hook with real session | Phase 1 (Jan 2026) | Tests actual auth flow |

**Deprecated/outdated:**
- `TEST_USER_ID` constant: Replaced by dynamic `useAuth()` hook
- Middleware-only auth: Now requires `getUser()` in API routes (defense-in-depth)
- Hardcoded domain UUIDs: Now dynamically looked up by name

## Page & API Inventory

### Pages (29 total)
| Route | Purpose | Test Requirement |
|-------|---------|-----------------|
| `/` | Dashboard | TEST-01 (navigation hub) |
| `/quests` | Quest list | TEST-02 |
| `/quests/new` | Create quest | TEST-02 |
| `/quests/[id]` | Quest detail | TEST-02 |
| `/habits` | Habit list | TEST-03 |
| `/habits/new` | Create habit | TEST-03 |
| `/skill/[id]` | Skill detail | TEST-04 |
| `/domain/[id]` | Domain/Faction view | TEST-05 |
| `/profile/edit` | Edit profile | TEST-06 |
| `/settings` | Settings main | TEST-07 |
| `/settings/notifications` | Notification settings | TEST-07 |
| `/settings/integrations` | Integration settings | TEST-07 |
| `/settings/quest-preferences` | Quest preferences | TEST-07 |
| `/soziales` | Social contacts | TEST-08 |
| `/karriere` | Career tracking | TEST-09 |
| `/geist` | Mental health/journal | TEST-10 |
| `/koerper` | Physical health | Future phase |
| `/finanzen` | Finance tracking | Future phase |
| `/wissen` | Knowledge management | Future phase |
| `/contacts` | Contact management | Future phase |

### Critical API Routes
| Endpoint | Method | Purpose | Used By |
|----------|--------|---------|---------|
| `/api/quests` | GET | List quests | TEST-02 |
| `/api/quests` | POST | Create quest | TEST-02 |
| `/api/quests/[id]/complete` | POST | Complete quest | TEST-02 |
| `/api/habits/list` | GET | List habits | TEST-03 |
| `/api/habits/create` | POST | Create habit | TEST-03 |
| `/api/habits/complete` | POST | Track habit | TEST-03 |
| `/api/skills` | GET | List skills | TEST-04 |
| `/api/skill-domains/route.ts` | GET | List domains | TEST-05 |
| `/api/user/profile` | GET | Get profile | TEST-06 |
| `/api/user/profile` | PATCH | Update profile | TEST-06 |
| `/api/geist/mood` | POST | Save mood log | TEST-10 |

### Data Layer Modules
| Module | Purpose | Tables |
|--------|---------|--------|
| `domains.ts` | Domain/Faction management | `skill_domains`, `domain_factions` |
| `factions.ts` | Faction stats | `user_faction_stats` |
| `habits.ts` | Habit CRUD + tracking | `habits`, `habit_logs` |
| `geist.ts` | Mood + journal | `mood_logs`, `journal_entries` |
| `soziales.ts` | Social events | `social_events` |
| `karriere.ts` | Career tracking | `job_history`, `salary_history` |
| `contacts.ts` | Contact management | `contacts` |
| `user-skills.ts` | User skill stats | `user_skills`, `experiences` |

## Test Grouping Strategy (Wave Structure)

### Wave 1: Navigation & Page Load (TEST-01, TEST-04, TEST-05)
**Goal:** Verify all pages load without errors
**Tests:**
- Dashboard displays and links to all sections
- Click each navigation link (Quests, Habits, Skills, Factions, Profile, Settings)
- Skills page loads, displays skills, opens detail page
- Factions overview (via radar chart click to /domain/[id])
- Verify 6 factions appear: Körper, Geist, Seele, Finanzen, Soziales, Karriere

**Rationale:** Foundation tests - if pages don't load, nothing else works

### Wave 2: CRUD Operations (TEST-02, TEST-03, TEST-06, TEST-10)
**Goal:** Verify create/update operations work
**Tests:**
- Create Quest (full form submission flow)
- Complete Quest (status change)
- Track Habit (positive/negative)
- Edit Profile (change display_name, bio)
- Create Journal Entry (Geist page)

**Rationale:** Core user actions - validates form handling and API integration

### Wave 3: Data Persistence & Isolation (TEST-07, TEST-08, TEST-09)
**Goal:** Verify data persists and users are isolated
**Tests:**
- Settings: Toggle theme, verify persists after reload
- Soziales: Verify no hardcoded UUID in requests, correct user data
- Karriere: Verify no hardcoded UUID in requests, correct user data
- Profile: Edit → reload → verify changes persist

**Rationale:** Security-critical - validates Phase 1 fixes and RLS policies

## Potential Challenges

### Challenge 1: Faction Overview Page Missing
**Issue:** TEST-05 requires viewing all 6 factions with XP/Level, but no dedicated `/factions` page exists
**Evidence:** Page inventory shows faction-specific pages (`/soziales`, `/karriere`) but no overview
**Solution:** Test via Dashboard radar chart (ClickableLifeBalanceRadar component) which displays all 6 factions, or navigate to each faction page individually

### Challenge 2: Async XP Updates
**Issue:** Quest completion triggers complex XP flow (quest → skill → faction → user_stats)
**Evidence:** `/api/quests/[id]/complete/route.ts` has fallback logic (lines 62-192) with multiple DB operations
**Solution:** Add explicit waits after Quest completion, reload page to force fresh data load

### Challenge 3: Skills Page Navigation
**Issue:** TEST-04 requires "opens details" but skill detail route is `/skill/[id]`, not linked from `/skills`
**Evidence:** No `/skills` page exists, only `/skill/[id]` detail page
**Solution:** Either test via domain page (`/domain/[id]` shows skill tree) or navigate directly to skill detail URL

### Challenge 4: Empty Test Data
**Issue:** Tests may fail if E2E user has no quests, habits, or skills
**Evidence:** Tests use real database, not fixtures
**Solution:** Create seed data in auth.setup.ts or write tests resilient to empty states (test creation flows first)

### Challenge 5: Theme Toggle Persistence
**Issue:** TEST-07 requires theme toggle persist, but storage mechanism unknown
**Evidence:** Settings page imports ThemeToggle but implementation details not researched
**Solution:** Inspect localStorage/cookies after toggle, verify value persists after page reload

## Open Questions

Things that couldn't be fully resolved:

1. **Faction Overview Page**
   - What we know: Dashboard has ClickableLifeBalanceRadar showing all 6 factions
   - What's unclear: Is there a dedicated `/factions` page or should tests use radar chart clicks?
   - Recommendation: Test via Dashboard radar chart → click faction → verify `/domain/[id]` loads

2. **Skills List Page**
   - What we know: `/skill/[id]` exists for detail view
   - What's unclear: Does `/skills` page exist for list view?
   - Recommendation: Test via domain page skill tree or navigate directly to `/skill/[id]`

3. **Theme Toggle Storage Mechanism**
   - What we know: ThemeToggle component exists, Settings page uses it
   - What's unclear: localStorage key, cookie name, or context provider?
   - Recommendation: During test implementation, inspect storage after toggle

4. **Streak Counter Logic**
   - What we know: Habit tracking logs completion via `/api/habits/complete`
   - What's unclear: Where is streak counter displayed? Dashboard? Habits page?
   - Recommendation: Verify streak display location during Wave 2 testing

5. **XP Bar Visibility**
   - What we know: Skill detail page shows XP progress bars
   - What's unclear: Are progress bars animated? Do they need wait for animation?
   - Recommendation: Add small timeout if bars use framer-motion

## Sources

### Primary (HIGH confidence)
- **Codebase exploration:** 29 pages, 40+ API routes, 30+ data layer modules
- **Existing E2E tests:** `tests/e2e/security-validation.spec.ts` (11 tests), `tests/e2e/api-security.spec.ts` (14 tests)
- **Playwright config:** `playwright.config.ts` - storageState, webServer, single worker
- **Auth setup:** `tests/e2e/auth.setup.ts` - proven authentication pattern
- **API implementations:** Quest complete route shows complex XP flow patterns
- **REQUIREMENTS.md:** TEST-01 through TEST-10 specifications

### Secondary (MEDIUM confidence)
- **Component structure:** inferred from index.ts exports and page imports
- **Data flows:** traced through data layer module signatures
- **Navigation patterns:** observed in Dashboard component and page layouts

### Tertiary (LOW confidence)
- **Theme toggle mechanism:** not verified (need inspection during testing)
- **Streak counter location:** not verified (need exploration during testing)
- **Skills list page existence:** not confirmed (may not exist)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Playwright already configured and working (25 tests passing)
- Architecture: HIGH - Existing tests demonstrate proven patterns
- Pitfalls: MEDIUM - Based on common Playwright issues + project-specific observations (async dropdowns, framer-motion)

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - Playwright/Next.js patterns are stable)
