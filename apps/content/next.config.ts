import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow importing from workspace packages (symlinked via npm workspaces)
  transpilePackages: [
    '@velobits/design-system',
    '@velobits/api-client',
    '@velobits/auth-shared',
    '@velobits/tools-registry',
  ],
  // Security headers for all content-app responses (FE-CSP-01).
  async headers() {
    // CSP ships Report-Only: Next.js injects inline hydration scripts (and the
    // page renders an inline JSON-LD <script>), so enforcing `script-src 'self'`
    // requires per-request nonces via middleware. Validate the reports, wire
    // nonces, then rename to `Content-Security-Policy` to enforce. The edge
    // router worker also sets a CSP — this is defense-in-depth for direct hits.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.velobits.dev https://*.ingest.sentry.io https://sentry.io",
      "form-action 'self'",
    ].join('; ');
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
