<div align="center">

# 🛡️ AuraSpear Platform

**An AI-first SOC platform** that unifies SIEM alerts, cases, threat hunting,
intelligence enrichment, SOAR automation, and AI investigation workflows in a
multi-tenant workspace built for modern security teams and MSSPs.

</div>

---

> **Monorepo status:** `apps/web` (Next.js 16) and `apps/api` (NestJS 11) were
> unified into a single pnpm + Turborepo workspace. See
> [docs/MONOREPO_MIGRATION.md](docs/MONOREPO_MIGRATION.md) and the
> [milestone report](docs/audit/FINAL_REPORT.md).

## What is AuraSpear?

AuraSpear is an end-to-end **AI SOC / SIEM / SOAR / threat-intelligence**
platform. It brings alerts, cases, incidents, hunts, intel enrichment, detection
engineering, connectors, and AI reasoning into one multi-tenant, RBAC-governed
workspace — with AI woven through investigation, not bolted on.

- **AI-assisted investigation** — alert triage, IOC enrichment, case timelines.
- **AI chat with cross-chat memory** and a searchable **AI findings** workspace.
- **Autonomous AI agents** with an orchestrator, approvals, and audit trails.
- **Multi-tenant RBAC**, connector-driven architecture, query-driven dashboards.
- **End-to-end SOC workflow coverage** from login/triage to reporting.

## Repository layout

```
auraspear-platform/
├── apps/
│   ├── web/      @auraspear/web   — Next.js 16, React 19, Tailwind 4 (SOC UI)
│   └── api/      @auraspear/api   — NestJS 11, Prisma 7, Postgres, Redis (BFF)
├── packages/
│   ├── shared/   @auraspear/shared — cross-app contracts (scaffolded)
│   ├── config/   @auraspear/config — shared tooling presets (scaffolded)
│   └── ai/       @auraspear/ai     — AI safety/redaction/routing/eval (see docs/AI.md)
├── infra/        docker / k8s / terraform
├── scripts/      install / ci helpers
└── docs/         product, architecture, ADRs, audit
```

## Tech stack

| Layer    | Stack                                                                                    |
| -------- | ---------------------------------------------------------------------------------------- |
| Frontend | Next.js 16 · React 19 · TypeScript 5 · Tailwind 4 · TanStack Query · Zustand · next-intl |
| Backend  | NestJS 11 · Express 5 · Prisma 7 · PostgreSQL · Redis · Zod · Socket.IO · Pino           |
| AI       | AWS Bedrock · OpenAI-compatible LLM APIs · OpenClaw Gateway (provider cascade)           |
| Tooling  | pnpm 10 workspace · Turborepo · ESLint 9 · Prettier · Husky · Vitest · Jest · Playwright |
| Runtime  | Node.js 22 LTS                                                                           |

## Quick start

```bash
# Prerequisites: Node 22 LTS, pnpm 10 (corepack enable), Docker (optional)
pnpm install

# Configure environment (see docs/ENVIRONMENT.md)
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# Validate the workspace
pnpm typecheck            # both apps, via Turborepo

# Run
pnpm dev                  # web (Next.js dev server)
pnpm dev:api              # api (NestJS, runs prisma migrate + seed first)
```

## Root scripts

| Script                                        | Purpose                                |
| --------------------------------------------- | -------------------------------------- |
| `pnpm dev` / `pnpm dev:api`                   | run web / api in dev                   |
| `pnpm build`                                  | build all packages (Turborepo)         |
| `pnpm typecheck`                              | typecheck all packages                 |
| `pnpm lint` / `pnpm lint:strict`              | lint (strict = zero warnings)          |
| `pnpm test` / `pnpm test:e2e`                 | unit / e2e tests                       |
| `pnpm format` / `pnpm format:check`           | Prettier                               |
| `pnpm prisma:generate` / `:migrate` / `:seed` | database (api)                         |
| `pnpm docker:dev` / `:prod` / `:down`         | Docker stacks (infra/docker)           |
| `pnpm validate`                               | typecheck + lint:strict + format:check |

## Documentation

- [Product overview](docs/PRODUCT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Environment variables](docs/ENVIRONMENT.md)
- [Monorepo migration](docs/MONOREPO_MIGRATION.md)
- [Architecture Decision Records](docs/decisions/)
- [Audit & milestone reports](docs/audit/)

## Security

Multi-tenant isolation on every query, RBAC with `@RequirePermission`,
AES-256-GCM encryption of connector secrets, SSRF protection, JWT with
rotation + Redis blacklist, Helmet, strict CORS, and audited mutations.
See [SECURITY.md](apps/api/SECURITY.md) and [docs/decisions/](docs/decisions/).

## License

Apache-2.0.
