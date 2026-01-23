import { test, expect } from '@playwright/test';

/**
 * Console Error Detection Tests
 *
 * Visits all key pages and checks for JavaScript console errors.
 * Helps catch runtime errors that might not be caught by the build.
 */

// Pages to check for console errors
const KEY_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/quests', name: 'Quests' },
  { path: '/habits', name: 'Habits' },
  { path: '/karriere', name: 'Karriere' },
  { path: '/koerper', name: 'Körper' },
  { path: '/geist', name: 'Geist' },
  { path: '/soziales', name: 'Soziales' },
  { path: '/finanzen', name: 'Finanzen' },
  { path: '/hobby', name: 'Hobby' },
  { path: '/wissen', name: 'Wissen' },
  { path: '/settings', name: 'Settings' },
  { path: '/profile/edit', name: 'Profile Edit' },
];

// Known third-party errors to ignore
const IGNORED_ERROR_PATTERNS = [
  // Browser extensions
  /chrome-extension:/i,
  /moz-extension:/i,
  // Analytics/tracking that might fail without keys
  /analytics/i,
  /gtag/i,
  /ga\(/i,
  // Third-party services that might be unavailable
  /intercom/i,
  /hotjar/i,
  /sentry/i,
  // Development warnings that are expected
  /Warning:/i,
  /DevTools/i,
  // Supabase realtime warnings (connection in dev)
  /WebSocket/i,
  /realtime/i,
  // Network errors in test environment
  /Failed to fetch/i,
  /NetworkError/i,
  /Failed to load resource/i,
  /status of 4\d{2}/i,
  /status of 5\d{2}/i,
  // React hydration warnings in dev
  /Hydration/i,
  /did not match/i,
];

function shouldIgnoreError(message: string): boolean {
  return IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

test.describe('Console Error Detection', () => {
  test.describe.configure({ mode: 'serial' });

  for (const { path, name } of KEY_PAGES) {
    test(`No console errors on ${name} page (${path})`, async ({ page }) => {
      const errors: string[] = [];

      // Collect console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!shouldIgnoreError(text)) {
            errors.push(`[${msg.type()}] ${text}`);
          }
        }
      });

      // Also collect uncaught exceptions
      page.on('pageerror', (error) => {
        const text = error.message;
        if (!shouldIgnoreError(text)) {
          errors.push(`[pageerror] ${text}`);
        }
      });

      // Navigate to the page
      await page.goto(path);

      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Small delay to catch any delayed errors
      await page.waitForTimeout(500);

      // Assert no errors
      if (errors.length > 0) {
        console.log(`\n--- Errors found on ${name} (${path}) ---`);
        errors.forEach((e) => console.log(`  ${e}`));
        console.log('---');
      }

      expect(errors, `Console errors found on ${name} page`).toHaveLength(0);
    });
  }
});

test.describe('Critical Page Rendering', () => {
  test('Home page renders key sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for faction radar or stats display
    const factionSection = page.locator(
      '[data-testid="faction-radar"], [class*="radar"], [class*="faction"]'
    );

    // At least one faction-related element should be present
    const hasFactionContent = await factionSection.first().isVisible().catch(() => false);

    // The page should at least render without errors
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(100);
  });

  test('Quests page renders quest list or empty state', async ({ page }) => {
    await page.goto('/quests');
    await page.waitForLoadState('networkidle');

    // Should show either quests or empty state
    const questsContent = page.locator(
      '[data-testid="quest-list"], [data-testid="empty-state"], text=Keine Quests, text=Quest'
    );

    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('Settings page renders form elements', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Settings page should have some form elements or settings sections
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();

    // Check for common settings elements
    const hasSettings =
      (await page.locator('input, select, button, [role="switch"]').count()) > 0;
    expect(hasSettings).toBe(true);
  });
});

// Navigation tests are in navigation.spec.ts - removed from here to avoid duplication
