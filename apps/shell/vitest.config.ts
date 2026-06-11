import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@velobits/app-core': path.resolve(__dirname, '../../packages/app-core/src'),
      '@': path.resolve(__dirname, 'src'),
      // Remote modules resolved to the thin entry packages for tests.
      // @/ alias above makes these resolve through apps/shell/src correctly.
      'editor-remote/EditorPage': path.resolve(__dirname, '../editor-remote/src/index.ts'),
      'analytics-remote/AnalyticsPage': path.resolve(__dirname, '../analytics-remote/src/index.ts'),
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
      exclude: ['node_modules/', 'dist/', 'src/test/', '**/*.config.js', 'src/index.jsx'],
      thresholds: { lines: 87, branches: 72, functions: 87, statements: 85 },
    },
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
});
