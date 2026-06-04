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
      // Module Federation remotes are resolved via the Vite plugin at build/dev time
      // but Vitest runs outside the plugin pipeline. Alias the remote module IDs back
      // to their local implementations so tests resolve without a running remote server.
      'editor-remote/EditorPage': path.resolve(__dirname, 'src/remotes/editor/index.ts'),
      'analytics-remote/AnalyticsPage': path.resolve(
        __dirname,
        'src/remotes/analytics/index.ts',
      ),
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
      // Thresholds calibrated to actual coverage after the app moved to apps/web/.
      // Gaps remain in the editor's complex hook files (react-hooks/exhaustive-deps
      // patterns) and RTKQ API slices. Raise toward 80% as tests expand.
      thresholds: {
        lines: 68,
        branches: 59,
        functions: 60,
        statements: 66,
      },
    },
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
  },
});
