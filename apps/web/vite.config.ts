import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { federation } from '@module-federation/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
}

function manualChunks(id: string): string | undefined {
  for (const [chunk, pkgs] of Object.entries(CHUNK_MAP)) {
    if (pkgs.some((pkg) => id.includes(`/node_modules/${pkg}/`))) {
      return chunk
    }
  }
}

// Remote entry URLs — used when VITE_USE_REMOTES=true (separate remote builds deployed).
// In the default single-build mode these are unused; the shell loads components locally.
// Override with env vars when deploying remotes independently.
const EDITOR_REMOTE_ENTRY =
  process.env.VITE_EDITOR_REMOTE_ENTRY ?? 'http://localhost:3001/app/remoteEntry.js'
const ANALYTICS_REMOTE_ENTRY =
  process.env.VITE_ANALYTICS_REMOTE_ENTRY ?? 'http://localhost:3002/app/remoteEntry.js'

export default defineConfig({
  plugins: [
    federation({
      name: 'fixmytext-shell',
      // Exposes both remote surfaces from this build so external hosts (other
      // VeloBits apps, future shell) can consume them as federated remotes.
      exposes: {
        './EditorPage': './src/remotes/editor/index.ts',
        './AnalyticsPage': './src/remotes/analytics/index.ts',
      },
      filename: 'remoteEntry.js',
      // Manual type declarations live in src/types/federation.d.ts — skip auto-DTS.
      dts: false,
      // Remotes are only consumed when VITE_USE_REMOTES=true. In dev/CI the
      // shell loads components locally (no network hop, no extra Vite server).
      remotes: {
        'editor-remote': {
          type: 'module',
          name: 'editor-remote',
          entry: EDITOR_REMOTE_ENTRY,
          entryGlobalName: 'editor-remote',
          shareScope: 'default',
        },
        'analytics-remote': {
          type: 'module',
          name: 'analytics-remote',
          entry: ANALYTICS_REMOTE_ENTRY,
          entryGlobalName: 'analytics-remote',
          shareScope: 'default',
        },
      },
      // Shared singletons — prevents duplicate React contexts and Redux stores
      // when remotes are loaded at runtime from separate origins.
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^7.0.0' },
        '@reduxjs/toolkit': { singleton: true },
        'react-redux': { singleton: true },
        '@sentry/react': { singleton: true },
      },
    }),
    react(),
    tailwindcss(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: 'fixmytext-frontend',
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        filesToDeleteAfterUpload: ['./dist/**/*.map'],
      },
      release: {
        name: process.env.VITE_SENTRY_RELEASE,
      },
      disable: !process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  base: '/app',
  server: { port: 3000, host: true },
  preview: { port: 3000 },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
})
