import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { sentryVitePlugin } from '@sentry/vite-plugin'

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

export default defineConfig({
  plugins: [
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
