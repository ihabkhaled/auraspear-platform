# Monorepo Layout — pnpm + Turborepo

> **Entry point for any contributor or AI agent is [`AGENTS.md`](../../AGENTS.md)**
> (loading order, maps, invariants). Read it first. This doc is the deep reference
> for **how the workspace is wired**: the pnpm/Turborepo layout, the task graph,
> and where each kind of code lives.
>
> **Scope note (avoid duplication):** the platform-wide runtime architecture
> (auth, RBAC, tenancy, connectors, AI cascade, Docker, CI, request flow) is
> documented once in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — this doc links
> there instead of repeating it. How the two original repos were merged is
> recorded in [`docs/MONOREPO_MIGRATION.md`](../MONOREPO_MIGRATION.md). The full
> docs map is [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md).

---

## 1. What manages the workspace

| Concern              | Tool                                              | Config file                                                     |
| -------------------- | ------------------------------------------------- | --------------------------------------------------------------- |
| Package manager      | **pnpm** (pinned `pnpm@10.30.3`, node `>=22 <25`) | [`package.json`](../../package.json) `packageManager`/`engines` |
| Workspace membership | **pnpm workspaces**                               | [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml)              |
| Task orchestration   | **Turborepo** (`turbo@^2.9`)                      | [`turbo.json`](../../turbo.json)                                |
| Shared TS base       | one root tsconfig every package extends           | [`tsconfig.base.json`](../../tsconfig.base.json)                |
| Root formatting      | Prettier (platform-level files)                   | [`prettier.config.mjs`](../../prettier.config.mjs)              |

> The workspace is **mid-upgrade** — do **not** run `pnpm install` / `pnpm build`
> as part of documentation or exploratory work. The root [`package.json`](../../package.json)
> already pins `typescript@^6`, `turbo@^2.9.18`, and a `@typescript/native-preview`
> (tsgo) build; treat versions here as the source of truth over any prose.

`pnpm-workspace.yaml` declares two globs — that is the entire membership rule:

```yaml
packages:
  - apps/*
  - packages/*
```

It also carries a few **deliberate pnpm policies** (read the file for the inline
rationale, each is comment-documented):

- **`overrides: zod@4: 4.4.3`** — dedupes Zod 4 so the web app's schemas and
  `@hookform/resolvers` share one set of Zod-4 internal types. Scoped to v4 only;
  the **api app intentionally stays on Zod 3.x** until a deliberate milestone.
- **`packageExtensions`** re-declares a `zod` peer on `@hookform/resolvers` so
  pnpm's isolated `node_modules` co-locates the app's Zod 4 with the resolver
  (see [ADR-0004](../decisions/)).
- **`onlyBuiltDependencies`** (pnpm 10 secure-by-default build policy) — only
  `@prisma/client`, `@prisma/engines`, `prisma`, and `esbuild` may run install
  scripts. **`ignoredBuiltDependencies`** keeps `sharp` and `unrs-resolver`
  unbuilt on purpose.

---

## 2. Workspace map (`apps/*`, `packages/*`)

The high-level map also lives in [`AGENTS.md` §3](../../AGENTS.md). Concretely:

```
auraspear-platform/
├── apps/
│   ├── web/      @auraspear/web   — Next.js 16, React 19, Tailwind 4 (SOC UI + API proxy)
│   └── api/      @auraspear/api   — NestJS 11, Prisma 7, Postgres, Redis (BFF)
├── packages/
│   ├── shared/   @auraspear/shared — cross-app contracts (enums/types/permissions/schemas)
│   ├── config/   @auraspear/config — shared tooling presets (tsconfig, prettier)
│   └── ai/       @auraspear/ai     — AI safety/redaction/routing/eval/prompts
├── infra/docker/ — base + dev/prod/infra/connectors compose, Dockerfiles via apps/*
├── scripts/      — install/ (doctor, setup-env) + ci/ helpers
├── docs/         — product, architecture, security, ai, tools, audit, decisions (ADRs)
├── rules/ skills/ memory/ context/ — the AI-onboarding system (the repo's "brain")
└── .claude/agents/ .cursor/rules/  — Claude subagents + Cursor rules
```

### The two apps (the shippable units)

| Package          | Path       | Stack                                   | Role                                                                   |
| ---------------- | ---------- | --------------------------------------- | ---------------------------------------------------------------------- |
| `@auraspear/web` | `apps/web` | Next.js 16 (App Router), React 19, TW 4 | SOC UI **and** the Next.js API-proxy layer (`src/app/api/**`)          |
| `@auraspear/api` | `apps/api` | NestJS 11, Prisma 7, PostgreSQL, Redis  | Backend-for-Frontend: owns DB, credentials, tenant scoping, connectors |

Each app is independently buildable and owns its own `tsconfig.json`,
`eslint.config.mjs`, `.prettierrc`, and Husky/lint-staged pre-commit pipeline.
Their hard rules (architecture, ESLint, conventions) live in
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) and
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — load the one for the app you
are editing. The runtime relationship (web proxies to api; api is the BFF) is in
[`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §2 and §15.

### The three packages (shared foundations)

All three are `private`, `"type": "module"`, **source-only** (their `exports`
point straight at `src/*.ts` — no build step today, see §3):

| Package             | Path              | Contents                                                                                                                                                |
| ------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@auraspear/shared` | `packages/shared` | Cross-app contracts (enums, types, permissions, API response shapes, Zod schemas). Currently **scaffolded** — `src/index.ts` is a ~19-line placeholder. |
| `@auraspear/config` | `packages/config` | Shared tooling presets, exported via `package.json#exports`: `./tsconfig/base.json` and `./prettier`. Presets-only (nothing to typecheck/lint).         |
| `@auraspear/ai`     | `packages/ai`     | Dependency-free AI building blocks: `model-router.ts`, `prompts.ts`, `redaction.ts`, `safety.ts`, `evaluators.ts`, `types.ts`, barrel `index.ts`.       |

> **Wiring status:** `apps/web` and `apps/api` do **not yet declare**
> `@auraspear/shared`, `@auraspear/config`, or `@auraspear/ai` in their
> `dependencies` (confirmed: no `@auraspear/*` deps in either app's
> `package.json`). The packages exist and are workspace members, but consumption
> is part of the in-flight upgrade. When you wire one in, add it as
> `"@auraspear/shared": "workspace:*"` so pnpm links the local source.

---

## 3. Task graph (Turborepo)

[`turbo.json`](../../turbo.json) defines the pipeline. Globals: `globalEnv`
`["NODE_ENV", "CI"]`, `globalDependencies` `["tsconfig.base.json", ".env"]` (a
change to either invalidates all task caches), and `ui: "stream"`.

| Task             | `dependsOn` | Cache  | Outputs / notes                             |
| ---------------- | ----------- | ------ | ------------------------------------------- |
| `build`          | `^build`    | yes    | `.next/**` (minus `.next/cache`), `dist/**` |
| `dev`            | —           | **no** | `persistent: true` (long-running)           |
| `lint`           | `^build`    | yes    | —                                           |
| `lint:strict`    | `^build`    | yes    | —                                           |
| `lint:fix`       | —           | **no** | —                                           |
| `typecheck`      | `^build`    | yes    | —                                           |
| `typecheck:ci`   | `^build`    | yes    | —                                           |
| `typecheck:fast` | `^build`    | **no** | tsgo (advisory)                             |
| `test`           | `^build`    | yes    | `coverage/**`                               |
| `test:cov`       | `^build`    | yes    | `coverage/**`                               |
| `test:e2e`       | —           | **no** | —                                           |
| `format:check`   | —           | yes    | (no deps)                                   |

**Reading `^build`:** the caret means _"first run `build` in all of this
package's workspace dependencies."_ So once a package (e.g. `@auraspear/shared`)
is wired as a dependency of an app and gains a `build` script, Turborepo will
build it before the app's `build`/`typecheck`/`lint`/`test`. **Today this edge is
effectively a no-op**: the apps don't depend on the packages yet, and the three
packages have **no `build` script** (they're consumed as source via their
`exports → src/*.ts`). The dependency relationship is declared now so the graph
is correct the moment the packages are wired in.

### How tasks are invoked

The root [`package.json`](../../package.json) scripts are thin wrappers over
`turbo run`, e.g.:

```jsonc
"build":        "turbo run build",
"typecheck":    "turbo run typecheck",
"lint:strict":  "turbo run lint:strict",
"test":         "turbo run test",
"validate":     "turbo run typecheck lint:strict && pnpm format:check",
"validate:full":"turbo run typecheck lint:strict test build",
```

A handful of scripts **bypass Turbo** and target one workspace via
`pnpm --filter`:

```jsonc
"dev:web":         "pnpm --filter @auraspear/web dev",
"dev:api":         "pnpm --filter @auraspear/api start:dev",
"prisma:generate": "pnpm --filter @auraspear/api prisma:generate",
"prisma:migrate":  "pnpm --filter @auraspear/api prisma:migrate",
"prisma:seed":     "pnpm --filter @auraspear/api prisma:seed",
```

Root-level `format` / `format:check` run Prettier across the whole tree directly
(not through Turbo), and the `docker:*`, `doctor`, `setup:env`, `audit:*`, and
`scan:*` scripts are root tooling. The full command catalogue is in
[`AGENTS.md` §4](../../AGENTS.md) and `memory/COMMANDS_MEMORY.md`.

> **Per-app scripts differ from root scripts.** Inside `apps/api` the dev/prod
> scripts chain `prisma:generate → prisma:migrate:prod → prisma:seed` before
> Nest starts; `apps/web` uses `next dev`/`next build` and `vitest` +
> `playwright`. Don't assume an app script name maps 1:1 to a Turbo task — check
> the app's own `package.json`.

### Validation gates

Which checks are **blocking** vs **advisory** is defined in
[`AGENTS.md` §5](../../AGENTS.md) and `rules/testing/quality-gates.md`, and the CI
wiring is in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §14. Summary: `typecheck`

- `build` (+ Docker build, gitleaks, CodeQL) are hard gates; `lint` / `test` /
  `format:check` / audits are currently advisory due to tracked debt. Do not claim
  "all green" unless the required gates actually ran.

---

## 4. Where code lives (the routing rule)

```
Frontend (UI + Next.js API proxy) ── apps/web/src
Backend (BFF, business logic, DB) ── apps/api/src
Database schema / migrations / seed ─ apps/api/prisma
Cross-app contracts ───────────────── packages/shared/src
AI foundations (router/redaction/…) ─ packages/ai/src
Shared tooling presets ────────────── packages/config
Compose / Dockerfiles wiring ──────── infra/docker (+ apps/*/Dockerfile)
Install + CI helper scripts ───────── scripts/install, scripts/ci
```

The internal structure **within** each app is governed by that app's CLAUDE.md
(both enforce strict separation-of-concerns via ESLint), so look there before
adding a file:

- **`apps/web/src`** — App Router under `app/` (route groups `(auth)` /
  `(portal)`, proxy routes under `app/api/**`), plus `components/`, `hooks/`,
  `services/`, `stores/`, `enums/`, `types/`, `lib/`, `i18n/`. Barrel imports are
  mandatory; enums/types/hooks/utilities each have a dedicated home. See
  [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) "Architecture".
- **`apps/api/src`** — NestJS modules under `modules/<module>/` following the
  strict `Controller → Service → Repository → Prisma` layering, with
  `<module>.{controller,service,repository,utilities,types,enums,constants}.ts`
  and `dto/`. Cross-cutting code in `common/` (guards, interceptors, filters,
  pipes, decorators, utils). DB lives in `prisma/`. See
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) "Project Structure".

The **api app is the sole owner of the database** — the web app never touches
Postgres; it proxies to the api ([`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §2,
§8).

---

## 5. Shared TypeScript base

Every package's `tsconfig.json` extends the root
[`tsconfig.base.json`](../../tsconfig.base.json), which turns on the strict
foundation shared platform-wide: `strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`,
`noImplicitReturns`, `noUnusedLocals`/`noUnusedParameters`,
`noPropertyAccessFromIndexSignature`, `useUnknownInCatchVariables`,
`isolatedModules`, and `moduleDetection: "force"`. `tsconfig.base.json` is a
Turbo `globalDependency`, so editing it busts every task's cache. Apps layer
their own target/module/JSX settings on top (web: ES2020 + bundler resolution +
`jsx: preserve`; api: ES2022 + CommonJS + decorators) — see each app's CLAUDE.md
"TypeScript Configuration" section.

The `tsgo` (`@typescript/native-preview`) native typechecker powers the advisory
`typecheck:fast` task; details in
[`docs/tools/TYPESCRIPT_AND_TSGO.md`](../tools/TYPESCRIPT_AND_TSGO.md).

---

## 6. Sibling references

- **Entry point & invariants:** [`AGENTS.md`](../../AGENTS.md)
- **Runtime architecture (auth/RBAC/tenancy/connectors/AI/Docker/CI/flow):**
  [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- **How the repos were merged + what's deferred:**
  [`docs/MONOREPO_MIGRATION.md`](../MONOREPO_MIGRATION.md)
- **App rulebooks:** [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) ·
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
- **Decisions behind the workspace policies:** [`docs/decisions/`](../decisions/)
  (ADR-0001 lockfile/workspace, ADR-0004 Zod/resolver peer)
- **Tooling:** [`docs/tools/`](../tools/) ·
  [`docs/ENVIRONMENT.md`](../ENVIRONMENT.md) · [`INSTALL.md`](../../INSTALL.md)
- **Docs map:** [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)
- **Recipes (skills) & hard rules:** [`skills/`](../../skills/) ·
  [`rules/`](../../rules/)
