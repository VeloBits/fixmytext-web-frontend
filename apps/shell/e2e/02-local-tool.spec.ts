import { test, expect } from '@playwright/test';

test('local tool (MD5) transforms input client-side', async ({ page }) => {
  await page.goto('/app/');
  const input = page.locator('textarea.tu-textarea').first();
  await expect(input).toBeVisible();
  await input.fill('hello world');

  // The tool name renders as text inside a clickable card (.tu-titem / .tu-tgrid-card).
  // Click the first element whose visible text is exactly "MD5".
  await page.getByText('MD5', { exact: true }).first().click();

  // MD5("hello world") = 5eb63bbbe01eeed093cb22bb8f5acdc3
  await expect(
    page.getByText('5eb63bbbe01eeed093cb22bb8f5acdc3', { exact: false }),
  ).toBeVisible({ timeout: 10_000 });
});
