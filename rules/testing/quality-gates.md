# Rule — Quality Gates (hard vs advisory)

> Read [`AGENTS.md`](../../AGENTS.md) first (loading order + §5 "what green
> means"). This file is the enforceable detail behind that summary. It mirrors
> [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml),
> [`security.yml`](../../.github/workflows/security.yml),
> [`codeql.yml`](../../.github/workflows/codeql.yml),
> [`docker.yml`](../../.github/workflows/docker.yml), and
> [`dependency-review.yml`](../../.github/workflows/dependency-review.yml).

## The one rule

**Never claim "green" / "passing" / "all checks pass" without running the gate
and pasting the command output.** The `qa-gatekeeper` subagent rejects claims
without evidence. If you did not run it, say so. Do not say "should pass."

## Hard gates — MUST pass (block merge)

These are the gates with **no** `continue-on-error` in CI. A red one is a stop.

| Gate                | Local command (repo root)                                                            | CI source                                 |
| ------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| Typecheck           | `pnpm typecheck`                                                                     | `ci.yml` → `validate` job                 |
| Build               | `pnpm build`                                                                         | `ci.yml` → `validate` job                 |
| Docker image builds | `pnpm docker:prod` (or `docker build` per `apps/*/Dockerfile`, `target: production`) | `docker.yml` → matrix `web` + `api`       |
| Secret scan         | `pnpm scan:secrets`                                                                  | `security.yml` → `secret-scan` (gitleaks) |
| CodeQL              | (runs in CI only)                                                                    | `codeql.yml` → `analyze`                  |

Notes that match CI exactly:

- `pnpm typecheck` runs `turbo run typecheck` → `tsc --noEmit` in both
  `apps/web` and `apps/api`. **`tsc` is the blocking typecheck.**
- CI runs `pnpm --filter @auraspear/api prisma:generate` **before** typecheck
  and build. If you skip Prisma generate locally, typecheck will report phantom
  missing `@prisma/client` errors — generate first.
- CI installs with `pnpm install --frozen-lockfile`. If `pnpm-lock.yaml` is out
  of sync, install fails before any gate runs. **pnpm only** (no `npm`/`yarn`).
- Docker on PRs validates the image **builds** (`push: false`, `load: false`);
  it pushes to GHCR only on `main`/tags. Either way, a build failure is hard.
- gitleaks runs with `fetch-depth: 0` (full history). A committed secret
  anywhere in history is a hard fail — this is why `.env.example` files carry
  empty secret values, never real or placeholder ones.

## Advisory gates — run + annotate, do NOT block today

These carry `continue-on-error: true` (and/or `|| true`) in CI **only because of
pre-existing tracked debt** — see
[`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md). Advisory
≠ ignore. You still run them, read the output, and **must not add new failures**.

| Gate                  | Local command                                 | CI source                                     |
| --------------------- | --------------------------------------------- | --------------------------------------------- |
| ESLint                | `pnpm lint` (`pnpm lint:strict` = 0 warnings) | `ci.yml` → `lint` job                         |
| Prettier check        | `pnpm format:check`                           | `ci.yml` → `lint` job                         |
| Unit tests            | `pnpm test`                                   | `ci.yml` → `test` job (Postgres + Redis)      |
| pnpm audit            | `pnpm audit --audit-level high`               | `security.yml` → `pnpm-audit`                 |
| Trivy filesystem scan | `pnpm scan:trivy`                             | `security.yml` → `trivy-fs` (`--exit-code 0`) |
| Dependency review     | (PR-only in CI)                               | `dependency-review.yml`                       |

Why advisory ≠ free pass:

- The lint/format debt is **tracked**, not accepted as a standard. New code must
  obey the rules in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) and
  [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md): **no `any`, no
  `eslint-disable`, no `@ts-ignore`/`@ts-expect-error`.** Those are absolute
  even though the lint job is non-blocking. Run `pnpm lint:strict` on the files
  you touched.
- The `test` job spins up `postgres:16-alpine` + `redis:7-alpine` and sets
  `DATABASE_URL` / `REDIS_HOST` / `REDIS_PORT`; it runs `prisma:generate` first.
  Reproduce locally with the same services (`pnpm docker:infra`) before
  asserting tests pass.
- Trivy and `dependency-review` are pinned to `HIGH,CRITICAL` / `fail-on-severity:
high`. `dependency-review` is advisory until GitHub computes the base-branch
  dependency snapshot (it self-activates afterward — see its workflow comment).

## Pre-commit (local, before CI)

Husky + lint-staged run on staged files at commit time (per `apps/*/CLAUDE.md`):
ESLint, `tsc --noEmit --pretty`, and Prettier. This catches type errors before
they reach the hard CI typecheck. **Never bypass with `--no-verify`** unless the
user explicitly asks (see [`../global/branch-safety.md`](../global/branch-safety.md)).

## Advisory typecheck (tsgo) — NOT the gate

- `pnpm typecheck:fast` runs `tsgo` (`@typescript/native-preview`) for speed.
- It is **advisory only**. `tsc` (`pnpm typecheck`) is the blocking truth. If
  `tsgo` and `tsc` disagree, **`tsc` wins** — fix until `pnpm typecheck` is
  clean. Never report green based on `typecheck:fast`.

## One-shot local mirror

```bash
pnpm install --frozen-lockfile
pnpm --filter @auraspear/api prisma:generate   # CI does this before gates
pnpm typecheck && pnpm build                   # HARD gates
pnpm scan:secrets                              # HARD gate (gitleaks)
pnpm lint:strict ; pnpm format:check ; pnpm test ; pnpm scan:trivy   # advisory
```

`pnpm validate` (`turbo run typecheck lint:strict && pnpm format:check`) is a
convenience bundle, but it mixes a hard gate (typecheck) with advisory ones
(lint, format) — read each result; a non-zero exit may be advisory-only.

## What you may NOT do at a gate

- **No green claim without command output.** End-of-task report (AGENTS.md §13)
  must list real `Green checks:` / `Failed checks:`, not "should work."
- **No weakening a gate to pass.** Never flip a hard job to `continue-on-error`,
  add `|| true`, suppress with `--exit-code 0` on a hard scan, downgrade
  `fail-on-severity`, or relax a `tsconfig` strict flag to make typecheck green.
- **No security/tenancy/RBAC regressions to satisfy a build.** Keep `tenantId`
  on every tenant-owned query/`update`/`delete`, `@RequirePermission(...)` on
  every endpoint, no auth bypass, no committed/fallback secrets, AES-256-GCM for
  connector secrets, AI destructive actions stay approval-required, and never
  render raw AI output as HTML. A passing typecheck never excuses violating
  [`../security/`](../security/) or [`../ai/`](../ai/).
- **Never work on `main`.** Branch first; gates run against the PR.
- **Prove before deleting** a file/dep/env var that a gate seems to flag —
  check imports, routes, Docker, CI, Prisma, seed, tests, examples first.

## See also

- [`AGENTS.md`](../../AGENTS.md) §5 (validation gates) and §13 (final report).
- [`../global/branch-safety.md`](../global/branch-safety.md) — branching, no
  `--no-verify`, prove-before-delete.
- [`../../skills/qa/validate-release.md`](../../skills/qa/validate-release.md) —
  the release validation recipe.
- [`../../docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md)
  — why lint/format/test/audit/trivy are advisory today.
- [`../../memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) — full
  command list.
  </content>
  </invoke>
