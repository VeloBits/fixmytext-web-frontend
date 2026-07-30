import { defineConfig, devices } from '@playwright/test';

// Hermetic Module Federation smoke gate. Runs against the local prod compose stack
// (router on :3000) brought up by CI - backend + Keycloak are mocked in the spec, so
// no real services are needed. Kept separate from playwright.config.ts (the deployed
// E2E suite) because this one has a fixed local origin and a different test dir.
const SMOKE_URL = process.env.SMOKE_FRONTEND_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e-smoke',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: SMOKE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
