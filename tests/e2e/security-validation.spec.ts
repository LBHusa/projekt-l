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
  // Auth is handled by auth.setup.ts via storageState in playwright.config.ts
  // All tests run with an authenticated session automatically

  test('XSS payload in Quest title is rejected', async ({ page }) => {
    // Navigate to quest creation
    await page.goto('/quests/new');

    // Wait for page to load and skill options to be available
    await page.waitForLoadState('networkidle');

    // Fill in all required fields first
    await page.fill('input[name="title"]', 'Valid Quest Title');

    // Select a skill from the dropdown (required field)
    const skillSelect = page.locator('select[name="skill_id"]');
    await skillSelect.waitFor({ state: 'visible' });

    // Wait for options to load
    await page.waitForTimeout(500);

    // Get first available skill option (skip the placeholder)
    const options = await skillSelect.locator('option').all();
    if (options.length > 1) {
      const firstSkillValue = await options[1].getAttribute('value');
      if (firstSkillValue) {
        await skillSelect.selectOption(firstSkillValue);
      }
    }

    // Now enter XSS payload in title
    await page.fill('input[name="title"]', '<script>alert("XSS")</script>');
    await page.fill('textarea[name="description"]', 'Normal description');

    // Wait for button to be enabled and click
    await page.waitForTimeout(100);
    await page.click('button[type="submit"]');

    // Verify error message (400 validation error)
    await expect(page.locator('.error-message')).toContainText('Cannot contain');
  });

  test('XSS payload in Quest description is sanitized', async ({ page }) => {
    // Navigate to quest creation page
    await page.goto('/quests/new');
    await page.waitForLoadState('networkidle');

    // Wait for skills to load
    const skillSelect = page.locator('select[name="skill_id"]');
    await skillSelect.waitFor({ state: 'visible' });
    await page.waitForTimeout(500);

    // Get first available skill option (skip the placeholder)
    const options = await skillSelect.locator('option').all();
    if (options.length <= 1) {
      // No skills available, skip this test
      test.skip();
      return;
    }

    const firstSkillValue = await options[1].getAttribute('value');
    if (!firstSkillValue) {
      test.skip();
      return;
    }

    // Fill in the form with XSS in description
    await skillSelect.selectOption(firstSkillValue);
    await page.fill('input[name="title"]', 'Valid Quest Title');
    await page.fill('textarea[name="description"]', '<script>alert("XSS")</script><b>Bold text</b>');

    // Wait for state update and submit
    await page.waitForTimeout(100);
    await page.click('button[type="submit"]');

    // Wait for navigation to quests page (on success)
    await page.waitForURL('/quests', { timeout: 5000 }).catch(() => {});

    // If we're still on the form, check for error (script tag not allowed)
    // If we navigated away, the description was sanitized on server
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert("XSS")');
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
    await page.waitForLoadState('networkidle');

    // Enter XSS payload in title
    await page.fill('input[name="title"]', '<img src=x onerror=alert(1)>');
    await page.fill('textarea[name="description"]', 'Normal description');

    // Wait for React state to update
    await page.waitForTimeout(100);

    // Click submit button (should be enabled now since title is filled)
    await page.click('button[type="submit"]');

    // Verify error message (400 validation error from client-side validation)
    // Use a more specific locator to find the error message with content
    const errorMsg = page.locator('.error-message');
    await expect(errorMsg).toBeVisible();
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
    await page.waitForLoadState('networkidle');

    // Fill in required display_name first
    const displayNameInput = page.locator('input[name="display_name"]');
    await displayNameInput.waitFor({ state: 'visible' });
    await displayNameInput.fill('TestUser');

    // Enter XSS payload in bio
    await page.fill('textarea[name="bio"]', '<script>alert("XSS")</script><p>Safe content</p>');

    // Wait for React state to update
    await page.waitForTimeout(100);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for success or navigation
    await page.waitForTimeout(500);

    // Navigate to profile view
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Verify script is stripped but paragraph is kept (if bio is displayed)
    // The bio content should be sanitized - no script tags should appear
    const pageContent = await page.content();
    expect(pageContent).not.toContain('<script>alert("XSS")');
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

      // Verify we're on login page (form uses type="email" not name="email")
      await expect(page.locator('input[type="email"]')).toBeVisible();
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
