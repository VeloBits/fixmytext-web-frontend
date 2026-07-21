import { test, expect } from '@playwright/test';
import { dismissOnboardingIfPresent } from './helpers';

test('local tool (MD5) transforms input client-side', async ({ page }) => {
  // Deep-link straight into the editor with the tool pre-selected — a plain
  // / visit lands fresh guests on the marketing/landing view without a
  // textarea until a tool is chosen.
  await page.goto('/?tool=md5');
  await dismissOnboardingIfPresent(page);

  const input = page.locator('textarea.tu-textarea').first();
  await expect(input).toBeVisible();
  // The editor's auto-run listens for real keystrokes — fill() alone does not
  // trigger the transform debounce.
  await input.pressSequentially('hello world');

  // MD5("hello world") = 5eb63bbbe01eeed093cb22bb8f5acdc3
  await expect(page.getByText('5eb63bbbe01eeed093cb22bb8f5acdc3', { exact: false })).toBeVisible({
    timeout: 10_000,
  });
});
