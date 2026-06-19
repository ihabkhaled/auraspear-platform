/**
 * Root Prettier config for AuraSpear platform-level files (docs, scripts,
 * root configs). Each app (`apps/web`, `apps/api`) keeps its own `.prettierrc`
 * which Prettier resolves per-file, so app source uses the app's settings.
 *
 * @type {import('prettier').Config}
 */
export default {
  semi: false,
  singleQuote: true,
  printWidth: 100,
  tabWidth: 2,
  trailingComma: 'es5',
  arrowParens: 'avoid',
  endOfLine: 'lf',
}
