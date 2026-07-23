interface Env {
  SHELL_PAGES_URL: string;
  EDITOR_PAGES_URL: string;
  ANALYTICS_PAGES_URL: string;
  CONTENT_URL: string; // Cloudflare Worker (OpenNext), not a Pages project
  // Service binding to the content worker — required in production: same-account
  // worker→worker fetches over workers.dev never reach the target worker.
  CONTENT?: Fetcher;
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

// Search crawlers and link-preview scrapers that need server-rendered HTML with
// OG meta. Human browsers get the shell SPA on the same paths ("dynamic
// rendering") — the in-app About/Pricing/Share pages remain the human experience.
const BOT_UA =
  /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandex(bot)?|applebot|petalbot|facebookexternalhit|facebookcatalog|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|pinterestbot|redditbot|embedly|quora link preview|outbrain|vkshare|w3c_validator/i;

// Paths the content app serves for EVERYONE — the shell has no equivalent.
function isContentAlwaysPath(pathname: string): boolean {
  return (
    pathname === '/tools' ||
    pathname.startsWith('/tools/') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  );
}

// Paths where the shell has an in-app page but bots need the SSR/OG version.
// '/' is deliberately excluded: apps/content's root page redirects to /app,
// which this router 301s back to / — a bot would loop between the two.
function isContentBotPath(pathname: string): boolean {
  return pathname === '/about' || pathname === '/pricing' || pathname.startsWith('/share/');
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
      // Legacy prefix: the shell used to live under /app — permanent redirect
      // so old bookmarks/share links land on the root-based equivalents.
      // Segment boundary in the condition above: /appfoo is NOT redirected.
      const stripped = pathname === '/app' ? '/' : pathname.slice('/app'.length);
      return withSecurityHeaders(
        Response.redirect(new URL(`${stripped}${search}`, url.origin).toString(), 301),
        env
      );
    } else if (
      isContentAlwaysPath(pathname) ||
      (isContentBotPath(pathname) && BOT_UA.test(request.headers.get('user-agent') ?? ''))
    ) {
      // content app (Next.js SSR — SEO pages + share OG cards). Must go through
      // the service binding: a plain fetch to a same-account workers.dev URL is
      // blocked by Cloudflare and returns the edge's placeholder 404.
      if (env.CONTENT) {
        // Bindings ignore the URL's hostname — forward the request as-is so the
        // content app sees the public origin (its redirects and derived URLs
        // stay on it, never on the internal workers.dev host).
        res = await env.CONTENT.fetch(request);
      } else if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        // Local-dev fallback (wrangler dev without the content worker bound).
        res = await fetch(`${env.CONTENT_URL}${pathname}${search}`, request);
      } else {
        // Fail loudly: without the binding a plain fetch degrades into the
        // edge's placeholder 404, which masquerades as a content-app 404.
        return withSecurityHeaders(
          new Response('Router misconfigured: CONTENT service binding is missing', {
            status: 500,
          }),
          env
        );
      }
    } else {
      // everything else → shell SPA (owns the origin root; built with base '/',
      // Pages' index.html fallback handles client-side routes)
      res = await fetch(`${env.SHELL_PAGES_URL}${pathname}${search}`, request);
    }

    return withSecurityHeaders(res, env);
  },
} satisfies ExportedHandler<Env>;
