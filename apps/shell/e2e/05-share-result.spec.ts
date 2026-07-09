import { test, expect } from '@playwright/test';

test('share a local-tool result and open the share link', async ({ page, context }) => {
  // Grant clipboard so the share handler's writeText doesn't blow up.
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);

  await page.goto('/app/');
  await page.locator('textarea.tu-textarea').first().fill('hello world');
  await page.getByText('MD5', { exact: true }).first().click();
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
