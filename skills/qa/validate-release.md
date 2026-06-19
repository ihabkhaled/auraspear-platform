# Skill: Validate a release (run the gates, confirm CI green, prove it)

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the loading order (§1), the command
> map (§4), and especially **§5 "Validation gates (what 'green' means)"**, which ends
> with _"Never claim 'all green' unless the required gates actually passed — run them."_
> Then read the hard constraint behind this whole skill:
> [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md) — the
> hard-vs-advisory tables, the one rule ("never claim green without command output"),
> and "What you may NOT do at a gate." Also load
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md) and
> [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md).
> Sibling onboarding: [`skills/`](../), [`rules/`](../../rules/),
> [`memory/`](../../memory/) (commands → [`COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)),
> [`context/`](../../context/), [`docs/`](../../docs/) (why lint/test/audit/trivy are
> advisory → [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md)).
>
> **No AI agent may edit first and understand later — and no agent may bless a release
> first and verify later.** This skill is the inverse of writing code: you run things,
> read real output, and report exactly what passed and what did not. The
> [`qa-gatekeeper`](../../.claude/agents) subagent **rejects any green claim without
> pasted command output** — so will a human reviewer.

This recipe is the followable procedure for validating a release of the AuraSpear
platform monorepo: run the **hard gates** (typecheck, build, Docker image builds, secret
scan), run the **advisory gates** (lint, format, test, pnpm audit, Trivy), confirm the
PR's GitHub checks are green with `gh pr checks`, and produce an honest pass/fail report.
**pnpm only. Node 22.** Run everything from the repo root unless a command says otherwise.

The gate-to-CI mapping below is not invented here — it mirrors the five workflows in
[`.github/workflows/`](../../.github/workflows) exactly as
[`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md) documents them:
[`ci.yml`](../../.github/workflows/ci.yml) (typecheck + build hard; lint + test advisory),
[`security.yml`](../../.github/workflows/security.yml) (gitleaks hard; trivy-fs + pnpm-audit
advisory), [`docker.yml`](../../.github/workflows/docker.yml) (web + api image builds, hard),
[`codeql.yml`](../../.github/workflows/codeql.yml) (CI-only), and
[`dependency-review.yml`](../../.github/workflows/dependency-review.yml) (PR-only, advisory).

---

## When to use

Use this skill when:

- You are about to **cut, tag, or merge a release** (a PR into `main`, a `v*` tag) and
  must confirm every required gate is green before sign-off.
- You finished a feature/fix branch and want the **full local mirror of CI** before
  pushing — the one-shot block in
  [`quality-gates.md`](../../rules/testing/quality-gates.md) "One-shot local mirror."
- A reviewer / the [`orchestrator`](../../.claude/agents) or
  [`qa-gatekeeper`](../../.claude/agents) subagent asked you to **prove** a branch is
  releasable with command output, not assertions.
- You need to read **why a CI run went red** (`gh run view <id> --log-failed`) and decide
  whether the red is a hard gate (a stop) or an advisory gate (tracked debt — annotate,
  don't block).

**Do not** use this skill for:

- **Adding or changing a gate** → [`skills/devsecops/add-ci-gate.md`](../devsecops/add-ci-gate.md).
  This skill _runs_ gates; it never weakens or invents one.
- **Running only a security scan** locally → [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md)
  (the deep version of the audit/Trivy/secret-scan steps).
- **Writing tests** → [`skills/qa/add-unit-test.md`](./add-unit-test.md),
  [`skills/qa/add-e2e-test.md`](./add-e2e-test.md). Here you only _run_ the suite.
- **Upgrading a dependency** that an audit flagged → [`skills/devsecops/upgrade-dependency.md`](../devsecops/upgrade-dependency.md).

---

## Files to inspect first

Open these before you run anything — they define exactly what "green" means and which
red is a stop.

| Concern                                                                                             | File                                                                                                           |
| --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Hard vs advisory, the one rule, what you may NOT do**                                             | [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)                                       |
| What "green" means + final report template (§5, §13)                                                | [`AGENTS.md`](../../AGENTS.md)                                                                                 |
| Branch-first, never `--no-verify`, prove-before-delete                                              | [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md)                                         |
| Root scripts your gates call (`typecheck`, `build`, `scan:secrets`, `scan:trivy`, `docker:prod`, …) | [`package.json`](../../package.json) `scripts` (L12–49)                                                        |
| Hard gate CI shape (no `continue-on-error`)                                                         | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) → `validate` (L18–34)                             |
| Advisory CI shape (`continue-on-error: true`)                                                       | [`ci.yml`](../../.github/workflows/ci.yml) → `lint` (L37–56), `test` (L58–95)                                  |
| Docker hard gate (web + api, `target: production`, PR = build-only)                                 | [`docker.yml`](../../.github/workflows/docker.yml)                                                             |
| Secret scan (gitleaks, full history) + advisory trivy/audit                                         | [`security.yml`](../../.github/workflows/security.yml)                                                         |
| Prod compose your local Docker gate uses                                                            | [`infra/docker/docker-compose.prod.yml`](../../infra/docker/docker-compose.prod.yml) (+ `docker-compose.yml`)  |
| Dockerfile build targets (`FROM base AS production`)                                                | [`apps/web/Dockerfile`](../../apps/web/Dockerfile) L35, [`apps/api/Dockerfile`](../../apps/api/Dockerfile) L38 |
| Why lint/format/test/audit/trivy are advisory (tracked debt)                                        | [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md)                                       |
| CI-status commands (`gh pr checks`, `gh run view`)                                                  | [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md) "CI status"                                     |

**Hard facts (don't fork them):**

- The **hard gates** have **no** `continue-on-error` in CI. A red one is a stop —
  `pnpm typecheck`, `pnpm build`, the two Docker image builds, and `gitleaks`
  (plus CodeQL, which runs in CI only). See `quality-gates.md` "Hard gates."
- The **advisory gates** carry `continue-on-error: true` / `|| true` / `--exit-code 0`
  **only because of pre-existing tracked debt** ([`02-risk-register.md`](../../docs/audit/02-risk-register.md)).
  Advisory ≠ ignore: you still run them, read the output, and **must not add new
  failures** (`quality-gates.md` "Advisory gates").
- `pnpm typecheck` runs `turbo run typecheck` → **`tsc --noEmit`** in both apps. **`tsc`
  is the blocking typecheck.** `pnpm typecheck:fast` (tsgo) is advisory — if it disagrees
  with `tsc`, `tsc` wins. Never report green on `typecheck:fast`.
- CI runs `pnpm --filter @auraspear/api prisma:generate` **before** typecheck/build. Skip
  it locally and typecheck reports phantom missing `@prisma/client` errors.
- CI installs with `pnpm install --frozen-lockfile`. A stale `pnpm-lock.yaml` fails
  install before any gate runs. **pnpm only** — no `npm`/`yarn`.

---

## Exact step-by-step implementation

Run from repo root. Each step says whether it is **HARD** (red = stop) or **ADVISORY**
(red = read it, don't add new failures). **Capture the output of every command** — that
output is your only evidence.

### 0. Branch sanity (never validate-and-push on `main`)

```bash
git branch --show-current     # confirm you are NOT on main/master
git status --porcelain        # working tree state; note uncommitted changes
git log --oneline -5
```

If you are on `main`, branch first (`AGENTS.md §8`,
[`branch-safety.md`](../../rules/global/branch-safety.md)). Validation runs against the PR
branch; you do not commit/push from this skill unless the user asks.

### 1. Honest install (mirror CI exactly) — HARD prerequisite

```bash
pnpm install --frozen-lockfile
```

If this fails on lockfile drift, **stop** — fix `pnpm-lock.yaml` (or report it as a
blocker). Do not "fix" it by dropping `--frozen-lockfile`; CI uses it and so must you.

### 2. Prisma generate before any typecheck/build — HARD prerequisite

CI does this first; so do you (`quality-gates.md`; `ci.yml` L29–30):

```bash
pnpm --filter @auraspear/api prisma:generate
```

### 3. HARD gate — Typecheck (`tsc --noEmit`, web + api)

```bash
pnpm typecheck
```

Exit 0 = green. Any error = **stop** (fix the type error; never relax a `tsconfig`
strict flag to pass — `quality-gates.md` "What you may NOT do"). Do **not** substitute
`pnpm typecheck:fast` — it's advisory.

### 4. HARD gate — Build (web + api)

```bash
pnpm build
```

Exit 0 = green. A build failure is a hard stop.

### 5. HARD gate — Secret scan (gitleaks, full history)

```bash
pnpm scan:secrets            # → gitleaks detect --source . --redact --no-banner
```

In CI this runs with `fetch-depth: 0` over **full history** (`security.yml` L20–22). Any
hit is a **hard** fail — a committed secret anywhere in history. This is why
`.env.example` files carry **empty** secret values, never real or placeholder ones
(`apps/api/CLAUDE.md` rule 53). If gitleaks isn't installed locally, say so and rely on
the CI `secret-scan` job (step 9) — don't silently skip and call it green.

### 6. HARD gate — Docker image builds (web + api, `target: production`)

CI builds both images with `target: production`; on PRs it only validates the **build**
(`push: false`, `load: false` — `docker.yml` L53–64). Reproduce the build locally:

```bash
# Closest single command to the CI matrix — builds both images via prod compose:
pnpm docker:prod        # docker compose -f .../docker-compose.yml -f .../docker-compose.prod.yml up -d --build
pnpm docker:down        # tear the stack back down when done

# Or validate each image build in isolation, exactly like the docker.yml matrix
# (no run, just the production-stage build):
docker build -f apps/web/Dockerfile --target production -t auraspear-web:validate .
docker build -f apps/api/Dockerfile --target production -t auraspear-api:validate .
```

A build failure in either image is a **hard** stop. (Image vuln scanning is covered by
the Trivy filesystem scan in step 8 — `docker.yml` L60–61.) `pnpm docker:prod` starts
containers; if you only need the build proof, prefer the two `docker build --target
production` commands and skip the runtime. Never run `pnpm docker:clean` /
`docker compose down -v` (volume-destroying) as part of validation —
[`branch-safety.md`](../../rules/global/branch-safety.md) forbids destructive commands
unless explicitly required and documented.

### 7. ADVISORY gates — Lint + format + tests

Run them, **read** them, and **do not add new failures**. The debt is tracked
([`02-risk-register.md`](../../docs/audit/02-risk-register.md)); the _rules_ are still
absolute on code you touched — **no `any`, no `eslint-disable`, no
`@ts-ignore`/`@ts-expect-error`** (`apps/api/CLAUDE.md` & `apps/web/CLAUDE.md` rules 1–2;
`quality-gates.md` "Why advisory ≠ free pass").

```bash
pnpm lint              # turbo run lint
pnpm lint:strict       # 0 warnings — run this on the files you touched
pnpm format:check      # prettier --check (no semicolons, single quotes, width 100)
pnpm test              # turbo run test (unit)
```

The CI `test` job spins up `postgres:16-alpine` + `redis:7-alpine` and runs
`prisma:generate` first (`ci.yml` L62–95). To reproduce a meaningful local test run that
needs those services:

```bash
pnpm docker:infra      # Postgres + Redis (docker-compose.infra.yml)
pnpm test
pnpm docker:infra:down # stop infra when finished
```

### 8. ADVISORY gates — Dependency audit + Trivy

```bash
pnpm audit --audit-level high     # mirrors security.yml pnpm-audit (advisory)
pnpm scan:trivy                   # trivy fs ... --severity HIGH,CRITICAL --exit-code 0 (advisory)
```

Both are advisory in CI (`security.yml` `pnpm-audit` `continue-on-error`, `trivy-fs`
`--exit-code 0`), but read the findings — a new HIGH/CRITICAL you introduced is yours to
fix or escalate, not to bury. For a deeper pass, follow
[`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md);
`pnpm audit:security` bundles audit + Trivy.

> **Convenience bundle, with a caveat:** `pnpm validate`
> (`turbo run typecheck lint:strict && pnpm format:check`) and `pnpm validate:full`
> (`typecheck lint:strict test build`) mix a **hard** gate (typecheck/build) with
> **advisory** ones (lint/format/test). A non-zero exit may be advisory-only — **read
> each task's result**; do not treat the bundle's exit code as the hard-gate verdict
> (`quality-gates.md` "One-shot local mirror").

### 9. Confirm the PR's CI checks are actually green — never assume

Local green is necessary but not sufficient: CodeQL and the exact CI environment run
**only in CI**. Read the real PR status (`COMMANDS_MEMORY.md` "CI status"):

```bash
gh pr checks                        # statuses for the current branch's PR
gh pr checks <pr-number>            # explicit PR
gh pr checks <pr-number> --watch    # block until checks settle
```

Then for any failing/required check, read **why** before judging hard vs advisory:

```bash
gh run list --limit 5
gh run view <run-id> --log-failed   # the failing step's logs
```

Interpretation rule: a red **`validate`** (typecheck/build), **`build <app> image`**
(docker), or **`gitleaks`** job = **hard stop**, fix it. A red **`lint (advisory)`**,
**`test (advisory)`**, **`trivy`**, **`pnpm audit (advisory)`**, or **dependency-review**
= advisory (tracked debt) — annotate it, don't block on it, and **don't let new failures
ride in under "advisory."** The `continue-on-error` jobs may show a neutral/red mark that
does not block merge; the **hard** checks must be green.

### 10. Write the honest report

Produce the `AGENTS.md §13` final-response block with **real** results — list each gate
under `Green checks:` only if you ran it and it passed, and each failure under
`Failed checks:` with the command and the relevant output. Never "all green," never
"should pass."

---

## Validation commands (real pnpm commands, from repo root)

The full local mirror of CI, in order — copy/paste runnable (this is the
[`quality-gates.md`](../../rules/testing/quality-gates.md) "One-shot local mirror"):

```bash
# --- HARD prerequisites (honest install + prisma client) ---
pnpm install --frozen-lockfile
pnpm --filter @auraspear/api prisma:generate

# --- HARD gates (red = stop) ---
pnpm typecheck                       # tsc --noEmit (web + api)   [ci.yml validate]
pnpm build                           # turbo run build            [ci.yml validate]
pnpm scan:secrets                    # gitleaks (full history)    [security.yml secret-scan]
docker build -f apps/web/Dockerfile --target production -t auraspear-web:validate .   # [docker.yml]
docker build -f apps/api/Dockerfile --target production -t auraspear-api:validate .   # [docker.yml]

# --- ADVISORY gates (run + read; do NOT add new failures) ---
pnpm lint:strict                     # 0 warnings on touched files [ci.yml lint]
pnpm format:check                    # prettier --check            [ci.yml lint]
pnpm docker:infra                    # Postgres + Redis for tests
pnpm test                            # unit tests                  [ci.yml test]
pnpm docker:infra:down
pnpm audit --audit-level high        # dependency audit            [security.yml pnpm-audit]
pnpm scan:trivy                      # trivy fs (HIGH,CRITICAL)    [security.yml trivy-fs]

# --- Confirm the PR's CI checks are green (CodeQL + exact env run only in CI) ---
gh pr checks --watch
gh run view <run-id> --log-failed    # only for a failing check
```

> **The one rule (`quality-gates.md`):** never write "green" / "passing" / "all checks
> pass" without running the gate and pasting its output. If you did not run it (e.g.
> gitleaks/trivy/docker not installed locally), **say so explicitly** and lean on the
> CI job (`gh pr checks`) — do not infer green.

---

## Docs to update

Validation is read-only by default — you usually update **nothing** in the codebase. Only
touch docs when validation _surfaces a durable fact_:

- **[`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md)** — if an
  advisory gate surfaced a **new** tracked issue (a new HIGH/CRITICAL from audit/Trivy,
  new lint debt), record it with an owner — don't bury it. Never edit this to _excuse_ a
  hard-gate failure.
- **[`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)** &
  **[`AGENTS.md`](../../AGENTS.md) §5** — only if a gate's hard/advisory status actually
  changed (e.g. an advisory gate's debt reached zero and it was promoted to hard via
  [`add-ci-gate.md`](../devsecops/add-ci-gate.md)). That mirror must stay true.
- **[`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)** — only if you found a
  validation command missing from the list.
- **Release notes / `CHANGELOG`** (if the repo keeps one) and the PR description — record
  the gate results you actually observed.

If validation found a **bug** you need to fix, that fix is a separate change under its own
skill (backend/frontend/ai) — re-run this skill afterward.

---

## Security checks (these are part of "validated", not optional)

A release that builds but regresses security is **not** validated. None of the security
invariants may be traded for a green gate (`AGENTS.md §6–§7`;
[`quality-gates.md`](../../rules/testing/quality-gates.md) "What you may NOT do at a gate";
[`rules/security/`](../../rules/security/), [`rules/ai/`](../../rules/ai/)):

- **No gate weakened to pass.** Never flip a hard CI job to `continue-on-error`, add
  `|| true` to a hard step, put `--exit-code 0` on a hard scan, downgrade
  `fail-on-severity`, or relax a `tsconfig` strict flag. A diff that _only_ loosens a gate
  is a release blocker, not a fix.
- **Secret scan is a hard gate.** A gitleaks hit anywhere in history fails the release.
  No committed secrets; `.env.example` secret values stay empty (`apps/api/CLAUDE.md`
  rules 24, 53). Don't add a real or placeholder secret to make something build.
- **Tenant isolation intact** — every tenant-owned query/`update`/`delete` is scoped by
  `tenantId` (`apps/api/CLAUDE.md` rule 26). A passing typecheck never excuses a missing
  `tenantId`.
- **RBAC intact** — every endpoint keeps `@RequirePermission(...)` (`apps/api/CLAUDE.md`
  rule 25). No auth bypass in any environment, no `NODE_ENV`-gated skips (rules 23, 56).
- **AI safety intact** — AI destructive actions stay **approval-required** (persisted
  `ApprovalRequest` before execution — `apps/api/CLAUDE.md` rule 97; `AGENTS.md §7`); the
  UI **never renders raw AI output as HTML** (`apps/web/CLAUDE.md` rule 43,
  `react/no-danger` is an ESLint error). If the release touches these, the relevant
  advisory failures (lint on AI files, the AI e2e specs) are not "ignorable."
- **`no any`, `no eslint-disable`, `no @ts-ignore`/`@ts-expect-error`** on touched code —
  absolute even though the lint job is advisory (`quality-gates.md` "Why advisory ≠ free
  pass"). Run `pnpm lint:strict` on what you changed.
- If the release touches auth/RBAC/secrets/AI-execution/data-exposure, run the deeper
  [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md) and review
  with the [`devsecops-security-agent`](../../.claude/agents) /
  [`qa-gatekeeper`](../../.claude/agents) subagents.

---

## Common mistakes

- **Claiming "all green" without output** — the cardinal sin
  ([`quality-gates.md`](../../rules/testing/quality-gates.md) "the one rule";
  `AGENTS.md §13`). The `qa-gatekeeper` rejects it. Paste the command output or say you
  didn't run it.
- **Reporting green on `pnpm typecheck:fast`** — that's tsgo (advisory). `tsc`
  (`pnpm typecheck`) is the blocking truth; if they disagree, `tsc` wins.
- **Skipping `prisma:generate`** before typecheck/build → phantom missing
  `@prisma/client` errors that look like a real failure (`ci.yml` L29–30).
- **Dropping `--frozen-lockfile`** to get install to pass — that hides lockfile drift CI
  will catch. Fix the lockfile instead.
- **Treating `pnpm validate` / `validate:full`'s exit code as the hard verdict** — they
  mix hard + advisory tasks; read each task, not the bundle's exit (`quality-gates.md`).
- **Treating an advisory red as a release blocker** (or vice-versa: treating a hard red as
  "just advisory")\*\* — classify by the CI job: `validate`/docker/gitleaks = hard;
  lint/test/trivy/pnpm-audit/dependency-review = advisory.
- **Calling it validated on local green alone** — CodeQL and the exact CI env run only in
  CI. Always confirm with `gh pr checks`.
- **Building the Docker image without `--target production`** — CI builds the
  `production` stage (`docker.yml` L58); a default build can pass while the prod stage
  fails (or vice-versa). Match the target.
- **Running `pnpm docker:clean` / `docker compose down -v` during validation** — that's
  volume-destroying and forbidden as a casual step
  ([`branch-safety.md`](../../rules/global/branch-safety.md)). Use `pnpm docker:down` /
  `pnpm docker:infra:down`.
- **Weakening a gate to make CI green** — flipping hard→advisory, `|| true`,
  `--exit-code 0`, lowering `fail-on-severity`. Forbidden; fix the code (`quality-gates.md`).
- **"Fixing" an advisory failure by adding `any` / `eslint-disable` / `@ts-ignore`** —
  absolutely banned regardless of the job being advisory.
- **Validating on `main`** — branch first; gates run against the PR (`AGENTS.md §8`).
- **Deleting a failing test/spec to make the suite pass** — prove-before-delete; if the
  surface still exists, its test must too (`branch-safety.md`).

---

## Final checklist

- [ ] On a feature/release branch, **not** `main`/`master`; working tree state noted.
- [ ] `pnpm install --frozen-lockfile` clean (no lockfile drift).
- [ ] `pnpm --filter @auraspear/api prisma:generate` run before typecheck/build.
- [ ] **HARD — `pnpm typecheck`** (tsc) green, output captured. (Not `typecheck:fast`.)
- [ ] **HARD — `pnpm build`** green, output captured.
- [ ] **HARD — `pnpm scan:secrets`** (gitleaks) clean — or explicitly noted "not run
      locally, relying on CI `secret-scan`."
- [ ] **HARD — Docker** web **and** api images build with `--target production`
      (`docker build …` or `pnpm docker:prod`); stack torn down with `pnpm docker:down`.
- [ ] **ADVISORY — `pnpm lint:strict` / `format:check` / `test`** run and read; **no new
      failures**; `lint:strict` clean on touched files (no `any`/`disable`/`@ts-ignore`).
- [ ] **ADVISORY — `pnpm audit --audit-level high` / `pnpm scan:trivy`** run and read; new
      HIGH/CRITICAL owned, not buried.
- [ ] **`gh pr checks` confirms the PR**: hard checks (`validate`, docker `build`,
      `gitleaks`, CodeQL) green; advisory reds (if any) are tracked debt, not new failures.
- [ ] Any new tracked issue recorded in
      [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md); no gate
      weakened, no security/tenant/RBAC/AI invariant traded for a build.
- [ ] Final report uses the `AGENTS.md §13` template with **real** `Green checks:` /
      `Failed checks:` — no "all green," no "should pass," no green claim without output.

---

> **Final response format** (`AGENTS.md §13`): end with Branch / Commits / Files created /
> Files updated / Commands run / Green checks / Failed checks / Blockers / Risks / Next
> steps. Do not say "all green" unless every **required** gate actually passed — and
> "passed" means you ran it (or read the real `gh pr checks` / `gh run view` result) and
> have the output, not "should work."
