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
  retries: 3, // Increase retries for flaky network issues
  workers: 1, // Single worker to avoid test data conflicts
  reporter: 'html',
  timeout: 90000, // 90s per test (increased for slow server responses)
  expect: {
    timeout: 15000, // 15s for expect assertions (increased)
  },

  use: {
    baseURL: 'http://localhost:3050',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 45000, // 45s for navigation (increased for server slowness)
    actionTimeout: 20000, // 20s for actions (increased)
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
    },
    {
      name: 'unauthenticated',
      testMatch: '**/api-security.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
        // No storageState = unauthenticated requests
      },
      // No dependencies on setup = runs without auth
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/user.json',
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
      dependencies: ['setup'],
      testIgnore: '**/api-security.spec.ts', // Security tests run in unauthenticated project
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'tests/e2e/.auth/user.json',
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      },
      dependencies: ['setup'],
      testIgnore: '**/api-security.spec.ts',
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 12'],
        storageState: 'tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: '**/api-security.spec.ts',
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 3050',
    url: 'http://localhost:3050',
    reuseExistingServer: !process.env.CI,
    timeout: 240000, // 4 minutes for server startup (increased)
    stdout: 'pipe',
    stderr: 'pipe',
    ignoreHTTPSErrors: true,
  },
});
