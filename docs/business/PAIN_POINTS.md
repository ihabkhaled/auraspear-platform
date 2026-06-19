# AuraSpear — Pain Points

> **AI agents and contributors: read [`AGENTS.md`](../../AGENTS.md) first.** It is
> the single entry point and defines the read-before-edit loading order, the
> security/AI invariants, and the command map. This document is a **business
> summary**, not a source of truth for behavior. Confirm every product claim
> against the code and the deep references: the one-page positioning in
> [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md), the goals in
> [`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md), the deep product
> reference [`docs/PRODUCT.md`](../PRODUCT.md), and stable business truths in
> [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md).

## Scope of this document

The five customer pain points AuraSpear is built to solve, each tied to the
**concrete mechanism in the repo** that addresses it. SOC tooling is fragmented
and analysts drown in alerts ([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md));
this page names that pain precisely and shows where the platform answers it.

Where a remedy is partly aspirational it is marked against the
[`docs/ROADMAP.md`](../ROADMAP.md) phase that delivers it rather than overstated
as shipped. AI-driven remedies are **deployment-dependent** on which AI
connectors are configured and healthy (see Pain 3 and Pain 4).

## How to read this with the rest of the repo

Load order for the business area (per [`AGENTS.md`](../../AGENTS.md) §1):

1. [`AGENTS.md`](../../AGENTS.md) — entry point + invariants
2. [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md) +
   [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md) — stable truths
3. [`context/BUSINESS_CONTEXT.md`](../../context/BUSINESS_CONTEXT.md) +
   [`context/PRODUCT_CONTEXT.md`](../../context/PRODUCT_CONTEXT.md) — working context
4. [`rules/`](../../rules/) — hard rules · [`skills/`](../../skills/) — recipes ·
   [`docs/`](../) — deep reference

Sibling business docs: [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md) ·
[`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) ·
[`TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md) · [`PERSONAS.md`](./PERSONAS.md).

## The pain points at a glance

| #   | Pain point              | Who feels it most                       | Primary mechanism in the repo                                              | Maturity                                                                 |
| --- | ----------------------- | --------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | Alert fatigue           | Tier-1/Tier-2 analysts, SOC managers    | AI woven into alert → case → incident; searchable `/ai-findings` workspace | Shipping AI subsystem; MTTR-outcome features expanding (ROADMAP Phase 4) |
| 2   | Tool sprawl             | SOC teams, lean startups                | BFF over Zod-validated connectors + built-in OSINT; whole-workflow modules | Shipping                                                                 |
| 3   | Slow investigation      | Analysts, threat hunters, IR            | AI investigation/hunt/explain agents; cross-chat memory; OSINT enrichment  | Shipping; quality is connector-dependent                                 |
| 4   | Weak auditability of AI | Compliance/GRC, security leaders, MSSPs | Provenance + `ApprovalRequest` workflow + action categories + audit log    | Shipping (enforced invariants); CI eval gate is Phase 4                  |
| 5   | MSSP tenant isolation   | MSSPs / MDR providers                   | `tenantId`-scoped data + dynamic RBAC + `X-Tenant-Id` switching            | Shipping (core invariant)                                                |

---

## Pain 1 — Alert fatigue

**The pain.** Analysts drown in a high-volume, low-context alert stream; the
signal-to-noise ratio is poor, the most important alerts get buried, and triage
does not scale with headcount ([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)).
Reducing alert fatigue (and MTTR) without stitching together many point tools is
the core business promise (see [`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) Goal 1).

**How AuraSpear addresses it.**

- **AI woven into the investigation lifecycle, not bolted on as a chatbot** — AI
  assists at the point of work (alert triage, IOC enrichment, case timelines,
  correlation synthesis) via a fleet of purpose-built agents plus an
  `orchestrator`, not one generic assistant
  (`apps/api/src/common/enums/ai-agent-config.enum.ts`;
  [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md); [`docs/AI.md`](../AI.md)).
- **A searchable AI findings workspace** — the `/ai-findings` route centralizes
  AI-generated findings with PostgreSQL full-text search (weighted ranking),
  filters, KPI cards (total / proposed / applied / dismissed / high-confidence),
  and Apply/Dismiss actions, so triage scales instead of scrolling raw alerts
  (`apps/web/CLAUDE.md` "AI Findings Page";
  `PATCH /ai/findings/:id/status`).
- **Findings carry confidence, so analysts prioritize** — every AI surface shows a
  confidence score, provider attribution, loading and error states, and a
  regenerate affordance (`apps/web/CLAUDE.md` rule 42), giving analysts a basis to
  rank what to look at first.
- **Cross-chat AI memory** — relevant prior context is auto-injected into the
  system prompt so analysts re-explain less across sessions
  (`apps/web/CLAUDE.md` "AI Cross-Chat Memory System").

**Honest maturity.** The AI subsystem (chat, findings, memory, agents,
orchestrator, investigation, hunting) **ships today**
([`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md)). The
fatigue-reducing **outcome** features — explainable risk scoring at scale, an AI
case-timeline builder, a SOAR playbook recommender — are expansion items in
[`docs/ROADMAP.md`](../ROADMAP.md) Phase 4. Triage quality is
**deployment-dependent** on configured connectors (Pain 3).

**Success signals.** Alerts-per-analyst after AI triage, AI-finding apply/dismiss
rates (`PATCH /ai/findings/:id/status`), and time saved via auto-enrichment.

## Pain 2 — Tool sprawl

**The pain.** A typical SOC stitches together a dozen disconnected point tools —
SIEM, EDR, threat-intel, SOAR, OSINT lookups — across as many browser tabs, with
no shared context, no single audit trail, and a heavy integration burden every
time something new is added.

**How AuraSpear addresses it.**

- **Backend-for-Frontend (BFF) architecture** — `apps/web` never calls
  Wazuh/OpenSearch/MISP directly; it proxies **every** call through
  `apps/web/src/app/api/*` routes to `apps/api`, the single integration point for
  every downstream security tool, AI provider, and the database
  (`apps/api/CLAUDE.md` Architecture; [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **Connector-driven integration** — per-type, Zod-validated connector configs for
  `wazuh`, `graylog`, `logstash`, `velociraptor`, `grafana`, `influxdb`, `misp`,
  `shuffle`, and `bedrock`, with credentials **AES-256-GCM encrypted at rest** and
  SSRF-validated URLs (`apps/api/CLAUDE.md` rules 39, 4, and 59). A new integration
  is a config, not a build.
- **Built-in OSINT enrichment** — VirusTotal, Shodan, AbuseIPDB, GreyNoise,
  URLScan, Censys, ThreatFox, Pulsedive plus custom sources, all SSRF-validated
  with encrypted-at-rest API keys, so analysts stop tab-hopping to enrich an
  indicator ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **Whole-workflow module coverage in one workspace** — alerts, cases, incidents,
  hunts, intel/IOC enrichment, correlation, detection rules, normalization, SOAR
  playbooks, cloud security, compliance, vulnerabilities, attack paths, UEBA, and
  dashboards (backend modules under `apps/api/src/modules`;
  [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)). The flow is one pane:
  login → triage → investigation → case → incident → report.

**Operational model.** Self-hosted: a Dockerized web + api + Postgres + Redis stack
under `infra/docker` (base + `dev`/`prod`/`infra`/`connectors` overlays). There is
**no managed multi-region SaaS offering in-repo**
([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)); do not market one.

**Success signals.** Active connectors per tenant, share of investigations
completed without leaving the workspace, OSINT enrichment hit rate.

## Pain 3 — Slow investigation

**The pain.** Investigating a single alert is slow and manual: pivoting across
tools, hand-collecting IOCs and enrichment, reconstructing timelines, and writing
up findings. This is the dominant driver of high MTTR.

**How AuraSpear addresses it.**

- **AI assistance at each investigation step** — purpose-built agents support
  investigation, threat hunting, and explanation, routed through configured AI
  connectors (backend AI module under `apps/api/src/modules/ai/` —
  `ai-investigate.dto`, `ai-hunt.dto`, `ai-explain.dto`; `apps/api/CLAUDE.md`
  Project Structure). AI investigation always validates that the alert belongs to
  the caller's tenant before running (`apps/api/CLAUDE.md` rule 48).
- **Provider-agnostic AI cascade, no vendor lock-in** — routing tries all
  configured connectors in order (AWS Bedrock → OpenAI-compatible LLM APIs →
  OpenClaw Gateway) and falls back to a clearly-labeled `rule-based` response only
  when none are available, so investigation assistance keeps working as providers
  change (`apps/api/CLAUDE.md` rule 88; `apps/web/CLAUDE.md` "AI Connector
  Strategy"). No env-gated mock providers in production (`apps/api/CLAUDE.md` rule 89).
- **One-click enrichment** — built-in OSINT sources turn manual indicator lookups
  into in-workspace enrichment (see Pain 2).
- **Less re-explaining** — cross-chat AI memory auto-injects relevant prior context
  so a hunter or analyst does not restate the same background each session
  (`apps/web/CLAUDE.md` "AI Cross-Chat Memory System").
- **Standardized, safe AI output** — structured AI blocks (risk gauges, IOC tables,
  MITRE maps, timelines) render through dedicated renderer components, and **raw AI
  output is never rendered as HTML** (`apps/web/CLAUDE.md` rules 53 and 43), so
  results are fast to read and safe to trust.

**Honest maturity.** The investigation, hunting, chat, and memory surfaces **ship
today** ([`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md)). The
**speed and quality** of AI investigation are **deployment-dependent** on which
connectors a deployment configures and keeps healthy
([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)). MTTR-outcome accelerators
(case-timeline builder, AI report writer) are [`docs/ROADMAP.md`](../ROADMAP.md)
Phase 4.

**Success signals.** MTTR per case/incident, time-to-first-enrichment, and the
share of investigations using AI assistance.

## Pain 4 — Weak auditability of AI

**The pain.** Bolt-on AI in security tooling is often an unaccountable black box:
no record of which model produced an answer, no provenance, no guardrails on
destructive actions, and no defensible audit trail — which is unacceptable for
regulated teams and for MSSPs answerable to their customers. AI assistance only
creates business value if security teams can **trust** it
([`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) Goal 4).

**How AuraSpear addresses it (enforced as invariants — [`AGENTS.md`](../../AGENTS.md) §7, [`rules/ai/`](../../rules/ai/)).**

- **Approval-required for destructive actions** — AI may analyze and suggest, but
  destructive security/infra actions are `approval-required` and create a
  **persisted `ApprovalRequest` before execution**; never executed without a
  persisted approval (`apps/api/CLAUDE.md` rule 97; [`AGENTS.md`](../../AGENTS.md) §7).
- **Every AI action is categorized** — `analysis-only`, `suggested`,
  `approval-required`, or `auto-allowed`, and the UI visually distinguishes them via
  the `AiActionCategory` enum; pending approvals show a status badge
  (`apps/web/CLAUDE.md` rules 44 and 59).
- **Provenance on every output** — AI output carries provider / model / confidence,
  and the audit log records which provider/model was used; every trigger evaluation
  is logged with trigger type, result, agent_id, and tenant_id
  (`apps/web/CLAUDE.md` "AI Connector Strategy → Routing"; `apps/api/CLAUDE.md`
  rule 99).
- **Safe rendering** — **raw AI output is never rendered as HTML** — markdown or
  plain text only, and inter-agent JSON is transformed to human-readable before
  rendering (`apps/web/CLAUDE.md` rules 43 and 58; [`AGENTS.md`](../../AGENTS.md) §7).
- **Privacy and cost governance** — AI memory is tenant-scoped and must not store
  secrets; PII/secrets are redacted before model calls (`@auraspear/ai` `redact()`),
  AI transcripts are never stored in `localStorage`, and per-agent token quotas are
  checked before each provider call (`apps/web/CLAUDE.md` rule 46;
  `apps/api/CLAUDE.md` rule 98; [`AGENTS.md`](../../AGENTS.md) §7).
- **Audit trail by construction** — all mutations are audit-logged with credentials
  redacted, and the audit interceptor's sensitive-key list covers every credential
  pattern (`apps/api/CLAUDE.md` rules 66 and "Audit logging";
  [`AGENTS.md`](../../AGENTS.md) §6).

**Honest maturity.** The governance invariants above are **enforced today**.
Further AI-governance hardening — wiring the golden-dataset eval gate into CI,
per-tenant AI opt-in/out, and a per-tenant model/provider router UI — is
[`docs/ROADMAP.md`](../ROADMAP.md) Phase 4 ([`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md)
Goal 4).

**Success signals.** Approval-gated action coverage (no destructive AI action
without a persisted approval), provenance completeness in the audit log, redaction
coverage, and eval-gate pass rate once wired into CI.

## Pain 5 — MSSP tenant isolation

**The pain.** MSSPs and MDR providers need one pane of glass across many customer
environments — but **any** cross-tenant data leak is a contract-ending,
trust-ending event. Multi-tenancy that is a feature flag rather than an invariant
is a liability.

**How AuraSpear addresses it.**

- **Tenant isolation is an enforced invariant** — every tenant-owned
  query / `update` / `delete` is scoped by `tenantId`; no cross-tenant data, ever
  ([`AGENTS.md`](../../AGENTS.md) §6). Every Prisma `update()` / `delete()` includes
  `tenantId` in the `where` clause, and every repository method takes `tenantId`
  (`apps/api/CLAUDE.md` rules 8 and 26; Repository Pattern).
- **Dynamic RBAC on every endpoint** — every endpoint carries
  `@RequirePermission(...)`; permissions are database-stored and seeded per role
  (`apps/api/CLAUDE.md` rule 25; [`AGENTS.md`](../../AGENTS.md) §6). The role
  hierarchy (most → least privileged) is `GLOBAL_ADMIN`, `PLATFORM_OPERATOR`,
  `TENANT_ADMIN`, `SOC_ANALYST_L2`, `THREAT_HUNTER`, `SOC_ANALYST_L1`,
  `EXECUTIVE_READONLY`
  (`apps/api/src/modules/role-settings/constants/default-permissions.ts`).
- **Safe tenant switching for operators** — `GLOBAL_ADMIN` / `PLATFORM_OPERATOR`
  switch tenant context via the `X-Tenant-Id` header, which the auth guard validates
  and applies; non-privileged users **cannot** switch tenants, and client-supplied
  role headers are never trusted (`apps/api/CLAUDE.md` "GLOBAL_ADMIN tenant
  switching" and rule 76).
- **Protected accounts** — seeded admin accounts are `isProtected` and cannot be
  deleted, blocked, or downgraded by anyone (`apps/api/CLAUDE.md` rules 20 and 27).
- **Per-tenant evidence trail** — all mutations are audit-logged with credentials
  redacted ([`AGENTS.md`](../../AGENTS.md) §6), giving each MSSP customer a defensible
  record. AI memory and AI investigation are tenant-scoped too
  (`apps/api/CLAUDE.md` rule 48; [`AGENTS.md`](../../AGENTS.md) §7).

**Non-negotiable.** No auth, secret, permission, or tenant-isolation bypass in any
environment — including dev (`apps/api/CLAUDE.md` rules 23 and 56;
[`AGENTS.md`](../../AGENTS.md) §6–7;
[`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md)). This is a security
invariant, so it is never traded for speed or demos.

**Success signals.** Tenants served per MSSP deployment, **zero** cross-tenant
access incidents, and audit-log completeness for mutations.

---

## Guardrails (do not trade them away to "solve" a pain faster)

No remedy on this page justifies violating the platform invariants
([`AGENTS.md`](../../AGENTS.md) §6–8). When solving a pain appears to conflict with
an invariant, the invariant wins:

- **Tenant isolation, RBAC, and auth** are never bypassed — not for speed, not for
  demos, not in dev.
- **AI destructive actions stay approval-gated**, with a persisted `ApprovalRequest`;
  **raw AI output is never rendered as HTML**.
- **No committed secrets**; connector credentials stay AES-256-GCM encrypted.
- **No `any`**; **`pnpm` only, Node 22**; never claim a validation gate is green
  without running it (`pnpm typecheck` / `pnpm build` are the hard gates —
  [`AGENTS.md`](../../AGENTS.md) §4–5).

## Where to go next

- One-page summary: [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)
- The goals behind these remedies: [`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md)
- Who feels each pain: [`docs/business/TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md) ·
  [`docs/business/PERSONAS.md`](./PERSONAS.md)
- Stable business truths: [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)
- Working context: [`context/BUSINESS_CONTEXT.md`](../../context/BUSINESS_CONTEXT.md) ·
  [`context/PRODUCT_CONTEXT.md`](../../context/PRODUCT_CONTEXT.md)
- Sequencing & maturity: [`docs/ROADMAP.md`](../ROADMAP.md)
- Deep product / AI / security: [`docs/PRODUCT.md`](../PRODUCT.md) ·
  [`docs/AI.md`](../AI.md) · [`docs/SECURITY.md`](../SECURITY.md)
- Hard rules: [`rules/`](../../rules/) · Recipes: [`skills/`](../../skills/) ·
  Docs index: [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)

---

_Sources: [`AGENTS.md`](../../AGENTS.md), `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`,
[`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md),
[`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md),
[`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md),
[`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md), and
[`docs/ROADMAP.md`](../ROADMAP.md). This is a business summary; maturity of
individual surfaces is best confirmed per-release against the code._
</content>
</invoke>
