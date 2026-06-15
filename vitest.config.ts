import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    // Pure-logic helpers only — no DOM/canvas. node environment is sufficient.
    environment: 'node',
    include: ['**/*.test.ts'],
    // Pin the timezone so date-formatting characterization tests are
    // deterministic across local machines and CI.
    env: { TZ: 'UTC' },
  },
})
