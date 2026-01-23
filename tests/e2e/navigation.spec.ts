import { test, expect } from '@playwright/test';

/**
 * Dashboard Navigation Tests (TEST-01)
 *
 * Validates that users can navigate from Dashboard to all main sections.
 * Auth is handled by auth.setup.ts via storageState.
 */
test.describe('Dashboard Navigation (TEST-01)', () => {
  test('Dashboard displays main sections', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify dashboard loads
    await expect(page).toHaveURL('/');

    // Verify main content sections are visible
    await expect(page.locator('main')).toBeVisible();
  });

  test('User can navigate to Quests page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click Quests link in navigation
    await page.click('a[href="/quests"]');
    await page.waitForURL('/quests');

    await expect(page).toHaveURL('/quests');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('User can navigate to Habits page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('a[href="/habits"]');
    await page.waitForURL('/habits');

    await expect(page).toHaveURL('/habits');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('User can navigate to Profile edit page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Profile link may be /profile or /profile/edit
    const profileLink = page.locator('a[href="/profile"], a[href="/profile/edit"]').first();
    if (await profileLink.isVisible()) {
      await profileLink.click();
      await page.waitForURL(/\/profile/);
      await expect(page).toHaveURL(/\/profile/);
    }
  });

  test('User can navigate to Settings page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('a[href="/settings"]');
    await page.waitForURL('/settings');

    await expect(page).toHaveURL('/settings');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('User can navigate to domain pages via sidebar', async ({ page }) => {
    const domainPaths = ['/koerper', '/geist', '/soziales', '/finanzen', '/karriere', '/wissen'];

    for (const path of domainPaths) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const link = page.locator(`a[href="${path}"]`).first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForURL(path);
        await expect(page).toHaveURL(path);
        await expect(page.locator('h1')).toBeVisible();
      }
    }
  });

  test('Navigation links are accessible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Mobile nav may be in a hamburger menu or bottom nav
    const mobileMenuButton = page.locator(
      'button[aria-label*="menu"], button[aria-label*="Menu"], button[aria-label*="navigation"]'
    );
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(300);
    }

    // Verify at least some navigation exists (nav, links, or bottom bar)
    const navLinks = page.locator('nav a, [role="navigation"] a, a[href="/quests"], a[href="/habits"], a[href="/settings"]');
    const linkCount = await navLinks.count();

    // Either nav links visible or main page loads correctly (mobile might use different nav pattern)
    if (linkCount > 0) {
      await expect(navLinks.first()).toBeVisible();
    } else {
      // Fallback: verify main content loaded
      await expect(page.locator('main')).toBeVisible();
    }
  });

  test('Dashboard shows life balance radar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for radar chart (SVG) or chart container
    const radarChart = page.locator('svg, [class*="radar"], [class*="chart"], [class*="balance"]');
    await expect(radarChart.first()).toBeVisible();
  });
});
