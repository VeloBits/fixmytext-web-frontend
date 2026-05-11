import { test, expect } from '@playwright/test';
import { uniqueEmail, apiPost } from './helpers.js';

test('signup → verify email via link → login', async ({ page, request }) => {
  const email = uniqueEmail();
  const password = 'TestPass123!';

  // Signup via UI.
  await page.goto('/signup');
  await page.locator('#displayName').fill('E2E Tester');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('#confirmPassword').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });

  // The /register response does not echo the verification token; we use the
  // authenticated /auth/resend-verification endpoint, which does (when
  // EMAIL_BACKEND=console). The UI is now logged in via cookies + localStorage
  // tokens, but to keep this spec deterministic we call the API directly with
  // a freshly-issued access token from a programmatic login.
  const loginRes = await apiPost(request, '/api/v1/auth/login', {
    email,
    password,
    remember_me: false,
  });
  expect(loginRes.ok()).toBeTruthy();
  const { access_token } = await loginRes.json();

  const resend = await apiPost(
    request,
    '/api/v1/auth/resend-verification',
    {},
    access_token,
  );
  expect(resend.ok()).toBeTruthy();
  const { verification_token } = await resend.json();
  expect(verification_token).toBeTruthy();

  // Visit the verify-email page with the token in the URL.
  await page.goto(`/verify-email?token=${encodeURIComponent(verification_token)}`);
  await expect(page.getByText(/Email verified/i)).toBeVisible({ timeout: 10_000 });

  // Log in via UI.
  await page.goto('/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
});
