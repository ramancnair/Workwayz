import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for ProjectFlow
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests sequentially for state consistency in local dev */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI or failed runs */
  retries: process.env.CI ? 2 : 0,
  /* Single worker for deterministic execution against local server */
  workers: 1,
  /* Generous timeout for Next.js dev server on-demand compilation and UI runner */
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  /* Reporters */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['./e2e/helpers/playwrightMatrixReporter.ts'],
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL for actions like await page.goto('/') */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',

    /* Timeouts */
    navigationTimeout: 45000,
    actionTimeout: 20000,

    /* Diagnostic traces and artifacts - lightweight to preserve resources */
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  /* Chromium project configured for desktop viewport */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        },
      },
    },
  ],

  /* Dev server hook */
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
