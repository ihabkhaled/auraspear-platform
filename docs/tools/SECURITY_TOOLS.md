# Security Tools — pnpm audit, Trivy, gitleaks, CodeQL, dependency-review

> **Entry point for AI agents and contributors is [`AGENTS.md`](../../AGENTS.md)**
> (loading order §1, command map §4, validation gates §5, security invariants §6).
> Read it first. This file is a **reference**, not a rule: it lists each security
> tool, the exact command/CI job that runs it, and what it catches.

## What this file is (and is not)

- **This file** = a per-tool tour of the five security scanners this repo runs —
  their commands, their CI jobs, and the class of issue each one catches.
- It does **not** duplicate the canonical sources — it links them:
  - [`docs/security/SECURITY_SCANS.md`](../security/SECURITY_SCANS.md) — the
    **operational overview** of how scans run locally and in CI (the doc-of-record
    for "how we scan"). Start there for the local-vs-CI split and current findings.
  - [`docs/SECURITY.md`](../SECURITY.md) + [`docs/security/`](../security/) — the
    wider security posture (threat model, secret handling, vulnerability mgmt).
  - [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
    §2 — the **hard rules** for the scan gates (run them, read them, never silence).
  - [`skills/devsecops/run-security-scan.md`](../../skills/devsecops/run-security-scan.md)
    — the step-by-step recipe for running a scan.
  - [`skills/devsecops/add-ci-gate.md`](../../skills/devsecops/add-ci-gate.md) —
    how to add/modify a CI gate (hard vs advisory) without weakening one.
  - [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)
    — the **live** finding count + remediation plan (where scan output is tracked).

**Source of truth** = the root [`package.json`](../../package.json) `scripts`
(local commands) and [`.github/workflows/`](../../.github/workflows/) (CI jobs).
Commands below are quoted from those files; when this doc disagrees with them, the
real files win — fix the doc.

> **Do not run `pnpm` while reading this** — the workspace is mid-upgrade
> (see [`LIBRARIES.md`](LIBRARIES.md)). Use the command names below as references;
> install Trivy/gitleaks and run the scans only when you actually need to.

## At a glance

| Tool                  | Local command                  | CI job (`.github/workflows/`)                 | Gate today                                     | Catches                                                    |
| --------------------- | ------------------------------ | --------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------- |
| **pnpm audit**        | `pnpm audit --audit-level=low` | `security.yml` → `pnpm audit (advisory)`      | **advisory** (`continue-on-error`)             | known CVEs in npm dependencies (direct + transitive)       |
| **Trivy**             | `pnpm scan:trivy`              | `security.yml` → `trivy (filesystem)`         | **advisory** (`--exit-code 0`)                 | dependency vulns, leaked secrets, IaC/Dockerfile misconfig |
| **gitleaks**          | `pnpm scan:secrets`            | `security.yml` → `gitleaks (secret scan)`     | **hard** — fails on committed secrets          | secrets committed anywhere in git history                  |
| **CodeQL**            | (CI only)                      | `codeql.yml` → `analyze`                      | **hard** — completes; findings in Security tab | code-level vulns in JS/TS (SAST: injection, XSS, etc.)     |
| **dependency-review** | (CI only, PRs)                 | `dependency-review.yml` → `dependency-review` | **advisory** until dep graph populates         | new vulnerable / disallowed-license deps added in a PR     |

The hard-vs-advisory model and _why_ some scans are advisory (pre-existing tracked
debt) are defined in [`AGENTS.md`](../../AGENTS.md) §5 and
[`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md). The
combined wrapper `pnpm audit:security` runs **pnpm audit then Trivy** in one shot
(`pnpm audit --audit-level=low && pnpm scan:trivy`).

> **Never claim a scan passed unless you ran it and saw the output**
> (AGENTS §5/§13; [`SECURITY_SCANS.md`](../security/SECURITY_SCANS.md)).

---

## 1. pnpm audit — dependency CVEs

**What it catches:** known security advisories (GHSA/CVE) in the dependency tree —
both direct and transitive — by checking installed versions against the npm
advisory database.

**Local:**

```bash
pnpm audit --audit-level=low      # all severities (the local default)
pnpm audit:security               # pnpm audit --audit-level=low && pnpm scan:trivy
```

**CI** — `security.yml` → `pnpm audit (advisory)`: installs with
`pnpm install --frozen-lockfile`, then runs `pnpm audit --audit-level high`. The
job is **advisory** (`continue-on-error: true`) because of tracked dependency debt;
it annotates but does not block. Advisory ≠ ignore — a **new** HIGH/CRITICAL you
introduce must be fixed or formally excepted, not waved through under the existing
backlog (see [`dependency-audit.md`](../../rules/security/dependency-audit.md) §2/§5).

**Remediation order** (from `dependency-audit.md` §3): patch/minor bump first →
pnpm `overrides` for transitive-only → framework majors via an ADR + dedicated PR.
Track every finding/exception in
[`vulnerability-remediation.md`](../audit/vulnerability-remediation.md) with CVE id,
fix target, owner, and expiry.

> **pnpm only** — never `npm audit` / `yarn audit`; they fight `pnpm-lock.yaml`
> ([`dependency-audit.md`](../../rules/security/dependency-audit.md) §1).

## 2. Trivy — filesystem scan (vuln + secret + misconfig)

**What it catches** (three scanners in one pass): dependency **vulnerabilities**,
leaked **secrets**, and IaC/Dockerfile **misconfigurations**.

**Local** (`pnpm scan:trivy`):

```bash
trivy fs --scanners vuln,secret,misconfig \
  --severity HIGH,CRITICAL \
  --ignore-unfixed \
  --skip-dirs node_modules \
  --exit-code 0 \
  .
```

- `--severity HIGH,CRITICAL` — only the actionable tiers are surfaced.
- `--ignore-unfixed` — a reported finding **has a fix available** upstream, so take
  it ([`dependency-audit.md`](../../rules/security/dependency-audit.md) §2).
- `--skip-dirs node_modules` — `pnpm audit` already covers the dependency tree;
  this keeps the fs scan focused on first-party files and config.
- `--exit-code 0` — reports without failing the build (the advisory convention).

**CI** — `security.yml` → `trivy (filesystem)`: Trivy is installed by **direct
release-binary download** (pinned `VER=0.71.2`) because the marketplace action /
`install.sh` were flaky; the job then runs the same scan with `--format table`.
**Advisory** (`--exit-code 0`).

> Container **image** vulnerability scanning is intentionally **not** a separate
> job — it is covered by this filesystem scan; `docker.yml` only validates that the
> images build (see [`docker.yml`](../../.github/workflows/docker.yml) and the note
> in [`SECURITY_SCANS.md`](../security/SECURITY_SCANS.md)).

Trivy and gitleaks are **not bundled** — install them before running locally
(links in [`SECURITY_SCANS.md`](../security/SECURITY_SCANS.md)).

## 3. gitleaks — committed-secret scan

**What it catches:** secrets (API keys, tokens, private keys, passwords) committed
anywhere in the repository — including deep in git history, not just the working
tree.

**Local** (`pnpm scan:secrets`):

```bash
gitleaks detect --source . --redact --no-banner
```

`--redact` keeps the matched secret value out of the scan output (so the report
itself doesn't leak it).

**CI** — `security.yml` → `gitleaks (secret scan)`: checks out with
`fetch-depth: 0` (full history) and runs `gitleaks/gitleaks-action@v2`. This is a
**hard gate** — a committed secret **fails the build**. This is the gate that
enforces the repo's _"only `_.example` env files are committed"\* rule.

**If gitleaks fires:** assume the secret is compromised — rotate it, invalidate
sessions/tokens, and purge from history. Only add a gitleaks allowlist entry for a
**confirmed false positive**. Full playbook:
[`docs/security/SECRET_HANDLING.md`](../security/SECRET_HANDLING.md) and
[`rules/security/secret-handling.md`](../../rules/security/secret-handling.md).

## 4. CodeQL — static application security testing (SAST)

**What it catches:** code-level security vulnerabilities and quality issues in the
JavaScript/TypeScript source via data-flow analysis — e.g. injection, unsafe
deserialization, XSS sinks, path traversal, and similar dangerous patterns that a
dependency scanner can't see.

**CI only** — `codeql.yml` → `analyze (javascript-typescript)`:

```yaml
languages: javascript-typescript
queries: security-and-quality
```

Runs on push/PR to `main` and on a weekly schedule (Tuesday 06:00 UTC). It is a
**hard gate** in the sense that the analysis job must **complete**; the individual
findings are surfaced in the repository's **Security** tab (uploaded via SARIF,
hence `security-events: write`), not auto-failed one by one. Track and remediate
findings via [`vulnerability-remediation.md`](../audit/vulnerability-remediation.md).

There is no local CodeQL command in `package.json` — it is GitHub-hosted. CodeQL
complements the ESLint **`eslint-plugin-security`** rules that run in the per-app
lint gate (ReDoS, object injection, timing attacks, `eval`, bidi/trojan-source —
see [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) and
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) "Security Rules"): ESLint catches
patterns at author time, CodeQL catches data-flow vulns across the codebase.

## 5. dependency-review — PR diff gate

**What it catches:** dependencies **introduced or bumped in a pull request** that
carry known vulnerabilities or disallowed licenses — i.e. it reviews the _delta_
between the PR branch and `main`, stopping a bad dep before it merges.

**CI only** — `dependency-review.yml` → `dependency-review` (PRs to `main`):

```yaml
uses: actions/dependency-review-action@v4
with:
  fail-on-severity: high
  comment-summary-in-pr: on-failure
```

Currently **advisory** (`continue-on-error: true`) — the action reports
_"not supported"_ until GitHub computes the base-branch dependency snapshot for
this repo, after which it activates automatically. It needs `pull-requests: write`
only to post the PR comment summary. This is the PR-time complement to `pnpm audit`
(whole-tree) and Trivy (filesystem).

---

## How they fit together

| Layer                     | Tool                             | Scope                                        |
| ------------------------- | -------------------------------- | -------------------------------------------- |
| Dependencies (whole tree) | pnpm audit, Trivy (`vuln`)       | every installed package, direct + transitive |
| Dependencies (PR delta)   | dependency-review                | what a PR adds/upgrades                      |
| Secrets                   | gitleaks, Trivy (`secret`)       | committed credentials (history + tree)       |
| First-party code          | CodeQL, `eslint-plugin-security` | vulns/patterns in our own JS/TS              |
| Config / IaC              | Trivy (`misconfig`)              | Dockerfiles, compose, IaC misconfig          |

Each is intentionally redundant at the edges (secrets are caught by both gitleaks
and Trivy; dependency vulns by both pnpm audit and Trivy and, on PRs,
dependency-review) — defense in depth on a multi-tenant SOC platform.

## Related

- [`AGENTS.md`](../../AGENTS.md) — §4 command map (`audit:security`, `scan:trivy`,
  `scan:secrets`), §5 validation gates (hard vs advisory), §6 security invariants.
- [`docs/security/SECURITY_SCANS.md`](../security/SECURITY_SCANS.md) — operational
  overview of local + CI scanning and current findings (**read this with this doc**).
- [`docs/security/SECRET_HANDLING.md`](../security/SECRET_HANDLING.md) — what to do
  when gitleaks/Trivy flags a secret.
- [`docs/security/VULNERABILITY_MANAGEMENT.md`](../security/VULNERABILITY_MANAGEMENT.md)
  — how findings are triaged and tracked.
- [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md) —
  hard rules for the scan gates and dependency lifecycle.
- [`skills/devsecops/run-security-scan.md`](../../skills/devsecops/run-security-scan.md)
  · [`skills/devsecops/add-ci-gate.md`](../../skills/devsecops/add-ci-gate.md) —
  step-by-step recipes.
- [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)
  — the live finding count + remediation/exception register.
- [`docs/tools/LIBRARIES.md`](LIBRARIES.md) ·
  [`docs/tools/TYPESCRIPT_AND_TSGO.md`](TYPESCRIPT_AND_TSGO.md) — sibling tool docs.
