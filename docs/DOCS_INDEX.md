# Documentation Index

The central map of AuraSpear's docs and AI-onboarding system. **AI agents and
new contributors: start at [`AGENTS.md`](../AGENTS.md).**

## Entry points (AI + humans)

| File                        | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| [`AGENTS.md`](../AGENTS.md) | **Universal entry point** — loading order, maps, invariants |
| [`CLAUDE.md`](../CLAUDE.md) | Claude Code rules + subagent delegation                     |
| [`CODEX.md`](../CODEX.md)   | Codex/GPT rules + patch discipline                          |
| [`README.md`](../README.md) | Product intro + quick start                                 |

## The repo's "brain" (load in this order)

1. [`memory/`](../memory/) — stable truths: `PROJECT`, `BUSINESS`, `TECHNICAL`,
   `SECURITY`, `AI`, `DECISIONS`, `COMMANDS`\_MEMORY.md
2. [`context/`](../context/) — per-area onboarding (`*_CONTEXT.md`)
3. [`rules/`](../rules/) — hard rules (`global`, `frontend`, `backend`,
   `security`, `ai`, `testing`, `docs`)
4. [`skills/`](../skills/) — step-by-step recipes (`frontend`, `backend`, `ai`,
   `devsecops`, `qa`, `docs`)
5. [`.claude/agents/`](../.claude/agents/) — project subagents
6. [`.cursor/rules/`](../.cursor/rules/) — Cursor rules

## Product & business

- [PRODUCT.md](PRODUCT.md) · [DEMO.md](DEMO.md) · [ROADMAP.md](ROADMAP.md)
- [business/](business/) — brief, goals, customers, personas, pain points,
  module catalog, journeys, marketing copy, positioning

## Architecture & API

- [ARCHITECTURE.md](ARCHITECTURE.md) · [architecture/](architecture/) (monorepo,
  runtime, frontend, backend, api, database, auth, rbac, tenancy, connectors, ai,
  jobs, websockets, deployment)
- [API.md](API.md) · [MONOREPO_MIGRATION.md](MONOREPO_MIGRATION.md)

## AI

- [AI.md](AI.md) · [ai/](ai/) (architecture, governance, agent catalog,
  evaluation, memory policy, prompting, approval policy, provider routing)

## Security

- [SECURITY.md](SECURITY.md) · [security/](security/) (security, threat model,
  scans, vulnerability management, secret handling)

## Tools & libraries

- [tools/](tools/) — libraries, frontend/backend libs, devops + security tools,
  AI tools, [TYPESCRIPT_AND_TSGO.md](tools/TYPESCRIPT_AND_TSGO.md)

## Ops, testing, install

- [DEPLOYMENT.md](DEPLOYMENT.md) · [OPERATIONS.md](OPERATIONS.md) ·
  [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- [TESTING.md](TESTING.md) · [testing/](testing/)
- [INSTALL.md](../INSTALL.md) · [ENVIRONMENT.md](ENVIRONMENT.md)

## Decisions & audit

- [decisions/](decisions/) — ADR-0001..0005
- [audit/](audit/) — `CURRENT_PROGRESS_AUDIT`, `FINAL_REPORT`,
  `FINAL_AGENT_ONBOARDING_REPORT`, inventory/file-map/risk-register,
  `dependency-matrix`, `vulnerability-remediation`, frontend/backend/database
