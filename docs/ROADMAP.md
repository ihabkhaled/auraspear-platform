# Roadmap — AuraSpear Platform

This roadmap sequences the AuraSpear platform from its current state (a validated
pnpm + Turborepo monorepo with a live AI subsystem) toward marketplace maturity.
It is grounded in the foundation/hardening audit
([`docs/audit/FINAL_REPORT.md`](./audit/FINAL_REPORT.md)), the migration record
([`docs/MONOREPO_MIGRATION.md`](./MONOREPO_MIGRATION.md)), and the AI governance
model ([`docs/AI.md`](./AI.md)).

> Status convention: ✅ delivered · 🔄 in progress / advisory · ⏳ deferred ·
> ☐ planned. "Delivered" claims trace to the milestone notes in
> `FINAL_REPORT.md`.

## Where we are today

| Capability                         | State | Source                                                                 |
| ---------------------------------- | ----- | ---------------------------------------------------------------------- |
| Unified monorepo (pnpm/Turbo)      | ✅    | `FINAL_REPORT.md` §1–2; `MONOREPO_MIGRATION.md`                        |
| `typecheck` (5/5 packages green)   | ✅    | `FINAL_REPORT.md` §8 final validation                                  |
| `build` (2/2 apps green)           | ✅    | `FINAL_REPORT.md` §8 final validation                                  |
| Docker images build + validated    | ✅    | `FINAL_REPORT.md` §8 Docker                                            |
| CI/CD workflows in place           | ✅    | `FINAL_REPORT.md` §8 CI/CD (`ci`, `security`, `codeql`, `docker`)      |
| Install/CI scripts (`pnpm doctor`) | ✅    | `FINAL_REPORT.md` §8 Scripts                                           |
| `@auraspear/ai` scaffold           | ✅    | `FINAL_REPORT.md` §8; `AI.md`                                          |
| Live AI subsystem                  | ✅    | `AI.md` (chat, findings, memory, agents, orchestrator, hunting)        |
| `lint:strict` green                | 🔄    | advisory in CI; structural debt remains (`FINAL_REPORT.md` §4, §8)     |
| Contract consolidation             | ⏳    | both apps still own copies (`FINAL_REPORT.md` §8; `MIGRATION` defer 1) |

---

## Phase 1 — MVP (foundation, delivered)

The foundation milestone unified the two source repositories into one validated
monorepo. Per `FINAL_REPORT.md` §1–4 and `MONOREPO_MIGRATION.md`:

- ✅ `auraspear → apps/web` (`@auraspear/web`), `auraspear-backend → apps/api`
  (`@auraspear/api`); scaffolded `packages/shared` and `packages/config`.
- ✅ pnpm 10 single root lockfile + Turborepo orchestration
  (`build`/`lint`/`typecheck`/`test`); Node 22 LTS standardized (ADR-0002).
- ✅ Root tooling: `package.json`, `pnpm-workspace.yaml`, `turbo.json`,
  `tsconfig.base.json`, Prettier, commitlint, centralized Husky (lightweight
  `pre-commit` + `commit-msg`).
- ✅ Migration-surfaced bug fixes: declared phantom deps `ws`, `form-data`,
  `@types/ws` (api); fixed Zod 4 ↔ `@hookform/resolvers` peer resolution on web
  via `packageExtensions` + a `zod@4 → 4.4.3` dedupe override (ADR-0004).
- ✅ Secrets hygiene: only `*.example` env files committed.

**Exit criteria met:** `pnpm install`, `typecheck` (0/0 errors), and `build`
green for both apps.

## Phase 2 — Beta (platform hardening, delivered)

Per `FINAL_REPORT.md` §8, most deferred foundation items were completed and
validated:

- ✅ **Docker:** pnpm-workspace-aware `apps/web/Dockerfile` and
  `apps/api/Dockerfile` (Node 22, non-root, healthchecks); both images build
  (web 349 MB, api 1.11 GB). Unified compose under `infra/docker/`
  (`docker-compose.yml` + `dev`/`prod`/`infra`/`connectors` overlays); prod
  publishes only web (3000) and api (4000), Postgres/Redis internal, Redis with
  `--requirepass`.
- ✅ **CI/CD** (`.github/workflows`): `ci.yml` (typecheck + build as hard gates;
  lint/format/test advisory via `continue-on-error`), `security.yml` (gitleaks +
  Trivy fs + pnpm audit), `codeql.yml`, `dependency-review.yml`, `docker.yml`
  (matrix build + GHCR push + Trivy image scan).
- ✅ **Scripts:** `scripts/install/` (`install.sh`, `install.ps1`, `doctor.mjs`,
  `setup-env.mjs`, `validate-system.mjs`) and `scripts/ci/`
  (`docker-healthcheck.mjs`, `env-audit.mjs`, `dependency-report.mjs`).
- ✅ **`@auraspear/ai` package** (typechecks clean): dependency-free building
  blocks — `safety`, `redaction`, `model-router`, `types`, `evaluators`,
  `prompts` — plus `docs/AI.md`.
- 🔄 **Lint:** `eslint --fix` applied (web 69→42, api 114→96 problems);
  typecheck stays green. CI runs lint advisory.

## Phase 3 — Enterprise hardening (next)

This phase closes the items `FINAL_REPORT.md` §8 lists as "still genuinely
deferred," getting the platform to a clean, gated, production-grade baseline.
Sequencing follows `FINAL_REPORT.md` §6 "Next 10 recommended tasks."

1. ☐ **Contract consolidation into `@auraspear/shared`.** Permissions, roles,
   enums, and DTO shapes are still duplicated across `apps/web/src/enums`,
   `apps/web/src/types`, `apps/api/src/common/enums`, and per-module
   `*.types.ts`. Both apps enforce strict "declarations live in their home
   folder" ESLint rules, so do this **module-by-module with end-to-end
   validation** (`FINAL_REPORT.md` §5.1, §8; `MIGRATION` defer 1).
2. ☐ **Lint-strict cleanup.** Get `pnpm lint:strict` to zero: (a) scope
   `scripts/*.mjs` with Node globals in each app's `eslint.config.mjs`,
   (b) `pnpm lint:fix` for the auto-fixable subset, (c) resolve the structural
   `no-restricted-syntax` (declaration-placement) items. Kept isolated so it
   does not risk-refactor product code (`FINAL_REPORT.md` §4, §8).
3. ☐ **Make security scans real.** The `security.yml`, `codeql.yml`, and Trivy
   workflows are in place but their first real run happens in GitHub Actions,
   not locally — run them and triage findings (`FINAL_REPORT.md` §7, §8).
4. ☐ **api image-size pruning.** Shrink the 1.11 GB api image with
   `pnpm deploy --prod` (move `prisma` to deps + a TS seed runner) so the
   entrypoint can still run `prisma migrate deploy` + `db seed`
   (`FINAL_REPORT.md` §8 Docker known follow-up).
5. ☐ **Split boot-time migrate/seed.** Backend `start:dev` runs migrate+seed on
   every boot; split into an explicit setup step for non-dev environments
   (`FINAL_REPORT.md` §6.9).
6. ☐ **Dependency audit & major upgrades.** Run `knip`/`depcheck`/`pnpm
outdated`, remove unused, and plan major upgrades via ADRs — including
   de-duplication (`sweetalert2` vs `sonner`, `dayjs` vs `date-fns`) and the api
   Zod 3→4 upgrade (`FINAL_REPORT.md` §5.2, §6.7; `MIGRATION` defer 2).
7. ☐ **`packages/ui` extraction** to complement `@auraspear/ai`
   (`FINAL_REPORT.md` §5.3; `MIGRATION` defer 3).

## Phase 4 — AI governance & evaluation gate

Harden AI _governance_ on top of the live subsystem and the `@auraspear/ai`
scaffold. Tracked items come directly from the `AI.md` governance checklist and
roadmap.

- ☐ **Wire the golden-dataset eval gate into CI.** The `runEval()` harness exists
  in `@auraspear/ai/evaluators` (golden cases, schema-shape checks, and `safety`
  assertions that fail the whole run); add it as a CI regression gate
  (`AI.md` governance checklist; `FINAL_REPORT.md` §8 "wiring the eval gate into
  CI"). Add a prompt-snapshot regression suite (`AI.md` roadmap).
- ☐ **Per-tenant AI opt-in/out toggle** (`AI.md` governance checklist).
- ☐ **Per-tenant model/provider router UI** over the existing
  `bedrock → llm_apis → openclaw_gateway → rule-based fallback` cascade
  (`AI.md` providers; `AI.md` roadmap).
- ☐ Already enforced and to be maintained as governance invariants: provider/model
  recorded in audit log + provenance; token/cost surfaced; PII/secret redaction
  before model calls and transcript storage; approval policy for side-effecting
  actions with persisted `ApprovalRequest`; tenant-scoped AI investigation
  (`AI.md` governance checklist).

### AI outcome features (expansion)

Strengthening AI _outcomes_ per `AI.md` roadmap (expansion of the shipping
subsystem, not greenfield):

- ☐ AI case timeline builder.
- ☐ Explainable risk scoring at scale.
- ☐ SOAR playbook recommender with impact preview.
- ☐ AI report writer (weekly SOC / incident / compliance).

> Note: the platform already ships AI chat, findings, cross-chat memory, agents,
> orchestrator, investigation copilots, and hunting (`AI.md`; `FINAL_REPORT.md`
> §5.5). The "9 net-new AI feature areas" from the product brief are expansion on
> this base, not a rebuild (`MIGRATION` defer 5).

## Phase 5 — SOC automation & marketplace

The longer-horizon platform direction: from a hardened, governed SOC product
toward an extensible marketplace.

- ☐ **SOC automation depth.** Build on the existing job system
  (`AI_AGENT_TASK`, `MEMORY_EXTRACTION`, `REPORT_GENERATION`, `CONNECTOR_SYNC`,
  `DETECTION_RULE_EXECUTION`, `CORRELATION_RULE_EXECUTION`,
  `NORMALIZATION_PIPELINE`, `SOAR_PLAYBOOK`, `HUNT_EXECUTION`) and the
  orchestrator's automation-mode / budget / approval validation
  (`AI.md` job system; `AI.md` AI surfaces).
- ☐ **Marketplace foundations.** Leverage the connector model
  (`infra/docker` `connectors` overlay; encrypted-at-rest connector credentials,
  AES-256-GCM) and the provider-agnostic router as the basis for a third-party
  connector / playbook / detection-content marketplace
  (`AI.md` redaction; `FINAL_REPORT.md` §8 Docker).

---

## Deferred platform tasks (tracking)

Consolidated from `FINAL_REPORT.md` §8 "still genuinely deferred",
`MONOREPO_MIGRATION.md` "Intentionally deferred", and the `AI.md` governance
checklist. Each maps to a phase above.

| Deferred task                                          | Phase | Status | Source                        |
| ------------------------------------------------------ | ----- | ------ | ----------------------------- |
| Contract consolidation into `@auraspear/shared`        | 3     | ⏳     | FINAL §8; MIGRATION defer 1   |
| Lint-strict cleanup (to zero)                          | 3     | ⏳     | FINAL §4, §8                  |
| Run Trivy / gitleaks / CodeQL for real                 | 3     | ⏳     | FINAL §7, §8                  |
| api image-size pruning (`pnpm deploy --prod`)          | 3     | ⏳     | FINAL §8 Docker               |
| Split boot-time migrate/seed                           | 3     | ☐      | FINAL §6.9                    |
| Dependency major upgrades + de-dup (incl. api Zod 3→4) | 3     | ⏳     | FINAL §5.2, §6.7; MIGRATION 2 |
| `packages/ui` extraction                               | 3     | ⏳     | FINAL §5.3; MIGRATION 3       |
| Golden-dataset eval gate wired into CI                 | 4     | ⏳     | FINAL §8; AI.md checklist     |
| Per-tenant AI opt-in/out toggle                        | 4     | ☐      | AI.md governance checklist    |
| Per-tenant model/provider router UI                    | 4     | ☐      | AI.md roadmap                 |
| 9 net-new AI feature areas (expansion)                 | 4/5   | ⏳     | FINAL §5.5; MIGRATION 5       |

## Known risks / caveats

From `FINAL_REPORT.md` §7:

- `lint:strict` is not yet green (documented; advisory in CI).
- `docker build`, Trivy, and gitleaks were not run in the foundation milestone;
  no security-scan claims are made until the workflows run in GitHub Actions.
- The `zod@4.4.1` store leftover is unlinked and harmless; the web tree resolves
  to `4.4.3`.
