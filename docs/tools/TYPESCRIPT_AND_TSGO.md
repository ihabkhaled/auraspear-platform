# TypeScript & tsgo

> See [ADR-0005](../decisions/ADR-0005-typescript-and-tsgo.md) for the decision.

## Versions

| Tool                                  | Version   | Role                           |
| ------------------------------------- | --------- | ------------------------------ |
| `typescript`                          | 5.9.x     | **blocking** typecheck (`tsc`) |
| `@typescript/native-preview` (`tsgo`) | 7.0.0-dev | **advisory** fast typecheck    |

> TypeScript 6.0 is available and `tsc`-compiles this repo, but is deferred to a
> dedicated upgrade PR (typescript-eslint + framework type packages target 5.x).
> See `docs/audit/dependency-matrix.md`.

## Commands

| Command                           | Runs                                     | Blocking?         |
| --------------------------------- | ---------------------------------------- | ----------------- |
| `pnpm typecheck` / `typecheck:ci` | `tsc --noEmit` (turbo)                   | **yes** (CI gate) |
| `pnpm typecheck:fast`             | `tsgo -p tsconfig.json --noEmit` (turbo) | no (advisory)     |

## tsgo status (2026-06-20, after the path/CSS fixes)

| Project           | tsc | tsgo | Notes                                                                                                                                                                                                                                           |
| ----------------- | --- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | ✅  | ✅   |                                                                                                                                                                                                                                                 |
| `packages/ai`     | ✅  | ✅   |                                                                                                                                                                                                                                                 |
| `apps/web`        | ✅  | ✅   | **fixed**: added `declare module '*.css'` (`src/css-modules.d.ts`) so tsgo resolves side-effect CSS imports (tsc uses the Next plugin)                                                                                                          |
| `apps/api`        | ✅  | ⚠️   | **path issue fixed**: `tsconfig.json` now uses relative `paths` (`"@/*": ["./src/*"]`) and no `baseUrl` — valid for both tsc and tsgo. Remaining tsgo-only gap: it does not auto-load `@types/jest` globals for the in-`src` `*.spec.ts` files. |

So tsgo is green for the web app and both packages; the api's only remaining
tsgo gap is `jest` globals in co-located spec files (a tsgo `@types`-resolution
limitation on **test** code, not production code).

## Why `tsc` stays the gate

`tsc` is the reference compiler and matches Next.js, NestJS, Prisma, Vitest,
Jest, Playwright, and ESLint type-aware rules. `tsgo` is a dev preview. **We do
not weaken any tsconfig to satisfy tsgo** — the fixes above (relative paths, an
ambient CSS declaration) are valid, non-weakening changes that `tsc` also accepts.

## Migration plan

1. `tsc` remains the only blocking gate.
2. `pnpm typecheck:fast` is usable locally for the packages + web.
3. When tsgo loads `@types/jest` for in-`src` specs (or those specs move under a
   test-scoped tsconfig), add `typecheck:fast` as a **non-blocking** CI job, then
   consider promoting it once parity is proven.

## Strict flags (kept, not relaxed)

Strict TypeScript everywhere (`strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
`noPropertyAccessFromIndexSignature` where feasible). Base: `tsconfig.base.json`.
