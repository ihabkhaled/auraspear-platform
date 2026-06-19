# PROJECT_MEMORY

Stable truths about this repository. Read after `AGENTS.md`. Do not put
temporary task notes here.

- **AuraSpear is an AI-first SOC platform** (SIEM + SOAR + threat-intel) for
  security teams and MSSPs, multi-tenant.
- **This repo (`auraspear-platform`) is the single source of truth** — the
  unified monorepo. The old separate frontend/backend repos are historical only;
  do not depend on them.
- **Structure**:
  - `apps/web` = `@auraspear/web` — the **frontend** (Next.js 16, React 19,
    Tailwind 4). Also hosts Next.js API proxy routes to the backend.
  - `apps/api` = `@auraspear/api` — the **backend** BFF (NestJS 11, Prisma 7,
    PostgreSQL, Redis). Owns all upstream-tool credentials and tenant scoping.
  - `packages/shared` = `@auraspear/shared` — cross-app contracts (scaffolded).
  - `packages/config` = `@auraspear/config` — shared tooling presets.
  - `packages/ai` = `@auraspear/ai` — AI foundations (safety/approval, redaction,
    provider routing, output contracts, eval harness, versioned prompts).
  - `infra/docker` — compose (base + dev/prod/infra/connectors); Dockerfiles in
    `apps/*`. `scripts/` — install + ci helpers. `docs/` — all documentation.
- **Tooling**: pnpm 10 workspace + Turborepo; Node 22 LTS; TypeScript 5.9
  (`tsc` blocking, `tsgo` advisory).
- **Invariants (never violate)**: tenant isolation, RBAC, auth (no bypass),
  auditability, AI safety, no committed secrets. See `memory/SECURITY_MEMORY.md`
  and `memory/AI_MEMORY.md`.
- **The product already ships a deep AI subsystem** (chat, findings, cross-chat
  memory, agents, orchestrator, investigation, hunting) in
  `apps/api/src/modules/ai` — AI work is _expansion_, not greenfield.
- Related: [[BUSINESS_MEMORY]] [[TECHNICAL_MEMORY]] [[SECURITY_MEMORY]]
  [[AI_MEMORY]] [[DECISIONS_MEMORY]] [[COMMANDS_MEMORY]].
