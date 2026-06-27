# AGENTS.md — AuraSpear Platform (universal AI entry point)

> **If you are an AI agent or a human contributor, start here.** This is the
> single entry point. `CLAUDE.md` and `CODEX.md` inherit from this file.

## 0. The one rule

**No AI agent may edit first and understand later.** Read the loading order
below, then act. Every change must be validated and must not weaken security,
tenancy, RBAC, AI safety, Docker, CI, or docs.

## 1. AI loading order (read in this order, then edit)

1. `AGENTS.md` (this file)
2. `memory/PROJECT_MEMORY.md` (+ the other `memory/*.md` for stable truths)
3. relevant `context/*.md` (the area you are working in)
4. relevant `rules/**/*.md` (the hard rules for that area)
5. relevant `skills/**/*.md` (the step-by-step recipe for your task)
6. relevant `docs/**` (deep reference) and the existing code + tests
7. **then** edit

## 2. What AuraSpear is (60-second version)

> AuraSpear is an **AI-first SOC platform** that unifies SIEM alerts, cases,
> threat hunting, intelligence enrichment, SOAR automation, and AI investigation
> workflows in a **multi-tenant** workspace built for modern security teams and
> MSSPs.

- **Business**: sold to SOC teams and MSSPs; reduces alert fatigue and MTTR with
  AI-assisted investigation, end-to-end SOC workflow coverage, and connector-driven
  integration. See `docs/business/` and `memory/BUSINESS_MEMORY.md`.
- **Product**: alerts, cases, incidents, hunts, intel/IOC enrichment, detection
  rules, connectors, dashboards, reporting, and an AI subsystem (chat, findings,
  memory, agents, orchestrator). See `docs/PRODUCT.md`.

## 3. Monorepo map

```
auraspear-platform/
├── apps/
│   ├── web/      @auraspear/web  — Next.js 16, React 19, Tailwind 4 (SOC UI + proxy)
│   └── api/      @auraspear/api  — NestJS 11, Prisma 7, Postgres, Redis (BFF)
├── packages/
│   ├── shared/   @auraspear/shared — cross-app contracts (scaffolded)
│   ├── config/   @auraspear/config — shared tooling presets
│   └── ai/       @auraspear/ai     — AI safety/redaction/routing/eval/prompts
├── infra/docker/ — base + dev/prod/infra/connectors compose, Dockerfiles via apps/*
├── scripts/      — install/ (doctor, setup-env, install.sh/.ps1) + ci/ helpers
├── docs/         — product, architecture, security, ai, tools, audit, decisions
├── rules/ skills/ memory/ context/ — AI onboarding system (this repo's brain)
└── .claude/agents/ .cursor/rules/  — Claude subagents + Cursor rules
```

Frontend code → `apps/web/src`. Backend code → `apps/api/src`. Shared contracts →
`packages/shared`. AI foundations → `packages/ai`. DB → `apps/api/prisma`.

## 4. Command map (run from repo root)

| Need to…                                | Command                                                         |
| --------------------------------------- | --------------------------------------------------------------- |
| Install                                 | `pnpm install`                                                  |
| Check environment                       | `pnpm doctor`                                                   |
| Create `.env` files (generated secrets) | `pnpm setup:env`                                                |
| Typecheck (blocking gate)               | `pnpm typecheck`                                                |
| Fast typecheck (advisory, tsgo)         | `pnpm typecheck:fast`                                           |
| Lint / strict                           | `pnpm lint` / `pnpm lint:strict`                                |
| Format / check                          | `pnpm format` / `pnpm format:check`                             |
| Test                                    | `pnpm test` / `pnpm test:e2e`                                   |
| Build                                   | `pnpm build`                                                    |
| Full validation                         | `pnpm validate`                                                 |
| Run web / api (dev)                     | `pnpm dev` / `pnpm dev:api`                                     |
| Docker stacks                           | `pnpm docker:dev` / `:prod` / `:infra` / `:down`                |
| DB                                      | `pnpm prisma:generate` / `:migrate` / `:seed`                   |
| Security scans                          | `pnpm audit:security` / `pnpm scan:trivy` / `pnpm scan:secrets` |

Full list: `memory/COMMANDS_MEMORY.md`.

## 5. Validation gates (what "green" means)

**Hard gates (must pass):** `pnpm typecheck` · `pnpm build` · Docker image builds ·
gitleaks (no secrets) · CodeQL. **Advisory (run + annotate, non-blocking today
because of tracked debt):** `pnpm lint` / `format:check` · `pnpm test` ·
`pnpm audit` · Trivy fs. See `rules/testing/quality-gates.md` and
`docs/audit/02-risk-register.md`. **Never claim "all green" unless the required
gates actually passed — run them.**

## 6. Security invariants (never violate)

- **Tenant isolation**: every tenant-owned query/`update`/`delete` is scoped by
  `tenantId`. No cross-tenant data, ever.
- **RBAC**: every endpoint has `@RequirePermission(...)`. Never bypass.
- **Auth**: no auth bypass in any environment (no dev shortcuts).
- **Secrets**: never commit secrets; only `*.example` env files. No fallback
  production secrets. Connector credentials are AES-256-GCM encrypted at rest.
- **Audit**: mutations are audit-logged; credentials are redacted from logs.

Details: `rules/security/*` and `docs/security/` (+ `docs/SECURITY.md`).

## 7. AI safety invariants

- AI may **analyze and suggest**. AI **must not silently execute** destructive
  security/infra actions — those are `approval-required` and need a persisted
  approval + permission.
- AI output carries **provenance** (provider/model/confidence) and citations
  where applicable; **never render raw AI output as HTML**.
- AI memory is tenant-scoped and **must not store secrets**; redact PII/secrets
  before model calls (`@auraspear/ai` `redact()`).

Details: `rules/ai/*`, `docs/ai/`, `docs/AI.md`, `memory/AI_MEMORY.md`.

## 8. Branch & safety rules

- **Never work directly on `main`.** Branch first
  (`chore/...`, `feat/...`, `fix/...`).
- Never run destructive commands (`rm -rf`, `git reset --hard`, `git clean -fd`,
  `docker compose down -v`) unless explicitly required **and** documented.
- Preserve existing work: read, merge, improve, link — don't blindly overwrite.
- Prove before removing files/deps/env vars (imports, routes, Docker, CI, docs,
  Prisma, seed, tests, examples).

Details: `rules/global/branch-safety.md`.

## 9. Subagents (Claude)

Project subagents live in `.claude/agents/`. Delegate specialized work:
`orchestrator`, `repo-archaeologist`, `product-business-analyst`,
`frontend-architect`, `backend-architect`, `database-prisma-agent`,
`ai-platform-agent`, `dependency-modernization-agent`, `devsecops-security-agent`,
`dx-install-agent`, `rules-skills-memory-agent`, `qa-gatekeeper`. The
`qa-gatekeeper` rejects claims without command output; the `orchestrator`
coordinates and demands evidence.

## 10. Rules & skills loading order

- **Rules** = hard constraints (`rules/global`, `rules/frontend`,
  `rules/backend`, `rules/security`, `rules/ai`, `rules/testing`, `rules/docs`).
- **Skills** = step-by-step recipes (`skills/frontend`, `skills/backend`,
  `skills/ai`, `skills/devsecops`, `skills/qa`, `skills/docs`).
- Load the **global** rules always, then the **area** rules for your task, then
  the matching **skill**.

## 11. How to do common things safely (recipes)

| Task                          | Skill                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Add a frontend page           | `skills/frontend/add-page.md`                                                   |
| Add an API endpoint           | `skills/backend/add-endpoint.md`                                                |
| Add a permission (end-to-end) | `skills/backend/add-permission.md`                                              |
| Add a Prisma model            | `skills/backend/add-prisma-model.md`                                            |
| Add an env variable           | `skills/devsecops/add-env-variable.md`                                          |
| Add an AI feature/panel       | `skills/ai/add-ai-feature.md` + `skills/frontend/add-ai-panel.md`               |
| Run a security scan           | `skills/devsecops/run-security-scan.md`                                         |
| Upgrade a dependency          | `skills/devsecops/upgrade-dependency.md`                                        |
| Validate a release            | `skills/qa/validate-release.md`                                                 |
| Split a god service           | `skills/backend/split-god-service.md`                                           |
| Split a large React component | `skills/frontend/split-large-react-component.md`                                |
| Fix FE performance / a11y     | `skills/frontend/fix-frontend-performance.md` · `fix-frontend-accessibility.md` |
| Harden ESLint (staged)        | `skills/devsecops/harden-eslint.md`                                             |
| Security / performance review | `skills/qa/perform-security-review.md` · `perform-performance-review.md`        |
| Investigate a production bug  | `skills/qa/investigate-production-bug.md`                                       |

> **Refactor safely:** before any refactor read `rules/global/refactor-workflow.md`
> (characterization tests first, preserve contracts/tenancy/RBAC/AI-safety, run
> the gates). The §16.1 audit set in `docs/audit/` (+ `docs/audit/README.md`)
> records the current debt and the prioritized remediation roadmap.

## 12. Docs map

Central index: **`docs/DOCS_INDEX.md`**. Highlights: `docs/PRODUCT.md`,
`docs/ARCHITECTURE.md` (+ `docs/architecture/`), `docs/AI.md` (+ `docs/ai/`),
`docs/SECURITY.md` (+ `docs/security/`), `docs/ENVIRONMENT.md`, `INSTALL.md` (repo root),
`docs/tools/`, `docs/business/`, `docs/audit/` (incl. the §16.1 audit set + `docs/audit/README.md`),
`docs/decisions/` (ADRs).

## 13. Final response format (for agents finishing a task)

Always end with:

```
Branch:
Commits:
Files created:
Files updated:
Commands run:
Green checks:
Failed checks:
Blockers:
Risks:
Next steps:
```

Do not say "all green" unless every required gate is green. Do not say "should
work." Do not hide failures. Fix them or document the exact blocker.
