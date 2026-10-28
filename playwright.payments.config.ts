import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: 'multiple-payments.spec.ts',
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3001', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node e2e/payments-server.cjs',
    url: 'http://127.0.0.1:3001/api/health',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
