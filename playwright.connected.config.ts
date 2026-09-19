import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/connected',
  workers: 1,
  timeout: 90000,
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  reporter: 'list',
});
