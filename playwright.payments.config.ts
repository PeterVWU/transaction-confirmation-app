import { defineConfig, devices } from '@playwright/test';
const baseURL = `http://127.0.0.1:${process.env.ECOM343_TEST_FRONTEND_PORT || 3001}`;
export default defineConfig({
  testDir: './e2e',
  testMatch: 'multiple-payments.spec.ts',
  workers: 1,
  reporter: 'list',
  use: { baseURL, screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node e2e/payments-server.cjs',
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 120000,
  },
});
