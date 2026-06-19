# Business Goals

> **Read [`AGENTS.md`](../../AGENTS.md) first.** It is the single entry point and
> defines the read-before-edit loading order, the security/AI invariants, and the
> command map. This page states _why_ AuraSpear exists in business terms; it is
> **not** a source of truth for behavior. Confirm every product fact against the
> code and the deep references: [`docs/PRODUCT.md`](../PRODUCT.md),
> [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md), and
> [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md).

AuraSpear's goal is to be the **AI-first SOC platform** that modern security teams
and MSSPs run their day on. SOC tooling is fragmented and analysts drown in alerts
([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)); AuraSpear unifies
the workflow end-to-end and adds AI assistance that is attributable, auditable, and
approval-gated.

This document records the business goals that drive the platform and ties each one
to the concrete mechanisms in the repo that deliver it. Where a goal is partly
aspirational, it is marked against the [`docs/ROADMAP.md`](../ROADMAP.md) phase that
delivers it rather than overstated as shipped.

## How to read this with the rest of the repo

Load order for the business area (per [`AGENTS.md`](../../AGENTS.md) §1):

1. [`AGENTS.md`](../../AGENTS.md) — entry point + invariants
2. [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md) +
   [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md) — stable truths
3. [`context/BUSINESS_CONTEXT.md`](../../context/BUSINESS_CONTEXT.md) +
   [`context/PRODUCT_CONTEXT.md`](../../context/PRODUCT_CONTEXT.md) — working context
4. [`rules/`](../../rules/) — hard rules · [`skills/`](../../skills/) — recipes ·
   [`docs/`](../) — deep reference

## The goals at a glance

| #   | Business goal               | Outcome we sell                                          | Primary mechanism in the repo                                         | Maturity                                                            |
| --- | --------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Reduce MTTR & alert fatigue | Faster time-to-understand/respond; less noise            | AI woven into alert → case → incident → report; AI findings workspace | Shipping AI subsystem; outcome features expanding (ROADMAP Phase 4) |
| 2   | Unify SOC tooling           | One governed workspace, not a dozen tabs                 | BFF over connectors (Wazuh/OpenSearch/MISP/Shuffle/Bedrock + OSINT)   | Shipping                                                            |
| 3   | MSSP multi-tenancy          | One pane of glass across many customers, safely isolated | `tenantId`-scoped data + `X-Tenant-Id` tenant switching for admins    | Shipping (core invariant)                                           |
| 4   | AI-assisted outcomes        | Attributable, auditable, approval-gated AI               | Provider cascade + provenance + `ApprovalRequest` workflow            | Shipping; governance hardening (ROADMAP Phase 4)                    |
| 5   | Marketplace readiness       | Extensible connector / content ecosystem                 | Connector model + provider-agnostic router as the substrate           | Foundations laid; marketplace planned (ROADMAP Phase 5)             |

> Fast time-to-value (connector-driven integration, seeded demo data, one-command
> install via `pnpm install` + `pnpm setup:env`, per [`AGENTS.md`](../../AGENTS.md)
> §4) is a cross-cutting enabler of every goal below rather than a standalone goal.

---

## Goal 1 — Reduce MTTR and alert fatigue

**Why.** The core business promise is lower mean-time-to-resolve (MTTR) and less
alert fatigue **without** stitching together many point tools
([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)).

**How the platform delivers it.**

- **AI woven into the investigation lifecycle, not bolted on as a chatbot** —
  AI assists at the point of work (alert triage, IOC enrichment, case timelines,
  correlation synthesis, detection drafting, reporting) via a fleet of
  purpose-built agents plus an `orchestrator`
  ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md); [`docs/AI.md`](../AI.md)).
- **The whole SOC workflow in one workspace** — alerts → cases → incidents →
  reports, so analysts stop context-switching across a dozen tabs (backend modules
  under `apps/api/src/modules`).
- **A searchable AI findings workspace** — the `/ai-findings` route (PostgreSQL
  full-text search with weighted ranking, KPI cards, filters) centralizes
  AI-generated findings so triage scales (`apps/web/CLAUDE.md` "AI Findings Page").
- **Cross-chat AI memory** — relevant prior context is auto-injected into the
  system prompt so analysts re-explain less (`apps/web/CLAUDE.md` "AI Cross-Chat
  Memory System").

**Honest maturity.** The AI subsystem (chat, findings, memory, agents,
orchestrator, investigation, hunting) **ships today**
([`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md)). MTTR-focused
**outcome** features — AI case-timeline builder, explainable risk scoring at scale,
SOAR playbook recommender, AI report writer — are expansion items in
[`docs/ROADMAP.md`](../ROADMAP.md) Phase 4, not yet shipped. AI quality is
**deployment-dependent** on which connectors are configured and healthy (Goal 4).

**Success signals to track.** MTTR per case/incident, alerts-per-analyst after AI
triage, AI-finding apply/dismiss rates (`PATCH /ai/findings/:id/status`), and time
saved via auto-enrichment.

## Goal 2 — Unify SOC tooling

**Why.** Replace a stack of disconnected point tools with one governed workspace
covering the end-to-end SOC workflow (login → triage → investigation → case →
incident → report).

**How the platform delivers it.**

- **Backend-for-Frontend (BFF) architecture** — `apps/web` never calls
  Wazuh/OpenSearch/MISP directly; it proxies every call through
  `apps/web/src/app/api/*` to `apps/api`, the single integration point for every
  downstream security tool, AI provider, and the database (`apps/api/CLAUDE.md`
  Architecture; [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **Connector-driven integration** — per-type, Zod-validated connector configs for
  `wazuh`, `graylog`, `logstash`, `velociraptor`, `grafana`, `influxdb`, `misp`,
  `shuffle`, and `bedrock`, with credentials **AES-256-GCM encrypted at rest**
  (`apps/api/CLAUDE.md` rules 39 and 4).
- **Built-in OSINT enrichment** — VirusTotal, Shodan, AbuseIPDB, GreyNoise,
  URLScan, Censys, ThreatFox, Pulsedive plus custom sources, all SSRF-validated
  and with encrypted-at-rest API keys
  ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **Whole-workflow module coverage** — alerts, cases, incidents, hunts, intel/IOC
  enrichment, correlation, detection rules, normalization, SOAR playbooks, cloud
  security, compliance, vulnerabilities, attack paths, UEBA, and dashboards
  ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).

**Operational model.** Self-hosted: a Dockerized web + api + Postgres + Redis stack
under `infra/docker` (base + `dev`/`prod`/`infra`/`connectors` overlays). There is
**no managed multi-region SaaS offering in-repo**
([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)); do not market one.

**Success signals to track.** Active connectors per tenant, share of investigations
completed without leaving the workspace, OSINT enrichment hit rate.

## Goal 3 — MSSP multi-tenancy

**Why.** MSSPs and MDR providers need one pane of glass across many customer
environments — with **hard** isolation between them. Multi-tenancy is core, not a
feature flag.

**How the platform delivers it.**

- **Tenant isolation is an enforced invariant** — every tenant-owned
  query/`update`/`delete` is scoped by `tenantId`; no cross-tenant data, ever
  ([`AGENTS.md`](../../AGENTS.md) §6). Every Prisma `update()`/`delete()` includes
  `tenantId` in the `where` clause, and every repository method takes `tenantId`
  (`apps/api/CLAUDE.md` rules 8 and 26; Repository Pattern).
- **Dynamic RBAC** — every endpoint carries `@RequirePermission(...)`; permissions
  are database-stored and seeded per role (`apps/api/CLAUDE.md` rule 25;
  [`AGENTS.md`](../../AGENTS.md) §6). The role hierarchy (most → least privileged)
  is `GLOBAL_ADMIN`, `PLATFORM_OPERATOR`, `TENANT_ADMIN`, `SOC_ANALYST_L2`,
  `THREAT_HUNTER`, `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`
  (`apps/api/src/modules/role-settings/constants/default-permissions.ts`).
- **Safe tenant switching for operators** — `GLOBAL_ADMIN` / `PLATFORM_OPERATOR`
  switch tenant context via the `X-Tenant-Id` header, which the auth guard
  validates and applies; non-privileged users **cannot** switch tenants
  (`apps/api/CLAUDE.md` "GLOBAL_ADMIN tenant switching"). Client-supplied role
  headers are never trusted (`apps/api/CLAUDE.md` rule 76).
- **Protected accounts** — seeded admin accounts are `isProtected` and cannot be
  deleted, blocked, or downgraded by anyone (`apps/api/CLAUDE.md` rules 20 and 27).
- **Auditability** — all mutations are audit-logged with credentials redacted
  ([`AGENTS.md`](../../AGENTS.md) §6), giving MSSPs a per-tenant evidence trail.

**Non-negotiable.** No auth, secret, permission, or tenant-isolation bypass in any
environment — including dev (`apps/api/CLAUDE.md` rules 23 and 56;
[`AGENTS.md`](../../AGENTS.md) §6–7; [`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md)).
This goal is a security invariant, so it can never be traded for convenience.

**Success signals to track.** Tenants served per MSSP deployment, zero cross-tenant
access incidents, audit-log completeness for mutations.

## Goal 4 — AI-assisted outcomes (attributable, auditable, approval-gated)

**Why.** AI assistance only creates business value if security teams can **trust**
it. The differentiator is AI that is attributable, auditable, and approval-gated
([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)) — not an
unaccountable black box.

**How the platform delivers it.**

- **Provider-agnostic AI cascade, no vendor lock-in** — routing tries all
  configured connectors in order (AWS Bedrock → OpenAI-compatible LLM APIs →
  OpenClaw Gateway) and falls back to a clearly-labeled `rule-based` response only
  when none are available (`apps/api/CLAUDE.md` rule 88; `apps/web/CLAUDE.md` "AI
  Connector Strategy"). No env-gated mock providers in production
  (`apps/api/CLAUDE.md` rule 89).
- **Approval-required for destructive actions** — AI may analyze and suggest, but
  destructive security/infra actions are `approval-required` and create a persisted
  `ApprovalRequest` **before** execution; every action is categorized
  `analysis-only` / `suggested` / `approval-required` / `auto-allowed`
  ([`AGENTS.md`](../../AGENTS.md) §7; `apps/api/CLAUDE.md` rule 97;
  `apps/web/CLAUDE.md` rules 44 and 59).
- **Provenance and safe rendering** — AI output carries provider/model/confidence
  provenance, and **raw AI output is never rendered as HTML** — markdown or plain
  text only (`apps/web/CLAUDE.md` rule 43; [`AGENTS.md`](../../AGENTS.md) §7). Every
  AI UI surface shows loading, error, confidence, provider attribution, and a
  regenerate affordance (`apps/web/CLAUDE.md` rule 42).
- **Privacy and cost governance** — AI memory is tenant-scoped and must not store
  secrets; PII/secrets are redacted before model calls (`@auraspear/ai` `redact()`);
  per-agent token quotas are checked before each provider call, and the audit log
  records which provider/model was used (`apps/api/CLAUDE.md` rules 98–99;
  [`AGENTS.md`](../../AGENTS.md) §7; [`docs/AI.md`](../AI.md)).

**Honest maturity.** The governance invariants above are **enforced today**.
Further AI-governance hardening — wiring the golden-dataset eval gate into CI,
per-tenant AI opt-in/out, and a per-tenant model/provider router UI — is
[`docs/ROADMAP.md`](../ROADMAP.md) Phase 4. AI **outcome quality** depends on the
connectors a deployment configures (Goal 1 caveat).

**Success signals to track.** Approval-gated action coverage (no destructive AI
action without a persisted approval), provenance completeness in the audit log,
redaction coverage, and eval-gate pass rate once wired into CI.

## Goal 5 — Marketplace readiness

**Why.** The longer-horizon business direction is to move from a hardened, governed
SOC product toward an **extensible ecosystem** — a third-party connector, playbook,
and detection-content marketplace ([`docs/ROADMAP.md`](../ROADMAP.md) Phase 5).

**How the foundations are already laid.**

- **The connector model is the substrate** — per-type Zod-validated configs with
  AES-256-GCM-encrypted credentials and an `infra/docker` `connectors` overlay give
  a structured, secure extension point (`apps/api/CLAUDE.md` rule 39;
  [`docs/ROADMAP.md`](../ROADMAP.md) Phase 5).
- **The provider-agnostic router** generalizes "pluggable backends," the same
  pattern a marketplace needs for swappable content (`apps/web/CLAUDE.md` "AI
  Connector Strategy"; [`docs/ROADMAP.md`](../ROADMAP.md) Phase 5).
- **The job system** (`CONNECTOR_SYNC`, `DETECTION_RULE_EXECUTION`,
  `CORRELATION_RULE_EXECUTION`, `NORMALIZATION_PIPELINE`, `SOAR_PLAYBOOK`,
  `HUNT_EXECUTION`, `AI_AGENT_TASK`, `REPORT_GENERATION`) plus the orchestrator's
  automation-mode / budget / approval validation provide the execution backbone for
  marketplace-delivered automation (`apps/web/CLAUDE.md` "Job Types & Handlers";
  [`docs/ROADMAP.md`](../ROADMAP.md) Phase 5).

**Honest maturity.** This is **planned, not shipped.** There is **no marketplace in
the repo today** — a search for "marketplace" hits only docs, the security-scan
skill, the seed file, and the security workflow, not a product surface. Treat
marketplace as the destination the roadmap sequences toward, gated behind Phase 3
enterprise hardening and Phase 4 AI governance ([`docs/ROADMAP.md`](../ROADMAP.md)).

**Success signals to track (forward-looking).** Installable connectors / playbooks /
detection packs, third-party contribution volume, and revenue share — once the
marketplace exists.

---

## Commercial direction

MVP → beta → enterprise → marketplace, with AI governance and SOC automation as the
differentiators. The phase sequencing, delivered vs. planned status, and known
risks are tracked in [`docs/ROADMAP.md`](../ROADMAP.md) (Phase 1–2 delivered;
Phase 3 enterprise hardening next; Phase 4 AI governance; Phase 5 automation &
marketplace).

## Guardrails on these goals (do not trade them away)

No business goal justifies violating the platform invariants
([`AGENTS.md`](../../AGENTS.md) §6–8). When a goal and an invariant appear to
conflict, the invariant wins:

- **Tenant isolation, RBAC, and auth** are never bypassed for speed or demos.
- **AI destructive actions stay approval-gated**, with a persisted
  `ApprovalRequest`; raw AI HTML is never rendered.
- **No committed secrets**; connector credentials stay AES-256-GCM encrypted.
- **No `any`**; **`pnpm` only, Node 22**; never claim a validation gate is green
  without running it (`pnpm typecheck` / `pnpm build` are the hard gates —
  [`AGENTS.md`](../../AGENTS.md) §4–5).

## How the product reflects these goals

- End-to-end SOC workflow coverage (login → triage → investigation → case →
  incident → report) — see [`docs/PRODUCT.md`](../PRODUCT.md) and the journeys doc
  (`docs/business/USER_JOURNEYS.md`, planned per
  [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)).
- An AI subsystem woven through investigation (chat, findings, memory, agents,
  orchestrator) — [`docs/AI.md`](../AI.md).
- Security invariants as non-negotiables (tenancy, RBAC, encryption, audit) —
  [`docs/SECURITY.md`](../SECURITY.md),
  [`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md).

## Where to go next

- One-page summary: [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)
- Stable business truths: [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)
- Working context: [`context/BUSINESS_CONTEXT.md`](../../context/BUSINESS_CONTEXT.md) ·
  [`context/PRODUCT_CONTEXT.md`](../../context/PRODUCT_CONTEXT.md)
- Sequencing & maturity: [`docs/ROADMAP.md`](../ROADMAP.md)
- Deep product / AI / security: [`docs/PRODUCT.md`](../PRODUCT.md) ·
  [`docs/AI.md`](../AI.md) · [`docs/SECURITY.md`](../SECURITY.md)
- Docs index: [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)

---

_Sources: [`AGENTS.md`](../../AGENTS.md), `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`,
[`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md),
[`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md),
[`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md), and
[`docs/ROADMAP.md`](../ROADMAP.md). This is a business summary; maturity of
individual surfaces is best confirmed per-release against the code._
