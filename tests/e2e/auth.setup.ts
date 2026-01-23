import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

/**
 * Authentication setup for E2E tests
 *
 * This setup runs once before all tests and saves the auth state
 * to be reused by all test files via storageState.
 *
 * Prerequisites:
 * - E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD in .env.local
 * - Test user created in Supabase with email verified
 */
setup('authenticate as test user', async ({ page }) => {
  // Navigate to login page
  await page.goto('/auth/login');

  // Fill login form (inputs use type="email" and type="password" instead of name)
  await page.fill('input[type="email"]', process.env.E2E_TEST_USER_EMAIL || '');
  await page.fill('input[type="password"]', process.env.E2E_TEST_USER_PASSWORD || '');

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to home page (successful login)
  await page.waitForURL('/');

  // Verify login was successful
  await expect(page).toHaveURL('/');

  // Save auth state for reuse
  await page.context().storageState({ path: authFile });
});
