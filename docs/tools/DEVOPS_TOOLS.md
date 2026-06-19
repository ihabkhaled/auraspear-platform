# DevOps Tools — pnpm · Turborepo · Docker · Docker Compose · GitHub Actions

> **Entry point for AI agents and contributors is [`AGENTS.md`](../../AGENTS.md)**
> (loading order, monorepo map, invariants, the §4 command map, and **§5
> "Validation gates"**). Read it first. This file is a **reference**, not a rule:
> it explains, per DevOps tool, _why_ it is here, _where_ it is wired, _how_ to
> validate after touching it, and the _upgrade/operational risk_.

## What this file is (and is not)

- **This file** = a per-tool tour of the DevOps toolchain that builds, links,
  containerizes, and gates the monorepo.
- It does **not** duplicate the operational runbooks — it links them:
  - [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) — how to actually deploy (compose
    topologies, env, first-run migrate/seed). **The how-to-run doc.**
  - [`docs/OPERATIONS.md`](../OPERATIONS.md) — day-2 ops, health, troubleshooting.
  - [`docs/tools/LIBRARIES.md`](LIBRARIES.md) — the app/library reference
    (runtime/UI/test deps), same Why·Where·Validate·Risk shape.
  - [`docs/tools/TYPESCRIPT_AND_TSGO.md`](TYPESCRIPT_AND_TSGO.md) — the
    typecheck gate (`tsc` blocking, `tsgo` advisory).
- **Source of truth for versions/config** = the real files: root
  [`package.json`](../../package.json), [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml),
  [`.npmrc`](../../.npmrc), [`turbo.json`](../../turbo.json), the Dockerfiles
  under [`apps/*/Dockerfile`](../../apps/api/Dockerfile), the compose files under
  [`infra/docker/`](../../infra/docker/), and the workflows under
  [`.github/workflows/`](../../.github/workflows/). When this doc disagrees with
  those files, **the files win — fix the doc.**

> **Do not run `pnpm` while reading this** — the workspace is mid-upgrade. The
> command names below are references; run them only when actually changing
> something, and never claim "green" unless the required gate actually passed
> ([`AGENTS.md` §5](../../AGENTS.md), [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)).

## The toolchain at a glance

| Tool               | Role in the platform                                          | Pinned where                                                             |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **pnpm**           | Package manager + workspace linker (one lockfile)             | `packageManager: pnpm@10.30.3`, `engines.pnpm >=10`                      |
| **Turborepo**      | Task orchestrator + cache (`build`/`lint`/`typecheck`/`test`) | `turbo: ^2.5.8` (root devDep), [`turbo.json`](../../turbo.json)          |
| **Docker**         | Multi-stage production images for `web` + `api`               | `node:22-alpine` base ([ADR-0002](../decisions/ADR-0002-node-22-lts.md)) |
| **Docker Compose** | Local + prod stack topologies (base + overlays)               | [`infra/docker/*.yml`](../../infra/docker/)                              |
| **GitHub Actions** | CI gates: typecheck/build, lint/test, Docker, scans           | [`.github/workflows/*.yml`](../../.github/workflows/)                    |

Decision record for the foundation: **[ADR-0001 — pnpm + Turborepo monorepo](../decisions/ADR-0001-monorepo-pnpm-turborepo.md)**
and **[ADR-0002 — Node.js 22 LTS](../decisions/ADR-0002-node-22-lts.md)**.

---

## pnpm — package manager & workspace linker

- **Why** One install, **one authoritative lockfile** ([`pnpm-lock.yaml`](../../pnpm-lock.yaml)),
  strict `node_modules` that surfaces phantom dependencies (the migration found
  two latent `ws`/`form-data` bugs in the api — see [ADR-0001](../decisions/ADR-0001-monorepo-pnpm-turborepo.md)).
  pnpm 10 is also **secure-by-default**: install/build scripts are blocked unless
  explicitly allowed.
- **Where**
  - Version pinned in [`package.json`](../../package.json):
    `"packageManager": "pnpm@10.30.3"`, `"engines": { "node": ">=22 <25", "pnpm": ">=10" }`.
    Enabled inside Docker images via `corepack enable`.
  - Workspaces declared in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml):
    `apps/*` + `packages/*`. That same file holds the load-bearing
    `overrides` (e.g. `zod@4: 4.4.3`, security pins for `multer`/`esbuild`/`vite`/…),
    `packageExtensions` (re-declares the `@hookform/resolvers` → `zod` peer, see
    [ADR-0004](../decisions/ADR-0004-zod-resolver-peer.md)), and the pnpm-10
    build-script policy: `onlyBuiltDependencies` (`@prisma/client`,
    `@prisma/engines`, `prisma`, `esbuild`) and `ignoredBuiltDependencies`
    (`sharp`, `unrs-resolver`).
  - Behaviour tuned in [`.npmrc`](../../.npmrc): `auto-install-peers=true`,
    `strict-peer-dependencies=false`, `resolution-mode=highest`,
    `shamefully-hoist=false`.
  - `--filter` is how everything targets one app: `pnpm --filter @auraspear/web dev`,
    `pnpm --filter @auraspear/api prisma:generate`, and the Dockerfiles'
    `pnpm install --frozen-lockfile --filter @auraspear/api...`.
- **Validate** `pnpm install --frozen-lockfile` must succeed with **no lockfile
  drift** (CI runs exactly this — [`ci.yml`](../../.github/workflows/ci.yml)).
  After changing deps/overrides also run `pnpm typecheck` + `pnpm build`. Adding
  a dep that needs a postinstall build script means adding it to
  `onlyBuiltDependencies` or it silently won't build.
- **Risk** medium. The `overrides`/`packageExtensions` are deliberate and
  fragile — see the inline comments in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml)
  and [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)
  before editing. `resolution-mode=highest` means a careless `pnpm install`
  can move transitive deps; keep installs `--frozen-lockfile` outside intentional
  upgrades. Hard rules for adding/upgrading/removing a dep:
  [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md);
  recipe: [`skills/devsecops/upgrade-dependency.md`](../../skills/devsecops/upgrade-dependency.md).

---

## Turborepo — task orchestration & caching

- **Why** Run the same task across `web` + `api` (+ packages) once, in
  dependency order, with content-hash caching so unchanged projects are skipped.
  This is what makes `pnpm validate` / CI fast and what enforces `^build`
  ordering (build a package's deps before the package).
- **Where**
  - [`turbo.json`](../../turbo.json) defines the task graph:
    `build` (outputs `.next/**` minus cache, `dist/**`; `dependsOn ["^build"]`),
    `dev` (`cache: false`, `persistent`), `lint` / `lint:strict` / `typecheck` /
    `typecheck:ci` (all `dependsOn ["^build"]`), `typecheck:fast` (`cache: false`),
    `test` / `test:cov` (outputs `coverage/**`), `test:e2e` (`cache: false`),
    `format:check`. `globalEnv: ["NODE_ENV","CI"]`,
    `globalDependencies: ["tsconfig.base.json", ".env"]`, `ui: "stream"`.
  - Root scripts in [`package.json`](../../package.json) wrap it:
    `dev`/`build`/`lint`/`typecheck`/`test`/`validate` all call `turbo run …`.
    Per-app scripts (`next build`, `nest build`, `tsc`, `vitest`/`jest`,
    `eslint`) live in [`apps/web/package.json`](../../apps/web/package.json) and
    [`apps/api/package.json`](../../apps/api/package.json); turbo just fans out to
    them.
  - The local cache lives in `.turbo/`; CI shares the **Docker** layer cache
    separately via `type=gha` (see GitHub Actions below).
- **Validate** `pnpm build` and `pnpm typecheck` should produce the same result
  cached or cold — if a task's real outputs aren't in its `outputs` list, the
  cache is wrong. Verify with a clean run; a green cache hit on a task whose
  inputs you changed is the failure mode to watch for.
- **Risk** low–medium. Turbo never relaxes a gate — it only schedules and caches
  the underlying `tsc`/`next build`/`nest build`/`eslint` commands, so the
  blocking gates are exactly as strict as those tools. The main footgun is
  **stale cache from misdeclared `outputs`/`inputs`**; when in doubt clear
  `.turbo/` or run with `--force`. Toolchain rationale:
  [ADR-0001](../decisions/ADR-0001-monorepo-pnpm-turborepo.md). Adding a new
  task means adding it to `turbo.json` **and** to each app's `package.json`.

---

## Docker — multi-stage production images

- **Why** Reproducible, minimal `node:22-alpine` production images for both apps,
  built from the **repo root** so the single pnpm lockfile and workspace are
  authoritative inside the build (no per-app lockfile drift). Standardizing on
  Node 22 across both Dockerfiles is [ADR-0002](../decisions/ADR-0002-node-22-lts.md).
- **Where**
  - **API** — [`apps/api/Dockerfile`](../../apps/api/Dockerfile): stages
    `base` (corepack + `openssl` for Prisma) → `deps`
    (`pnpm install --frozen-lockfile --filter @auraspear/api...`, copying the
    Prisma schema first so the api's `postinstall` `prisma generate` works) →
    `build` (`prisma generate` + `nest build`) → `production` (non-root
    `nestjs:nodejs` 1001, `EXPOSE 4000`, `HEALTHCHECK` hitting
    `/api/v1/health`). A build-time placeholder `DATABASE_URL` lets
    `prisma generate` run without connecting; the real URL is injected at
    runtime. Boot is via [`apps/api/docker-entrypoint.sh`](../../apps/api/docker-entrypoint.sh)
    which runs `prisma migrate deploy` + `db seed` then `node dist/main.js`.
  - **Web** — [`apps/web/Dockerfile`](../../apps/web/Dockerfile): same
    `base`/`deps`/`build` shape (`--filter @auraspear/web...`,
    `next build`). `NEXT_PUBLIC_*` values are **build-time `ARG`s baked into the
    client bundle**; `production` copies the Next.js `output: 'standalone'`
    server (`.next/standalone` + `static` + `public`), runs as non-root
    `nextjs:nodejs` 1001, `EXPOSE 3000`, `CMD ["node","apps/web/server.js"]`.
  - [`.dockerignore`](../../.dockerignore) keeps the root build context small
    and **blocks real `.env`** files from ever entering a layer (only
    `*.example` are allowed).
- **Validate** Images **must build** — this is a hard gate ([`AGENTS.md` §5](../../AGENTS.md)),
  enforced in CI by [`docker.yml`](../../.github/workflows/docker.yml) (`target: production`).
  Locally: `pnpm docker:dev` / `pnpm docker:prod` build + run the stack;
  `pnpm docker:healthcheck` ([`scripts/ci/docker-healthcheck.mjs`](../../scripts/ci/docker-healthcheck.mjs))
  checks the running containers.
- **Risk** medium. Build context = repo root, so every `COPY` path is
  monorepo-relative — moving files breaks the Dockerfiles. The api production
  image intentionally carries the full workspace `node_modules` (the entrypoint
  needs the Prisma CLI + ts seed runner); image-size pruning is a tracked
  follow-up. Never bake a secret into an image: runtime secrets come from the
  root `.env` at run time, and `NEXT_PUBLIC_*` build args are **public by
  design** — never put a secret in one. See [`docs/security/`](../security/) and
  [`docs/SECURITY.md`](../SECURITY.md).

---

## Docker Compose — stack topologies

- **Why** One base stack plus environment overlays that all share the compose
  project `name: auraspear`, so the same service definitions are reused and only
  the deltas (exposed ports, passwords, restart policy) change per environment.
  **Secure-by-default**: Postgres/Redis are not published to the host in the
  base/prod stacks.
- **Where** all under [`infra/docker/`](../../infra/docker/), driven from the
  repo root by the `docker:*` scripts in [`package.json`](../../package.json):
  | File | Stack / role | pnpm script |
  | --- | --- | --- |
  | [`docker-compose.yml`](../../infra/docker/docker-compose.yml) | **Base**: `web` + `api` + `postgres:16-alpine` + `redis:7-alpine`; DB/Redis internal-only; healthchecks on all four | (base) |
  | [`docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml) | Dev overlay: publishes Postgres/Redis, adds `pgAdmin`, `NODE_ENV=development`/`LOG_LEVEL=debug` | `pnpm docker:dev` |
  | [`docker-compose.prod.yml`](../../infra/docker/docker-compose.prod.yml) | Prod overlay: `REDIS_PASSWORD` **required**, `restart: always`, DB/Redis stay internal | `pnpm docker:prod` |
  | [`docker-compose.infra.yml`](../../infra/docker/docker-compose.infra.yml) | Infra-only (Postgres+Redis+pgAdmin) for running the apps on the host with `pnpm dev`/`dev:api` | `pnpm docker:infra` |
  | [`docker-compose.connectors.yml`](../../infra/docker/docker-compose.connectors.yml) | Optional security connectors (Wazuh, Graylog, MISP, Shuffle, …) for local dev | (manual) |

  The root [`docker-compose.yml`](../../docker-compose.yml) just `include:`s the
  base file so a bare `docker compose up` from the root works. Required env vars
  fail loud (`POSTGRES_PASSWORD:?…`, `PGADMIN_PASSWORD:?…`,
  `REDIS_PASSWORD:?… in production`). Other `docker:*` helpers:
  `:down`, `:logs`, `:rebuild`, `:clean`, `:infra:down`.

- **Validate** `docker compose … config` must parse; the stacks come up healthy
  (Postgres `pg_isready`, Redis `ping`, api `/api/v1/health`) — `pnpm docker:dev`
  then `pnpm docker:healthcheck`. Full runbook:
  [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) and [`docs/OPERATIONS.md`](../OPERATIONS.md).
- **Risk** medium. The base/prod posture (no host ports for DB/Redis, required
  passwords) is a **security invariant** — backend rule #65 forbids exposing
  internal service ports in production (see [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)).
  Editing port mappings or `env_file` wiring can silently weaken tenancy/secret
  posture; mirror the existing overlays. Never run `docker compose down -v`
  (drops volumes) unless explicitly required and documented
  ([`AGENTS.md` §8](../../AGENTS.md), [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md)).
  Recipe for adding a service to a stack:
  [`skills/devsecops/add-docker-service.md`](../../skills/devsecops/add-docker-service.md).

---

## GitHub Actions — CI gates

- **Why** Enforce the hard-vs-advisory gate model on every PR/push to `main`,
  using the **same** Node 22 + pnpm setup + cache as local dev so CI and local
  agree. Hard gates block; advisory gates run + annotate but don't block today
  (tracked debt). See [`AGENTS.md` §5](../../AGENTS.md) and
  [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md).
- **Where** five workflows in [`.github/workflows/`](../../.github/workflows/):
  | Workflow | Jobs | Gate |
  | --- | --- | --- |
  | [`ci.yml`](../../.github/workflows/ci.yml) | `validate` (pnpm install → prisma generate → `pnpm typecheck` → `pnpm build`); `lint` + `test` (`continue-on-error`, with Postgres/Redis services) | **typecheck + build hard**; lint/test advisory |
  | [`docker.yml`](../../.github/workflows/docker.yml) | matrix build of `web` + `api` `target: production` via buildx; push to GHCR on `main`/tags only, PRs build-only; `type=gha` layer cache | image **build hard**; push gated |
  | [`codeql.yml`](../../.github/workflows/codeql.yml) | CodeQL `javascript-typescript`, `security-and-quality`; weekly cron | **hard** (security) |
  | [`security.yml`](../../.github/workflows/security.yml) | `gitleaks` secret scan; Trivy fs (`--exit-code 0`); `pnpm audit` (advisory); weekly cron | **gitleaks hard**; trivy/audit advisory |
  | [`dependency-review.yml`](../../.github/workflows/dependency-review.yml) | `actions/dependency-review-action` on PRs, `fail-on-severity: high` | advisory until the dep graph is populated |
  Each workflow uses `pnpm/action-setup@v4` + `actions/setup-node@v4` with
  `cache: pnpm` and `pnpm install --frozen-lockfile`, matching local installs.
- **Validate** Inspect gate status with `gh pr checks <n>`; failures with
  `gh run view <id> --log-failed`. The hard set must be green before merge:
  typecheck · build · Docker image builds · gitleaks · CodeQL. Recipe for adding
  or changing a gate (mirror the existing shape, don't weaken one):
  **[`skills/devsecops/add-ci-gate.md`](../../skills/devsecops/add-ci-gate.md)**.
- **Risk** medium. Weakening a hard gate to make a branch green is exactly the
  regression [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)
  forbids — advisory jobs are advisory because of **pre-existing tracked debt**
  ([`docs/audit/02-risk-register.md`](../audit/02-risk-register.md),
  [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)),
  not a license to ignore them. Keep CI's Node/pnpm versions in lockstep with
  [`package.json`](../../package.json) or CI stops representing local truth.
  Security-scan gate rules: [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md);
  scan runbook: [`skills/devsecops/run-security-scan.md`](../../skills/devsecops/run-security-scan.md)
  and [`docs/tools/`](.) sibling security-tools coverage.

---

## Adjacent local tooling (not "CI", but part of the pipeline)

- **Husky + lint-staged + commitlint** — pre-commit / commit-msg hooks installed
  by the root `prepare: husky` script. [`.husky/pre-commit`](../../.husky/) runs
  `pnpm exec lint-staged`, which (per [`.lintstagedrc.cjs`](../../.lintstagedrc.cjs))
  **only `prettier --write`s staged files** — the heavy gates (ESLint strict,
  typecheck, build, tests) run via `pnpm validate` / `pnpm validate:full` and in
  CI where they have the full Turbo graph. [`.husky/commit-msg`](../../.husky/)
  runs `commitlint` against [`commitlint.config.cjs`](../../commitlint.config.cjs)
  (conventional commits; allowed scopes include `infra`, `docker`, `ci`, `deps`).
  Hook install is skipped in CI/production.
- **Install / DX scripts** — [`scripts/install/`](../../scripts/install/)
  (`doctor.mjs` → `pnpm doctor` checks Node/pnpm/Docker/git; `setup-env.mjs` →
  `pnpm setup:env` generates `.env` with secrets; `validate-system.mjs`;
  `install.sh`/`install.ps1`) and [`scripts/ci/`](../../scripts/ci/)
  (`docker-healthcheck.mjs`, `dependency-report.mjs`, `env-audit.mjs`). See
  [`INSTALL.md`](../../INSTALL.md) and [`docs/ENVIRONMENT.md`](../ENVIRONMENT.md).

## Related docs, rules & skills

- **Command map**: [`AGENTS.md` §4](../../AGENTS.md) ·
  [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md).
- **Gates**: [`AGENTS.md` §5](../../AGENTS.md) ·
  [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md) ·
  [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md).
- **Deploy / ops**: [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) ·
  [`docs/OPERATIONS.md`](../OPERATIONS.md) · [`docs/TROUBLESHOOTING.md`](../TROUBLESHOOTING.md).
- **Decisions**: [ADR-0001 (monorepo)](../decisions/ADR-0001-monorepo-pnpm-turborepo.md) ·
  [ADR-0002 (Node 22)](../decisions/ADR-0002-node-22-lts.md) ·
  [ADR-0004 (zod resolver peer)](../decisions/ADR-0004-zod-resolver-peer.md) ·
  [ADR-0005 (TS/tsgo)](../decisions/ADR-0005-typescript-and-tsgo.md).
- **DevSecOps skills**: [`skills/devsecops/add-ci-gate.md`](../../skills/devsecops/add-ci-gate.md) ·
  [`skills/devsecops/run-security-scan.md`](../../skills/devsecops/run-security-scan.md) ·
  [`skills/devsecops/upgrade-dependency.md`](../../skills/devsecops/upgrade-dependency.md) ·
  [`skills/devsecops/add-env-variable.md`](../../skills/devsecops/add-env-variable.md).
- **Sibling tool docs**: [`docs/tools/LIBRARIES.md`](LIBRARIES.md) ·
  [`docs/tools/TYPESCRIPT_AND_TSGO.md`](TYPESCRIPT_AND_TSGO.md) ·
  index in [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md).
