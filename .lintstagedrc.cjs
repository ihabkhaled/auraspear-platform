/**
 * Root lint-staged pipeline.
 *
 * Pre-commit only formats staged files (fast, and Prettier resolves each
 * app's own `.prettierrc` per file). Heavier gates — ESLint (strict),
 * typecheck, build, and tests — run via `pnpm validate` / `pnpm validate:full`
 * and in CI, where they have the full workspace graph and Turbo caching.
 */
module.exports = {
  '*.{ts,tsx,js,jsx,mjs,cjs,json,md,yml,yaml,css}': ['prettier --write'],
}
