# Validation gates

> Read [`AGENTS.md`](../../AGENTS.md) first (loading order + the one rule: no
> edit-first). This file is the **authoritative gate list** for AuraSpear. It
> says what "green" means, the exact command for each gate, which gates block,
> and the one non-negotiable rule: **never claim a gate is green without running
> it.** Source of truth for posture: [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md)
> (R1 lint debt, R3 security scans pending) and `.github/workflows/`.

Toolchain: **pnpm only** (`pnpm@10`), **Node 22** (`engines.node: ">=22 <25"`).
Run all commands from the repo root. Never substitute `npm`/`yarn`/`npx` at the
root — the monorepo is pnpm + Turborepo.

---

## 1. Hard gates — MUST pass, block the merge

A change is not done until **every** hard gate is green. CI enforces these in
`.github/workflows/ci.yml` (`validate` job) and the security/docker workflows.

| #   | Gate                      | Command (local)                              | Where it runs                                          | Notes                                                                                                                                                                                               |
| --- | ------------------------- | -------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Typecheck**             | `pnpm typecheck`                             | `ci.yml` → `validate`                                  | `tsc --noEmit --pretty` across web + api. **`tsc` is the blocking typecheck.** Must be 0 errors.                                                                                                    |
| 2   | **Build**                 | `pnpm build`                                 | `ci.yml` → `validate`                                  | `turbo run build` — both apps + all packages must compile.                                                                                                                                          |
| 3   | **Docker image builds**   | `pnpm docker:dev` (or build via Dockerfiles) | `docker.yml` (matrix: web + api, `target: production`) | On PRs the image must **build** (no push/load); push to GHCR only on `main`/tags.                                                                                                                   |
| 4   | **gitleaks (no secrets)** | `pnpm scan:secrets`                          | `security.yml` → `secret-scan`                         | `gitleaks detect --source . --redact --no-banner`. Any committed secret = hard fail. Reinforces the secrets invariant in `../security/`: no committed/fallback secrets, only `*.example` env files. |
| 5   | **CodeQL**                | (CI-only)                                    | `codeql.yml` → `analyze`                               | `javascript-typescript`, `security-and-quality` queries. No local equivalent — must be green in Actions.                                                                                            |

Prereq for 1–2 locally: `pnpm install --frozen-lockfile` then
`pnpm --filter @auraspear/api prisma:generate` (CI does both before typecheck).

**Caveat (R3, severity High, Pending):** gitleaks, Trivy, CodeQL, and
dependency-review are committed but have **not had a real first run** at the time
of the audit — their first execution is in GitHub Actions, not locally. Do **not**
assert "security scans clean" until the workflows have actually run and findings
were triaged. See `docs/audit/02-risk-register.md` → R3.

---

## 2. Advisory gates — run + annotate, non-blocking today

These run in CI with `continue-on-error: true` because of **tracked, pre-existing
debt** (R1). Non-blocking is deliberate and documented — it is **not** permission
to ignore them. Run them, read the output, do not make new entries worse.

| Gate                  | Command (local)                          | Where it runs                                 | Why advisory                                                                                                                                                   |
| --------------------- | ---------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lint**              | `pnpm lint` (strict: `pnpm lint:strict`) | `ci.yml` → `lint`                             | R1: structural `no-restricted-syntax` (declaration-placement) errors + abbreviation warnings are pre-existing debt. Advisory until the lint-cleanup milestone. |
| **Format**            | `pnpm format:check` (fix: `pnpm format`) | `ci.yml` → `lint`                             | R1: Prettier debt rides with lint. `--check` only; never run `format` (write) as part of "checking".                                                           |
| **Test**              | `pnpm test` (e2e: `pnpm test:e2e`)       | `ci.yml` → `test` (Postgres + Redis services) | Advisory until coverage matures; still run before claiming behavior works.                                                                                     |
| **Audit**             | `pnpm audit --audit-level high`          | `security.yml` → `pnpm-audit`                 | Advisory; triage HIGH/CRITICAL. Root `pnpm audit:security` = `pnpm audit --audit-level=low && pnpm scan:trivy`.                                                |
| **Trivy (fs)**        | `pnpm scan:trivy`                        | `security.yml` → `trivy-fs`                   | `trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --exit-code 0` (reports, does not fail). R3 still applies.                                 |
| **Dependency review** | (CI-only, PR)                            | `dependency-review.yml`                       | `fail-on-severity: high`; advisory until GitHub computes the base-branch dependency snapshot, then auto-activates.                                             |
| **env-audit**         | `pnpm audit:env`                         | —                                             | Always exits 0; imperfect grep (R6). Treat as a hint; `docs/ENVIRONMENT.md` is authoritative.                                                                  |
| **Fast typecheck**    | `pnpm typecheck:fast`                    | —                                             | `tsgo` (`@typescript/native-preview`). **Advisory only** — fast inner-loop signal. `tsc` (gate 1) is the blocking typecheck; tsgo never overrides it.          |

Bundles: `pnpm validate` = `turbo run typecheck lint:strict && pnpm format:check`.
`pnpm validate:full` = `typecheck lint:strict test build`. A green
`validate`/`validate:full` does **not** by itself satisfy the hard gates — Docker,
gitleaks, and CodeQL run in their own workflows.

---

## 3. The rule: never claim green without running it

This is the load-bearing rule of this file and of the `qa-gatekeeper` subagent
(`.claude/agents/`), which **rejects any claim without command output**.

- **Run it, then report it.** Paste/quote the actual command + result. No "should
  pass", no "looks green", no "this is a trivial change so I skipped it".
- **A gate you didn't run is RED**, not green. Unknown ≠ passing.
- **Per-gate truth.** "Typecheck green" means _only_ `pnpm typecheck` exited 0 —
  not lint, not tests, not Docker. Never generalize one green gate to "all green".
- **Distinguish hard vs advisory in your report.** If a hard gate (typecheck,
  build, Docker, gitleaks, CodeQL) is red, the task is **blocked** — fix it or
  document the exact blocker. If an advisory gate is red, say so explicitly; do
  not let it silently disappear.
- **Security scans (R3):** never write "no secrets / no vulns" off a clean local
  run alone — gitleaks/Trivy/CodeQL findings surface in Actions. State what you
  actually ran and where.
- **Pre-commit ≠ full gate.** Husky + lint-staged run ESLint/`tsc`/Prettier on
  **staged files only** (per app `CLAUDE.md`). That is not a substitute for the
  repo-wide gates above.

Close every task with the `AGENTS.md` §13 final-response block, filling
**Green checks** / **Failed checks** / **Blockers** with the gates you actually
ran. Per `AGENTS.md`: do not say "all green" unless every required gate is green;
do not say "should work"; do not hide failures.

---

## Related

- `AGENTS.md` §5 (validation gates) and §13 (final response format)
- `../security/` — secrets, tenant isolation, RBAC, AES-256-GCM invariants the
  gitleaks/CodeQL/Trivy gates protect
- `../../docs/audit/02-risk-register.md` — R1 (lint advisory), R3 (scans pending),
  R6 (env-audit imperfect)
- `../../memory/COMMANDS_MEMORY.md` — full command map and gate posture
- `.github/workflows/{ci,security,codeql,docker,dependency-review}.yml` — the
  enforcing pipelines
