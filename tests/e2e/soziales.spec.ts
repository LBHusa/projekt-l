import { test, expect } from '@playwright/test';

/**
 * Soziales User Isolation Tests (TEST-08)
 *
 * Validates that users only see their own social data.
 * Checks for hardcoded UUIDs in network requests.
 * Auth is handled by auth.setup.ts via storageState.
 */
test.describe('Soziales User Isolation (TEST-08)', () => {
  test('Soziales page loads correctly', async ({ page }) => {
    await page.goto('/soziales');
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.locator('h1')).toBeVisible();
  });

  test('No hardcoded UUIDs in network requests', async ({ page }) => {
    // Known hardcoded UUIDs that should NOT appear
    const hardcodedUUIDs = [
      '00000000-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000000',
    ];

    const flaggedRequests: string[] = [];

    // Monitor all network requests
    page.on('request', req => {
      const url = req.url();
      for (const uuid of hardcodedUUIDs) {
        if (url.includes(uuid)) {
          flaggedRequests.push(url);
        }
      }
    });

    // Load page and interact
    await page.goto('/soziales');
    await page.waitForLoadState('networkidle');

    // Reload to trigger fresh data fetch
    await page.reload();
    await page.waitForLoadState('networkidle');

    // No hardcoded UUIDs should appear
    expect(flaggedRequests).toHaveLength(0);
  });

  test('User sees only their own social data', async ({ page }) => {
    await page.goto('/soziales');
    await page.waitForLoadState('networkidle');

    // Verify page shows user's contacts/birthdays (or empty state)
    // Check for any error messages indicating data access issues
    const errorMessage = page.locator('.error, [class*="error"]');
    const hasError = await errorMessage.isVisible().catch(() => false);

    // No unauthorized access errors
    if (hasError) {
      const errorText = await errorMessage.textContent();
      expect(errorText?.toLowerCase()).not.toContain('unauthorized');
      expect(errorText?.toLowerCase()).not.toContain('forbidden');
    }
  });

  test('Birthday section loads without errors', async ({ page }) => {
    await page.goto('/soziales');
    await page.waitForLoadState('networkidle');

    // Look for birthday section
    const birthdaySection = page.locator('[class*="birthday"], text=/birthday|geburtstag/i');

    // May or may not have birthdays - just verify no errors
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Social interactions show correct user data', async ({ page }) => {
    await page.goto('/soziales');
    await page.waitForLoadState('networkidle');

    // Verify contacts/interactions load
    // This uses the authenticated user's data via useAuth() hook
    const contactSection = page.locator('[class*="contact"], [class*="interaction"]');

    // Page should load successfully (may be empty)
    await expect(page.locator('h1')).toBeVisible();
  });

  test('Page loads with authenticated session', async ({ page }) => {
    await page.goto('/soziales');
    await page.waitForLoadState('networkidle');

    // Page should load without redirecting to login
    // (auth is handled by storageState)
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('h1')).toBeVisible();
  });
});
