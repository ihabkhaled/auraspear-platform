/**
 * @auraspear/config — shared ESLint flat-config preset for first-party
 * TypeScript PACKAGES (packages/*). Apps keep their own framework-specific
 * configs (Next.js / NestJS); this preset gives the otherwise-unlinted packages
 * the same strict, type-aware baseline so security-sensitive code in
 * packages/ai (redaction, approval policy, provider routing) is held to the
 * platform standard. Closes audit finding ES-03 and the packages/config
 * manifest gap (PKG-02).
 *
 * Usage (packages/<name>/eslint.config.mjs):
 *   import { auraspearPackageConfig } from '@auraspear/config/eslint/base.mjs'
 *   export default auraspearPackageConfig({ tsconfigRootDir: import.meta.dirname })
 */
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import security from 'eslint-plugin-security'
import unicorn from 'eslint-plugin-unicorn'
import importX from 'eslint-plugin-import-x'

/**
 * Build the shared flat config for a package.
 * @param {{ tsconfigRootDir: string, files?: string[], ignores?: string[] }} options
 */
export function auraspearPackageConfig(options) {
  const { tsconfigRootDir, files = ['src/**/*.ts'], ignores = [] } = options

  return tseslint.config(
    js.configs.recommended,
    // Type-aware strict: turns on the no-unsafe-* family + strictTypeChecked.
    // This is exactly where it matters most — AI safety/redaction primitives.
    // (stylistic-type-checked is intentionally omitted to avoid churn with
    // Prettier and the repo's interface conventions.)
    ...tseslint.configs.strictTypeChecked,

    {
      // Tests are validated by Vitest (and live outside the package tsconfig
      // project, so type-aware rules cannot resolve them). Lint shipping src.
      ignores: [
        'dist/**',
        'node_modules/**',
        'coverage/**',
        'test/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '*.config.mjs',
        '*.config.ts',
        ...ignores,
      ],
    },

    {
      files,
      plugins: { security, unicorn, 'import-x': importX },
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        // ── TypeScript safety (GOD MODE §11.1) ──
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-non-null-assertion': 'error',
        '@typescript-eslint/no-floating-promises': 'error',
        '@typescript-eslint/no-misused-promises': 'error',
        '@typescript-eslint/consistent-type-imports': [
          'warn',
          { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
        ],
        '@typescript-eslint/explicit-function-return-type': [
          'warn',
          { allowExpressions: true, allowTypedFunctionExpressions: true },
        ],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
        ],
        // restrict-template-expressions: packages render numbers in prompts.
        '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],

        // ── General quality (GOD MODE §9) ──
        eqeqeq: ['error', 'always'],
        'no-console': ['error', { allow: ['warn', 'error'] }],
        'prefer-const': 'error',
        'no-var': 'error',
        'no-throw-literal': 'error',
        'prefer-template': 'warn',
        'no-nested-ternary': 'warn',

        // ── §11.2 size/complexity budgets (warn — packages are small) ──
        'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
        'max-lines-per-function': ['warn', { max: 60, skipBlankLines: true, skipComments: true }],
        'max-depth': ['warn', 4],
        'max-params': ['warn', 5],
        complexity: ['warn', { max: 12 }],

        // ── Security plugin (GOD MODE §11.5) ──
        'security/detect-unsafe-regex': 'error',
        'security/detect-non-literal-regexp': 'warn',
        'security/detect-object-injection': 'warn',
        'no-eval': 'error',
        'no-implied-eval': 'error',
        'no-new-func': 'error',

        // ── Imports (GOD MODE §11.4 / §4.3) ──
        'import-x/no-duplicates': 'error',
        'import-x/no-self-import': 'error',
        'import-x/no-cycle': ['warn', { maxDepth: 4 }],
        // Packages MUST NOT import from apps (monorepo boundary §4.3).
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/apps/**', '@auraspear/web', '@auraspear/api'],
                message: 'Packages must not depend on apps (monorepo boundary, GOD MODE §4.3).',
              },
            ],
          },
        ],

        // ── Unicorn essentials ──
        'unicorn/prefer-node-protocol': 'error',
        'unicorn/throw-new-error': 'error',
        'unicorn/error-message': 'error',
        'unicorn/no-instanceof-array': 'error',
        'unicorn/prefer-string-starts-ends-with': 'error',
        'unicorn/prefer-number-properties': 'error',
      },
    }
  )
}

export default auraspearPackageConfig
