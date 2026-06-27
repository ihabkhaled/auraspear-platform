# `docs/audit/` — Audit Index

The audit workspace for AuraSpear. It holds two layers:

1. **GOD MODE §16.1 deliverables** — five named, scoped audit documents (added
   in the `chore/godmode-architecture-hardening` effort).
2. **Supporting evidence files** — the pre-existing inventory, file map, risk
   register, dependency, frontend/backend/database, and final reports that the
   five deliverables build on.

> New here? Read [`../../AGENTS.md`](../../AGENTS.md) first, then this index.
> Central docs map: [`../DOCS_INDEX.md`](../DOCS_INDEX.md).

---

## The 5 GOD MODE §16.1 deliverables

| #   | Deliverable                                                            | Scope                                                               |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | [`architecture-clean-code-audit.md`](architecture-clean-code-audit.md) | Architecture, layering, clean code, SOLID, file/module organization |
| 2   | [`eslint-hardening-audit.md`](eslint-hardening-audit.md)               | ESLint rule strictness, lint debt, path to blocking lint            |
| 3   | [`testing-coverage-audit.md`](testing-coverage-audit.md)               | Test strategy, unit/e2e coverage, quality gates                     |
| 4   | [`security-performance-audit.md`](security-performance-audit.md)       | Tenancy/RBAC/secrets/AI-safety + runtime/build performance          |
| 5   | [`ai-docs-rules-audit.md`](ai-docs-rules-audit.md)                     | AI-agent governance: entry points, rules, skills, memory, context   |

---

## How the supporting files feed each deliverable

Each deliverable is **derived from**, and should stay consistent with, the
existing evidence files below. This table is the traceability map.

| Deliverable                       | Primary supporting files (evidence it builds on)                                                                                                                                                                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **architecture-clean-code-audit** | [`00-inventory.md`](00-inventory.md), [`01-file-map.md`](01-file-map.md), [`07-frontend.md`](07-frontend.md), [`08-backend.md`](08-backend.md), [`09-database.md`](09-database.md), [`02-risk-register.md`](02-risk-register.md)                                                                                                                    |
| **eslint-hardening-audit**        | [`02-risk-register.md`](02-risk-register.md) (lint debt), [`07-frontend.md`](07-frontend.md), [`08-backend.md`](08-backend.md), [`FINAL_AGENT_ONBOARDING_REPORT.md`](FINAL_AGENT_ONBOARDING_REPORT.md) (lint advisory + `lint:strict` debt)                                                                                                         |
| **testing-coverage-audit**        | [`07-frontend.md`](07-frontend.md), [`08-backend.md`](08-backend.md), [`09-database.md`](09-database.md), [`02-risk-register.md`](02-risk-register.md), [`CURRENT_PROGRESS_AUDIT.md`](CURRENT_PROGRESS_AUDIT.md)                                                                                                                                    |
| **security-performance-audit**    | [`vulnerability-remediation.md`](vulnerability-remediation.md), [`05-dependency-report.md`](05-dependency-report.md), [`dependency-matrix.md`](dependency-matrix.md), [`02-risk-register.md`](02-risk-register.md), [`FINAL_REPORT.md`](FINAL_REPORT.md), [`FINAL_AGENT_ONBOARDING_REPORT.md`](FINAL_AGENT_ONBOARDING_REPORT.md) (0-vuln + CodeQL)  |
| **ai-docs-rules-audit**           | [`FINAL_AGENT_ONBOARDING_REPORT.md`](FINAL_AGENT_ONBOARDING_REPORT.md) (the onboarding system as built), [`00-inventory.md`](00-inventory.md), [`01-file-map.md`](01-file-map.md), plus a direct read of `AGENTS.md` / `CLAUDE.md` / `CODEX.md`, `apps/*/CLAUDE.md`, and the `rules/ skills/ memory/ context/ .claude/agents/ .cursor/rules/` trees |

---

## Supporting evidence files (reference)

### Inventory & maps

- [`00-inventory.md`](00-inventory.md) — repo inventory (apps, packages, tooling).
- [`01-file-map.md`](01-file-map.md) — file/directory map.

### Risk & progress

- [`02-risk-register.md`](02-risk-register.md) — risks incl. tracked lint/test debt.
- [`CURRENT_PROGRESS_AUDIT.md`](CURRENT_PROGRESS_AUDIT.md) — progress snapshot.

### Per-area deep dives

- [`07-frontend.md`](07-frontend.md) — frontend (`apps/web`) audit.
- [`08-backend.md`](08-backend.md) — backend (`apps/api`) audit.
- [`09-database.md`](09-database.md) — database / Prisma audit.

### Dependencies & security

- [`05-dependency-report.md`](05-dependency-report.md) — dependency report.
- [`dependency-matrix.md`](dependency-matrix.md) — version/upgrade matrix (deferred majors).
- [`vulnerability-remediation.md`](vulnerability-remediation.md) — CVE / CodeQL remediation.

### Final reports

- [`FINAL_REPORT.md`](FINAL_REPORT.md) — overall hardening final report.
- [`FINAL_AGENT_ONBOARDING_REPORT.md`](FINAL_AGENT_ONBOARDING_REPORT.md) — agent-onboarding + security report (the governance system as built).

---

## Status at a glance

- **Governance system:** mature and internally consistent (single entry point,
  enforced loading order, hard/advisory gates, security + AI-safety invariants,
  §13 final-response contract, 12 subagents, 9 Cursor rules). See deliverable 5.
- **§16.1 deliverables:** all 5 now present (previously 0).
- **Open items tracked across the deliverables:** lint not yet blocking
  (advisory debt), deferred major dependency upgrades, and the AGENTS.md
  `docs/INSTALL.md` → `INSTALL.md` link fix (owned elsewhere).
