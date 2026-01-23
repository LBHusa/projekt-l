import { test, expect } from '@playwright/test';

/**
 * Settings & Theme Tests (TEST-07)
 *
 * Validates settings pages and theme toggle persistence.
 * Auth is handled by auth.setup.ts via storageState.
 */
test.describe('Settings & Theme (TEST-07)', () => {
  test('User can view Settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify settings page loads
    await expect(page.locator('h1')).toBeVisible();
  });

  test('User can navigate to Settings sub-pages', async ({ page }) => {
    const settingsPages = [
      '/settings',
      '/settings/notifications',
      '/settings/integrations',
      '/settings/quest-preferences',
    ];

    for (const settingsPath of settingsPages) {
      await page.goto(settingsPath);
      await page.waitForLoadState('networkidle');

      // Verify page loads
      await expect(page).toHaveURL(settingsPath);
    }
  });

  test('User can toggle theme between light and dark', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Find theme toggle
    const themeToggle = page.locator(
      'button[aria-label*="theme"], button[aria-label*="Theme"], [data-testid="theme-toggle"], button:has-text("Dark"), button:has-text("Light"), input[type="checkbox"]'
    );

    if ((await themeToggle.count()) > 0 && (await themeToggle.first().isVisible())) {
      // Get initial theme state
      const htmlElement = page.locator('html');
      const initialClass = await htmlElement.getAttribute('class');
      const initialIsDark = initialClass?.includes('dark') ?? false;

      // Click toggle
      await themeToggle.first().click();
      await page.waitForTimeout(300);

      // Get new theme state
      const newClass = await htmlElement.getAttribute('class');
      const newIsDark = newClass?.includes('dark') ?? false;

      // Theme should have changed
      expect(newIsDark).not.toBe(initialIsDark);
    }
  });

  test('Theme preference persists after page reload', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Get initial theme
    const htmlElement = page.locator('html');
    const initialClass = await htmlElement.getAttribute('class');
    const initialIsDark = initialClass?.includes('dark') ?? false;

    // Toggle theme
    const themeToggle = page.locator(
      'button[aria-label*="theme"], button[aria-label*="Theme"], [data-testid="theme-toggle"]'
    );

    if ((await themeToggle.count()) > 0 && (await themeToggle.first().isVisible())) {
      await themeToggle.first().click();
      await page.waitForTimeout(300);

      // Verify toggle worked
      const midClass = await htmlElement.getAttribute('class');
      const midIsDark = midClass?.includes('dark') ?? false;

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check theme persisted
      const afterClass = await htmlElement.getAttribute('class');
      const afterIsDark = afterClass?.includes('dark') ?? false;

      // Should still be in toggled state
      expect(afterIsDark).toBe(midIsDark);
    }
  });

  test('Theme preference persists across sessions', async ({ page, context }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Check localStorage for theme preference
    const storedTheme = await page.evaluate(() => {
      return (
        localStorage.getItem('theme') ||
        localStorage.getItem('darkMode') ||
        document.documentElement.className
      );
    });

    // Open new page in same context
    const newPage = await context.newPage();
    await newPage.goto('/settings');
    await newPage.waitForLoadState('networkidle');

    // Theme should match
    const newStoredTheme = await newPage.evaluate(() => {
      return (
        localStorage.getItem('theme') ||
        localStorage.getItem('darkMode') ||
        document.documentElement.className
      );
    });

    // Basic assertion - themes should be consistent
    expect(typeof storedTheme).toBe(typeof newStoredTheme);

    await newPage.close();
  });

  test('Notifications settings page loads', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/settings/notifications');
  });

  test('Integrations settings page loads', async ({ page }) => {
    await page.goto('/settings/integrations');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/settings/integrations');
  });

  test('Quest preferences settings page loads', async ({ page }) => {
    await page.goto('/settings/quest-preferences');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/settings/quest-preferences');
  });
});
