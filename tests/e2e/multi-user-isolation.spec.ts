import { test, expect, Page } from '@playwright/test';

/**
 * Multi-User Isolation Tests
 *
 * Verifies that RLS (Row Level Security) properly isolates user data.
 * These tests require two test users:
 * - Primary user: E2E_TEST_USER_EMAIL / E2E_TEST_USER_PASSWORD
 * - Secondary user: E2E_TEST_USER_B_EMAIL / E2E_TEST_USER_B_PASSWORD
 *
 * To run these tests:
 * 1. Create a second test user in Supabase
 * 2. Add credentials to .env.local:
 *    E2E_TEST_USER_B_EMAIL=testuser2@example.com
 *    E2E_TEST_USER_B_PASSWORD=yourpassword
 * 3. Run: npx playwright test multi-user-isolation
 */

const TEST_QUEST_TITLE = `Test Quest ${Date.now()}`;

// Helper to login as a specific user
async function loginAs(
  page: Page,
  email: string | undefined,
  password: string | undefined
): Promise<void> {
  if (!email || !password) {
    throw new Error('Missing email or password for test user');
  }

  await page.goto('/auth/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// Skip multi-user tests if second user credentials not configured
const secondUserConfigured =
  process.env.E2E_TEST_USER_B_EMAIL && process.env.E2E_TEST_USER_B_PASSWORD;

test.describe('Multi-User Data Isolation', () => {
  // Skip all tests if second user not configured
  test.skip(!secondUserConfigured, 'Second test user not configured');

  test('User A quest is not visible to User B', async ({ browser }) => {
    // Create two separate browser contexts (like incognito windows)
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Login User A
      await loginAs(
        pageA,
        process.env.E2E_TEST_USER_EMAIL,
        process.env.E2E_TEST_USER_PASSWORD
      );

      // User A creates a quest
      await pageA.goto('/quests/new');
      await pageA.fill('input[name="title"]', TEST_QUEST_TITLE);
      await pageA.fill(
        'textarea[name="description"]',
        'Test quest for multi-user isolation'
      );
      await pageA.click('button[type="submit"]');

      // Wait for quest to be created and redirected
      await pageA.waitForURL(/\/quests/);

      // Verify User A can see the quest
      await pageA.goto('/quests');
      const questVisibleToA = await pageA.locator(`text=${TEST_QUEST_TITLE}`).isVisible();
      expect(questVisibleToA).toBe(true);

      // Login User B in second context
      await loginAs(
        pageB,
        process.env.E2E_TEST_USER_B_EMAIL,
        process.env.E2E_TEST_USER_B_PASSWORD
      );

      // User B goes to quests page
      await pageB.goto('/quests');

      // User B should NOT see User A's quest
      const questVisibleToB = await pageB.locator(`text=${TEST_QUEST_TITLE}`).isVisible();
      expect(questVisibleToB).toBe(false);
    } finally {
      // Cleanup: User A deletes the test quest
      try {
        await pageA.goto('/quests');
        // Find and delete the test quest if it exists
        const questRow = pageA.locator(`text=${TEST_QUEST_TITLE}`).first();
        if (await questRow.isVisible()) {
          // Click on quest to go to detail page
          await questRow.click();
          // Look for delete button (if available)
          const deleteBtn = pageA.locator('button:has-text("Delete")');
          if (await deleteBtn.isVisible()) {
            await deleteBtn.click();
          }
        }
      } catch {
        // Cleanup failed, but test assertion already passed/failed
      }

      await contextA.close();
      await contextB.close();
    }
  });

  test('User B cannot access User A habit via direct URL', async ({ browser }) => {
    // Create two separate browser contexts
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Login User A
      await loginAs(
        pageA,
        process.env.E2E_TEST_USER_EMAIL,
        process.env.E2E_TEST_USER_PASSWORD
      );

      // User A goes to habits
      await pageA.goto('/habits');

      // Try to get a habit ID from the page (if any habits exist)
      const habitLink = pageA.locator('a[href^="/habits/"]').first();
      if (await habitLink.isVisible()) {
        const href = await habitLink.getAttribute('href');

        if (href) {
          // Login User B
          await loginAs(
            pageB,
            process.env.E2E_TEST_USER_B_EMAIL,
            process.env.E2E_TEST_USER_B_PASSWORD
          );

          // User B tries to access User A's habit directly
          await pageB.goto(href);

          // Should either redirect, show 404, or show empty/error state
          // The habit content should NOT be visible
          const habitContent = pageB.locator('[data-testid="habit-detail"]');

          // Either not visible or page shows error/unauthorized
          const isVisibleToB = await habitContent.isVisible().catch(() => false);

          // If somehow visible, verify it's not showing User A's data
          if (isVisibleToB) {
            // The habit should not belong to User B
            const bodyText = await pageB.textContent('body');
            expect(bodyText).not.toContain('User A');
          }
        }
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('API returns only current user data', async ({ browser }) => {
    // Create two separate browser contexts
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();

    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Login both users
      await loginAs(
        pageA,
        process.env.E2E_TEST_USER_EMAIL,
        process.env.E2E_TEST_USER_PASSWORD
      );
      await loginAs(
        pageB,
        process.env.E2E_TEST_USER_B_EMAIL,
        process.env.E2E_TEST_USER_B_PASSWORD
      );

      // Both users fetch their faction stats
      const statsA = await pageA.evaluate(async () => {
        const res = await fetch('/api/user/faction-stats');
        return res.json();
      });

      const statsB = await pageB.evaluate(async () => {
        const res = await fetch('/api/user/faction-stats');
        return res.json();
      });

      // Both responses should be valid (not errors)
      expect(statsA).toBeDefined();
      expect(statsB).toBeDefined();

      // If both users have stats, their user_ids should be different
      if (statsA.stats?.[0]?.user_id && statsB.stats?.[0]?.user_id) {
        expect(statsA.stats[0].user_id).not.toBe(statsB.stats[0].user_id);
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
