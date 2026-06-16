import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { federation } from '@module-federation/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// In a production build the remote is served behind the router at /remotes/editor/
// (nginx + the CF Worker strip that prefix), so the prefix must be baked into every
// asset/chunk URL in remoteEntry.js — otherwise chunks request /assets/* and fall
// through the `/`→content route. The dev server is reached port-direct (3101) at
// root, so dev keeps base '/'. See docs/architecture.md + docker/nginx.router.*.conf.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/remotes/editor/' : '/',
  plugins: [
    federation({
      name: 'editor-remote',
      filename: 'remoteEntry.js',
      exposes: {
        './EditorPage': './src/index.ts',
      },
      dts: false,
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^7.0.0' },
        '@reduxjs/toolkit': { singleton: true, requiredVersion: '^2.0.0' },
        'react-redux': { singleton: true, requiredVersion: '^9.0.0' },
        '@sentry/react': { singleton: true },
        // Singleton: the host provides the one store/api instance at runtime.
        // Pinned (not '*') so a breaking app-core change forces a coordinated
        // rebuild instead of silent version skew (M-2).
        '@velobits/app-core': { singleton: true, requiredVersion: '^0.1.0' },
      },
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@velobits/app-core': path.resolve(__dirname, '../../packages/app-core/src'),
      '@velobits/design-system': path.resolve(__dirname, '../../packages/design-system/src'),
      '@velobits/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      '@velobits/auth-shared': path.resolve(__dirname, '../../packages/auth-shared/src'),
      '@velobits/tools-registry': path.resolve(__dirname, '../../packages/tools-registry/src'),
    },
  },
  server: { port: 3101, host: true },
  build: {
    // 'hidden' emits maps without referencing them in the bundle; the deploy
    // script deletes them so they're never published to Cloudflare Pages (M-11 —
    // a parsed .map leaks the original TypeScript source).
    sourcemap: 'hidden',
  },
}))
