import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'src/test/', 'src/types/', '**/*.config.*'],
      thresholds: { lines: 70, branches: 70, functions: 70, statements: 70 },
    },
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
});
