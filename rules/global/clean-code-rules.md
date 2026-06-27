# Clean-code rules — the cross-cutting hygiene every file obeys

> **Read `AGENTS.md` first** (repo root) for the AI loading order and the one
> rule: _no AI agent may edit first and understand later._ Then read the app you
> are touching: `apps/web/CLAUDE.md` (63 enforced rules) or `apps/api/CLAUDE.md`
> (100 enforced rules). Where this file and a `CLAUDE.md` overlap, the CLAUDE.md
> rule number is authoritative. This file **consolidates** the clean-code
> invariants that span both apps so you don't have to rediscover them per file.

These are **hard constraints** for any TypeScript in `apps/web/src/**`,
`apps/api/src/**`, and `packages/*/src/**`. Almost every rule here is an ESLint
`error` (it blocks `pnpm lint`) or a `tsc` error (it blocks `pnpm typecheck`, the
single blocking gate — `validation-gates.md`). Code that breaks one is wrong even
if it compiles and runs. GOD MODE §9 (clean code) is the source; the
verification lives in `docs/audit/architecture-clean-code-audit.md` §4 and
`docs/audit/eslint-hardening-audit.md`.

Related: `absolute-rules.md` §1 (type-safety summary), `solid-rules.md` (the
design-principle layer above these), `file-organization-rules.md` (where each
declaration lives), `refactor-workflow.md` (how to clean up safely without
breaking behavior), and the per-layer files `../backend/layering-rules.md` /
`../frontend/component-rules.md`.

---

## 1. Never `any`, never suppress, never weaken the gate

- **No `any`.** Use `unknown`, a generic, or a real type.
  `@typescript-eslint/no-explicit-any` is `error` in both apps
  (`apps/api/CLAUDE.md` rule 1, `apps/web/CLAUDE.md` rule 1). `catch (e)` is
  `unknown` (`useUnknownInCatchVariables: true`) — narrow it, don't cast.
- **No suppressions, zero exceptions.** No `// eslint-disable`,
  `// eslint-disable-next-line`, `@ts-ignore`, `@ts-expect-error`
  (`apps/api/CLAUDE.md` rule 2, `apps/web/CLAUDE.md` rules 2 & 12). If a rule
  fires, fix the root cause. If you cannot, stop and report it as a blocker
  (`AGENTS.md` §13) — do not silence it.
- **No `!` non-null assertion.** `@typescript-eslint/no-non-null-assertion` is
  `error`. Use `if`, `??`, `?.`, or narrow the type
  (`apps/api/CLAUDE.md` rule 5, `apps/web/CLAUDE.md` rule 7).
- **Never weaken `tsconfig` to pass typecheck.** `tsc` (TS 5.9) is the single
  blocking gate; `tsgo`/`typecheck:fast` is advisory only and must never become
  the gate by config change (`AGENTS.md` §4–§5, `ADR-0005`).

## 2. No `console.log`; log through the real logger

- **No `console.log`** — `no-console` is `warn`, only `console.warn` /
  `console.error` are allowed (`apps/api/CLAUDE.md` rule 6, `apps/web/CLAUDE.md`
  rule 8).
- **Backend: prefer the NestJS `Logger` / `ServiceLogger`**
  (`apps/api/src/common/services/service-logger.ts`) over raw `console`
  (`apps/api/CLAUDE.md` rule 6; `library-wrapper-rules.md`). The only sanctioned
  raw `console.warn` is the TLS-skip warning (`apps/api/CLAUDE.md` rule 50).
- **Never log secrets/tokens/credentials**, frontend or backend — not in
  `console.warn`, error handlers, or Zustand devtools (`apps/web/CLAUDE.md` rule
  39; `apps/api/CLAUDE.md` rules 57 & 66; `../security/security-rules.md` §9).

## 3. Guard clauses and early returns over nesting

- **Return early.** `no-else-return` and `unicorn/no-lonely-if` push you to flat
  guard clauses, not pyramids of `if/else`. Validate-and-bail at the top of a
  function; keep the happy path un-indented.
- **No nested ternaries.** `no-nested-ternary` (web) and
  `unicorn/no-nested-ternary` (api, `error`) ban `a ? b : c ? d : e` — extract a
  variable or use `if/else` (`apps/web/CLAUDE.md` rule 19,
  `apps/api/CLAUDE.md` rule 70).
- **No `==`/`!=`, no `var`.** `eqeqeq` and `no-var` are `error` (both apps,
  rules 3–6). Use `===`/`!==`, `const`/`let`.
- **Prefer `??`/`?.` over `||`/`&&` chains** for nullish values
  (`@typescript-eslint/prefer-nullish-coalescing`, `prefer-optional-chain` —
  `apps/api/CLAUDE.md` rule 73).

## 4. Small functions; extract cohesive logic

- **Backend service methods stay under 30 lines and complexity ≤ 10.**
  `max-lines-per-function` (warn, max 30) and `complexity` (warn, max 10) run on
  `*.service.ts`; every 3–5 lines of cohesive logic moves to
  `<module>.utilities.ts` (`apps/api/CLAUDE.md` rule 14a;
  `../backend/layering-rules.md` §2). _Size alone is not the smell_ — a long,
  cohesive `*.utilities.ts` of pure functions is fine; a method that mixes
  unrelated responsibilities is not (`docs/audit/architecture-clean-code-audit.md`
  §4, BE-04).
- **Frontend page hooks stay focused.** Logic lives in `src/hooks/`, not in
  `.tsx`; a god hook that has accreted unrelated concerns must be split (FE-02/
  FE-03; `solid-rules.md` §SRP, `../frontend/hook-service-rules.md`).
- **Every backend function declares an explicit return type**
  (`@typescript-eslint/explicit-function-return-type`, warn —
  `apps/api/CLAUDE.md` rule 67).

## 5. No dead code, no commented-out code, no fake-green

- **No dead code.** Unregistered job handlers, executors that are never called,
  `export {}` no-ops, and unreachable branches are violations
  (`apps/api/CLAUDE.md` rules 31, 32; `no-useless-empty-export` error;
  `allowUnreachableCode: false`). `noUnusedLocals`/`noUnusedParameters` are on —
  unused symbols fail `tsc` (prefix a deliberately-unused arg with `_`).
- **No commented-out code.** Delete it; git is the history. Do not ship a block
  of `// const old = ...` "just in case."
- **No fake-green.** Never claim a gate passed unless you ran it and saw the
  output (`AGENTS.md` §5, §13; `qa-gatekeeper` rejects unproven claims).

## 6. DRY — one source of truth per contract

- **No duplicated logic across services/components** — extract to a shared
  utility (`apps/api/CLAUDE.md` §"Architecture Enforcement"; web rule 15).
- **No duplicated contracts.** The cautionary example is **PKG-01**: `apps/api`
  and `packages/ai` each define `AiActionCategory` with **different string
  values** (`analysis_only` vs `analysis-only`) — a divergence that silently
  mismatches on serialization (`docs/audit/architecture-clean-code-audit.md`
  PKG-01). When two files need the same shape, define it once. Frontend types
  live once in `src/types/` (`apps/web/CLAUDE.md` "Type Conventions" — duplicates
  prohibited); query keys should come from one factory, not 68 inline literals
  (FE-04). See `monorepo-boundaries.md` and `library-wrapper-rules.md`.
- **No raw string literals where an enum exists.** `'active'` →
  `CaseCycleStatus.ACTIVE`; no string-literal union types (`TSUnionType >
TSLiteralType` is `error` — `apps/web/CLAUDE.md` rule 17, `apps/api/CLAUDE.md`
  rule 12; `file-organization-rules.md`).

## 7. Modern, safe idioms (unicorn/import-x)

- Use `.find()`/`.some()`/`.includes()`/`.flatMap()` over manual loops;
  `Number.isNaN()`/`Number.parseInt()`; `.startsWith()`/`.endsWith()`;
  `throw new Error(message)` with a message (`prefer-array-find`,
  `prefer-includes`, `prefer-number-properties`, `throw-new-error`,
  `error-message` — all `error`).
- Backend: `node:` import prefix (`unicorn/prefer-node-protocol`, error, rule
  11); no `Array#reduce` (rule 68); full words, not abbreviations
  (`unicorn/prevent-abbreviations` — `utilities` not `utils`, rule 69).
- Imports: no duplicates, no self-import, **no cycles**
  (`import-x/no-cycle`), ordered builtin → external → internal → relative → type;
  web barrels only (`apps/web/CLAUDE.md` rules 24, 26, 28, 29).

---

## Self-check before you commit

- [ ] No `any`, no `!`, no `// eslint-disable` / `@ts-ignore` / `@ts-expect-error`.
- [ ] No `console.log`; secrets/tokens never logged anywhere.
- [ ] Guard clauses over nesting; no nested ternaries; `===`/`!==`, `const`/`let`,
      `??`/`?.`.
- [ ] Service methods < 30 lines & complexity ≤ 10; cohesive logic extracted;
      explicit return types (backend).
- [ ] No dead/commented-out code; no unused locals/params (or `_`-prefixed).
- [ ] No duplicated logic or contracts (one enum/type/util/query-key home); no
      raw string literals where an enum exists.
- [ ] `pnpm typecheck` (blocking) and `pnpm lint` (advisory but reported) ran and
      passed (`validation-gates.md`). Branched first — never `main`
      (`branch-safety.md`).
