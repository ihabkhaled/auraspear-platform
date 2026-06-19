import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import security from 'eslint-plugin-security'
import unicorn from 'eslint-plugin-unicorn'
import importX from 'eslint-plugin-import-x'

// ── Separation-of-concerns selectors (Rules #13, #14, #15, #17) ────────────
// Composed per file scope because flat-config `no-restricted-syntax` overrides,
// so every block must carry its full selector list.

const banStringLiteralUnions = {
  selector: 'TSUnionType > TSLiteralType[literal.type="Literal"][literal.raw=/^\'[a-z]/]',
  message:
    'String literal unions are not allowed. Define an enum in src/enums/ and use it instead (Rule #17).',
}

const banInlineEnum = {
  selector: 'TSEnumDeclaration',
  message:
    'Enums must be defined in src/enums/. Import from @/enums instead (Rule #13).',
}

const banInlineInterface = {
  selector: 'TSInterfaceDeclaration',
  message:
    'Interfaces must be defined in src/types/<domain>.types.ts. Import from @/types instead (Rule #13).',
}

const banInlineTypeAlias = {
  selector: 'TSTypeAliasDeclaration',
  message:
    'Type aliases must be defined in src/types/<domain>.types.ts. Import from @/types instead (Rule #13).',
}

const banInlineConst = {
  selector: 'Program > VariableDeclaration[kind="const"] > VariableDeclarator[id.name=/^[A-Z][A-Z0-9_]+$/]',
  message:
    'Module-level constants (SCREAMING_CASE) must be defined in src/lib/constants/<domain>.ts (Rule #13).',
}

const banInlineHook = {
  selector: 'FunctionDeclaration[id.name=/^use[A-Z]/]',
  message:
    'Custom hooks must be defined in src/hooks/ (one hook per file). Import from @/hooks instead (Rule #14).',
}

const banInlineHookArrow = {
  selector: 'VariableDeclarator[id.name=/^use[A-Z]/] > ArrowFunctionExpression',
  message:
    'Custom hooks must be defined in src/hooks/ (one hook per file). Import from @/hooks instead (Rule #14).',
}

const banInlineUtilFunction = {
  selector: 'Program > FunctionDeclaration[id.name=/^[a-z]/]:not([id.name=/^use[A-Z]/])',
  message:
    'Utility functions must be defined in src/lib/<domain>.utils.ts. Import from @/lib instead (Rule #15).',
}

const banInlineArrowUtil = {
  selector: 'Program > VariableDeclaration[kind="const"] > VariableDeclarator[id.name=/^[a-z]/] > ArrowFunctionExpression',
  message:
    'Arrow-function utilities/helpers must not be defined in .tsx files. Move to src/lib/<domain>.utils.ts or src/hooks/ (Rule #60).',
}

const banLiteralStatusCssReturn = {
  selector: 'ReturnStatement > Literal[value=/^(text-status-|bg-status-|border-status-|text-muted-foreground|bg-muted|border-border)/]',
  message:
    'Do not return literal CSS class strings. Use StatusTextClass, StatusBgClass, or StatusBorderClass enums from @/enums instead (Rule #40).',
}

// Selectors by scope — each later block must include all applicable selectors
const baseSelectors = [banStringLiteralUnions]
const defaultSelectors = [...baseSelectors, banInlineEnum]
const typeAwareSelectors = [...defaultSelectors, banInlineInterface, banInlineTypeAlias, banInlineConst, banInlineUtilFunction]
const componentSelectors = [...typeAwareSelectors, banInlineHook, banInlineHookArrow, banInlineArrowUtil]

const eslintConfig = defineConfig([
  // ── Next.js presets (includes @typescript-eslint, react, react-hooks, jsx-a11y) ──
  ...nextVitals,
  ...nextTs,

  // ── Global ignores ─────────────────────────────────────────────────────────
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'dist/**',
    'node_modules/**',
    'next-env.d.ts',
    'public/mockServiceWorker.js',
    'public/sw.js',
    'eslint-reports/**',
    'coverage/**',
    '*.config.mjs',
    '*.config.ts',
    '*.config.js',
    '*.config.cjs',
    '.lintstagedrc.cjs',
  ]),

  // ── Main rules for all TS/TSX/JS/JSX ──────────────────────────────────────
  // Note: react, react-hooks, jsx-a11y plugins are already registered by eslint-config-next
  // Only register additional plugins here (unicorn, import-x)
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      security,
      unicorn,
      'import-x': importX,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // ═══════════════════════════════════════════════════════════════
      // TYPESCRIPT STRICT RULES
      // ═══════════════════════════════════════════════════════════════

      // NEVER use `any` — use unknown, generics, or proper types
      '@typescript-eslint/no-explicit-any': 'error',
      // No unused vars (except _ prefix)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // NEVER use `!` non-null assertion — use proper null checks
      '@typescript-eslint/no-non-null-assertion': 'error',
      // Use `import type { Foo }` for type-only imports (inline style)
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // Prevent variable name collisions with outer scope
      '@typescript-eslint/no-shadow': 'warn',
      // Default parameters must come last in function signature
      '@typescript-eslint/default-param-last': 'error',
      // No empty `export {}` that does nothing
      '@typescript-eslint/no-useless-empty-export': 'error',
      // No functions defined inside loops (closure bugs)
      '@typescript-eslint/no-loop-func': 'error',
      // No require() imports — use ES modules
      '@typescript-eslint/no-require-imports': 'error',

      // Separation-of-concerns: ban string literal unions + enums outside src/enums/
      // (Rules #13, #17 — overridden per-scope in file-specific blocks below)
      'no-restricted-syntax': ['error', ...defaultSelectors],

      // ═══════════════════════════════════════════════════════════════
      // GENERAL CODE QUALITY
      // ═══════════════════════════════════════════════════════════════

      // Always use === / !==
      eqeqeq: ['error', 'always'],
      // Only console.warn and console.error allowed
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Use const when not reassigned
      'prefer-const': 'error',
      // Never use var
      'no-var': 'error',
      // No !!val, +str — use Boolean(), Number()
      'no-implicit-coercion': 'error',
      // Warn when ${x} appears in regular strings
      'no-template-curly-in-string': 'warn',
      // Use template literals over string concatenation
      'prefer-template': 'warn',
      // Multi-line if/else/for/while must use braces
      curly: ['error', 'multi-line'],
      // Only throw Error objects
      'no-throw-literal': 'error',
      // No duplicate imports (off — import-x handles it)
      'no-duplicate-imports': 'off',

      // ═══════════════════════════════════════════════════════════════
      // CLEAN CODE
      // ═══════════════════════════════════════════════════════════════

      // No { foo: foo } style renaming
      'no-useless-rename': 'error',
      // Use { foo } instead of { foo: foo }
      'object-shorthand': ['warn', 'always'],
      // Combine with parent else when possible
      'no-lonely-if': 'warn',
      // Return early instead of else blocks
      'no-else-return': ['warn', { allowElseIf: false }],
      // No x ? true : false
      'no-unneeded-ternary': 'error',
      // Use arrow functions for callbacks
      'prefer-arrow-callback': 'error',
      // Prefer const { x } = obj over const x = obj.x (objects only)
      'prefer-destructuring': ['warn', { object: true, array: false }],
      // Avoid nested a ? b : c ? d : e
      'no-nested-ternary': 'warn',
      // No 'a' + 'b'
      'no-useless-concat': 'error',
      // No assignment in return statements
      'no-return-assign': 'error',
      // Don't reassign function parameters (props allowed)
      'no-param-reassign': ['warn', { props: false }],
      // Use { ...obj } instead of Object.assign()
      'prefer-object-spread': 'error',

      // ═══════════════════════════════════════════════════════════════
      // BUG PREVENTION
      // ═══════════════════════════════════════════════════════════════

      // Prefer Promise.all() over sequential awaits in loops
      'no-await-in-loop': 'warn',
      // Don't return values from Promise executor
      'no-promise-executor-return': 'error',
      // Constructors must not return values
      'no-constructor-return': 'error',
      // Loops must execute more than once
      'no-unreachable-loop': 'error',
      // No x === x (use Number.isNaN())
      'no-self-compare': 'error',
      // No comma operator
      'no-sequences': 'error',

      // ═══════════════════════════════════════════════════════════════
      // SECURITY (core ESLint)
      // ═══════════════════════════════════════════════════════════════

      // Never use eval()
      'no-eval': 'error',
      // No setTimeout('code') style implicit eval
      'no-implied-eval': 'error',
      // No new Function('code')
      'no-new-func': 'error',
      // No javascript: URLs
      'no-script-url': 'error',

      // ═══════════════════════════════════════════════════════════════
      // SECURITY (eslint-plugin-security)
      // ═══════════════════════════════════════════════════════════════

      // Detect potentially catastrophic exponential-time regexes (ReDoS)
      'security/detect-unsafe-regex': 'error',
      // Detect RegExp() with non-literal arguments (potential injection)
      'security/detect-non-literal-regexp': 'warn',
      // Detect trojan source attacks via bidirectional control characters
      'security/detect-bidi-characters': 'error',
      // Detect dynamic property access obj[variable] (prototype pollution risk)
      'security/detect-object-injection': 'warn',
      // Detect possible timing attacks in string comparisons
      'security/detect-possible-timing-attacks': 'warn',
      // Detect deprecated Buffer() constructor (use Buffer.alloc/Buffer.from)
      'security/detect-new-buffer': 'error',
      // Detect Math.random() usage (not cryptographically secure)
      'security/detect-pseudoRandomBytes': 'warn',
      // Detect non-literal fs.read/writeFile paths (path traversal risk)
      'security/detect-non-literal-fs-filename': 'warn',
      // Detect child_process usage with non-literal arguments
      'security/detect-child-process': 'warn',

      // ═══════════════════════════════════════════════════════════════
      // REACT (plugins already registered by eslint-config-next)
      // ═══════════════════════════════════════════════════════════════

      // Must provide key in iterators (including Fragment shorthand)
      'react/jsx-key': ['error', { checkFragmentShorthand: true }],
      // No dangerouslySetInnerHTML
      'react/no-danger': 'error',
      // No deprecated React APIs
      'react/no-deprecated': 'warn',
      // Never mutate this.state directly
      'react/no-direct-mutation-state': 'error',
      // Escape ', ", >, } in JSX text
      'react/no-unescaped-entities': 'error',
      // No undefined components in JSX
      'react/jsx-no-undef': 'error',
      // target="_blank" requires rel="noopener noreferrer"
      'react/jsx-no-target-blank': 'error',
      // Comments must use {/* */} syntax
      'react/jsx-no-comment-textnodes': 'error',
      // No duplicate props on JSX elements
      'react/jsx-no-duplicate-props': 'error',
      // Self-close components with no children
      'react/self-closing-comp': 'warn',
      // Prefer <Component disabled /> over <Component disabled={true} />
      'react/jsx-boolean-value': ['warn', 'never'],
      // No unnecessary curly braces in JSX
      'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
      // No useless fragments
      'react/jsx-no-useless-fragment': 'warn',

      // ═══════════════════════════════════════════════════════════════
      // REACT HOOKS (plugin already registered by eslint-config-next)
      // ═══════════════════════════════════════════════════════════════

      // Hooks must be called at the top level
      'react-hooks/rules-of-hooks': 'error',
      // Dependencies array must be complete
      'react-hooks/exhaustive-deps': 'warn',

      // ═══════════════════════════════════════════════════════════════
      // ACCESSIBILITY (plugin already registered by eslint-config-next)
      // ═══════════════════════════════════════════════════════════════

      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/anchor-is-valid': 'warn',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-role': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-redundant-roles': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'error',
      'jsx-a11y/tabindex-no-positive': 'error',

      // ═══════════════════════════════════════════════════════════════
      // IMPORTS (organization & hygiene)
      // ═══════════════════════════════════════════════════════════════

      // No duplicate imports from same module
      'import-x/no-duplicates': 'error',
      // No unresolved imports (off — TypeScript handles this)
      'import-x/no-unresolved': 'off',
      // A module cannot import itself
      'import-x/no-self-import': 'error',
      // Detect circular dependencies
      'import-x/no-cycle': ['warn', { maxDepth: 4 }],
      // No useless path segments
      'import-x/no-useless-path-segments': 'warn',
      // Enforce import order: builtin → external → internal → relative → type
      'import-x/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          pathGroups: [
            { pattern: 'react', group: 'external', position: 'before' },
            { pattern: 'next/**', group: 'external', position: 'before' },
            { pattern: '@/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['react', 'next'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // ═══════════════════════════════════════════════════════════════
      // UNICORN (modern JS best practices & modernization)
      // ═══════════════════════════════════════════════════════════════

      // Prefer modern array methods
      'unicorn/prefer-array-find': 'error',
      'unicorn/prefer-array-flat': 'error',
      'unicorn/prefer-array-flat-map': 'error',
      'unicorn/prefer-array-some': 'error',
      'unicorn/prefer-includes': 'error',
      'unicorn/no-array-for-each': 'warn',

      // Prefer modern string methods
      'unicorn/prefer-string-replace-all': 'warn',
      'unicorn/prefer-string-starts-ends-with': 'error',
      'unicorn/prefer-string-trim-start-end': 'error',

      // Prefer modern number/math
      'unicorn/prefer-number-properties': 'error',
      'unicorn/prefer-math-trunc': 'error',
      'unicorn/no-zero-fractions': 'error',

      // Prefer modern patterns
      'unicorn/prefer-date-now': 'error',
      'unicorn/prefer-type-error': 'error',
      'unicorn/prefer-regexp-test': 'error',
      'unicorn/prefer-spread': 'warn',
      'unicorn/prefer-switch': ['warn', { minimumCases: 3 }],
      'unicorn/prefer-ternary': 'warn',

      // Remove useless code
      'unicorn/no-useless-undefined': 'warn',
      'unicorn/no-useless-spread': 'error',
      'unicorn/no-useless-promise-resolve-reject': 'error',
      'unicorn/no-unnecessary-await': 'error',
      'unicorn/no-lonely-if': 'error',

      // Better error handling
      'unicorn/throw-new-error': 'error',
      'unicorn/error-message': 'error',

      // Correctness
      'unicorn/no-instanceof-array': 'error',
      'unicorn/no-negated-condition': 'warn',
      'unicorn/no-object-as-default-parameter': 'error',
      'unicorn/consistent-function-scoping': 'warn',

      // Filename convention — PascalCase for components, camelCase for hooks/utils, kebab-case ok
      'unicorn/filename-case': [
        'warn',
        {
          cases: { kebabCase: true, pascalCase: true, camelCase: true },
          ignore: ['^CLAUDE\\.md$', '^README\\.md$'],
        },
      ],
    },
  },

  // ── Separation-of-concerns: file-scope enforcement (Rules #13, #14, #15) ──
  // Each block overrides `no-restricted-syntax` so it must carry ALL selectors.

  // src/enums/ — only ban string literal unions (enums belong here)
  {
    files: ['src/enums/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...baseSelectors],
    },
  },

  // src/types/ — ban enums (must be in src/enums/) but allow interfaces/types
  {
    files: ['src/types/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...defaultSelectors],
    },
  },

  // shadcn/ui generated files — disable separation-of-concerns selectors
  // These files use inline interfaces, types, and string literal unions as part of their generated pattern
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },

  // Component files (.tsx) — ban inline interfaces, types, enums, hooks, utilities
  // Exclude src/components/ui/ — auto-generated shadcn components use inline cva types
  {
    files: ['src/**/*.tsx'],
    ignores: ['src/components/ui/**'],
    rules: {
      'no-restricted-syntax': ['error', ...componentSelectors],
    },
  },

  // Hook, service, API route files — ban inline interfaces, types, enums
  {
    files: ['src/hooks/**/*.ts', 'src/services/**/*.ts', 'src/app/api/**/*.ts', 'src/stores/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...typeAwareSelectors],
    },
  },

  // Lib/utils files — ban literal CSS status class returns
  {
    files: ['src/lib/**/*.ts', 'src/lib/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...defaultSelectors, banLiteralStatusCssReturn],
    },
  },

  // ── API route files — relax React/browser rules ────────────────────────────
  {
    files: ['src/app/api/**/*.ts'],
    rules: {
      'react/jsx-key': 'off',
      'react/no-danger': 'off',
    },
  },

  // ── Mock data files — relax some rules ─────────────────────────────────────
  {
    files: ['src/mocks/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  // ── Test files — relax strict rules ────────────────────────────────────────
  {
    files: ['src/tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-await-in-loop': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-useless-undefined': 'off',
      'react/no-danger': 'off',
    },
  },
])

export default eslintConfig
