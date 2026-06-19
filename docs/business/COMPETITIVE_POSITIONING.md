# AuraSpear — Competitive Positioning

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

**How AuraSpear is positioned against the alternatives a buyer is already paying
for** — and which differentiators are defensible because they are wired into the
codebase, not just into a pitch deck. SOC tooling is fragmented and analysts
drown in alerts ([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md));
the alternatives are usually a stack of **point tools** (a SIEM, a separate SOAR,
a standalone threat-intel platform, a bolt-on "AI security copilot") stitched
together across browser tabs.

Every differentiator below is tied to the **concrete mechanism in the repo** that
makes it real. Where a differentiator is partly aspirational it is marked against
the [`docs/ROADMAP.md`](../ROADMAP.md) phase that delivers it rather than
overstated as shipped. AI-driven advantages are **deployment-dependent** on which
AI connectors are configured and healthy (see Differentiator 1 and 4). This page
does not compare against named vendors or make benchmark claims it cannot
substantiate in code.

## How to read this with the rest of the repo

Load order for the business area (per [`AGENTS.md`](../../AGENTS.md) §1):

1. [`AGENTS.md`](../../AGENTS.md) — entry point + invariants
2. [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md) +
   [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md) — stable truths
3. [`context/BUSINESS_CONTEXT.md`](../../context/BUSINESS_CONTEXT.md) +
   [`context/PRODUCT_CONTEXT.md`](../../context/PRODUCT_CONTEXT.md) — working context
4. [`rules/`](../../rules/) — hard rules (esp. [`rules/ai/`](../../rules/ai/),
   [`rules/security/`](../../rules/security/)) ·
   [`skills/`](../../skills/) — recipes · [`docs/`](../) — deep reference

Sibling business docs: [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md) ·
[`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) ·
[`TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md) · [`PERSONAS.md`](./PERSONAS.md) ·
[`PAIN_POINTS.md`](./PAIN_POINTS.md) · [`MODULE_CATALOG.md`](./MODULE_CATALOG.md) ·
[`USER_JOURNEYS.md`](./USER_JOURNEYS.md).

## The category we play in

AuraSpear is an **AI-first SOC platform** that unifies SIEM alerts, cases,
incidents, threat hunting, intelligence enrichment, SOAR automation, detection
engineering, cloud security, and compliance into a single **multi-tenant,
RBAC-governed** workspace, with AI woven into investigation rather than bolted on
as a chatbot ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)). The
category framing — "AI-first SOC / SIEM / SOAR / threat-intelligence platform" —
matters because the **competition is rarely one product**; it is the cost,
friction, and blind spots of running several disconnected ones.

The four differentiators that follow are exactly the differentiators recorded as
stable business truth ([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)):
AI woven through investigation; a unified end-to-end SOC workflow; multi-tenant
RBAC for MSSPs; and auditable, approval-gated AI.

## Differentiators at a glance

| #   | Differentiator                            | What point tools do instead                                        | Primary mechanism in the repo                                                                                   | Maturity                                                            |
| --- | ----------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | **AI-first**, woven into investigation    | Bolt-on "AI copilot" chatbot beside the tool                       | Purpose-built agents + `orchestrator`; provider-agnostic cascade; `/ai-findings`, `/ai-chat`, cross-chat memory | Shipping AI subsystem; outcome features expanding (ROADMAP Phase 4) |
| 2   | **Unified SOC workflow** in one workspace | A dozen tabs: SIEM + SOAR + TIP + OSINT, no shared context         | BFF over Zod-validated connectors + built-in OSINT; whole-workflow modules under `apps/api/src/modules`         | Shipping                                                            |
| 3   | **Multi-tenant MSSP** by architecture     | Single-tenant tools; per-customer instances or risky shared logins | `tenantId`-scoped data + dynamic RBAC + `X-Tenant-Id` operator switching                                        | Shipping (core invariant)                                           |
| 4   | **Auditable, approval-gated AI**          | Unaccountable AI black box; no provenance, no guardrails           | Provenance + `ApprovalRequest` workflow + action categories + audit log + safe rendering                        | Shipping (enforced invariants); CI eval gate is ROADMAP Phase 4     |

> These four are **mutually reinforcing**, not a feature checklist: the AI is
> trustworthy (4) _because_ it runs inside a tenant-isolated, RBAC-governed
> workspace (3) over a unified data model (2), which is also what lets the AI
> reason across the whole investigation rather than one tool's slice (1). A point
> tool can copy any one of these in isolation; copying the combination is the
> moat.

---

## Differentiator 1 — AI-first, woven into the investigation (vs. bolt-on copilots)

**The contrast.** Most incumbents added AI late, as a **side chatbot** next to an
existing product: a text box that summarizes one screen, with no shared memory,
no action governance, and no reach across the rest of the SOC. AuraSpear is
**AI-first** — AI reasoning is woven through the investigation lifecycle rather
than bolted on ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).

**Why ours is different (and grounded in the repo).**

- **A fleet of purpose-built agents plus an `orchestrator`, not one generic
  assistant** — AI assists at the point of work (alert triage, IOC enrichment,
  case timelines, correlation synthesis, Sigma drafting, vuln prioritization,
  attack-path summaries, reporting) via 20+ agents
  (`apps/api/src/common/enums/ai-agent-config.enum.ts`;
  [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md); [`docs/AI.md`](../AI.md)).
- **AI-native surfaces are first-class product**, not a popup — `ai-chat` (LLM
  conversations), a searchable `ai-findings` workspace with PostgreSQL full-text
  search and Apply/Dismiss actions, `ai-agents` / `ai-config` / `ai-agent-graph`,
  and governance views (`ai-finops`, `ai-eval`, `ai-ops`, `ai-simulations`) under
  `apps/web/src/app/(portal)` ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **Cross-chat AI memory** — relevant prior context is auto-injected into the
  system prompt so analysts re-explain less across sessions, a capability a
  stateless bolt-on chatbot cannot match (`apps/web/CLAUDE.md` "AI Cross-Chat
  Memory System").
- **Provider-agnostic by design** — the AI is not married to one vendor's model
  (see Differentiator 4), so "AI-first" does not mean "locked to one LLM vendor."

**Honest maturity.** The AI subsystem (chat, findings, memory, agents,
orchestrator, investigation, hunting) **ships today**
([`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md)). The
outcome-focused accelerators — AI case-timeline builder, explainable risk scoring
at scale, SOAR playbook recommender, AI report writer — are expansion items in
[`docs/ROADMAP.md`](../ROADMAP.md) Phase 4. AI quality is **deployment-dependent**
on which connectors are configured and healthy.

## Differentiator 2 — Unified SOC workflow (vs. a stack of point tools)

**The contrast.** A typical SOC stitches together a dozen disconnected point tools
— SIEM, EDR, threat-intel platform, SOAR, OSINT lookups — across as many browser
tabs, with no shared context, no single audit trail, and an integration burden
every time something new is added ([`PAIN_POINTS.md`](./PAIN_POINTS.md) Pain 2).
AuraSpear's promise is the **whole SOC workflow in one governed workspace**:
login → triage → investigation → case → incident → report.

**Why ours is different (and grounded in the repo).**

- **Backend-for-Frontend (BFF) architecture** — `apps/web` never calls
  Wazuh/OpenSearch/MISP directly; it proxies **every** call through
  `apps/web/src/app/api/*` to `apps/api`, the single integration point for every
  downstream security tool, AI provider, and the database (`apps/api/CLAUDE.md`
  Architecture; [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)). The shared
  context that point tools lack is the default here.
- **Connector-driven integration, not bespoke glue** — per-type, Zod-validated
  connector configs for `wazuh`, `graylog`, `logstash`, `velociraptor`, `grafana`,
  `influxdb`, `misp`, `shuffle`, and `bedrock`, with credentials **AES-256-GCM
  encrypted at rest** and SSRF-validated URLs (`apps/api/CLAUDE.md` rules 39, 4,
  59). A new integration is a config, not a build.
- **Built-in OSINT enrichment** — VirusTotal, Shodan, AbuseIPDB, GreyNoise,
  URLScan, Censys, ThreatFox, Pulsedive plus custom sources, so analysts stop
  tab-hopping to enrich an indicator
  ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **Whole-workflow module coverage** — alerts, cases, incidents, hunts, intel/IOC
  enrichment, correlation, detection rules, normalization, SOAR playbooks, cloud
  security, compliance, vulnerabilities, attack paths, UEBA, and dashboards
  (backend modules under `apps/api/src/modules`;
  [`docs/business/MODULE_CATALOG.md`](./MODULE_CATALOG.md)). One buyer can serve
  SOC, IR, compliance, and cloud-security teams without four products.

**Operational model.** Self-hosted: a Dockerized web + api + Postgres + Redis
stack under `infra/docker` (base + `dev`/`prod`/`infra`/`connectors` overlays).
There is **no managed multi-region SaaS offering in-repo**
([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)); do not position one. The
honest counter-positioning is "one self-hosted, governed workspace," not "managed
cloud SOC."

## Differentiator 3 — Multi-tenant MSSP by architecture (vs. single-tenant tools)

**The contrast.** Many SOC point tools are **single-tenant**: an MSSP either
stands up a separate instance per customer (operationally heavy) or shares logins
(a trust and isolation risk). For an MSSP, **any** cross-tenant data leak is a
contract-ending, trust-ending event ([`PAIN_POINTS.md`](./PAIN_POINTS.md) Pain 5).
AuraSpear treats multi-tenancy as the **architecture, not an add-on**
([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)).

**Why ours is different (and grounded in the repo).**

- **Tenant isolation is an enforced invariant** — every tenant-owned
  query / `update` / `delete` is scoped by `tenantId`; no cross-tenant data, ever
  ([`AGENTS.md`](../../AGENTS.md) §6). Every Prisma `update()` / `delete()`
  includes `tenantId` in the `where` clause, and every repository method takes
  `tenantId` (`apps/api/CLAUDE.md` rules 8 and 26; Repository Pattern). This is a
  guardrail the codebase enforces, not a configuration a customer can get wrong.
- **One pane of glass across customer environments** — `GLOBAL_ADMIN` /
  `PLATFORM_OPERATOR` switch tenant context via the `X-Tenant-Id` header, which
  the auth guard validates and applies; non-privileged users **cannot** switch
  tenants, and client-supplied role headers are never trusted (`apps/api/CLAUDE.md`
  "GLOBAL_ADMIN tenant switching" and rule 76).
- **Dynamic RBAC on every endpoint** — every endpoint carries
  `@RequirePermission(...)`; permissions are database-stored and seeded per role
  (`apps/api/CLAUDE.md` rule 25; [`AGENTS.md`](../../AGENTS.md) §6). The role
  hierarchy (most → least privileged) is `GLOBAL_ADMIN`, `PLATFORM_OPERATOR`,
  `TENANT_ADMIN`, `SOC_ANALYST_L2`, `THREAT_HUNTER`, `SOC_ANALYST_L1`,
  `EXECUTIVE_READONLY`
  (`apps/api/src/modules/role-settings/constants/default-permissions.ts`).
- **Protected platform accounts** — seeded admin accounts are `isProtected` and
  cannot be deleted, blocked, or downgraded by anyone (`apps/api/CLAUDE.md` rules
  20 and 27), protecting the service operator's own access.
- **Per-tenant evidence trail** — all mutations are audit-logged with credentials
  redacted ([`AGENTS.md`](../../AGENTS.md) §6); AI memory and AI investigation are
  tenant-scoped too (`apps/api/CLAUDE.md` rule 48). Each MSSP customer gets a
  defensible record.

**Non-negotiable.** No auth, secret, permission, or tenant-isolation bypass in any
environment — including dev (`apps/api/CLAUDE.md` rules 23 and 56;
[`AGENTS.md`](../../AGENTS.md) §6–7;
[`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md)). This is a security
invariant, so it is never traded for a competitive demo.

## Differentiator 4 — Auditable, approval-gated AI (vs. the AI black box)

**The contrast.** Bolt-on AI in security tooling is often an **unaccountable black
box**: no record of which model produced an answer, no provenance, no guardrails
on destructive actions, and no defensible audit trail — unacceptable for regulated
teams and for MSSPs answerable to their customers
([`PAIN_POINTS.md`](./PAIN_POINTS.md) Pain 4). AI assistance only creates value if
security teams can **trust** it. AuraSpear's AI is attributable, auditable, and
approval-gated — enforced as invariants ([`AGENTS.md`](../../AGENTS.md) §7,
[`rules/ai/`](../../rules/ai/)).

**Why ours is different (and grounded in the repo).**

- **Approval-required for destructive actions** — AI may analyze and suggest, but
  destructive security/infra actions are `approval-required` and create a
  **persisted `ApprovalRequest` before execution**; never executed without a
  persisted approval (`apps/api/CLAUDE.md` rule 97; [`AGENTS.md`](../../AGENTS.md)
  §7; [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md)).
- **Every AI action is categorized** — `analysis-only`, `suggested`,
  `approval-required`, or `auto-allowed`, and the UI visually distinguishes them
  via the `AiActionCategory` enum; pending approvals show a status badge
  (`apps/web/CLAUDE.md` rules 44 and 59).
- **Provenance on every output** — AI output carries provider / model / confidence,
  and the audit log records which provider/model was used; every trigger
  evaluation is logged with trigger type, result, agent_id, and tenant_id
  (`apps/web/CLAUDE.md` "AI Connector Strategy → Routing"; `apps/api/CLAUDE.md`
  rule 99).
- **Raw AI output is never rendered as HTML** — markdown or plain text only, and
  inter-agent JSON is transformed to human-readable before rendering
  (`apps/web/CLAUDE.md` rules 43 and 58; [`AGENTS.md`](../../AGENTS.md) §7;
  [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md)). This closes
  an injection surface that ungoverned AI surfaces leave open.
- **Provider-agnostic AI cascade, no vendor lock-in** — routing tries all
  configured connectors in order (AWS Bedrock → OpenAI-compatible LLM APIs →
  OpenClaw Gateway) and falls back to a clearly-labeled `rule-based` response only
  when none are available; no env-gated mock providers in production
  (`apps/api/CLAUDE.md` rules 88 and 89; `apps/web/CLAUDE.md` "AI Connector
  Strategy"). A buyer is not betting their SOC on one model vendor's roadmap or
  pricing.
- **Privacy and cost governance** — AI memory is tenant-scoped and must not store
  secrets; PII/secrets are redacted before model calls (`@auraspear/ai`
  `redact()`); AI transcripts are never stored in `localStorage`; per-agent token
  quotas are checked before each provider call (`apps/web/CLAUDE.md` rule 46;
  `apps/api/CLAUDE.md` rule 98; [`AGENTS.md`](../../AGENTS.md) §7).

**Honest maturity.** The governance invariants above are **enforced today**.
Further hardening — wiring the golden-dataset eval gate into CI, per-tenant AI
opt-in/out, and a per-tenant model/provider router UI — is
[`docs/ROADMAP.md`](../ROADMAP.md) Phase 4
([`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) Goal 4). "Trustworthy
AI" is a posture the platform enforces now, with the formal evaluation gate
arriving as roadmap work.

---

## How the differentiators map to buyer segments

The four differentiators land differently per segment
([`docs/business/TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md)):

| Segment                         | Differentiator that wins the deal                                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **MSSPs / MDR providers**       | Multi-tenant MSSP by architecture (3) + auditable AI (4) — isolation and an evidence trail per customer                 |
| **In-house SOC teams**          | Unified SOC workflow (2) + AI-first triage (1) — lower MTTR without tab-hopping                                         |
| **Incident response teams**     | Unified workflow (2) + approval-gated AI (4) — coherent, tenant-safe investigations with a control point on containment |
| **Compliance / GRC teams**      | Auditable, approval-gated AI (4) + RBAC (3) — a defensible "how is AI controlled?" answer                               |
| **Cloud security teams**        | Unified workflow (2) — cloud findings triaged inside one governed SOC, not a silo                                       |
| **Security-conscious startups** | Unified workflow (2) + provider-agnostic AI (1/4) — enterprise SOC capability on a startup's headcount                  |

## Where AuraSpear deliberately does _not_ compete (honest counter-positioning)

Knowing the boundaries keeps the positioning credible and avoids over-promising:

- **Not a managed multi-region SaaS.** The shipped operational model is
  self-hosted Docker (`infra/docker`); there is no managed cloud offering in-repo
  ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)). Do not position against
  managed-SOC SaaS on "we host it for you."
- **Not a no-config-needed AI guarantee.** AI quality is **deployment-dependent**
  on configured, healthy connectors; with none configured the platform degrades to
  a clearly-labeled `rule-based` response (`apps/api/CLAUDE.md` rule 88). Position
  "provider-agnostic and governed," not "best-in-class model out of the box."
- **Not a marketplace today.** A third-party connector/playbook/detection
  marketplace is **planned, not shipped** — foundations are laid, but there is no
  marketplace product surface in the repo
  ([`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) Goal 5;
  [`docs/ROADMAP.md`](../ROADMAP.md) Phase 5).
- **Not a benchmark-claims product.** This doc makes no MTTR-percentage or
  named-vendor superiority claims it cannot substantiate in code; success signals
  are the measurable proxies below.

## Proof points and success signals

What turns the positioning from claim into evidence (track per deployment;
mirrors [`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md) and
[`PAIN_POINTS.md`](./PAIN_POINTS.md)):

- **AI-first (1):** alerts-per-analyst after AI triage, AI-finding apply/dismiss
  rates (`PATCH /ai/findings/:id/status`), share of investigations using AI.
- **Unified workflow (2):** active connectors per tenant, share of investigations
  completed without leaving the workspace, OSINT enrichment hit rate.
- **Multi-tenant MSSP (3):** tenants served per MSSP deployment, **zero**
  cross-tenant access incidents, audit-log completeness for mutations.
- **Auditable AI (4):** approval-gated action coverage (no destructive AI action
  without a persisted approval), provenance completeness in the audit log,
  redaction coverage, eval-gate pass rate once wired into CI (Phase 4).

## Guardrails (do not trade them away to "win" a competitive claim)

No positioning angle on this page justifies violating the platform invariants
([`AGENTS.md`](../../AGENTS.md) §6–8). When a competitive narrative and an
invariant appear to conflict, the invariant wins:

- **Tenant isolation, RBAC, and auth** are never bypassed — not for speed, not for
  demos, not in dev.
- **AI destructive actions stay approval-gated**, with a persisted
  `ApprovalRequest`; **raw AI output is never rendered as HTML**.
- **No committed secrets**; connector credentials stay AES-256-GCM encrypted.
- **No `any`**; **`pnpm` only, Node 22**; never claim a validation gate is green
  without running it (`pnpm typecheck` / `pnpm build` are the hard gates —
  [`AGENTS.md`](../../AGENTS.md) §4–5).

## Where to go next

- One-page positioning: [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)
- The goals behind these differentiators:
  [`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md)
- The pains they answer: [`docs/business/PAIN_POINTS.md`](./PAIN_POINTS.md)
- Who buys which differentiator:
  [`docs/business/TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md) ·
  [`docs/business/PERSONAS.md`](./PERSONAS.md)
- What the platform actually ships:
  [`docs/business/MODULE_CATALOG.md`](./MODULE_CATALOG.md) ·
  [`docs/business/USER_JOURNEYS.md`](./USER_JOURNEYS.md)
- Stable business truths: [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)
- Working context: [`context/BUSINESS_CONTEXT.md`](../../context/BUSINESS_CONTEXT.md) ·
  [`context/PRODUCT_CONTEXT.md`](../../context/PRODUCT_CONTEXT.md)
- Sequencing & maturity: [`docs/ROADMAP.md`](../ROADMAP.md)
- Deep product / AI / security: [`docs/PRODUCT.md`](../PRODUCT.md) ·
  [`docs/AI.md`](../AI.md) · [`docs/SECURITY.md`](../SECURITY.md)
- Hard rules: [`rules/`](../../rules/) (esp. [`rules/ai/`](../../rules/ai/),
  [`rules/security/`](../../rules/security/)) · Recipes: [`skills/`](../../skills/) ·
  Docs index: [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)

---

_Sources: [`AGENTS.md`](../../AGENTS.md), `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`,
[`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md),
[`docs/business/BUSINESS_GOALS.md`](./BUSINESS_GOALS.md),
[`docs/business/PAIN_POINTS.md`](./PAIN_POINTS.md),
[`docs/business/TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md),
[`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md),
[`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md), and
[`docs/ROADMAP.md`](../ROADMAP.md), plus the `apps/api/src/modules/*`,
`apps/api/src/common/enums/*`, and `apps/web/src/app/(portal)/*` surfaces they
cite. This is a business summary; the depth and maturity of individual surfaces
are best confirmed per-release against the code._
