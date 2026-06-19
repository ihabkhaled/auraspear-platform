# API Design (architecture)

> **Entry point:** start at [`AGENTS.md`](../../AGENTS.md) — it defines the AI
> loading order and the security/AI invariants every change must respect. This
> file is the **architecture-level "why"** of the AuraSpear API contract.
>
> **Do not read this for the endpoint catalogue.** The full reference — every
> controller, base path, header, and the exact JSON error body — already lives in
> [`docs/API.md`](../API.md). This document explains the _design decisions_ behind
> that contract and links out instead of repeating it.

The AuraSpear API is the **NestJS 11 Backend-for-Frontend** (`@auraspear/api`).
The Next.js web app never calls Wazuh / OpenSearch / MISP directly; it proxies
every request through this API, which owns credentials, tenant scoping, and
integration logic. The system-level view (request flow, guard chain, modules,
DB ownership) is in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md); this file zooms
in on the public HTTP contract.

---

## Design decisions at a glance

| Decision                   | What it is                                                         | Why                                                                                    |
| -------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Versioned prefix `/api/v1` | One global route prefix; root `/` excluded                         | Lets the contract evolve to `/api/v2` without breaking the proxy or existing clients   |
| `messageKey` errors        | Every error carries an i18n key, never a raw localized string      | Frontend renders `t(messageKey)` in 6 locales; backend never ships display copy        |
| Page/limit pagination      | `page` + `limit` + `sortBy` + `sortOrder`, Zod-validated, bounded  | Predictable, DoS-bounded list endpoints with a registered sort allow-list              |
| Rate-limit tiers           | A fixed set of `@Throttle()` tiers by endpoint category            | Auth/bulk/AI routes get tight limits; cheap reads get loose limits — abuse containment |
| Swagger in **dev only**    | OpenAPI UI mounted at `/api/docs` only when `NODE_ENV=development` | DX in dev; zero attack surface / version disclosure in prod                            |

These are enforced by the backend rules in
[`rules/backend/api-rules.md`](../../rules/backend/api-rules.md) and
[`rules/backend/dto-validation-rules.md`](../../rules/backend/dto-validation-rules.md),
and codified per-rule in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md). The
recipe for adding an endpoint that satisfies all of them is
[`skills/backend/add-endpoint.md`](../../skills/backend/add-endpoint.md).

---

## 1. Versioning — `/api/v1`

Every controller route is served under the global prefix `api/v1`, set once in
[`apps/api/src/main.ts`](../../apps/api/src/main.ts):

```ts
app.setGlobalPrefix('api/v1', { exclude: ['/'] })
```

A controller declared `@Controller('cases')` is therefore reached at
`/api/v1/cases`; the bare root `/` is excluded so health/liveness probes and the
Vercel handler can answer at `/`.

**Why a prefix and not per-route versions:** the version lives in exactly one
place, so the entire surface moves to `v2` atomically and the web proxy
(`BACKEND_API_URL = http://localhost:4000/api/v1`, see
[`docs/ARCHITECTURE.md` §2](../ARCHITECTURE.md)) only ever rewrites one segment.
Local dev listens on `PORT` (default **4000**), so a full URL is typically
`http://localhost:4000/api/v1/...`.

> The complete list of base paths per controller (auth, cases, alerts, AI,
> connectors, …) is the catalogue in [`docs/API.md` "Endpoint Areas"](../API.md)
> — not duplicated here.

---

## 2. Errors — `messageKey`, never raw copy

The core decision: **the API returns i18n keys, not human sentences.** The
frontend owns localization (6 locales) and resolves `t(messageKey)`; the backend
must never embed display text it cannot translate.

- Business errors throw
  [`BusinessException`](../../apps/api/src/common/exceptions/business.exception.ts),
  which carries a `messageKey` shaped `errors.<module>.<specificKey>`
  (e.g. `errors.auth.invalidCredentials`, `errors.cases.notFound`).
- All exceptions funnel through `GlobalExceptionFilter`, and the response body is
  shaped by `buildErrorResponse()` in
  [`http-exception.utilities.ts`](../../apps/api/src/common/filters/http-exception.utilities.ts).
  `messageKey` is **always present** — if an exception lacks one, the filter
  derives a fallback from the HTTP status (`statusToMessageKey`).
- **Validation (Zod) failures** map each issue to a field key via
  `zodIssueToMessageKey()` — e.g. `errors.validation.title.required`,
  `errors.validation.sortBy.invalidOption`, `errors.validation.email.tooLong`.
  The first issue becomes the top-level `messageKey`; the full list goes in an
  `errors[]` array.
- **Internal / DB errors are generic by design**: Prisma errors are caught
  explicitly and collapsed to `errors.internalError` / `errors.badRequest` /
  `errors.serviceUnavailable`, and `sanitizeMessage()` strips file paths and
  truncates to 500 chars so no table/column/stack detail leaks.

Why this matters as an invariant: every new `messageKey` must exist in **all 6**
locale files, or the UI shows a broken key (CLAUDE.md rule 49). The exact JSON
field table and example body are in
[`docs/API.md` "Error Format"](../API.md); the security rationale for
sanitization is in [`docs/SECURITY.md`](../SECURITY.md).

---

## 3. Pagination — bounded, validated, sort-allow-listed

List endpoints use an explicit, Zod-validated query shape rather than binding a
raw DTO. Representative schema:
[`list-cases-query.dto.ts`](../../apps/api/src/modules/cases/dto/list-cases-query.dto.ts).

| Param       | Type | Default    | Bounds / constraint                |
| ----------- | ---- | ---------- | ---------------------------------- |
| `page`      | int  | `1`        | `min 1`, `max 10000`               |
| `limit`     | int  | `20`       | `min 1`, `max 500`                 |
| `sortBy`    | enum | per module | must be in the controller's enum   |
| `sortOrder` | enum | `desc`     | `SortOrder.ASC` / `SortOrder.DESC` |

Design rationale:

- **Bounded by construction.** `max` on `page`/`limit` (and `.max()` on every
  string/array field — CLAUDE.md rules 27/28) makes oversized list requests a
  validation `400`, not a resource-exhaustion vector.
- **Sort is an allow-list, not free text.** `sortBy` is a Zod `.enum()` and must
  be mirrored in the module's `buildXxxOrderBy()` utility. A column the UI marks
  `sortable: true` but that is missing from either side fails with
  `errors.validation.sortBy.invalidOption` (CLAUDE.md rules 87 / web 35–36) —
  this is why pagination is an architectural contract, not a per-page detail.
- **Parsed, not bound.** Query strings are parsed with `Schema.parse(rawQuery)`
  (with numeric coercion) because NestJS hands `@Query()` raw strings without Zod
  (CLAUDE.md rule 19). Responses return the page slice plus pagination metadata
  (e.g. `PaginatedCases`).

The reusable param table also appears in
[`docs/API.md` "Pagination"](../API.md); the DTO conventions are in
[`rules/backend/dto-validation-rules.md`](../../rules/backend/dto-validation-rules.md).

---

## 4. Rate-limit tiers

A global `ThrottlerModule` + `ThrottlerGuard` sits **first** in the guard chain
([`app.module.ts`](../../apps/api/src/app.module.ts)). The global default is
`RATE_LIMIT_THROTTLE_LIMIT` per `RATE_LIMIT_THROTTLE_TTL` ms, defaulting to
**250 requests / 60 s**. Controllers and routes then tighten this with
`@Throttle({ default: { limit, ttl } })`.

The design intent is a small set of **tiers chosen by endpoint cost/risk**, not
ad-hoc numbers. The tiers (confirmed in the decorators of `auth.controller.ts`,
`cases.controller.ts`, `alerts.controller.ts`, `connectors.controller.ts`, and
`osint-executor.controller.ts`):

| Tier              | Limit / window                     | Why / example                                                          |
| ----------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| Auth login        | **5 / 60 s**                       | Throttle credential stuffing — `POST /auth/login`, `end-impersonation` |
| Auth refresh      | **8 / 60 s**                       | Bound refresh churn — `POST /auth/refresh`                             |
| Auth logout       | **10 / 60 s**                      | Prevent Redis blacklist flooding — `POST /auth/logout`                 |
| Standard CRUD     | **30 / 60 s**                      | Controller-level on `cases`, `alerts`, `entities`, `notifications`     |
| Delete / mutation | **10 / 60 s**                      | Per-method on delete/update routes                                     |
| AI endpoints      | **10 / 60 s**                      | LLM cost containment — e.g. `osint`, AI controllers                    |
| Bulk / probe      | **5 / 60 s** (and tighter, e.g. 3) | Bulk ops & connector-test routes that touch internal hosts             |

Why tiered: cheap reads stay generous, while routes that are expensive
(AI/LLM), security-sensitive (auth), or can be weaponized for internal scanning
(connector test) are clamped hard. **Every mutation controller must declare a
`@Throttle()`** (CLAUDE.md rules 32/33/61/74/80) — an unthrottled
POST/PATCH/DELETE is a rule violation, not a default. The same tier table is
mirrored in [`docs/API.md` "Rate Limiting"](../API.md).

---

## 5. Swagger / OpenAPI — development only

OpenAPI docs are built with `DocumentBuilder` and mounted **only** under
`NODE_ENV === 'development'` ([`main.ts`](../../apps/api/src/main.ts)):

```ts
if (process.env.NODE_ENV === 'development') {
  // DocumentBuilder().setTitle('AuraSpear SOC BFF')…addBearerAuth()…
  SwaggerModule.setup('api/docs', app, document)
}
```

- **Dev:** browse `/api/docs` (Bearer auth enabled; tags `auth`, `tenants`,
  `connectors`, `alerts`, `dashboards`, `hunts`, `cases`, `intel`, `ai`,
  `health`).
- **Prod:** no Swagger UI is mounted at all.

Why gate it: in production an open schema endpoint is needless attack surface and
leaks the full route map. This pairs with the related hardening decision that the
public `/health` endpoint **omits the application version** (CLAUDE.md rule 60) —
the API deliberately avoids self-describing to unauthenticated callers.
Importantly, `NODE_ENV` **defaults to `production`** in
[`env.validation.ts`](../../apps/api/src/config/env.validation.ts) (CLAUDE.md
rule 58), so a misconfigured deployment fails _closed_ (no Swagger) rather than
open.

---

## Cross-cutting contract guarantees

These hold across the whole surface and are detailed in their own docs:

- **Auth & headers** — `Authorization: Bearer` (or HttpOnly `access_token`
  cookie), `X-Tenant-Id` for GLOBAL_ADMIN tenant switching, CSRF double-submit on
  cookie auth, `X-Request-ID` echo. See
  [`docs/API.md` "Authentication & Headers"](../API.md) and
  [`docs/ARCHITECTURE.md` §3–§5](../ARCHITECTURE.md).
- **Tenant isolation & RBAC** — every endpoint carries
  `@RequirePermission(Permission.X)` (GLOBAL_ADMIN always passes); every query is
  `tenantId`-scoped. See
  [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)
  and [`docs/SECURITY.md`](../SECURITY.md).
- **Validation & layering** — Zod DTOs via `ZodValidationPipe`, thin
  controllers → services → repositories. See
  [`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md).

## Adding to the API safely

1. Read [`AGENTS.md`](../../AGENTS.md) (loading order + invariants).
2. Follow [`skills/backend/add-endpoint.md`](../../skills/backend/add-endpoint.md)
   and, for new permissions,
   [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md).
3. Obey [`rules/backend/api-rules.md`](../../rules/backend/api-rules.md) +
   [`rules/backend/dto-validation-rules.md`](../../rules/backend/dto-validation-rules.md).
4. Add the matching Next.js proxy route in `apps/web/src/app/api/**`
   (CLAUDE.md rule 86) and `messageKey` translations in all 6 locales
   (CLAUDE.md rule 49).

## Related docs

- [`docs/API.md`](../API.md) — full API reference (endpoint catalogue, headers,
  error/pagination/rate-limit tables). **Source of truth for the surface.**
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — system architecture (runtime,
  guard chain, request flow, modules, DB).
- [`docs/SECURITY.md`](../SECURITY.md) — auth, CSRF, SSRF, sanitization, secrets.
- [`docs/AI.md`](../AI.md) — AI provider cascade and AI-endpoint behavior.
- [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md) — the full documentation map.
- [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — the numbered backend rules
  cited throughout this file.
