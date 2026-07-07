import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow importing from workspace packages (symlinked via npm workspaces)
  transpilePackages: [
    '@velobits/design-system',
    '@velobits/api-client',
    '@velobits/auth-shared',
    '@velobits/tools-registry',
  ],
  // Security headers for all content-app responses
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
