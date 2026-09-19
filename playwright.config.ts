import { defineConfig, devices } from '@playwright/test';
const hostedUrl = process.env.TEST_BASE_URL;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  timeout: hostedUrl ? 60000 : 30000,
  expect: { timeout: hostedUrl ? 15000 : 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: hostedUrl || 'http://127.0.0.1:4175',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: hostedUrl
    ? undefined
    : {
        command: process.env.TEST_PRODUCTION
          ? 'npm run preview -- --port 4175 --strictPort'
          : 'npm run dev -- --port 4175 --strictPort',
        url: 'http://127.0.0.1:4175',
        reuseExistingServer: false,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } },
    },
  ],
});
