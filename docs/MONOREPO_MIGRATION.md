# Monorepo Migration — AuraSpear Platform

This document records how the two original repositories were unified into the
`auraspear-platform` monorepo, what changed, and what is intentionally deferred.

## Source → target mapping

| Original repo (package)                   | New location      | New package name    |
| ----------------------------------------- | ----------------- | ------------------- |
| `auraspear` (`auraspear-soc`)             | `apps/web`        | `@auraspear/web`    |
| `auraspear-backend` (`auraspear-soc-bff`) | `apps/api`        | `@auraspear/api`    |
| _(new)_                                   | `packages/shared` | `@auraspear/shared` |
| _(new)_                                   | `packages/config` | `@auraspear/config` |

Supporting top-level directories were created: `infra/` (docker, k8s, terraform),
`scripts/` (install, ci), `docs/` (incl. `docs/decisions` ADRs and `docs/audit`).

## What changed in this milestone (foundation)

### Workspace & tooling

- **pnpm workspace** (`pnpm-workspace.yaml`) over `apps/*` + `packages/*`; single
  root `pnpm-lock.yaml`. Both apps' `package-lock.json` **and** per-app
  `pnpm-lock.yaml` removed (each repo previously carried both). See ADR-0001.
- **Turborepo** (`turbo.json`) orchestrates `build`/`lint`/`typecheck`/`test`.
- **Root configs added:** `package.json` (scripts + `engines` node `>=22 <25`,
  `packageManager: pnpm@10.30.3`), `tsconfig.base.json`, `.gitignore`, `.npmrc`,
  `prettier.config.mjs`, `commitlint.config.cjs`, `.prettierignore`.
- **Husky centralized at root** — one lightweight `pre-commit` (lint-staged →
  Prettier on staged files) and a `commit-msg` (commitlint). The per-app husky
  installs and the frontend's heavy `pre-commit` (which ran a full
  build + test on every commit) were removed; those gates now run in
  `pnpm validate` / CI. Per-app `commitlint`/`lint-staged` configs removed in
  favor of root ones.
- Per-app `package.json`: renamed to `@auraspear/*`; removed the
  `prepare: node .husky/install.mjs` script. The api keeps
  `postinstall: prisma generate`.

### Dependency fixes surfaced by pnpm's strict node_modules

- **api: added `ws`, `form-data` (+ `@types/ws`)** — these were imported in
  `websocket.service.ts` and `osint-executor.service.ts` but never declared.
  They only resolved before via npm's flat hoisting (phantom dependencies).
- **web: Zod 4 ↔ `@hookform/resolvers` resolution** — fixed with a pnpm
  `packageExtensions` re-declaring `zod` as a peer of `@hookform/resolvers`,
  plus a `zod@4 → 4.4.3` dedupe override. See ADR-0004.

### Node / runtime

- Standardized on **Node 22 LTS** (frontend Dockerfile was on 20). See ADR-0002.

## Validation status (foundation milestone)

| Check                   | web (`@auraspear/web`) | api (`@auraspear/api`)  |
| ----------------------- | ---------------------- | ----------------------- |
| `pnpm install`          | ✅ (single lockfile)   | ✅ (prisma generate OK) |
| `typecheck`             | ✅ 0 errors            | ✅ 0 errors             |
| `lint:strict` / `build` | see FINAL_REPORT / CI  | see FINAL_REPORT / CI   |

## Intentionally deferred (follow-up milestones)

These were scoped out of the foundation milestone to keep it safe and reviewable:

1. **Contract consolidation into `@auraspear/shared`.** Permissions, roles,
   enums, and DTO shapes are still duplicated between `apps/web/src/enums`,
   `apps/web/src/types` and `apps/api/src/common/enums` + per-module
   `*.types.ts`. Both apps enforce strict "declarations live in their home
   folder" ESLint rules, so consolidation must be done module-by-module with
   end-to-end validation.
2. **Dependency major upgrades & de-duplication** (e.g. `sweetalert2` vs
   `sonner`, `dayjs` vs `date-fns`, Zod 3→4 on the api).
3. **`packages/ui` and `packages/ai`** extraction.
4. **Full Docker unification** under `infra/docker` and **unified CI**.
5. **The 9 net-new AI feature areas** from the product brief (the platform
   already ships AI chat, findings, memory, agents, orchestrator, investigation,
   and hunting — this is expansion, not greenfield).

## How a new developer starts

```bash
corepack enable          # or install pnpm 10 standalone
pnpm install
cp .env.example .env                 # root: docker compose values
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm typecheck           # turbo: both apps
pnpm dev                 # web (Next) ; pnpm dev:api for the NestJS API
```
