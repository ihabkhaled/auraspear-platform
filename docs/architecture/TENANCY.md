# Multi-Tenancy — `tenantId` Scoping & Isolation Invariants

> **Entry point first.** Start your loading order at
> [`AGENTS.md`](../../AGENTS.md) (Section 1 — the one rule: _no AI agent may edit
> first and understand later_), then the area rulebooks
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) and
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md). This doc is a **deep-dive
> reference** on how AuraSpear keeps tenants isolated. The **hard, enforced
> rules** live in
> [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)
> and [`rules/security/security-rules.md`](../../rules/security/security-rules.md)
> — this file explains the architecture and points to them; it does not restate
> them.

AuraSpear is a **multi-tenant SOC platform**
([`AGENTS.md`](../../AGENTS.md) §2): one deployment serves many tenants (SOC
teams / MSSP customers), and **tenant data must never leak across tenants**.
Tenant isolation is the **first security boundary an attacker probes** — a
single missing `tenantId` in a `where` clause is a cross-tenant data breach. It
is the #1 security invariant in [`AGENTS.md`](../../AGENTS.md) §6 and absolute
rules #8 and #26 in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md).

## Where this doc sits

| You want…                                        | Go to                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| The hard, enforced tenancy + RBAC rules          | [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)                        |
| Security rationale (cross-tenant breach surface) | [`rules/security/security-rules.md`](../../rules/security/security-rules.md) · [`docs/SECURITY.md`](../SECURITY.md) |
| The guard chain, layering, common primitives     | [`docs/architecture/BACKEND.md`](BACKEND.md)                                                                        |
| Platform-wide request flow                       | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) · [`docs/architecture/RUNTIME.md`](RUNTIME.md)                         |
| HTTP contract (`X-Tenant-Id`, errors, paging)    | [`docs/API.md`](../API.md) · [`docs/architecture/API.md`](API.md)                                                   |
| The recipe to add a permission end-to-end        | [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md)                                        |
| Stable security truths                           | [`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md)                                                      |

This file documents **how `tenantId` flows through the request and the
invariants that keep tenants apart**. It deliberately does not re-derive the full
guard chain or the RBAC permission model — those live in
[`docs/architecture/BACKEND.md`](BACKEND.md) §4 and
[`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md).
Don't duplicate them; link them.

---

## 1. The tenancy model

A **tenant** is the isolation unit. Every SOC domain object (alert, case,
incident, connector, hunt, AI finding, …) belongs to exactly one tenant.

- **`Tenant`** (`apps/api/prisma/schema.prisma:487`) — `id` (UUID), `name`,
  unique `slug`, and a relation to almost every domain model in the schema.
- **`User`** (`schema.prisma:597`) is **not** tenant-owned — a user is a global
  identity (unique `email`) that can belong to **multiple tenants**.
- **`TenantMembership`** (`schema.prisma:622`) is the join: `(userId, tenantId)`
  unique, carrying the user's `role` (`UserRole`) and `status` (`active` /
  `inactive` / `suspended`) **per tenant**. A user can be `TENANT_ADMIN` in one
  tenant and `SOC_ANALYST_L1` in another. Cascade-deletes with either side.

So **role and tenant are properties of the membership, not the user** — the JWT
carries a _resolved_ `tenantId` + `role` for the active tenant (see §3).

### Tenant-owned vs. global rows

Domain models carry a **non-nullable** `tenantId String @map("tenant_id")`
(e.g. `Case`, `Alert`, `Incident`, `ConnectorConfig`, `AiAgent`, …). Each is
also `@@index([tenantId])` and `onDelete: Cascade` from `Tenant`, so deleting a
tenant removes its data.

A few tables are intentionally **global** and use a **nullable** `tenantId
String?`:

- `PermissionDefinition` (`schema.prisma:560`) — a `tenant_id IS NULL` row is a
  platform-wide permission definition; the unique key is the compound
  `(tenantId, key)`.
- `AppLog` / audit-style rows (`schema.prisma:1152`) — platform-level log lines
  may have no tenant.

**Rule of thumb:** a non-null `tenantId` model is tenant-owned and **must** be
scoped (§2). A nullable one is global and the `null` case is deliberate — never
"fix" it by inventing a tenant.

---

## 2. `tenantId` scoping — the core invariant

> Every tenant-owned `findMany` / `findFirst` / `update` / `delete` is scoped by
> `tenantId`. **No cross-tenant read or write, ever.**
> ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #8, #26.)

### How `tenantId` flows

`tenantId` is **never** read from the request body or re-derived downstream. It
flows one direction:

```
AuthGuard (resolves request.user.tenantId)
   → @TenantId() in the controller
      → service method argument
         → repository method argument
            → Prisma `where: { …, tenantId }`
```

- **`@TenantId()`** (`apps/api/src/common/decorators/tenant-id.decorator.ts`)
  extracts `request.user.tenantId` and **throws 403
  (`errors.auth.tenantRequired`) if absent** — defense-in-depth against a guard
  bypass.
- **Every repository method takes `tenantId`** and puts it in the `where`
  ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #14b). Services never import
  `PrismaService`; the value is passed, not defaulted.

```ts
// read — scoped by tenant
this.prisma.case.findFirst({ where: { id, tenantId } })
// apps/api/src/modules/cases/cases.repository.ts:86 (findCaseByIdAndTenant)
```

### Writes scope by `{ id, tenantId }`, never `id` alone

`update()` / `delete()` **must** include `tenantId` in the `where`
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #26). The codebase uses
`updateMany` / `deleteMany` with the compound `where: { id, tenantId }`, which
scopes the write and returns `count: 0` (instead of throwing) when the row
belongs to another tenant — so a cross-tenant id can never silently mutate a
foreign row:

```ts
await tx.case.updateMany({ where: { id, tenantId }, data: updateData })
// cases.repository.ts:285, :327, :353
```

A bare `findUnique({ where: { id } })` on a tenant-owned model is a **review
blocker** unless the row is genuinely global (e.g. a `User` lookup by id, or a
`tenant_id IS NULL` permission definition).

### Sub-resources validate the parent first

For nested routes (e.g. `/cases/:caseId/artifacts/:artifactId`), confirm the
**parent** case belongs to the caller's tenant **before** touching the child
([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #75). A valid child id never
implies valid parent access. Child writes then scope by `{ id, caseId }` after
the parent is confirmed tenant-owned.

### Beyond the database

Tenant scoping is not only a Prisma concern:

- **Cross-store linkage** — when linking alerts to a case, every alert id must
  be verified to belong to the caller's tenant via the Wazuh/OpenSearch query,
  not just the Postgres row ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
  #42, #48).
- **WebSocket rooms** — the notifications gateway joins each socket to a
  `` `${tenantId}:${userId}` `` room
  (`apps/api/src/modules/notifications/notifications.gateway.ts:83`) so realtime
  events never fan out across tenants.
- **AI memory** is tenant-scoped and stores no secrets
  ([`AGENTS.md`](../../AGENTS.md) §7; [`docs/AI.md`](../AI.md)).

### Database-level backstop (RLS)

Application scoping is the primary control. Beneath it, **Postgres Row-Level
Security** is a defense-in-depth backstop: `RlsMiddleware`
(`apps/api/src/common/middleware/rls.middleware.ts`) calls `setTenantContext()`
(`common/utils/rls.utility.ts`) to set the `app.current_tenant_id` session
variable via `SELECT set_config('app.current_tenant_id', $1, true)` after
`AuthGuard` populates `req.user`. Because the third arg is `true` (transaction-
local), RLS only spans a request when queries share an explicit
`prisma.$transaction()` — the middleware file documents this caveat. Treat RLS
as a backstop, **not** a reason to skip the `tenantId` in any `where`.

---

## 3. How `request.user.tenantId` is resolved (AuthGuard)

The active tenant lands on `request.user` in **`AuthGuard`**
(`apps/api/src/common/guards/auth.guard.ts`), the first non-throttle guard in
the global chain
(`ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard`
— see [`docs/architecture/BACKEND.md`](BACKEND.md) §4). For each request the
guard:

1. Verifies the access token (HS256 + `tokenType === 'access'` + Redis
   blacklist).
2. Runs `validateUserActive(sub)` — the user must still exist and have an active
   membership; blocked/deleted users get 401.
3. Builds `request.user` via
   `authService.resolveAuthorizedTenantContext(decoded, headerTenantId)`
   (`apps/api/src/modules/auth/auth.service.ts:374`), passing the **`X-Tenant-Id`
   header** (read at `auth.guard.ts:56`).

`resolveAuthorizedTenantContext` (`auth.service.ts:374`):

- Loads the user's **active** memberships
  (`findActiveMembershipsWithTenant(sub, ACTIVE)`); **no active membership → 401
  `errors.auth.accountInactive`**.
- `targetTenantId = requestedTenantId (X-Tenant-Id) ?? payload.tenantId`.
- If the user has a membership in `targetTenantId`, it returns that membership's
  `{ tenantId, tenantSlug, role }` — a normal user can only ever resolve to a
  tenant they belong to.
- Otherwise it falls through to the GLOBAL_ADMIN path (§4).

`TenantGuard` (`common/guards/tenant.guard.ts`) then rejects 403
(`errors.auth.tenantRequired`) if `request.user.tenantId` is still missing.

**Impersonation** (admin "log in as" a user) issues a new token pair via
`buildPayloadFromMembership` with `isImpersonated`/`impersonatorSub` claims
(`auth.service.ts`, `JwtPayload` in
`common/interfaces/authenticated-request.interface.ts:43`); the impersonated
session carries that user's own `tenantId`/`role`, and `endImpersonation`
restores the admin's context.

---

## 4. GLOBAL_ADMIN tenant switch (guard-level only)

`GLOBAL_ADMIN` is the platform super-role — the top of `ROLE_HIERARCHY`
(`authenticated-request.interface.ts:28`, ahead of `PLATFORM_OPERATOR`,
`TENANT_ADMIN`, … `AUDITOR_READONLY`). It is the **only** role that can operate
across tenants, and that power is **hard-coded in two guard-level spots — never
in services, repositories, or utilities**:

### a) Permission bypass — `PermissionsGuard`

`PermissionsGuard` (`common/guards/permissions.guard.ts:45`) returns `true`
early when `user.role === UserRole.GLOBAL_ADMIN`, before any DB permission
lookup. `getUserPermissions` mirrors this (returns all permissions for
GLOBAL_ADMIN). GLOBAL_ADMIN is deliberately **omitted** from
`DEFAULT_PERMISSIONS` because it never consults the matrix. (RBAC detail:
[`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)
§4.)

### b) Tenant switch — `AuthGuard` + `resolveGlobalAdminTenantContext`

When `targetTenantId` is **not** one of the caller's own memberships,
`resolveAuthorizedTenantContext` delegates to
`resolveGlobalAdminTenantContext` (`auth.service.ts:980`):

1. **`hasGlobalAdminMembership(memberships)`** must be true
   (`auth.utilities.ts:164`) — otherwise **403 `errors.auth.noTenantAccess`**. A
   non-GLOBAL_ADMIN sending `X-Tenant-Id` for a tenant they don't belong to is
   rejected; **the header is ignored for them**.
2. The target tenant must exist (`findTenantById`) — otherwise **400
   `errors.tenants.notFound`**.
3. It returns `{ tenantId, tenantSlug, role: GLOBAL_ADMIN }`, **overriding**
   `request.user.tenantId` for the rest of the request.

Because `@TenantId()` reads the already-resolved `request.user.tenantId`,
**controllers and repositories need zero special-casing** — the switched tenant
flows through the exact same `tenantId` scoping as §2. The bypass does **not**
weaken scoping; it only changes _which_ tenant the standard scoping targets.

> **Invariant:** do **not** add `if (role === GLOBAL_ADMIN)` checks anywhere
> below the guard. Spreading the bypass duplicates a trust boundary and invites
> a forgotten check.
> ([`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)
> §4.)

### Frontend side of the switch

The web app exposes this via the **`TenantSwitcher`**
(`apps/web/src/components/layout/TenantSwitcher.tsx`); the selected tenant is
persisted in `useTenantStore` (`apps/web/src/stores/tenant.store.ts`,
`tenant-storage` key). The Axios interceptor
(`apps/web/src/lib/api.ts:152`) reads the switched `currentTenantId` (falling
back to the JWT's tenant) and sends it as the **`X-Tenant-Id`** header; the
Next.js API proxy forwards it (`apps/web/src/lib/backend-proxy.ts:69`). The
backend re-validates it server-side per the rules above — the header is a
_request_, not a grant. See [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)
("Tenant switching").

---

## 5. Never trust client-supplied identity

- **Role and tenant come from the validated JWT / guard context only.** Never
  read a role from a request body or client header
  ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) #76 — **no `X-Role`
  forwarding, even in dev**). The **only** honored client header is
  `X-Tenant-Id`, and only for GLOBAL_ADMIN, resolved server-side (§4).
- The Next.js proxy forwards `Authorization`, `Cookie`, `X-Tenant-Id`,
  `X-CSRF-Token`, and forwarding/IP headers — but **not** any role header
  (`apps/web/src/lib/backend-proxy.ts`;
  [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) Security Rules — "NEVER forward
  role/auth headers from client").
- **No auth/tenant bypass on `NODE_ENV`** — every scoping and validation check
  runs in every environment ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
  #23, #56).

---

## 6. Isolation invariants (quick reference)

These are enforced; full text in the rule files linked above.

1. Every tenant-owned read scopes by `tenantId`; every `update`/`delete` scopes
   by `{ id, tenantId }` (via `updateMany`/`deleteMany`) — never `id` alone.
2. `tenantId` flows `@TenantId()` → service → repository; it is never read from
   the body or re-derived. `@TenantId()` throws 403 if absent.
3. Every repository method takes `tenantId`; services never import
   `PrismaService`.
4. Sub-resource routes validate **parent** tenant ownership before the child
   query.
5. Cross-store references (alert ids, IOC ids) are verified to be same-tenant
   before linking.
6. GLOBAL_ADMIN permission bypass lives **only** in `PermissionsGuard`; the
   tenant switch lives **only** in `AuthGuard` + `resolveGlobalAdminTenantContext`.
   No role/tenant check leaks into services, repos, or utilities.
7. A non-GLOBAL_ADMIN's `X-Tenant-Id` is ignored; an unknown/non-member target
   is rejected (401/403/400).
8. RLS (`app.current_tenant_id`) is a DB-level backstop — never a substitute for
   the application `tenantId` scope.
9. Never trust client-supplied role/tenant; no `X-Role`; no `NODE_ENV` bypass.

### Checklist before committing a tenant-touching change

- [ ] Every new/changed query, `update`, `delete` scoped by `{ id, tenantId }`
      (or the row is provably global).
- [ ] `tenantId` sourced from `@TenantId()` and threaded to the repository.
- [ ] Sub-resources validate parent tenant ownership first.
- [ ] No GLOBAL_ADMIN / role / tenant conditional added outside the guards.
- [ ] No client role/tenant header trusted; proxy forwards no role header.
- [ ] If a permission is involved, the **end-to-end** steps in
      [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)
      §5 / [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md)
      are all done.

---

## Related

- [`AGENTS.md`](../../AGENTS.md) — universal entry point; §6 security invariants.
- [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — absolute rules #8, #26, #42,
  #48, #75, #76 + "Key Principles" (guard chain, GLOBAL_ADMIN switch, soft
  delete).
- [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) — tenant store, `X-Tenant-Id`
  interceptor, `TenantSwitcher`, no role-header forwarding.
- [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)
  — the authoritative hard rules for tenancy + RBAC.
- [`rules/security/security-rules.md`](../../rules/security/security-rules.md) —
  cross-tenant breach surface and review blockers.
- [`docs/architecture/BACKEND.md`](BACKEND.md) — guard chain, layering, common
  primitives (RLS middleware, decorators).
- [`docs/SECURITY.md`](../SECURITY.md) · [`docs/security/THREAT_MODEL.md`](../security/THREAT_MODEL.md)
  — security architecture and threat model.
- [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md) ·
  [`skills/backend/add-endpoint.md`](../../skills/backend/add-endpoint.md) —
  step-by-step recipes that keep scoping intact.
