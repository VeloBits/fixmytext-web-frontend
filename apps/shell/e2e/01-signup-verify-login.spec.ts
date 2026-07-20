import { test, expect } from '@playwright/test';

// Auth was migrated to Keycloak (PKCE auth-code flow, hosted login/registration
// pages). The shell's /app/signup and /app/login routes no longer render a local
// form — they immediately call userManager.signinRedirect(), so the browser ends
// up on Keycloak's hosted page. The previous version of this spec filled a local
// #displayName/#email/#password form that no longer exists.

test('signup redirects to the Keycloak hosted registration/login page', async ({ page }) => {
  await page.goto('/app/signup');

  // signinRedirect({ prompt: 'create' }) sends the browser to Keycloak's
  // openid-connect auth endpoint on the configured realm. Assert on /realms/
  // (robust to the dev vs prod realm/host) rather than a hard-coded origin.
  await page.waitForURL(/\/realms\//, { timeout: 15_000 });
  expect(page.url()).toContain('/realms/');

  // Keycloak's hosted page renders a username/password form (the themed
  // FixMyText login). The registration variant (prompt=create) shows the
  // same #password field, so assert on that to confirm we reached Keycloak.
  await expect(page.locator('#password')).toBeVisible({ timeout: 10_000 });
});

// The end-to-end "register → verify email via link → login" journey now runs
// entirely inside Keycloak (account creation, email verification action, and
// credential entry are all Keycloak-owned). Exercising it from Playwright
// requires a seeded test realm with a deterministic user + an email sink to
// capture the verification link — neither is wired up in this environment yet.
// Skipped (not deleted) so the intent is preserved once a test realm exists.
// See backend/docs/TECH_DEBT_ROADMAP.md for the Keycloak test-realm follow-up.
test.skip('full signup → verify email → login journey (needs a test Keycloak realm)', async () => {
  // TODO: point E2E_KEYCLOAK_URL at a disposable realm, register through the
  // hosted page, pull the verification link from the mail sink, complete the
  // "Verify Email" required action, then sign in and assert landing on /app.
});
