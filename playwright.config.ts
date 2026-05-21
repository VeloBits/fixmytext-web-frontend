import { defineConfig, devices } from '@playwright/test';

// Sprint 5b: dev frontend URL switches to the VeloBits subdomain.
// E2E_FRONTEND_URL is the canonical override (used by CI + alt-port dev).
// Sprint 5e moves the e2e dir into apps/web/e2e and updates this path.
const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://develop-fixmytext.velobits.dev:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: FRONTEND_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
