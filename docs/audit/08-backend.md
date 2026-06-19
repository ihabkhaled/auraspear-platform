# Audit 08 — Backend (`@auraspear/api`, NestJS 11)

Scope: controllers, services, repositories, DTOs, guards, interceptors, filters,
strict layering, tenant scoping, validation, connectors, AI subsystem, jobs, and
WebSocket. Based on `apps/api/CLAUDE.md` and a read of `apps/api/src/modules` +
`apps/api/src/common`.

## Overview

The API is a Backend-for-Frontend (BFF) built on NestJS 11 with a deliberately
strict, documented architecture (`apps/api/CLAUDE.md`, ~850 lines, 100+ "ABSOLUTE
RULES"). The layering is **Controller → Service → Repository → Prisma**, with all
business logic pushed into `*.utilities.ts` files, all types into `*.types.ts`,
enums into `*.enums.ts`, and constants into `*.constants.ts`. Validation uses Zod
(no class-validator). The codebase is large: ~50 modules under `src/modules`,
73 controllers, 96 services, 47 repositories, 1 WebSocket gateway, 1 job
processor.

Cross-cutting concerns are wired globally in `app.module.ts` via `APP_GUARD` /
`APP_INTERCEPTOR`:

```
ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard
+ AuditInterceptor (global)
+ GlobalExceptionFilter (catch-all)
```

## Layers

### Controllers (`*.controller.ts`)

Controllers are thin and conform to the documented contract: extract params,
validate, delegate to one service method, return. Example — `cases.controller.ts`:
`@UseGuards(AuthGuard, TenantGuard)` + per-controller `@Throttle({ limit: 30,
ttl: 60000 })`, each endpoint carries `@RequirePermission(Permission.CASES_*)`,
mutations carry `@Body(new ZodValidationPipe(Schema))`, and the delete endpoint
narrows throttling to `{ limit: 10 }`. Query DTOs are parsed manually inside the
handler (`ListCasesQuerySchema.parse(rawQuery)`) per rule 19, avoiding the
unsafe `@Query()`-with-DTO pattern. Tenant identity comes from `@TenantId()` /
`@CurrentUser()`, never from client headers.

### Services (`*.service.ts`)

Services are mostly thin orchestrators. `OrchestratorService`
(`ai/orchestrator/orchestrator.service.ts`) reads like the documented "recipe":
resolve agent → `canAgentExecute` (enabled → quota → budget) → `resolveAutomationMode`
→ `enqueueAgentJob` → conditionally `createApprovalRecord`, with all checks
delegated to small private helpers and `*.utilities.ts`/`*.constants.ts`.
`ConnectorsService` validates the encryption key in its constructor and fails
loudly if `CONFIG_ENCRYPTION_KEY` is not 64 hex chars (rules 24/31/53).

### Repositories (`*.repository.ts`)

Repositories are pure data access. Tenant-scoped mutation patterns are followed
in the audited modules: `alerts.repository.ts` and `vulnerabilities.repository.ts`
use `updateMany({ where: { id, tenantId } })`; `cloud-security.repository.ts`
takes `where: { id, tenantId }` for deletes. The repository accepts fully-built
Prisma params and returns raw results, with no `BusinessException` / conditionals.

### DTOs (`dto/*.dto.ts`)

Zod schemas with `.max()` bounds, inferred types co-located. Connector configs
use **per-type** schemas selected by `validateConnectorConfig(type, config)`
(`connectors/dto/connector.dto.ts`) per rule 39.

## Guards / Interceptors / Filters

- **AuthGuard** (`common/guards/auth.guard.ts`): verifies the access token
  (header `Bearer` or HttpOnly `access_token` cookie), runs `validateUserActive`,
  builds the user context via `resolveAuthorizedTenantContext` (which performs the
  GLOBAL_ADMIN `X-Tenant-Id` switch), and touches session activity. All failures
  funnel to `BusinessException(401, …, 'errors.auth.*')`. No `NODE_ENV` bypass.
- **TenantGuard**: rejects requests lacking `user.tenantId` with
  `errors.auth.tenantRequired`.
- **PermissionsGuard** (`common/guards/permissions.guard.ts`): reads
  `@RequirePermission()`, short-circuits for `GLOBAL_ADMIN`, otherwise resolves
  the role's permission set from `RoleSettingsService` and requires all. Supports
  the `@AllowCaseOwner()` bypass.
- **AuditInterceptor** (`common/interceptors/audit.interceptor.ts`): on mutation
  methods, writes a tenant-scoped `auditLog` row after success, redacting
  sensitive body fields via `redactSensitiveFields` and truncating details to
  2000 chars. Failures to write are logged, not thrown.
- **GlobalExceptionFilter** (`common/filters/http-exception.filter.ts` +
  `http-exception.utilities.ts`): maps `HttpException`, `ZodError`, and the three
  Prisma error classes (`PrismaClientKnownRequestError`,
  `…ValidationError`, `…InitializationError`) to generic, `messageKey`-bearing
  responses. `sanitizeMessage()` strips Windows/Unix file paths and truncates to
  500 chars. Prisma errors return `"A database error occurred"` with no table /
  column leakage (rules 63/77/82).
- **ZodValidationPipe** (`common/pipes/zod-validation.pipe.ts`): converts Zod
  issues into field-specific i18n keys (`issueToMessageKey`) and throws
  `BusinessException(400, …)` carrying the full key list.

## Tenant Scoping

Tenant isolation is the strongest theme. The auth guard resolves an authoritative
tenant context per request; `@TenantId()` reflects GLOBAL_ADMIN switching
transparently; repositories thread `tenantId` through `where` clauses; the audit
interceptor and job processor stamp `tenantId` on every record/log. The job
processor carries `job.tenantId` through every state transition and log entry.

## Connectors

`ConnectorsService.create()` follows the documented secure path: duplicate guard
→ `validateConnectorConfig(type, config)` (per-type Zod) → SSRF validation of
every URL field via `resolveAndValidateUrl` (`common/utils/ssrf.utility.ts`,
validated at **input** time per rule 59) → `encrypt(JSON.stringify(config),
encryptionKey)` (AES-256-GCM) before persistence. Adapter services
(`connectors/services/*.ts`: wazuh, opensearch, misp, shuffle, bedrock, grafana,
graylog, logstash, influxdb, velociraptor, openclaw-gateway, llm-apis) go through
the shared `AxiosService` with explicit `rejectUnauthorized` derived from
`config.verifyTls`. Wazuh tokens are cached in-memory with TTL.

## AI Subsystem

The AI area is the largest and most complex part of the backend, spanning `ai/`
(chat, eval, memory, orchestrator, prompt-registry, semantic-search, simulation,
usage-budget, writeback, feature-catalog), `ai-agents/`, and `agent-config/`.

- **Provider cascade** (`ai/ai.service.ts`): `tryConnectorsInOrder()` recursively
  attempts **all** available connectors before returning `undefined` (rule-based
  fallback only when all fail or none configured), matching rule 88. Connector
  selection respects an explicit requested connector and throws if requested but
  unavailable.
- **Orchestration** (`ai/orchestrator/orchestrator.service.ts`): central
  `dispatchAgentTask` validates enabled → quota → monthly budget
  (`UsageBudgetService`) → automation mode → approval requirement, enqueues an
  `AI_AGENT_TASK` job with an idempotency key, and persists an approval record
  when required (rules 97/98/32). Event listeners are fire-and-forget via
  `@Optional()` + `forwardRef`.
- **Config validation**: agent IDs resolve through `resolveExecutionAgent` and the
  `AiAgentId` enum; OSINT sources have dedicated DTOs and constants files.

## Jobs

`JobProcessorService` (`jobs/job-processor.service.ts`) is a well-built polling
worker: Redis-backed distributed locks (`SET NX EX`), bounded concurrency from
config, `@Interval` polling that is **skipped and logged** when Redis is
disconnected (tracks `connect`/`error`/`close` events per rule 90), and a
separate `@Interval` stale-job recovery that resets RUNNING jobs older than
`STALE_RUNNING_WINDOW_MS` back to PENDING (rule 91). Handlers
(`jobs/handlers/*.ts`) cover connector-sync, correlation, detection-execution,
hunt-execution, memory-extraction, normalization, report-generation, and
soar-playbook. Permanent failures fire a fire-and-forget AI notification.

## WebSocket

`NotificationsGateway` (`notifications/notifications.gateway.ts`) authenticates
on `handleConnection` using the same `AuthService.verifyAccessToken` +
`resolveAuthorizedTenantContext` as HTTP, disconnects unauthenticated sockets,
and joins a per-user `tenant:userId` room so emits are scoped to a single user in
a single tenant. CORS origins are parsed from `CORS_ORIGINS` and filtered to valid
http(s) URLs, satisfying the intent of rule 84 (matching HTTP CORS source).

---

## Strengths

1. **Exceptionally disciplined, documented architecture.** The
   Controller → Service → Repository → Utilities layering, enum-only string
   literals, dedicated home files for types/enums/constants, and 100+ enforced
   rules give the codebase unusual consistency for its size.
2. **Strong tenant isolation by construction.** Auth-guard-resolved tenant
   context, `@TenantId()` GLOBAL_ADMIN switching, tenant-scoped
   `updateMany`/`deleteMany` patterns, tenant-scoped audit logging, and per-user
   WebSocket rooms.
3. **Defense-in-depth security.** Global guard chain (throttle → auth → csrf →
   tenant → roles → permissions), per-type connector validation + input-time SSRF
   checks + AES-256-GCM encryption at rest, path-sanitizing exception filter that
   never leaks Prisma internals, token blacklist + refresh rotation.
4. **Robust async infrastructure.** Job processor with Redis locks, Redis
   connection-state awareness, stale-job recovery, idempotency keys, and an AI
   provider cascade with graceful rule-based fallback.
5. **Consistent error contract.** Every error returns a `messageKey` for i18n,
   produced by both `ZodValidationPipe` and `GlobalExceptionFilter`.

## Gaps

1. **Layering violation: services importing `PrismaService` directly.** 12 service
   files inject `PrismaService` and call `this.prisma.*` instead of going through a
   repository, contradicting the "NEVER import PrismaService in services" rule.
   Concentrated in the newer AI subsystem and the job scheduler:
   `ai/memory/user-memory.service.ts` (and `memory-extraction`,
   `memory-retrieval`, `rag-observability`), `ai/eval/ai-eval.service.ts`,
   `ai/simulation/ai-simulation.service.ts`, `ai/chat/ai-transcript.service.ts`,
   `ai/semantic-search/semantic-search.service.ts`,
   `ai/ai-ops-workspace.service.ts`, `ai/writeback/ai-handoff.service.ts`,
   `ai/orchestrator/agent-graph.service.ts`, and `jobs/job-scheduler.service.ts`.
   These need repository extraction to match the rest of the codebase.

2. **Un-tenant-scoped `update`/`delete` where clauses in some repositories.**
   Several repository mutations key only on `id`, relying on the service to have
   pre-validated tenant ownership rather than scoping in the query (rules 26 / 33 /
   audit-rule 21 ask for `tenantId` in every `update`/`delete` where clause):
   - `ai-agents/ai-agents.repository.ts`: `updateSessionProviderInfo` and
     `markSessionFailed` (`aiAgentSession.update({ where: { id } })`), and
     `updateTool`/`deleteTool` (`aiAgentTool.update/delete({ where: { id } })`).
   - `attack-paths/attack-paths.repository.ts`: `deleteMany(where)` and
     `updateMany(params)` pass the `where` straight through, so tenant scoping
     depends entirely on the caller building it.
     These are not confirmed cross-tenant bugs, but they break the
     "scope every mutation in the repository" defense-in-depth guarantee.

3. **Permissions-guard case-owner bypass is not tenant-scoped.**
   `permissions.guard.ts` resolves the `@AllowCaseOwner()` bypass via
   `prisma.case.findUnique({ where: { id: caseId } })` with no `tenantId`. A
   GLOBAL_ADMIN-switched or cross-tenant `:id` could match an owner check outside
   the current tenant context. The downstream service still scopes by tenant, but
   the guard itself should include `tenantId` in the lookup.

4. **Date-handling rule violations in the orchestrator.**
   `OrchestratorService.createApprovalRecord` uses raw `new Date()` +
   `expiresAt.setHours(...)` instead of the mandated `date-time.utility.ts`
   helpers (`nowDate`, `expiresInSeconds`, etc.) required by audit rule 35.

5. **Doc/code divergence on connector RBAC.** CLAUDE.md rule 55 states connector
   create/update/toggle must use `@Roles(UserRole.TENANT_ADMIN)`, but
   `connectors.controller.ts` enforces `@RequirePermission(Permission.CONNECTORS_*)`
   instead. This reflects the documented migration to the permission model (rule 25
   supersedes `@Roles()`), so it is likely intentional — but the two rules conflict
   and the documentation should be reconciled so reviewers don't flag a false gap.

6. **Approval-record creation swallows failures.**
   `OrchestratorService.createApprovalRecord` wraps persistence in a try/catch that
   only logs a warning on failure. Rule 97 requires an `ApprovalRequest` record to
   exist _before_ execution; a silently-failed approval write while the job is
   already enqueued could let an approval-required action proceed without a
   persisted approval. Worth tightening to fail the dispatch if the approval write
   fails.

## Notes / Uncertainties

- Read budget was limited (~12 files) over a ~50-module backend; findings are based
  on the cross-cutting `common/` layer plus representative samples (cases,
  connectors, ai, ai-agents, orchestrator, jobs, notifications). The
  Prisma-in-service and un-scoped-mutation findings come from repository-wide greps
  and are reliable counts/locations, but each flagged service/repository was not
  read end-to-end.
- Whether the un-tenant-scoped repository mutations are exploitable depends on the
  calling services consistently pre-validating tenant ownership, which was not
  exhaustively verified.
