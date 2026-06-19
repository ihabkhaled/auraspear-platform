# Database — AuraSpear Platform

> **Entry point:** start at [`AGENTS.md`](../../AGENTS.md) (the universal AI +
> human entry point), then load `memory/`, `context/`, `rules/`, `skills/`, and
> these `docs/`. This file is the deep reference for the **data layer**: the
> Prisma schema, multi-tenancy, indexing, migrations, and seeding.

The API is the only service that talks to the database. It is a NestJS 11 BFF
using **Prisma 7** over **PostgreSQL**, with the repository pattern enforcing a
strict `Controller → Service → Repository → Prisma` layering. The frontend never
touches the database directly — it proxies through the API. See
[`BACKEND.md`](BACKEND.md) for the layering rules, [`RUNTIME.md`](RUNTIME.md) for
how requests flow, [`API.md`](API.md) for the HTTP surface, and
[`ARCHITECTURE.md`](../ARCHITECTURE.md) for the high-level picture.

The hard backend rules that govern every query live in
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — read it before changing data
access. The recipe for adding a model is
[`skills/backend/add-prisma-model.md`](../../skills/backend/add-prisma-model.md).

## Where the data layer lives

| Path                                                                                                         | What it is                                                                        |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [`apps/api/prisma/schema.prisma`](../../apps/api/prisma/schema.prisma)                                       | The single Prisma schema — **84 models, 60 enums**                                |
| [`apps/api/prisma/migrations/`](../../apps/api/prisma/migrations/)                                           | **58** ordered SQL migration directories                                          |
| [`apps/api/prisma/seed.ts`](../../apps/api/prisma/seed.ts)                                                   | Idempotent seed (3 demo tenants + system data)                                    |
| [`apps/api/prisma.config.ts`](../../apps/api/prisma.config.ts)                                               | Prisma 7 config: schema path, migrations dir, seed command, pooled datasource URL |
| [`apps/api/src/prisma/prisma.service.ts`](../../apps/api/src/prisma/prisma.service.ts)                       | `PrismaClient` wrapper: connection pool, retry-on-connect                         |
| [`apps/api/src/prisma/prisma.constants.ts`](../../apps/api/src/prisma/prisma.constants.ts)                   | Pool/retry constants                                                              |
| [`apps/api/src/common/middleware/rls.middleware.ts`](../../apps/api/src/common/middleware/rls.middleware.ts) | Sets the Postgres RLS tenant context per request                                  |
| [`apps/api/src/common/utils/rls.utility.ts`](../../apps/api/src/common/utils/rls.utility.ts)                 | `setTenantContext` / `clearTenantContext` helpers                                 |

The schema declares the datasource as PostgreSQL and the client generator with
`binaryTargets = ["native", "rhel-openssl-3.0.x"]` (the second target is for the
Linux container image). No `url` is hardcoded in the schema — the connection
string is supplied at runtime from `DATABASE_URL` (see
[`ENVIRONMENT.md`](../ENVIRONMENT.md)).

## Connection management

`PrismaService` (`prisma.service.ts`) extends `PrismaClient` and:

- Builds a **pooled** URL by appending `connection_limit=20&pool_timeout=10` to
  `DATABASE_URL` (constants `DEFAULT_CONNECTION_LIMIT = 20`,
  `DEFAULT_POOL_TIMEOUT_SECONDS = 10` in `prisma.constants.ts`). This satisfies
  the `apps/api/CLAUDE.md` rule that connection pools must be bounded.
- Uses the `@prisma/adapter-pg` driver adapter (`PrismaPg`) over the `pg` driver.
- Retries the initial connection up to `MAX_RETRIES = 5` times with a linear
  backoff (`BASE_DELAY_MS = 2000` × attempt) so the API survives Postgres still
  warming up in Docker.

`prisma.config.ts` applies the same `connection_limit=20&pool_timeout=10`
pooling to migrate/seed operations, and deliberately reads `DATABASE_URL` via
`process.env` (not Prisma's `env()`), so `prisma generate` in `postinstall` does
not throw on a fresh clone where the var is unset.

## Multi-tenancy — `tenantId` everywhere

Tenant isolation is the platform's top security invariant (`AGENTS.md` §6,
`apps/api/CLAUDE.md` rules 8, 26). It is enforced at **three** layers:

### 1. Schema — `tenantId` columns and compound keys

`Tenant` (`@@map("tenants")`) is the root; almost every business model carries a
required `tenantId String @map("tenant_id") @db.Uuid` foreign key with
`onDelete: Cascade`, so deleting a tenant removes all of its data. The `Tenant`
model fans out to dozens of relations (alerts, cases, incidents, connectors, AI
tables, jobs, sessions, and more).

Tenancy shows up in the schema as **compound** uniqueness and indexes, so the
same logical key can repeat across tenants but never within one:

- `Alert` → `@@unique([tenantId, externalId])`
- `ConnectorConfig` → `@@unique([tenantId, type])` (one config per connector type per tenant)
- `IntelIOC` → `@@unique([tenantId, iocValue, iocType])`
- `Vulnerability` → `@@unique([tenantId, cveId])`
- `RolePermission` → `@@unique([tenantId, role, permissionKey])`
- `PermissionDefinition` → `@@unique([tenantId, key])` (note: `tenantId` is **nullable** here — `NULL` rows are the system-wide permission catalog)
- `Job` → `@@unique([tenantId, idempotencyKey])`

A small set of models are **tenant-nullable** by design so they can hold
system-level rows: `PermissionDefinition` (NULL = global permission catalog),
`ReportTemplate` (NULL = system templates, `isSystem` defaults `true`),
`AiAgentSchedule` (NULL = system-default schedule), `AiScheduleTemplate` (global,
no `tenantId` at all), and `ApplicationLog` (NULL = system-level logs).

Users are **global**, not tenant-scoped: the `User` model holds identity
(`email`, `passwordHash`, `oidcSub`, `mfaEnabled`, `isProtected`), and the
`TenantMembership` join table (`@@unique([userId, tenantId])`) maps a user to a
tenant with a `role` (`UserRole`) and a membership `status` (`UserStatus`). A
user can belong to several tenants with different roles. See
[`BACKEND.md`](BACKEND.md) and `apps/api/CLAUDE.md` for the auth/RBAC chain
(`AuthGuard → TenantGuard → RolesGuard`, `@RequirePermission`, GLOBAL_ADMIN
tenant switching via `X-Tenant-Id`).

### 2. Application — every query is scoped

The repository layer takes `tenantId` on every method and filters by it.
`apps/api/CLAUDE.md` makes this non-negotiable:

- Rule 8 — never return data from another tenant; every query is scoped by `tenantId`.
- Rule 26 — **every** Prisma `update()` and `delete()` must include `tenantId` in
  the `where` clause: `where: { id, tenantId }`, never by `id` alone.

### 3. Database — Row-Level Security (defense in depth)

Migration
[`20260318_add_rls_policies`](../../apps/api/prisma/migrations/20260318_add_rls_policies/migration.sql)
turns on Postgres **RLS** for the tenant-scoped tables. Each table gets:

- `ENABLE` + `FORCE ROW LEVEL SECURITY`,
- a `tenant_isolation_policy` that restricts rows to
  `tenant_id = current_setting('app.current_tenant_id', true)::uuid`
  (tenant-nullable tables also allow `tenant_id IS NULL`), and
- a `bypass_rls` policy for the `prisma_migration` role used by migrations/seed.

At runtime, `RlsMiddleware` reads `req.user.tenantId` (populated by `AuthGuard`)
and calls `setTenantContext()`, which runs
`SELECT set_config('app.current_tenant_id', $1, true)`. The `true` third
argument makes the setting **transaction-local** — see the caveat documented in
the middleware: because Prisma uses an implicit transaction per query, RLS only
spans multiple statements when they share an explicit `$transaction()`.
Application-level scoping (layer 2) remains the primary guarantee; RLS is the
backstop.

## Indexing

Indexing is tenancy-first: nearly every model leads with `@@index([tenantId])`
plus compound indexes pairing `tenantId` with the columns the UI filters and
sorts on. Representative examples from the schema:

- **Alert** — `@@index([tenantId])`, plus `[tenantId, severity]`,
  `[tenantId, status]`, `[tenantId, timestamp]`, `[tenantId, source]`.
- **Incident**, **CorrelationRule**, **DetectionRule**, **Vulnerability**,
  **CloudFinding** — each indexes `tenantId` with `severity`/`status`/`type`/
  `category` and a `[tenantId, createdAt]` (or `detectedAt`) for time-ordered lists.
- **Notification** — multi-column read-state index
  `[tenantId, recipientUserId, readAt, createdAt]` for the unread badge/feed.
- **Sorted indexes** — several AI tables use descending sort indexes, e.g.
  `AiExecutionFinding` `@@index([tenantId, createdAt(sort: Desc)])` and
  `@@index([tenantId, status, createdAt(sort: Desc)])`; `AiChatThread`
  `@@index([tenantId, userId, lastActivityAt(sort: Desc)])`.

These backing indexes are what let the backend honor the sortable-column rules
in `apps/api/CLAUDE.md` (rule 87) — a column is only sortable if the DTO `sortBy`
enum, the `buildOrderBy` utility, **and** an index exist.

### Full-text search (`tsvector` + `pg_trgm`)

`AiExecutionFinding` powers the AI Findings page's full-text search. The model
declares `searchVector Unsupported("tsvector")?` and migration
[`20260328_add_findings_fulltext_search`](../../apps/api/prisma/migrations/20260328_add_findings_fulltext_search/migration.sql)
adds:

- the `pg_trgm` extension,
- a weighted `tsvector` (A = title, B = summary, C = recommended action,
  D = agent/source module) maintained by a `BEFORE INSERT OR UPDATE` trigger,
- a **GIN** index on the vector, plus trigram GIN indexes on `title` and
  `summary` for fuzzy matching, and supporting composite filter+sort indexes.

`Unsupported(...)` means Prisma stores/queries the column but cannot fully type
it — full-text reads use raw SQL in the findings repository.

## Column conventions

- **IDs** — `String @id @default(uuid()) @db.Uuid`. A few rows use deterministic
  UUIDs from the seed for idempotency.
- **Naming** — `camelCase` Prisma fields map to `snake_case` columns via `@map`,
  and models map to plural snake_case tables via `@@map` (e.g.
  `model AiChatThread { … @@map("ai_chat_threads") }`).
- **Timestamps** — `createdAt @default(now())` and `updatedAt @updatedAt`,
  mapped to `created_at` / `updated_at`.
- **Sizing** — string columns are explicitly sized (`@db.VarChar(n)` /
  `@db.Text`); emails use `VarChar(320)`. These sizes are the basis for the
  Zod `.max()` limits required on DTO fields (`apps/api/CLAUDE.md` rule 27).
- **JSON** — flexible payloads use `Json?` (e.g. `Alert.rawEvent`,
  `DetectionRule.conditions`, `SoarPlaybook.steps`, `Job.payload`); DTOs that
  write these must cap nested JSON size (rule 78).
- **Arrays / enums** — Postgres arrays (`String[]`, enum arrays like
  `DashboardPanelKey[]`) and 60 native enums encode all status/severity/type
  vocabularies, matching the "no raw string literals" rule.
- **Encrypted at rest** — credential columns store ciphertext only:
  `ConnectorConfig.encryptedConfig`, `LlmConnector.encryptedApiKey`,
  `OsintSourceConfig.encryptedApiKey` (AES-256-GCM via the encryption utility).
  See [`SECURITY.md`](../SECURITY.md).
- **Counters/cost** — large counters use `BigInt` (`AiAgent.totalTokens`,
  `NormalizationPipeline.processedCount`, `Report.fileSize`).

## The models, by domain

The 84 models group into the following areas (table name in parentheses):

**Tenancy, identity & access**
`Tenant` (`tenants`), `User` (`users`), `TenantMembership`
(`tenant_memberships`), `UserPreference` (`user_preferences`),
`PermissionDefinition` (`permission_definitions`), `RolePermission`
(`role_permissions`). The `UserPreference` row holds theme/language,
per-category notification toggles, data-retention windows, and dashboard density

- collapsed panels.

**Sessions & token rotation**
`UserSession` (`user_sessions`), `RefreshTokenFamily`
(`refresh_token_families`), `RefreshTokenRotation` (`refresh_token_rotations`).
These back the refresh-token-rotation / replay-detection scheme described in
`apps/api/CLAUDE.md` (rules 37–38, 51) and [`SECURITY.md`](../SECURITY.md);
`RefreshTokenRotation` is a self-referencing chain (`parentRotationId`).

**Connectors & data-explorer sync**
`ConnectorConfig` (`connector_configs`), `LlmConnector` (`llm_connectors`),
`OsintSourceConfig` (`osint_source_configs`), plus synced read-models for the
Data Explorer: `ConnectorSyncJob` (`connector_sync_jobs`), `GrafanaDashboard`,
`VelociraptorEndpoint` / `VelociraptorHunt` / `VelociraptorNotebook`,
`LogstashPipelineLog`, `ShuffleWorkflow`. `ConnectorType` enumerates `wazuh`,
`graylog`, `logstash`, `velociraptor`, `grafana`, `influxdb`, `misp`, `shuffle`,
`bedrock`, `llm_apis`, `openclaw_gateway`.

**Core SOC workflow**
`Alert` (`alerts`) — Wazuh/SIEM alerts with MITRE tactics/techniques and an AI
overlay (`aiSummary`, `aiConfidence`, `aiStatus`, …). Cases:
`CaseCycle` (`case_cycles`), `Case` (`cases`, with human-readable `caseNumber`),
`CaseNote`, `CaseComment` + `CaseCommentMention`, `CaseTimeline`, `CaseTask`,
`CaseArtifact`. Incidents: `Incident` (`incidents`, `incidentNumber`),
`IncidentTimeline`. `Notification` (`notifications`) drives the in-app feed.

**Threat hunting & intel**
`HuntSession` (`hunt_sessions`) + `HuntEvent`, `SavedQuery` (`saved_queries`),
`IntelIOC` (`intel_iocs`), `IntelMispEvent` (`intel_misp_events`).

**Detection, correlation & normalization**
`CorrelationRule` (`correlation_rules`, supports Sigma YAML),
`DetectionRule` (`detection_rules`), `NormalizationPipeline`
(`normalization_pipelines`).

**Risk: vulnerabilities, UEBA, attack paths, cloud**
`Vulnerability` (`vulnerabilities`), `UebaEntity` (`ueba_entities`) +
`UebaAnomaly`, `MlModel` (`ml_models`), `AttackPath` (`attack_paths`),
`CloudAccount` (`cloud_accounts`) + `CloudFinding` (`cloud_findings`),
`Entity` (`entities`) + `EntityRelation` (`entity_relations`, the entity graph).

**SOAR, compliance & reporting**
`SoarPlaybook` (`soar_playbooks`) + `SoarExecution`, `ComplianceFramework`
(`compliance_frameworks`) + `ComplianceControl`, `Report` (`reports`) +
`ReportTemplate` (`report_templates`).

**System health & logs**
`SystemHealthCheck` (`system_health_checks`), `SystemMetric` (`system_metrics`),
`ApplicationLog` (`application_logs`), `AuditLog` (`audit_logs`),
`AiAuditLog` (`ai_audit_logs`).

**Jobs**
`Job` (`jobs`) — the queued-work table. `JobType` covers `connector_sync`,
`detection_rule_execution`, `correlation_rule_execution`,
`normalization_pipeline`, `soar_playbook`, `hunt_execution`, `ai_agent_task`,
`report_generation`, `memory_extraction`; `JobStatus` covers the full lifecycle
(`pending` → `running` → `completed`/`failed`/`retrying`/`cancelled`). Every
type needs a registered handler (see [`RUNTIME.md`](RUNTIME.md)).

**AI subsystem** (the largest cluster)
Agents & runs: `AiAgent` (`ai_agents`) + `AiAgentSession` + `AiAgentTool`,
`TenantAgentConfig` (`tenant_agent_configs`, per-tenant token budgets/triggers),
`AiExecutionFinding` (`ai_execution_findings`, full-text searchable),
`AiFindingOutputLink`, `AiJobRunSummary`. Scheduling: `AiAgentSchedule` +
`AiScheduleTemplate`. Governance & approvals: `AiApprovalRequest`
(`ai_approval_requests`), `AiTranscriptPolicy`, `MemoryRetentionPolicy`. Prompts
& features: `AiPromptTemplate`, `AiFeatureConfig`. FinOps: `AiUsageLedger`,
`AiCostRate`, `AiBudgetAlert`. Chat & memory: `AiChatThread` + `AiChatMessage`
(with model/provider/fallback attribution and legal-hold/compliance fields),
`UserMemory` (`user_memories`, cross-chat long-term context with a `Float[]`
embedding). Eval & simulation: `AiEvalSuite` + `AiEvalRun`, `AiSimulation`. The
AI data model is governed by `rules/ai/*` and [`../AI.md`](../AI.md) /
[`ai/`](../ai/).

## Migrations

Migrations are Prisma SQL migrations under `apps/api/prisma/migrations/`, named
`<timestamp>_<description>` and applied in order. There are **58** of them, from
`20260301224907_add_password_auth` (initial password auth) through the
`full_real_backend` baseline, the phased feature drops
(`add_phase1_…` … `add_phase4_…`), the RLS and refresh-token-rotation hardening,
and the AI subsystem rollout (chat, memory, FinOps, eval lab, simulation,
transcript compliance).

`apps/api/CLAUDE.md` rule 30 requires that **every** schema change ship with a
matching migration — generate the SQL with
`prisma migrate diff … --script`, create the migration directory + `migration.sql`,
and update the seed if new tables need default data. Permission migrations must
use the `WHERE NOT EXISTS` insert pattern (not `ON CONFLICT ("key")`) because the
unique constraint is the compound `(tenantId, key)` (rules 85–86).

Migration commands (run from `apps/api`, or via the root wrappers in
`AGENTS.md` §4 — `pnpm prisma:generate` / `:migrate` / `:seed`):

| Script                | Command                                                        |
| --------------------- | -------------------------------------------------------------- |
| `prisma:generate`     | `prisma generate`                                              |
| `prisma:migrate`      | `prisma migrate dev` (local dev, creates migrations)           |
| `prisma:migrate:prod` | resolve-failed-migrations helper, then `prisma migrate deploy` |
| `prisma:seed`         | `prisma db seed`                                               |
| `prisma:studio`       | `prisma studio`                                                |

The `start*` scripts in `apps/api/package.json` chain
`prisma:generate → prisma:migrate:prod → prisma:seed` before launching Nest, so a
container comes up with an up-to-date, seeded schema.

> Note: the workspace is mid-upgrade — prefer reading these scripts over running
> `pnpm` here. See [`MONOREPO.md`](MONOREPO.md) and
> [`../MONOREPO_MIGRATION.md`](../MONOREPO_MIGRATION.md).

## Seeding

`prisma db seed` runs `ts-node prisma/seed.ts` (configured in `prisma.config.ts`).
The seed is **idempotent** as required by `apps/api/CLAUDE.md` (rules 15, 54): it
uses `upsert` / `createMany({ skipDuplicates: true })`, deterministic UUIDs
(SHA-256-derived) and counters so re-running never duplicates or crashes.

`main()` seeds, in order:

1. **System data (global)** — `seedPermissionDefinitions()` (the permission
   catalog, `tenantId = NULL`) and `seedReportTemplates()` (system
   `ReportTemplate` rows).
2. **Platform admin** — `platform-admin@auraspear.io`, a true `GLOBAL_ADMIN`
   with `isProtected: true`, given a `TenantMembership` on **every** tenant plus
   a `UserPreference` and a seeded `UserSession` / refresh-token family.
3. **Three demo tenants** — `Aura Finance`, `Aura Health`, `Aura Enterprise`,
   each with its own "personality" (alert counts, connector set, hunt/IOC mix).
   Per tenant the seed populates users + memberships + role permissions, then
   connectors, alerts, cases/cycles, hunts, intel, incidents, correlation &
   detection rules, vulnerabilities, AI agents, UEBA, attack paths, SOAR,
   compliance, reports, system health/metrics, normalization, cloud security,
   entities, and notifications.

Secrets/passwords are **not** baked in:

- `SEED_DEFAULT_PASSWORD` is a **required** env var (`requireEnv` throws if
  missing — rule 54, no fallback weak password); seeded passwords are bcrypt
  hashed with 12 rounds.
- Connector credentials read from `SEED_*` env vars and fall back only to
  obvious placeholders (`CHANGE_ME_NOT_A_REAL_PASSWORD`), never real secrets;
  configs are encrypted with the same AES-256-GCM utility used at runtime.

See [`ENVIRONMENT.md`](../ENVIRONMENT.md) for the seed env vars and
[`SECURITY.md`](../SECURITY.md) for protected-user / credential rules.

## Related docs & rules

- [`AGENTS.md`](../../AGENTS.md) — entry point, command map (§4), security invariants (§6).
- [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — backend hard rules (tenancy, migrations, seeding, indexing-for-sort).
- [`BACKEND.md`](BACKEND.md) · [`RUNTIME.md`](RUNTIME.md) · [`API.md`](API.md) · [`MONOREPO.md`](MONOREPO.md) — sibling architecture docs.
- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) · [`../SECURITY.md`](../SECURITY.md) · [`../AI.md`](../AI.md) · [`../ENVIRONMENT.md`](../ENVIRONMENT.md).
- [`skills/backend/add-prisma-model.md`](../../skills/backend/add-prisma-model.md) · [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md) — step-by-step recipes.
- [`docs/audit/`](../audit/) — the database audit/file-map references.
