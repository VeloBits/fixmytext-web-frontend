interface Env {
  SHELL_PAGES_URL: string;
  EDITOR_PAGES_URL: string;
  ANALYTICS_PAGES_URL: string;
  CONTENT_URL: string; // Cloudflare Worker (OpenNext), not a Pages project
  // Optional override of the Content-Security-Policy (otherwise DEFAULT_CSP).
  CSP?: string;
}

// Content-Security-Policy for the whole origin (FE-AUTH-06 / DO-08).
//
// Shipped as Report-Only first: a strict `script-src 'self'` can break a Vite
// build's modulepreload inline script, and `frame-src` must allow Keycloak for
// the silent-renew iframe (H-8). Validate against real traffic, add hashes/
// nonces for any inline scripts, then rename the header below to
// `Content-Security-Policy` to enforce.
//
// connect-src/frame-src/form-action allow *.velobits.dev (Keycloak + API) and
// Sentry ingest. Remotes load same-origin under /remotes/* so they need no
// extra script-src entry.
const DEFAULT_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.velobits.dev https://*.ingest.sentry.io https://sentry.io",
  "frame-src 'self' https://*.velobits.dev",
  "form-action 'self' https://*.velobits.dev",
].join('; ');

function withSecurityHeaders(res: Response, env: Env): Response {
  // Response headers are immutable on a fetched Response — re-wrap to edit.
  const out = new Response(res.body, res);
  const h = out.headers;
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', 'SAMEORIGIN');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), browsing-topics=()');
  h.set('Content-Security-Policy-Report-Only', env.CSP ?? DEFAULT_CSP);
  return out;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, search } = url;

    let res: Response;

    // editor-remote bundle — strip /remotes/editor prefix
    if (pathname.startsWith('/remotes/editor/')) {
      const target = pathname.replace('/remotes/editor', '');
      res = await fetch(`${env.EDITOR_PAGES_URL}${target}${search}`, request);
    } else if (pathname.startsWith('/remotes/analytics/')) {
      // analytics-remote bundle — strip /remotes/analytics prefix
      const target = pathname.replace('/remotes/analytics', '');
      res = await fetch(`${env.ANALYTICS_PAGES_URL}${target}${search}`, request);
    } else if (pathname.startsWith('/app')) {
      // shell SPA
      res = await fetch(`${env.SHELL_PAGES_URL}${pathname}${search}`, request);
    } else {
      // everything else → Next.js content app (Cloudflare Worker via OpenNext)
      res = await fetch(`${env.CONTENT_URL}${pathname}${search}`, request);
    }

    return withSecurityHeaders(res, env);
  },
} satisfies ExportedHandler<Env>;
