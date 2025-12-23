import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./lib/osqr/__tests__/setup.ts'],
    include: ['lib/**/*.test.ts', 'lib/**/*.spec.ts'],
    exclude: ['node_modules', '.next'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/osqr/**/*.ts'],
      exclude: ['lib/osqr/__tests__/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // Mock @osqr/core since it doesn't exist - tests define their own mocks
      '@osqr/core': path.resolve(__dirname, './lib/osqr/__tests__/__mocks__/osqr-core.ts'),
    },
  },
})
