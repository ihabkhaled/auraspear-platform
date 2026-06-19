# AuraSpear — Target Customers

> **AI agents and contributors: read [`AGENTS.md`](../../AGENTS.md) first.** It is
> the single entry point and defines the read-before-edit loading order, the
> security/AI invariants, and the command map. This document is a **business
> summary**, not a source of truth. The one-page positioning is
> [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md); the deep product
> reference is [`docs/PRODUCT.md`](../PRODUCT.md); stable business truths live in
> [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md).

## Scope of this document

Who AuraSpear is sold to, and **why each segment needs it**. Every claim here is
grounded in what the repo actually ships — backend modules under
`apps/api/src/modules/`, portal surfaces under `apps/web/src/app/(portal)/`, the
role hierarchy in
`apps/api/src/modules/role-settings/constants/default-permissions.ts`, and the
security/AI invariants in [`AGENTS.md`](../../AGENTS.md) §6–§7. This file does not
restate framework names or maturity levels it cannot verify in code; for the
authoritative capability list, follow the source pointers in
[`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md).

## The shared problem (why anyone buys this)

SOC tooling is fragmented and analysts drown in alerts (see
[`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)). AuraSpear is an
**AI-first SOC platform** that unifies the whole workflow — alerts → cases →
incidents → reports, plus hunts, intel/IOC enrichment, correlation, detection
rules, normalization, SOAR, cloud security, compliance, vulnerabilities, attack
paths, and UEBA — into one **multi-tenant, RBAC-governed** workspace, with AI
woven into investigation rather than bolted on as a chatbot
([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)). The core promise is
**lower MTTR and less alert fatigue without stitching together many point
tools**.

What makes that promise credible — and what every segment below is implicitly
buying — are the platform invariants ([`AGENTS.md`](../../AGENTS.md) §6–§7,
[`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md),
[`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md)):

- **Tenant isolation** — every tenant-owned query/`update`/`delete` is scoped by
  `tenantId`; no cross-tenant data, ever.
- **RBAC** — every endpoint carries `@RequirePermission(...)`; permissions are
  dynamic and stored per tenant.
- **Auditable, approval-gated AI** — AI may analyze and suggest, but destructive
  actions are `approval-required` and create a persisted `ApprovalRequest` before
  execution; AI output carries provenance and **raw AI output is never rendered as
  HTML**.

## Target segments at a glance

| Segment                          | Primary buyer                          | Core need AuraSpear meets                                                          |
| -------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------- |
| **In-house SOC teams**           | SOC manager / Head of SecOps           | End-to-end alert→case→incident→report flow with tiered analyst RBAC and AI triage  |
| **MSSPs / MDR providers**        | Service delivery / platform lead       | One governed pane of glass across many customer tenants                            |
| **Incident response (IR) teams** | IR lead / incident commander           | Cases with tasks, artifacts, notes, linked alerts, timelines, and AI investigation |
| **Compliance / GRC teams**       | Compliance officer / GRC lead          | Control-status visibility and full mutation audit logging                          |
| **Cloud security teams**         | Cloud security engineer                | Multi-cloud accounts and findings with AI cloud-triage                             |
| **Security-conscious startups**  | Founding security engineer / lean team | Stand up a working SOC fast via connectors + provider-agnostic AI                  |

Roles map to the backend `UserRole` hierarchy (most → least privileged):
`GLOBAL_ADMIN`, `PLATFORM_OPERATOR`, `TENANT_ADMIN`, `SOC_ANALYST_L2`,
`THREAT_HUNTER`, `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`
(`apps/api/src/modules/role-settings/constants/default-permissions.ts`).

---

## 1. In-house SOC teams

**Who they are.** Internal security operations teams running tiered analyst
shifts (L1 triage, L2 investigation), a SOC manager, and often an executive who
needs read-only oversight.

**Why they need AuraSpear.**

- **The whole SOC lifecycle in one workspace.** Alerts, cases, incidents, and
  reporting are first-class modules (`apps/api/src/modules/alerts`, `/cases`,
  `/incidents`, `/reports`), so analysts stop pivoting between disconnected tools.
- **AI triage at the point of work, not a side chatbot.** AI assists during alert
  triage, IOC enrichment, case timelines, and correlation synthesis. The AI
  subsystem (`apps/api/src/modules/ai`, `/ai-agents`, `/correlation`) and the
  portal surfaces (`apps/web/src/app/(portal)/ai-findings`, `/ai-chat`) are
  already shipped — see [`docs/AI.md`](../AI.md).
- **Tiered RBAC matches how SOCs actually run.** The role hierarchy maps directly
  to L1/L2 analysts, threat hunters, and read-only executives
  (`SOC_ANALYST_L1`, `SOC_ANALYST_L2`, `THREAT_HUNTER`, `EXECUTIVE_READONLY`),
  enforced by `@RequirePermission(...)` on every endpoint.
- **Trustworthy automation.** Every mutation is audit-logged
  (`apps/api/src/modules/audit-logs`) and destructive AI actions are
  approval-gated, so managers can adopt AI without losing accountability.

**What they buy:** lower MTTR and reduced alert fatigue with a defensible audit
trail.

## 2. MSSPs / MDR providers

**Who they are.** Managed security service / managed detection-and-response
providers operating SOCs on behalf of many customers at once.

**Why they need AuraSpear.**

- **Multi-tenancy is the architecture, not an add-on.** Tenant isolation is an
  enforced invariant — every query is `tenantId`-scoped
  ([`AGENTS.md`](../../AGENTS.md) §6) — so one customer can never see another's
  data. This is the central reason MSSPs are a core segment
  ([`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)).
- **One pane of glass across customer environments.** `GLOBAL_ADMIN` /
  `PLATFORM_OPERATOR` switch tenant context via the `X-Tenant-Id` header without
  re-authenticating, while non-privileged users cannot switch tenants at all
  (`apps/api/src/common/interfaces/authenticated-request.interface.ts`,
  `apps/api/CLAUDE.md` Key Principles §8).
- **Connector-driven onboarding per tenant.** New customer environments are
  integrated through connectors and OSINT sources rather than bespoke code
  (`apps/api/src/modules/connectors`, `/connector-workspaces`,
  `/connector-sync`), with connector secrets AES-256-GCM encrypted at rest and
  SSRF-validated URLs.
- **Provider-agnostic AI keeps margins flexible.** The AI cascade (Bedrock →
  OpenAI-compatible LLM APIs → OpenClaw Gateway, with a labeled rule-based
  fallback) avoids single-vendor lock-in across a multi-customer fleet
  ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **Protected platform accounts.** Seeded admin accounts are `isProtected` and
  cannot be deleted, blocked, or downgraded, protecting the service operator's
  own access.

**What they buy:** the ability to scale a SOC across many tenants from one
governed console.

## 3. Incident response (IR) teams

**Who they are.** Internal or consulting IR teams and incident commanders running
investigations during and after security incidents.

**Why they need AuraSpear.**

- **Case management built for investigations.** Cases carry tasks, artifacts,
  notes, linked alerts, and timelines (`apps/api/src/modules/cases`,
  `/case-cycles`, `/incidents`), so an investigation stays coherent from first
  alert to closure.
- **AI investigation assistance with tenant-safe boundaries.** AI investigation
  validates alert tenant ownership before it runs — cross-tenant alert
  investigation is explicitly disallowed (`apps/api/CLAUDE.md` ABSOLUTE RULES
  §48), so IR work never leaks across tenants.
- **Linked evidence is integrity-checked.** Alerts linked to a case must belong
  to the same tenant, and sub-resources validate parent ownership before access
  (`apps/api/CLAUDE.md` §42, §75) — evidence chains stay clean.
- **Approval-gated containment.** Destructive/containment-style actions are
  `approval-required` and persisted as `ApprovalRequest` records before execution
  ([`AGENTS.md`](../../AGENTS.md) §7), giving incident commanders a control point.

**What they buy:** faster, better-organized investigations with an auditable
evidence trail and AI assistance they can trust.

## 4. Compliance / GRC teams

**Who they are.** Compliance officers and GRC leads who need to demonstrate
control status and produce evidence for audits.

**Why they need AuraSpear.**

- **Dedicated compliance surface.** A compliance module and portal route ship in
  the platform (`apps/api/src/modules/compliance`,
  `apps/web/src/app/(portal)/compliance`) for control-status tracking; the
  specific frameworks are summarized in
  [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md) — confirm the current
  framework set per release against the module.
- **Full audit logging by construction.** Every mutation is automatically
  audit-logged via the audit interceptor (`apps/api/src/modules/audit-logs`,
  `apps/api/CLAUDE.md` Key Principles §6), and credentials/passwords are redacted
  from logs (`apps/api/CLAUDE.md` §57, §66) — the evidence an auditor needs
  exists without bolt-on tooling.
- **Defensible AI governance.** AI actions are categorized
  (`analysis-only`, `suggested`, `approval-required`, `auto-allowed`), carry
  provenance, and AI memory is tenant-scoped and must not store secrets
  ([`AGENTS.md`](../../AGENTS.md) §7) — a clear story for "how is AI controlled?"
- **Least-privilege is enforced, not aspirational.** Dynamic per-tenant RBAC with
  `@RequirePermission(...)` on every endpoint provides demonstrable access
  control.

**What they buy:** control-status visibility plus an audit-ready trail of who did
what, including AI.

## 5. Cloud security teams

**Who they are.** Teams responsible for security posture across one or more public
clouds.

**Why they need AuraSpear.**

- **Multi-cloud accounts and findings in the SOC workflow.** A cloud-security
  module and portal route ship in the platform
  (`apps/api/src/modules/cloud-security`,
  `apps/web/src/app/(portal)/cloud-security`); the supported cloud set is
  summarized in [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md) — verify
  per release against the module.
- **Cloud findings flow into the same investigation lifecycle.** Findings can
  become alerts/cases handled by the same analysts and the same AI triage, rather
  than living in a separate cloud-only console.
- **AI cloud-triage with the same guardrails.** Cloud triage runs through the same
  provider-agnostic AI cascade and the same approval/provenance rules as the rest
  of the platform — no second, ungoverned AI path.
- **Attack-path and vulnerability context.** Related modules
  (`apps/api/src/modules/attack-paths`, `/vulnerabilities`, `/entities`) let cloud
  findings be reasoned about in the context of exposure and reachability.

**What they buy:** cloud posture findings triaged inside one governed SOC, not a
disconnected silo.

## 6. Security-conscious startups

**Who they are.** Lean security teams — often a single founding security engineer
— who need real SOC capability without a platform-engineering budget.

**Why they need AuraSpear.**

- **A working SOC without building integrations from scratch.** The
  connector-driven architecture (`apps/api/src/modules/connectors`) plus built-in
  OSINT enrichment sources let a small team stand up detection, enrichment, and
  response quickly ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)).
- **Provider-agnostic AI with graceful degradation.** The AI cascade falls back to
  a clearly-labeled `rule-based` response when no AI connector is configured, so
  the platform is usable on day one and gets smarter as connectors are added —
  AI quality is deployment-dependent on which connectors are healthy.
- **Self-hostable from one repo.** The Dockerized web + api + Postgres + Redis
  stack (`infra/docker`) means a small team can run the whole platform without a
  managed-SaaS dependency
  ([`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md),
  [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md)).
- **Security defaults that scale with them.** Tenant isolation, RBAC, encrypted
  connector secrets, JWT rotation with a Redis-backed blacklist, and SSRF
  validation are built in — a startup inherits enterprise-grade guardrails
  without building them.

**What they buy:** enterprise SOC capability and governance on a startup's
headcount and timeline.

---

## How segments map to the product

- **Multi-tenancy** is what makes MSSPs and multi-business orgs viable; it is an
  enforced invariant, not a feature flag ([`AGENTS.md`](../../AGENTS.md) §6).
- **The unified module set** (alerts/cases/incidents/reports + hunts, intel,
  correlation, detection, normalization, SOAR, cloud-security, compliance,
  vulnerabilities, attack-paths, UEBA under `apps/api/src/modules/`) is what lets
  one platform serve SOC, IR, compliance, and cloud-security buyers at once.
- **The AI subsystem with governance** (`apps/api/src/modules/ai`,
  `apps/web/src/app/(portal)/ai-*`) is the differentiator across every segment:
  attributable, auditable, approval-gated AI woven into investigation.

## Where to go next

- One-page positioning: [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md)
- Onboarding entry point: [`AGENTS.md`](../../AGENTS.md)
- Stable business truths: [`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md)
- Deep product reference: [`docs/PRODUCT.md`](../PRODUCT.md) · AI:
  [`docs/AI.md`](../AI.md) · Security: [`docs/SECURITY.md`](../SECURITY.md)
- Hard rules: [`rules/`](../../rules/) · Recipes: [`skills/`](../../skills/) ·
  Stable memory: [`memory/`](../../memory/) · Working context:
  [`context/`](../../context/) · Docs index: [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)

---

_Sources: [`docs/business/PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md),
[`AGENTS.md`](../../AGENTS.md), `apps/api/CLAUDE.md`, `apps/web/CLAUDE.md`,
[`memory/BUSINESS_MEMORY.md`](../../memory/BUSINESS_MEMORY.md), and the
`apps/api/src/modules/*` and `apps/web/src/app/(portal)/*` surfaces they cite.
This is a business summary; the depth and maturity of individual surfaces are best
confirmed per-release against the code._
