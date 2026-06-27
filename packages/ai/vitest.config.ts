import { defineConfig } from 'vitest/config'

// Unit tests for the pure, deterministic AI primitives (no I/O, no network).
// Coverage thresholds enforce GOD MODE §12 (high coverage on safety-critical
// shared code) — closes audit findings TC-02 / PKG-03.
export default defineConfig({
  test: {
    include: ['test/**/*.spec.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // types.ts is mostly type-only declarations + one guard; the barrel is
      // re-exports only. Both are still exercised, but exclude the barrel from
      // the ratio so it reflects real logic coverage.
      exclude: ['src/index.ts'],
      reporter: ['text', 'text-summary'],
      thresholds: {
        statements: 98,
        branches: 95,
        functions: 100,
        lines: 98,
      },
    },
  },
})
