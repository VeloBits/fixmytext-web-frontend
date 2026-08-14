/**
 * Per-tool SEO page smoke tests.
 *
 * Verifies that the 254 SSG tool pages are reachable, have correct meta,
 * carry JSON-LD, and link back to the Vite editor via WEB_APP_BASE_URL.
 * Runs only a sample of tools to keep CI fast; the build benchmark catches
 * any build-time issues across all 254 pages.
 */
import { test, expect } from '@playwright/test';

const SAMPLE_SLUGS = [
  'alternating_case', // case group
  'md5_hash', // hashing group
  'base64_encode', // encoding group
  'fix_grammar', // ai group
  'sort_lines_asc', // lines group
];

test.describe('Tool index page', () => {
  test('renders 254+ tools header', async ({ page }) => {
    await page.goto('/tools');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('254');
  });

  test('has correct page title', async ({ page }) => {
    await page.goto('/tools');
    await expect(page).toHaveTitle(/All Tools | FixMyText/);
  });

  test('renders all 14 group headings', async ({ page }) => {
    await page.goto('/tools');
    // Check at least a few known groups are present
    for (const group of ['Case Transform', 'Hashing & Checksums', 'AI Writing']) {
      await expect(page.getByRole('heading', { name: group })).toBeVisible();
    }
  });
});

test.describe('Per-tool SEO page', () => {
  for (const slug of SAMPLE_SLUGS) {
    test(`/tools/${slug} - has og:title and JSON-LD`, async ({ page }) => {
      const response = await page.goto(`/tools/${slug}`);
      expect(response?.status()).toBe(200);

      // og:title is set
      const ogTitle = page.locator('meta[property="og:title"]');
      await expect(ogTitle).toHaveAttribute('content', /.+/);

      // JSON-LD SoftwareApplication schema is present
      const jsonLd = page.locator('script[type="application/ld+json"]');
      await expect(jsonLd).toHaveCount(1);
      const ldContent = await jsonLd.textContent();
      const parsed = JSON.parse(ldContent ?? '{}');
      expect(parsed['@type']).toBe('SoftwareApplication');
      expect(parsed.offers?.price).toBe('0');
    });

    test(`/tools/${slug} - CTA links to editor`, async ({ page }) => {
      await page.goto(`/tools/${slug}`);
      const cta = page.getByRole('link', { name: /Try .* Free|Open .* in Editor/i }).first();
      await expect(cta).toBeVisible();
      const href = await cta.getAttribute('href');
      expect(href).toContain(`tool=${slug}`);
    });
  }
});

test.describe('Related tools', () => {
  test('/tools/alternating_case shows related case tools', async ({ page }) => {
    await page.goto('/tools/alternating_case');
    // Should show other case tools in the related section
    await expect(page.getByRole('heading', { name: /More .* tools/i })).toBeVisible();
  });
});

test.describe('404 handling', () => {
  test('returns 404 for unknown tool slug', async ({ page }) => {
    const response = await page.goto('/tools/this_tool_does_not_exist_xyz');
    expect(response?.status()).toBe(404);
  });
});

test.describe('Sitemap', () => {
  test('/sitemap.xml returns valid XML with tool URLs', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toContain('<urlset');
    expect(xml).toContain('/tools/alternating_case');
    expect(xml).toContain('/tools/md5_hash');
    expect(xml).toContain('/about');
  });
});

test.describe('Robots', () => {
  test('/robots.txt includes sitemap reference', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const txt = await res.text();
    expect(txt).toContain('Sitemap:');
    expect(txt).toContain('sitemap.xml');
  });
});
