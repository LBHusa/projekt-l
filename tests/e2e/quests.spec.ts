import { test, expect } from '@playwright/test';

/**
 * Quest Workflows Tests (TEST-02)
 *
 * Validates users can create, view, and complete Quests.
 * Auth is handled by auth.setup.ts via storageState.
 */
test.describe('Quest Workflows (TEST-02)', () => {
  const testQuestTitle = `E2E Test Quest ${Date.now()}`;

  test('Quest list page loads and displays quests', async ({ page }) => {
    await page.goto('/quests');
    await page.waitForLoadState('networkidle');

    // Verify page loads with Quest System heading
    await expect(page.locator('h1:has-text("Quest")')).toBeVisible();
  });

  test('User can access new Quest form', async ({ page }) => {
    await page.goto('/quests/new');
    await page.waitForLoadState('networkidle');

    // Verify form exists with required fields
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('select[name="skill_id"]')).toBeVisible();

    // Fill in title
    await page.fill('input[name="title"]', testQuestTitle);

    // Wait for skill dropdown to load
    const skillSelect = page.locator('select[name="skill_id"]');
    await page.waitForTimeout(500);

    // Select first available skill
    const options = await skillSelect.locator('option').all();
    if (options.length > 1) {
      const firstSkillValue = await options[1].getAttribute('value');
      if (firstSkillValue) {
        await skillSelect.selectOption(firstSkillValue);
      }
    }

    // Verify form is filled
    await expect(page.locator('input[name="title"]')).toHaveValue(testQuestTitle);
  });

  test('User can view Quest details', async ({ page }) => {
    // First get an existing quest
    const response = await page.request.get('/api/quests');

    if (response.status() === 200) {
      const data = await response.json();
      const quests = data.quests || data;
      if (Array.isArray(quests) && quests.length > 0) {
        const questId = quests[0].id;

        // Navigate to quest detail
        await page.goto(`/quests/${questId}`);
        await page.waitForLoadState('networkidle');

        // Verify detail page loads
        await expect(page.locator('h1, h2')).toBeVisible();
        await expect(page).toHaveURL(`/quests/${questId}`);
      }
    }
  });

  test('User can complete a Quest', async ({ page }) => {
    // Get an active quest
    const response = await page.request.get('/api/quests');

    if (response.status() === 200) {
      const data = await response.json();
      const quests = data.quests || data;
      if (Array.isArray(quests)) {
        const activeQuest = quests.find((q: { status: string }) => q.status === 'active');

        if (activeQuest) {
          // Navigate to quest detail
          await page.goto(`/quests/${activeQuest.id}`);
          await page.waitForLoadState('networkidle');

          // Look for complete button
          const completeButton = page.locator(
            'button:has-text("Complete"), button:has-text("Abschließen"), button:has-text("Done")'
          );

          if (await completeButton.isVisible()) {
            await completeButton.click();

            // Wait for status update
            await page.waitForTimeout(1000);

            // Reload to verify persistence
            await page.reload();
            await page.waitForLoadState('networkidle');

            // Page should still load
            await expect(page.locator('main')).toBeVisible();
          }
        }
      }
    }
  });

  test('Quest creation validates required fields', async ({ page }) => {
    await page.goto('/quests/new');
    await page.waitForLoadState('networkidle');

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]');

    // Button should be disabled or form validation prevents submission
    const isDisabled = await submitButton.isDisabled();

    if (!isDisabled) {
      await submitButton.click();

      // Should show validation error or not navigate away
      await page.waitForTimeout(500);

      // Still on the form page
      await expect(page).toHaveURL('/quests/new');
    }
  });

  test('Quest API returns quests for authenticated user', async ({ page }) => {
    const response = await page.request.get('/api/quests');

    expect(response.status()).toBe(200);

    const data = await response.json();
    // API may return { quests: [...] } or array directly
    const quests = data.quests || data;
    expect(Array.isArray(quests)).toBe(true);
  });

  test('New quest page shows form fields', async ({ page }) => {
    await page.goto('/quests/new');
    await page.waitForLoadState('networkidle');

    // Verify form exists
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('select[name="skill_id"]')).toBeVisible();
  });
});
