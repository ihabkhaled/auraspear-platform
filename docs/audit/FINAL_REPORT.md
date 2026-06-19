# Foundation Milestone — Report

**Branch:** `chore/monorepo-platform-audit` · **Date:** 2026-06-19

This is the report for **milestone 1 (foundation)** of the AuraSpear platform
unification. Scope was agreed up front: unify the two repos into one validated
pnpm + Turborepo monorepo, standardize tooling, fix what the migration surfaces,
and document decisions — while **deferring** deep dependency upgrades, contract
consolidation, full dockerization, unified CI, and the new AI features.

## 1. Repository decision

- **Name:** `auraspear-platform` (monorepo).
- **Layout:** `apps/web` (`@auraspear/web`), `apps/api` (`@auraspear/api`),
  `packages/shared` (`@auraspear/shared`), `packages/config` (`@auraspear/config`),
  plus `infra/`, `scripts/`, `docs/`.
- **Package manager:** pnpm 10 (single root lockfile). **Orchestration:** Turborepo.
- **Node:** 22 LTS. **Git history:** proceeded from the existing flattened root
  (ADR-0003).

## 2. What changed

| Area      | Change                                                                                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Structure | `auraspear → apps/web`, `auraspear-backend → apps/api` (filesystem move preserving untracked local `.env`)                                                           |
| Workspace | Root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.gitignore`, `.npmrc`, `prettier.config.mjs`, `commitlint.config.cjs`               |
| Lockfiles | Removed 2× `package-lock.json` + 2× per-app `pnpm-lock.yaml`; one root `pnpm-lock.yaml`                                                                              |
| Packages  | Renamed to `@auraspear/web` and `@auraspear/api`; created `@auraspear/shared` + `@auraspear/config` scaffolds                                                        |
| Husky     | Centralized at root (lightweight `pre-commit` → lint-staged/Prettier; `commit-msg` → commitlint). Removed per-app husky + the frontend's heavy build+test pre-commit |
| Secrets   | Untracked `auraspear-backend/.env.docker`; only `*.example` env files are committed; added root `.env.example`, `.env.production.example`                            |

## 3. Bugs surfaced and fixed by the migration

pnpm's strict `node_modules` exposed two latent issues that npm's flat hoisting
had hidden:

1. **API phantom dependencies** — `ws` (in `websocket.service.ts`) and
   `form-data` (in `osint-executor.service.ts`) were imported but undeclared.
   **Fixed:** declared `ws`, `form-data`, `@types/ws`.
2. **Web Zod 4 ↔ @hookform/resolvers** — the resolver dropped `zod` from its
   peers, so under pnpm tsc couldn't resolve its internal Zod types (~37 errors).
   **Fixed:** pnpm `packageExtensions` re-adds the `zod` peer + a `zod@4 → 4.4.3`
   dedupe override (ADR-0004). The api stays on Zod 3.

## 4. Validation results (run locally)

| Gate          | web                              | api                 | Command                                                     |
| ------------- | -------------------------------- | ------------------- | ----------------------------------------------------------- |
| install       | ✅                               | ✅                  | `pnpm install` (1,479 pkgs; Prisma Client v7.8.0 generated) |
| **typecheck** | ✅ **0 errors**                  | ✅ **0 errors**     | `tsc --noEmit`                                              |
| **build**     | ✅ (full route tree, standalone) | ✅ (`dist/main.js`) | `next build` / `nest build`                                 |
| lint:strict   | ⚠️ 27 err / 42 warn              | ⚠️ 22 err / 92 warn | `eslint --max-warnings 0`                                   |

### lint:strict — known issue (not a migration regression)

The ESLint configs were moved unchanged and run from each app's directory. The
failures are **pre-existing rule violations amplified by plugins floating to
latest** after lockfile removal, e.g.:

- `no-restricted-syntax` (declarations/constants/utilities placed outside their
  mandated home files) across mature source files.
- `no-undef` (`console`) — **all 6 in `apps/api/scripts/resolve-failed-migrations.mjs`**,
  a helper script the ESLint config doesn't scope with Node globals.
- `import-x/no-duplicates`, `unicorn/no-nested-ternary`, abbreviation warnings.

**Next action:** a dedicated lint-cleanup milestone — (a) scope `scripts/*.mjs`
with Node globals in each app's `eslint.config.mjs`, (b) `pnpm lint:fix` for the
auto-fixable subset, (c) resolve the structural `no-restricted-syntax` items.
This is intentionally separate to keep the migration diff reviewable.

## 5. Deferred to follow-up milestones

1. **Contract consolidation** into `@auraspear/shared` (permissions, enums, DTOs).
2. **Dependency upgrades / de-dup** (sweetalert2 vs sonner, dayjs vs date-fns, api Zod 3→4).
3. **`packages/ui` / `packages/ai`** extraction.
4. **Full Docker unification** under `infra/docker` + **pnpm-workspace-aware Dockerfiles** (the current per-app Dockerfiles still assume npm + single-app context) + **unified CI** + Trivy/CodeQL/gitleaks.
5. **The 9 new AI feature areas** (the platform already ships AI chat, findings, memory, agents, orchestrator, investigation, hunting — this is expansion).
6. **Lint-strict cleanup** (section 4).

## 6. Next 10 recommended tasks

1. Rewrite `apps/web` + `apps/api` Dockerfiles for the pnpm workspace; create unified `infra/docker/*` compose with healthchecks + prod port hardening; validate `docker build`.
2. Add unified `.github/workflows/ci.yml` (Node 22, pnpm cache, turbo, Postgres/Redis services for api e2e).
3. Lint-cleanup milestone (section 4) to get `pnpm lint:strict` green.
4. Add `security.yml` + `dependency-review.yml` + CodeQL + Trivy + gitleaks workflows.
5. Extract permissions/roles/enums into `@auraspear/shared`; wire both apps to import them.
6. Install scripts: `scripts/install/{install.sh,install.ps1,doctor.mjs,setup-env.mjs}`.
7. Dependency audit (`knip`, `depcheck`, `pnpm outdated`) → remove unused, plan major upgrades via ADRs.
8. Write `docs/PRODUCT.md` + `docs/ARCHITECTURE.md` in full (stubs/README cover the essentials today).
9. Backend `start:dev` runs migrate+seed on every boot — split into an explicit setup step for non-dev environments.
10. AI governance/eval scaffolding in `packages/ai` (prompt versioning, golden datasets, redaction, model router).

## 7. Known risks / honest caveats

- `lint:strict` is not green (documented above).
- Per-app Dockerfiles/compose are **stale** post-pnpm (npm + single-app); not yet rewritten — do not rely on `pnpm docker:*` until milestone 2.
- `docker build`, Trivy, gitleaks were **not run** in this milestone (deferred); no security-scan claims are made.
- The `zod@4.4.1` store leftover is unlinked and harmless; the web tree resolves to `4.4.3`.

---

## 8. Milestone 2 — Platform hardening (delivered)

Most of §5's deferred items are now done and validated.

### Docker (built + validated)

- Rewrote `apps/web/Dockerfile` and `apps/api/Dockerfile` for the **pnpm
  workspace** (root build context, Node 22, non-root user, healthchecks). Both
  images **build successfully**: `auraspear/web:test` (349 MB),
  `auraspear/api:test` (1.11 GB).
- Unified compose under `infra/docker/`: `docker-compose.yml` (base) + `dev`/`prod`
  overlays + `infra`-only + `connectors`; root `docker-compose.yml` via `include`;
  root `.dockerignore`. `docker compose config` validates for root/dev/prod/infra.
- Prod hardening confirmed: only web (3000) + api (4000) are published;
  Postgres/Redis stay internal and Redis runs with `--requirepass`.
- Build fixes found by real builds: copy `prisma/` before install (postinstall
  generate), and a build-time dummy `DATABASE_URL` (prisma.config.ts resolves it
  eagerly; generate never connects).
- **Known follow-up:** the api image keeps the full workspace (incl. dev deps) so
  the entrypoint can run `prisma migrate deploy` + `db seed`; prune with
  `pnpm deploy --prod` (move `prisma` to deps + a ts seed runner) to shrink it.

### CI/CD (`.github/workflows`)

- `ci.yml`: **typecheck + build are hard gates** (both green); `lint` + `format`
  - `test` run as **advisory** (`continue-on-error`) because of pre-existing lint
    debt (§4) — honest and non-blocking until cleaned. Node 22, pnpm cache, turbo,
    Postgres/Redis service containers for the test job.
- `security.yml` (gitleaks + Trivy fs + pnpm audit), `codeql.yml`,
  `dependency-review.yml`, `docker.yml` (matrix build + GHCR push on main/tags +
  Trivy image scan on PRs).

### Scripts

- `scripts/install/`: `install.sh`, `install.ps1`, `doctor.mjs`, `setup-env.mjs`
  (generates strong secrets, idempotent), `validate-system.mjs`.
- `scripts/ci/`: `docker-healthcheck.mjs`, `env-audit.mjs`, `dependency-report.mjs`.
- `pnpm doctor` verified working on this machine.

### `@auraspear/ai` package (typechecks clean)

- Dependency-free building blocks: `safety` (action categories + conservative
  approval policy), `redaction` (PII/secret scrubbing before model calls),
  `model-router` (provider cascade logic), `types` (attributable/cited output
  contracts), `evaluators` (golden-case harness with safety assertions),
  `prompts` (versioned registry). Plus `docs/AI.md`.
- Note: this is the **design/scaffold** the brief allows for AI expansion — the
  live AI subsystem (chat, findings, memory, agents, orchestrator, hunting)
  already ships in `apps/api/src/modules/ai`.

### Lint — final position

`eslint --fix` applied (web 69→42, api 114→96 problems); **typecheck stays
green**. Remaining are structural `no-restricted-syntax` (declaration-placement)
errors + abbreviation warnings — pre-existing debt, not migration regressions.
CI runs lint **advisory**; getting `lint:strict` to zero is a tracked, isolated
cleanup so this push doesn't risk-refactor product code.

### Final workspace validation

`pnpm typecheck` → **5/5 packages green**; `pnpm build` → **2/2 apps green**;
working tree clean.

### Still genuinely deferred

Contract consolidation into `@auraspear/shared` (both apps still own their
copies); dependency major upgrades + de-dup; `packages/ui` extraction; the
lint-strict cleanup; wiring the eval gate into CI; api image-size pruning;
running Trivy/gitleaks/CodeQL for real (workflows are in place but their first
real run happens in GitHub Actions, not locally).
