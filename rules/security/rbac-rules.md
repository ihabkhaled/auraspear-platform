# RBAC rules — every endpoint is permission-gated, single source of truth

> **Read `AGENTS.md` first** (repo root) — §6 "Security invariants" and the one
> rule: _no AI agent may edit first and understand later._ Then
> `apps/api/CLAUDE.md` (rules 25, 55, 85). This file is the dedicated home for
> RBAC referenced by `../backend/layering-rules.md` §1 and `security-rules.md` §2.
> GOD MODE §13.2 is the source. A violation here is **privilege escalation**, not
> a style nit — every claim maps to real code.

AuraSpear's authorization is **DB-backed, per-tenant, permission-based**. Every
endpoint declares the permission it needs; the `PermissionsGuard` checks the
caller's role→permission set. Sibling depth: `../backend/tenant-permission-rules.md`
(guard chain + end-to-end flow), `tenant-isolation.md` (the tenancy layer
underneath), `../../skills/backend/add-permission.md` (the recipe).

---

## 1. Every endpoint carries `@RequirePermission(...)`

- **`@RequirePermission(Permission.MODULE_ACTION)`** from
  `@/common/decorators/permission.decorator` on **every** endpoint
  (`apps/api/CLAUDE.md` rule 25). No exceptions except `@Public()` with a
  documented reason. Permissions are dynamic, stored in the DB.
- **Use `@RequirePermission`, not `@Roles()`, on new feature endpoints.**
  `@Roles()` is **legacy** — retained only on the `role-settings` controller and
  on connector create/update/toggle (`TENANT_ADMIN`-only, `apps/api/CLAUDE.md`
  rule 55). Do not add `@Roles()` to new endpoints (`security-rules.md` §2).
- **Mutations also carry `@Throttle(...)`** at the appropriate tier
  (`apps/api/CLAUDE.md` rules 74, 80; auth 5/min, CRUD 30/min, bulk/AI 10/min).

## 2. The `PermissionsGuard` is the one enforcement point

- `apps/api/src/common/guards/permissions.guard.ts` reads the decorator metadata
  (`:21`), resolves the user's DB-backed role→permission set, and requires **all**
  listed permissions: `requiredPermissions.every(...)` (`:55`) — multiple
  permissions are **AND**.
- It is the **last guard** in the chain
  (`ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard →
PermissionsGuard`, `security-rules.md` §3). Role and tenant are already
  established from the JWT by the time it runs — never re-derive them from client
  input.

## 3. `GLOBAL_ADMIN` bypass lives in exactly one place

- `GLOBAL_ADMIN` passes all permission checks — hard-coded in **one** spot
  (`permissions.guard.ts:46`). **Never replicate `if (role === GLOBAL_ADMIN)`**
  into services, repositories, or utilities (`security-rules.md` §2). One bypass,
  one place to audit.
- The role hierarchy (most → least privileged): `GLOBAL_ADMIN`, `TENANT_ADMIN`,
  `SOC_ANALYST_L2`, `THREAT_HUNTER`, `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`
  (`apps/api/CLAUDE.md` "Role Hierarchy"). Protected seeded admins
  (`isProtected: true`) cannot be deleted/blocked/role-changed (rule 20).

## 4. The permission enum is the single source of truth

- The `Permission` enum
  (`apps/api/src/common/enums/permission.enum.ts`) is authoritative; the frontend
  enum is a **mirror** of it (`apps/web/src/enums`). Never hardcode a permission
  string — use the enum (`apps/api/CLAUDE.md` rule 12; `tenant-permission-rules.md`).

## 5. SEC-04 — the guard currently fails OPEN; the target is fail-closed

This is the most important nuance to encode (`docs/audit/security-performance-audit.md`
SEC-04, flagged `HUMAN REVIEW`):

- **Current behavior:** when **no** `@RequirePermission` decorator is present,
  `canActivate` returns `true` (`permissions.guard.ts:26-28`). An endpoint that
  ships without the decorator is reachable by **any authenticated user**, subject
  only to Auth/Tenant guards. Coverage is near-total today and the uncovered
  routes are intentional self-service/`@Public` endpoints — **no known reachable
  over-privilege today** — but a _new_ endpoint that forgets the decorator is
  exposed silently.
- **Secure-by-default intent / the target:** the guard should **fail closed** —
  deny when no permission metadata is found — with an explicit opt-out marker
  (e.g. `@AuthenticatedOnly()` or `@Public()`) on the legitimate self-service
  routes, plus a CI check that fails the build on any controller method missing
  both. This is a human-reviewed change (enumerate + annotate the decorator-less
  routes first, then flip the default, or it 403s legitimate traffic).
- **Until then:** treat "no decorator" as a bug, never a feature. **Every new
  endpoint gets `@RequirePermission` (or `@Public()` + a reason).** Do not lean
  on the fail-open default.

## 6. `@AllowCaseOwner` — scope the escape hatch

- The `@AllowCaseOwner()` decorator grants case access to the owning user
  (`permissions.guard.ts:69-76`). It is a deliberate escape hatch — but its
  lookup must be **tenant-scoped**: SEC-05 found it doing `findUnique({ where:
{ id } })` without `tenantId`. Scope it (`findFirst({ where: { id, tenantId } })`)
  (`tenant-isolation.md` §4).

## 7. Adding a permission is an end-to-end change (one commit)

`apps/api/CLAUDE.md` rule 85 — all 10 steps together, or it breaks:

1. Backend `Permission` enum (`src/common/enums/permission.enum.ts`)
2. `permission-definitions.ts` (`labelKey` + `sortOrder`)
3. `default-permissions.ts` (assign to roles)
4. `@RequirePermission()` on the endpoint
5. Prisma migration with **`WHERE NOT EXISTS`** (not `ON CONFLICT` — the unique
   constraint is compound `(tenantId, key)`)
6. Frontend permission enum (mirror)
7. Frontend API proxy route (`src/app/api/`)
8. Frontend service method + hook + UI
9. i18n keys in **all 6 locales** (feature label + `roleSettings.permissions` label)
10. `npx prisma db seed`

See `../../skills/backend/add-permission.md`.

---

## Self-check before you commit an RBAC change

- [ ] Every endpoint has `@RequirePermission(Permission.MODULE_ACTION)` (or
      `@Public()` + a documented reason). No reliance on the fail-open default.
- [ ] New endpoints use `@RequirePermission`, not legacy `@Roles()`; mutations
      throttled.
- [ ] No replicated `GLOBAL_ADMIN` bypass outside `permissions.guard.ts`.
- [ ] Permission string comes from the enum (single source of truth, FE mirrors BE).
- [ ] `@AllowCaseOwner` / any escape-hatch lookup is tenant-scoped.
- [ ] New permission added end-to-end (all 10 steps), migration uses
      `WHERE NOT EXISTS`, i18n in all 6 locales, seed run.
- [ ] No `any`/`eslint-disable`; `pnpm typecheck` green (blocking,
      `../global/validation-gates.md`); branched first
      (`../global/branch-safety.md`).

## Related

- `../../AGENTS.md` §6; `../../apps/api/CLAUDE.md` rules 25, 55, 85; "Role Hierarchy".
- `../backend/tenant-permission-rules.md` (guard chain, end-to-end flow),
  `tenant-isolation.md`, `security-rules.md` §2.
- `apps/api/src/common/guards/permissions.guard.ts`;
  `docs/audit/security-performance-audit.md` SEC-04/05; `docs/architecture/RBAC.md`.
