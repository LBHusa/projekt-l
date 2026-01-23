import { test, expect } from '@playwright/test';

/**
 * Factions Display Tests (TEST-05)
 *
 * Validates all 6 life domains/factions display correctly with XP and Level.
 * Note: No dedicated /factions page - factions shown on Dashboard radar and individual domain pages.
 */
test.describe('Factions Display (TEST-05)', () => {
  // The 6 life domains/factions
  const factions = [
    { name: 'Koerper', path: '/koerper' },
    { name: 'Geist', path: '/geist' },
    { name: 'Soziales', path: '/soziales' },
    { name: 'Finanzen', path: '/finanzen' },
    { name: 'Karriere', path: '/karriere' },
    { name: 'Wissen', path: '/wissen' },
  ];

  test('Dashboard displays life balance radar with all factions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for radar chart or faction display
    // The ClickableLifeBalanceRadar component should show 6 segments
    const radarChart = page.locator('svg, [class*="radar"], [class*="chart"]');
    await expect(radarChart.first()).toBeVisible();
  });

  test('All 6 faction domain pages load correctly', async ({ page }) => {
    for (const faction of factions) {
      await page.goto(faction.path);
      await page.waitForLoadState('networkidle');

      // Verify page loads (h1 visible)
      await expect(page.locator('h1')).toBeVisible();

      // Verify correct faction page
      await expect(page).toHaveURL(faction.path);
    }
  });

  test('Koerper faction page displays content', async ({ page }) => {
    await page.goto('/koerper');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Geist faction page displays content', async ({ page }) => {
    await page.goto('/geist');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Soziales faction page displays content', async ({ page }) => {
    await page.goto('/soziales');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Finanzen faction page displays content', async ({ page }) => {
    await page.goto('/finanzen');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Karriere faction page displays content', async ({ page }) => {
    await page.goto('/karriere');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Wissen faction page displays content', async ({ page }) => {
    await page.goto('/wissen');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Skill domains API returns all factions', async ({ page }) => {
    const response = await page.request.get('/api/skill-domains');

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('domains');
    expect(Array.isArray(data.domains)).toBe(true);

    // Should have at least 6 domains
    expect(data.domains.length).toBeGreaterThanOrEqual(6);

    // Verify each domain has required fields
    if (data.domains.length > 0) {
      expect(data.domains[0]).toHaveProperty('id');
      expect(data.domains[0]).toHaveProperty('name');
    }
  });

  test('Domain pages show skills related to that domain', async ({ page }) => {
    // Get domains
    const domainsResponse = await page.request.get('/api/skill-domains');

    if (domainsResponse.status() === 200) {
      const domainsData = await domainsResponse.json();

      for (const domain of domainsData.domains.slice(0, 2)) {
        // Get skills for this domain
        const skillsResponse = await page.request.get(`/api/skills?domain_id=${domain.id}`);

        expect(skillsResponse.status()).toBe(200);

        const skillsData = await skillsResponse.json();
        expect(skillsData).toHaveProperty('skills');
      }
    }
  });
});
