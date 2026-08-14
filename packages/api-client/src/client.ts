/**
 * Framework-agnostic fetch wrapper for VeloBits APIs.
 * Used by the Vite web app (via RTK Query baseQuery) and by Next.js
 * Server Components (direct calls with cache options).
 */

export interface ApiFetchOptions extends RequestInit {
  /** Override the base URL (defaults to VITE_API_URL or http://localhost:8000) */
  baseUrl?: string;
}

export interface ApiError {
  status: number;
  message: string;
  detail?: unknown;
}

function getDefaultBaseUrl(): string {
  // Vite env (import.meta.env is injected at build time by the Vite bundler)
  const viteEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as unknown as { env?: Record<string, string> }).env
      : undefined;
  if (viteEnv?.VITE_API_URL) return viteEnv.VITE_API_URL;

  // Next.js env (process is a Node.js global; guard with typeof for browser safety)
  if (
    typeof globalThis !== 'undefined' &&
    'process' in globalThis &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).process?.env?.NEXT_PUBLIC_API_URL
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (globalThis as any).process.env.NEXT_PUBLIC_API_URL as string;
  }
  return 'http://localhost:8000';
}

/**
 * POST /api/v1/auth/session/clear - clear the per-app session cookie.
 * Called by the frontend on logout BEFORE redirecting to Keycloak end-session.
 * Always sends credentials: 'include' so the browser attaches the cookie
 * (server needs it to know what to clear). Errors are swallowed - clearing
 * is best-effort; the OIDC logout still runs afterward.
 */
export async function clearSession(options: { baseUrl?: string } = {}): Promise<void> {
  const baseUrl = options.baseUrl ?? getDefaultBaseUrl();
  try {
    await fetch(`${baseUrl}/api/v1/auth/session/clear`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Best-effort: server may be down or unreachable. Logout still proceeds
    // via the OIDC end-session redirect.
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { baseUrl = getDefaultBaseUrl(), ...fetchOptions } = options;

  const requestId = typeof crypto !== 'undefined' ? crypto.randomUUID() : `req-${Date.now()}`;

  const headers = new Headers(fetchOptions.headers);
  headers.set('Content-Type', headers.get('Content-Type') ?? 'application/json');
  headers.set('X-Request-ID', requestId);

  const response = await fetch(`${baseUrl}${path}`, {
    credentials: 'include',
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => undefined)) as unknown;
    const error: ApiError = {
      status: response.status,
      message: response.statusText,
      detail,
    };
    throw error;
  }

  return response.json() as Promise<T>;
}
