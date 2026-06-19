# DEVOPS_CONTEXT.md — Docker, CI/CD, scripts, env & validation gates

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → [`../memory/`](../memory/)`*.md` →
> this [`../context/`](../context/)`*.md` → [`../rules/`](../rules/)`**` →
> [`../skills/`](../skills/)`**` → [`../docs/`](../docs/)`**` → code. This file is
> step 3 for any task touching `infra/docker/`, `.github/workflows/`, `scripts/`,
> env files, or the validation gates. **No AI agent may edit first and understand
> later** (AGENTS §0) — read the rules and skills linked below before you touch a
> compose file, a workflow, or a `.env`.

Closely related context: [`./TECH_CONTEXT.md`](./TECH_CONTEXT.md) (monorepo,
toolchain, the full gate list) and [`./SECURITY_CONTEXT.md`](./SECURITY_CONTEXT.md)
(secrets, scans, the invariants these gates protect).

---

## What this area is

The **operational plumbing** of the AuraSpear monorepo — how it builds, ships,
runs, and is gated. Five concerns live here:

- **Containers** — production `web` + `api` images
  ([`../apps/web/Dockerfile`](../apps/web/Dockerfile),
  [`../apps/api/Dockerfile`](../apps/api/Dockerfile), both multi-stage
  `FROM node:22-alpine`, non-root, healthchecked) and the Compose stacks in
  [`../infra/docker/`](../infra/docker/) (base + dev/prod/infra/connectors
  overlays). Build context is **the repo root** (`context: ../..`).
- **CI/CD** — five GitHub Actions workflows in
  [`../.github/workflows/`](../.github/workflows/): `ci.yml`, `security.yml`,
  `codeql.yml`, `docker.yml`, `dependency-review.yml`. All run on push + PR to
  `main`; Node 22; pnpm with `cache: pnpm` + `--frozen-lockfile`.
- **Scripts** — [`../scripts/install/`](../scripts/install/) (`doctor.mjs`,
  `setup-env.mjs`, `validate-system.mjs`, `install.sh`/`install.ps1`) and
  [`../scripts/ci/`](../scripts/ci/) (`docker-healthcheck.mjs`, `env-audit.mjs`,
  `dependency-report.mjs`). Zero-dependency Node ESM, invoked via root
  `pnpm` scripts.
- **Environment** — three env "planes" (backend / frontend / seed-tooling), driven
  by committed `*.example` templates and generated secrets. Authoritative matrix:
  [`../docs/ENVIRONMENT.md`](../docs/ENVIRONMENT.md).
- **Validation gates** — what "green" means: hard gates block the merge; advisory
  gates run + annotate (non-blocking today only because of tracked debt). Source of
  truth: [`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md) +
  [`../rules/global/validation-gates.md`](../rules/global/validation-gates.md).

**Toolchain facts (don't guess):** **pnpm only** (`pnpm@10.30.3`), **Node 22**
(`engines.node: ">=22 <25"` in [`../package.json`](../package.json)), Turborepo task
runner, Docker Compose **v2** (`docker compose`, not `docker-compose`).

---

## Where files live

```
auraspear-platform/
├── .github/workflows/        — ci.yml · security.yml · codeql.yml · docker.yml · dependency-review.yml
├── infra/docker/             — docker-compose.yml (base) + .dev/.prod/.infra/.connectors.yml overlays
├── apps/api/Dockerfile       — multi-stage prod image (+ Dockerfile.dev, docker-entrypoint.sh)
├── apps/web/Dockerfile       — multi-stage prod image (Next.js standalone output)
├── apps/*/.dockerignore      — env + node_modules + build noise excluded from context
├── .dockerignore             — root build-context excludes
├── scripts/install/          — doctor.mjs · setup-env.mjs · validate-system.mjs · install.sh/.ps1
├── scripts/ci/               — docker-healthcheck.mjs · env-audit.mjs · dependency-report.mjs
├── .env.example              — ROOT compose env template (+ .env.production.example)
└── apps/{api,web}/.env.example — per-app LOCAL-dev env templates
```

### Docker stacks (run from repo root via `pnpm docker:*`)

| File                                                                             | Role                                                                                            | Host-published ports                                     |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [`docker-compose.yml`](../infra/docker/docker-compose.yml)                       | **BASE** — `web`+`api`+`postgres`+`redis`, secure-by-default                                    | only `web` (3000) + `api` (4000); pg/redis internal-only |
| [`docker-compose.prod.yml`](../infra/docker/docker-compose.prod.yml)             | **PROD** overlay — Redis `--requirepass`, `restart: always`, auth healthcheck                   | **no new ports** (internal services stay internal)       |
| [`docker-compose.dev.yml`](../infra/docker/docker-compose.dev.yml)               | **DEV** overlay — opens 5432/6379, adds pgAdmin 5050                                            | yes — local debugging only                               |
| [`docker-compose.infra.yml`](../infra/docker/docker-compose.infra.yml)           | **INFRA-only** — pg/redis/pgAdmin for host-run apps (`pnpm dev`)                                | yes — host-dev only                                      |
| [`docker-compose.connectors.yml`](../infra/docker/docker-compose.connectors.yml) | **CONNECTORS** — local SIEM/SOAR stack (Wazuh, Graylog, MISP, …) on its own `connectors` bridge | yes — local dev only                                     |

The base + dev/prod files declare `name: auraspear` so overlays merge; `infra` and
`connectors` are standalone stacks. Named volumes (`pgdata`, `redisdata`,
`pgadmin_data`) persist data — `pnpm docker:down` is deliberately `down` **without**
`-v` ([`../package.json`](../package.json)).

### CI/CD facts (real, from `.github/workflows/`)

- **`ci.yml`** — `validate` job (**hard**: `pnpm typecheck` + `pnpm build`, after
  `prisma:generate`); `lint` + `test` jobs are **advisory** (`continue-on-error:
true`). `test` spins up `postgres:16-alpine` + `redis:7-alpine` service
  containers.
- **`security.yml`** — `gitleaks` (**hard**), `trivy-fs` (real scan,
  `--exit-code 0`, non-blocking), `pnpm-audit` (advisory). Weekly `schedule:` cron
  (Mon 06:00 UTC).
- **`codeql.yml`** — `javascript-typescript`, `security-and-quality` queries
  (**hard**, CI-only). Weekly cron (Tue 06:00 UTC).
- **`docker.yml`** — builds `web` + `api` images (`target: production`) on a matrix.
  On PRs the image must **build only** (no push/load); push to **GHCR** happens on
  `main`/tags. Fork-PR safe (`if: github.event_name != 'pull_request'`).
- **`dependency-review.yml`** — `fail-on-severity: high`; advisory until GitHub
  computes the base-branch dependency snapshot, then auto-activates.

### Env planes (which file to touch)

| Plane              | Read by                                                                      | `.example` templates                                   |
| ------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| Backend (NestJS)   | `ConfigService` + Zod `env.validation.ts` at boot                            | `apps/api/.env.example` + root `.env.example` (Docker) |
| Frontend (Next.js) | `process.env['…']` (server) / `NEXT_PUBLIC_*` (browser, baked at build)      | `apps/web/.env.example` + root `.env.example`          |
| Seed / tooling     | `requireEnv()` in `apps/api/prisma/seed.ts`; `scripts/install/setup-env.mjs` | `apps/api/.env.example` + root `.env.example`          |

Generated secrets (`JWT_SECRET`, `CONFIG_ENCRYPTION_KEY`, `SEED_DEFAULT_PASSWORD`,
`POSTGRES_PASSWORD`, `PGADMIN_PASSWORD`, `REDIS_PASSWORD`) are auto-filled into empty
slots by `pnpm setup:env` ([`../scripts/install/setup-env.mjs`](../scripts/install/setup-env.mjs)
`GENERATORS` map). Per-tenant connector credentials are **never** in env — they are
AES-256-GCM encrypted in the database.

---

## What rules apply (read before editing)

Always load [`../rules/global/`](../rules/global/)`*`, then the area rules:

- **Global:** [`absolute-rules.md`](../rules/global/absolute-rules.md),
  [`branch-safety.md`](../rules/global/branch-safety.md) (never `main`; never
  destructive commands like `docker compose down -v` without documented approval),
  [`validation-gates.md`](../rules/global/validation-gates.md) (the authoritative
  hard-vs-advisory gate list).
- **Testing / gates:** [`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md)
  (gate → CI-source mapping; "what you may NOT do at a gate").
- **Security (Docker / secrets / deps):** [`../rules/security/docker-security.md`](../rules/security/docker-security.md)
  (multi-stage §1, non-root §2, healthchecks §3, **no secrets in images** §4,
  **internal ports stay internal** §5, no `-v` §6),
  [`secret-handling.md`](../rules/security/secret-handling.md),
  [`dependency-audit.md`](../rules/security/dependency-audit.md),
  [`security-rules.md`](../rules/security/security-rules.md).

**Invariants that govern every DevOps change** (AGENTS §6–§8):

- **pnpm only · Node 22** — no other package manager/runtime; no npm/yarn in any
  Dockerfile, workflow, or script. Always `--frozen-lockfile`.
- **Tenant isolation · RBAC (`@RequirePermission`)** — a CI/Docker/env change must
  never become a switch that drops `tenantId` scoping or a permission check.
- **No auth / secret / permission bypass** — no `NODE_ENV`-gated security skips;
  secrets are env-loaded with **no fallbacks**, **no all-zeros**, empty
  `*.example` slots only. `NODE_ENV` defaults to `production`.
- **No host ports for internal services in prod** — `postgres`/`redis`/`pgadmin`
  publish nothing in base/prod; only `web` (3000) + `api` (4000) are reachable
  (CLAUDE.md #65; `docker-security.md` §5). A `ports:` line on an internal service
  in the prod render is a **review blocker**.
- **Production images stay multi-stage + non-root**; build deps/source never reach
  the `production` stage; healthcheck endpoints must not leak version/internal URLs.
- **AI safety** — destructive AI actions are **approval-required**; **never render
  raw AI output as HTML**. A gate change must not trade these away.
- **Branch first** — never commit to `main`; never `docker compose down -v` /
  `docker volume rm` / `system prune --volumes` without explicit, documented
  approval (it deletes `pgdata`/`redisdata` — the database and cache).
- **No `any`, no `eslint-disable`** to absorb a type break from a dep upgrade.

---

## What skills apply (recipes for the work)

Match your task to a recipe in [`../skills/devsecops/`](../skills/devsecops/):

- Add a CI gate / workflow job → [`add-ci-gate.md`](../skills/devsecops/add-ci-gate.md)
- Add a Docker service → [`add-docker-service.md`](../skills/devsecops/add-docker-service.md)
- Add an env variable (end-to-end) → [`add-env-variable.md`](../skills/devsecops/add-env-variable.md)
- Run a security scan → [`run-security-scan.md`](../skills/devsecops/run-security-scan.md)
- Upgrade a dependency → [`upgrade-dependency.md`](../skills/devsecops/upgrade-dependency.md)
- Validate a release → [`../skills/qa/validate-release.md`](../skills/qa/validate-release.md)

Each skill mirrors the existing files (copy the nearest job/service/var; don't
invent a new shape), lists the exact docs to update, and ends with the AGENTS §13
final-response block.

---

## What docs to read

- [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md) — deploy topology (stacks,
  overlays, GHCR images) and [`../docs/OPERATIONS.md`](../docs/OPERATIONS.md) —
  running/operating the stack (healthchecks, volumes to back up).
- [`../docs/ENVIRONMENT.md`](../docs/ENVIRONMENT.md) — the **authoritative** env
  matrix (backend / seeding / docker-only / frontend tables + first-run checklist).
- [`../docs/tools/DEVOPS_TOOLS.md`](../docs/tools/DEVOPS_TOOLS.md) and
  [`SECURITY_TOOLS.md`](../docs/tools/SECURITY_TOOLS.md) — Docker / Turborepo /
  gitleaks / Trivy / CodeQL tool catalog.
- [`../docs/security/SECURITY_SCANS.md`](../docs/security/SECURITY_SCANS.md) +
  [`VULNERABILITY_MANAGEMENT.md`](../docs/security/VULNERABILITY_MANAGEMENT.md) —
  scan inventory and triage policy.
- [`../docs/audit/02-risk-register.md`](../docs/audit/02-risk-register.md) — **why**
  gates are advisory today (R1 lint debt, R3 scans pending first real run, R6
  env-audit grep imperfect) and [`vulnerability-remediation.md`](../docs/audit/vulnerability-remediation.md)
  — the live findings/exceptions tracker.
- [`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md) — the full command
  map and gate posture; central index [`../docs/DOCS_INDEX.md`](../docs/DOCS_INDEX.md).

---

## Common mistakes

- **Reaching for `npm`/`yarn`** in a Dockerfile, workflow, or script — pnpm only.
  Use `pnpm install --frozen-lockfile`; dropping `--frozen-lockfile` lets a stale
  `pnpm-lock.yaml` slip through.
- **Publishing an internal service to the host in prod** — adding `ports:` to
  `postgres`/`redis`/`pgadmin` (or a new internal service) in base/prod is a review
  blocker. Open a debug port **only** in `docker-compose.dev.yml`
  (`docker-security.md` §5).
- **Baking a secret into an image or compose default** — secrets enter at
  **runtime** via the root `.env` (`env_file`) / `environment:`. Only `NEXT_PUBLIC_*`
  may be web build `args:` (they ship to the browser by design). The api's build-time
  `ENV DATABASE_URL=postgresql://build:...` ([`../apps/api/Dockerfile`](../apps/api/Dockerfile))
  is a throwaway placeholder — never a real credential.
- **Running `docker compose down -v` / `pnpm docker:clean` to "reset"** — that
  deletes `pgdata`/`redisdata`. Prefer re-running the api entrypoint
  (`apps/api/docker-entrypoint.sh` runs `prisma migrate deploy` + `db seed` at boot).
  `-v` needs explicit, documented approval (AGENTS §8).
- **Collapsing the Dockerfile to a single stage** — ships compilers + full source +
  dev deps to production. Add build steps to the `build` stage, runtime artifacts to
  `production`; keep `USER nestjs`/`nextjs` before ENTRYPOINT/CMD.
- **Marking a clean-today CI check `advisory`** — a check that passes starts
  **hard**. Advisory is only for _tracked_ debt and requires a risk-register entry
  (`add-ci-gate.md`).
- **Weakening a gate to go green** — flipping a hard job to `continue-on-error`,
  adding `|| true`, lowering `fail-on-severity`, relaxing a `tsconfig` strict flag.
  A diff that only loosens a gate is a review blocker.
- **Floating-tag third-party action** (`@v2`, `@main`) — supply-chain risk. Pin
  third-party actions to a 40-char SHA (first-party `actions/*`/`docker/*`/`pnpm/*`
  stay on their version-tag style for consistency).
- **Trusting Trivy's `--exit-code 0` (or `continue-on-error`) as "clean"** — exit
  code proves nothing; **read the findings table**. Same for `pnpm audit`.
- **Adding an env var to only one `.env.example`** — a backend secret used by Docker
  must be in **both** `apps/api/.env.example` (local) **and** root `.env.example`
  (compose), plus the `setup-env.mjs` `GENERATORS` map if it's a generated secret,
  plus the `docs/ENVIRONMENT.md` matrix.
- **Claiming a gate green without running it** — forbidden (AGENTS §5, §13).

---

## Validation commands

Run from repo root (**pnpm only, Node 22**). Full list:
[`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
# Environment / setup
pnpm doctor                 # scripts/install/doctor.mjs — Node/pnpm/Docker/env preflight
pnpm setup:env              # generate .env files + fill empty secrets (idempotent)
pnpm audit:env              # scripts/ci/env-audit.mjs — code vs *.example var cross-check (advisory)

# HARD gates (must pass — ci.yml `validate`)
pnpm install --frozen-lockfile
pnpm --filter @auraspear/api prisma:generate   # CI runs this before typecheck/build
pnpm typecheck              # tsc --noEmit (web + api) — BLOCKING
pnpm build                  # turbo run build (web + api) — BLOCKING
node scripts/install/validate-system.mjs       # mirrors CI: install→prisma→typecheck→build (--full adds tests)

# Docker (build context = repo root; layered via these scripts)
pnpm docker:dev             # base + dev overlay, up -d --build
pnpm docker:prod            # base + prod overlay
pnpm docker:infra           # pg + redis + pgAdmin only (host-run apps)
pnpm docker:healthcheck     # scripts/ci/docker-healthcheck.mjs — ✗ on any unhealthy service
pnpm docker:down            # tear down WITHOUT -v (data survives)
docker compose -f infra/docker/docker-compose.yml \
               -f infra/docker/docker-compose.prod.yml config   # render merged prod stack; grep ports to prove only web/api published

# Security scans (gitleaks = HARD in CI; trivy/audit = advisory — read the table, not the exit code)
pnpm scan:secrets           # gitleaks detect --source . --redact --no-banner  (HARD gate)
pnpm scan:trivy             # trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --exit-code 0
pnpm audit:security         # pnpm audit --audit-level=low && pnpm scan:trivy
pnpm audit:deps             # scripts/ci/dependency-report.mjs — outdated + audit report (advisory)

# Read the REAL CI run (a gate you didn't watch is not green)
gh run list --workflow=ci.yml --limit 5 ; gh run view <run-id> --log
```

**Hard gates (must pass):** `pnpm typecheck` · `pnpm build` · Docker image builds
(`docker.yml`) · gitleaks (`pnpm scan:secrets`) · CodeQL. **Advisory** (run +
annotate, non-blocking today due to tracked debt — still run them): `pnpm lint` /
`format:check` · `pnpm test` · `pnpm audit` · Trivy fs · dependency-review. See
[`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md) and
[`../docs/audit/02-risk-register.md`](../docs/audit/02-risk-register.md).

> **Never claim a gate is green without running it.** A gate you didn't run is RED,
> not green. Trivy/`pnpm audit` exit `0` (or `continue-on-error`) does **not** mean
> clean — read the output. CI security scans (gitleaks/Trivy/CodeQL) surface in
> Actions, not a local run — state what you actually ran and where. Close every task
> with the [`../AGENTS.md`](../AGENTS.md) §13 final-response block.
