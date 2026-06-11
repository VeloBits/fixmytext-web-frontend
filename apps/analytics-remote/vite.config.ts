import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { federation } from '@module-federation/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// In a production build the remote is served behind the router at /remotes/analytics/
// (nginx + the CF Worker strip that prefix), so the prefix must be baked into every
// asset/chunk URL in remoteEntry.js — otherwise chunks request /assets/* and fall
// through the `/`→content route. The dev server is reached port-direct (3102) at
// root, so dev keeps base '/'. See docs/architecture.md + docker/nginx.router.*.conf.
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/remotes/analytics/' : '/',
  plugins: [
    federation({
      name: 'analytics-remote',
      filename: 'remoteEntry.js',
      exposes: {
        './AnalyticsPage': './src/index.ts',
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
        '@velobits/app-core': { singleton: true, requiredVersion: '*' },
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
  server: { port: 3102, host: true },
  build: {
    sourcemap: true,
  },
}))
