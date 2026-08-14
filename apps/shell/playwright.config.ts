import { defineConfig, devices } from '@playwright/test';

// The Vite app is served at the origin root (Vite base: '/').
// E2E_FRONTEND_URL overrides the full origin (without path suffix).
const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://local-fixmytext.velobits.dev:3000';

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
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
