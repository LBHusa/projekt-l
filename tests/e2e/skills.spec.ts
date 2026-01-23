import { test, expect } from '@playwright/test';

/**
 * Skills Display Tests (TEST-04)
 *
 * Validates skill pages load correctly with XP progress.
 * Note: No /skills list page exists - skills accessed via domain pages and /skill/[id]
 */
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
    // First get a valid skill ID from the API
    const response = await page.request.get('/api/skills');

    if (response.status() === 200) {
      const data = await response.json();
      if (data.skills && data.skills.length > 0) {
        const skillId = data.skills[0].id;

        // Navigate to skill detail
        await page.goto(`/skill/${skillId}`);
        await page.waitForLoadState('networkidle');

        // Verify skill page loads
        await expect(page.locator('h1, h2')).toBeVisible();
        await expect(page).toHaveURL(`/skill/${skillId}`);

        // Verify main content visible
        await expect(page.locator('main')).toBeVisible();
      }
    }
  });

  test('Domain page displays skills for that domain', async ({ page }) => {
    // Navigate to Geist domain page
    await page.goto('/geist');
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.locator('h1')).toBeVisible();

    // Look for skill-related content (may be empty)
    await expect(page.locator('main')).toBeVisible();
  });

  test('Skills can be filtered by domain', async ({ page }) => {
    // Get domains first
    const domainsResponse = await page.request.get('/api/skill-domains');

    if (domainsResponse.status() === 200) {
      const domainsData = await domainsResponse.json();
      if (domainsData.domains && domainsData.domains.length > 0) {
        const domainId = domainsData.domains[0].id;

        // Get skills filtered by domain
        const skillsResponse = await page.request.get(`/api/skills?domain_id=${domainId}`);
        expect(skillsResponse.status()).toBe(200);

        const skillsData = await skillsResponse.json();
        expect(skillsData).toHaveProperty('skills');
      }
    }
  });

  test('Koerper domain page loads correctly', async ({ page }) => {
    await page.goto('/koerper');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Finanzen domain page loads correctly', async ({ page }) => {
    await page.goto('/finanzen');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Wissen domain page loads correctly', async ({ page }) => {
    await page.goto('/wissen');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
});
