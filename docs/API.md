# AuraSpear API Reference

The AuraSpear backend (`@auraspear/api`) is a NestJS 11 multi-tenant SIEM
Backend-for-Frontend (BFF). The Next.js frontend never calls Wazuh / OpenSearch /
MISP directly — it proxies every request through this API.

> All claims below are derived from the source under `apps/api/src`. Route
> prefixes are taken verbatim from each controller's `@Controller(...)` decorator;
> the endpoint catalogue is **not** exhaustive per-route, it lists the real
> controller areas and their base paths.

---

## Base Path

Every route is served under the global prefix `api/v1`, set in
[`apps/api/src/main.ts`](../apps/api/src/main.ts):

```ts
app.setGlobalPrefix('api/v1', { exclude: ['/'] })
```

So a controller declared as `@Controller('cases')` is reached at:

```
/api/v1/cases
```

The root route `/` is excluded from the prefix.

The local dev server listens on `PORT` (default **4000**), so a full local URL is
typically `http://localhost:4000/api/v1/...`.

---

## Authentication & Headers

Auth is enforced by the guard chain `AuthGuard → TenantGuard (→ RolesGuard / permission checks)`.
See [`apps/api/src/common/guards/auth.guard.ts`](../apps/api/src/common/guards/auth.guard.ts).

### `Authorization: Bearer <accessToken>`

The access token is extracted from the `Authorization` header (`Bearer ` prefix).
If the header is absent, the guard falls back to the HttpOnly `access_token` cookie.
A missing/invalid token yields a `401` with `messageKey: errors.auth.missingToken`
(or `errors.auth.expiredToken` for a failed verification).

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

Access tokens are short-lived (`15m`); refresh tokens (`7d`) rotate via
`POST /api/v1/auth/refresh`. Both carry `jti` and `tokenType` claims and are
checked against a Redis blacklist on every request.

### `X-Tenant-Id: <tenantId>` (GLOBAL_ADMIN tenant switching)

The auth guard reads the optional `X-Tenant-Id` header. For a `GLOBAL_ADMIN`,
supplying a valid tenant id overrides `request.user.tenantId`, so the
`@TenantId()` decorator (and every tenant-scoped query) operates against the
switched tenant. Non–GLOBAL_ADMIN users **cannot** switch tenants; the header is
ignored for them. The same header is honoured on `POST /auth/refresh` to mint a
token scoped to the requested tenant.

```http
X-Tenant-Id: 6f1c2b8e-...-9a3d
```

### CSRF / cookies

Auth can also flow through HttpOnly cookies (`access_token`, `refresh_token`).
A CSRF token is issued on login/refresh; controllers may opt out with the
`@SkipCsrf()` decorator (e.g. `login`, `refresh`).

### Other headers

`X-Request-ID` is generated (UUID) if not provided and echoed back on the
response by middleware in `main.ts`.

---

## Error Format

All errors flow through `GlobalExceptionFilter`
([`http-exception.filter.ts`](../apps/api/src/common/filters/http-exception.filter.ts))
and are shaped by `buildErrorResponse`
([`http-exception.utilities.ts`](../apps/api/src/common/filters/http-exception.utilities.ts)).

Every error response has this JSON body:

```json
{
  "statusCode": 404,
  "message": "Case not found",
  "messageKey": "errors.cases.notFound",
  "error": "Not Found",
  "timestamp": "2026-06-19T12:34:56.000Z",
  "path": "/api/v1/cases/123",
  "errors": ["errors.validation.title.required"]
}
```

| Field        | Notes                                                                                |
| ------------ | ------------------------------------------------------------------------------------ |
| `statusCode` | HTTP status code.                                                                    |
| `message`    | Human-readable message, **sanitized** — file paths stripped, truncated to 500 chars. |
| `messageKey` | i18n key the frontend resolves via `t(messageKey)`. Always present.                  |
| `error`      | Short error label (e.g. `Not Found`, `Bad Request`).                                 |
| `timestamp`  | ISO timestamp.                                                                       |
| `path`       | Request path with the query string stripped.                                         |
| `errors`     | Optional array of per-field validation message keys (present on Zod failures).       |

### `messageKey` convention

Business errors use `BusinessException` with a key shaped as
`errors.<module>.<specificKey>`, for example:

- `errors.auth.invalidCredentials`
- `errors.auth.missingToken`
- `errors.connectors.notFound`
- `errors.cases.notFound`

Validation (Zod) failures map each issue to
`errors.validation.<field>.<reason>` (e.g. `errors.validation.title.required`,
`errors.validation.sortBy.invalidOption`, `errors.validation.email.tooLong`). The
first issue becomes the top-level `messageKey`; all issues are listed in `errors`.

Internal/database errors return generic keys and never leak table, column, path,
or stack details: `errors.internalError`, `errors.badRequest`,
`errors.serviceUnavailable`.

---

## Pagination

List endpoints use page/limit query parameters validated by a Zod schema
(e.g. [`list-cases-query.dto.ts`](../apps/api/src/modules/cases/dto/list-cases-query.dto.ts)).
The common shape:

| Param       | Type | Default    | Constraints                          |
| ----------- | ---- | ---------- | ------------------------------------ |
| `page`      | int  | `1`        | `min 1`, `max 10000`                 |
| `limit`     | int  | `20`       | `min 1`, `max 500`                   |
| `sortBy`    | enum | per module | must be a registered sortable column |
| `sortOrder` | enum | `desc`     | `asc` / `desc`                       |

Query strings are parsed explicitly (`Schema.parse(rawQuery)`) rather than bound
directly to a DTO type, with numeric coercion. Paginated responses return the
page slice plus pagination metadata (e.g. `PaginatedCases`).

An invalid `sortBy` returns `400` with `errors.validation.sortBy.invalidOption`.

---

## Rate Limiting

Global throttling is provided by `ThrottlerModule` + `ThrottlerGuard`
(`apps/api/src/app.module.ts`). The global default is `RATE_LIMIT_THROTTLE_LIMIT`
requests per `RATE_LIMIT_THROTTLE_TTL` ms, defaulting to **250 requests / 60 s**.

Controllers and individual routes tighten this with `@Throttle({ default: { limit, ttl } })`.
The standard tiers (per the project rules, applied across controllers) are:

| Tier              | Limit / window | Example usage                                                      |
| ----------------- | -------------- | ------------------------------------------------------------------ |
| Auth              | **5 / 60 s**   | `POST /auth/login`, `POST /auth/end-impersonation`                 |
| Auth (refresh)    | **8 / 60 s**   | `POST /auth/refresh`                                               |
| Auth (logout)     | **10 / 60 s**  | `POST /auth/logout`                                                |
| Standard CRUD     | **30 / 60 s**  | controller-level on `cases`, `alerts`, `entities`, `notifications` |
| Delete operations | **10 / 60 s**  | `DELETE` routes (e.g. case/comment/task/artifact deletes)          |
| AI endpoints      | **10 / 60 s**  | AI controllers (e.g. `osint`)                                      |
| Bulk operations   | **5 / 60 s**   | bulk / connector-test style routes                                 |

(Exact values are read from each controller's `@Throttle()` decorator; the table
reflects the patterns confirmed in `auth.controller.ts`, `cases.controller.ts`,
`alerts.controller.ts`, `entities.controller.ts`, `notifications.controller.ts`,
and `osint-executor.controller.ts`.)

---

## Swagger / OpenAPI

Swagger is built with `DocumentBuilder` in `main.ts` and is **only mounted when
`NODE_ENV === 'development'`**:

```
/api/docs
```

It is titled "AuraSpear SOC BFF", includes Bearer auth (`addBearerAuth()`), and
tags: `auth`, `tenants`, `connectors`, `alerts`, `dashboards`, `hunts`, `cases`,
`intel`, `ai`, `health`. In production no Swagger UI is exposed.

---

## Endpoint Areas

The areas below are the real controllers under
`apps/api/src/modules/**/*.controller.ts`, grouped by base path (the
`@Controller('...')` value, served under `/api/v1`). Controllers whose name
starts with `ai-` (or that share a base path with a primary controller) provide
AI-assisted routes on the same area.

### Auth & Identity

| Base path        | Controller                    | Area                                                 |
| ---------------- | ----------------------------- | ---------------------------------------------------- |
| `/auth`          | `auth.controller.ts`          | Login, refresh, logout, `me`, tenants, impersonation |
| `/tenants`       | `tenants.controller.ts`       | Tenant management & tenant users                     |
| `/users`         | `users.controller.ts`         | User profile & preferences                           |
| `/users-control` | `users-control.controller.ts` | User administration (block/restore/etc.)             |
| `/role-settings` | `role-settings.controller.ts` | Role & permission configuration                      |

### Alerts, Cases & Incidents

| Base path      | Controller(s)                                           | Area                                                 |
| -------------- | ------------------------------------------------------- | ---------------------------------------------------- |
| `/alerts`      | `alerts.controller.ts`, `ai-alert-triage.controller.ts` | Alert search, investigation, AI triage               |
| `/cases`       | `cases.controller.ts`, `ai-case-copilot.controller.ts`  | Cases, notes, comments, tasks, artifacts, AI copilot |
| `/case-cycles` | `case-cycles.controller.ts`                             | Case cycle (sprint-style) management                 |
| `/incidents`   | `incidents.controller.ts`                               | Incident management                                  |
| `/correlation` | `correlation.controller.ts`                             | Alert/event correlation                              |

### Threat Hunting, Detection & Intel

| Base path          | Controller(s)                                                         | Area                             |
| ------------------ | --------------------------------------------------------------------- | -------------------------------- |
| `/hunts`           | `hunts.controller.ts`                                                 | Threat hunting runs              |
| `/detection-rules` | `detection-rules.controller.ts`, `ai-detection-copilot.controller.ts` | Detection rule CRUD & AI copilot |
| `/rules-engine`    | `rules-engine.controller.ts`                                          | Rules engine                     |
| `/ti`              | `intel.controller.ts`                                                 | Threat intelligence (MISP/IOCs)  |
| `/intel`           | `ai-intel.controller.ts`                                              | AI threat intelligence           |
| `/attack-paths`    | `attack-paths.controller.ts`, `ai-attack-path.controller.ts`          | Attack path analysis (+ AI)      |
| `/osint`           | `osint-executor.controller.ts`                                        | OSINT execution                  |

### Entities, UEBA & Vulnerabilities

| Base path          | Controller(s)                                                     | Area                            |
| ------------------ | ----------------------------------------------------------------- | ------------------------------- |
| `/entities`        | `entities.controller.ts`, `ai-entity.controller.ts`               | Entity inventory (+ AI)         |
| `/ueba`            | `ueba.controller.ts`, `ai-ueba.controller.ts`                     | User/entity behavior analytics  |
| `/vulnerabilities` | `vulnerabilities.controller.ts`, `ai-vulnerability.controller.ts` | Vulnerability management (+ AI) |
| `/cloud-security`  | `cloud-security.controller.ts`, `ai-cloud-security.controller.ts` | Cloud security posture (+ AI)   |
| `/compliance`      | `compliance.controller.ts`                                        | Compliance                      |

### SOAR & Automation

| Base path       | Controller(s)                                                              | Area                        |
| --------------- | -------------------------------------------------------------------------- | --------------------------- |
| `/soar`         | `soar.controller.ts`, `ai-soar.controller.ts`                              | SOAR playbooks (+ AI)       |
| `/jobs`         | `jobs.controller.ts`                                                       | Async job management        |
| `/agent-config` | `agent-config.controller.ts`, `ai/orchestrator/orchestrator.controller.ts` | Agent configuration         |
| `/ai-agents`    | `ai-agents.controller.ts`, `ai/orchestrator/agent-graph.controller.ts`     | AI agent management & graph |

### Connectors & Data Ingestion

| Base path               | Controller(s)                                                     | Area                     |
| ----------------------- | ----------------------------------------------------------------- | ------------------------ |
| `/connectors`           | `connectors.controller.ts`                                        | Connector CRUD & testing |
| `/connector-workspaces` | `connector-workspaces.controller.ts`                              | Connector workspaces     |
| `/connector-sync`       | `connector-sync.controller.ts`                                    | Connector sync           |
| `/llm-connectors`       | `connectors/llm-connectors/llm-connectors.controller.ts`          | LLM connector config     |
| `/ai-connectors`        | `connectors/llm-connectors/ai-available-connectors.controller.ts` | Available AI connectors  |
| `/normalization`        | `normalization.controller.ts`, `ai-normalization.controller.ts`   | Log normalization (+ AI) |
| `/data-explorer`        | `data-explorer.controller.ts`                                     | Ad-hoc data exploration  |

### Dashboards, Reports & Knowledge

| Base path          | Controller(s)                                                 | Area                      |
| ------------------ | ------------------------------------------------------------- | ------------------------- |
| `/dashboards`      | `dashboards.controller.ts`, `ai-dashboard.controller.ts`      | Dashboards (+ AI)         |
| `/dashboards/mssp` | `mssp-dashboard.controller.ts`                                | MSSP dashboard            |
| `/reports`         | `reports.controller.ts`, `reports/ai/ai-report.controller.ts` | Reporting (+ AI)          |
| `/runbooks`        | `knowledge.controller.ts`                                     | Runbooks / knowledge base |
| `/runbooks/ai`     | `ai-knowledge.controller.ts`                                  | AI runbook assistance     |

### AI Platform

| Base path         | Controller                                                                | Area                                  |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| `/ai`             | `ai/ai.controller.ts`, `ai/writeback/ai-schedule-templates.controller.ts` | Core AI analysis & schedule templates |
| `/ai/findings`    | `ai/writeback/ai-writeback.controller.ts`                                 | AI finding writeback                  |
| `/ai/schedules`   | `ai/orchestrator/schedule/schedule.controller.ts`                         | AI schedules                          |
| `/ai-handoffs`    | `ai/writeback/ai-handoff.controller.ts`                                   | AI handoffs                           |
| `/ai-chat`        | `ai/chat/ai-chat.controller.ts`                                           | AI chat                               |
| `/ai-transcripts` | `ai/chat/ai-transcript.controller.ts`                                     | AI chat transcripts                   |
| `/ai-ops`         | `ai/ai-ops-workspace.controller.ts`                                       | AI ops workspace                      |
| `/ai-prompts`     | `ai/prompt-registry/prompt-registry.controller.ts`                        | Prompt registry                       |
| `/ai-features`    | `ai/feature-catalog/feature-catalog.controller.ts`                        | AI feature catalog                    |
| `/ai-eval`        | `ai/eval/ai-eval.controller.ts`                                           | AI evaluation                         |
| `/ai-simulations` | `ai/simulation/ai-simulation.controller.ts`                               | AI simulations                        |
| `/ai-search`      | `ai/semantic-search/semantic-search.controller.ts`                        | Semantic search                       |
| `/ai-usage`       | `ai/usage-budget/usage-budget.controller.ts`                              | AI usage & token budgets              |
| `/user-memory`    | `ai/memory/user-memory.controller.ts`                                     | Per-user AI memory                    |
| `/rag`            | `ai/memory/rag-observability.controller.ts`                               | RAG observability                     |

### Platform, Observability & Notifications

| Base path        | Controller                    | Area                               |
| ---------------- | ----------------------------- | ---------------------------------- |
| `/health`        | `health.controller.ts`        | Health checks (public, no version) |
| `/system-health` | `system-health.controller.ts` | System health detail               |
| `/audit-logs`    | `audit-logs.controller.ts`    | Audit log access                   |
| `/app-logs`      | `app-logs.controller.ts`      | Application logs                   |
| `/notifications` | `notifications.controller.ts` | Notifications                      |

---

## Notes

- Authorization on protected endpoints is permission-based via
  `@RequirePermission(Permission.MODULE_ACTION)`; permissions are stored in the
  database and `GLOBAL_ADMIN` always passes. The `@Roles()` decorator is used on
  the `role-settings` controller and on connector mutation routes.
- Health endpoints are `@Public()` and deliberately omit the application version.
- All mutations are audit-logged via the `AuditInterceptor`, with sensitive keys
  (passwords, tokens, secrets, encrypted configs) redacted.
