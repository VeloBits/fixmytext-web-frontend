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
      exclude: [
        'node_modules/',
        'dist/',
        'src/test/',
        '**/*.config.js',
        'src/index.jsx',
      ],
      // Thresholds reflect actual Sprint 4 coverage after auth migration.
      // TODO (PARTIAL_IMPLEMENTATIONS.md #12): raise thresholds as service
      // tests are expanded in Sprint 4j. Current gaps are in the 8 files
      // with react-hooks/exhaustive-deps warnings (many uncovered branches).
      thresholds: {
        lines: 69,
        branches: 60,
        functions: 62,
        statements: 66,
      },
    },
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
});
