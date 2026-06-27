# GOD MODE §16.1 — ESLint Hardening Audit

> Honest, evidence-backed accounting of the **lint-time correctness surface** of
> the **AuraSpear Platform** monorepo: what the TypeScript compiler and ESLint
> already catch, where the net has holes, and a staged plan to close them
> without flipping a wall of red on day one. Every claim below cites a real file
>
> - line. No rule name is invented; if a rule is "OFF", it means the config does
>   not register it, verified by `grep`.
>
> **Companion audits:** [`architecture-clean-code-audit.md`](./architecture-clean-code-audit.md) ·
> [`security-performance-audit.md`](./security-performance-audit.md) ·
> [`ai-docs-rules-audit.md`](./ai-docs-rules-audit.md) ·
> [`testing-coverage-audit.md`](./testing-coverage-audit.md) ·
> [audit index](./README.md)
>
> **Remediation skill:** [`skills/devsecops/harden-eslint.md`](../../skills/devsecops/harden-eslint.md)
> **Governing rules:** [`rules/global/clean-code-rules.md`](../../rules/global/clean-code-rules.md) ·
> [`rules/global/performance-rules.md`](../../rules/global/performance-rules.md)

**Severity:** how much risk the gap carries if left open (Low / Medium / High).
**Gate class:** `hard gate` (must be green to merge — `typecheck` + `build`),
`advisory` (`continue-on-error`, runs and annotates but does not block — `lint`,
`format`, `test`), or `staged` (proposed warn-first ramp to error). The current
posture is documented in [`02-risk-register.md`](./02-risk-register.md) R1 and in
[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml).

---

## 1. Executive summary

AuraSpear has an **above-average static-analysis baseline**. The shared
TypeScript compiler config turns on essentially the entire strictness matrix,
and both apps layer a large, hand-curated ESLint config (~95 rules on web,
~100 on api) on top of that — including a security plugin, modernization
(unicorn), import-cycle detection, and an unusually elaborate
`no-restricted-syntax` "separation-of-concerns" regime that mechanically
enforces the architecture rules in the per-app `CLAUDE.md` files.

The gaps are **not** in breadth of rules; they are in three structural blind
spots:

1. **Type-aware linting is asymmetric.** The API has a typed parser and uses it,
   but only against `tseslint.configs.strict` (not `strictTypeChecked`), so the
   high-value `no-unsafe-*` / boolean-soundness family is off. The web app has
   **no typed parser at all**, so the entire type-aware rule family is absent on
   the frontend.
2. **Shared packages are unlinted.** `packages/ai` and `packages/shared` ship
   `lint` scripts that are `echo` stubs — security-sensitive code
   (`safety.ts`, `redaction.ts`) is never linted.
3. **No size/complexity budgets** (beyond one service-only function-length cap on
   the API). Nothing stops a 1,600-line god-service from passing lint.

None of these are emergencies — `lint` is advisory today (R1) — but each is a
real correctness/maintainability hole. All remediations below follow GOD MODE
§11 staged enforcement: **introduce as `warn`, ratchet to `error` once the
existing-violation count is driven to zero**, so no single change turns the
build red.

---

## 2. Strengths (the parts that are genuinely strong)

These are load-bearing and should be preserved by any remediation. They are the
reason the findings are "tighten the net" rather than "build a net".

### 2.1 TypeScript compiler — full strict matrix (shared base)

[`tsconfig.base.json`](../../tsconfig.base.json) lines 4–25 enable the complete
strictness surface, inherited platform-wide:

| Flag                                    | Effect                                 |
| --------------------------------------- | -------------------------------------- |
| `strict`                                | all core strict checks                 |
| `noUncheckedIndexedAccess`              | indexed access yields `T \| undefined` |
| `exactOptionalPropertyTypes`            | `foo?: string` ≠ `string \| undefined` |
| `noImplicitOverride`                    | subclass overrides must be marked      |
| `noFallthroughCasesInSwitch`            | switch cases must terminate            |
| `noImplicitReturns`                     | all code paths return                  |
| `noUnusedLocals` / `noUnusedParameters` | dead bindings rejected                 |
| `noPropertyAccessFromIndexSignature`    | must bracket-access index signatures   |
| `useUnknownInCatchVariables`            | `catch (e)` is `unknown`, not `any`    |
| `allowUnreachableCode: false`           | dead code is an error                  |

This is a strong foundation. Much of what `strictTypeChecked` would add at the
lint layer is partially backstopped here at compile time — which is exactly why
the remaining ESLint gaps are "medium/high" rather than "critical".

### 2.2 Shared ESLint hard bans (both apps)

Both [`apps/web/eslint.config.mjs`](../../apps/web/eslint.config.mjs) and
[`apps/api/eslint.config.mjs`](../../apps/api/eslint.config.mjs) enforce as
**`error`**: `@typescript-eslint/no-explicit-any` (web :121 / api :52),
`@typescript-eslint/no-non-null-assertion` (web :132 / api :63),
`@typescript-eslint/no-unused-vars` (web :123 / api :54), `eqeqeq` (web :158 /
api :96), `no-var`, `no-implicit-coercion`, `no-throw-literal`,
`prefer-const`, plus `@typescript-eslint/consistent-type-imports` (warn, inline
style). The `no-explicit-any: error` + `no-non-null-assertion: error` pair is
the single most valuable pair of rules in a TS codebase and it is enforced.

### 2.3 Security + modernization + cycle detection (both apps)

`eslint-plugin-security` is wired in both apps (web :242–258, api :192–218)
covering ReDoS (`detect-unsafe-regex: error`), trojan-source
(`detect-bidi-characters: error`), object injection, timing attacks, and
non-literal `fs`/`child_process` sinks. `eslint-plugin-unicorn` enforces a deep
modernization set; `eslint-plugin-import-x` runs `no-cycle` (maxDepth 4) and
import ordering. The API adds extra security rules (`detect-eval-with-expression`,
`detect-no-csrf-before-method-override`, `detect-disable-mustache-escape`) at
api :209–218.

### 2.4 Architecture-as-lint: the `no-restricted-syntax` regime

This is the standout. The configs translate the `CLAUDE.md` layering rules into
AST selectors:

- **Web** (web :12–76, :402–454): bans inline enums/interfaces/type-aliases/
  SCREAMING_CASE consts/hooks/utility-functions outside their canonical homes,
  scoped per directory (`src/enums/`, `src/types/`, `.tsx`, `hooks/`,
  `services/`, `stores/`, `app/api/`, `lib/`), plus a `banLiteralStatusCssReturn`
  selector enforcing the status-class enum system.
- **API** (api :147–155, :343–585): controllers ban `TryStatement` +
  `ThrowStatement`; repositories ban `ThrowStatement`; logic/utility files ban
  inline interfaces/types/enums/consts/standalone functions. Each scoped block
  re-declares the full selector list (flat-config override semantics).

### 2.5 API: type-aware linting is wired (just under-utilized)

The API config sets `parserOptions.project: './tsconfig.eslint.json'` (api
:39–42) and **does** turn on the headline type-aware rules:
`@typescript-eslint/no-floating-promises: error` (:83),
`no-misused-promises: error` (:85), `prefer-nullish-coalescing: warn` (:87),
`prefer-optional-chain: warn` (:89). For a NestJS async codebase,
`no-floating-promises: error` is exactly the right call. The infrastructure to
go further (Finding ES-02) already exists.

---

## 3. Findings

Severity reflects the gap given the strong compiler backstop in §2.1.

### ES-01 — Web has no type-aware linting (entire type-aware family absent on FE) · High

**Evidence.** [`apps/web/eslint.config.mjs`](../../apps/web/eslint.config.mjs)
registers no `parserOptions.project` and no `projectService`. The only
TypeScript parsing comes from the `eslint-config-next/typescript` preset
(:3, :80–82), which is **not** type-aware. Confirmed by `grep`: there is no
`project`/`projectService` key anywhere in the file.

**Impact.** Every rule that needs the type checker is silently off on the
frontend: `no-floating-promises`, `no-misused-promises`,
`prefer-nullish-coalescing`, `prefer-optional-chain`, and the whole
`no-unsafe-*` family. A dropped promise in a React hook, mutation, or proxy
route (`src/app/api/**`) is not caught by lint — only `tsc` (which does not
flag floating promises). This is the highest-leverage gap because the API has
these and the web app does not, so the two halves of the platform have
asymmetric correctness guarantees on the exact bug class (async/await misuse)
that hurts most in both a React 19 and a BFF-proxy context.

**Fix (staged).** Add a typed config block to the web flat config:
`languageOptions.parserOptions.projectService: true` (or an explicit
`tsconfig.eslint.json`) scoped to `src/**/*.{ts,tsx}`, then introduce
`no-floating-promises`, `no-misused-promises`, `prefer-nullish-coalescing`,
`prefer-optional-chain` as **`warn`**. Drive the warning count to zero, then
ratchet `no-floating-promises` + `no-misused-promises` to **`error`** to match
the API. Keep the type-aware block off test files (they already relax strict
rules at web :473–485). Cost note: type-aware linting is slower; scope it to
`src/**` and keep the non-typed pass for config/scripts.

### ES-02 — API uses `strict`, not `strictTypeChecked` (no-unsafe-\* family OFF) · High

**Evidence.** [`apps/api/eslint.config.mjs`](../../apps/api/eslint.config.mjs)
line 10 spreads `...tseslint.configs.strict`. It does **not** spread
`strictTypeChecked` (or `recommendedTypeChecked`). Because the typed parser is
already present (api :39–42), the type-aware rules those presets would enable are
simply never registered.

**Impact.** Off everywhere in the API: `no-unsafe-assignment`,
`no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-argument`,
`no-unsafe-return`, `restrict-template-expressions`, `restrict-plus-operands`,
`no-unnecessary-condition`, `no-unnecessary-type-assertion`, `prefer-readonly`,
`strict-boolean-expressions`. With `no-explicit-any: error` already on, the
residual risk is **`unknown` / inferred-`any` leakage** from untyped boundaries
— `JSON.parse`, Prisma raw queries, axios responses, Zod `.passthrough()`,
external SDKs — flowing unchecked into business logic. These are precisely the
boundaries a BFF lives on.

**Fix (staged).** Swap `tseslint.configs.strict` →
`tseslint.configs.strictTypeChecked` (the parser requirement is already met).
Expect an initial spike of `no-unsafe-*` / `restrict-template-expressions`
findings at trust boundaries. Run advisory-only first (lint is already
`continue-on-error`), triage by adding explicit types/`unknown` narrowing at the
boundary, then keep the preset on. If `strict-boolean-expressions` proves too
noisy against existing truthiness checks, downgrade that single rule to `warn`
rather than abandoning the whole preset.

### ES-03 — `packages/ai` and `packages/shared` are entirely unlinted · High

**Evidence.** No `eslint.config.*` exists anywhere under `packages/` (`glob`
returned nothing). [`packages/ai/package.json`](../../packages/ai/package.json)
lines 25–26 define `lint`/`lint:strict` as `echo "(ai) lint via consumers"`.
[`packages/shared/package.json`](../../packages/shared/package.json) lines 25–26
do the same (`"(shared) no lint configured yet"`). The "lint via consumers"
claim does not hold — neither app's config globs into `../../packages`, so this
code is linted by nobody. The unlinted source includes
`packages/ai/src/safety.ts` and `packages/ai/src/redaction.ts` (verified
present), i.e. the AI **safety/approval-policy** and **PII/secret redaction**
primitives.

**Impact.** The most safety-critical shared code on the platform — redaction
before model calls, approval-category classification — gets none of the
`no-explicit-any` / `no-non-null-assertion` / security-plugin coverage the apps
get. A redaction regex regression (ReDoS) or an `any` hole in safety
classification would pass completely unlinted. This is High not because a bug is
known, but because the **blast radius** (both apps consume these) is maximal and
the coverage is zero.

**Fix (staged).** Create a shared flat config under
[`packages/config/eslint`](../../packages/config) (the package already lists an
`eslint` dir in its `files` array but ships none) exporting a Node/TS base —
`no-explicit-any: error`, `no-non-null-assertion: error`,
`consistent-type-imports`, the security plugin, and a typed parser via
`projectService`. Replace the `echo` stubs in `packages/ai` and
`packages/shared` with real `eslint .` scripts that consume the shared config,
and add a `lint` task to the relevant Turbo pipeline. Land as advisory, fix
`safety.ts`/`redaction.ts` first, then make those two files zero-warning before
widening.

### ES-04 — No size/complexity budgets (god-files pass lint) · Medium

**Evidence.** `grep` for `max-lines|max-depth|max-params|no-magic-numbers`
across both app configs returns a single hit:
[`apps/api/eslint.config.mjs`](../../apps/api/eslint.config.mjs) line 410
`max-lines-per-function` (`warn`, max 50) — and it is scoped **only** to
`src/**/*.service.ts`. Cyclomatic `complexity` exists at api :145 (global 15) and
api :420 (services 10). The **web** config has **no** `complexity` and **no**
length budget of any kind. There is no `max-lines` (whole-file), `max-depth`,
`max-params`, or `no-magic-numbers` anywhere in the monorepo.

**Impact.** Nothing caps file size, nesting depth, parameter count, or magic
numbers. A 1,600-line service or a deeply nested component passes lint cleanly,
which is why such files can exist undetected (see the architecture audit). This
directly undercuts the `CLAUDE.md` "thin orchestrator" intent — the function cap
helps, but a service file can still grow without bound across many short
methods.

**Fix (staged).** Add to the shared base (or both app configs) as **`warn`**:
`max-lines` (e.g. 400, `skipBlankLines`/`skipComments`), `max-depth` (4),
`max-params` (4). Add `complexity` + `max-lines-per-function` to the **web**
config (it has neither). Defer `no-magic-numbers` — it is noisy and lower value;
if adopted, configure generous `ignore` (0, 1, -1, common HTTP codes) and keep
it `warn` indefinitely. Ratchet the structural budgets to `error` per-directory
as existing violations are refactored, newest/cleanest directories first.

### ES-05 — `ban-ts-comment` not machine-enforced (web rule #12 is doc-only) · Medium

**Evidence.** `grep` for `ban-ts-comment` across both app configs returns
nothing — the rule is registered in **neither**. `apps/web/CLAUDE.md` rule #2 /
#12 declares a "zero-exception" ban on `@ts-ignore` / `@ts-expect-error` /
`// eslint-disable`, but that ban is enforced by humans, not the linter. On the
API it is only transitively covered by the `tseslint.configs.strict` preset's
default `ban-ts-comment`; it is never set explicitly.

**Impact.** A developer can add `// @ts-ignore` / `// @ts-expect-error` to a
`.tsx` file and silence `tsc` with nothing in lint objecting — a direct,
undetected violation of a stated absolute rule. Because the rule exists to
protect `no-explicit-any` and the strict matrix from being bypassed, an
unenforced ban is a hole in those rules too.

**Fix (staged).** Add `@typescript-eslint/ban-ts-comment: 'error'` (with
`ts-expect-error: 'allow-with-description'` only if the team wants an escape
hatch — `CLAUDE.md` says no, so prefer plain `error`) explicitly to **both**
apps. Also consider `eslint-comments/no-use` (or core `no-inline-comments`
patterns) to back rule #12's `// eslint-disable` ban. This can land directly at
`error` if `grep` confirms zero existing `@ts-` comments; otherwise warn-first.

### ES-06 — Key hygiene rules are `warn`, only caught by `lint:strict` · Low

**Evidence.** `@typescript-eslint/consistent-type-imports` is `warn` (web :134 /
api :65); `@typescript-eslint/explicit-function-return-type` is `warn` (api
:78). These only fail under `lint:strict --max-warnings 0`
(`apps/*/package.json`), and CI runs plain `pnpm lint` advisory-only
([`ci.yml`](../../.github/workflows/ci.yml) :51–53). So in practice they are
non-blocking twice over.

**Impact.** Low. These are style/contract-clarity rules, not correctness. The
risk is drift (mixed type-import styles, implicit return types on exported API
surfaces) rather than bugs.

**Fix (staged).** Optional. Once `lint` becomes a hard gate (R1 cleanup), these
`warn`s start mattering automatically. If desired, promote
`consistent-type-imports` to `error` after a `lint:fix` autofix pass (it is
auto-fixable). Leave `explicit-function-return-type` at `warn`.

### ES-07 — Web `tsconfig.json` targets ES2020 and does not extend the base · Low

**Evidence.** [`apps/web/tsconfig.json`](../../apps/web/tsconfig.json) line 3
sets `"target": "ES2020"`, whereas [`apps/api/tsconfig.json`](../../apps/api/tsconfig.json)
line 9 and the rest of the platform use `ES2022`. The web config also does
**not** `extends` [`tsconfig.base.json`](../../tsconfig.base.json); instead it
re-declares the strict flags inline (web tsconfig :7–27), duplicating the base.

**Impact.** Low, but two real risks: (1) the duplicated strict flags can **drift**
out of sync with the base — a flag added to `tsconfig.base.json` will silently
not apply to web; (2) ES2020 forgoes ES2021/2022 lib niceties uniformly
available elsewhere, and a mismatch between the documented target (web
`CLAUDE.md` says ES2020) and the rest of the platform is a maintenance trap.

**Fix.** Align web `target` to `ES2022` and refactor web `tsconfig.json` to
`extends: "../../tsconfig.base.json"`, keeping only web-specific keys
(`jsx`, `plugins`, `paths`, `lib`, `moduleResolution: bundler`, `noEmit`).
Verify with `pnpm typecheck` (hard gate) before/after — a no-behavior-change
refactor. This is config-only and not staged; it lands or it does not.

---

## 4. Prioritized remediation table

Ordered by severity, then leverage. "Land as" reflects GOD MODE §11 staged
enforcement — introduce non-breaking, ratchet later.

| #     | Gap                                                         | Sev    | Land as            | Ratchet target                                               | Evidence                                                           |
| ----- | ----------------------------------------------------------- | ------ | ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------------ |
| ES-01 | Web has no type-aware linting                               | High   | `warn` (typed)     | `no-floating-promises` + `no-misused-promises` → `error`     | `apps/web/eslint.config.mjs` (no `project`/`projectService`)       |
| ES-02 | API on `strict`, not `strictTypeChecked` (no-unsafe-\* off) | High   | advisory preset    | keep preset on; `strict-boolean-expressions` may stay `warn` | `apps/api/eslint.config.mjs:10`                                    |
| ES-03 | `packages/ai` + `packages/shared` unlinted (echo stubs)     | High   | advisory           | `safety.ts` + `redaction.ts` zero-warning, then widen        | `packages/ai/package.json:25-26`; no `packages/**/eslint.config.*` |
| ES-04 | No size/complexity budgets; web has none at all             | Medium | `warn`             | `max-lines`/`max-depth`/`max-params` → `error` per-dir       | `apps/api/eslint.config.mjs:410` (only budget); web has none       |
| ES-05 | `ban-ts-comment` not explicitly configured (web rule #12)   | Medium | `error` (if clean) | enforce on both apps                                         | no `ban-ts-comment` in either config                               |
| ES-06 | `consistent-type-imports` / `explicit-return-type` = warn   | Low    | n/a                | promote `consistent-type-imports` → `error` post-`lint:fix`  | web :134 / api :65, :78                                            |
| ES-07 | Web `target: ES2020`, does not extend base                  | Low    | direct (config)    | align ES2022 + `extends` base                                | `apps/web/tsconfig.json:3`                                         |

---

## 5. Sequencing notes

- **CI posture is the precondition.** All ES-0x ramps assume `lint` stays
  advisory ([`02-risk-register.md`](./02-risk-register.md) R1) until the
  warn-phase backlog for each finding is cleared, then individual rules ratchet
  to `error` while `lint` itself is promoted to a hard gate. Do not flip the job
  to blocking and the rules to `error` in the same change.
- **Shared base first.** ES-03 (shared `packages/config/eslint` base) is the
  natural home for the ES-04 budgets and the ES-05 `ban-ts-comment` rule, so
  build the shared config once and let all three findings consume it.
- **Type-aware cost.** ES-01 and ES-02 both add type-aware passes (slower). Keep
  them scoped to `src/**`, exclude tests and config/scripts, and rely on the
  `--concurrency=auto` lint invocation already in `apps/*/package.json`
  (see [`ci-lint-concurrency`](./02-risk-register.md) context) to keep CI sane.
- **Evidence discipline.** Per GOD MODE §16.1 and `CLAUDE.md`, no remediation is
  "done" until `pnpm typecheck` + `pnpm build` (hard gates) are green and the
  before/after warning counts are quoted from real `pnpm lint` output. See
  [`skills/devsecops/harden-eslint.md`](../../skills/devsecops/harden-eslint.md)
  for the per-step procedure.
