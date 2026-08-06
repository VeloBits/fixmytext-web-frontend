import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
// @ts-expect-error – eslint-plugin-security ships without type declarations
import security from 'eslint-plugin-security';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  {
    files: ['apps/*/src/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
    },
  },
  // Test files: add Vitest globals and relax rules that don't apply in tests
  {
    files: ['apps/*/src/**/*.test.{ts,tsx}', 'apps/*/src/test/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.vitest,
        ...globals.node,
      },
    },
    rules: {
      'react/display-name': 'off',
      'no-unused-vars': 'off',
      'no-useless-escape': 'off',
    },
  },
  {
    files: ['apps/shell/e2e/**/*.{ts,tsx}', 'apps/*/playwright.config.ts', '*.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      // Next.js auto-generated files - never edit or lint these
      '**/next-env.d.ts',
      '**/.next/**',
      '**/tsconfig.tsbuildinfo',
    ],
  },
  ...tseslint.config({
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  }),
  {
    files: ['apps/*/src/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    plugins: { security },
    rules: {
      ...security.configs.recommended.rules,
      'security/detect-object-injection': 'off',
    },
  },
];
