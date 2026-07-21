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
// script-src allows checkout.razorpay.com (CDN SDK injected on demand by
// app-core's loadRazorpayScript when a checkout starts).
// style-src allows fonts.googleapis.com (Google Fonts stylesheet).
// font-src allows fonts.gstatic.com (Google Fonts files).
// frame-src/connect-src allow *.razorpay.com (checkout iframe + XHR).
// frame-src also allows *.velobits.dev for the Keycloak silent-renew iframe.
// Remotes load same-origin under /remotes/* — no extra script-src entry needed.
const DEFAULT_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "script-src 'self' https://checkout.razorpay.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.velobits.dev https://*.ingest.sentry.io https://sentry.io https://*.razorpay.com",
  "frame-src 'self' https://*.velobits.dev https://*.razorpay.com",
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
  h.set('Content-Security-Policy', env.CSP ?? DEFAULT_CSP);
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
    } else if (pathname === '/app' || pathname.startsWith('/app/')) {
      // shell SPA — built with base '/app' but deployed at the Pages webroot, so
      // the prefix must be stripped or asset requests fall into the SPA fallback
      // (mirrors the /app rewrite in docker/nginx.router.prod.conf). Segment
      // boundary required: /appfoo belongs to the content app, not the shell.
      const target = pathname.slice('/app'.length) || '/';
      res = await fetch(`${env.SHELL_PAGES_URL}${target}${search}`, request);
    } else {
      // everything else → Next.js content app (Cloudflare Worker via OpenNext)
      res = await fetch(`${env.CONTENT_URL}${pathname}${search}`, request);
    }

    return withSecurityHeaders(res, env);
  },
} satisfies ExportedHandler<Env>;
