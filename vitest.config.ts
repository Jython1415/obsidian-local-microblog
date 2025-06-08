import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    exclude: ['related/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['tests/**', 'node_modules/**', 'related/**']
    }
  },
  resolve: {
    alias: {
      'obsidian': './tests/mocks/obsidian-api.ts'
    }
  }
});