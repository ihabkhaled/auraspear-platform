# Rules — Backend API (routing, errors, pagination, rate limits)

> Read `../../AGENTS.md` first (loading order + the one rule: understand before
> you edit). Then `../../apps/api/CLAUDE.md` (the 100+ absolute rules — this file
> distills #17, #18, #25, #26, #32, #33, #61, #74, #80, #87 and the HTTP
> hardening section). Pair with `./dto-validation-rules.md`,
> `./tenant-permission-rules.md`, and `./layering-rules.md`. These are **hard
> constraints**, not suggestions.

The API is a NestJS 11 **BFF** (`apps/api`). The Next.js frontend never calls it
directly — every backend endpoint reached by the UI also needs a Next.js proxy
route under `apps/web/src/app/api/` (CLAUDE.md #86, web #33). Add both in the
same change.

## 1. Base path & routing

- Global prefix is `api/v1`, set once in `apps/api/src/main.ts`
  (`app.setGlobalPrefix('api/v1', { exclude: ['/'] })`). Never re-add `/api` or a
  version segment in a `@Controller()` path — `@Controller('cases')` already
  serves `/api/v1/cases`.
- Only the root `/` (health/liveness) is excluded from the prefix.
- Controllers **route and delegate only** — one service call, no `try/catch`, no
  `throw`, no transforms (CLAUDE.md #14). Business logic lives in the service →
  repository → utility layers (`./layering-rules.md`).
- Every endpoint carries `@RequirePermission(Permission.MODULE_ACTION)` from
  `@/common/decorators/permission.decorator` (CLAUDE.md #25). No exceptions, no
  auth bypass in any environment (CLAUDE.md #23, #56). Tenant-owned reads/
  updates/deletes are scoped by `tenantId` (CLAUDE.md #8, #26) — see
  `./tenant-permission-rules.md`.

## 2. Standardized error shape

- **Every** error response goes through `GlobalExceptionFilter`
  (`apps/api/src/common/filters/http-exception.filter.ts`, registered in
  `main.ts`). Never let a raw exception escape.
- **Always** throw `BusinessException`
  (`apps/api/src/common/exceptions/business.exception.ts`) — never raw
  `NotFoundException` / `UnauthorizedException` / `ForbiddenException`
  (CLAUDE.md #17).

  ```ts
  throw new BusinessException(HttpStatus.NOT_FOUND, 'Case not found', 'errors.cases.notFound')
  ```

- `messageKey` is **mandatory** and follows `errors.<module>.<specificAction>`
  (CLAUDE.md #18) — e.g. `errors.auth.invalidCredentials`,
  `errors.connectors.notFound`, `errors.validation.sortBy.invalidOption`. The
  frontend renders it via `t(messageKey)` / `getErrorKey(error)` — never the raw
  `message`.
- The wire shape is fixed by `ErrorResponse`
  (`apps/api/src/common/filters/http-exception.types.ts`):
  `{ statusCode, message, messageKey, errors?, error, timestamp, path }`. Don't
  invent ad-hoc error bodies.
- Every new `messageKey` MUST be added to **all 6** i18n locale files
  (`en, ar, es, fr, de, it`) on both sides (CLAUDE.md #49). A missing key is a
  display bug.
- Errors are **sanitized in every environment** — no stack traces, internal file
  paths, or Prisma table/column names ever reach the client (CLAUDE.md #44, #63,
  #77, #82). The filter strips these; do not re-add detail "for debugging."

## 3. Pagination

- List endpoints take `page` + `limit` via a `List<Xxx>QuerySchema` Zod schema in
  `dto/list-<xxx>-query.dto.ts`. Bound both: `page` `.int().min(1).max(10000)`,
  `limit` `.int().min(1).max(500)`, with `.default()` values (pattern in
  `apps/api/src/modules/cases/dto/list-cases-query.dto.ts`: `page` default `1`,
  `limit` default `20`, max `500`).
- Parse query strings **manually** (`Schema.parse(rawQuery)`) — never bind a DTO
  type straight to `@Query()`, which skips Zod (CLAUDE.md #19). `@Query()` + DTO
  type = unvalidated input.
- Use `z.coerce.number()` for numeric query params — raw query values are
  strings.
- The repository applies `skip: (page - 1) * limit` / `take: limit` and returns a
  total. Responses return paginated payloads (e.g. `{ data, total, page, limit }`)
  — never an unbounded array.
- Database fan-out stays bounded: chunk batch ops in groups of 50 with
  `Promise.allSettled()` (CLAUDE.md #36); no unbounded loops.

## 4. Rate-limit tiers (`@Throttle`)

Global guard is `ThrottlerGuard` (`apps/api/src/app.module.ts`,
`ThrottlerModule.forRootAsync`). Per-endpoint/controller `@Throttle()` from
`@nestjs/throttler` overrides it. Tiers are fixed (CLAUDE.md #32, #33, #61, #80) —
`ttl` is always `60000` (1 min):

| Tier                                   | Limit / min | `@Throttle`                                         |
| -------------------------------------- | ----------- | --------------------------------------------------- |
| Auth (login, OIDC callback, password)  | **5**       | `@Throttle({ default: { limit: 5, ttl: 60000 } })`  |
| Standard CRUD (list/get/create/update) | **30**      | `@Throttle({ default: { limit: 30, ttl: 60000 } })` |
| Bulk operations                        | **5**       | `@Throttle({ default: { limit: 5, ttl: 60000 } })`  |
| Delete operations                      | **10**      | `@Throttle({ default: { limit: 10, ttl: 60000 } })` |
| AI endpoints                           | **10**      | `@Throttle({ default: { limit: 10, ttl: 60000 } })` |

- AI controllers carry the AI tier at **controller level**
  (`apps/api/src/modules/ai/ai.controller.ts`); refresh = `10/min`, connector
  `:type/test` + `auth/logout` = `5`/`10` per minute respectively (CLAUDE.md #32,
  #61).
- **Every** controller with mutations (POST/PATCH/DELETE) MUST have `@Throttle()`
  (CLAUDE.md #74). No unrate-limited mutation endpoints.

## 5. Swagger — development only

- Swagger is built and mounted at `api/docs` **only when**
  `process.env.NODE_ENV === 'development'` (`main.ts`, `SwaggerModule.setup`).
- `NODE_ENV` defaults to `'production'` (CLAUDE.md #58) — so docs are off by
  default. Never widen this gate or expose Swagger in prod, and never gate
  _security_ behavior on `NODE_ENV` (CLAUDE.md #56).

## 6. Sortable fields — register in BOTH places

A field is sortable **only** when it exists in two places (CLAUDE.md #87, web #36).
Adding it to one and not the other yields `errors.validation.sortBy.invalidOption`
or a silent fallback to default sort.

1. **DTO `sortBy` enum** — the `z.enum([...])` in `List<Xxx>QuerySchema`
   (e.g. `list-cases-query.dto.ts`: `['createdAt','updatedAt','severity','status','caseNumber','title']`),
   with `sortOrder: z.nativeEnum(SortOrder)`.
2. **`build<Xxx>OrderBy` field map** — the module's `Record<string, string>` of
   allowed sort columns (e.g. `CASE_SORT_FIELDS` in
   `apps/api/src/modules/cases/cases.constants.ts`), fed to the shared
   `buildOrderBy()` helper (`apps/api/src/common/utils/query.utility.ts`) via the
   module utility (`buildCaseOrderBy` in `cases.utilities.ts`).

The field map is the allowlist — `buildOrderBy` ignores any `sortBy` not in it and
falls back to the default field. Never interpolate a raw client `sortBy` into a
Prisma `orderBy` (injection / invalid-column risk). When the frontend marks a
DataTable column `sortable: true`, both backend places must already list the field
(web #35, #36).

## 7. Before you ship

Run from repo root: `pnpm typecheck` (blocking) and `pnpm build`; `tsc` is the
gate, `tsgo` is advisory (AGENTS.md §5). Never work on `main` — branch first
(AGENTS.md §8). Prove before deleting any route/DTO/permission/env (imports,
proxy routes, migrations, i18n keys, tests).
