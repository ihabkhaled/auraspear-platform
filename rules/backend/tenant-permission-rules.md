# Rules — Backend Tenant Isolation & RBAC Permissions

> Read `../../AGENTS.md` first (loading order + the one rule: understand before
> you edit). Then `../../apps/api/CLAUDE.md` (the 100+ absolute rules — this file
> distills #8, #25, #26, #55, #76, #85). These are **hard constraints**, not
> guidance. Tenant isolation and RBAC are the two security boundaries an
> attacker probes first. A single missing `tenantId` or `@RequirePermission`
> is a cross-tenant data breach or privilege escalation.

Two invariants, enforced together on every endpoint:

1. **Tenant isolation** — every tenant-owned `findMany`/`findFirst`/`update`/
   `delete` is scoped by `tenantId`. No cross-tenant read or write, ever.
2. **RBAC** — every endpoint carries `@RequirePermission(...)`. No bypass.

## 1. The guard chain (Auth → Tenant → Permissions)

Guards are registered **globally** as `APP_GUARD` providers in
`apps/api/src/app.module.ts` (in execution order):

```
ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard
```

So the security order is **Auth → Tenant → Permissions** (Roles sits between
Tenant and Permissions and is legacy — see §6). Because they are global, you do
**not** add `@UseGuards(...)` to get them; controllers may still list
`@UseGuards(AuthGuard, TenantGuard)` explicitly for clarity (e.g.
`cases.controller.ts:39`) but that does not change the order.

- **`AuthGuard`** (`common/guards/auth.guard.ts`): verifies the access token
  (HS256 + `tokenType === 'access'` + Redis blacklist), runs
  `validateUserActive(sub)`, then builds `request.user` via
  `resolveAuthorizedTenantContext`. This is also where the GLOBAL_ADMIN
  `X-Tenant-Id` switch happens (§4). Public routes (`@Public()`) short-circuit.
- **`TenantGuard`** (`common/guards/tenant.guard.ts`): rejects (403,
  `errors.auth.tenantRequired`) if `request.user.tenantId` is missing. Skips on
  `@Public()`.
- **`PermissionsGuard`** (`common/guards/permissions.guard.ts`): reads the
  `@RequirePermission(...)` metadata and checks the user's
  role→permission set (§3).

**Never bypass any guard.** No `NODE_ENV` shortcut, no dev fake-user, no
skipping JWT verification (CLAUDE.md #23, #56).

## 2. Every tenant-owned query/update/delete MUST be scoped by `tenantId`

(CLAUDE.md #8, #26.) Data access lives in repositories; **every repository
method takes `tenantId`** and puts it in the `where`. The controller gets it
from `@TenantId()` (`common/decorators/tenant-id.decorator.ts` — throws 403 if
absent, defense-in-depth against a guard bypass) and passes it down through the
service to the repository.

```ts
// read — scope by tenant
this.prisma.case.findFirst({ where: { id, tenantId } /* ... */ })
// cases.repository.ts:86 (findCaseByIdAndTenant)
```

- **`update()` / `delete()` MUST include `tenantId` in the `where`** — never by
  `id` alone (CLAUDE.md #26). The codebase pattern is `updateMany` /
  `deleteMany` with a compound `where: { id, tenantId }`, which scopes the write
  and returns `count: 0` (instead of throwing) when the row is not in the
  caller's tenant:

  ```ts
  await tx.case.updateMany({ where: { id, tenantId }, data: updateData })
  // cases.repository.ts:285, :327, :353
  ```

- **Sub-resources MUST validate parent ownership first** (CLAUDE.md #75). For
  `/cases/:caseId/artifacts/:artifactId`, confirm the case belongs to the tenant
  before touching the artifact. A valid child id never implies valid parent
  access. Comment/task/artifact updates scope by `{ id, caseId }` _after_ the
  parent case is confirmed tenant-owned (e.g. `cases.repository.ts:500`).

- **Layering holds** (CLAUDE.md #14a/#14b): services never import
  `PrismaService`; repositories are pure data access with no `BusinessException`.
  The `tenantId` flows controller → service → repository — it is not re-derived
  or defaulted anywhere downstream.

- **A bare `findUnique({ where: { id } })` on a tenant-owned model is a review
  blocker** unless the row is genuinely global (e.g. a `User` lookup by id, or a
  `permission_definitions` row with `tenant_id IS NULL`). When in doubt, scope
  it.

## 3. Every endpoint MUST have `@RequirePermission(...)`

(CLAUDE.md #25.) Import from `@/common/decorators/permission.decorator` and pass
`Permission` enum members (`common/enums/permission.enum.ts`) — never raw
strings (CLAUDE.md #12).

```ts
@Get()
@RequirePermission(Permission.CASES_VIEW)
async listCases(@TenantId() tenantId: string, @Query() rawQuery: Record<string, string>) { ... }
// cases.controller.ts:44
```

- Multiple permissions = **AND** logic — the guard requires _all_ of them
  (`requiredPermissions.every(...)`, `permissions.guard.ts:55`).
- An endpoint with **no** `@RequirePermission` is **allowed through** the
  permissions guard (`permissions.guard.ts:27`). That is a silent auth hole —
  the missing decorator does not fail closed. Every endpoint needs one. Truly
  public endpoints use `@Public()` and are documented as such.
- Permissions are **dynamic**: the guard reads the user's set from the DB via
  `roleSettingsService.getUserPermissions(tenantId, role)`
  (`role-settings.service.ts:179`, tenant+role cached). The decorator names the
  _requirement_; the database (seeded from `default-permissions.ts`) decides
  who has it. Adding the decorator is necessary but **not** sufficient — the
  permission must also exist and be granted (§5).
- Case-owner exception only: `@AllowCaseOwner()`
  (`common/decorators/allow-case-owner.decorator.ts`) lets the owner of the
  `:id` case pass even without the permission. The guard checks
  `case.ownerUserId === user.sub` (`permissions.guard.ts:68`). Use it only
  alongside `@RequirePermission` on case sub-routes (e.g. `cases.controller.ts`
  `updateCase`), never as a general bypass.

## 4. GLOBAL_ADMIN bypass lives in the guard ONLY

GLOBAL_ADMIN is the only role that bypasses permission checks, and the bypass is
**hard-coded in one place**: `PermissionsGuard` returns `true` early when
`user.role === UserRole.GLOBAL_ADMIN` (`permissions.guard.ts:45`).
`getUserPermissions` mirrors this (returns `ALL_PERMISSIONS` for GLOBAL_ADMIN,
`role-settings.service.ts:180`).

- **Do not** add `if (role === GLOBAL_ADMIN)` checks in services, repositories,
  or utilities. The bypass is a guard concern; spreading it duplicates trust
  boundaries and invites a forgotten check.
- **Tenant switching** is also GLOBAL_ADMIN-only and also guard-level: `AuthGuard`
  reads the `X-Tenant-Id` header and `resolveAuthorizedTenantContext`
  (`auth.service.ts:374`) overrides `request.user.tenantId` **only** when the
  user is a GLOBAL_ADMIN with an active membership path to that tenant. Non-admins
  cannot switch — the header is ignored. Because `@TenantId()` reads the
  already-resolved `request.user.tenantId`, controllers need no special casing:
  the switched tenant flows through the normal `tenantId` scoping in §2.
- GLOBAL_ADMIN is omitted from `DEFAULT_PERMISSIONS`
  (`default-permissions.ts:9`) precisely because it never consults the matrix.

## 5. Adding a permission is an END-TO-END change (CLAUDE.md #85)

A new permission (e.g. `JOBS_CANCEL_ALL`) is **not** "add the enum value." All
of the following land in **one** change, or the feature is broken in production
(no migration = nobody has it; no proxy = 404 HTML; missing locale = UI crash):

1. **Backend enum** — add to `Permission` in
   `apps/api/src/common/enums/permission.enum.ts`.
2. **Definition** — add to `PERMISSION_DEFINITIONS` in
   `apps/api/src/modules/role-settings/constants/permission-definitions.ts`
   with `module`, `labelKey` (`roleSettings.permissions.<module>.<action>`),
   and a unique `sortOrder`.
3. **Defaults** — grant to the right roles in `default-permissions.ts`.
   (GLOBAL_ADMIN is never listed — it always has all.)
4. **Decorator** — put `@RequirePermission(Permission.NEW_ONE)` on the endpoint.
5. **Migration** — new dir in `apps/api/prisma/migrations/` using the
   **`WHERE NOT EXISTS`** idempotent insert. The unique constraint on
   `permission_definitions` is the **compound `(tenantId, key)`**, so
   **`ON CONFLICT ("key")` fails** — do not use it. Pattern (per-tenant insert +
   per-role grant) from `20260327_add_ai_chat_permission/migration.sql`:

   ```sql
   INSERT INTO "permission_definitions" ("id","tenant_id","key","module","label_key","sort_order","created_at")
   SELECT gen_random_uuid(), t.id, v.key, v.module, v.label_key, v.sort_order, NOW()
   FROM "tenants" t
   CROSS JOIN ( VALUES ('jobs.cancelAll','jobs','roleSettings.permissions.jobs.cancelAll',1452) )
     AS v(key, module, label_key, sort_order)
   WHERE NOT EXISTS (
     SELECT 1 FROM "permission_definitions" pd
     WHERE pd."tenant_id" = t.id AND pd."key" = v.key
   );
   ```

   A global (tenant-less) definition uses `tenant_id IS NULL` in the guard —
   see `20260321_add_jobs_cancel_all_permission/migration.sql`. Grant to roles
   with the same `WHERE NOT EXISTS` against `role_permissions` on
   `(tenant_id, role, permission_key)`. (Every schema change needs a
   migration — CLAUDE.md #30.)

6. **Frontend enum mirror** — add the same `key='value'` member to
   `apps/web/src/enums/permission.enum.ts` (it must stay byte-for-byte aligned
   with the backend values — both use e.g. `CASES_DELETE = 'cases.delete'`).
7. **Frontend API proxy route** — if a new endpoint is involved, add
   `apps/web/src/app/api/<path>/route.ts` via `proxyToBackend()` (CLAUDE.md #86;
   missing proxy = 404 HTML instead of JSON). See `apps/web/src/app/api/cases/`.
8. **i18n × 6** — add the `roleSettings.permissions.<module>.<action>` label
   **and** any feature text to **all six** locale files
   (`apps/web/src/i18n/{en,ar,es,fr,de,it}.json`), plus any new backend
   `errors.<module>.<key>` (CLAUDE.md #49). Missing keys break the UI.
9. **Seed** — run `npx prisma db seed` to populate `permission_definitions` +
   `role_permissions` so the guard actually grants it. Seeders are idempotent
   (`upsert` / `WHERE NOT EXISTS`) — CLAUDE.md #15.

Skipping any one of these passes `tsc` but ships a broken or insecure feature.

## 6. `@Roles()` is legacy — prefer `@RequirePermission`

`@Roles()` + `RolesGuard` is the old model. It is retained on the
`role-settings` controller itself and on a few infrastructure-mutation routes
(CLAUDE.md #25, #55 — e.g. connector create/update/toggle require
`TENANT_ADMIN`). For everything else, authorize with `@RequirePermission`, which
is dynamic and DB-backed. Do **not** add `@Roles()` to new feature endpoints.

## 7. Never trust client-supplied identity

- **Role and tenant come from the validated JWT / guard context only.** Never
  read a role from a request body or a client header (CLAUDE.md #76 — no
  `X-Role` forwarding, even in dev). The only honored client header is
  `X-Tenant-Id`, and only for GLOBAL_ADMIN, resolved server-side (§4).
- The frontend proxy must **not** forward auth/role headers either
  (web CLAUDE.md, Security Rules — "NEVER forward role/auth headers from client").

## Checklist before you commit an endpoint

- [ ] Method has `@RequirePermission(Permission.XXX)` (or is `@Public()` and
      documented). No endpoint relies on the "no decorator = allow" default.
- [ ] `tenantId` comes from `@TenantId()`, flows to the service and repository,
      and is in the `where` of every tenant-owned read.
- [ ] Every `update`/`delete` scopes by `{ id, tenantId }` (via
      `updateMany`/`deleteMany`), never `id` alone.
- [ ] Sub-resource routes validate parent (case) tenant ownership before the
      child query.
- [ ] No GLOBAL_ADMIN / role / tenant check leaked into services, repos, or
      utilities — authorization stays in the guard.
- [ ] If a new permission: all 9 steps in §5 done (enum, definition, defaults,
      decorator, `WHERE NOT EXISTS` migration, FE enum mirror, proxy route,
      i18n ×6, seed run).
- [ ] `pnpm typecheck` passes (blocking gate; `tsgo`/`typecheck:fast` advisory).
      No `any`, no `eslint-disable`. pnpm only, Node 22. Branch first — never
      work on `main`.

## Related

- `../../apps/api/CLAUDE.md` — full rule list (#8, #25, #26, #55, #76, #85) +
  the guard-chain "Key Principles" section.
- `../security/*` — tenant isolation, RBAC, secrets, SSRF (deeper rationale).
- `./dto-validation-rules.md` — DTO/Zod boundary that runs _before_ these guards
  matter on the body/query.
- `../../skills/backend/add-permission.md` — the step-by-step recipe for §5
  (referenced from `AGENTS.md` §11).
- `../../docs/security/` and `docs/SECURITY.md` — security architecture.
