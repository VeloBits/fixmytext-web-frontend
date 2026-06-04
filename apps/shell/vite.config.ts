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
    'blakejs', 'whirlpool-hash', 'xxhashjs', 'murmurhash3js',
    'js-sha3', 'js-sha256', 'js-sha512', 'blueimp-md5',
  ],
}

function manualChunks(id: string): string | undefined {
  for (const [chunk, pkgs] of Object.entries(CHUNK_MAP)) {
    if (pkgs.some((pkg) => id.includes(`/node_modules/${pkg}/`))) return chunk
  }
}

const EDITOR_REMOTE_ENTRY =
  process.env.VITE_EDITOR_REMOTE_ENTRY ?? 'http://localhost:3101/remoteEntry.js'
const ANALYTICS_REMOTE_ENTRY =
  process.env.VITE_ANALYTICS_REMOTE_ENTRY ?? 'http://localhost:3102/remoteEntry.js'

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
      sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
      release: { name: process.env.VITE_SENTRY_RELEASE },
      disable: !process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  base: '/app',
  server: { port: 3100, host: true },
  preview: { port: 3100 },
  build: {
    sourcemap: true,
    rollupOptions: { output: { manualChunks } },
  },
})
