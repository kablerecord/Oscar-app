/**
 * ESLint configuration for @osqr/core
 * Using ESLint 9 flat config format
 */

import js from '@eslint/js'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import globals from 'globals'

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',

      // General rules
      'no-unused-vars': 'off', // Use TypeScript's version
      'no-console': 'warn',
      'prefer-const': 'warn',
      'no-case-declarations': 'warn', // Downgrade to warning
      'no-useless-escape': 'warn', // Downgrade to warning
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
  },
]
