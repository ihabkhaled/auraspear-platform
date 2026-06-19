# AuraSpear — Product Overview

> AuraSpear is an **AI-first SOC platform** that unifies SIEM alerts, cases,
> incidents, threat hunting, threat-intelligence enrichment, SOAR automation,
> detection engineering, cloud security, and compliance into a single
> multi-tenant, RBAC-governed workspace — with AI reasoning woven through the
> investigation lifecycle rather than bolted on as a chatbot.

This document describes _what_ AuraSpear is, _who_ it serves, and the _workflows_
it supports. It is grounded in the actual codebase: backend modules under
`apps/api/src/modules`, frontend routes under `apps/web/src/app`, the role and
domain enums under `apps/api/src/common/enums`, and both app `CLAUDE.md` files
plus the root `README.md`.

---

## 1. What AuraSpear Is

AuraSpear is an end-to-end **SOC / SIEM / SOAR / threat-intelligence** platform
delivered as a **Backend-for-Frontend (BFF)** architecture:

- **`apps/web`** (`@auraspear/web`) — Next.js 16 / React 19 / Tailwind 4 SOC
  console. It never talks to security tools directly; it proxies all calls
  through `src/app/api/*` routes to the backend.
- **`apps/api`** (`@auraspear/api`) — NestJS 11 / Prisma 7 / PostgreSQL / Redis
  BFF. It is the single integration point for every downstream security tool,
  AI provider, and the database.

The product brings the full SOC workflow — from login and alert triage through
hunting, intel enrichment, case/incident management, SOAR response, and
reporting — into one place, and adds an AI layer (assisted investigation,
chat with memory, a searchable findings workspace, and autonomous agents) on
top of it.

### Functional surface (grounded in shipped modules)

The backend ships these domain modules (`apps/api/src/modules`), each with a
matching set of frontend routes (`apps/web/src/app/(portal)`):

| Domain                    | Backend module(s)                                            | What it does                                                        |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------- |
| **Alerts (SIEM)**         | `alerts`                                                     | Wazuh/OpenSearch-sourced alert search, triage, investigation, close |
| **Cases**                 | `cases`, `case-cycles`                                       | Case CRUD, notes, tasks, artifacts, linked alerts, case cycles      |
| **Incidents**             | `incidents`                                                  | Incident records (severity, category, actor type, status)           |
| **Threat hunting**        | `hunts`                                                      | Hunt runs against log backends with a run state machine             |
| **Threat intel**          | `intel`                                                      | MISP events/IOCs, IOC matching and enrichment                       |
| **Correlation**           | `correlation`                                                | Correlation rules (Sigma drafting, hit counting)                    |
| **Detection engineering** | `detection-rules`, `normalization`                           | Detection rules, normalization pipelines                            |
| **SOAR**                  | `soar`                                                       | Playbooks, executions, triggers (Shuffle integration)               |
| **Connectors**            | `connectors`, `connector-sync`, `connector-workspaces`       | Manage and sync security-tool integrations                          |
| **Cloud security**        | `cloud-security`                                             | Cloud accounts + findings across AWS, Azure, GCP, OCI               |
| **Compliance**            | `compliance`                                                 | Control status across ISO 27001, NIST, PCI-DSS, SOC2, HIPAA, GDPR   |
| **Vulnerabilities**       | `vulnerabilities`                                            | Vulnerability + patch-status tracking                               |
| **Attack paths**          | `attack-paths`                                               | Attack-path modeling and summaries                                  |
| **UEBA**                  | `ueba`                                                       | User/entity behavior analytics + risk levels                        |
| **Entities**              | `entities`                                                   | Entity graph + relationships                                        |
| **Data exploration**      | `data-explorer`                                              | Ad-hoc querying across data sources                                 |
| **Knowledge**             | `knowledge`                                                  | Knowledge base (RAG-backed)                                         |
| **Reports**               | `reports`                                                    | AI-assisted report generation (PDF/Markdown)                        |
| **Dashboards**            | `dashboards`                                                 | Query-driven analytics/operations overviews                         |
| **Jobs**                  | `jobs`                                                       | Async job system (sync, detection, correlation, hunts, AI, reports) |
| **AI**                    | `ai`, `ai-agents`, `agent-config`, `osint-executor`          | AI investigation, agents, OSINT enrichment, findings                |
| **Notifications**         | `notifications`                                              | In-app + WebSocket notifications                                    |
| **Admin / governance**    | `tenants`, `users`, `users-control`, `role-settings`, `auth` | Multi-tenant admin, RBAC, sessions, OIDC auth                       |
| **Observability**         | `health`, `system-health`, `app-logs`, `audit-logs`          | Health checks, system status, structured app/audit logs             |

The web console additionally exposes a dedicated AI workspace surface:
`ai-chat`, `ai-findings`, `ai-search`, `ai-agents`, `ai-agent-graph`,
`ai-config`, `ai-memory`, `ai-history`, `ai-transcripts`, `ai-handoffs`,
`ai-ops`, `ai-finops`, `ai-eval`, `ai-rag`, and `ai-simulations`
(`apps/web/src/app/(portal)`).

---

## 2. Target Customers

| Segment                            | Why AuraSpear fits                                                                                                                                                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MSSPs / MDR providers**          | Multi-tenant by design — every query is `tenantId`-scoped; `GLOBAL_ADMIN`/`PLATFORM_OPERATOR` can switch tenant context via the `X-Tenant-Id` header and `TenantSwitcher`. One pane of glass across many customer environments. |
| **In-house SOC teams**             | Full alert → case → incident → report workflow with tiered analyst roles (L1/L2) and RBAC.                                                                                                                                      |
| **Incident response (IR) teams**   | Cases with tasks, artifacts, notes, linked alerts, timelines, and AI case-timeline/investigation assistance.                                                                                                                    |
| **Compliance / GRC teams**         | `compliance` module tracks control status across ISO 27001, NIST, PCI-DSS, SOC2, HIPAA, and GDPR; full audit logging of mutations.                                                                                              |
| **Cloud security teams**           | `cloud-security` module manages cloud accounts and findings across AWS, Azure, GCP, and OCI.                                                                                                                                    |
| **Security startups / lean teams** | Connector-driven architecture and a provider-cascade AI layer let a small team stand up a SOC without building integrations from scratch.                                                                                       |

---

## 3. Value Proposition

1. **AI woven into the workflow, not bolted on.** AI assists at the point of
   work — alert triage, IOC enrichment, case timelines, correlation synthesis,
   Sigma drafting, vuln prioritization, attack-path summaries, reporting — via
   dedicated agents rather than a single generic chatbot.
2. **One multi-tenant workspace for the whole SOC.** Alerts, cases, incidents,
   hunts, intel, detection, SOAR, cloud, compliance, and vulnerabilities live
   under one RBAC- and tenant-governed roof.
3. **Provider-agnostic AI.** AI routing tries all configured connectors in order
   (AWS Bedrock → OpenAI-compatible LLM APIs → OpenClaw Gateway) and falls back
   to a clearly-labeled `rule-based` response only when none are available.
   Customers are never locked to a single AI vendor.
4. **Safety and governance first.** Approval-required AI actions create an
   `ApprovalRequest` before execution; per-agent token quotas/budgets are
   enforced; every AI action is categorized (`analysis-only`, `suggested`,
   `approval-required`, `auto-allowed`); all mutations are audit-logged.
5. **Security-hardened by construction.** Strict tenant isolation on every
   query, `@RequirePermission` RBAC, AES-256-GCM encryption of connector
   secrets, SSRF validation of all user-supplied URLs, JWT rotation with a
   Redis-backed blacklist, Helmet, strict CORS, and rate limiting.
6. **Connector-driven, BFF architecture.** The frontend never touches Wazuh,
   OpenSearch, MISP, or Shuffle directly — the BFF centralizes integration,
   normalization, and policy enforcement.

---

## 4. Differentiators

- **A fleet of purpose-built AI agents**, not one assistant. The `AiAgentId`
  enum defines 20+ agents including an **`orchestrator`**, `alert-triage`,
  `case-creation`, `incident-escalation`, `correlation-synthesis`,
  `sigma-drafting`, `vuln-prioritization`, `ueba-narrative`,
  `attack-path-summary`, `norm-verification`, `rules-hygiene`, `reporting`,
  `entity-linking`, `job-health`, `cloud-triage`, `soar-drafting`,
  `threat-intel-synthesis`, `ioc-enrichment`, `misp-feed-review`,
  `knowledge-base`, `notification-digest`, `provider-health`, and
  `approval-advisor`.
- **Orchestrated, governed automation.** Agent dispatch flows through an
  `OrchestratorService` that validates agent-enabled status, automation mode,
  budget/quota, provider availability, and approval requirements before
  enqueuing a job. AI event listeners are fire-and-forget so AI never blocks
  core SOC operations.
- **Cross-chat AI memory.** Persistent `UserMemory` (facts / preferences /
  instructions / context) is extracted asynchronously after chats, stored with
  embeddings, retrieved by cosine similarity, and injected into the system
  prompt for personalized assistance — with full user control (view/search/
  edit/delete) under `AI_MEMORY_VIEW` / `AI_MEMORY_EDIT` permissions.
- **A searchable AI findings workspace.** `/ai-findings` is a central,
  full-text-searchable (PostgreSQL `tsvector`, weighted ranking) workspace for
  all AI-generated findings, with filters, sorting, KPI cards, a detail drawer,
  and Apply/Dismiss actions.
- **Built-in OSINT enrichment.** The `osint-executor` module ships built-in
  source integrations (VirusTotal, Shodan, AbuseIPDB, GreyNoise, URLScan,
  Censys, ThreatFox, Pulsedive) plus custom sources — with SSRF-validated URLs
  and encrypted-at-rest API keys.
- **AI FinOps & evaluation surfaces.** Dedicated `ai-finops`, `ai-eval`,
  `ai-ops`, and `ai-simulations` routes track AI cost/usage, evaluate output
  quality, and simulate agent behavior — governance most "AI SOC" tools lack.
- **MSSP-grade multi-tenancy** with seeded, protected (`isProtected`) admin
  accounts that cannot be deleted, blocked, or have their role changed.

---

## 5. Personas

Roles are defined by the backend `UserRole` hierarchy (most → least privileged):
`GLOBAL_ADMIN`, `PLATFORM_OPERATOR`, `TENANT_ADMIN`, `SOC_ANALYST_L2`,
`THREAT_HUNTER`, `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`
(`apps/api/src/modules/role-settings/constants/default-permissions.ts`).
The personas below map product roles to those backend roles.

| Persona                                   | Maps to role                          | Primary jobs in AuraSpear                                                                                                                                                        |
| ----------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Global / Platform admin**               | `GLOBAL_ADMIN`, `PLATFORM_OPERATOR`   | Manage tenants, switch tenant context, platform-wide config, provider/connector health, system observability. `GLOBAL_ADMIN` bypasses all permission checks.                     |
| **Tenant admin**                          | `TENANT_ADMIN`                        | Manage users/roles within a tenant, configure connectors (security infrastructure), define permissions, oversee the tenant's SOC. Connector create/update/toggle is admin-gated. |
| **SOC manager**                           | `TENANT_ADMIN` (+ dashboards/reports) | Oversee queues, dashboards, operations/analytics overviews, reporting, and team performance.                                                                                     |
| **Tier-1 analyst**                        | `SOC_ANALYST_L1`                      | Front-line alert triage, initial enrichment, case creation, notifications. AI alert-triage assistance.                                                                           |
| **Tier-2 analyst**                        | `SOC_ANALYST_L2`                      | Deeper investigation, case ownership, incident handling, SOAR execution.                                                                                                         |
| **Threat hunter**                         | `THREAT_HUNTER`                       | Proactive hunting via the `hunts` module, data exploration, intel correlation, entity/attack-path analysis.                                                                      |
| **Detection engineer**                    | `TENANT_ADMIN` / `SOC_ANALYST_L2`     | Author detection & correlation rules, normalization pipelines, Sigma drafting, rules hygiene.                                                                                    |
| **Incident commander**                    | `TENANT_ADMIN` / `SOC_ANALYST_L2`     | Drive incident escalation, coordinate cases/tasks, manage timelines, and AI incident-escalation summaries.                                                                       |
| **Compliance officer**                    | `TENANT_ADMIN` / `EXECUTIVE_READONLY` | Track compliance control status (ISO 27001, NIST, PCI-DSS, SOC2, HIPAA, GDPR), review audit logs, consume reports.                                                               |
| **Cloud security engineer**               | `TENANT_ADMIN` / `SOC_ANALYST_L2`     | Onboard cloud accounts (AWS/Azure/GCP/OCI), triage cloud findings, run AI cloud-triage.                                                                                          |
| **Platform / detection-content engineer** | `PLATFORM_OPERATOR` / `TENANT_ADMIN`  | Connector workspaces, job health, normalization verification, provider configuration.                                                                                            |
| **Executive / read-only stakeholder**     | `EXECUTIVE_READONLY`                  | Read-only dashboards, KPIs, and reports for situational awareness.                                                                                                               |

> Note: persona-to-role mappings reflect how the role hierarchy and
> default-permission sets are structured; granular access is governed by the
> dynamic, database-backed permission system rather than role alone.

---

## 6. Main Workflows

### Alert triage → investigation → case (SIEM core)

1. Analyst lands on **`/alerts`** (Wazuh/OpenSearch-backed). Search/filter/sort
   is backend-driven and paginated.
2. AI **alert-triage** agent assists with severity assessment and context.
3. Analyst opens an alert, runs **AI investigation** (tenant-ownership
   validated before any cross-alert access), enriches IOCs via **OSINT**.
4. Promote to a **case** (`/cases`): add notes, tasks, artifacts, link alerts
   (all tenant-scoped), build a timeline. AI generates case timelines.
5. Escalate to an **incident** (`/incidents`) when warranted; AI
   **incident-escalation** summarizes.

### Threat hunting

- Hunters use **`/hunt`** to run hunts against log backends. Hunt runs follow a
  strict state machine (`running → completed` or `running → error`).
- **`/explorer`** (data-explorer) supports ad-hoc querying; **`/entities`** and
  **`/attack-paths`** support pivoting and attack-path summaries.

### Threat intelligence & enrichment

- **`/intel`** surfaces MISP events/IOCs and IOC matching.
- AI **threat-intel-synthesis**, **ioc-enrichment**, and **misp-feed-review**
  agents enrich and summarize, drawing on built-in OSINT sources.

### Detection engineering

- **`/detection-rules`**, **`/correlation`**, and **`/normalization`** let
  engineers author and tune rules and pipelines. AI assists with
  **sigma-drafting**, **correlation-synthesis**, **rules-hygiene**, and
  **norm-verification**.

### SOAR / response automation

- **`/soar`** manages playbooks, executions, and triggers (Shuffle connector).
  AI **soar-drafting** assists with playbook authoring.

### Cloud security & compliance

- **`/cloud-security`**: onboard AWS/Azure/GCP/OCI accounts, triage findings
  (AI **cloud-triage**).
- **`/compliance`**: track control status across the six supported standards;
  **`/vulnerabilities`** tracks vuln/patch status with AI
  **vuln-prioritization**.

### AI-native workflows

- **`/ai-chat`** — LLM conversations with cross-chat memory injection and a
  connector cascade.
- **`/ai-findings`** — searchable workspace of all AI-generated findings with
  Apply/Dismiss.
- **`/ai-agents`**, **`/ai-config`**, **`/ai-agent-graph`** — configure agents,
  trigger modes, and view the agent/handoff graph.
- **Approvals** — approval-required agent actions create an `ApprovalRequest`
  before execution; the **`approval-advisor`** agent assists reviewers.
- **Governance** — `ai-finops` (cost/usage), `ai-eval` (quality), `ai-ops`,
  `ai-simulations`, `ai-history`, `ai-transcripts`, `ai-handoffs`.

### Reporting & dashboards

- **`/reports`** generates AI-assisted reports (PDF/Markdown) via the
  `REPORT_GENERATION` job. **`/dashboard`** and admin overviews are
  query-driven analytics/operations views.

### Platform administration

- **`/admin`** — tenant and user management (soft-delete/restore, block/unblock,
  protected users), **`role-settings`** for dynamic permissions, session
  management, and OIDC-based auth (Microsoft Entra ID).
- **`/system-health`**, **`/jobs`**, app/audit logs for operations.

### Async job execution (cross-cutting)

Long-running work runs through the `jobs` system with registered handlers for
`CONNECTOR_SYNC`, `DETECTION_RULE_EXECUTION`, `CORRELATION_RULE_EXECUTION`,
`NORMALIZATION_PIPELINE`, `SOAR_PLAYBOOK`, `HUNT_EXECUTION`, `AI_AGENT_TASK`,
and `REPORT_GENERATION`. Stale RUNNING jobs auto-recover; Redis connection
state is tracked so jobs never silently sit PENDING.

---

## 7. Product Gaps & Notes

These reflect what the code and contributor docs indicate is incomplete,
scaffolded, or constrained — stated conservatively.

- **Shared packages are scaffolded.** `packages/shared` (`@auraspear/shared`)
  and `packages/config` (`@auraspear/config`) are described in `README.md` as
  scaffolded, so cross-app contracts are not yet fully centralized. (The task
  brief also references `packages/ai`, but the README lists only `shared` and
  `config`.)
- **AI quality depends on configured providers.** Without a configured Bedrock /
  LLM API / OpenClaw connector, AI features fall back to clearly-labeled
  `rule-based` responses. The richness of triage, enrichment, and summaries is
  therefore deployment-dependent.
- **Provider/feature breadth implies operational complexity.** The platform
  spans many downstream tools (Wazuh, Graylog, Logstash, Velociraptor, Grafana,
  InfluxDB, MISP, Shuffle) and several AI providers; value is gated on those
  connectors being configured, healthy, and synced.
- **AI governance surfaces are extensive but evolving.** Many AI routes
  (`ai-eval`, `ai-finops`, `ai-simulations`, `ai-rag`, `ai-handoffs`) exist as
  dedicated pages; depth of each is best confirmed per-release. This document
  does not assert maturity levels for them.
- **Self-hosted operational model.** The product is delivered as a Dockerized
  web + api + Postgres + Redis stack (`infra/docker`, `docker-compose.yml`);
  there is no indication of a managed multi-region SaaS offering in-repo.
- **Mock data in development.** The web app uses MSW mock handlers in
  development (`src/mocks`), so some flows may behave against mocks rather than
  the live BFF until connectors are wired.

---

## 8. At-a-Glance Summary

| Aspect                | Summary                                                                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Category**          | AI-first SOC / SIEM / SOAR / threat-intelligence platform                                                                          |
| **Architecture**      | Multi-tenant BFF — Next.js 16 web + NestJS 11 API + Postgres + Redis                                                               |
| **Primary buyers**    | MSSPs, in-house SOC teams, IR, compliance/GRC, cloud security, lean security startups                                              |
| **Core promise**      | Whole SOC workflow in one governed workspace, with AI woven into investigation                                                     |
| **Standout features** | 20+ purpose-built AI agents + orchestrator, cross-chat memory, searchable AI findings, OSINT enrichment, AI FinOps/eval governance |
| **AI strategy**       | Provider cascade (Bedrock → LLM APIs → OpenClaw Gateway) with rule-based fallback                                                  |
| **Governance**        | Tenant isolation, dynamic RBAC, approval workflows, per-agent budgets, full audit logging                                          |

---

_Sources: `apps/api/src/modules/*`, `apps/web/src/app/(portal)/*`,
`apps/api/src/common/enums/*` (notably `ai-agent-config.enum.ts`,
`connector-type.enum.ts`, `compliance-standard.enum.ts`,
`cloud-provider.enum.ts`, `permission.enum.ts`),
`apps/api/src/modules/role-settings/constants/default-permissions.ts`,
`apps/web/CLAUDE.md`, `apps/api/CLAUDE.md`, and the root `README.md`._
