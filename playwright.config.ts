import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local for E2E test credentials
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

/**
 * Playwright E2E Test Configuration for Projekt L
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 2, // Retry flaky tests both locally and in CI
  workers: 1, // Single worker to avoid test data conflicts
  reporter: 'html',
  timeout: 60000, // 60s per test (default is 30s)
  expect: {
    timeout: 10000, // 10s for expect assertions
  },

  use: {
    baseURL: 'http://localhost:3050',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30000, // 30s for navigation
    actionTimeout: 15000, // 15s for actions (clicks, fills)
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'unauthenticated',
      testMatch: '**/api-security.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // No storageState = unauthenticated requests
      },
      // No dependencies on setup = runs without auth
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: '**/api-security.spec.ts', // Security tests run in unauthenticated project
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 3050',
    url: 'http://localhost:3050',
    reuseExistingServer: !process.env.CI,
    timeout: 180000, // 3 minutes for server startup
    stdout: 'pipe',
    stderr: 'pipe',
    // Wait for healthcheck before starting tests
    ignoreHTTPSErrors: true,
  },
});
