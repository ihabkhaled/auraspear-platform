# AuraSpear Platform — Architecture

AuraSpear is a multi-tenant SOC (Security Operations Center) / SIEM platform built as a
**Backend-for-Frontend (BFF)**: the Next.js web app never talks to upstream security tools
(Wazuh, OpenSearch, MISP, Shuffle, …) directly — it proxies through the NestJS API, which owns
all credentials, tenant scoping, and integration logic.

> Sources for this document are the actual code under `apps/api/src`, `apps/web/src`,
> `apps/api/prisma/schema.prisma`, `infra/docker`, `.github/workflows`, and the two
> `apps/*/CLAUDE.md` guides. Where the code and the CLAUDE guides diverged, the code wins.

---

## 1. Monorepo Layout

Managed by **pnpm workspaces** (`pnpm-workspace.yaml`) + **Turborepo** (`turbo.json`).

| Path              | Package             | Stack                   | Role                                                                                                  |
| ----------------- | ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `apps/web`        | `@auraspear/web`    | Next.js 16 (App Router) | Frontend + Next.js API proxy routes                                                                   |
| `apps/api`        | `@auraspear/api`    | NestJS 11 + Prisma      | BFF / SIEM backend                                                                                    |
| `packages/shared` | `@auraspear/shared` | TS                      | Shared code (`src/index.ts`)                                                                          |
| `packages/config` | `@auraspear/config` | TS                      | Shared config                                                                                         |
| `packages/ai`     | `@auraspear/ai`     | TS                      | AI helpers: `model-router.ts`, `prompts.ts`, `redaction.ts`, `safety.ts`, `evaluators.ts`, `types.ts` |
| `infra/docker`    | —                   | Compose                 | Base / dev / prod / infra / connectors stacks                                                         |
| `scripts`, `docs` | —                   | —                       | Tooling and documentation                                                                             |

Workspace globs: `apps/*` and `packages/*`. Notable pnpm policies (`pnpm-workspace.yaml`):
`zod@4` is pinned to `4.4.3` (the web app uses Zod 4; the **api app intentionally stays on Zod 3.x**),
and `onlyBuiltDependencies` restricts install scripts to `@prisma/client`, `@prisma/engines`,
`prisma`, and `esbuild`.

Turbo tasks (`turbo.json`): `build`, `dev`, `lint`, `lint:strict`, `typecheck`, `test`,
`test:cov`, `test:e2e`, `format:check`. `build`/`lint`/`typecheck`/`test` all depend on `^build`.

---

## 2. Runtime

### API (`apps/api`)

- **NestJS 11**, TypeScript strict mode, structured logging via **nestjs-pino**.
- Bootstrap: `apps/api/src/main.ts`.
  - Global route prefix **`api/v1`** (root `/` excluded).
  - The app is created once and **cached** (`cachedApp`). It exports a default Vercel
    serverless `handler`, and also calls `app.listen()` for local/non-Vercel runs
    (`PORT` default **4000**, server timeout 120s).
  - `trust proxy = 1` so client IPs are correct behind Vercel / load balancers.
  - Body limits: `express.json({ limit: '1mb' })` + `urlencoded` 1mb.
  - **Swagger** is mounted at `api/docs` **only when `NODE_ENV === 'development'`**.
- **Prisma client** generator targets `["native", "rhel-openssl-3.0.x"]`; provider PostgreSQL.
- **Redis** is wired as a shared global module (`apps/api/src/redis`).
- API container `start` scripts run `prisma:generate → prisma:migrate:prod → prisma:seed`
  before starting Nest (`apps/api/package.json`).

### Web (`apps/web`)

- **Next.js 16 App Router**, route groups `(auth)` and `(portal)`.
- The browser Axios client (`apps/web/src/lib/api.ts`) points at `NEXT_PUBLIC_API_URL ?? '/api'`,
  i.e. it calls **Next.js route handlers under `src/app/api/`**, not the backend directly.
- Those route handlers proxy to NestJS via `proxyToBackend()` (`apps/web/src/lib/backend-proxy.ts`)
  using `backendClient` whose `BACKEND_URL = process.env['BACKEND_API_URL'] ?? 'http://localhost:4000/api/v1'`
  (`apps/web/src/lib/backend-client.ts`). The proxy forwards the `Authorization` header, query
  params, and applies `no-store` cache headers.

> Note: the web `CLAUDE.md` references a `src/middleware.ts` for route protection; no such file
> currently exists in `apps/web/src`. Auth gating is enforced server-side by the backend guard
> chain and client-side by the auth store / Axios interceptor.

---

## 3. Authentication

Implemented in `apps/api/src/modules/auth/`. Two credential paths feed one internal JWT scheme.

### Email / password login (primary path in code)

- `POST /auth/login` (`auth.controller.ts`) — `@Public()`, `@SkipCsrf()`, rate-limited
  `5/min`, validated with `AuthLoginSchema` (Zod).
- Password check uses **bcryptjs** (`bcrypt.compare`, `auth.service.ts`).
- On success the service issues an **access token** and **refresh token**, sets them as
  **HttpOnly cookies** (`setAuthCookies`), and issues a **CSRF token** (`issueCsrfToken`).
  The response also returns `accessToken`, `csrfToken`, `user`, `permissions`, and the user's
  `tenants` list.

### OIDC

- OIDC config is **optional and all-or-nothing**, validated in `apps/api/src/config/env.validation.ts`:
  `OIDC_ISSUER_URL`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI`, `OIDC_CLIENT_ID` must all be set or all
  absent (Zod `.superRefine`). The env schema documents the **JWKS URI** for verifying provider
  tokens.
- `AuthService.findOrCreateUser(tenantId, oidcSub, email, name)` upserts a user by `oidcSub`
  and creates a tenant membership (default role `SOC_ANALYST_L1`) — the OIDC subject is the
  identity key (`auth.repository.upsertUserByOidcSub`).

### Internal JWT scheme

- Signed/verified with **`jsonwebtoken`** using **HS256** and `JWT_SECRET`
  (`JWT_SECRET` must be ≥64 hex chars and non-zero — enforced in `env.validation.ts`).
- Expiry: `JWT_ACCESS_EXPIRY` default **15m**, `JWT_REFRESH_EXPIRY` default **7d**.
- Every token carries a **`jti`** and a **`tokenType`** (`access` / `refresh`); verification
  asserts the expected `tokenType` (`auth.utilities.ts` `assertTokenType`).
- `JwtPayload` (`common/interfaces/authenticated-request.interface.ts`) includes
  `sub, email, tenantId, tenantSlug, role, jti` plus **impersonation** fields
  (`isImpersonated`, `impersonatorSub`, `impersonatorEmail`) and refresh-rotation fields
  (`family`, `generation`).

### Token lifecycle & revocation

- **Refresh**: `POST /auth/refresh` (`@Public`, `@SkipCsrf`, 8/min) — reads the refresh token
  from the `refresh_token` cookie or body, rotates it (family/generation tracked via
  `RefreshTokenFamily` / `RefreshTokenRotation` models), and re-issues cookies + CSRF.
- **Logout**: `POST /auth/logout` (10/min) blacklists tokens and clears cookies. JTI
  revocation is backed by Redis (`token-blacklist.service.ts`).
- **Impersonation**: `POST /auth/end-impersonation` (5/min) returns to the impersonator's session.
- **Profile / tenants**: `GET /auth/me` (returns `user` + `permissions`), `GET /auth/tenants`.

### Request-time validation (AuthGuard)

`apps/api/src/common/guards/auth.guard.ts`:

1. `@Public()` routes short-circuit.
2. Extract token from `Authorization: Bearer …` (preferred) **or** the `access_token` cookie.
3. `verifyAccessToken()` → then `validateUserActive(sub)` (rejects deleted/blocked users).
4. Build `request.user` via `resolveAuthorizedTenantContext()` (see tenant switching), and
   `touchSessionActivity()` to track session/last-seen.

---

## 4. Tenant Isolation

- Every JWT carries `tenantId` / `tenantSlug` / `role`. `@TenantId()` and `@CurrentUser()`
  decorators surface them to controllers.
- **TenantGuard** (`common/guards/tenant.guard.ts`) rejects any non-public request whose
  `user.tenantId` is missing (`errors.auth.tenantRequired`).
- **GLOBAL_ADMIN tenant switching**: the AuthGuard reads the **`X-Tenant-Id`** header and passes
  it to `AuthService.resolveAuthorizedTenantContext(decoded, headerTenantId)`, which overrides
  `request.user.tenantId/tenantSlug/role` when authorized. The web app sends this header from the
  tenant store via its Axios interceptor; the proxy forwards it.
- **Data scoping** is a hard rule throughout (`apps/api/CLAUDE.md`): every Prisma query is scoped
  by `tenantId`, and every `update()/delete()` must include `tenantId` in the `where` clause.
  Most domain models in `schema.prisma` carry a `tenantId` column.

---

## 5. RBAC — Roles, Hierarchy, and Permissions

### Roles (`common/interfaces/authenticated-request.interface.ts` + Prisma `UserRole` enum)

Twelve roles, ordered most→least privileged in `ROLE_HIERARCHY`:

1. `GLOBAL_ADMIN`
2. `PLATFORM_OPERATOR`
3. `TENANT_ADMIN`
4. `DETECTION_ENGINEER`
5. `INCIDENT_RESPONDER`
6. `THREAT_INTEL_ANALYST`
7. `SOAR_ENGINEER`
8. `THREAT_HUNTER`
9. `SOC_ANALYST_L2`
10. `SOC_ANALYST_L1`
11. `EXECUTIVE_READONLY`
12. `AUDITOR_READONLY`

`MembershipStatus` = `active | inactive | suspended` (soft-delete / block model).

### Two complementary guards

- **RolesGuard** (`roles.guard.ts`) — reads `@Roles(...)` metadata and grants access by
  **hierarchy position**: a user passes if their index in `ROLE_HIERARCHY` is **≤** any required
  role's index (i.e. equal or more privileged). Used for coarse role gating (e.g. connector
  mutations require `TENANT_ADMIN`).
- **PermissionsGuard** (`permissions.guard.ts`) — reads `@RequirePermission(Permission.X)` metadata
  (`common/decorators/permission.decorator.ts`). It:
  - lets **`GLOBAL_ADMIN` always pass**;
  - otherwise loads the role's permissions from `RoleSettingsService.getUserPermissions(tenantId, role)`
    (DB-backed, dynamic per tenant) and requires **all** listed permissions;
  - supports an **`@AllowCaseOwner()`** bypass — if the caller is the `ownerUserId` of the `Case`
    in `:id`, access is granted even without the permission.

Permissions are **dynamic and stored in the database** (`PermissionDefinition` + `RolePermission`
models). The `Permission` enum lives in `common/enums/permission.enum.ts` (~150+ permission
constants). Adding a permission is an end-to-end change spanning the enum, permission
definitions/defaults, the `@RequirePermission()` decorator, a Prisma migration, the frontend
permission mirror + proxy route, and i18n keys (per `CLAUDE.md` rule 85/34).

### Global guard chain (order matters)

Registered in `app.module.ts` as `APP_GUARD`s, executed in order:

```
ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard
```

An **AuditInterceptor** is registered globally (`APP_INTERCEPTOR`) to log mutations.

---

## 6. API Module Map (`apps/api/src/modules`, wired in `app.module.ts`)

40+ feature modules. By domain:

**Identity / tenancy / authz**
`auth`, `tenants`, `users`, `users-control`, `role-settings`, `audit-logs`, `app-logs`

**Connectors & data ingestion**
`connectors` (+ `connectors/llm-connectors`), `connector-workspaces`, `connector-sync`,
`data-explorer`, `normalization`

**Detection / SOC operations**
`alerts`, `correlation`, `detection-rules`, `cases`, `case-cycles`, `incidents`, `hunts`,
`intel`, `entities`, `ueba`, `attack-paths`, `vulnerabilities`, `cloud-security`, `compliance`,
`soar`, `knowledge`, `reports`

**AI**
`ai` (+ `ai/memory`), `ai-agents`, `agent-config`, `osint-executor`

**Platform / infra**
`dashboards`, `jobs`, `notifications`, `health`, `system-health`

Cross-cutting code lives under `apps/api/src/common/`:
`decorators/` (`@CurrentUser`, `@Roles`, `@RequirePermission`, `@Public`, `@TenantId`,
`@SkipCsrf`, `@AllowCaseOwner`), `guards/`, `interceptors/` (`AuditInterceptor`), `filters/`
(`GlobalExceptionFilter`), `pipes/` (`ZodValidationPipe`), `exceptions/` (`BusinessException`),
`enums/`, `interfaces/`, `services/` (`AppLoggerService`, `StartupHealthService`), `ocsf/`,
`middleware/`, `modules/websocket/`, and `utils/` (encryption, SSRF, masking, date-time).

---

## 7. Frontend Route Map (`apps/web/src/app`)

### Route groups

- **`(auth)`** — `login`, `callback`
- **`(portal)`** — authenticated shell (`(portal)/layout.tsx`). Pages include:

**Core SOC**: `dashboard` (+ `dashboard/mssp`), `alerts`, `cases` (+ `cases/[id]`, `cases/cycles`),
`incidents`, `hunt`, `intel`, `correlation`, `detection-rules`, `entities`, `ueba`,
`attack-paths`, `vulnerabilities`, `cloud-security`, `compliance`, `soar`, `knowledge`, `reports`,
`notifications`, `jobs`, `normalization`, `system-health`

**Connectors / data**: `connectors` (+ `connectors/[type]`, `connectors/llm`),
`explorer` (+ `automation`, `dashboards`, `endpoints`, `logs`, `metrics`, `pipelines`,
`sync-jobs`, `threat-intel`)

**AI surfaces**: `ai-agents`, `ai-agent-graph`, `ai-chat`, `ai-config`, `ai-eval`, `ai-findings`,
`ai-finops`, `ai-handoffs`, `ai-history`, `ai-memory`, `ai-ops`, `ai-rag`, `ai-search`,
`ai-simulations`, `ai-transcripts`

**Admin / account**: `admin/role-settings`, `admin/system`, `admin/tenant`,
`admin/users-control`, `profile`, `settings`

### Next.js API proxy routes (`apps/web/src/app/api/**`)

Every backend endpoint the frontend uses has a matching proxy route under `src/app/api/`
(e.g. `api/auth/{login,logout,refresh,me,tenants,end-impersonation}`, `api/alerts/[id]`,
`api/cases/[id]`, `api/connectors/{[type],ai-available,stats}`, `api/dashboard/*`,
`api/data-explorer/{grafana,graylog,influxdb,logstash,misp,shuffle,velociraptor,…}`,
`api/jobs/{[id],cancel-all,stats}`, `api/ai/*`, `api/ai-agents/*`, `api/role-settings/*`, …).
All delegate to `proxyToBackend()` / `fetchBackendJson()`. The PWA service worker is served via
`app/serwist/[path]`.

---

## 8. Database Ownership (Prisma)

- Single Prisma schema: `apps/api/prisma/schema.prisma` (~2,700 lines, **84 models**), PostgreSQL.
- The API is the **sole owner** of the database; the web app never touches Postgres directly.
- Connection pooling is configured by `PrismaService` (per `CLAUDE.md`:
  `connection_limit=20&pool_timeout=10`).

Representative model groups:

- **Tenancy / identity**: `Tenant`, `User`, `TenantMembership`, `UserPreference`, `UserSession`,
  `RefreshTokenFamily`, `RefreshTokenRotation`, `PermissionDefinition`, `RolePermission`
- **Connectors / sync**: `ConnectorConfig`, `LlmConnector`, `ConnectorSyncJob`,
  `GrafanaDashboard`, `VelociraptorEndpoint/Hunt/Notebook`, `LogstashPipelineLog`,
  `ShuffleWorkflow`, `NormalizationPipeline`
- **Detection / cases**: `Alert`, `CorrelationRule`, `DetectionRule`, `Case`, `CaseNote`,
  `CaseComment`(+`Mention`), `CaseTimeline`, `CaseTask`, `CaseArtifact`, `CaseCycle`, `Incident`,
  `IncidentTimeline`, `Vulnerability`, `AttackPath`
- **Intel / entities / UEBA**: `IntelIOC`, `IntelMispEvent`, `Entity`, `EntityRelation`,
  `UebaEntity`, `UebaAnomaly`, `MlModel`
- **SOAR / compliance / reports / cloud**: `SoarPlaybook`, `SoarExecution`, `Runbook`,
  `ComplianceFramework`, `ComplianceControl`, `Report`, `ReportTemplate`, `CloudAccount`,
  `CloudFinding`
- **Jobs / health / audit**: `Job`, `SystemHealthCheck`, `SystemMetric`, `AuditLog`,
  `AiAuditLog`, `ApplicationLog`, `SavedQuery`, `Notification`
- **AI**: `AiAgent`, `AiAgentSession`, `AiAgentTool`, `TenantAgentConfig`, `OsintSourceConfig`,
  `AiApprovalRequest`, `AiExecutionFinding`, `AiAgentSchedule`, `AiScheduleTemplate`,
  `AiFindingOutputLink`, `AiJobRunSummary`, `AiPromptTemplate`, `AiFeatureConfig`,
  `AiUsageLedger`, `AiCostRate`, `AiBudgetAlert`, `AiChatThread`, `AiChatMessage`,
  `UserMemory`, `MemoryRetentionPolicy`

---

## 9. Connectors

Connector adapters live in `apps/api/src/modules/connectors/services/`. `ConnectorType`
(`common/enums/connector-type.enum.ts`):

| Type               | Adapter                       | Category                                           |
| ------------------ | ----------------------------- | -------------------------------------------------- |
| `wazuh`            | `wazuh.service.ts`            | SIEM / alerts                                      |
| (`opensearch`)     | `opensearch.service.ts`       | Search backend (module enum `connectors.enums.ts`) |
| `graylog`          | `graylog.service.ts`          | Log management                                     |
| `logstash`         | `logstash.service.ts`         | Ingestion pipeline                                 |
| `velociraptor`     | `velociraptor.service.ts`     | EDR / DFIR                                         |
| `grafana`          | `grafana.service.ts`          | Dashboards                                         |
| `influxdb`         | `influxdb.service.ts`         | Metrics                                            |
| `misp`             | `misp.service.ts`             | Threat intel                                       |
| `shuffle`          | `shuffle.service.ts`          | SOAR automation                                    |
| `bedrock`          | `bedrock.service.ts`          | AI (AWS Bedrock)                                   |
| `llm_apis`         | `llm-apis.service.ts`         | AI (OpenAI-compatible)                             |
| `openclaw_gateway` | `openclaw-gateway.service.ts` | AI gateway                                         |

- Connector configs are **validated by per-type Zod schemas**, **SSRF-validated** at input time,
  and **encrypted at rest** (AES-256-GCM via `CONFIG_ENCRYPTION_KEY`, which must be 64 hex chars
  and non-zero per `env.validation.ts`).
- Connector mutations require elevated roles (per `CLAUDE.md`: `TENANT_ADMIN`).
- `data-explorer` exposes read paths over these connectors; `connector-sync` /
  `connector-workspaces` manage syncing and per-tenant workspace state.

---

## 10. AI Provider Cascade

Routing lives in `apps/api/src/modules/ai/ai.service.ts`. The provider order (`ai.enums.ts`):

```
bedrock → llm_apis → openclaw_gateway → rule-based (fallback)
```

- `findAvailableAiConnectors(tenantId)` returns **all** configured AI connectors;
  `tryConnectorsInOrder(connectors, …)` iterates through them **sequentially** and uses the
  first that succeeds — a single provider failure does **not** short-circuit to fallback.
- Provider services injected into `AiService`: `BedrockService`, the LLM-APIs path, and
  `OpenClawGatewayService`. Responses are tagged with the provider/model that served them
  (e.g. `bedrock`, `llm_apis(<name>)`, `openclaw_gateway`).
- The **rule-based** path (`AI_FALLBACK_MODEL = 'rule-based'`, `ai.constants.ts`) is used only
  when no AI connector is configured / all fail; it is explicitly labeled `model: 'rule-based'`.
- AI endpoints are rate-limited (`10/min` per `CLAUDE.md`).
- **Cross-chat memory** (`ai/memory`, `UserMemory` / `MemoryRetentionPolicy`): facts/preferences
  are extracted after chat messages and retrieved by similarity to enrich the system prompt.
- **AI agents / OSINT** (`ai-agents`, `agent-config`, `osint-executor`): per-tenant agent config
  (`TenantAgentConfig`), approval-gated actions (`AiApprovalRequest`), scheduling
  (`AiAgentSchedule`), findings (`AiExecutionFinding`), and usage/cost tracking
  (`AiUsageLedger`, `AiCostRate`, `AiBudgetAlert`).

---

## 11. WebSockets / Real-time

- **Notifications gateway**: `apps/api/src/modules/notifications/notifications.gateway.ts` is a
  **Socket.IO** `@WebSocketGateway` on the `notifications` namespace.
  - **Auth on handshake**: reads a token from `handshake.auth.token` (or `Authorization: Bearer`),
    runs `verifyAccessToken()`, then `resolveAuthorizedTenantContext()` (so the same tenant-switch
    logic as HTTP applies).
  - Clients join a per-user room **`<tenantId>:<userId>`**; the service emits
    `emitToUser`, `emitUnreadCount`, and `emitPermissionsUpdated` events to those rooms.
  - **CORS uses the same `CORS_ORIGINS` allow-list** as HTTP (parsed/validated with `new URL()`),
    with `credentials: true` — never `cors: true`.
- A small generic outbound `WebSocketService` (`common/modules/websocket/`) wraps the `ws`
  client for connector-side connections.

---

## 12. Security Hardening

**HTTP layer (`main.ts`)**

- **Helmet** with an explicit CSP (`default-src 'self'`, `script-src 'self'`, `style-src 'self'`
  — no `'unsafe-inline'`, `object-src 'none'`, `frame-ancestors 'none'`), **HSTS** (1 year,
  includeSubDomains, preload), `frameguard: deny`, and `referrer-policy: strict-origin-when-cross-origin`.
- **X-Request-ID** middleware (generate/propagate a UUID).
- **Cache-Control: no-store** is forced on any request carrying an `Authorization` header or
  auth cookies; otherwise `Vary: Authorization, Cookie`.
- **CORS** origins are parsed from `CORS_ORIGINS`, validated as real http/https URLs, and
  required-non-empty in production.
- Body size limited to **1MB**.

**Auth cookies + CSRF**

- Access/refresh tokens are stored in **HttpOnly cookies**; a **double-submit CSRF token** is
  issued alongside.
- **CsrfGuard** (`csrf.guard.ts`) enforces CSRF on state-changing methods when auth cookies are
  present: it requires both a `csrf_token` cookie and an `x-csrf-token` header and compares them
  in **constant time**. `@SkipCsrf()` exempts the public auth endpoints (login/refresh).

**App layer**

- All input validated with **Zod** via `ZodValidationPipe`; every error flows through
  `GlobalExceptionFilter` as a `BusinessException` carrying a localizable `messageKey`
  (`errors.<module>.<action>`); internal paths/stack traces and Prisma metadata are sanitized
  out of responses.
- **SSRF** validation on all user-supplied URLs (`common/utils`), **AES-256-GCM** encryption of
  connector secrets, **Redis-backed token blacklist** for revocation, strict per-endpoint
  **rate-limiting** tiers, and global **AuditInterceptor** logging with credential redaction.
- **Env validation** (`config/env.validation.ts`) fails fast on weak/zero `JWT_SECRET` /
  `CONFIG_ENCRYPTION_KEY`, rejects `localhost` CORS origins in production, and enforces
  all-or-nothing OIDC config.
- Logs redact `authorization`/`cookie` headers and password body fields (`app.module.ts` pino
  `redact`).

---

## 13. Docker

Compose definitions live in `infra/docker/`; the root `docker-compose.yml` simply `include`s
`infra/docker/docker-compose.yml`.

- **Base** (`docker-compose.yml`) — services `postgres` (postgres:16-alpine), `redis`
  (redis:7-alpine), `api` (built from `apps/api/Dockerfile`, exposed on `${API_PORT:-4000}:4000`),
  and `web`. **Secure-by-default**: Postgres/Redis are **not** published to the host (internal
  `auraspear` Docker network only). API healthcheck hits `/api/v1/health`. Secrets come from the
  root `.env`.
- **Dev overlay** (`docker-compose.dev.yml`) — opens internal ports for debugging.
- **Prod overlay** (`docker-compose.prod.yml`) — `restart: always`, `NODE_ENV=production`,
  **Redis password required** (`REDIS_PASSWORD`), Postgres/Redis stay internal — only `web` + `api`
  are host-reachable.
- **Infra** (`docker-compose.infra.yml`) and **connectors**
  (`docker-compose.connectors.yml`) stacks for supporting services.
- pnpm scripts: `docker:dev` / `docker:prod` / `docker:infra` layer the overlays.

---

## 14. CI / CD

GitHub Actions in `.github/workflows/`:

| Workflow                | Purpose                     |
| ----------------------- | --------------------------- |
| `ci.yml`                | Build/test pipeline (below) |
| `codeql.yml`            | CodeQL static analysis      |
| `dependency-review.yml` | Dependency review on PRs    |
| `docker.yml`            | Docker image build          |
| `security.yml`          | Security scanning           |

`ci.yml` (Node 22, pnpm, runs on push/PR to `main`, concurrency-cancel):

- **`validate` (hard gate)** — `pnpm install --frozen-lockfile` → `prisma:generate` (api) →
  `pnpm typecheck` (web + api) → `pnpm build` (web + api). Must pass.
- **`lint` (advisory, `continue-on-error`)** — ESLint + Prettier check (pre-existing debt).
- **`test` (advisory, `continue-on-error`)** — spins up Postgres 16 + Redis 7 service
  containers, runs `prisma:generate` then `pnpm test`.

Pre-commit quality gates are enforced locally via **Husky + lint-staged** (ESLint, `tsc --noEmit`,
Prettier), and both apps enforce extensive strict ESLint rule sets (see each `apps/*/CLAUDE.md`).

---

## 15. Request Flow (end-to-end)

```
Browser
  → Next.js page/hook → Axios (@/lib/api, baseURL '/api')
    → Next.js route handler (apps/web/src/app/api/**)
      → proxyToBackend() → NestJS  http://…/api/v1/**
        → ThrottlerGuard → AuthGuard (JWT/cookie + active-user + tenant resolve)
          → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard
            → Controller → Service → Repository → Prisma → PostgreSQL
                               ↘ Connector adapters → Wazuh/MISP/Shuffle/Bedrock/…
        ← BusinessException → GlobalExceptionFilter (messageKey, sanitized)
  ← Real-time: Socket.IO 'notifications' namespace → room <tenantId>:<userId>
```
