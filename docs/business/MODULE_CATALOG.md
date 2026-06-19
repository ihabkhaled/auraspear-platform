# AuraSpear — Module Catalog

> **AI agents and contributors: read [`AGENTS.md`](../../AGENTS.md) first.** It is
> the single entry point and defines the read-before-edit loading order, the
> security/AI invariants, and the command map. This catalog is a business-oriented
> map of what ships in the platform; the deep product reference is
> [`docs/PRODUCT.md`](../PRODUCT.md) and the one-page summary is
> [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md).

## How to read this catalog

This is a **derived inventory**: every module below is a real directory in the
codebase. Backend modules live under `apps/api/src/modules/`; frontend surfaces
live under `apps/web/src/app/(portal)/`. Where a module name differs between the
two apps, both are listed. The frontend never calls security tools directly — it
proxies every backend call through `apps/web/src/app/api/*` routes
(see [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md), rule 33).

This catalog is descriptive, not a maturity claim. Surface depth and "is it done"
are best confirmed per-release against the code and tests — **never claim a gate
green without running it** (see [`AGENTS.md`](../../AGENTS.md) §5 and
[`rules/testing/quality-gates.md`](../../rules/testing/)).

### Cross-cutting invariants (apply to every module)

These hold for all modules below and are not repeated per row. Sources:
[`AGENTS.md`](../../AGENTS.md) §6–7, [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md),
[`rules/security/`](../../rules/security/), [`rules/ai/`](../../rules/ai/).

- **Tenant isolation** — every tenant-owned query / `update` / `delete` is scoped
  by `tenantId`. No cross-tenant data, ever. Repository methods take `tenantId`.
- **RBAC** — every endpoint carries `@RequirePermission(Permission.MODULE_ACTION)`
  (`apps/api/src/common/enums/permission.enum.ts`). Permissions are dynamic and
  DB-stored; `GLOBAL_ADMIN` always passes. Never bypass.
- **AI safety** — AI may analyze and suggest; **destructive actions are
  `approval-required`** and persist an `ApprovalRequest` before execution. Raw AI
  output is **never rendered as HTML** (markdown / plain text only). AI memory is
  tenant-scoped and stores no secrets; PII/secrets are redacted before model calls.
- **Secrets** — connector credentials are AES-256-GCM encrypted at rest; URLs are
  SSRF-validated at input time; mutations are audit-logged with credentials redacted.

---

## 1. Detection & monitoring

### Alerts — `apps/api/src/modules/alerts` · `apps/web/src/app/(portal)/alerts`

SIEM alert management sourced through the Wazuh / OpenSearch connectors (the BFF
queries downstream; the web app never talks to Wazuh directly). Search, list,
investigate, and close alerts; severity is modeled by `AlertSeverity`
(`critical`/`high`/`medium`/`low`/`info`). Permissions group under `ALERTS_*`
(view / create / update / etc.). AI integration via `AI_ALERT_*` — see the
`alert-triage` agent. Per [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 48,
AI investigation must validate alert tenant ownership before running.

### Correlation — `apps/api/src/modules/correlation` · `apps/web/.../correlation`

Correlation-rule engine that links related events and increments `hitCount` on
match. Endpoints under `correlation` with `CORRELATION_VIEW/CREATE/UPDATE/TOGGLE/
DELETE` permissions. Executed asynchronously via the `CORRELATION_RULE_EXECUTION`
job handler (`CorrelationHandler`). AI assist: `correlation-synthesis` agent.

### Detection rules — `apps/api/src/modules/detection-rules` · `apps/web/.../detection-rules`

Detection engineering: rule CRUD plus an executor (`detection-rules.executor.ts`)
wired to the `DETECTION_RULE_EXECUTION` job handler (`DetectionExecutionHandler`),
which **creates alerts on match**. Rule types: `threshold`, `anomaly`, `chain`,
`scheduled` (`DetectionRuleType`). Controllers: `detection-rules` and
`rules-engine`; permissions `DETECTION_RULES_*`. AI assist: the
**AI Detection Copilot** (`ai-detection-copilot.controller.ts`, `AI_DETECTION_*`)
and the `sigma-drafting` / `rules-analyst` / `rules-hygiene` agents.

### Normalization — `apps/api/src/modules/normalization` · `apps/web/.../normalization`

Log/event normalization pipelines (status via `NormalizationPipelineStatus`,
sources via `NormalizationSourceType`). Wired to the `NORMALIZATION_PIPELINE` job
handler (`NormalizationHandler`), which updates pipeline metrics. Permissions
`NORMALIZATION_*`. AI assist: `norm-verifier` / `norm-verification` agents.

### Data explorer — `apps/api/src/modules/data-explorer` · `apps/web/src/app/(portal)/explorer`

Ad-hoc query / search surface over indexed security data (controller route
`data-explorer`, permissions `EXPLORER_*`). All Elasticsearch/OpenSearch query
strings must pass through the shared `sanitizeEsQueryString()` utility
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rules 35, 79).

---

## 2. Investigation & response

### Cases — `apps/api/src/modules/cases` (+ `case-cycles`) · `apps/web/.../cases`

Case management: CRUD plus notes, tasks, artifacts, timeline, and linked alerts.
Case statuses via `CaseStatus`; case cycles via `case-cycles` (`CaseCycleStatus`).
Sequential case numbers use `pg_advisory_xact_lock` to avoid race conditions
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 43); case owner must be a
validated active tenant member (rule 41); linked alert IDs must belong to the same
tenant (rule 42). Permissions `CASES_*` (view/create/update/delete plus
`CASES_ADD_*`, `CASES_CHANGE_*`). AI assist: `case-creation` agent + `AI_CASE_*`.

### Incidents — `apps/api/src/modules/incidents` · `apps/web/.../incidents`

Incident lifecycle: severity (`IncidentSeverity`), status (`IncidentStatus`),
category (`IncidentCategory`), and actors (`IncidentActorType`). Permissions
`INCIDENTS_*` (view/create/update/delete plus `INCIDENTS_ADD_*`,
`INCIDENTS_CHANGE_*`). AI assist: `incident-escalation` agent.

### Hunts — `apps/api/src/modules/hunts` · `apps/web/src/app/(portal)/hunt`

Threat hunting. Hunt runs follow a **state machine** — only `running → completed`
and `running → error` are valid transitions, enforced via `VALID_TRANSITIONS`
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 40). Executed via the
`HUNT_EXECUTION` job handler (`HuntExecutionHandler`); permissions `HUNT_*`. AI
assist: `threat_hunter` agent.

### SOAR — `apps/api/src/modules/soar` (+ `runbooks`) · `apps/web/.../soar`

Security orchestration & automated response: playbooks and runbooks, executed via
the `SOAR_PLAYBOOK` job handler (`SoarPlaybookHandler`) and integrated with the
Shuffle connector. Playbook status (`SoarPlaybookStatus`), execution status
(`SoarExecutionStatus`), triggers (`SoarTriggerType`). Permissions `SOAR_*` and
`RUNBOOKS_*`. AI assist: `soar-drafting` agent + `AI_SOAR_*`. Destructive
automation is `approval-required` per the AI-safety invariant above.

### Entities — `apps/api/src/modules/entities` · `apps/web/.../entities`

Entity inventory and relationship graph (`EntityType`, `EntityRelationType`).
Permissions `ENTITIES_*`. AI assist: `entity-linking` agent.

### Attack paths — `apps/api/src/modules/attack-paths` · `apps/web/.../attack-paths`

Attack-path analysis (`AttackPathSeverity`, `AttackPathStatus`). Permissions
`ATTACK_PATHS_*`. AI assist: `attack-path-summary` agent.

---

## 3. Threat intelligence

### Intel / IOC — `apps/api/src/modules/intel` · `apps/web/src/app/(portal)/intel`

Threat intelligence and IOC enrichment via the MISP connector. Match IOCs against
MISP events; IOC types via `MispIocType`. Controllers: `intel` and `ti`;
permissions `INTEL_*`. AI assist: the dedicated `ai-intel.controller.ts`
(`threat-intel-synthesis`, `ioc-enrichment`, `misp-feed-review` agents).

### OSINT executor — `apps/api/src/modules/osint-executor`

Built-in OSINT enrichment sources (controller route `osint`). Built-in sources
include VirusTotal, Shodan, AbuseIPDB, NVD/NIST, AlienVault OTX, GreyNoise,
URLScan, Censys, MalwareBazaar, ThreatFox, Pulsedive, web search, plus **custom**
sources (`OsintSourceType`). Every custom source URL must pass SSRF validation and
every API key is encrypted at rest ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
rules 95–96); built-in source definitions live in constants, never hardcoded in
services (rule 100).

### Knowledge — `apps/api/src/modules/knowledge` · `apps/web/.../knowledge`

Knowledge base for SOC playbooks/runbook documentation and reference material. AI
assist: `knowledge-base` agent.

---

## 4. Posture, risk & compliance

### Vulnerabilities — `apps/api/src/modules/vulnerabilities` · `apps/web/.../vulnerabilities`

Vulnerability management (`VulnerabilitySeverity`, `PatchStatus`). Permissions
`VULNERABILITIES_VIEW/CREATE/UPDATE/DELETE`. AI assist: `vuln-prioritization`
agent.

### Cloud security — `apps/api/src/modules/cloud-security` · `apps/web/.../cloud-security`

Cloud security posture across AWS, Azure, GCP, OCI (`CloudProvider`). Cloud
accounts (`CloudAccountStatus`) and findings (`CloudFindingSeverity`,
`CloudFindingStatus`). Permissions `CLOUD_SECURITY_*`. AI assist: `cloud-triage`
agent.

### Compliance — `apps/api/src/modules/compliance` · `apps/web/.../compliance`

Compliance control tracking across standards (`ComplianceStandard` — e.g. ISO
27001, NIST, PCI-DSS, SOC2, HIPAA, GDPR) with control status
(`ComplianceControlStatus`). Permissions `COMPLIANCE_*`.

### UEBA — `apps/api/src/modules/ueba` · `apps/web/.../ueba`

User & entity behavior analytics (`UebaEntityType`, `UebaRiskLevel`, plus
`MlModelType`/`MlModelStatus`). Permissions `UEBA_*`. AI assist: `ueba-narrative`
agent.

---

## 5. Dashboards & reporting

### Dashboards — `apps/api/src/modules/dashboards` · `apps/web/src/app/(portal)/dashboard`

Dashboard aggregation endpoints (`dashboards`), an AI-dashboards route
(`dashboards/ai`), and an MSSP cross-tenant view (`dashboards/mssp`,
`MSSP_DASHBOARD_*`). Panels via `DashboardPanelKey`, density via
`DashboardDensity`; permissions `DASHBOARD_*`. AI assist: `dashboard-builder`
agent.

### Reports — `apps/api/src/modules/reports` · `apps/web/src/app/(portal)/reports`

Reporting and PDF generation. Report types: `executive`, `compliance`, `incident`,
`threat`, `custom` (`ReportType`); reportable modules via `ReportModule`; format
(`ReportFormat`), status (`ReportStatus`), templates (`ReportTemplateKey`).
Generated via the `REPORT_GENERATION` job handler (`ReportGenerationHandler`);
permissions `REPORTS_*`. AI assist: the dedicated `ai-report.controller.ts`
(`reports/ai`) and the `reporting` agent.

---

## 6. Connectors & integration

### Connectors — `apps/api/src/modules/connectors` (+ `connector-sync`, `connector-workspaces`) · `apps/web/.../connectors`

The single integration point for downstream tools. Connector types
(`ConnectorType`): `wazuh`, `graylog`, `logstash`, `velociraptor`, `grafana`,
`influxdb`, `misp`, `shuffle`, `bedrock`, `llm_apis`, `openclaw_gateway`. Each type
has its own per-type Zod config schema and must be validated via
`validateConnectorConfig(type, config)` before encryption
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 39). Configs are AES-256-GCM
encrypted at rest; URLs are SSRF-validated at input time (rule 59). Connector
create/update/toggle require `TENANT_ADMIN` (rule 55); test/sync run via the
`CONNECTOR_SYNC` job handler (`ConnectorSyncHandler`). Permissions `CONNECTORS_*`;
LLM connectors have their own `LLM_CONNECTORS_*` group (controller `llm-connectors`,
plus `ai-connectors`). The `bedrock` / `llm_apis` / `openclaw_gateway` types power
the AI provider cascade.

---

## 7. AI subsystem

> The AI subsystem is a fleet of purpose-built agents woven into the workflow,
> governed by approval workflows, per-agent budgets, and full auditing — see
> [`docs/AI.md`](../AI.md), [`rules/ai/`](../../rules/ai/), and
> [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md). The provider cascade tries all
> configured connectors in order (Bedrock → LLM APIs → OpenClaw Gateway) and falls
> back to a clearly-labeled `rule-based` response only when none are available
> ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rules 88–89).

### AI core — `apps/api/src/modules/ai` · `apps/web/.../ai-*`

Root AI module (`ai.controller.ts`, `ai.service.ts`) plus the AI Ops workspace
(`ai-ops-workspace.controller.ts`, `AI_OPS_*`). Submodules under `modules/ai/`:

- **Chat** (`ai/chat`) — `/ai-chat` LLM conversations with threads, user
  attribution, and memory injection. Permission `AI_CHAT_ACCESS` (all roles).
  Frontend: `ai-chat`, `ai-history`. AI endpoints are rate-limited
  (`@Throttle` 10/min, [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 33).
- **Findings** (`ai/findings`, route `ai/findings`) — searchable workspace for all
  AI-generated findings, PostgreSQL full-text search with weighted ranking; finding
  types via `AiFindingType`, status via `AiFindingStatus`. Frontend: `ai-findings`.
- **Memory** (`ai/memory`) — cross-chat persistent memory (`UserMemory`):
  extraction (`MEMORY_EXTRACTION` job), embedding, retrieval (cosine similarity),
  and RAG observability. Permissions `AI_MEMORY_VIEW/EDIT`. Frontend: `ai-memory`,
  `ai-rag`. Tenant-scoped; stores no secrets.
- **Orchestrator** (`ai/orchestrator`) — the `orchestrator` agent plus the agent
  graph (`agent-graph.controller.ts`), event listener, and scheduler. Frontend:
  `ai-agent-graph`, `ai-ops`. Coordinates multi-agent runs.
- **Eval** (`ai/eval`, route `ai-eval`) — AI quality evaluation; `AI_EVAL_*`.
  Frontend: `ai-eval`.
- **Feature catalog** (`ai/feature-catalog`, route `ai-features`) — registry of AI
  surfaces (`AiFeatureKey`); every AI surface must be registered before
  implementation ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rule 49).
- **Semantic search** (`ai/semantic-search`, route `ai-search`) — embedding-based
  search. Frontend: `ai-search`.
- **Usage budget** (`ai/usage-budget`, route `ai-usage`) — per-agent token quotas;
  every agent execution checks quota before calling the provider
  ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 98); reset periods via
  `TokenResetPeriod`. Permissions `AI_FINOPS_*`. Frontend: `ai-finops`.
- **Writeback / handoffs** (`ai/writeback`) — applying AI output back into entities,
  plus inter-agent handoffs (`ai-handoff.controller.ts`, route `ai-handoffs`,
  `AI_HANDOFF_*`) and schedule templates. Frontend: `ai-handoffs`.
- **Prompt registry** (`ai/prompt-registry`, route `ai-prompts`) — versioned prompt
  templates.
- **Simulation** (`ai/simulation`, route `ai-simulations`) — dry-run / what-if AI
  runs; `AI_SIMULATION_*`. Frontend: `ai-simulations`.
- **Transcripts** (`ai-transcript.controller.ts`, route `ai-transcripts`) — chat
  transcript access; `AI_TRANSCRIPT_*`. Frontend: `ai-transcripts`.

### AI agents — `apps/api/src/modules/ai-agents` · `apps/web/src/app/(portal)/ai-agents`

The agent fleet and execution. Agent IDs (`AiAgentId`,
`apps/api/src/common/enums/ai-agent-config.enum.ts`): `orchestrator`, `l1_analyst`,
`l2_analyst`, `threat_hunter`, `rules_analyst`, `norm_verifier`,
`dashboard_builder`, `alert-triage`, `case-creation`, `incident-escalation`,
`correlation-synthesis`, `sigma-drafting`, `vuln-prioritization`, `ueba-narrative`,
`attack-path-summary`, `norm-verification`, `rules-hygiene`, `reporting`,
`entity-linking`, `job-health`, `cloud-triage`, `soar-drafting`,
`threat-intel-synthesis`, `ioc-enrichment`, `misp-feed-review`, `knowledge-base`,
`notification-digest`, `provider-health`, `approval-advisor`. Agent tasks run via
the `AI_AGENT_TASK` job handler (`ai-agent-task.handler.ts`); permissions
`AI_AGENTS_*`.

### Agent config & approvals — `apps/api/src/modules/agent-config` · `apps/web/.../ai-config`

Per-agent configuration and the approval workflow. Every config mutation validates
against `AiAgentId`, `AiProviderMode` (`direct_api`/`bedrock`/`openclaw`/`inherit`),
and per-mode trigger schemas (`AiTriggerMode`: `manual_only`, `auto_on_alert`,
`auto_by_agent`, `scheduled`) — [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
rules 92–94. Output formats via `AiOutputFormat`. **Approval-required actions create
an `ApprovalRequest` before execution** (`ApprovalStatus`, `ApprovalRiskLevel`);
permissions `AI_CONFIG_*` / `AI_CONFIG_MANAGE_*` and `AI_APPROVALS_*`. Frontend:
`ai-config`, `ai-handoffs`. Additional frontend AI surfaces: `ai-eval`,
`ai-finops`, `ai-simulations`, `ai-transcripts`, `ai-history`.

---

## 8. Platform: identity, tenancy & administration

### Auth — `apps/api/src/modules/auth` · `apps/web/src/app/(auth)`

OIDC (Microsoft Entra ID) authentication with JWT + JWKS verification, refresh-token
rotation, and a Redis-backed JTI blacklist (`token-blacklist.service.ts`). **No auth
bypass in any environment** ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule
23); auth endpoints are strictly rate-limited (login 5/min, refresh 10/min).

### Tenants — `apps/api/src/modules/tenants` · `apps/web/.../admin`

Tenant management plus per-tenant user lifecycle (soft delete → `inactive`, block →
`suspended`, restore/unblock). Protected users (`isProtected`, seeded
`GLOBAL_ADMIN`) cannot be deleted, blocked, or role-changed; no self-delete/block.
Permissions `ADMIN_TENANTS_*` and `ADMIN_USERS_*`. `GLOBAL_ADMIN` switches tenant
context via the `X-Tenant-Id` header.

### Role settings — `apps/api/src/modules/role-settings`

Dynamic RBAC: permission definitions, default permissions per role, and a permission
cache (`permission-cache.service.ts`). The role hierarchy (most → least privileged):
`GLOBAL_ADMIN`, `TENANT_ADMIN`, `SOC_ANALYST_L2`, `THREAT_HUNTER`, `SOC_ANALYST_L1`,
`EXECUTIVE_READONLY` (see [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) Role
Hierarchy; the brief also notes `PLATFORM_OPERATOR`). The legacy `@Roles()`
decorator is used only on the `role-settings` controller itself; everything else
uses `@RequirePermission`. Permissions `ROLE_SETTINGS_*`. Adding a permission is an
atomic end-to-end change (rule 85). Frontend lives under `admin`.

### Users & profile — `apps/api/src/modules/users`, `users-control` · `apps/web/.../profile`, `.../settings`

User profile, preferences (theme via `Theme`, language via `SupportedLanguage`),
and session control (`users-control`: view sessions, force logout —
`USERS_CONTROL_*`). Permissions `PROFILE_*`, `SETTINGS_*`. Frontend: `profile`,
`settings`.

---

## 9. Operations & observability

### Jobs — `apps/api/src/modules/jobs` · `apps/web/src/app/(portal)/jobs`

Async job queue and processor. Every `JobType` must have a registered handler in
`JobsModule` ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rule 31): job types
include `CONNECTOR_SYNC`, `DETECTION_RULE_EXECUTION`, `CORRELATION_RULE_EXECUTION`,
`NORMALIZATION_PIPELINE`, `SOAR_PLAYBOOK`, `HUNT_EXECUTION`, `AI_AGENT_TASK`,
`REPORT_GENERATION`, `MEMORY_EXTRACTION`. Stale `RUNNING` jobs auto-recover after 30
minutes ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 91). Permissions
`JOBS_*` / `JOBS_CANCEL_*`. AI assist: `job-health` agent.

### Notifications — `apps/api/src/modules/notifications` · `apps/web/.../notifications`

In-app notifications over a WebSocket gateway (`NotificationType`,
`NotificationEntityType`). WebSocket CORS must match HTTP CORS validation
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 84). Permissions
`NOTIFICATIONS_*`. AI assist: `notification-digest` agent.

### Health & system health — `apps/api/src/modules/health`, `system-health` · `apps/web/.../system-health`

Service health checks (`health`, `@Public()`) and the operator system-health view
(`system-health`, `SYSTEM_HEALTH_*`). Health responses return service names only,
never internal URLs or the app version ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
rules 60, 81). AI assist: `provider-health` agent.

### Audit & app logs — `apps/api/src/modules/audit-logs`, `app-logs`

Audit trail of mutations (auto-logged via `AuditInterceptor`, credentials redacted)
and structured application logs (`AppLogFeature`, `AppLogOutcome`,
`AppLogSourceType`; gated behind `ADMIN_USERS_VIEW`).

---

## Module-to-AI-agent quick map

| Module                    | Primary AI agent(s) (`AiAgentId`)                                   |
| ------------------------- | ------------------------------------------------------------------- |
| Alerts                    | `alert-triage`, `l1_analyst`, `l2_analyst`                          |
| Cases                     | `case-creation`                                                     |
| Incidents                 | `incident-escalation`                                               |
| Hunts                     | `threat_hunter`                                                     |
| Correlation               | `correlation-synthesis`                                             |
| Detection rules           | `sigma-drafting`, `rules_analyst`, `rules-hygiene`, `rules-analyst` |
| Normalization             | `norm_verifier`, `norm-verification`                                |
| Intel / IOC / OSINT       | `threat-intel-synthesis`, `ioc-enrichment`, `misp-feed-review`      |
| Vulnerabilities           | `vuln-prioritization`                                               |
| Cloud security            | `cloud-triage`                                                      |
| UEBA                      | `ueba-narrative`                                                    |
| Attack paths              | `attack-path-summary`                                               |
| Entities                  | `entity-linking`                                                    |
| SOAR                      | `soar-drafting`                                                     |
| Dashboards                | `dashboard-builder`                                                 |
| Reports                   | `reporting`                                                         |
| Knowledge                 | `knowledge-base`                                                    |
| Jobs                      | `job-health`                                                        |
| Notifications             | `notification-digest`                                               |
| Health / connectors       | `provider-health`                                                   |
| Approvals (cross-cutting) | `approval-advisor`, `orchestrator`                                  |

---

## Where to go next

- One-page summary: [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md) · personas:
  [`PERSONAS.md`](./PERSONAS.md) · buyers: [`TARGET_CUSTOMERS.md`](./TARGET_CUSTOMERS.md)
  · goals: [`BUSINESS_GOALS.md`](./BUSINESS_GOALS.md)
- Deep product reference: [`docs/PRODUCT.md`](../PRODUCT.md) · API surface:
  [`docs/API.md`](../API.md) · AI deep dive: [`docs/AI.md`](../AI.md)
- Onboarding entry point: [`AGENTS.md`](../../AGENTS.md) · docs index:
  [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)
- Hard rules: [`rules/`](../../rules/) · Recipes: [`skills/`](../../skills/) ·
  Stable memory: [`memory/`](../../memory/) · Working context: [`context/`](../../context/)
- Backend conventions: [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) · Frontend
  conventions: [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)

---

_Derived from `apps/api/src/modules/` (38 backend modules + AI submodules),
`apps/web/src/app/(portal)/` routes, controller `@Controller()` route prefixes,
`@RequirePermission(Permission.*)` decorators, and
`apps/api/src/common/enums/` (notably `ai-agent-config.enum.ts`, `permission.enum.ts`,
`connector-type.enum.ts`). This is a structural inventory; maturity of individual
surfaces is best confirmed per-release against the code and tests._
