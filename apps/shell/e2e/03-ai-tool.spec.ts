import { test, expect } from '@playwright/test';
import { registerVerifiedUser, API_URL } from './helpers';

test('AI tool (Summarize) returns backend response (AI_BACKEND=fake)', async ({
  page,
  request,
}) => {
  // AI tools require auth — register + verify a user, then seed tokens.
  const { email, password, verificationToken } =
    await registerVerifiedUser(request);

  // Verify email via the API directly to keep this spec focused.
  const verify = await request.post(`${API_URL}/api/v1/auth/verify-email`, {
    data: { token: verificationToken },
  });
  expect(verify.ok()).toBeTruthy();

  // Log in via UI so the frontend's auth state (cookie + redux) is populated.
  await page.goto('/app/login');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/app\/?$/, { timeout: 15_000 });

  const input = page.locator('textarea.tu-textarea').first();
  await input.fill('The quick brown fox jumps over the lazy dog.');

  await page.getByText('Summarize', { exact: true }).first().click();

  // The fake AI backend returns text prefixed with "[fake-ai]".
  await expect(page.getByText(/\[fake-ai\]/i)).toBeVisible({ timeout: 15_000 });
});
