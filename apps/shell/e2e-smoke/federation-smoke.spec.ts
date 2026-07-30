import { test, expect, type Response } from '@playwright/test';

/**
 * Hermetic Module Federation smoke test - the PR gate for the host↔remote contract.
 *
 * Unlike the specs in ../e2e (which need a deployed backend + Keycloak), this runs
 * against the local prod compose stack (router on :3000) with the backend + Keycloak
 * MOCKED at the network layer. It exercises exactly the gaps Phase 6.1/6.2 fixed:
 *
 *   1. Each remote's `remoteEntry.js` is reachable under its `/remotes/<name>/` prefix
 *      and returned as JS (proves the remote `base` is baked in and the router serves it).
 *   2. The shell actually mounts the editor remote at `/` (proves the shell's baked
 *      VITE_*_REMOTE_ENTRY URL resolves and the @velobits/app-core store singleton boots -
 *      the editor uses RTK Query hooks, which throw on mount if the store isn't shared).
 *
 * It does NOT assert data flow (that needs a real backend - see e2e.yml).
 */

const REMOTE_ENTRIES = ['/remotes/editor/remoteEntry.js', '/remotes/analytics/remoteEntry.js'];

// Stub the backend + Keycloak so the public home route boots deterministically without
// a real API. Home is not auth-gated, so OIDC silent-renew failing is fine - but we mock
// it to keep the run quiet and fast.
async function stubBackend(page: import('@playwright/test').Page) {
  await page.route('**/api/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  );
  await page.route(/realms|openid-connect/, (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  );
}

test.describe('Module Federation smoke (hermetic)', () => {
  test('both remoteEntry.js bundles are served under their /remotes/ prefix as JS', async ({
    request,
  }) => {
    for (const entry of REMOTE_ENTRIES) {
      const res = await request.get(entry);
      expect(res.status(), `${entry} should be 200`).toBe(200);
      const ctype = res.headers()['content-type'] ?? '';
      expect(ctype, `${entry} should be served as JavaScript`).toMatch(/javascript|ecmascript/);
    }
  });

  test('shell mounts the editor remote at / (single shared store boots)', async ({ page }) => {
    await stubBackend(page);

    const remoteEntryHits: { url: string; status: number }[] = [];
    page.on('response', (res: Response) => {
      if (res.url().includes('/remotes/editor/remoteEntry.js')) {
        remoteEntryHits.push({ url: res.url(), status: res.status() });
      }
    });

    // Deep-link a tool so the editor view (not the guest landing) renders, and
    // dismiss the first-visit persona onboarding dialog that overlays it.
    await page.goto('/?tool=md5');
    const overlay = page.locator('.tu-onboard-overlay');
    const onboarding = await overlay
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (onboarding) {
      await page.keyboard.press('Escape');
      await overlay.waitFor({ state: 'hidden', timeout: 5_000 });
    }

    // The editor surface (TextForm) is owned by editor-remote. Its textarea rendering
    // proves the remote loaded, mounted, and the app-core store singleton initialised.
    const editorInput = page.locator('textarea.tu-textarea').first();
    await expect(editorInput).toBeVisible({ timeout: 20_000 });

    // The shell fetched the editor remoteEntry from the prefixed router path.
    expect(remoteEntryHits.length, 'editor remoteEntry.js should be requested').toBeGreaterThan(0);
    expect(remoteEntryHits.every((h) => h.status === 200)).toBe(true);
  });
});
