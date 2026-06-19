# TypeScript & tsgo

> See [ADR-0005](../decisions/ADR-0005-typescript-and-tsgo.md) for the decision.

## Versions

| Tool                                  | Version   | Role                           |
| ------------------------------------- | --------- | ------------------------------ |
| `typescript`                          | 5.9.x     | **blocking** typecheck (`tsc`) |
| `@typescript/native-preview` (`tsgo`) | 7.0.0-dev | **advisory** fast typecheck    |

## Commands

| Command               | What it runs                                     | Blocking?         |
| --------------------- | ------------------------------------------------ | ----------------- |
| `pnpm typecheck`      | `tsc --noEmit` across all packages (turbo)       | **yes** (CI gate) |
| `pnpm typecheck:ci`   | same as above, the explicit CI alias             | **yes** (CI gate) |
| `pnpm typecheck:fast` | `tsgo -p tsconfig.json --noEmit` across packages | no (advisory)     |

Per package, `typecheck` / `typecheck:ci` use `tsc`; `typecheck:fast` uses `tsgo`.

## Why `tsc` stays the gate

`tsc` is the reference compiler — it matches Next.js, NestJS, Prisma, Vitest,
Jest, Playwright, and ESLint type-aware rules exactly. `tsgo` is a dev preview
and is **not** a drop-in replacement yet. We never weaken a tsconfig to make
`tsgo` pass.

## Current tsgo status (2026-06-20)

| Project           | tsc | tsgo | Notes                                                          |
| ----------------- | --- | ---- | -------------------------------------------------------------- |
| `packages/shared` | ✅  | ✅   | works                                                          |
| `packages/ai`     | ✅  | ✅   | works                                                          |
| `apps/api`        | ✅  | ❌   | `TS5102`: tsgo removed `baseUrl`; `TS5090`: non-relative paths |
| `apps/web`        | ✅  | ❌   | `TS2882`: side-effect import `./globals.css` not resolvable    |

Reproduce: `pnpm --filter @auraspear/ai typecheck:fast` (passes),
`pnpm --filter @auraspear/api typecheck:fast` (shows the blockers).

## Migration plan

1. Keep `tsc` as the only blocking gate.
2. Use `pnpm typecheck:fast` locally for fast inner-loop checks on the packages.
3. When tsgo handles `baseUrl`/paths and CSS side-effect imports without tsconfig
   changes, add `typecheck:fast` as a **non-blocking** CI job, then (once parity
   is proven) consider promoting it.

## Strict flags (kept, not relaxed)

Both apps and the packages run with strict TypeScript (`strict`,
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
`noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature` where feasible).
The shared base is `tsconfig.base.json`. Do not weaken these to satisfy tooling.
