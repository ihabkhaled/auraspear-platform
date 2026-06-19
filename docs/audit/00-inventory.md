# AUDIT 00 — Monorepo Inventory

> Top-level inventory of the **AuraSpear Platform** monorepo
> (`auraspear-platform`, `private: true`, Apache-2.0). AuraSpear is an
> AI-first SOC / SIEM / SOAR / threat-intelligence platform built as a
> **pnpm 10 + Turborepo** workspace. Sources of truth: root `package.json`,
> `pnpm-workspace.yaml`, `turbo.json`, `apps/*/CLAUDE.md`, and the real tree.

**Workspace globs** (`pnpm-workspace.yaml`): `apps/*`, `packages/*`.
**Engines** (root `package.json`): Node `>=22 <25`, pnpm `>=10`,
`packageManager: pnpm@10.30.3`.

Decision legend: **KEEP** = active, in use. **REVIEW** = scaffolded /
partial / undecided. **EMPTY** = directory exists but holds no committed
content.

---

## 1. Repository root

| Path                                                | Purpose                                                                                                                                                                                                        | Owner area | Decision | Notes                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `package.json`                                      | Root workspace manifest; defines all `pnpm`/`turbo` scripts (`dev`, `build`, `lint`, `typecheck`, `test`, `docker:*`, `prisma:*`, `doctor`, `audit:*`).                                                        | Tooling    | KEEP     | `private: true`, version `1.0.0`. devDeps: turbo, prettier, husky, lint-staged, commitlint, typescript. |
| `pnpm-workspace.yaml`                               | Workspace package globs + pnpm overrides (`zod@4: 4.4.3`), `packageExtensions` (`@hookform/resolvers` peer zod), `onlyBuiltDependencies` (prisma, esbuild), `ignoredBuiltDependencies` (sharp, unrs-resolver). | Tooling    | KEEP     | Zod-4 dedupe references ADR-0004; api stays on Zod 3.x.                                                 |
| `turbo.json`                                        | Turborepo task graph (`build`, `dev`, `lint`, `lint:strict`, `typecheck`, `test`, `test:cov`, `test:e2e`, `format:check`); `globalEnv` NODE_ENV/CI.                                                            | Tooling    | KEEP     | Build outputs `.next/**` + `dist/**`; dev is persistent + uncached.                                     |
| `tsconfig.base.json`                                | Base TS config extended across the workspace; listed as a Turbo `globalDependencies`.                                                                                                                          | Tooling    | KEEP     | —                                                                                                       |
| `pnpm-lock.yaml`                                    | pnpm lockfile (~600 KB).                                                                                                                                                                                       | Tooling    | KEEP     | —                                                                                                       |
| `.npmrc`                                            | pnpm/registry settings.                                                                                                                                                                                        | Tooling    | KEEP     | —                                                                                                       |
| `README.md`                                         | Top-level project overview, repo layout, tech stack, quick start, docs index.                                                                                                                                  | Docs       | KEEP     | Layout block omits `packages/ai` (present in tree).                                                     |
| `prettier.config.mjs` / `.prettierignore`           | Prettier config + ignore.                                                                                                                                                                                      | Tooling    | KEEP     | —                                                                                                       |
| `commitlint.config.cjs`                             | Conventional-commit lint rules (used by husky `commit-msg`).                                                                                                                                                   | Tooling    | KEEP     | —                                                                                                       |
| `.lintstagedrc.cjs`                                 | lint-staged config for the pre-commit hook.                                                                                                                                                                    | Tooling    | KEEP     | —                                                                                                       |
| `.husky/`                                           | Git hooks: `pre-commit`, `commit-msg` (+ `_` helper dir).                                                                                                                                                      | Tooling    | KEEP     | Installed via root `prepare: husky`.                                                                    |
| `.github/workflows/`                                | CI: `ci.yml`, `codeql.yml`, `dependency-review.yml`, `docker.yml`, `security.yml`.                                                                                                                             | CI/CD      | KEEP     | CI triggers on push/PR to `main`.                                                                       |
| `.env.example`                                      | Root env template (Docker/compose-level vars).                                                                                                                                                                 | Config     | KEEP     | —                                                                                                       |
| `.env.production.example`                           | Production env template.                                                                                                                                                                                       | Config     | KEEP     | —                                                                                                       |
| `docker-compose.yml` (root)                         | Thin entrypoint that `include:`s `infra/docker/docker-compose.yml` so `docker compose up` works from root.                                                                                                     | Infra      | KEEP     | Canonical stack lives in `infra/docker/`.                                                               |
| `.dockerignore` / `.gitignore` / `.gitattributes`\* | Ignore/attribute rules.                                                                                                                                                                                        | Tooling    | KEEP     | (`.gitattributes` exists per-app, not at root.)                                                         |
| `.turbo/`                                           | Turborepo local cache/log dir (generated).                                                                                                                                                                     | Tooling    | REVIEW   | Build artifact; gitignored.                                                                             |
| `node_modules/`                                     | Installed deps (generated).                                                                                                                                                                                    | Tooling    | REVIEW   | Build artifact; gitignored.                                                                             |

---

## 2. Apps (`apps/*`)

| Path       | Purpose                                                                                                                              | Owner area | Decision | Notes                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web` | **`@auraspear/web`** — Next.js 16 / React 19 / Tailwind 4 SOC UI (multi-tenant analyst frontend + Next API proxy routes to the BFF). | Frontend   | KEEP     | `src/`: `app`, `components`, `enums`, `hooks`, `i18n`, `lib`, `services`, `stores`, `types`. Has `e2e/` (Playwright), `test/`, `vitest.config.ts`, `Dockerfile`, `vercel.json`, rich `CLAUDE.md` (~72 KB) + `docs/`.                                                                                                                     |
| `apps/api` | **`@auraspear/api`** — NestJS 11 Backend-for-Frontend (Express 5, Prisma 7, Postgres, Redis, Zod, Socket.IO, Pino).                  | Backend    | KEEP     | `src/`: `app.module.ts`, `main.ts`, `common`, `config`, `modules`, `prisma`, `redis`. 39 feature modules (auth, alerts, cases, incidents, hunts, intel, connectors, ai, ai-agents, soar, dashboards, etc.). Has `prisma/` (schema + migrations + seed), `Dockerfile`, `docker-entrypoint.sh`, `vercel.json`, rich `CLAUDE.md` + `docs/`. |

**`apps/api/src/modules/` (39):** agent-config, ai, ai-agents, alerts,
app-logs, attack-paths, audit-logs, auth, case-cycles, cases,
cloud-security, compliance, connector-sync, connector-workspaces,
connectors, correlation, dashboards, data-explorer, detection-rules,
entities, health, hunts, incidents, intel, jobs, knowledge,
normalization, notifications, osint-executor, reports, role-settings,
soar, system-health, tenants, ueba, users, users-control, vulnerabilities.

Supporting app dirs worth noting:

| Path                                             | Purpose                                                                             | Owner area   | Decision | Notes                                                          |
| ------------------------------------------------ | ----------------------------------------------------------------------------------- | ------------ | -------- | -------------------------------------------------------------- |
| `apps/api/prisma/`                               | Prisma `schema.prisma`, `migrations/`, idempotent `seed.ts`.                        | Backend / DB | KEEP     | api start scripts run `prisma:generate → migrate:prod → seed`. |
| `apps/api/config/`                               | Connector tuning assets: `wazuh/`, `logstash/`.                                     | Backend      | KEEP     | —                                                              |
| `apps/api/scripts/`                              | Ops/seed helpers (`seed-*.sh`, `resolve-failed-migrations.mjs`, `get-users.ts`).    | Backend      | KEEP     | —                                                              |
| `apps/api/docs/`                                 | Subsystem docs (AI routing/automation, permissions, connectors, migrations).        | Docs         | KEEP     | —                                                              |
| `apps/web/docs/`                                 | Frontend subsystem docs (AI surfaces, OSINT enrichment, dashboard widgets, routes). | Docs         | KEEP     | —                                                              |
| `apps/*/dist`, `apps/web/.next`, `*.tsbuildinfo` | Build outputs (generated).                                                          | Tooling      | REVIEW   | Artifacts; gitignored.                                         |

---

## 3. Packages (`packages/*`)

| Path              | Purpose                                                                                                                    | Owner area       | Decision | Notes                                                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/shared` | **`@auraspear/shared`** — cross-app contracts (enums, types, permissions, API response shapes, Zod schemas) for web + api. | Shared contracts | REVIEW   | TS-source package (`exports` point at `./src/*.ts`); `src/` currently holds only `index.ts`. README labels it "scaffolded".                                                                              |
| `packages/config` | **`@auraspear/config`** — shared tooling presets. Exports `./tsconfig/base.json` and `./prettier`.                         | Tooling / config | REVIEW   | Present: `tsconfig/base.json`, `prettier/index.mjs`. `files` lists `eslint`/`tailwind` but those dirs are not yet present. README labels it "scaffolded".                                                |
| `packages/ai`     | **`@auraspear/ai`** — dependency-free AI building blocks shared by web + api.                                              | AI               | KEEP     | `src/`: `index.ts`, `types.ts`, `safety.ts`, `redaction.ts`, `model-router.ts`, `evaluators.ts`, `prompts.ts`. Provider-agnostic contracts + pure utils (no SDKs). NOT mentioned in README layout block. |

> Note: `packages/shared` and `packages/config` expose raw `./src/*.ts` /
> preset files via `exports` and have no `build` script — only
> `typecheck`/`lint` placeholders. They are consumed as source, not as
> compiled artifacts.

---

## 4. Infra (`infra/*`)

| Path                                         | Purpose                                                                                                          | Owner area | Decision | Notes                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------- |
| `infra/docker/docker-compose.yml`            | Canonical BASE stack: web + api + postgres (16-alpine) + redis. Secure-by-default (db/redis not host-published). | Infra      | KEEP     | Targeted by `pnpm docker:dev`/`:prod` with overlays. |
| `infra/docker/docker-compose.dev.yml`        | Dev overlay (opens db/redis ports, etc.).                                                                        | Infra      | KEEP     | —                                                    |
| `infra/docker/docker-compose.prod.yml`       | Production overlay.                                                                                              | Infra      | KEEP     | `pnpm docker:prod`.                                  |
| `infra/docker/docker-compose.infra.yml`      | Standalone infra-only stack (Postgres + Redis).                                                                  | Infra      | KEEP     | `pnpm docker:infra`.                                 |
| `infra/docker/docker-compose.connectors.yml` | Local security-connector stack (Wazuh, Graylog, Logstash, etc.) for dev.                                         | Infra      | KEEP     | ~15 KB; local-dev credentials documented in-file.    |
| `infra/k8s/`                                 | Intended Kubernetes manifests.                                                                                   | Infra      | EMPTY    | No files committed.                                  |
| `infra/terraform/`                           | Intended Terraform IaC.                                                                                          | Infra      | EMPTY    | No files committed.                                  |

---

## 5. Scripts (`scripts/*`)

| Path                                         | Purpose                                                | Owner area | Decision | Notes               |
| -------------------------------------------- | ------------------------------------------------------ | ---------- | -------- | ------------------- |
| `scripts/ci/dependency-report.mjs`           | Dependency report (`pnpm audit:deps`).                 | CI/Tooling | KEEP     | —                   |
| `scripts/ci/docker-healthcheck.mjs`          | Docker stack health check (`pnpm docker:healthcheck`). | CI/Tooling | KEEP     | —                   |
| `scripts/ci/env-audit.mjs`                   | Env-var audit (`pnpm audit:env`).                      | CI/Tooling | KEEP     | —                   |
| `scripts/install/doctor.mjs`                 | Environment doctor (`pnpm doctor`).                    | Tooling    | KEEP     | —                   |
| `scripts/install/setup-env.mjs`              | Bootstrap `.env` files (`pnpm setup:env`).             | Tooling    | KEEP     | —                   |
| `scripts/install/validate-system.mjs`        | System prerequisite validation.                        | Tooling    | KEEP     | —                   |
| `scripts/install/install.sh` / `install.ps1` | Cross-platform installer entrypoints.                  | Tooling    | KEEP     | POSIX + PowerShell. |

---

## 6. Docs (`docs/*`)

| Path              | Purpose                                                                                                                                               | Owner area          | Decision | Notes                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | -------- | --------------------------------------------- |
| `docs/*.md`       | Top-level docs: ARCHITECTURE, API, PRODUCT, SECURITY, OPERATIONS, DEPLOYMENT, ENVIRONMENT, TESTING, TROUBLESHOOTING, AI, ROADMAP, MONOREPO_MIGRATION. | Docs                | KEEP     | —                                             |
| `docs/decisions/` | ADRs: 0001 monorepo (pnpm/turbo), 0002 Node 22 LTS, 0003 git history, 0004 zod-resolver peer.                                                         | Docs / Architecture | KEEP     | Referenced by `pnpm-workspace.yaml` + README. |
| `docs/audit/`     | Audit + milestone reports (`FINAL_REPORT.md`; this inventory).                                                                                        | Docs / Audit        | KEEP     | —                                             |
| `docs/security/`  | Intended security-doc dir.                                                                                                                            | Docs                | EMPTY    | No files committed.                           |

---

## Summary of decisions

- **KEEP** — both apps (`web`, `api`), `packages/ai`, all `infra/docker`
  compose files, all `scripts/`, docs, and root tooling/CI config are
  active and wired into `package.json` / `turbo.json`.
- **REVIEW** — `packages/shared` and `packages/config` are scaffolded:
  source-only packages with placeholder `lint`/`typecheck` scripts; `config`
  declares `eslint`/`tailwind` files that are not yet present. Generated
  dirs (`.turbo`, `node_modules`, `dist`, `.next`) are artifacts.
- **EMPTY** — `infra/k8s`, `infra/terraform`, and `docs/security` exist as
  placeholders with no committed content.

### Discrepancies found while reading the tree

1. The README "Repository layout" block lists only `packages/shared` and
   `packages/config`, but **`packages/ai` also exists** and is an active,
   populated package.
2. `packages/config/package.json` `files` includes `eslint` and `tailwind`,
   but only `tsconfig/` and `prettier/` directories are present.
3. `infra/k8s`, `infra/terraform`, and `docs/security` are empty despite
   being referenced as the intended homes for k8s/terraform/security assets.
