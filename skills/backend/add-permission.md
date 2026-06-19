# Skill: Add a permission end-to-end (`apps/api` + `apps/web`)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order + the security/AI/RBAC
> invariants), then the backend rules in [`rules/backend/`](../../rules/backend/) —
> especially [`tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md),
> [`api-rules.md`](../../rules/backend/api-rules.md), and
> [`prisma-rules.md`](../../rules/backend/prisma-rules.md). Then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (Rule **85** is this exact recipe; also
> Rules 25, 26, 30, 49, 86) and [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (Rules 33,
> 34). Sibling onboarding: [`skills/`](../), [`rules/`](../../rules/),
> [`memory/`](../../memory/), [`context/`](../../context/), [`docs/`](../../docs/). Stable
> truths: [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md).
>
> **No AI agent may edit first and understand later.** Adding a permission is an **atomic,
> 9-step change** (AGENTS-mirrored Rule 85). A half-applied permission is a security hole:
> an endpoint with `@RequirePermission(X)` but no seeded `X` rejects _everyone_ (except
> GLOBAL_ADMIN), and a frontend that hides a button but no backend guard is a bypass. Do
> **all** steps or none.

This recipe adds one permission, `<MODULE>_<ACTION>` (key `<module>.<action>`), wired from
the database through the backend guard to a frontend button gated by `hasPermission`. The
worked example below uses `jobs.cancelAll` (`JOBS_CANCEL_ALL`) — the cleanest existing
reference in the repo — so you can diff every file against a real, shipped permission.

---

## When to use

Use this skill when **any** of these is true:

- You added a backend endpoint that must be RBAC-gated by a permission that does **not yet
  exist** (`grep` the enum first — see below).
- You need a frontend affordance (button, menu item, route) shown only to users who hold a
  specific capability.
- You are splitting an existing coarse permission into finer ones.

**Do not** use this skill when:

- A suitable permission **already exists** in `apps/api/src/common/enums/permission.enum.ts`
  — reuse it. Run `grep -n "<keyword>" apps/api/src/common/enums/permission.enum.ts` before
  inventing anything.
- You only need a new **endpoint** with an existing permission → use
  [`add-endpoint.md`](add-endpoint.md).
- You are gating by **role**, not capability. The dynamic system is permission-based;
  `@Roles()` survives only on the `role-settings` controller and the connector-mutation
  endpoints (CLAUDE.md Rules 25, 55). Prefer a permission.

---

## Files to inspect first (copy the closest one)

Open these and mirror their structure exactly. Diff your change against the `jobs.cancelAll`
permission, which already exists end-to-end across all of them.

| Concern                                               | Reference file                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Backend permission enum (the source of truth)         | `apps/api/src/common/enums/permission.enum.ts`                                             |
| Permission definitions (label + sortOrder, seeded)    | `apps/api/src/modules/role-settings/constants/permission-definitions.ts`                   |
| Default role→permission matrix                        | `apps/api/src/modules/role-settings/constants/default-permissions.ts`                      |
| `@RequirePermission` decorator                        | `apps/api/src/common/decorators/permission.decorator.ts`                                   |
| Decorator used on a controller                        | `apps/api/src/modules/jobs/jobs.controller.ts` (L49 `JOBS_CANCEL_ALL`)                     |
| Reference permission migration (`WHERE NOT EXISTS`)   | `apps/api/prisma/migrations/20260402_add_ai_ops_permission/migration.sql`                  |
| Seeder that reads the constants                       | `apps/api/prisma/seed.ts` (`seedPermissionDefinitions` L6711, `seedRolePermissions` L6686) |
| Prisma model (`@@unique([tenantId, key])`)            | `apps/api/prisma/schema.prisma` (`model PermissionDefinition` L560)                        |
| `UserRole` enum (migration role list)                 | `apps/api/src/common/interfaces/authenticated-request.interface.ts` (L9)                   |
| **Frontend** permission enum (mirror)                 | `apps/web/src/enums/permission.enum.ts`                                                    |
| `hasPermission` helper                                | `apps/web/src/lib/permissions.ts` (L36)                                                    |
| Frontend API proxy route                              | `apps/web/src/app/api/jobs/cancel-all/route.ts`                                            |
| Proxy helper                                          | `apps/web/src/lib/backend-proxy.ts` (`proxyToBackend`)                                     |
| Frontend service method                               | `apps/web/src/services/job.service.ts` (`cancelAllJobs`)                                   |
| Frontend page hook gating UI                          | `apps/web/src/hooks/useJobsPage.ts` (L28 `canCancelAll`)                                   |
| i18n permission labels (`roleSettings.permissions.*`) | `apps/web/src/i18n/en.json` (L4202 `aiOps`)                                                |
| All 6 locale files                                    | `apps/web/src/i18n/{en,ar,es,fr,de,it}.json`                                               |

---

## Exact step-by-step implementation

Pick your **module** (e.g. `jobs`), **action** (e.g. `cancelAll`), enum member
(`JOBS_CANCEL_ALL`), and key (`jobs.cancelAll`). Keys are camelCase per segment (see
`cases.changeStatus`, `usersControl.forceLogoutAll`). Replace the placeholders consistently.

### 1. Backend enum — `apps/api/src/common/enums/permission.enum.ts`

Add the member under the matching `// Module` comment block. `ALL_PERMISSIONS` at the bottom
(`Object.values(Permission)`) picks it up automatically — do not edit it.

```ts
  // Jobs / Runtime
  JOBS_VIEW = 'jobs.view',
  JOBS_MANAGE = 'jobs.manage',
  JOBS_CANCEL_ALL = 'jobs.cancelAll',   // ← your new member
```

### 2. Permission definition — `apps/api/src/modules/role-settings/constants/permission-definitions.ts`

Append a `PermissionDefinitionSeed` entry. `module` groups it in the role-settings UI;
`labelKey` MUST follow `roleSettings.permissions.<module>.<action>`; `sortOrder` keeps the
block contiguous — copy the neighbouring numbers (blocks are spaced ~100 apart, e.g. AI Ops
used `2865`).

```ts
  {
    key: Permission.JOBS_CANCEL_ALL,
    module: 'jobs',
    labelKey: 'roleSettings.permissions.jobs.cancelAll',
    sortOrder: 2402,
  },
```

### 3. Default permissions — `apps/api/src/modules/role-settings/constants/default-permissions.ts`

Add `Permission.JOBS_CANCEL_ALL` to the array of **each role** that should hold it by
default. GLOBAL_ADMIN is intentionally omitted (it always passes every check). Grant the
**least** privilege: a destructive action like `cancelAll` belongs to operators/admins, not
read-only roles. Roles are keyed by `UserRole` (`PLATFORM_OPERATOR`, `TENANT_ADMIN`,
`DETECTION_ENGINEER`, `INCIDENT_RESPONDER`, `THREAT_INTEL_ANALYST`, `SOAR_ENGINEER`,
`THREAT_HUNTER`, `SOC_ANALYST_L2`, `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`,
`AUDITOR_READONLY`).

### 4. Guard the endpoint — `apps/api/src/modules/<module>/<module>.controller.ts`

Decorate the route. Import from `../../common/decorators/permission.decorator` and
`Permission` from `../../common/enums`. The controller already has
`@UseGuards(AuthGuard, TenantGuard)` (the `PermissionsGuard` reads the metadata). Mutations
also need `@Throttle()` (CLAUDE.md Rule 74).

```ts
  @Post('cancel-all')
  @RequirePermission(Permission.JOBS_CANCEL_ALL)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async cancelAllJobs(@TenantId() tenantId: string): Promise<{ cancelled: number }> {
    const cancelled = await this.jobService.cancelAllJobs(tenantId)
    return { cancelled }
  }
```

### 5. Prisma migration — `apps/api/prisma/migrations/<YYYYMMDD>_add_<module>_<action>_permission/migration.sql`

Create a new directory (date-prefixed, e.g. `20260620_add_jobs_cancel_all_permission`) with
a `migration.sql`. **Use the `WHERE NOT EXISTS` pattern, NOT `ON CONFLICT ("key")`** — the
unique constraint is the compound `@@unique([tenantId, key])`, so `ON CONFLICT ("key")` fails
to compile. Copy `20260402_add_ai_ops_permission/migration.sql` verbatim and substitute the
key, module, labelKey, sortOrder, and the role list (only the roles from step 3). Column
names are snake_case (`tenant_id`, `label_key`, `sort_order`, `permission_key`).

```sql
-- Seed Jobs Cancel-All permission
INSERT INTO "permission_definitions" ("id", "tenant_id", "key", "module", "label_key", "sort_order", "created_at")
SELECT gen_random_uuid(), t.id, 'jobs.cancelAll', 'jobs', 'roleSettings.permissions.jobs.cancelAll', 2402, NOW()
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "permission_definitions" pd WHERE pd.tenant_id = t.id AND pd.key = 'jobs.cancelAll'
);

-- Grant to the roles chosen in default-permissions.ts (NOT all roles unless intended)
DO $$ BEGIN
  INSERT INTO "role_permissions" ("id", "tenant_id", "role", "permission_key", "allowed", "created_at", "updated_at")
  SELECT gen_random_uuid(), t.id, r.role::text::"UserRole", 'jobs.cancelAll', true, NOW(), NOW()
  FROM "tenants" t
  CROSS JOIN (VALUES
      ('PLATFORM_OPERATOR'), ('TENANT_ADMIN')
  ) AS r(role)
  WHERE NOT EXISTS (
      SELECT 1 FROM "role_permissions" rp WHERE rp.tenant_id = t.id AND rp.role::text = r.role AND rp.permission_key = 'jobs.cancelAll'
  );
EXCEPTION WHEN others THEN
  RAISE NOTICE 'jobs.cancelAll role_permissions insert skipped: %', SQLERRM;
END $$;
```

> The seeder (`seed.ts`) inserts a **global** definition with `tenant_id = NULL`
> (`seedPermissionDefinitions`), while the migration seeds a per-tenant row for every existing
> tenant. Both paths are idempotent. Step 9 (re-seed) handles fresh role-permission rows; the
> migration handles already-running databases that won't be re-seeded.

### 6. Frontend enum mirror — `apps/web/src/enums/permission.enum.ts`

Add the **identical** member and string value as step 1. The string MUST match exactly — the
backend sends the key and the frontend compares it literally. Keep the `// Module` comment
grouping.

```ts
  JOBS_CANCEL_ALL = 'jobs.cancelAll',
```

### 7. Frontend API proxy route — `apps/web/src/app/api/<module>/<action>/route.ts`

Every backend endpoint the frontend calls needs a proxy route (CLAUDE.md Rule 33/86) or the
browser gets 404 HTML instead of JSON. Copy `apps/web/src/app/api/jobs/cancel-all/route.ts`.
Forward to the backend path via `proxyToBackend`. Match the HTTP method to the controller.

```ts
import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: '/jobs/cancel-all' })
}
```

### 8. Frontend service + hook + UI gated by `hasPermission`

- **Service** (`apps/web/src/services/<module>.service.ts`): add the method calling the
  Axios `api` instance against `/<module>/<action>` (the **Next.js** path, which the proxy
  forwards). Mirror `jobService.cancelAllJobs`. Export from `@/services` barrel.
- **Hook** (`apps/web/src/hooks/use<Module>Page.ts`): read permissions from the auth store
  and compute the gate. NEVER call hooks in `.tsx` — the gate lives in the hook (CLAUDE.md
  Rules 13–16):

  ```ts
  import { useAuthStore } from '@/stores'
  import { hasPermission } from '@/lib/permissions'
  import { Permission } from '@/enums'
  // inside the hook:
  const permissions = useAuthStore(s => s.permissions)
  const canCancelAll = hasPermission(permissions, Permission.JOBS_CANCEL_ALL)
  // return canCancelAll so the component can gate the button
  ```

- **UI** (`.tsx`): render the affordance only when the flag is true
  (`{canCancelAll && <Button …/>}`). The component receives `canCancelAll` from the hook —
  no hook calls, no derived `const` in the `.tsx` (CLAUDE.md Rule 60).

> Gating the UI is **UX, not security**. The backend `@RequirePermission` from step 4 is the
> real enforcement. Never rely on hiding a button alone.

### 9. i18n in all 6 locale files + re-seed

- **i18n (×6)**: add the `roleSettings.permissions.<module>.<action>` label to **every** file
  `apps/web/src/i18n/{en,ar,es,fr,de,it}.json` (CLAUDE.md Rules 9, 34; AGENTS Rule 49). Use
  the nested object form already in `en.json` (L4202): `roleSettings.permissions.jobs.cancelAll`.
  Add any **feature** text the new UI shows (button label, toast, confirm dialog) in all 6
  files too. Provide **real** translations — no `TODO`/placeholder. If a backend
  `BusinessException` `messageKey` is involved, mirror it under `errors.<module>.*` in all 6.
- **Re-seed**: populate the running dev database so the permission resolves immediately.

  ```bash
  pnpm prisma:seed     # root → runs `prisma db seed` in apps/api (seed.ts)
  ```

---

## Validation commands (real pnpm commands, run from repo root)

Run these and paste the output. **Never claim a gate green without running it** (AGENTS §5).
`pnpm` only — Node 22.

```bash
pnpm install                 # if you touched nothing dependency-wise, skip
pnpm prisma:generate         # regenerate Prisma client (no schema change here, but safe)
pnpm typecheck               # HARD GATE — both apps must compile (enum mirror, hook types)
pnpm build                   # HARD GATE — Next.js + Nest build
pnpm lint                    # advisory — catches no-explicit-any, import order, enum misuse
pnpm format:check            # advisory — Prettier (no semicolons, single quotes)
pnpm test                    # advisory — unit/e2e
```

Apply and verify the migration against a real database (dev), then re-seed:

```bash
pnpm --filter @auraspear/api prisma:migrate     # `prisma migrate dev` — applies the new migration
pnpm prisma:seed                                 # idempotent re-seed (definitions + role grants)
```

Spot-check the data actually landed (psql or Prisma Studio):

```sql
SELECT key, module, sort_order FROM permission_definitions WHERE key = 'jobs.cancelAll';
SELECT role, permission_key, allowed FROM role_permissions WHERE permission_key = 'jobs.cancelAll';
```

Manual smoke test: log in as a role you granted (button visible, action succeeds) **and** a
role you did **not** grant (button hidden, and a direct `POST /api/<module>/<action>` returns
403 `errors.auth.insufficientPermissions`). The 403 is the proof RBAC is enforced server-side.

---

## Docs to update

- **`AGENTS.md` / `apps/api/CLAUDE.md` / `apps/web/CLAUDE.md`**: no edit needed — Rule 85/34
  already describe the recipe. Only touch them if the _process_ itself changes.
- **`memory/PROJECT_MEMORY.md` / `memory/TECHNICAL_MEMORY.md`**: add a line only if this
  permission introduces a new capability domain (a whole new module), not for an incremental
  action.
- **`docs/SECURITY.md` / `docs/security/`**: update the permission/RBAC matrix if you keep one
  there and this changes the documented role capabilities.
- **`context/*.md`** for the module you touched: note the new gated action if that area has a
  context file.
- The role-settings UI is **data-driven** from `permission_definitions` + i18n — no extra doc
  or component wiring is needed for the new permission to appear in the matrix.

---

## Security checks (do not ship without these)

- **Server-side enforcement exists**: the endpoint carries `@RequirePermission(...)` (step 4).
  A frontend-only gate is a bypass. Verify the 403 in the manual smoke test.
- **Least privilege**: the default-permissions roles (step 3) and the migration `VALUES` role
  list (step 5) **match exactly** and exclude read-only roles for any mutating/destructive
  action. Do not blanket-grant to all 11 roles unless the action is genuinely universal (e.g.
  a `*.view` like `ai.ops.view`).
- **Tenant isolation intact**: the endpoint's service/repository still scopes every
  query/`update`/`delete` by `tenantId` (CLAUDE.md Rules 8, 26). The permission is _who_, not
  _which tenant_ — both must hold.
- **Destructive AI actions stay approval-required**: if the permission gates an AI action that
  mutates security/infra state, it must still create an `ApprovalRequest` before executing
  (AGENTS §7; CLAUDE.md Rule 97) — a permission does not replace approval.
- **No auth/secret/permission bypass**: no `if (NODE_ENV === ...)` shortcut, no client-supplied
  role/permission header trusted (CLAUDE.md Rules 23, 56, 76). Permissions come only from the
  validated session.
- **String key parity**: backend enum value (step 1) === frontend enum value (step 6) === DB
  `key` (step 5) === `labelKey` segment (step 2). Any drift silently denies access.
- **`labelKey` resolves**: it exists in all 6 locale files (step 9) or the role-settings UI
  shows a raw key string.

---

## Common mistakes

- **`ON CONFLICT ("key")` in the migration** — fails: the unique constraint is compound
  `(tenant_id, key)`. Use `WHERE NOT EXISTS` (step 5).
- **Forgetting the frontend proxy route (step 7)** — the browser hits `/api/<module>/<action>`,
  Next.js has no route, returns 404 HTML, and the service blows up parsing JSON.
- **Enum value mismatch** — `JOBS_CANCEL_ALL = 'jobs.cancel_all'` on backend but
  `'jobs.cancelAll'` on frontend. The literal strings must be byte-identical.
- **`labelKey` not matching `roleSettings.permissions.<module>.<action>`** — the role-settings
  matrix renders the raw key instead of a label.
- **Missing a locale** — adding only `en.json` violates AGENTS Rule 49 / CLAUDE.md Rule 34 and
  throws at render in other locales.
- **Granting to too many roles** — copy-pasting the full 11-role `VALUES` block from a `*.view`
  migration into a destructive permission over-privileges analysts.
- **Default-permissions and migration role lists disagree** — fresh seeds (constants) and
  existing DBs (migration) then diverge; the same permission behaves differently per
  environment.
- **Skipping `pnpm prisma:seed`** — endpoint returns 403 for everyone but GLOBAL_ADMIN because
  no `role_permissions` rows exist yet.
- **Inline `enum`/`const`/`type` in `.tsx` or hook files** — banned by ESLint (CLAUDE.md
  Rules 13–17). The permission lives in `@/enums`, the gate in `@/hooks`.
- **Editing `ALL_PERMISSIONS`** — it is `Object.values(Permission)`; never maintain it by hand.

---

## Final checklist

- [ ] **1.** Member added to `apps/api/src/common/enums/permission.enum.ts`.
- [ ] **2.** Entry in `permission-definitions.ts` (`module`, `labelKey`, `sortOrder`).
- [ ] **3.** Added to the correct roles in `default-permissions.ts` (least privilege).
- [ ] **4.** `@RequirePermission(Permission.<X>)` on the endpoint (+ `@Throttle` if mutation).
- [ ] **5.** Migration created with `WHERE NOT EXISTS` (not `ON CONFLICT`); role list matches step 3.
- [ ] **6.** Frontend enum mirror in `apps/web/src/enums/permission.enum.ts` (identical string).
- [ ] **7.** Next.js proxy route under `apps/web/src/app/api/<module>/<action>/route.ts`.
- [ ] **8.** Frontend service method + page hook flag (`hasPermission`) + UI gated by the flag.
- [ ] **9.** i18n `roleSettings.permissions.<module>.<action>` + feature text in **all 6** locales; `pnpm prisma:seed` run.
- [ ] `pnpm typecheck` and `pnpm build` pass (HARD GATES — output pasted).
- [ ] Migration applied (`pnpm --filter @auraspear/api prisma:migrate`) and rows verified in DB.
- [ ] Manual: granted role sees/uses the action; ungranted role gets the button hidden **and** a server-side 403.
- [ ] No `any`, no ESLint disables, no auth/secret/permission/tenant bypass introduced.

---

> **Final response format** (AGENTS §13): end with Branch / Commits / Files created / Files
> updated / Commands run / Green checks / Failed checks / Blockers / Risks / Next steps. Do not
> say "all green" unless every required gate actually passed.
