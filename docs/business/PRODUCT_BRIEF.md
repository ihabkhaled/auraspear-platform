# AuraSpear — Product Brief (one page)

> **AI agents and contributors: read [`AGENTS.md`](../../AGENTS.md) first.** It is
> the single entry point and defines the read-before-edit loading order, the
> security/AI invariants, and the command map. This brief is a business summary,
> not a source of truth — the deep product reference is
> [`docs/PRODUCT.md`](../PRODUCT.md).

## What AuraSpear is

AuraSpear is an **AI-first SOC platform** that unifies SIEM alerts, cases,
incidents, threat hunting, threat-intelligence enrichment, SOAR automation,
detection engineering, cloud security, and compliance into a single
**multi-tenant, RBAC-governed** workspace. AI reasoning is woven through the
investigation lifecycle rather than bolted on as a chatbot.

It ships as a **Backend-for-Frontend (BFF)** monorepo (see the map in
[`AGENTS.md`](../../AGENTS.md) §3):

- **`apps/web`** (`@auraspear/web`) — Next.js 16 / React 19 / Tailwind 4 SOC
  console. It never talks to security tools directly; it proxies every call
  through `apps/web/src/app/api/*` routes.
- **`apps/api`** (`@auraspear/api`) — NestJS 11 / Prisma 7 / PostgreSQL / Redis
  BFF. The single integration point for every downstream security tool, AI
  provider, and the database.

Self-hosted operational model: a Dockerized web + api + Postgres + Redis stack
(`infra/docker`). There is no managed multi-region SaaS offering in-repo.

## AI-first SOC positioning

- **AI woven into the workflow, not bolted on.** AI assists at the point of work
  — alert triage, IOC enrichment, case timelines, correlation synthesis, Sigma
  drafting, vuln prioritization, attack-path summaries, reporting — via a fleet
  of **20+ purpose-built agents** plus an `orchestrator`, not one generic
  assistant (see `apps/api/src/common/enums/ai-agent-config.enum.ts`).
- **Provider-agnostic AI cascade.** Routing tries all configured connectors in
  order (AWS Bedrock → OpenAI-compatible LLM APIs → OpenClaw Gateway) and falls
  back to a clearly-labeled `rule-based` response only when none are available.
  No single-vendor lock-in. AI quality is therefore **deployment-dependent** on
  which connectors are configured and healthy.
- **Safety and governance first** (enforced as invariants — see
  [`AGENTS.md`](../../AGENTS.md) §7 and `rules/ai/`):
  - AI may analyze and suggest, but **destructive actions are
    `approval-required`** and create a persisted `ApprovalRequest` before
    execution. Every action is categorized (`analysis-only`, `suggested`,
    `approval-required`, `auto-allowed`).
  - AI output carries provenance (provider/model/confidence) and **raw AI output
    is never rendered as HTML** — markdown or plain text only.
  - AI memory is tenant-scoped, must not store secrets, and redacts PII/secrets
    before model calls.

## Top capabilities

- **Whole SOC workflow in one workspace** — alerts → cases → incidents → reports,
  plus hunts, intel/IOC enrichment, correlation, detection rules, normalization,
  SOAR playbooks, cloud security (AWS/Azure/GCP/OCI), compliance, vulnerabilities,
  attack paths, UEBA, and dashboards (backend modules under
  `apps/api/src/modules`).
- **AI-native surfaces** — `ai-chat` (LLM conversations with cross-chat memory),
  a searchable `ai-findings` workspace (PostgreSQL full-text search), `ai-agents`
  / `ai-config` / `ai-agent-graph`, and governance views (`ai-finops`, `ai-eval`,
  `ai-ops`, `ai-simulations`) under `apps/web/src/app/(portal)`.
- **Built-in OSINT enrichment** — VirusTotal, Shodan, AbuseIPDB, GreyNoise,
  URLScan, Censys, ThreatFox, Pulsedive plus custom sources, with SSRF-validated
  URLs and encrypted-at-rest API keys.
- **MSSP-grade multi-tenancy** — every query is `tenantId`-scoped;
  `GLOBAL_ADMIN`/`PLATFORM_OPERATOR` switch tenant context via `X-Tenant-Id`.
  Seeded admin accounts are `isProtected` and cannot be deleted or downgraded.
- **Security-hardened by construction** — strict tenant isolation,
  `@RequirePermission` RBAC, AES-256-GCM connector-secret encryption, SSRF
  validation, JWT rotation with a Redis-backed blacklist, and full audit logging
  of mutations.

## Who it is for

| Segment                          | Why AuraSpear fits                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **MSSPs / MDR providers**        | Multi-tenant by design — one pane of glass across many customer environments.                                                         |
| **In-house SOC teams**           | Full alert → case → incident → report flow with tiered analyst roles (L1/L2) and RBAC.                                                |
| **Incident response (IR) teams** | Cases with tasks, artifacts, notes, linked alerts, timelines, and AI investigation assistance.                                        |
| **Compliance / GRC teams**       | Control status across ISO 27001, NIST, PCI-DSS, SOC2, HIPAA, GDPR; full audit logging.                                                |
| **Cloud security teams**         | Cloud accounts and findings across AWS, Azure, GCP, OCI with AI cloud-triage.                                                         |
| **Lean security startups**       | Connector-driven architecture and the AI provider cascade let a small team stand up a SOC without building integrations from scratch. |

Roles map to the backend `UserRole` hierarchy (most → least privileged):
`GLOBAL_ADMIN`, `PLATFORM_OPERATOR`, `TENANT_ADMIN`, `SOC_ANALYST_L2`,
`THREAT_HUNTER`, `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`
(`apps/api/src/modules/role-settings/constants/default-permissions.ts`).

## At a glance

| Aspect             | Summary                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| **Category**       | AI-first SOC / SIEM / SOAR / threat-intelligence platform                                               |
| **Architecture**   | Multi-tenant BFF — Next.js 16 web + NestJS 11 API + Postgres + Redis                                    |
| **Primary buyers** | MSSPs, in-house SOC teams, IR, compliance/GRC, cloud security, lean startups                            |
| **Core promise**   | The whole SOC workflow in one governed workspace, AI woven into investigation                           |
| **AI strategy**    | Provider cascade (Bedrock → LLM APIs → OpenClaw Gateway) with rule-based fallback                       |
| **Governance**     | Tenant isolation, dynamic RBAC, approval workflows, per-agent budgets, full audit logging               |
| **Toolchain**      | pnpm only, Node 22; gates via `pnpm typecheck` / `pnpm build` (see [`AGENTS.md`](../../AGENTS.md) §4–5) |

## Where to go next

- Deep product reference: [`docs/PRODUCT.md`](../PRODUCT.md)
- Onboarding entry point: [`AGENTS.md`](../../AGENTS.md)
- Stable business truths: [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)
- Hard rules: [`rules/`](../../rules/) · Recipes: [`skills/`](../../skills/) ·
  Stable memory: [`memory/`](../../memory/) · Working context: [`context/`](../../context/)
- Architecture, security, and AI deep dives: [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md),
  [`docs/SECURITY.md`](../SECURITY.md), [`docs/AI.md`](../AI.md) · Index:
  [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)

---

_Sources: [`docs/PRODUCT.md`](../PRODUCT.md), [`AGENTS.md`](../../AGENTS.md),
`apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`, and the modules/enums they cite. This
brief is a business summary; depth and maturity of individual surfaces are best
confirmed per-release against the code._
