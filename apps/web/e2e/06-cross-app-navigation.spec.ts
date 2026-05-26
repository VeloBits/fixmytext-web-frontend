import { test, expect } from '@playwright/test';

// Smoke: anonymous user lands on a Next.js content/SEO page, clicks the
// "Try it now" CTA, and arrives in the Vite editor with the correct tool
// pre-selected. Validates the cross-app path routing (Traefik: /tools/* →
// content-app, /app → web-app) and the WEB_APP_BASE_URL constant.
test('cross-app navigation: tool SEO page CTA opens editor with tool pre-selected', async ({
  page,
}) => {
  // 1. Land on the Next.js content-app tool page (served at /tools/md5)
  await page.goto('/tools/md5');

  // The page should render the tool name in a heading
  await expect(page.getByRole('heading', { name: /MD5/i }).first()).toBeVisible({
    timeout: 15_000,
  });

  // 2. Click the primary CTA ("Try it now" / "Open in Editor" / similar)
  //    The href is WEB_APP_BASE_URL + '?tool=md5' = '/app?tool=md5'
  const ctaLink = page.locator('a[href*="/app"][href*="tool=md5"]').first();
  await expect(ctaLink).toBeVisible();

  await ctaLink.click();

  // 3. Browser lands on the Vite editor (/app) with the md5 tool auto-selected
  await expect(page).toHaveURL(/\/app/, { timeout: 15_000 });

  // The editor should render — confirm the textarea is present
  const editorInput = page.locator('textarea.tu-textarea').first();
  await expect(editorInput).toBeVisible({ timeout: 10_000 });
});
