# RBAC — Role-Based Access Control (`apps/api`)

> **Entry point first.** [`AGENTS.md`](../../AGENTS.md) is the single AI/contributor
> entry point — read its loading order (Section 1) and the RBAC invariant
> (Section 6: _"every endpoint has `@RequirePermission(...)`. Never bypass."_)
> before touching anything here. Then read the authoritative rulebook
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (Rules **25**, **55**, **76**,
> **85**; "Role Hierarchy" + "Key Principles" sections). **No AI agent may edit
> first and understand later.**

AuraSpear authorization is **two-layered and mostly dynamic**:

1. A **dynamic, database-backed permission system** — `@RequirePermission(...)` +
   `PermissionsGuard` checking a per-tenant role→permission matrix. This is the
   primary mechanism and gates **every** endpoint.
2. A **static role-hierarchy fallback** — the `@Roles(...)` decorator + `RolesGuard`
   comparing positions in a hard-coded `ROLE_HIERARCHY`. The machinery is wired
   globally and ready, but **the migration to permissions is effectively complete**:
   at the time of writing, `@Roles(...)` is not applied to any route in
   `apps/api/src` (every controller surveyed — connectors included — uses
   `@RequirePermission`). CLAUDE.md Rules 25/55 still describe `@Roles` as the
   intended fallback for connector mutations / role-settings; treat the rule as the
   contract and **verify against the code** before relying on it.

This doc explains how both work, the role hierarchy, and the end-to-end recipe for
adding a permission. It is a **deep-dive reference**; it does not restate the global
request flow or layering (see [`docs/architecture/BACKEND.md`](BACKEND.md) and
[`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)) — those are linked, not duplicated.

## Where this doc sits

| You want…                                     | Go to                                                                                               |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| The hard, enforced rules (don't violate)      | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (Rules 25, 55, 76, 85)                             |
| **Step-by-step: add a permission end-to-end** | [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md)                        |
| Tenancy + permission hard rules               | [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)        |
| Backend layering / wiring                     | [`docs/architecture/BACKEND.md`](BACKEND.md)                                                        |
| Frontend permission gating (UX, not security) | [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (Rules 33, 34) + `apps/web/src/lib/permissions.ts` |
| Security invariants overall                   | [`docs/SECURITY.md`](../SECURITY.md) · [`rules/security/`](../../rules/security/)                   |
| Auth / token lifecycle / tenant switching     | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) ("Security Architecture", "Key Principles")        |

---

## 1. The guard chain

All guards are registered **globally** as `APP_GUARD` providers in
`apps/api/src/app.module.ts` (L149–154), so they run on every route without
per-controller `@UseGuards(...)`. NestJS executes `APP_GUARD` guards in
**registration order**:

```
ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard
```

Authorization-relevant links in that chain:

- **`AuthGuard`** (`apps/api/src/common/guards/auth.guard.ts`) — verifies the JWT,
  calls `validateUserActive(sub)` (rejects blocked/deleted users with 401), and
  builds `request.user` (`JwtPayload`). It also resolves the authorized tenant
  context, which is where **GLOBAL_ADMIN tenant switching** happens (the
  `X-Tenant-Id` header overrides `request.user.tenantId` for GLOBAL_ADMIN only).
  `@Public()` routes short-circuit all of this.
- **`TenantGuard`** (`tenant.guard.ts`) — asserts `request.user.tenantId` is present
  (403 `errors.auth.tenantRequired` otherwise). The _who_ is now established; the
  _which tenant_ is enforced here and by `tenantId`-scoped queries in every
  repository (CLAUDE.md Rules 8, 26).
- **`RolesGuard`** (`roles.guard.ts`) — static role-hierarchy check; **no-ops unless
  the route carries `@Roles(...)`** metadata. No route in `apps/api/src` currently
  carries it, so this guard is presently a pass-through (see §4).
- **`PermissionsGuard`** (`permissions.guard.ts`) — dynamic permission check;
  **no-ops unless the route carries `@RequirePermission(...)`** metadata. This is
  the primary RBAC gate.

Because both `RolesGuard` and `PermissionsGuard` return `true` when their metadata
is absent, a route is gated only by the decorators you actually place on it. A route
with **neither** decorator is reachable by any authenticated, active, tenant-scoped
user — which is why CLAUDE.md Rule 25 mandates `@RequirePermission()` on **every**
endpoint.

---

## 2. `@RequirePermission` (the decorator)

Defined in `apps/api/src/common/decorators/permission.decorator.ts`:

```ts
export const PERMISSIONS_KEY = 'permissions'

export const RequirePermission = (...permissions: Permission[]): CustomDecorator<string> =>
  SetMetadata(PERMISSIONS_KEY, permissions)
```

- Takes one or more `Permission` enum members
  (`apps/api/src/common/enums/permission.enum.ts`). The value is the dotted key,
  e.g. `Permission.JOBS_CANCEL_ALL = 'jobs.cancelAll'`.
- **AND logic**: when multiple permissions are listed, the user must hold **all**
  of them (`requiredPermissions.every(...)` in the guard).
- It only attaches metadata. Enforcement lives entirely in `PermissionsGuard`.

Usage (mirrors `apps/api/src/modules/jobs/jobs.controller.ts` and the
role-settings controller):

```ts
@Post('cancel-all')
@RequirePermission(Permission.JOBS_CANCEL_ALL)
@Throttle({ default: { limit: 3, ttl: 60000 } })   // CLAUDE.md Rule 74: mutations rate-limited
async cancelAllJobs(@TenantId() tenantId: string): Promise<{ cancelled: number }> {
  const cancelled = await this.jobService.cancelAllJobs(tenantId)
  return { cancelled }
}
```

The controller does **not** need `@UseGuards(...)` — the guards are global. (Some
controllers still write `@UseGuards(AuthGuard, TenantGuard)` explicitly, e.g.
`role-settings.controller.ts` L21; this is redundant with the global registration
but harmless.)

---

## 3. `PermissionsGuard` (the enforcement)

`apps/api/src/common/guards/permissions.guard.ts`. Flow of `canActivate`:

1. **Read metadata** via `Reflector.getAllAndOverride(PERMISSIONS_KEY, [handler, class])`.
   If absent or empty → **`return true`** (no gate).
2. **Require a role**: if `request.user?.role` is missing → 403
   `errors.auth.insufficientPermissions`.
3. **GLOBAL_ADMIN bypass**: `if (user.role === UserRole.GLOBAL_ADMIN) return true`.
   GLOBAL_ADMIN always passes every permission check (CLAUDE.md Rule 25).
4. **Resolve the user's permission set** for `(tenantId, role)` via
   `RoleSettingsService.getUserPermissions(...)`, build a `Set`, and check
   `requiredPermissions.every(p => set.has(p))`.
5. **Case-owner bypass** (narrow escape hatch): if the route is also decorated with
   `@AllowCaseOwner()` (`apps/api/src/common/decorators/allow-case-owner.decorator.ts`)
   and the route param `:id` resolves to a `case` whose `ownerUserId === user.sub`,
   the request is allowed even without the permission. Used so a case owner can act
   on their own case without holding the broad permission.
6. Otherwise → **403** `errors.auth.insufficientPermissions`.

> Errors are thrown as `BusinessException(403, ..., 'errors.auth.insufficientPermissions')`
> — never a raw `ForbiddenException` (CLAUDE.md Rule 17). The `messageKey` lets the
> frontend localize via `t()`. That key must exist in all 6 locale files (Rule 49).

### How permissions are resolved + cached

`RoleSettingsService.getUserPermissions(tenantId, role)`
(`apps/api/src/modules/role-settings/role-settings.service.ts`):

- **GLOBAL_ADMIN** → returns `ALL_PERMISSIONS` (`Object.values(Permission)`) directly.
- Otherwise checks an **in-memory TTL cache** (`PermissionCacheService`, keyed
  `${tenantId}:${role}`); on miss it loads `role_permissions` rows from the DB via
  the repository, caches the `Set`, and returns it.
- The cache is **invalidated per tenant** whenever the matrix is mutated
  (`updatePermissionMatrix`, `resetToDefaults` → `cache.invalidate(tenantId)`), so
  permission changes take effect without a restart.

This means a permission decision is: _static enum on the route_ ∩ _dynamic
per-tenant DB matrix for the caller's role_, with GLOBAL_ADMIN short-circuiting to
"all".

---

## 4. Role hierarchy (`@Roles` + `RolesGuard`)

The **static** layer. The canonical, ordered hierarchy lives in
`apps/api/src/common/interfaces/authenticated-request.interface.ts` as
`ROLE_HIERARCHY` (index 0 = most privileged):

| #   | Role (`UserRole`)      | Notes                                                    |
| --- | ---------------------- | -------------------------------------------------------- |
| 0   | `GLOBAL_ADMIN`         | Platform super-admin; bypasses **all** permission checks |
| 1   | `PLATFORM_OPERATOR`    |                                                          |
| 2   | `TENANT_ADMIN`         | Top of a tenant; configures the role-settings matrix     |
| 3   | `DETECTION_ENGINEER`   |                                                          |
| 4   | `INCIDENT_RESPONDER`   |                                                          |
| 5   | `THREAT_INTEL_ANALYST` |                                                          |
| 6   | `SOAR_ENGINEER`        |                                                          |
| 7   | `THREAT_HUNTER`        |                                                          |
| 8   | `SOC_ANALYST_L2`       |                                                          |
| 9   | `SOC_ANALYST_L1`       |                                                          |
| 10  | `EXECUTIVE_READONLY`   | Read-only exec views                                     |
| 11  | `AUDITOR_READONLY`     | Read-only auditor views                                  |

> The "Role Hierarchy" list in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) shows
> an abbreviated 6-role set; the **code is the source of truth** — the enum and
> `ROLE_HIERARCHY` define 12 roles. `UserRole` is also a Prisma enum (used by the
> `RolePermission` model), so adding a role touches the Prisma schema + a migration.

`RolesGuard.canActivate` (`roles.guard.ts`):

- No-ops if the route has no `@Roles(...)`.
- Looks up the caller's index in `ROLE_HIERARCHY` (unknown role → 403
  `errors.auth.unknownRole`).
- **Minimum-role semantics**: a required role passes when
  `userRoleIndex <= requiredIndex` — i.e. the caller's role is **at least as
  privileged** as (equal to or higher than) any listed role. A `GLOBAL_ADMIN`
  (index 0) satisfies `@Roles(UserRole.TENANT_ADMIN)`.

**`@Roles` in practice (rule vs. code):** per CLAUDE.md Rule 25 the dynamic
permission system is the rule, and `@Roles` is meant to survive only where a static,
non-tenant-configurable gate is wanted — Rule 55 calls out **connector
create/update/toggle** as requiring `@Roles(UserRole.TENANT_ADMIN)` so an analyst
cannot redirect connector URLs or disable integrations. **In the current code,
however, the connector controller gates those exact routes with permissions, not
roles** (`@RequirePermission(Permission.CONNECTORS_CREATE / _UPDATE / _DELETE)` in
`apps/api/src/modules/connectors/connectors.controller.ts`), and a repo-wide search
finds **no `@Roles(...)` usage** in `apps/api/src`. So `RolesGuard` is dormant
today; the intent of Rule 55 is satisfied via the equivalent connector permissions
in the default matrix (only admin/operator roles hold `CONNECTORS_CREATE/UPDATE/DELETE`
— see `default-permissions.ts`). For new endpoints, **prefer a permission** — see the
skill's "When to use".

### Role-settings governance guards (privilege-escalation prevention)

The matrix is editable by `TENANT_ADMIN`s, so `RoleSettingsService` /
`role-settings.utilities.ts` enforce extra invariants on `updatePermissionMatrix`:

- **No self-escalation** — `assertNoEscalation` rejects granting any permission the
  actor does not already hold (`errors.roleSettings.escalationPrevented`).
  GLOBAL_ADMIN is exempt.
- **Protected role-settings perms** — a `TENANT_ADMIN` cannot change
  `ROLE_SETTINGS_VIEW/UPDATE` or the users-control permissions for any role
  (`assertProtectedRoleSettingsPermissionsUnchanged`,
  `TENANT_ADMIN_PROTECTED_PERMISSIONS`).
- **Users-control restriction** — those permissions can only be assigned to the
  allowed (admin) roles (`assertUsersControlPermissionsRestrictedToAllowedRoles`).
- **Reset** to defaults is denied to `TENANT_ADMIN` (`assertResetAllowed`).

(Separately, **protected users** — seeded GLOBAL_ADMINs with `isProtected: true` —
cannot be deleted, blocked, or have their role changed; see CLAUDE.md Rules 20–22.)

---

## 5. Where permissions are defined (the three constants + the DB)

A permission exists in **four** coordinated places; drift between them silently
denies access (see the skill's "Security checks → String key parity").

| Layer                          | File                                                                                         | Role                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Enum (source of truth)**     | `apps/api/src/common/enums/permission.enum.ts`                                               | `Permission.X = 'module.action'`; `ALL_PERMISSIONS` = `Object.values(Permission)` (never hand-edit)      |
| **Definition (label + order)** | `apps/api/src/modules/role-settings/constants/permission-definitions.ts`                     | `{ key, module, labelKey: 'roleSettings.permissions.<m>.<a>', sortOrder }` — drives the role-settings UI |
| **Default matrix**             | `apps/api/src/modules/role-settings/constants/default-permissions.ts`                        | which roles hold it on a fresh seed (GLOBAL_ADMIN omitted — always all)                                  |
| **Database**                   | `permission_definitions` + `role_permissions` tables (`apps/api/prisma/schema.prisma` L560+) | the live, per-tenant, editable matrix the guard actually reads                                           |

Key DB facts (from `schema.prisma`):

- `PermissionDefinition` is **`@@unique([tenantId, key])`** — a _compound_ unique. The
  global seed uses `tenant_id = NULL`; migrations seed a per-tenant row per tenant.
  This is why permission migrations must use **`WHERE NOT EXISTS`, not
  `ON CONFLICT ("key")`** (CLAUDE.md Rule 85 / skill step 5) — there is no single-
  column unique on `key`.
- `RolePermission` is `@@unique([tenantId, role, permissionKey])` with an `allowed`
  boolean; `getUserPermissions` returns the keys where `allowed = true`.

`CONFIGURABLE_ROLES` (bottom of `default-permissions.ts`) is **derived** from
`ROLE_HIERARCHY` minus `GLOBAL_ADMIN`, intersected with roles present in
`DEFAULT_PERMISSIONS` — so a newly-seeded role appears in the matrix automatically
without a second manual list.

---

## 6. End-to-end: adding a permission

> **The full, authoritative recipe is the skill:
> [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md)**
> (worked example: `jobs.cancelAll`). It is mirrored by **CLAUDE.md Rule 85**
> (backend) and **`apps/web/CLAUDE.md` Rule 34** (frontend). Do **not** duplicate
> it — this section is the map; the skill is the territory.

Adding a permission is an **atomic, all-or-nothing** change (AGENTS Section 6;
CLAUDE.md Rule 85). A half-applied permission is a security hole: an endpoint with
`@RequirePermission(X)` but no seeded `X` rejects **everyone** except GLOBAL_ADMIN.
The 9 coordinated edits:

1. **Backend enum** — add `Permission.MODULE_ACTION = 'module.action'`
   (`permission.enum.ts`). Don't touch `ALL_PERMISSIONS`.
2. **Definition** — append `{ key, module, labelKey, sortOrder }` to
   `permission-definitions.ts` (`labelKey` = `roleSettings.permissions.<module>.<action>`).
3. **Default matrix** — add it to the appropriate roles in `default-permissions.ts`
   (**least privilege** — destructive actions exclude read-only roles; GLOBAL_ADMIN
   is always omitted).
4. **Guard the endpoint** — `@RequirePermission(Permission.MODULE_ACTION)` on the
   controller route (+ `@Throttle` if it mutates).
5. **Prisma migration** — new dated dir under `apps/api/prisma/migrations/` using the
   **`WHERE NOT EXISTS`** pattern (compound unique — see §5); the `VALUES` role list
   must match step 3 exactly.
6. **Frontend enum mirror** — `apps/web/src/enums/permission.enum.ts` with the
   **byte-identical** string value.
7. **Frontend API proxy route** — `apps/web/src/app/api/<module>/<action>/route.ts`
   via `proxyToBackend()` (else the browser gets 404 HTML, not JSON — CLAUDE.md
   Rules 33/86).
8. **Frontend service + hook + UI** — gate the affordance with `hasPermission(...)`
   (`apps/web/src/lib/permissions.ts`). Gating UI is **UX, not security** — step 4 is
   the real enforcement.
9. **i18n in all 6 locales + re-seed** — add the `roleSettings.permissions.*` label
   (and any feature text) to `apps/web/src/i18n/{en,ar,es,fr,de,it}.json`, then run
   the seed so the running DB has the rows.

> **Tooling note:** the skill shows `pnpm prisma:seed` / `pnpm prisma:migrate`. The
> workspace is mid-upgrade — do not run `pnpm` blindly; follow the seed/migrate
> commands in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) ("Commands" → Database)
> for the api package directly when validating locally.

**Verification (from the skill):** log in as a granted role (button visible, action
works) **and** an ungranted role (button hidden **and** a direct request returns
**403 `errors.auth.insufficientPermissions`**). The server-side 403 is the proof RBAC
is enforced — a hidden button alone is a bypass.

---

## 7. RBAC invariants checklist (do not violate)

- **Every endpoint carries `@RequirePermission(...)`** (CLAUDE.md Rule 25). A route
  with no permission/role metadata is open to all authenticated tenant users.
- **GLOBAL_ADMIN bypasses permissions; nothing else does.** No `NODE_ENV` shortcut,
  no dev bypass (CLAUDE.md Rules 23, 56).
- **Permissions come only from the validated session** — never from a client header
  (`X-Role` is never forwarded; CLAUDE.md Rule 76 / `apps/web/CLAUDE.md` Rule 41).
- **String-key parity** across enum (backend) = enum (frontend) = DB `key` =
  `labelKey` segment. Any drift silently denies.
- **Least privilege**: default-matrix roles (step 3) and migration `VALUES` (step 5)
  match exactly and exclude read-only roles for mutating/destructive actions.
- **Permission ≠ tenant scope**: the permission answers _who_; every query/`update`/
  `delete` must still be `tenantId`-scoped (CLAUDE.md Rules 8, 26). Both must hold.
- **Permission ≠ approval**: a destructive AI action still needs a persisted
  `ApprovalRequest` before executing (AGENTS Section 7; CLAUDE.md Rule 97).
- **Prefer permissions over `@Roles`.** CLAUDE.md Rules 25/55 reserve `@Roles` for
  static gates (e.g. connector mutations), but the code currently uses
  `@RequirePermission` everywhere (no `@Roles` in `apps/api/src`). Gate new endpoints
  with a permission; verify against code before assuming a route is role-gated.

---

## 8. Quick reference — files

| Concern                                      | File                                                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `@RequirePermission` decorator               | `apps/api/src/common/decorators/permission.decorator.ts`                                                               |
| `@Roles` decorator                           | `apps/api/src/common/decorators/roles.decorator.ts`                                                                    |
| `@AllowCaseOwner` escape hatch               | `apps/api/src/common/decorators/allow-case-owner.decorator.ts`                                                         |
| `PermissionsGuard`                           | `apps/api/src/common/guards/permissions.guard.ts`                                                                      |
| `RolesGuard`                                 | `apps/api/src/common/guards/roles.guard.ts`                                                                            |
| `AuthGuard` / `TenantGuard`                  | `apps/api/src/common/guards/{auth,tenant}.guard.ts`                                                                    |
| Global guard wiring (`APP_GUARD`)            | `apps/api/src/app.module.ts` (L149–154)                                                                                |
| `Permission` enum + `ALL_PERMISSIONS`        | `apps/api/src/common/enums/permission.enum.ts`                                                                         |
| `UserRole` + `ROLE_HIERARCHY` + `JwtPayload` | `apps/api/src/common/interfaces/authenticated-request.interface.ts`                                                    |
| Permission definitions (labels)              | `apps/api/src/modules/role-settings/constants/permission-definitions.ts`                                               |
| Default role→permission matrix               | `apps/api/src/modules/role-settings/constants/default-permissions.ts`                                                  |
| Resolution + cache + governance              | `apps/api/src/modules/role-settings/{role-settings.service.ts,permission-cache.service.ts,role-settings.utilities.ts}` |
| DB models                                    | `apps/api/prisma/schema.prisma` (`PermissionDefinition` L560, `RolePermission` L579)                                   |
| Frontend mirror + gating                     | `apps/web/src/enums/permission.enum.ts` · `apps/web/src/lib/permissions.ts`                                            |
| **The recipe**                               | [`skills/backend/add-permission.md`](../../skills/backend/add-permission.md)                                           |
