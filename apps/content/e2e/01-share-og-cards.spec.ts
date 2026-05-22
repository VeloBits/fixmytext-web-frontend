/**
 * Sprint 5c — OG card smoke test.
 *
 * Verifies that the Next.js content app server-renders correct Open Graph and
 * Twitter Card meta tags on /share/[id] pages. This is the primary deliverable
 * of Sprint 5c: before this sprint, social scrapers (Twitter, LinkedIn, Slack)
 * saw blank shells; after this sprint they see rich preview cards.
 *
 * Requires the backend running with a real share record. The share ID is passed
 * via E2E_SHARE_ID env var; tests are skipped if not provided.
 */
import { test, expect } from '@playwright/test';

const SHARE_ID = process.env.E2E_SHARE_ID;
const API_URL = process.env.E2E_API_URL ?? 'http://api-dev.velobits.dev';

test.describe('Share page OG cards', () => {
  test.skip(!SHARE_ID, 'Skipped: set E2E_SHARE_ID to a valid share ID from the running backend');

  test('renders og:title with the tool name', async ({ page }) => {
    await page.goto(`/share/${SHARE_ID}`);
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /.+/);
    const content = await ogTitle.getAttribute('content');
    expect(content).not.toBe('FixMyText — Free Online Text Tools');
    expect(content).toContain('FixMyText');
  });

  test('renders og:description with output preview text', async ({ page }) => {
    await page.goto(`/share/${SHARE_ID}`);
    const ogDesc = page.locator('meta[property="og:description"]');
    await expect(ogDesc).toHaveAttribute('content', /.+/);
  });

  test('renders twitter:card = summary', async ({ page }) => {
    await page.goto(`/share/${SHARE_ID}`);
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute('content', 'summary');
  });

  test('renders og:url pointing at this share', async ({ page }) => {
    await page.goto(`/share/${SHARE_ID}`);
    const ogUrl = page.locator('meta[property="og:url"]');
    await expect(ogUrl).toHaveAttribute('content', new RegExp(`/share/${SHARE_ID}`));
  });

  test('shows the output text and copy button', async ({ page }) => {
    await page.goto(`/share/${SHARE_ID}`);
    // Interactive UI renders (client component hydrated)
    await expect(page.getByText('Copy to Clipboard')).toBeVisible();
    await expect(page.getByText('Try FixMyText')).toBeVisible();
  });
});

test.describe('About page', () => {
  test('renders correct title meta', async ({ page }) => {
    await page.goto('/about');
    await expect(page).toHaveTitle(/About | FixMyText/);
  });

  test('has og:title meta tag', async ({ page }) => {
    await page.goto('/about');
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /About FixMyText/);
  });
});

test.describe('Pricing page', () => {
  test('renders correct title meta', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page).toHaveTitle(/Pricing | FixMyText/);
  });

  test('renders plan cards with Pro pricing visible', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByText('Pro')).toBeVisible();
    await expect(page.getByText('₹399')).toBeVisible();
  });
});

test.describe('Share page — not found / expired', () => {
  test('returns 404 for a nonexistent share ID', async ({ page }) => {
    const response = await page.goto('/share/00000000-0000-0000-0000-000000000000');
    // Next.js notFound() returns 404
    expect(response?.status()).toBe(404);
  });
});

test('create share via API and verify OG card', async ({ request, page }) => {
  // Create a share record via the backend, then verify the OG card renders correctly.
  const res = await request.post(`${API_URL}/api/v1/share`, {
    data: { tool_id: 'uppercase', tool_label: 'UPPERCASE', output_text: 'HELLO WORLD' },
  });
  if (!res.ok()) {
    test.skip(); // backend may require auth for share creation in some configs
    return;
  }
  const share = await res.json() as { id: string };

  await page.goto(`/share/${share.id}`);

  // OG title should contain the tool name
  const ogTitle = page.locator('meta[property="og:title"]');
  await expect(ogTitle).toHaveAttribute('content', /UPPERCASE/);

  // OG description should contain the output preview
  const ogDesc = page.locator('meta[property="og:description"]');
  const desc = await ogDesc.getAttribute('content');
  expect(desc).toContain('HELLO WORLD');
});
