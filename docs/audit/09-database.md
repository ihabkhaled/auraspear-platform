# Audit 09 — Database (Prisma / PostgreSQL)

Source of truth: [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) (2,746 lines), plus migrations in [`apps/api/prisma/migrations/`](../../apps/api/prisma/migrations/) and the seed at [`apps/api/prisma/seed.ts`](../../apps/api/prisma/seed.ts).

- **Datasource**: PostgreSQL (`datasource db { provider = "postgresql" }`).
- **Generator**: `prisma-client-js` with `binaryTargets = ["native", "rhel-openssl-3.0.x"]` (Docker/RHEL deploy).
- **ID strategy**: every model uses `String @id @default(uuid()) @db.Uuid` (exception: `RefreshTokenFamily.id` has no default — the family ID is supplied by the app).
- **Multi-tenancy**: most models carry `tenantId String @map("tenant_id") @db.Uuid` with a `tenant Tenant @relation(... onDelete: Cascade)` and at least one `@@index([tenantId])`. This is enforced architecturally (every repository method takes `tenantId`; see `apps/api/CLAUDE.md` rules 8, 12, 26) and at the DB layer via RLS (below).

---

## Model inventory

The schema defines **~75 models**. Grouped by domain:

### Identity, tenancy, auth

| Model                  | Table                     | tenantId                          | Notes                                                                                      |
| ---------------------- | ------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------ |
| `Tenant`               | `tenants`                 | (is the tenant)                   | `slug @unique`; hub for all relations                                                      |
| `User`                 | `users`                   | none (global)                     | `email @unique`, `oidcSub @unique`; `passwordHash` (nullable), `isProtected`, `mfaEnabled` |
| `TenantMembership`     | `tenant_memberships`      | yes (NOT NULL)                    | join of user↔tenant + `role`/`status`; `@@unique([userId, tenantId])`                      |
| `UserPreference`       | `user_preferences`        | none — scoped by `userId @unique` | theme/lang/notification/retention prefs; `collapsedDashboardPanels` array                  |
| `UserSession`          | `user_sessions`           | yes (NOT NULL)                    | device/session tracking; `familyId @unique`, holds current access JTI                      |
| `RefreshTokenFamily`   | `refresh_token_families`  | yes (NOT NULL)                    | rotation family; `id` has no default                                                       |
| `RefreshTokenRotation` | `refresh_token_rotations` | none — scoped via `familyId`      | `jtiHash @unique`, `@@unique([familyId, generation])`, self-referential chain              |
| `PermissionDefinition` | `permission_definitions`  | **nullable** (system rows)        | `@@unique([tenantId, key])`                                                                |
| `RolePermission`       | `role_permissions`        | yes (NOT NULL)                    | `@@unique([tenantId, role, permissionKey])`                                                |
| `AuditLog`             | `audit_logs`              | yes (NOT NULL)                    | actor/action/resource audit trail                                                          |

### Connectors & data-explorer sync

| Model                  | Table                    | tenantId                               | Notes                                                               |
| ---------------------- | ------------------------ | -------------------------------------- | ------------------------------------------------------------------- |
| `ConnectorConfig`      | `connector_configs`      | yes (NOT NULL)                         | `encryptedConfig` (Text, AES-256-GCM); `@@unique([tenantId, type])` |
| `LlmConnector`         | `llm_connectors`         | yes (NOT NULL)                         | `encryptedApiKey` (Text); `@@unique([tenantId, name])`              |
| `ConnectorSyncJob`     | `connector_sync_jobs`    | **column only — no `tenant` relation** | sync run history; see flag below                                    |
| `GrafanaDashboard`     | `grafana_dashboards`     | **column only — no `tenant` relation** | `@@unique([tenantId, uid])`; see flag                               |
| `VelociraptorEndpoint` | `velociraptor_endpoints` | **column only — no relation**          | `@@unique([tenantId, clientId])`; see flag                          |
| `VelociraptorHunt`     | `velociraptor_hunts`     | **column only — no relation**          | `@@unique([tenantId, huntId])`; see flag                            |
| `VelociraptorNotebook` | `velociraptor_notebooks` | **column only — no relation**          | `@@unique([tenantId, notebookId])`; see flag                        |
| `LogstashPipelineLog`  | `logstash_pipeline_logs` | yes (NOT NULL, relation)               |                                                                     |
| `ShuffleWorkflow`      | `shuffle_workflows`      | **column only — no relation**          | `@@unique([tenantId, workflowId])`; see flag                        |

### SOC core (alerts, cases, hunts, intel)

| Model                | Table                   | tenantId                      | Notes                                                                 |
| -------------------- | ----------------------- | ----------------------------- | --------------------------------------------------------------------- |
| `Alert`              | `alerts`                | yes (NOT NULL)                | `@@unique([tenantId, externalId])`; has AI columns (see Encrypted/AI) |
| `CaseCycle`          | `case_cycles`           | yes (NOT NULL)                |                                                                       |
| `Case`               | `cases`                 | yes (NOT NULL)                | `caseNumber @unique`; `linkedAlerts String[]`; `cycleId` FK           |
| `CaseNote`           | `case_notes`            | none — child of `Case`        |                                                                       |
| `CaseComment`        | `case_comments`         | none — child of `Case`        | soft-delete (`isDeleted`)                                             |
| `CaseCommentMention` | `case_comment_mentions` | none — child of comment       | `@@unique([commentId, userId])`                                       |
| `CaseTimeline`       | `case_timeline`         | none — child of `Case`        |                                                                       |
| `CaseTask`           | `case_tasks`            | none — child of `Case`        |                                                                       |
| `CaseArtifact`       | `case_artifacts`        | none — child of `Case`        |                                                                       |
| `IntelIOC`           | `intel_iocs`            | yes (NOT NULL)                | `@@unique([tenantId, iocValue, iocType])`                             |
| `IntelMispEvent`     | `intel_misp_events`     | yes (NOT NULL)                | `@@unique([tenantId, mispEventId])`                                   |
| `HuntSession`        | `hunt_sessions`         | yes (NOT NULL)                | has `aiAnalysis` text                                                 |
| `HuntEvent`          | `hunt_events`           | none — child of `HuntSession` |                                                                       |
| `SavedQuery`         | `saved_queries`         | yes (NOT NULL)                |                                                                       |
| `ApplicationLog`     | `application_logs`      | **nullable** (platform logs)  | global log sink; see flag                                             |

### Detection / response / posture

| Model                   | Table                     | tenantId                   | Notes                                                                                          |
| ----------------------- | ------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------- |
| `Incident`              | `incidents`               | yes                        | `incidentNumber @unique`                                                                       |
| `IncidentTimeline`      | `incident_timeline`       | none — child of `Incident` |                                                                                                |
| `CorrelationRule`       | `correlation_rules`       | yes                        | `ruleNumber @unique`                                                                           |
| `Vulnerability`         | `vulnerabilities`         | yes                        | `@@unique([tenantId, cveId])`                                                                  |
| `AttackPath`            | `attack_paths`            | yes                        | `pathNumber @unique`                                                                           |
| `SoarPlaybook`          | `soar_playbooks`          | yes                        | `@@unique([tenantId, name])`                                                                   |
| `SoarExecution`         | `soar_executions`         | yes                        |                                                                                                |
| `ComplianceFramework`   | `compliance_frameworks`   | yes                        | `@@unique([tenantId, standard, version])`                                                      |
| `ComplianceControl`     | `compliance_controls`     | none — child of framework  | `@@unique([frameworkId, controlNumber])`                                                       |
| `DetectionRule`         | `detection_rules`         | yes                        | `ruleNumber @unique`                                                                           |
| `NormalizationPipeline` | `normalization_pipelines` | yes                        | `@@unique([tenantId, name])`                                                                   |
| `CloudAccount`          | `cloud_accounts`          | yes                        | `@@unique([tenantId, provider, accountId])`                                                    |
| `CloudFinding`          | `cloud_findings`          | yes                        | child of `CloudAccount` + tenant                                                               |
| `Notification`          | `notifications`           | yes (NOT NULL)             | **column only — no `tenant` relation**; see flag. `@@unique([recipientUserId, caseCommentId])` |

### UEBA / ML / system health / reporting

| Model               | Table                  | tenantId                        | Notes                                           |
| ------------------- | ---------------------- | ------------------------------- | ----------------------------------------------- |
| `UebaEntity`        | `ueba_entities`        | yes                             | `@@unique([tenantId, entityName, entityType])`  |
| `UebaAnomaly`       | `ueba_anomalies`       | yes                             | child of `UebaEntity` + tenant                  |
| `MlModel`           | `ml_models`            | yes                             | `@@unique([tenantId, name])`                    |
| `SystemHealthCheck` | `system_health_checks` | yes                             |                                                 |
| `SystemMetric`      | `system_metrics`       | yes                             |                                                 |
| `Report`            | `reports`              | yes                             | `generatedContent` Text                         |
| `ReportTemplate`    | `report_templates`     | **nullable** (system templates) | `isSystem`                                      |
| `Job`               | `jobs`                 | yes                             | `@@unique([tenantId, idempotencyKey])`          |
| `Runbook`           | `runbooks`             | yes                             | KB content                                      |
| `Entity`            | `entities`             | yes                             | graph node; `@@unique([tenantId, type, value])` |
| `EntityRelation`    | `entity_relations`     | yes                             | graph edge (from/to entity)                     |

### AI agents, memory, findings, governance, FinOps

| Model                   | Table                       | tenantId                                            | Notes                                                                           |
| ----------------------- | --------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------- |
| `AiAgent`               | `ai_agents`                 | yes                                                 | `@@unique([tenantId, name])`; `soulMd`, `totalTokens BigInt`                    |
| `AiAgentSession`        | `ai_agent_sessions`         | **nullable**; relation is to `AiAgent` not `Tenant` | trigger/source-module tracking; see flag                                        |
| `AiAgentTool`           | `ai_agent_tools`            | none — child of `AiAgent`                           | `@@unique([agentId, name])`                                                     |
| `TenantAgentConfig`     | `tenant_agent_configs`      | yes                                                 | per-agent config + token quotas; `@@unique([tenantId, agentId])`                |
| `OsintSourceConfig`     | `osint_source_configs`      | yes                                                 | `encryptedApiKey` (Text); `@@unique([tenantId, sourceType, name])`              |
| `AiApprovalRequest`     | `ai_approval_requests`      | yes                                                 | approval gate before agent actions                                              |
| `AiExecutionFinding`    | `ai_execution_findings`     | yes                                                 | **AI findings store**; `searchVector Unsupported("tsvector")` FTS; see Audit/AI |
| `AiFindingOutputLink`   | `ai_finding_output_links`   | yes                                                 | finding → produced entity links                                                 |
| `AiJobRunSummary`       | `ai_job_run_summaries`      | yes                                                 | scheduled-run telemetry                                                         |
| `AiAgentSchedule`       | `ai_agent_schedules`        | **nullable** (system defaults)                      | cron schedules; `seedKey @unique`                                               |
| `AiScheduleTemplate`    | `ai_schedule_templates`     | **none — global catalog**                           | `jobKey @unique`; not tenant-owned                                              |
| `AiPromptTemplate`      | `ai_prompt_templates`       | yes                                                 | `@@unique([tenantId, taskType, version])`                                       |
| `AiFeatureConfig`       | `ai_feature_configs`        | yes                                                 | `@@unique([tenantId, featureKey])`                                              |
| `AiUsageLedger`         | `ai_usage_ledger`           | yes                                                 | per-call token/cost ledger (FinOps)                                             |
| `AiCostRate`            | `ai_cost_rates`             | yes                                                 | `@@unique([tenantId, provider, model])`                                         |
| `AiBudgetAlert`         | `ai_budget_alerts`          | yes                                                 | `@@unique([tenantId, scope, scopeKey])`                                         |
| `AiAuditLog`            | `ai_audit_logs`             | yes                                                 | **AI audit trail** (prompt/response, tokens, duration)                          |
| `AiChatThread`          | `ai_chat_threads`           | yes                                                 | per-user chat; `legalHold`, `complianceStatus`, `redactedAt`                    |
| `AiChatMessage`         | `ai_chat_messages`          | yes                                                 | messages with model attribution + fallback fields                               |
| `UserMemory`            | `user_memories`             | yes                                                 | **AI long-term memory**; `embedding Float[]`, soft-delete                       |
| `MemoryRetentionPolicy` | `memory_retention_policies` | yes                                                 | `@@unique([tenantId])` (one per tenant)                                         |
| `AiTranscriptPolicy`    | `ai_transcript_policies`    | yes                                                 | `@@unique([tenantId])` (one per tenant); PII redaction/legal-hold policy        |
| `AiEvalSuite`           | `ai_eval_suites`            | yes                                                 | eval datasets                                                                   |
| `AiEvalRun`             | `ai_eval_runs`              | yes                                                 | eval execution results                                                          |
| `AiSimulation`          | `ai_simulations`            | yes                                                 | agent backtesting                                                               |

---

## tenantId presence — summary

- **Tenant-scoped via column + `Tenant` relation + index** — the large majority of models.
- **Intentionally global (no `tenantId`)**: `User`, `RefreshTokenRotation` (scoped through `familyId`), `AiScheduleTemplate` (`jobKey @unique` global catalog), and all `Case*`/`HuntEvent`/`IncidentTimeline`/`ComplianceControl`/`AiAgentTool`/`CaseCommentMention` child tables (scoped through their parent's `tenantId`). `UserPreference` is scoped through `userId`.
- **Nullable `tenantId` (legitimately mixed system + tenant rows)**: `PermissionDefinition`, `ReportTemplate`, `ApplicationLog`, `AiAgentSchedule`, `AiAgentSession`. RLS handles the nullable cases with `(tenant_id IS NULL OR tenant_id = current_setting(...))`-style policies.

---

## Indexes & unique constraints (patterns)

- **Tenant-prefixed composite indexes** are the dominant pattern: e.g. `Alert` has `@@index([tenantId])`, `[tenantId, severity]`, `[tenantId, status]`, `[tenantId, timestamp]`, `[tenantId, source]`. Most posture/detection models follow `[tenantId, <facet>]` + `[tenantId, createdAt]`.
- **Tenant-scoped uniqueness** is enforced with compound `@@unique`: e.g. `[tenantId, type]` (connectors), `[tenantId, externalId]` (alerts), `[tenantId, cveId]` (vulns), `[tenantId, name]` (agents/playbooks/ML/pipelines/LLM connectors), `[tenantId, key]` (permission definitions), `[tenantId, idempotencyKey]` (jobs), `[tenantId]` singletons (`MemoryRetentionPolicy`, `AiTranscriptPolicy`).
- **Globally unique business keys**: `caseNumber`, `incidentNumber`, `ruleNumber` (correlation), `ruleNumber` (detection), `pathNumber`, `seedKey`, `jobKey`, `jtiHash`, `slug`, `email`, `oidcSub`, `familyId`.
- **Sorted/partial-style indexes**: several AI tables use descending indexes, e.g. `AiExecutionFinding @@index([tenantId, createdAt(sort: Desc)])` and `[tenantId, status, createdAt(sort: Desc)]`; `AiChatThread @@index([tenantId, userId, lastActivityAt(sort: Desc)])`; `UserMemory` and `AiJobRunSummary` similarly.

---

## Encrypted / secret fields (at rest)

Secrets are stored as encrypted blobs in `@db.Text` columns (AES-256-GCM via `encryption.utility.ts`, per `apps/api/CLAUDE.md`):

- `ConnectorConfig.encryptedConfig`
- `LlmConnector.encryptedApiKey`
- `OsintSourceConfig.encryptedApiKey` (nullable)

No plaintext credential columns exist on these models. `User.passwordHash` is a bcrypt hash (not reversible encryption).

---

## Audit / log tables

- **`AuditLog` (`audit_logs`)** — tenant-scoped mutation audit trail (actor, role, action, resource, resourceId, ipAddress); written by `AuditInterceptor`.
- **`AiAuditLog` (`ai_audit_logs`)** — tenant-scoped AI call audit (actor, action, model, input/output tokens, prompt, response, durationMs).
- **`ApplicationLog` (`application_logs`)** — structured app/event log sink (nullable `tenantId`, actor, HTTP context, `stackTrace`, `metadata`); heavily indexed for querying.

---

## AI memory / findings models

- **Memory**: `UserMemory` (`user_memories`) is the cross-chat long-term memory store — `content`, `category`, `embedding Float[]` (vector for similarity), `sourceType/sourceId/sourceLabel`, soft-delete via `isDeleted`. Governed by **`MemoryRetentionPolicy`** (one per tenant, optional auto-cleanup).
- **Findings**: `AiExecutionFinding` (`ai_execution_findings`) is the canonical agent-findings table — `findingType`, `summary`, `confidenceScore`, `severity`, `evidenceJson`, `recommendedAction`, `status` (proposed/applied). It includes a Postgres full-text search column `searchVector Unsupported("tsvector")`, populated by a GIN index + trigger added in [`20260328_add_findings_fulltext_search/migration.sql`](../../apps/api/prisma/migrations/20260328_add_findings_fulltext_search/migration.sql) (also enables `pg_trgm` and trigram indexes on `title`/`summary`). Findings link to produced entities via `AiFindingOutputLink`.
- **Run telemetry**: `AiAgentSession` and `AiJobRunSummary` capture per-run model/provider/token/finding counts.
- **Governance**: `AiTranscriptPolicy` (chat/audit retention, `autoRedactPii`, `requireLegalHold`); chat-level fields `AiChatThread.legalHold` / `complianceStatus` / `redactedAt`.

---

## Migrations & seed

- **Migrations**: 55+ ordered SQL migrations in `apps/api/prisma/migrations/`, tracking the full evolution (password auth → tenant/membership split → incidents/correlation/vulns → AI agents/UEBA → SOAR/compliance → health/normalization/cloud → RBAC → jobs → LLM connectors → AI chat/memory → memory governance → transcript compliance → FinOps → eval lab → simulation).
- **Row-Level Security**: [`20260318_add_rls_policies/migration.sql`](../../apps/api/prisma/migrations/20260318_add_rls_policies/migration.sql) enables `ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` on tenant tables, isolating rows by the `app.current_tenant_id` session variable, with a `prisma_migration` bypass role for migrations/seeding. This is DB-level defense-in-depth on top of the repository-layer `tenantId` scoping.
- **Seed**: [`apps/api/prisma/seed.ts`](../../apps/api/prisma/seed.ts) seeds tenants, users (with `isProtected` GLOBAL_ADMIN), roles/permissions, connectors, and demo SOC data across most enums. Per `apps/api/CLAUDE.md` (rules 15, 54), seeders are idempotent (`upsert` / `skipDuplicates`) and require `SEED_DEFAULT_PASSWORD` with no fallback. Several migrations also seed reference data (`*_seed_agent_catalog`, `*_backfill_agent_configs`, `*_fix_agent_schedule_seeds`, schedule templates, role/permission defaults).

---

## Flags — tenant-owned models with weak/missing tenant wiring

These are **not missing the `tenantId` column** — every one below still has `tenant_id` — but they lack a declared `tenant Tenant @relation`, so referential integrity and `onDelete: Cascade` are not enforced by Prisma/FK for these tables. They rely solely on application-layer scoping (and RLS). Worth confirming this is intentional:

1. **`ConnectorSyncJob`** (`connector_sync_jobs`) — has `tenantId` + indexes but **no `tenant` relation**.
2. **`GrafanaDashboard`** (`grafana_dashboards`) — `tenantId` + `@@unique([tenantId, uid])`, **no relation**.
3. **`VelociraptorEndpoint` / `VelociraptorHunt` / `VelociraptorNotebook`** — `tenantId` + tenant-scoped unique keys, **no relation** on any of the three.
4. **`ShuffleWorkflow`** (`shuffle_workflows`) — `tenantId` + `@@unique([tenantId, workflowId])`, **no relation**.
5. **`Notification`** (`notifications`) — `tenantId` is NOT NULL and indexed, but there is **no `tenant` relation** and it is absent from `Tenant`'s relation list. A tenant delete will not cascade these rows.

Additionally, **`AiAgentSession`** (`ai_agent_sessions`) has a **nullable `tenantId` with no `Tenant` relation** (it relates only to `AiAgent`); rows can in principle carry a null tenant. Given findings/sessions are tenant-facing, confirm null-tenant rows are acceptable.

Notes on legitimately tenant-less models (no flag): `User`, `UserPreference`, `RefreshTokenRotation`, `AiScheduleTemplate`, and all parent-scoped child tables are intentionally without `tenantId` and are correctly scoped through a parent relation.
