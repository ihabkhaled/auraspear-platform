# rules/global/repo-navigation.md — Where everything lives

> Read [`AGENTS.md`](../../AGENTS.md) first (the loading order and invariants).
> This file is the map: where code lives, how to trace a feature end-to-end,
> the command map, and how to find the rule/skill/doc that governs your change.
> Always work from the repo root unless a path says otherwise.

## Loading order (from AGENTS.md — do not skip)

Read in this order, **then** edit:

1. `AGENTS.md`
2. `memory/PROJECT_MEMORY.md` (+ other `memory/*.md` for stable truths)
3. relevant `context/*.md`
4. relevant `rules/**/*.md` (hard rules for the area)
5. relevant `skills/**/*.md` (step-by-step recipe)
6. relevant `docs/**` + the existing code and tests
7. then edit

For backend work also read [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md);
for frontend work [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md). They hold the
100+ enforced rules that this file does **not** repeat.

## Top-level layout (what each directory is)

```
auraspear-platform/
├── apps/web/   @auraspear/web  — Next.js 16, React 19, Tailwind 4 (SOC UI + BFF proxy)
├── apps/api/   @auraspear/api  — NestJS 11, Prisma 7, Postgres, Redis (BFF)
├── packages/shared/ @auraspear/shared — cross-app contracts
├── packages/config/ @auraspear/config — shared prettier/tsconfig presets
├── packages/ai/     @auraspear/ai     — AI safety/redaction/routing/eval/prompts
├── infra/docker/    — compose files + Dockerfiles live under apps/*
├── infra/k8s/, infra/terraform/ — deploy targets (scaffold)
├── scripts/install/ — doctor, setup-env, install.sh/.ps1, validate-system
├── scripts/ci/      — dependency-report, docker-healthcheck, env-audit
├── .github/workflows/ — ci, codeql, dependency-review, docker, security
├── docs/            — product, architecture, security, ai, audit, decisions
├── rules/ skills/ memory/ context/ — the AI onboarding system (this repo's brain)
└── .claude/agents/ .cursor/rules/  — Claude subagents + Cursor rules
```

Frontend code → `apps/web/src`. Backend code → `apps/api/src`. Shared contracts →
`packages/shared/src`. AI foundations → `packages/ai/src`. DB → `apps/api/prisma`.
Monorepo is **pnpm workspaces + Turborepo** (`pnpm-workspace.yaml`, `turbo.json`).

## Frontend — `apps/web/src`

Authoritative breakdown is in [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) ("Architecture"). Key dirs:

| Dir                            | What lives here                                                                                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/(auth)/`, `app/(portal)/` | Route groups (login/callback vs. portal shell). Pages: `alerts/`, `cases/`, `connectors/`, `dashboard/`, `hunt/`, `intel/`, `admin/`, `settings/`, etc.            |
| `app/api/`                     | **Next.js BFF proxy routes** — every backend endpoint the UI calls needs a `route.ts` here using `proxyToBackend()`. The UI never calls NestJS directly.           |
| `components/`                  | `ui/` (shadcn base), `common/` (DataTable, PageHeader, Toast, AiConnectorSelect…), plus domain folders (`alerts/`, `cases/`, `layout/`…). Import via barrels only. |
| `hooks/`                       | All `useXxx` hooks (one per file, barrel `@/hooks`). TSX files contain **zero** hook calls.                                                                        |
| `services/`                    | Singleton API service objects over the `@/lib/api` Axios instance. Barrel `@/services`.                                                                            |
| `stores/`                      | Zustand global state (auth, tenant, ai-connector…). Barrel `@/stores`.                                                                                             |
| `enums/`                       | **All** enums (string-literal unions are banned). Barrel `@/enums`.                                                                                                |
| `types/`                       | **All** types/interfaces. Barrel `@/types`.                                                                                                                        |
| `lib/`                         | `utils.ts`, `api.ts`, `api-error.ts`, `dayjs.ts`, `column-renderers.ts`, `constants/`, `validation/`.                                                              |
| `i18n/`                        | `en/es/it/fr/ar/de` translation files — every user string goes through `t()`.                                                                                      |
| `middleware.ts`                | Route protection / auth guard.                                                                                                                                     |

Path alias: `@/*` → `apps/web/src/*`.

## Backend — `apps/api/src`

Authoritative breakdown is in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) ("Project Structure", "Layering"). Layering is strict:

```
Controller → Service → Repository → Prisma
                 ↓
             Utilities
```

| Dir                        | What lives here                                                                                                                                                                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.ts`, `app.module.ts` | Bootstrap + root module (Helmet/CORS/body-limit/pino redact live in `main.ts`/`app.module.ts`).                                                                                                                                                                                                                |
| `modules/<module>/`        | One folder per feature. Files: `<module>.{module,controller,service,repository,utilities,types,enums,constants}.ts`, `dto/`, `__tests__/`. See CLAUDE.md "File Structure Per Module".                                                                                                                          |
| `common/`                  | `decorators/` (`@RequirePermission`, `@TenantId`, `@CurrentUser`, `@Public`), `guards/`, `interceptors/` (audit), `filters/` (GlobalExceptionFilter), `pipes/` (ZodValidationPipe), `utils/` (`encryption.utility.ts`, `ssrf.utility.ts`, `mask.utility.ts`), `enums/`, `interfaces/`, `exceptions/`, `ocsf/`. |
| `config/`                  | `env.validation.ts` — Zod env schema. Fails loudly on missing/zero secrets.                                                                                                                                                                                                                                    |
| `prisma/` (src)            | `prisma.module.ts`, `prisma.service.ts` (connection pool config).                                                                                                                                                                                                                                              |
| `redis/`                   | Redis module/service (blacklist, locks, job polling).                                                                                                                                                                                                                                                          |

Modules present include: `alerts`, `cases`, `case-cycles`, `incidents`, `hunts`,
`intel`, `connectors`, `connector-sync`, `connector-workspaces`, `detection-rules`,
`correlation`, `normalization`, `ai`, `ai-agents`, `agent-config`, `osint-executor`,
`jobs`, `soar`, `auth`, `tenants`, `users`, `users-control`, `role-settings`,
`dashboards`, `reports`, `audit-logs`, `app-logs`, `health`, `system-health`,
`vulnerabilities`, `cloud-security`, `compliance`, `ueba`, `attack-paths`,
`entities`, `knowledge`, `data-explorer`, `notifications`.

Path alias: `@/*` → `apps/api/src/*`. **Services never import `PrismaService`** — go through the repository.

## Database — `apps/api/prisma`

- `schema.prisma` — single Prisma schema (Postgres).
- `migrations/<timestamp>_<name>/migration.sql` — every schema change needs a matching migration (CLAUDE.md rule 30; use `WHERE NOT EXISTS`, never `ON CONFLICT(key)` — the unique constraint is compound `(tenantId, key)`).
- `seed.ts` — idempotent seeder (`upsert`/`skipDuplicates`); no fallback passwords.

## Shared packages — `packages/*`

- `packages/ai/src` — `safety.ts`, `redaction.ts` (`redact()` before model calls), `model-router.ts`, `evaluators.ts`, `prompts.ts`, `types.ts`, barrel `index.ts`. Import as `@auraspear/ai`.
- `packages/shared/src` — cross-app contracts. Import as `@auraspear/shared`.
- `packages/config` — `prettier/` + `tsconfig/` presets consumed by apps.

## Infra & CI

- `infra/docker/` — `docker-compose.yml` (base) + `.dev.yml` / `.prod.yml` / `.infra.yml` / `.connectors.yml`. Dockerfiles live under `apps/*`. Prod compose must not expose internal service ports (CLAUDE.md rule 65).
- `.github/workflows/` — `ci.yml`, `codeql.yml`, `dependency-review.yml`, `docker.yml`, `security.yml`. Hard gates: typecheck, build, Docker image build, gitleaks, CodeQL (see `rules/testing/quality-gates.md` and AGENTS.md §5).
- `scripts/install/` — `doctor.mjs`, `setup-env.mjs`, `install.sh`/`.ps1`, `validate-system.mjs`.
- `scripts/ci/` — `dependency-report.mjs`, `docker-healthcheck.mjs`, `env-audit.mjs`.

## Trace a feature end-to-end (e.g. "cases")

1. **UI page** → `apps/web/src/app/(portal)/cases/` (page + its `useCasesPage` hook in `apps/web/src/hooks/`).
2. **API service** → `apps/web/src/services/` (singleton calling `@/lib/api`).
3. **BFF proxy** → `apps/web/src/app/api/cases/.../route.ts` (`proxyToBackend()`).
4. **Backend controller** → `apps/api/src/modules/cases/cases.controller.ts` (`@RequirePermission`, `@TenantId`, `@Throttle`).
5. **Service → repository** → `cases.service.ts` (orchestrator) → `cases.repository.ts` (Prisma, every method takes `tenantId`).
6. **DTO / types / enums** → `cases/dto/*.dto.ts`, `cases.types.ts`, `cases.enums.ts`.
7. **DB** → model in `apps/api/prisma/schema.prisma` + a migration + seed if needed.
8. **i18n** → keys in all 6 locale files under `apps/web/src/i18n/` (incl. `errors.cases.*` `messageKey`s).

Search shortcut: `Grep` the module name across `apps/api/src/modules/<m>` and `apps/web/src` (app/services/hooks/types). For permission changes the full 8–10-step checklist is `apps/api/CLAUDE.md` rule 85 / `apps/web/CLAUDE.md` rule 34 — use `skills/backend/add-permission.md`.

## Command map (run from repo root — pnpm + turbo only)

| Need to…                                          | Command                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Install                                           | `pnpm install`                                                    |
| Check environment                                 | `pnpm doctor`                                                     |
| Generate `.env` files                             | `pnpm setup:env`                                                  |
| Typecheck (**blocking gate**, tsc)                | `pnpm typecheck`                                                  |
| Fast typecheck (advisory, tsgo)                   | `pnpm typecheck:fast`                                             |
| Lint / strict                                     | `pnpm lint` / `pnpm lint:strict`                                  |
| Format / check                                    | `pnpm format` / `pnpm format:check`                               |
| Test / e2e                                        | `pnpm test` / `pnpm test:e2e`                                     |
| Build                                             | `pnpm build`                                                      |
| Validate (typecheck + lint:strict + format:check) | `pnpm validate`                                                   |
| Full validate (+ test + build)                    | `pnpm validate:full`                                              |
| Run web / api (dev)                               | `pnpm dev:web` / `pnpm dev:api` (or `pnpm dev` for all via turbo) |
| Docker dev / prod / infra / down                  | `pnpm docker:dev` / `:prod` / `:infra` / `:down`                  |
| DB                                                | `pnpm prisma:generate` / `:migrate` / `:seed`                     |
| Audit deps / env                                  | `pnpm audit:deps` / `pnpm audit:env`                              |
| Security scans                                    | `pnpm audit:security` / `pnpm scan:trivy` / `pnpm scan:secrets`   |

Node `>=22 <25`, `pnpm@10.30.3` (pinned in root `package.json`). Never use npm/yarn. `tsc` (`pnpm typecheck`) is the blocking typecheck; `tsgo` (`typecheck:fast`) is advisory only. Full list: `memory/COMMANDS_MEMORY.md`.

## Find the governing rule / skill / doc

- **Hard constraints** → `rules/{global,frontend,backend,security,ai,testing,docs}/`. Load `global` always, then the area for your task.
- **Recipes** → `skills/{frontend,backend,ai,devsecops,qa,docs}/` (e.g. `skills/backend/add-endpoint.md`, `skills/frontend/add-page.md`).
- **Stable truths** → `memory/*.md` (PROJECT, TECHNICAL, SECURITY, AI, BUSINESS, DECISIONS, COMMANDS).
- **Deep reference** → `docs/` (index: `docs/DOCS_INDEX.md`; `docs/ARCHITECTURE.md`, `docs/SECURITY.md`, `docs/AI.md`, `docs/decisions/` ADRs).
- **Delegate** → `.claude/agents/` (e.g. `backend-architect`, `database-prisma-agent`, `qa-gatekeeper`).

## Navigation guardrails (non-negotiable)

- **Never edit on `main`** — branch first (`feat/…`, `fix/…`, `chore/…`). See `rules/global/branch-safety.md`.
- **Prove before deleting** any file/dep/env var — grep imports, routes, `app/api/` proxies, Docker, CI, Prisma, seed, tests, examples first.
- Every tenant-owned query/`update`/`delete` is scoped by `tenantId`; every endpoint has `@RequirePermission`; no auth bypass; no committed or fallback secrets (connector creds are AES-256-GCM).
- AI may analyze/suggest only — destructive actions are approval-required; never render raw AI output as HTML.
- No `any`, no `eslint-disable`. Find the right home file (`types/`, `enums/`, `lib/constants/` on web; `<module>.types.ts` etc. on api) instead of inlining.
