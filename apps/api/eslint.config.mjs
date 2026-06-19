import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import security from 'eslint-plugin-security'
import unicorn from 'eslint-plugin-unicorn'
import importX from 'eslint-plugin-import-x'

export default tseslint.config(
  // ── Recommended presets ────────────────────────────────────────────────────
  js.configs.recommended,
  ...tseslint.configs.strict,

  // ── Global ignores ─────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'prisma/**',
      'eslint-reports/**',
      '.husky/**',
      '*.config.mjs',
      '*.config.ts',
      '*.config.js',
      '*.config.cjs',
      '.lintstagedrc.cjs',
      'commitlint.config.js',
    ],
  },

  // ── Main rules for all TS files ────────────────────────────────────────────
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: {
      security,
      unicorn,
      'import-x': importX,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        sourceType: 'module',
      },
    },
    rules: {
      // ═══════════════════════════════════════════════════════════════
      // TYPESCRIPT STRICT RULES
      // ═══════════════════════════════════════════════════════════════

      // Allow empty classes (NestJS modules/controllers use decorators on empty classes)
      '@typescript-eslint/no-extraneous-class': 'off',
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
      // Explicit return types for better API contracts
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      // Catch floating promises (critical for NestJS async)
      '@typescript-eslint/no-floating-promises': 'error',
      // Prevent misused promises (e.g., passing async to non-async)
      '@typescript-eslint/no-misused-promises': 'error',
      // Prefer nullish coalescing
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',
      // Prefer optional chaining
      '@typescript-eslint/prefer-optional-chain': 'warn',

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
      // Cyclomatic complexity — max 15 branches per function
      complexity: ['warn', { max: 15 }],
      // NEVER use string literal union types — define an enum instead
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'TSTypeAliasDeclaration > TSUnionType > TSLiteralType > Literal[raw=/^[\'"].*[\'"]$/]',
          message:
            'Do not use string literal union types. Define an enum in <module>.enums.ts or src/common/enums/ instead.',
        },
      ],

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
      // Detect non-literal require() calls
      'security/detect-non-literal-require': 'warn',
      // Detect Buffer with noAssert flag
      'security/detect-buffer-noassert': 'error',
      // Detect eval() with expression
      'security/detect-eval-with-expression': 'error',
      // Detect CSRF vulnerability
      'security/detect-no-csrf-before-method-override': 'error',
      // Detect disabled mustache escaping
      'security/detect-disable-mustache-escape': 'error',

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
            { pattern: '@nestjs/**', group: 'external', position: 'before' },
            { pattern: '@/**', group: 'internal', position: 'before' },
          ],
          pathGroupsExcludedImportTypes: ['@nestjs'],
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
      'unicorn/prefer-date-now': 'off', // raw Date.now() banned — use nowMs() from date-time.utility
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

      // Node.js specific
      'unicorn/prefer-node-protocol': 'error',
      'unicorn/no-array-reduce': 'warn',
      'unicorn/no-nested-ternary': 'error',

      // Backend filename convention — kebab-case (NestJS convention)
      'unicorn/filename-case': [
        'warn',
        {
          cases: { kebabCase: true, pascalCase: false },
          ignore: ['^CLAUDE\\.md$', '^README\\.md$', '^Dockerfile$'],
        },
      ],

      // Off for backend (not relevant or conflicts with NestJS patterns)
      'unicorn/prevent-abbreviations': [
        'warn',
        {
          allowList: {
            req: true,
            res: true,
            env: true,
            db: true,
            fn: true,
            args: true,
            params: true,
            props: true,
            ctx: true,
            dto: true,
            Dto: true,
            e: true,
            err: true,
          },
        },
      ],
      'unicorn/no-null': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/prefer-top-level-await': 'off',
    },
  },

  // ── No inline declarations in logic files ──────────────────────────────────
  // Services, controllers, repositories, guards, interceptors, filters, pipes,
  // and modules must NOT declare interfaces, types, enums, constants, or
  // standalone functions. Move them to the dedicated file (<module>.types.ts,
  // .enums.ts, .constants.ts, .utilities.ts) and import.
  {
    files: [
      'src/**/*.service.ts',
      'src/**/*.controller.ts',
      'src/**/*.repository.ts',
      'src/**/*.module.ts',
      'src/**/*.guard.ts',
      'src/**/*.interceptor.ts',
      'src/**/*.filter.ts',
      'src/**/*.pipe.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        // ── inherited: no string literal unions ──
        {
          selector:
            'TSTypeAliasDeclaration > TSUnionType > TSLiteralType > Literal[raw=/^[\'"].*[\'"]$/]',
          message:
            'Do not use string literal union types. Define an enum in <module>.enums.ts or src/common/enums/ instead.',
        },
        // ── no inline interfaces ──
        {
          selector: 'TSInterfaceDeclaration',
          message:
            'Do not declare interfaces inline. Move to <module>.types.ts or src/common/interfaces/.',
        },
        // ── no inline type aliases ──
        {
          selector: 'TSTypeAliasDeclaration',
          message:
            'Do not declare type aliases inline. Move to <module>.types.ts or src/common/interfaces/.',
        },
        // ── no inline enums ──
        {
          selector: 'TSEnumDeclaration',
          message:
            'Do not declare enums inline. Move to <module>.enums.ts or src/common/enums/.',
        },
        // ── no inline constants (top-level const outside class) ──
        {
          selector: 'Program > VariableDeclaration[kind="const"]',
          message:
            'Do not declare constants inline. Move to <module>.constants.ts or src/common/constants/.',
        },
        {
          selector: 'Program > ExportNamedDeclaration > VariableDeclaration[kind="const"]',
          message:
            'Do not declare constants inline. Move to <module>.constants.ts or src/common/constants/.',
        },
        // ── no standalone functions (use class methods or move to utilities) ──
        {
          selector: 'FunctionDeclaration',
          message:
            'Do not declare standalone functions in logic files. Move to <module>.utilities.ts or src/common/utils/.',
        },
      ],
    },
  },

  // ── Service files: thin orchestrators, no long methods ────────────────────
  // Service methods must be short (max 30 lines) and simple (max 10 branches).
  // Extract cohesive logic blocks to <module>.utilities.ts. Services read like
  // a recipe: validate → call util → call repo → return.
  {
    files: ['src/**/*.service.ts'],
    rules: {
      'max-lines-per-function': [
        'warn',
        {
          max: 50,
          skipBlankLines: true,
          skipComments: true,
          IIFEs: false,
        },
      ],
      // Stricter cyclomatic complexity for services — orchestrators should be flat
      complexity: ['warn', { max: 10 }],
    },
  },

  // ── No inline types/enums/constants in utility files ──────────────────────
  // Utility files own business logic functions only. Interfaces, types, enums,
  // and constants belong in their dedicated files.
  {
    files: ['src/**/*.utilities.ts', 'src/**/*.utility.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // ── inherited: no string literal unions ──
        {
          selector:
            'TSTypeAliasDeclaration > TSUnionType > TSLiteralType > Literal[raw=/^[\'"].*[\'"]$/]',
          message:
            'Do not use string literal union types. Define an enum in <module>.enums.ts or src/common/enums/ instead.',
        },
        // ── no inline interfaces ──
        {
          selector: 'TSInterfaceDeclaration',
          message:
            'Do not declare interfaces in utility files. Move to <module>.types.ts or src/common/interfaces/.',
        },
        // ── no inline type aliases ──
        {
          selector: 'TSTypeAliasDeclaration',
          message:
            'Do not declare type aliases in utility files. Move to <module>.types.ts or src/common/interfaces/.',
        },
        // ── no inline enums ──
        {
          selector: 'TSEnumDeclaration',
          message:
            'Do not declare enums in utility files. Move to <module>.enums.ts or src/common/enums/.',
        },
        // ── no inline constants ──
        {
          selector: 'Program > VariableDeclaration[kind="const"]',
          message:
            'Do not declare constants in utility files. Move to <module>.constants.ts or src/common/constants/.',
        },
        {
          selector: 'Program > ExportNamedDeclaration > VariableDeclaration[kind="const"]',
          message:
            'Do not declare constants in utility files. Move to <module>.constants.ts or src/common/constants/.',
        },
      ],
    },
  },

  // ── Repository files — pure data access only ─────────────────────────────
  // Repositories must contain ZERO business logic. No throwing exceptions,
  // no conditional branching, no standalone helper functions.
  {
    files: ['src/**/*.repository.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // ── inherited: all logic-file bans ──
        {
          selector:
            'TSTypeAliasDeclaration > TSUnionType > TSLiteralType > Literal[raw=/^[\'"].*[\'"]$/]',
          message:
            'Do not use string literal union types. Define an enum in <module>.enums.ts or src/common/enums/ instead.',
        },
        {
          selector: 'TSInterfaceDeclaration',
          message:
            'Do not declare interfaces inline. Move to <module>.types.ts or src/common/interfaces/.',
        },
        {
          selector: 'TSTypeAliasDeclaration',
          message:
            'Do not declare type aliases inline. Move to <module>.types.ts or src/common/interfaces/.',
        },
        {
          selector: 'TSEnumDeclaration',
          message:
            'Do not declare enums inline. Move to <module>.enums.ts or src/common/enums/.',
        },
        {
          selector: 'Program > VariableDeclaration[kind="const"]',
          message:
            'Do not declare constants inline. Move to <module>.constants.ts or src/common/constants/.',
        },
        {
          selector: 'Program > ExportNamedDeclaration > VariableDeclaration[kind="const"]',
          message:
            'Do not declare constants inline. Move to <module>.constants.ts or src/common/constants/.',
        },
        {
          selector: 'FunctionDeclaration',
          message:
            'Do not declare standalone functions in logic files. Move to <module>.utilities.ts or src/common/utils/.',
        },
        // ── repository-specific: no business logic ──
        {
          selector: 'ThrowStatement',
          message:
            'Repositories must not throw exceptions. Return data and let the service layer handle errors.',
        },
      ],
    },
  },

  // ── Controller files — routing and delegation only ────────────────────────
  // Controllers must not contain business logic. No try/catch (let filters
  // handle), no data transformation, no complex conditionals.
  {
    files: ['src/**/*.controller.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        // ── inherited: all logic-file bans ──
        {
          selector:
            'TSTypeAliasDeclaration > TSUnionType > TSLiteralType > Literal[raw=/^[\'"].*[\'"]$/]',
          message:
            'Do not use string literal union types. Define an enum in <module>.enums.ts or src/common/enums/ instead.',
        },
        {
          selector: 'TSInterfaceDeclaration',
          message:
            'Do not declare interfaces inline. Move to <module>.types.ts or src/common/interfaces/.',
        },
        {
          selector: 'TSTypeAliasDeclaration',
          message:
            'Do not declare type aliases inline. Move to <module>.types.ts or src/common/interfaces/.',
        },
        {
          selector: 'TSEnumDeclaration',
          message:
            'Do not declare enums inline. Move to <module>.enums.ts or src/common/enums/.',
        },
        {
          selector: 'Program > VariableDeclaration[kind="const"]',
          message:
            'Do not declare constants inline. Move to <module>.constants.ts or src/common/constants/.',
        },
        {
          selector: 'Program > ExportNamedDeclaration > VariableDeclaration[kind="const"]',
          message:
            'Do not declare constants inline. Move to <module>.constants.ts or src/common/constants/.',
        },
        {
          selector: 'FunctionDeclaration',
          message:
            'Do not declare standalone functions in logic files. Move to <module>.utilities.ts or src/common/utils/.',
        },
        // ── controller-specific: no business logic ──
        {
          selector: 'TryStatement',
          message:
            'Controllers must not use try/catch. Let the GlobalExceptionFilter handle errors.',
        },
        {
          selector: 'ThrowStatement',
          message:
            'Controllers must not throw directly. Delegate to the service layer.',
        },
      ],
    },
  },

  // ── Test files — relax strict rules ────────────────────────────────────────
  {
    files: ['test/**/*.ts', '**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-await-in-loop': 'off',
      'unicorn/consistent-function-scoping': 'off',
      'unicorn/no-useless-undefined': 'off',
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  }
)
