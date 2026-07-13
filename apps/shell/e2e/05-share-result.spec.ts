import { test, expect } from '@playwright/test';
import { dismissOnboardingIfPresent } from './helpers';

test('share a local-tool result and open the share link', async ({ page, context }) => {
  // Grant clipboard so the share handler's writeText doesn't blow up.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  // Deep-link straight into the editor with the tool pre-selected — a plain
  // /app/ visit lands fresh guests on the marketing/landing view without a
  // textarea until a tool is chosen.
  await page.goto('/app/?tool=md5');
  await dismissOnboardingIfPresent(page);

  // The editor's auto-run listens for real keystrokes — fill() alone does not
  // trigger the transform debounce.
  await page.locator('textarea.tu-textarea').first().pressSequentially('hello world');
  await expect(page.getByText('5eb63bbbe01eeed093cb22bb8f5acdc3', { exact: false })).toBeVisible({
    timeout: 10_000,
  });

  // Capture the POST /api/v1/share response to get the share id.
  const shareResp = page.waitForResponse(
    (r) => r.url().includes('/api/v1/share') && r.request().method() === 'POST'
  );
  await page.getByRole('button', { name: /Share result/i }).click();
  const resp = await shareResp;
  expect(resp.ok()).toBeTruthy();
  const { id, share_url: shareUrl } = await resp.json();
  expect(id).toBeTruthy();

  // Navigate to the share page (use path so we stay on the same origin
  // regardless of what host the backend put in share_url).
  await page.goto(`/app/share/${id}`);
  await expect(page.getByText('5eb63bbbe01eeed093cb22bb8f5acdc3', { exact: false })).toBeVisible({
    timeout: 10_000,
  });

  // Sanity: share_url contains the id.
  expect(shareUrl).toContain(id);
});
