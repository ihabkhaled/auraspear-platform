# Security Scans

How AuraSpear scans for vulnerabilities and secrets, locally and in CI.

## Local scripts

| Command                        | Tool         | What it does                                                                                                                   |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm audit --audit-level=low` | pnpm         | dependency vulnerabilities (advisory)                                                                                          |
| `pnpm scan:trivy`              | Trivy        | `trivy fs --scanners vuln,secret,misconfig --severity HIGH,CRITICAL --ignore-unfixed --skip-dirs node_modules --exit-code 0 .` |
| `pnpm scan:secrets`            | gitleaks     | `gitleaks detect --source . --redact`                                                                                          |
| `pnpm audit:security`          | pnpm + Trivy | `pnpm audit` then `pnpm scan:trivy`                                                                                            |

Trivy and gitleaks are **not bundled** — install them first if you run the scans
locally:

- Trivy: <https://trivy.dev/latest/getting-started/installation/>
- gitleaks: <https://github.com/gitleaks/gitleaks#installing>

> Do not claim a scan passed unless you actually ran it and saw the output.

## CI (`.github/workflows`)

| Workflow / job                            | Tool                           | Gate                                                 |
| ----------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| `security.yml` → `gitleaks (secret scan)` | gitleaks-action                | **hard** — fails on committed secrets                |
| `security.yml` → `trivy (filesystem)`     | Trivy (direct binary)          | real scan, `--exit-code 0` (annotates, non-blocking) |
| `security.yml` → `pnpm audit (advisory)`  | pnpm                           | advisory (`continue-on-error`)                       |
| `codeql.yml` → `analyze`                  | CodeQL (javascript-typescript) | **hard** — completes; findings in Security tab       |
| `dependency-review.yml`                   | dependency-review-action       | advisory until the repo's dependency graph populates |
| `docker.yml`                              | docker build (matrix)          | **hard** — both images must build                    |

Notes:

- Third-party actions are **SHA-pinned** where used (supply-chain hygiene).
- Trivy is installed by direct release-binary download in CI (the marketplace
  action and install.sh were flaky — see the git history for why).
- CodeQL/Trivy report findings; they do not auto-fail on every finding. Track
  and remediate via [`../audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md).

## Current findings

See [`../audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)
for the live count (last: 31 → **12** after the `next` security patch) and the
remediation plan for the remaining items.

## Policy

- Fix dependency vulnerabilities patch/minor first; majors via an ADR.
- No exception is "accepted silently" — record CVE/advisory id, package,
  severity, reason, mitigation, owner, and expiry in the remediation doc.
- See [`../../rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md).
