import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: ['node_modules/', 'tests/'],
      thresholds: {
        lines: 100,
        branches: 90,
        functions: 100,
        statements: 100,
      },
    },
  },
});
