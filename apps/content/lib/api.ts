/**
 * Server-side API helpers for the content app.
 * These run exclusively on the server (Server Components, generateMetadata, etc.)
 * and have access to the API via the internal network or the public gateway.
 */

const API_BASE = process.env.CONTENT_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://api-dev.velobits.dev';

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
  try {
    const res = await fetch(`${API_BASE}/api/v1/share/${id}`, {
      next: { revalidate: 300 },
    });
    if (res.status === 404 || res.status === 410) return null;
    if (!res.ok) throw new Error(`Share fetch failed: ${res.status}`);
    return (await res.json()) as ShareResult;
  } catch {
    return null;
  }
}
