# Backend Architecture — `apps/api`

> **Entry point first.** This is a deep-dive reference. Start your loading order
> at [`AGENTS.md`](../../AGENTS.md) (Section 1), then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — the authoritative rulebook
> this doc summarizes — before touching backend code. **No AI agent may edit
> first and understand later.**

The API (`@auraspear/api`) is a **NestJS 11** Backend-for-Frontend (BFF) on
TypeScript strict mode, backed by **Postgres via Prisma 7** and **Redis via
ioredis**. The Next.js frontend never talks to Wazuh / OpenSearch / MISP /
Bedrock directly — every external call is brokered through this API. Source
lives under `apps/api/src`.

## Where this doc sits

| You want…                                  | Go to                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| The hard, enforced rules (don't violate)   | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)                                  |
| Platform-wide architecture + request flow  | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)                                      |
| HTTP contract (headers, errors, paging)    | [`docs/API.md`](../API.md)                                                        |
| Layering rules (controller/service/repo)   | [`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md)        |
| API / DTO / Prisma / tenancy rules         | [`rules/backend/`](../../rules/backend/)                                          |
| Step-by-step recipes (add endpoint/module) | [`skills/backend/`](../../skills/backend/)                                        |
| Security invariants                        | [`docs/SECURITY.md`](../SECURITY.md) · [`rules/security/`](../../rules/security/) |
| AI subsystem                               | [`docs/AI.md`](../AI.md)                                                          |

This file documents **how `apps/api/src` is layered and wired**. It does not
restate the global request flow, the connector cascade, or the AI provider
routing — those live in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md). Don't
duplicate them; link them.

---

## 1. Top-level source layout (`apps/api/src`)

```
apps/api/src/
├── main.ts            # Bootstrap: Helmet, CORS, body limits, X-Request-ID, Swagger, GlobalExceptionFilter
├── app.module.ts      # Root module: imports all feature modules, wires global guards + interceptor
├── app.controller.ts  # Root/health-ish routes
├── common/            # Cross-cutting primitives (see §4)
├── config/            # env.validation.ts — Zod schema for environment
├── modules/           # 38 feature modules (see §3)
├── prisma/            # PrismaModule + PrismaService + constants (pooled, RLS-aware)
└── redis/             # Global RedisModule + REDIS_CLIENT singleton
```

`main.ts` boots once (cached as `cachedApp` for serverless reuse), sets
`trust proxy`, applies `express.json({ limit: '1mb' })`, generates/propagates an
`X-Request-ID`, configures Helmet (CSP with no `'unsafe-inline'`, HSTS,
`frameAncestors: 'none'`), and registers the `GlobalExceptionFilter`. Swagger is
gated off in production.

---

## 2. The layering contract (controller → service → repository → Prisma)

Layering is **strictly enforced** — partly by convention, partly by ESLint
(`no-restricted-syntax` on controllers/services/repositories/utilities). See
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rules **14, 14a, 14b, 14c** and
[`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md).

```
Controller ──> Service ──> Repository ──> Prisma
                  │
                  └──> Utilities (all business logic)
```

| Layer          | File                     | Responsibility                                                                                                     | Must NOT                                                      |
| -------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| **Controller** | `<module>.controller.ts` | Route, extract params, delegate to ONE service method, return result. Hosts decorators.                            | Business logic, `try/catch`, `throw`, transforms, Prisma      |
| **Service**    | `<module>.service.ts`    | Thin orchestrator: validate → call utility → call repository → return. Reads like a recipe.                        | Import `PrismaService`; inline helpers/constants; long blocks |
| **Repository** | `<module>.repository.ts` | Pure data access. Accepts fully-built query params, returns raw Prisma results. Every method takes `tenantId`.     | Conditionals, transforms, `BusinessException`, business logic |
| **Utilities**  | `<module>.utilities.ts`  | ALL business logic: mappers, `build…WhereClause`/`build…OrderBy`, validators, formatters. Pure exported functions. | Hold interfaces/types/enums/constants                         |

**Hard size/complexity limits** (ESLint-warned on `*.service.ts`): no service
method over **30 lines** (CLAUDE.md tightens this to 20 in the audit rules),
cyclomatic complexity ≤ 10 in services / ≤ 15 globally. When a method grows,
extract logic into `<module>.utilities.ts`.

### Verified in real code (`modules/cases`)

- `cases.controller.ts` — `@Controller('cases')`, `@UseGuards(AuthGuard, TenantGuard)`,
  `@Throttle(...)`; each handler is `@RequirePermission(Permission.CASES_VIEW)` etc.,
  parses the query with a Zod schema, and calls a single `casesService.*` method.
- `cases.service.ts` — `@Injectable`, constructor-injects `CasesRepository` (plus
  cross-module repos/services); imports ~25 named functions from `cases.utilities.ts`;
  **never imports `PrismaService`**.
- `cases.repository.ts` — `@Injectable`, the only place that injects
  `PrismaService`; methods are thin Prisma calls.
- `cases.utilities.ts` — pure functions (`buildCaseWhereClause`, `buildCaseOrderBy`,
  `mapCaseListItem`, …) grouped by concern.

### Supporting declaration files (one home per kind)

Per CLAUDE.md rule 13, nothing is declared inline. Each module keeps:

| File                    | Holds                                                          |
| ----------------------- | -------------------------------------------------------------- |
| `<module>.types.ts`     | Interfaces / type aliases (exported domain types)              |
| `<module>.constants.ts` | Module constants (sort-field lists, limits, etc.)              |
| `<module>.enums.ts`     | Module-local enums (most enums live in `common/enums/` though) |
| `dto/<name>.dto.ts`     | Zod schema + inferred DTO type (`z.infer<...>`)                |

DTOs use **Zod only** (no class-validator), validated via the
`ZodValidationPipe`. Every string field needs `.max()`, every array `.max()`,
and JSON/record fields get a `.refine()` size cap. Query strings are parsed
manually (`Schema.parse(rawQuery)`) — never `@Query()` typed directly to a DTO
(CLAUDE.md rule 19). See [`rules/backend/dto-validation-rules.md`](../../rules/backend/dto-validation-rules.md).

---

## 3. Modules (`apps/api/src/modules`)

**38 feature modules**, each a decorated empty NestJS class wired into
[`app.module.ts`](../../apps/api/src/app.module.ts). A module typically bundles
its controller(s), service(s), repository, utilities, types, constants, and a
`dto/` folder. Some modules also carry AI sub-controllers (e.g.
`cases/ai-case-copilot.controller.ts`, `alerts/ai-alert-triage.controller.ts`)
or job handlers (e.g. `ai-agents/ai-agent-task.handler.ts`).

The module catalog (SOC + platform domains):

```
agent-config   ai            ai-agents      alerts          app-logs
attack-paths   audit-logs    auth           case-cycles     cases
cloud-security compliance    connector-sync connector-workspaces  connectors
correlation    dashboards    data-explorer  detection-rules entities
health         hunts         incidents      intel           jobs
knowledge      normalization notifications  osint-executor  reports
role-settings  soar          system-health  tenants         ueba
users          users-control vulnerabilities
```

> The per-module list in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
> §"Project Structure" predates several of these modules — treat
> `app.module.ts` imports as the source of truth, and see
> [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §6 (API Module Map) for the
> annotated map. To add a module, follow
> [`skills/backend/add-module.md`](../../skills/backend/add-module.md); to add an
> endpoint, [`skills/backend/add-endpoint.md`](../../skills/backend/add-endpoint.md).

`connectors` carries adapter services for external systems (Wazuh, OpenSearch,
MISP, Shuffle, Bedrock, LLM APIs) and an `llm-connectors/` submodule — this is
the BFF's outbound boundary. Details:
[`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §9–10.

---

## 4. Common primitives (`apps/api/src/common`)

Cross-cutting code lives under `common/`, organized by kind:

```
common/
├── decorators/   @CurrentUser, @TenantId, @RequirePermission, @Roles,
│                 @Public, @AllowCaseOwner, @SkipCsrf
├── guards/       AuthGuard, CsrfGuard, TenantGuard, RolesGuard,
│                 PermissionsGuard, csrf.constants
├── interceptors/ AuditInterceptor (+ audit.constants)
├── filters/      GlobalExceptionFilter (http-exception.* split into
│                 filter/constants/types/utilities)
├── pipes/        ZodValidationPipe (+ zod-validation.utilities)
├── middleware/   RlsMiddleware (Postgres Row-Level Security tenant context)
├── exceptions/   BusinessException
├── interfaces/   AuthenticatedRequest, JwtPayload, UserRole, pagination helpers
├── enums/        ~100 shared enums (single source of truth) + index barrel
├── services/     AppLoggerService, ServiceLogger, StartupHealthService
├── utils/        encryption, ssrf, mask, redaction, es-sanitize, query,
│                 date-time, batch, sequence-number, role, rls, status-transitions
├── modules/      axios/, websocket/  (shared infra wrappers)
├── dto/          pagination.dto
└── ocsf/         OCSF normalization helpers
```

### Guards — the global chain (order matters)

Five guards are registered globally as `APP_GUARD` in `app.module.ts`, plus
`ThrottlerGuard` first. They run **in registration order** on every request:

```
ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard
```

| Guard              | What it does                                                                                                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ThrottlerGuard`   | Global rate limit (`@nestjs/throttler`); per-endpoint tiers via `@Throttle()` (auth 5/min, CRUD 30/min, …).                                                                                               |
| `AuthGuard`        | Verifies the access token (HS256, checks `tokenType: 'access'` + Redis blacklist), then `validateUserActive()`; populates `request.user`. Honors `@Public()`. Performs GLOBAL_ADMIN `X-Tenant-Id` switch. |
| `CsrfGuard`        | CSRF protection for cookie-based requests; bypassed via `@SkipCsrf()`.                                                                                                                                    |
| `TenantGuard`      | Ensures a tenant context is present/valid for tenant-scoped routes.                                                                                                                                       |
| `RolesGuard`       | Legacy role gate — honors `@Roles(UserRole.X)`. Used narrowly (e.g. `role-settings`, connector mutations).                                                                                                |
| `PermissionsGuard` | The primary RBAC gate — reads `@RequirePermission(Permission.X)`, looks up the role's permissions, allows GLOBAL_ADMIN through, and honors `@AllowCaseOwner()` for case-scoped endpoints.                 |

Because the guards are global, controllers re-declare the relevant ones with
`@UseGuards(AuthGuard, TenantGuard)` for clarity/explicitness; the decorators
(`@RequirePermission`, `@Roles`, `@Public`) are what actually drive behavior via
the `Reflector`.

**RBAC model:** permissions are dynamic and DB-stored; the `Permission` enum
(`common/enums/permission.enum.ts`) is the single source of truth. **Every
endpoint must carry `@RequirePermission(...)`** (CLAUDE.md rule 25). `@Roles()`
is the older mechanism, retained only where a coarse role check is enough. Roles
(most → least privileged): `GLOBAL_ADMIN`, `PLATFORM_OPERATOR`, `TENANT_ADMIN`,
`THREAT_HUNTER`, `SOC_ANALYST_L2`, `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`. Full
RBAC + the 10-step "add a permission" checklist:
[`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)
and [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md).

### Interceptors — `AuditInterceptor`

Registered globally as `APP_INTERCEPTOR`. On mutating methods only
(`MUTATION_METHODS` = POST/PATCH/PUT/DELETE), it captures the controller +
handler, builds a resource ID from path params, **redacts sensitive fields**
from the request body (`redactSensitiveFields`, covering `password`, `apiKey`,
`token`, `secret`, `authorization`, `encryptedConfig`, …), truncates to 2 KB,
and persists an audit record after the handler completes. Every mutation is
audit-logged with credentials stripped (Security invariant in
[`AGENTS.md`](../../AGENTS.md) §6).

### Filters — `GlobalExceptionFilter`

A catch-all (`@Catch()`) registered in `main.ts`. It runs every error through
`parseException()` / `buildErrorResponse()` (in `http-exception.utilities.ts`)
which: maps Prisma errors (`PrismaClientKnownRequestError`, validation, init) to
generic messages, **strips internal file paths**, truncates to 500 chars, and
emits a sanitized JSON body that always includes a `messageKey`. It also logs at
the right level (`warn` / `error` / `errorWithStack`).

Errors are raised with **`BusinessException`** (`common/exceptions/`), never raw
Nest exceptions. It extends `HttpException` and carries a localized
`messageKey` (`errors.<module>.<action>`) plus optional field-level `errors[]`,
so the frontend renders `t(messageKey)`. The `messageKey` must exist in all 6
i18n files (CLAUDE.md rule 49).

### Pipes — `ZodValidationPipe`

Validates `@Body()` against a Zod schema. Apply it on the body parameter
(`@Body(new ZodValidationPipe(Schema)) dto`), **never** `@UsePipes()` at method
level when `@Param()` is present (it would validate path params too — CLAUDE.md
rule 16).

### Middleware — `RlsMiddleware`

Sets the Postgres `app.current_tenant_id` session variable so Row-Level
Security policies enforce tenant isolation **at the database level** — a
defense-in-depth layer beneath the application's `tenantId`-scoped queries. It
must run after `AuthGuard` has populated `req.user`; the file documents the
transaction-scoping caveat for Prisma.

### Decorators (parameter + metadata)

`@CurrentUser()` (the `JwtPayload`), `@TenantId()` (the effective tenant —
already GLOBAL_ADMIN-switched by `AuthGuard`), `@RequirePermission(Permission.X)`,
`@Roles(UserRole.X)`, `@Public()` (skip auth), `@AllowCaseOwner()` (let a case
owner bypass permission checks on case sub-resources), `@SkipCsrf()`.

---

## 5. Shared infrastructure modules

External clients are **never** instantiated in service constructors. Each
infrastructure concern is wrapped in a dedicated, usually `@Global()`, module
(CLAUDE.md audit rules 29 & 33):

| Concern       | Where                                                     | Notes                                                                                                                              |
| ------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Database**  | `prisma/` — `PrismaModule`/`PrismaService`                | Pooled (`connection_limit=20&pool_timeout=10`), the ONLY Prisma entry point.                                                       |
| **Redis**     | `redis/` — `RedisModule` + `REDIS_CLIENT`                 | Single `@Global()` ioredis connection; inject via `@Inject(REDIS_CLIENT)`. Never `new Redis()`.                                    |
| **HTTP out**  | `common/modules/axios/`                                   | Shared Axios wrapper for outbound calls.                                                                                           |
| **WebSocket** | `common/modules/websocket/`                               | Real-time gateway (CORS validated against `CORS_ORIGINS`). See [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §11.                   |
| **Logging**   | `common/services/` — `AppLoggerService` + `ServiceLogger` | Structured logging via `nestjs-pino`; services use `ServiceLogger` (`this.log.entry/success/error/...`) instead of inline helpers. |
| **Config**    | `config/env.validation.ts`                                | Zod-validated env; fails loudly at startup. `NODE_ENV` defaults to `production`.                                                   |

### Shared utilities (`common/utils`)

Reusable, ESLint-safe helpers — prefer these over inlining: `encryption.utility`
(AES-256-GCM at rest), `ssrf.utility` (`validateUrl` allowlist), `mask.utility` /
`redaction.utility` (credential/PII redaction), `es-sanitize.utility`
(`sanitizeEsQueryString` for Elasticsearch), `query.utility` (`toSortOrder`,
`buildOrderBy`), `date-time.utility` (`nowDate`/`nowMs`/`toIso`/… — **never** raw
`new Date()`/`Date.now()`, CLAUDE.md audit rule 35), `batch.utility` (chunked
`Promise.allSettled`), `sequence-number.utility` (advisory-locked case numbers),
`status-transitions.utility` (state-machine guards), `role.utility`
(`hasRoleAtLeast`), `rls.utility` (`setTenantContext`).

---

## 6. Request lifecycle (backend slice)

End-to-end flow is documented in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
§15. The backend portion:

```
HTTP request
  → main.ts middleware (X-Request-ID, Helmet, body limit, cookie parser)
  → ThrottlerGuard  (rate limit)
  → AuthGuard       (verify token, blacklist check, validateUserActive, GLOBAL_ADMIN tenant switch)
  → CsrfGuard       (cookie-based CSRF)
  → TenantGuard     (tenant context)
  → RolesGuard      (@Roles, where present)
  → PermissionsGuard(@RequirePermission / @AllowCaseOwner)
  → ZodValidationPipe (@Body validation)  +  manual Schema.parse(rawQuery)
  → Controller      (delegate to ONE service method)
  → Service         (orchestrate: utilities + repository)
  → Repository      (Prisma, tenant-scoped)
  → AuditInterceptor(on mutations: persist redacted audit record)
  → GlobalExceptionFilter (on error: sanitize → messageKey JSON)
```

---

## 7. Non-negotiable backend invariants (quick reference)

These are enforced; full text in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
and [`AGENTS.md`](../../AGENTS.md) §6–7. Highlights:

- **Tenant isolation** — every query/`update`/`delete` is scoped by `tenantId`
  (`where: { id, tenantId }`); RLS adds a DB-level backstop.
- **RBAC** — every endpoint has `@RequirePermission(...)`; GLOBAL_ADMIN bypass
  lives in `PermissionsGuard`, never in services.
- **No `PrismaService` in services** — all data access via the repository.
- **No business logic in controllers**; **no logic in repositories**; **all
  logic in `*.utilities.ts`**.
- **Errors = `BusinessException` + `messageKey`** (in all 6 locale files).
- **Zod-only DTOs** with `.max()` / `.refine()` bounds; parse query strings
  manually.
- **Secrets** loaded from env (no fallbacks); connector configs AES-256-GCM
  encrypted; URLs SSRF-validated at input time.
- **No raw dates, no `any`, no `console.log`, no string-literal unions, no
  inline declarations** — see the ESLint/TS strict matrix in CLAUDE.md.

For the recipes to do any of this safely, start from
[`skills/backend/`](../../skills/backend/); for the constraints, read
[`rules/backend/`](../../rules/backend/) and
[`rules/security/`](../../rules/security/).
