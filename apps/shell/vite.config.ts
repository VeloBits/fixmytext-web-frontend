import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { federation } from '@module-federation/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CHUNK_MAP = {
  'vendor-export': ['jspdf', 'docx'],
  'vendor-format': ['prettier'],
  'vendor-hash': [
    'blakejs',
    'whirlpool-hash',
    'xxhashjs',
    'murmurhash3js',
    'js-sha3',
    'js-sha256',
    'js-sha512',
    'blueimp-md5',
  ],
};

function manualChunks(id: string): string | undefined {
  for (const [chunk, pkgs] of Object.entries(CHUNK_MAP)) {
    if (pkgs.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return chunk;
  }
}

const EDITOR_REMOTE_ENTRY =
  process.env.VITE_EDITOR_REMOTE_ENTRY ?? 'http://localhost:3101/remoteEntry.js';
const ANALYTICS_REMOTE_ENTRY =
  process.env.VITE_ANALYTICS_REMOTE_ENTRY ?? 'http://localhost:3102/remoteEntry.js';

export default defineConfig({
  plugins: [
    federation({
      name: 'fixmytext-shell',
      // Shell is a host only — remotes are separate builds deployed independently.
      remotes: {
        'editor-remote': {
          type: 'module',
          name: 'editor-remote',
          entry: EDITOR_REMOTE_ENTRY,
          shareScope: 'default',
        },
        'analytics-remote': {
          type: 'module',
          name: 'analytics-remote',
          entry: ANALYTICS_REMOTE_ENTRY,
          shareScope: 'default',
        },
      },
      dts: false,
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^7.0.0' },
        '@reduxjs/toolkit': { singleton: true, requiredVersion: '^2.0.0' },
        'react-redux': { singleton: true, requiredVersion: '^9.0.0' },
        '@sentry/react': { singleton: true },
        // Shared as a singleton so the Redux store / RTK Query api objects are a
        // single instance across shell + remotes (remote hooks dispatch to the
        // host's store). This is the linchpin of the source split.
        // Pinned (not '*') so a breaking app-core/store-contract change forces a
        // coordinated remote rebuild instead of silent runtime version skew
        // (M-2). Bump in lockstep with packages/app-core/package.json's version.
        '@velobits/app-core': { singleton: true, requiredVersion: '^0.3.0' },
      },
    }),
    react(),
    tailwindcss(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: 'fixmytext-frontend',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      release: { name: process.env.VITE_SENTRY_RELEASE },
      disable: !process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ],
  resolve: {
    // Array form: app-core resolved before the '@' alias. app-core is a brand-new
    // workspace package (no node_modules symlink baked into older installs), so we
    // alias it to source directly — same pattern the remotes use for shared packages.
    alias: [
      {
        find: '@velobits/app-core',
        replacement: path.resolve(__dirname, '../../packages/app-core/src'),
      },
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
  base: '/',
  server: { port: 3100, host: true },
  preview: { port: 3100 },
  build: {
    sourcemap: true,
    rollupOptions: { output: { manualChunks } },
  },
});
