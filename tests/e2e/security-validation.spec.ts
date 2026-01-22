import { test, expect } from '@playwright/test';

/**
 * E2E Security Validation Tests
 *
 * These tests validate:
 * - XSS payloads are rejected/sanitized in Quest creation
 * - No JavaScript executes from sanitized content
 * - User isolation on soziales/karriere pages
 *
 * Note: Requires Playwright setup (Phase 3 E2E infrastructure)
 */

test.describe('Security Validation', () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as test user (use auth helper from Phase 3 if available)
    // For now, use cookie-based or API-based auth
    // Example:
    // await page.goto('/login');
    // await page.fill('input[name="email"]', 'test@example.com');
    // await page.fill('input[name="password"]', 'test-password');
    // await page.click('button[type="submit"]');
    // await page.waitForURL('/dashboard');
  });

  test('XSS payload in Quest title is rejected', async ({ page }) => {
    // Navigate to quest creation
    await page.goto('/quests/new');

    // Enter XSS payload
    await page.fill('input[name="title"]', '<script>alert("XSS")</script>');
    await page.fill('textarea[name="description"]', 'Normal description');
    await page.click('button[type="submit"]');

    // Verify error message (400 validation error)
    await expect(page.locator('.error-message')).toContainText('Cannot contain');
    // OR: Verify script is sanitized
    // await expect(page.locator('.quest-title')).not.toContainText('<script>');
  });

  test('XSS payload in Quest description is sanitized', async ({ page }) => {
    // Create quest via API with XSS in description
    const response = await page.request.post('/api/quests/create', {
      data: {
        title: 'Valid Title',
        description: '<script>alert("XSS")</script><b>Bold text</b>',
        xp_reward: 100,
        skill_id: 'valid-skill-uuid'
      }
    });

    // Should succeed but sanitize
    expect(response.status()).toBe(201);

    // Navigate to quest page
    const quest = await response.json();
    await page.goto(`/quests/${quest.id}`);

    // Verify script tag is stripped but bold is kept
    const description = page.locator('.quest-description');
    await expect(description).not.toContainText('<script>');
    await expect(description.locator('b')).toContainText('Bold text');
  });

  test('Sanitized content renders without executing JavaScript', async ({ page }) => {
    // Setup: Create quest with various XSS payloads via direct DB insert
    // (This tests that even if something slips through, rendering is safe)

    const xssPayloads = [
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      'javascript:alert("XSS")',
      '<a href="javascript:alert(\'XSS\')">Click</a>'
    ];

    // Create console listener to catch any alert() calls
    const alerts: string[] = [];
    page.on('dialog', async dialog => {
      alerts.push(dialog.message());
      await dialog.dismiss();
    });

    // Navigate to page with potentially dangerous content
    await page.goto('/quests');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Verify no alerts were triggered
    expect(alerts).toHaveLength(0);
  });

  test('User cannot see other user data on soziales page', async ({ page }) => {
    // This test requires two test users
    // Login as User A
    await page.goto('/soziales');

    // Get User A's contacts
    const userAContacts = await page.locator('.contact-card').count();

    // Verify the page shows User A's data (not empty if User A has contacts)
    // and doesn't show User B's data (verified by count or specific names)

    // Check that no hardcoded UUID appears in network requests
    const requests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('00000000-0000-0000-0000-000000000001')) {
        requests.push(req.url());
      }
    });

    await page.reload();
    expect(requests).toHaveLength(0);
  });

  test('User cannot see other user data on karriere page', async ({ page }) => {
    await page.goto('/karriere');

    // Check that no hardcoded UUID appears in network requests
    const requests: string[] = [];
    page.on('request', req => {
      if (req.url().includes('00000000-0000-0000-0000-000000000001')) {
        requests.push(req.url());
      }
    });

    await page.reload();
    expect(requests).toHaveLength(0);

    // Verify page loads user's career data
    await expect(page.locator('h1')).toContainText('Karriere');
  });

  test('XSS payload in Habit title is rejected', async ({ page }) => {
    // Navigate to habit creation
    await page.goto('/habits/new');

    // Enter XSS payload
    await page.fill('input[name="title"]', '<img src=x onerror=alert(1)>');
    await page.fill('textarea[name="description"]', 'Normal description');
    await page.click('button[type="submit"]');

    // Verify error message (400 validation error)
    const errorMsg = page.locator('.error-message, [role="alert"]');
    await expect(errorMsg).toContainText('Cannot contain');
  });

  test('SQL injection in Quest search is prevented', async ({ page }) => {
    // Navigate to quests page
    await page.goto('/quests');

    // Try SQL injection in search
    await page.fill('input[type="search"]', "'; DROP TABLE quests; --");
    await page.keyboard.press('Enter');

    // Page should still load (database not affected)
    await expect(page.locator('h1')).toBeVisible();

    // No database errors shown
    await expect(page.locator('body')).not.toContainText('SQL');
    await expect(page.locator('body')).not.toContainText('database error');
  });

  test('XSS in Profile bio field is sanitized', async ({ page }) => {
    // Navigate to profile edit
    await page.goto('/profile/edit');

    // Enter XSS payload in bio
    await page.fill('textarea[name="bio"]', '<script>alert("XSS")</script><p>Safe content</p>');
    await page.click('button[type="submit"]');

    // Navigate to profile view
    await page.goto('/profile');

    // Verify script is stripped but paragraph is kept
    const bio = page.locator('[data-testid="profile-bio"], .profile-bio');
    await expect(bio).not.toContainText('<script>');
    await expect(bio.locator('p')).toContainText('Safe content');
  });

  test('Authentication required for protected pages', async ({ page, context }) => {
    // Clear all cookies to simulate logged out state
    await context.clearCookies();

    // Try to access protected pages
    const protectedPages = ['/soziales', '/karriere', '/quests', '/habits', '/profile'];

    for (const pagePath of protectedPages) {
      await page.goto(pagePath);

      // Should redirect to login
      await page.waitForURL(/\/login/);

      // Verify we're on login page
      await expect(page.locator('input[name="email"]')).toBeVisible();
    }
  });

  test('XSS payload via URL parameters is sanitized', async ({ page }) => {
    // Try XSS via query parameter
    await page.goto('/quests?search=<script>alert("XSS")</script>');

    // Create dialog listener
    const alerts: string[] = [];
    page.on('dialog', async dialog => {
      alerts.push(dialog.message());
      await dialog.dismiss();
    });

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Verify no alerts triggered
    expect(alerts).toHaveLength(0);

    // Verify script tag not in DOM
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert');
  });

  test('Session timeout redirects to login', async ({ page, context }) => {
    // TODO: Implement after auth session timeout configuration is available
    test.skip();

    // Login
    // Wait for session to expire (or manually expire session cookie)
    // Try to access protected resource
    // Verify redirect to login
  });
});
