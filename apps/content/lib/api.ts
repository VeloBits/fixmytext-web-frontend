/**
 * Server-side API helpers for the content app.
 * These run exclusively on the server (Server Components, generateMetadata, etc.)
 * and have access to the API via the internal network or the public gateway.
 */

const API_BASE = process.env.CONTENT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://api-dev.velobits.dev';

// Share ids are UUIDs. Validate before building the upstream URL so the raw
// `[id]` route param can't be used for path/SSRF injection (FE-SSRF-01).
const SHARE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ShareResult {
  id: string;
  tool_id: string;
  tool_label: string;
  output_text: string;
  created_at: string;
}

/**
 * Fetch a shared result by its public ID.
 * Returns null on 404 and throws on network errors.
 */
export async function getShareResult(id: string): Promise<ShareResult | null> {
  if (!SHARE_ID_RE.test(id)) return null; // not a share id — don't hit the API
  try {
    const res = await fetch(`${API_BASE}/api/v1/share/${encodeURIComponent(id)}`, {
      next: { revalidate: 300 },
    });
    if (res.status === 404 || res.status === 410) return null;
    if (!res.ok) throw new Error(`Share fetch failed: ${res.status}`);
    return (await res.json()) as ShareResult;
  } catch {
    return null;
  }
}
