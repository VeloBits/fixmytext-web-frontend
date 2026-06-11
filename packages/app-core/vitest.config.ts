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
      '@velobits/api-client': path.resolve(__dirname, '../api-client/src'),
      '@velobits/tools-registry': path.resolve(__dirname, '../tools-registry/src'),
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
      // Re-baselined after the surface split settles (plan Phase 0.5).
      thresholds: { lines: 60, branches: 55, functions: 55, statements: 60 },
    },
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
});
