# Skill: Add a CI gate in `.github/workflows/`

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the loading order (§1), the
> command map (§4), and especially **§5 "Validation gates (what 'green' means)"**,
> which defines hard vs advisory and ends with _"Never claim 'all green' unless the
> required gates actually passed — run them."_ Then read the hard constraint behind
> it: [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)
> (hard-vs-advisory table, "What you may NOT do at a gate") and
> [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
> §2 (scan gates) + [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md).
> Sibling onboarding: [`skills/`](../), [`rules/`](../../rules/),
> [`memory/`](../../memory/) (commands → [`COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)),
> [`context/`](../../context/), [`docs/`](../../docs/) (why things are advisory →
> [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md),
> [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)).
>
> **No AI agent may edit first and understand later.** A CI gate is a security
> control on a multi-tenant SOC platform. Adding one wrong way — or weakening an
> existing one to make your branch green — is exactly the regression
> `quality-gates.md` forbids. Mirror the existing workflows; do not invent a new
> shape.

This recipe adds a new CI check to `.github/workflows/` and wires it into the
hard-vs-advisory model the repo already uses. There are **5 workflows today**:
[`ci.yml`](../../.github/workflows/ci.yml) (typecheck + build hard; lint + test
advisory), [`security.yml`](../../.github/workflows/security.yml) (gitleaks hard;
trivy-fs + pnpm-audit advisory), [`codeql.yml`](../../.github/workflows/codeql.yml),
[`docker.yml`](../../.github/workflows/docker.yml), and
[`dependency-review.yml`](../../.github/workflows/dependency-review.yml). Your new
gate must look and behave like these — same Node 22, same pnpm setup + cache, same
`continue-on-error` convention, same `permissions:` minimalism.

---

## When to use

Use this skill when **any** of these is true:

- You are adding a **new automated check** that should run on push/PR to `main`
  (a new scan, a new validation step, a new lint/test surface, a license check,
  an OpenAPI/contract check, an i18n-parity check, etc.).
- You are adding a **new job** to an existing workflow (e.g. a `format:check` job,
  a `test:e2e` job) and need to decide hard vs advisory correctly.
- You are **promoting an advisory gate to hard** once its tracked debt is cleared
  (e.g. lint reaches zero warnings) — this is the _only_ direction you may move a
  gate without an explicit decision, and it still needs evidence + a docs update.

**Do not** use this skill when:

- The check is really a **local-only** step → it belongs in
  [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md) "Pre-commit"
  (Husky + lint-staged, `.husky/pre-commit`, `.lintstagedrc.cjs`), not a workflow.
- You only want to **run an existing gate locally** → see the command map in
  [`AGENTS.md`](../../AGENTS.md) §4 and the one-shot mirror in `quality-gates.md`.
- You are tempted to add a gate that **weakens** another (flipping a hard job to
  `continue-on-error`, adding `|| true`, lowering `fail-on-severity`, relaxing a
  `tsconfig` strict flag). That is forbidden — see **Security checks** below and
  `quality-gates.md` "What you may NOT do at a gate".

---

## Files to inspect first (copy the closest one)

Open these and mirror their structure exactly. **Copy the nearest existing job**
rather than writing YAML from scratch — the repo already encodes every convention
you need.

| Concern                                            | Reference file / job                                                                                                                                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hard gate shape (no `continue-on-error`)           | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) → `validate` job (L18–34)                                                                         |
| Advisory job shape (`continue-on-error: true`)     | [`ci.yml`](../../.github/workflows/ci.yml) → `lint` job (L37–56) and `test` job (L58–95)                                                                       |
| pnpm + Node 22 + cache setup (the 4-line preamble) | [`ci.yml`](../../.github/workflows/ci.yml) L22–28                                                                                                              |
| `env: NODE_VERSION: '22'` at workflow level        | [`ci.yml`](../../.github/workflows/ci.yml) L13–14                                                                                                              |
| `concurrency` (cancel superseded runs)             | [`ci.yml`](../../.github/workflows/ci.yml) L9–11                                                                                                               |
| Postgres + Redis service containers (for tests)    | [`ci.yml`](../../.github/workflows/ci.yml) → `test` job `services:` (L62–82)                                                                                   |
| Least-privilege `permissions:` block               | [`security.yml`](../../.github/workflows/security.yml) L11–13, [`codeql.yml`](../../.github/workflows/codeql.yml) L11–13                                       |
| A real third-party action (SHA-pin candidate)      | [`security.yml`](../../.github/workflows/security.yml) L23 `gitleaks/gitleaks-action`                                                                          |
| Advisory scan that reports without failing         | [`security.yml`](../../.github/workflows/security.yml) → `trivy-fs` (`--exit-code 0`, L27–51) and `pnpm-audit` (`continue-on-error`, L53–67)                   |
| Matrix + conditional steps                         | [`docker.yml`](../../.github/workflows/docker.yml) → `build` job (matrix L22–28, `if:` L36/L62)                                                                |
| Root scripts your gate may call                    | [`package.json`](../../package.json) `scripts` (L12–49) — `typecheck`, `build`, `lint`, `format:check`, `test`, `scan:trivy`, `scan:secrets`, `audit:security` |
| Turbo task graph (what a `pnpm <x>` fans out to)   | [`turbo.json`](../../turbo.json)                                                                                                                               |

The canonical mapping of every gate → its CI source is the table in
[`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md). **Decide
hard vs advisory by reading that file before you write a line of YAML.**

---

## Exact step-by-step implementation

### 0. Branch first

Never work on `main` ([`rules/global/branch-safety.md`](../../rules/global/branch-safety.md);
AGENTS §8). `git switch -c chore/ci-<gate-name>`.

### 1. Decide: new job in an existing workflow, or a new workflow file?

- **New job in an existing workflow** when it shares the trigger and theme:
  another code check → add a job to [`ci.yml`](../../.github/workflows/ci.yml);
  another scan → add a job to [`security.yml`](../../.github/workflows/security.yml).
  Prefer this — fewer files, shared `env`/`concurrency`.
- **New workflow file** only when the trigger or permission set genuinely differs
  (e.g. a `schedule:`-driven scan, or a job needing `security-events: write` that
  the others don't). Name it `kebab-case.yml` and give it its **own** least-privilege
  `permissions:` block.

### 2. Decide: hard or advisory (this is the core decision)

|                               | **Hard gate**                                                      | **Advisory gate**                                                                                                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `continue-on-error`           | **absent** (job fails red, blocks merge)                           | `continue-on-error: true` on the **job** _and_ the failing step                                                                                                                                                    |
| `\|\| true` / `--exit-code 0` | never                                                              | sometimes (e.g. `trivy fs … --exit-code 0`)                                                                                                                                                                        |
| When to choose                | the check is **clean today** and must stay clean (no tracked debt) | the check has **pre-existing tracked debt** ([`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md), [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)) |
| Mirror this job               | `ci.yml` → `validate`                                              | `ci.yml` → `lint` / `test`, `security.yml` → `trivy-fs` / `pnpm-audit`                                                                                                                                             |

**Rule:** a new check that passes cleanly on `main` **starts hard**. A new check
that surfaces existing debt starts **advisory with a comment linking the tracking
doc** (exactly like `ci.yml` L49 and `dependency-review.yml` L17–19), plus an entry
in [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md) so the
debt is owned, not hidden. Advisory ≠ ignore: you still run it and read it.

### 3. Write the trigger, concurrency, and least-privilege permissions

Copy from [`ci.yml`](../../.github/workflows/ci.yml). Standard triggers are push +
PR to `main`; add `schedule:` only for periodic scans (see `codeql.yml` L8–9,
`security.yml` L8–9).

```yaml
name: <Gate Name>

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: <gate>-${{ github.ref }}
  cancel-in-progress: true

# Least privilege: grant ONLY what the job needs. Default to read.
permissions:
  contents: read
  # security-events: write   # ONLY if uploading SARIF (see codeql.yml / security.yml)

env:
  NODE_VERSION: '22' # Node 22 — matches engines in package.json (>=22 <25)
```

### 4. Write the job with the pnpm + Node 22 + cache preamble

Every Node job in this repo starts with the **same four steps**. Reproduce them
verbatim — `cache: pnpm` is what makes the gate fast, and `--frozen-lockfile` is
what makes it honest (a stale `pnpm-lock.yaml` fails install before any gate runs).
**pnpm only** — never `npm`/`yarn` (AGENTS §4; `dependency-audit.md` §1).

```yaml
jobs:
  <gate>:
    name: <gate name>
    runs-on: ubuntu-latest
    # continue-on-error: true   # ← ADVISORY ONLY. Omit entirely for a hard gate.
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      # If your gate touches the API or typechecks/builds, Prisma client must
      # exist first — CI does this before typecheck/build (ci.yml L29-30):
      - name: Prisma generate (api)
        run: pnpm --filter @auraspear/api prisma:generate
      - name: <your gate>
        run: pnpm <script> # a real root script from package.json
```

For a **hard** gate, that final `run:` failing turns the check red — done.

For an **advisory** gate, add `continue-on-error: true` to the **job** and to the
failing **step**, and a comment linking the tracking doc — mirror `ci.yml` L49–56:

```yaml
# Advisory: pre-existing tracked debt (see docs/audit/02-risk-register.md).
# Runs and annotates, but does not fail the check.
- name: <your gate> (advisory)
  continue-on-error: true
  run: pnpm <script> || true
```

If the gate needs a database/cache (anything calling `pnpm test`), add the
`postgres:16-alpine` + `redis:7-alpine` `services:` block and the
`DATABASE_URL`/`REDIS_HOST`/`REDIS_PORT` env exactly as `ci.yml` → `test`
(L62–82). Do **not** invent new credentials — reuse the same throwaway ones.

### 5. SHA-pin every third-party action (security requirement)

First-party actions (`actions/*`, `github/codeql-action/*`, `docker/*`, `pnpm/*`)
are pinned by **major version tag** today (`@v4`, `@v3`, `@v6`) — match that style
for consistency. But **any third-party action you introduce MUST be pinned to a
full 40-character commit SHA**, with the human-readable version in a trailing
comment. A floating tag (`@v2`, `@main`) on a third-party action is a supply-chain
hole: the tag can be re-pointed at malicious code after review. The one third-party
action in the repo today is `gitleaks/gitleaks-action` (`security.yml` L23); a new
one (say a license scanner) is added like this:

```yaml
# SHA-pinned third-party action (supply-chain safety). Resolve the SHA for
# the release tag, then keep the tag in the comment for readability/Dependabot.
- uses: some-org/some-action@<40-hex-commit-sha> # v1.4.2
```

Resolve the SHA from the tag before committing (never paste a SHA you didn't
verify points at the intended release):

```bash
gh api repos/<org>/<action>/git/ref/tags/<tag> --jq '.object.sha'
# if the tag is annotated, dereference to the commit:
gh api repos/<org>/<action>/git/tags/<sha-from-above> --jq '.object.sha'
```

### 6. Wire it into the docs that define "green"

A gate nobody knows about is not a gate. Update the hard-vs-advisory table in
[`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md) (Hard or
Advisory section, with the local command + CI source columns) and the gate summary
in [`AGENTS.md`](../../AGENTS.md) §5. See **Docs to update** below.

---

## Validation commands (real pnpm commands, run from repo root)

You cannot fully run GitHub Actions locally, but you **must** prove the underlying
command passes and the YAML is valid **before** you push. **Never claim a gate
green without running it** (AGENTS §5; `quality-gates.md` "the one rule").
`pnpm` only — Node 22.

```bash
pnpm install --frozen-lockfile                  # exactly what CI runs
pnpm --filter @auraspear/api prisma:generate    # CI does this before typecheck/build
# Run the SAME command your new gate runs, so you know it's green/clean:
pnpm typecheck                                  # HARD example (ci.yml validate)
pnpm build                                      # HARD example (ci.yml validate)
pnpm lint ; pnpm format:check ; pnpm test       # ADVISORY examples (ci.yml lint/test)
pnpm scan:secrets                               # HARD (gitleaks) — security.yml
pnpm scan:trivy                                 # ADVISORY (trivy fs --exit-code 0)
```

Validate the workflow YAML itself (syntax + that the new gate is wired):

```bash
# Lint the YAML (any of these — pick what's available):
pnpm dlx yaml-lint .github/workflows/<file>.yml         # syntax
pnpm dlx @action-validator/cli .github/workflows/<file>.yml   # Actions schema (if installed)

# Confirm the job exists and no third-party action floats on a tag:
grep -nE 'continue-on-error|uses:|run:' .github/workflows/<file>.yml
```

Then push the branch and **read the real run** before claiming anything:

```bash
gh workflow list
gh run list --workflow=<file>.yml --limit 5
gh run watch                 # or: gh run view <run-id> --log
```

If you said a hard gate passes, the green check in `gh run view` is the proof — paste
it. Do not say "should pass" (AGENTS §13; `quality-gates.md`).

---

## Docs to update

- **[`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)** —
  add a row to the **Hard gates** _or_ **Advisory gates** table (local command +
  CI source). This file explicitly _"mirrors"_ the workflows; keep that mirror true.
  If advisory, the row must point at the tracking doc.
- **[`AGENTS.md`](../../AGENTS.md) §5** — add the gate to the hard or advisory
  list in the validation-gates summary so the top-level entry point stays accurate.
- **[`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)** — if your gate
  runs a **new** root script you also added to `package.json`, add it to the command
  list. (No edit needed if it reuses an existing script.)
- **[`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md)** — if
  the gate is **advisory because of tracked debt**, record the debt + an owner +
  the condition for promotion to hard (mirrors how lint/format/test/trivy are
  tracked). Cross-link [`docs/audit/vulnerability-remediation.md`](../../docs/audit/vulnerability-remediation.md)
  for scan-type gates.
- **[`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)** §2
  — if the new gate is a **scan/dependency** gate, list it alongside the other scan
  gates so the security rules stay complete.
- **[`README.md`](../../README.md)** — only if it advertises the CI badge/gate set;
  keep it consistent.

---

## Security checks (do not ship without these)

- **Never weaken an existing gate to make CI green.** Do **not** flip a hard job to
  `continue-on-error`, add `|| true` to a hard step, downgrade `fail-on-severity`,
  put `--exit-code 0` on a hard scan, or relax a `tsconfig` strict flag. A red hard
  gate is a stop — fix the code, not the gate (`quality-gates.md` "What you may NOT
  do at a gate"; AGENTS §0). A diff that _only_ loosens a gate is a review blocker.
- **Least-privilege `permissions:`.** Grant the minimum (`contents: read` by
  default). Add `security-events: write` **only** to upload SARIF (`codeql.yml`,
  `security.yml`), `packages: write` **only** to push images (`docker.yml`),
  `pull-requests: write` **only** to comment (`dependency-review.yml`). Never use a
  blanket `write-all`.
- **SHA-pin all third-party actions** (step 5). A floating tag on a non-GitHub-owned
  action is a supply-chain attack surface. Keep first-party actions on their existing
  version-tag style for consistency, but third-party = full commit SHA + version
  comment.
- **No secrets in workflow files.** Reference `${{ secrets.* }}` only; never inline a
  token, key, or password. The throwaway Postgres/Redis creds in `ci.yml` are
  intentionally non-production and DB-local — reuse those, don't add real ones. Note
  gitleaks runs with `fetch-depth: 0` over full history (`security.yml` L20–22), so a
  committed secret anywhere is a **hard** fail.
- **Don't relax the security invariants to satisfy a build.** A CI change must not
  excuse dropping `tenantId` scoping, `@RequirePermission(...)`, auth/secret checks,
  AI approval-required gating, or the never-render-raw-AI-HTML rule (AGENTS §6–§7;
  `quality-gates.md`). Gates exist to enforce these — not to be traded against them.
- **Fork-PR safety.** Don't expose secrets to untrusted fork PRs. Mirror
  `docker.yml` L36/L62 (`if: github.event_name != 'pull_request'`) — log in / push
  only on `main`/tags, validate (build only) on PRs.
- **Advisory must still be honest.** An advisory gate `continue-on-error: true` is
  for **tracked** debt only, and only with a comment + register entry. Don't smuggle
  a brand-new failing check in as "advisory" to dodge fixing it.

---

## Common mistakes

- **Forgetting `cache: pnpm`** on `actions/setup-node` — the gate still works but is
  slow and re-downloads deps every run. Always include it (`ci.yml` L26–27).
- **Using `npm ci` / `yarn` / `npm install`** in a step — this is a pnpm-only repo
  (`dependency-audit.md` §1). Use `pnpm install --frozen-lockfile`.
- **Dropping `--frozen-lockfile`** — lets a stale `pnpm-lock.yaml` slip through; CI
  must fail on lockfile drift, not silently mutate it.
- **Skipping `prisma:generate`** before a typecheck/build/test step that touches the
  API — phantom "missing `@prisma/client`" errors (`quality-gates.md`; `ci.yml` L29–30).
- **Marking a clean check advisory "to be safe"** — if it passes today, it starts
  **hard**. Advisory is only for _tracked_ debt, and it requires a register entry.
- **`continue-on-error` on the job but not the failing step (or vice-versa)** — copy
  `ci.yml` `lint`/`test`, which set it on **both** so the advisory step both runs and
  reports without going red.
- **Floating-tag third-party action** (`@v2`, `@main`) — supply-chain risk; pin to a
  SHA (step 5).
- **Over-broad `permissions:`** — `write-all` or a write scope the job never uses.
  Grant the minimum.
- **Hardcoding `node-version: '22'` inline in many places** instead of the workflow
  `env: NODE_VERSION` — drift between jobs. Reference `${{ env.NODE_VERSION }}`
  (`ci.yml` L14 + L26).
- **Forgetting the docs mirror** — a gate added to `.github/workflows/` but absent
  from `quality-gates.md` / AGENTS §5 makes the "what green means" docs lie.
- **Promoting a gate to hard without proof** — moving advisory → hard requires the
  debt actually be zero _and_ the green run pasted; don't flip it optimistically.

---

## Final checklist

- [ ] Branched off `main` (`chore/ci-<gate>`); not committed/pushed unless asked.
- [ ] Decided **hard vs advisory** per `quality-gates.md`; clean-today checks start **hard**.
- [ ] Job has the standard preamble: `checkout@v4` → `pnpm/action-setup@v4` →
      `setup-node@v4` (`node-version: ${{ env.NODE_VERSION }}`, `cache: pnpm`) →
      `pnpm install --frozen-lockfile`.
- [ ] `env: NODE_VERSION: '22'` and `concurrency` set; `prisma:generate` before any
      API typecheck/build/test step.
- [ ] **Least-privilege `permissions:`** (default `contents: read`; write scopes only where needed).
- [ ] **Every third-party action SHA-pinned** (40-hex + version comment); first-party
      on existing version-tag style.
- [ ] Advisory gates carry `continue-on-error: true` on **job and step** + a comment
      linking [`docs/audit/02-risk-register.md`](../../docs/audit/02-risk-register.md);
      a register entry added.
- [ ] **No existing gate weakened** (no new `|| true`, no hard→advisory flip, no
      `fail-on-severity`/strict-flag downgrade).
- [ ] Ran the gate's command locally (`pnpm …`) and the YAML lint; pasted output.
- [ ] Pushed and **watched the real run** (`gh run view`); green claim backed by the run.
- [ ] Docs mirrored: `quality-gates.md` table + `AGENTS.md` §5 (+ `COMMANDS_MEMORY.md` /
      `dependency-audit.md` §2 if applicable).
- [ ] No secrets inlined; fork-PR safety preserved; no security/tenant/RBAC/AI
      invariant traded for a build.

---

> **Final response format** (AGENTS §13): end with Branch / Commits / Files created /
> Files updated / Commands run / Green checks / Failed checks / Blockers / Risks /
> Next steps. Do not say "all green" unless every required gate actually passed — and
> for a CI gate, "passed" means you read the real `gh run` result, not "should work."
