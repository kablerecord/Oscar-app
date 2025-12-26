/**
 * ESLint configuration for osqr-vscode
 * Using ESLint 8 format (compatible with VS Code extension tooling)
 */

module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
  ],
  globals: {
    // TypeScript globals that ESLint doesn't know about
    NodeJS: 'readonly',
    RequestInit: 'readonly',
  },
  rules: {
    // TypeScript specific rules
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

    // General rules
    'no-unused-vars': 'off', // Use TypeScript's version
    'no-console': 'off', // VS Code extensions often use console for logging
    'prefer-const': 'warn',
    'no-constant-condition': 'warn', // Downgrade to warning for while(true) loops
  },
  ignorePatterns: ['out/**', 'node_modules/**'],
}
