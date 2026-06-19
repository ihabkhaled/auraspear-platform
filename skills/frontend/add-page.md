# Skill: Add a Next.js App Router page (`apps/web`)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order + invariants), then the
> frontend rules in [`rules/frontend/`](../../rules/frontend/) — especially
> [`component-rules.md`](../../rules/frontend/component-rules.md),
> [`hook-service-rules.md`](../../rules/frontend/hook-service-rules.md),
> [`i18n-rules.md`](../../rules/frontend/i18n-rules.md), and
> [`api-client-rules.md`](../../rules/frontend/api-client-rules.md). Then read
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (the ~63 ABSOLUTE RULES — they are
> ESLint-enforced and will block your commit). Sibling onboarding:
> [`skills/`](../), [`memory/`](../../memory/), [`context/`](../../context/),
> [`docs/`](../../docs/). Stable truths: [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md),
> [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md).
>
> **No AI agent may edit first and understand later.** Inspect the files below, copy
> the closest existing page end-to-end, then adapt. Do not invent file layouts.

This recipe adds a portal page at `apps/web/src/app/(portal)/<route>/page.tsx` that
lists/shows tenant-scoped data. It uses `<feature>` as the placeholder route segment
and namespace (replace with your real name, e.g. `runbooks`, `entities`).

---

## When to use

Use this skill when you need to add a **new navigable page** to the web app:

- A new portal route under `(portal)` (lists, dashboards, detail workspaces).
- A page that renders tenant-scoped data fetched from the NestJS BFF.
- Any surface that appears in the sidebar / breadcrumb / route guard.

**Do not** use this for:

- A new **AI panel/surface** → use [`skills/ai/add-ai-feature.md`](../ai/add-ai-feature.md)
  - [`skills/frontend/add-ai-panel.md`](add-ai-panel.md) (AI feature catalog, renderers,
    provenance, approval categories are extra requirements).
- A new **backend endpoint** the page consumes → do that first via
  [`skills/backend/add-endpoint.md`](../backend/add-endpoint.md) (and
  [`skills/backend/add-permission.md`](../backend/add-permission.md) if it needs a new
  permission). A page with no backend endpoint cannot be "green".

---

## Files to inspect first (copy the closest one)

Open these and mirror their structure exactly. The `jobs` page is the cleanest
list-page reference; `incidents` is the fullest (filters + dialogs + detail panel).

| Concern                                     | Reference file                                                                                                       |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Render-only page (`'use client'`, JSX only) | `apps/web/src/app/(portal)/jobs/page.tsx`                                                                            |
| Page hook (orchestrates everything)         | `apps/web/src/hooks/useJobsPage.ts`                                                                                  |
| Query/mutation hooks (react-query)          | `apps/web/src/hooks/useJobs.ts`                                                                                      |
| Service layer (Axios singleton)             | `apps/web/src/services/job.service.ts`                                                                               |
| API proxy route (GET)                       | `apps/web/src/app/api/jobs/route.ts`                                                                                 |
| API proxy route (POST)                      | `apps/web/src/app/api/jobs/cancel-all/route.ts`                                                                      |
| Proxy helper                                | `apps/web/src/lib/backend-proxy.ts` (`proxyToBackend`)                                                               |
| Playwright test                             | `apps/web/e2e/dashboard.spec.ts`, `apps/web/e2e/cases.spec.ts`                                                       |
| Playwright config (login, baseURL `:3000`)  | `apps/web/playwright.config.ts`                                                                                      |
| Route → permission guard                    | `apps/web/src/lib/constants/route-permissions.ts` + `apps/web/src/lib/permissions.ts` (`canAccessRouteByPermission`) |
| Sidebar nav items                           | `apps/web/src/hooks/useSidebarComponent.ts` (`allSections`)                                                          |
| Breadcrumb labels                           | `apps/web/src/lib/constants/breadcrumb.ts` (`PATH_LABEL_MAP`)                                                        |
| i18n namespaces                             | `apps/web/src/i18n/en.json` (+ `ar`, `de`, `es`, `fr`, `it`)                                                         |
| Barrels you must update                     | `apps/web/src/hooks/index.ts`, `apps/web/src/services/index.ts`, `apps/web/src/types/index.ts`                       |

**Hard architecture facts (enforced by ESLint — see `apps/web/CLAUDE.md` rules 13–16, 60):**

- `page.tsx` files contain **JSX only**. **Zero hook calls** (not even `useState`/
  `useTranslations`), zero `interface`/`type`/`enum`/`const` declarations, zero utility
  functions, zero derived state. Everything is computed in the page hook and destructured
  from its return value.
- All `useXxx` hooks live in `src/hooks/` (one per file, barrel-exported).
- All types → `src/types/<domain>.types.ts`; enums → `src/enums/`; constants →
  `src/lib/constants/<domain>.ts`; helpers → `src/lib/<domain>.utils.ts`.
- All imports use **barrels** (`@/components/ui`, `@/components/common`, `@/hooks`,
  `@/services`, `@/types`, `@/enums`, `@/stores`). No deep subpath imports.

---

## Exact step-by-step implementation

Run everything from repo root. **pnpm only, Node 22.** Replace `<feature>`
(kebab route), `<Feature>` (PascalCase), and `<feature>` namespace consistently.

### 0. Branch (never work on `main`/`master`)

```bash
git checkout -b feat/web-<feature>-page
```

### 1. Decide the route group

- Authenticated SOC surface → `apps/web/src/app/(portal)/<feature>/`. Inherits the
  portal shell (`(portal)/layout.tsx`: sidebar, topbar, breadcrumb).
- Unauthenticated (login/callback) → `(auth)/`. Rare; only for auth flows.

Route groups `(portal)`/`(auth)` do **not** appear in the URL — `(portal)/<feature>/page.tsx`
serves `/<feature>`.

### 2. Types, enums, constants (in their dedicated homes — never inline)

- `apps/web/src/types/<feature>.types.ts` — the record shape, list/paginated response,
  search-params interface. Add each new type to `apps/web/src/types/index.ts` barrel.
- `apps/web/src/enums/` — any status/severity literal sets (string-literal unions are
  **banned**, rule 17). Barrel from `src/enums/index.ts`.
- `apps/web/src/lib/constants/<feature>.ts` — page-level constants (default sort, page
  size, filter sentinels).

### 3. Service layer

`apps/web/src/services/<feature>.service.ts` — a singleton object of async methods that
call the pre-configured Axios instance from `@/lib/api`. Paths are **relative to the
Next proxy** (`/api` is the Axios baseURL), so call `'/<feature>'`, not the backend URL.

```ts
import api from '@/lib/api'
import type { ApiResponse, FeatureRecord, FeatureSearchParams } from '@/types'

export const featureService = {
  getFeatures: (params?: FeatureSearchParams) =>
    api.get<ApiResponse<FeatureRecord[]>>('/feature', { params }).then(r => r.data),
}
```

Export it from `apps/web/src/services/index.ts`.

### 4. Query/mutation hooks (react-query)

`apps/web/src/hooks/useFeature.ts` — `useQuery`/`useMutation` wrappers. **The query key
MUST include `tenantId`** (from `useTenantStore`) and every filter param, and use
`placeholderData: keepPreviousData`. Mutations call `requirePermission(...)` before the
service and invalidate the tenant-scoped key on success. Mirror `useJobs.ts`.

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { featureService } from '@/services'
import { useTenantStore } from '@/stores'
import type { FeatureSearchParams } from '@/types'

export function useFeature(params?: FeatureSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['feature', tenantId, params],
    queryFn: () => featureService.getFeatures(params),
    placeholderData: keepPreviousData,
  })
}
```

### 5. Page hook (the orchestrator)

`apps/web/src/hooks/useFeaturePage.ts` — owns **all** state, derived values, handlers,
permission flags, and the columns/translations. This is the only place hooks are called.
Pattern (mirror `useJobsPage.ts`):

- `const t = useTranslations('feature')` and `const tErrors = useTranslations('errors')`.
- Filters/sort/pagination state via `useState` + `usePagination`.
- `canView = hasPermission(permissions, Permission.FEATURE_VIEW)` from
  `useAuthStore(s => s.permissions)` + `hasPermission` (`@/lib/permissions`).
- Build the `params` with `useMemo`, call `useFeature(params)`.
- Mutation `onError: buildErrorToastHandler(tErrors)` (`@/lib/toast.utils`) — never inline
  `Toast.error(...)`.
- Reset `pagination.setPage(1)` on any filter/sort change.
- Return a flat object the page destructures (`t`, `data`, `isFetching`, `columns`,
  `pagination`, `sortBy`, `sortOrder`, handlers, permission flags).

Export from `apps/web/src/hooks/index.ts`.

### 6. `page.tsx` (render-only)

`apps/web/src/app/(portal)/<feature>/page.tsx`. **JSX only.** Use `<PageHeader>`,
`<DataTable>`, `<Pagination>`, `<EmptyState>`, `<LoadingSpinner>` from
`@/components/common`. If the table has `sortable: true` columns, you **must** pass
`sortBy`, `sortOrder`, `onSort` (rule 35) — and those fields must exist in the backend
DTO `sortBy` enum + `buildOrderBy` (rule 36). Mirror `jobs/page.tsx`:

```tsx
'use client'
import { DataTable, EmptyState, LoadingSpinner, PageHeader, Pagination } from '@/components/common'
import { useFeaturePage } from '@/hooks'

export default function FeaturePage() {
  const { t, columns, data, isLoading, isFetching, pagination, sortBy, sortOrder, handleSort } =
    useFeaturePage()
  if (isLoading) {
    return <LoadingSpinner />
  }
  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('description')} />
      {(data?.data?.length ?? 0) === 0 && !isFetching ? (
        <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={data?.data ?? []}
            loading={isFetching}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
          />
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            onPageChange={pagination.setPage}
          />
        </>
      )}
    </div>
  )
}
```

All user-facing text via `t()` — no hardcoded strings (rule 9). No raw `<table>`
(rule 4), no raw `<input>/<select>/<textarea>` (rule 11), no static Tailwind color
classes — use the status/severity system (rule 3).

### 7. API proxy routes (REQUIRED for every backend endpoint the page calls)

Rule 33/86: every backend endpoint the frontend hits needs a matching
`apps/web/src/app/api/<path>/route.ts` using `proxyToBackend()`. Missing proxies return
404 HTML, not JSON.

- GET list → `apps/web/src/app/api/feature/route.ts`:

  ```ts
  import { type NextRequest } from 'next/server'
  import { proxyToBackend } from '@/lib/backend-proxy'

  export const dynamic = 'force-dynamic'

  export async function GET(request: NextRequest) {
    return proxyToBackend(request, { path: '/feature' })
  }
  ```

- A mutation (e.g. `POST /feature/:id/close`) → its own
  `apps/web/src/app/api/feature/[id]/close/route.ts` exporting `POST`.
- Dynamic segments use `[id]` folders; the proxy forwards query params, auth token,
  cookies, and `X-Tenant-Id` automatically. **Never forward client role/auth headers
  yourself** (`X-Role` etc. — rule 41/76). Let `proxyToBackend` set headers.

### 8. i18n keys ×6 (all locales)

Add a `<feature>` namespace to **all six** files: `apps/web/src/i18n/en.json`, `ar.json`,
`de.json`, `es.json`, `fr.json`, `it.json` (real translations, not placeholders/TODOs —
i18n rules). Provide at least these 6 keys plus column/filter labels you use:

```json
"feature": {
  "title": "Feature",
  "description": "Manage feature records",
  "emptyTitle": "No records found",
  "emptyDescription": "No records match the selected filters",
  "loadError": "Failed to load feature data",
  "actionSuccess": "Action completed successfully"
}
```

Also add the breadcrumb label key under the `nav` namespace (e.g. `"nav.feature": "Feature"`)
in all 6 files, since `PATH_LABEL_MAP` references `nav.*`.

### 9. Wire navigation, breadcrumb, and route guard

- **Sidebar**: add `{ icon: <LucideIcon>, label: t('nav.feature'), href: '/feature' }`
  to the appropriate `allSections` group in `apps/web/src/hooks/useSidebarComponent.ts`.
  Items are filtered by `canAccessRouteByPermission`, so it auto-hides without the
  permission.
- **Breadcrumb**: add `feature: 'nav.feature'` to `PATH_LABEL_MAP` in
  `apps/web/src/lib/constants/breadcrumb.ts`.
- **Route guard** (if the page requires a permission): add
  `['/feature', Permission.FEATURE_VIEW]` to `ROUTE_PERMISSION_MAP` in
  `apps/web/src/lib/constants/route-permissions.ts`. The guard matches with
  `pathname.startsWith(route)`, so `/feature/123` is covered too. If `FEATURE_VIEW` is a
  **new** permission, stop and complete [`skills/backend/add-permission.md`](../backend/add-permission.md)
  end-to-end first (rule 34/85) — do not half-add a permission.

### 10. Playwright test (REQUIRED — rule 48)

Every new page route needs `apps/web/e2e/<feature>.spec.ts`. Cover loaded state, empty
state, and that the page renders behind auth. Reuse the login `beforeEach` from
`dashboard.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'platform-admin@auraspear.io')
    await page.fill('input[name="password"]', 'Admin@123!Secure')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
  })

  test('renders the feature page', async ({ page }) => {
    await page.goto('/feature')
    await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible()
  })
})
```

`playwright.config.ts` boots `npm run dev` on `:3000` (`reuseExistingServer: true`).

---

## Validation commands (real pnpm commands, from repo root)

Run in order. **Never claim a gate green without running it** (AGENTS.md §5).

```bash
pnpm install                 # if you added/changed deps
pnpm typecheck               # HARD GATE (turbo run typecheck → web tsc --noEmit). Must pass.
pnpm --filter @auraspear/web lint:strict   # ESLint, --max-warnings 0. Enforces rules 1–63.
pnpm --filter @auraspear/web format:check  # Prettier (no semicolons, single quotes, width 100).
pnpm build                   # HARD GATE (turbo run build → next build). Must pass.
```

Page-behavior test (advisory gate, but required to exist for new routes — rule 48):

```bash
pnpm --filter @auraspear/web test:e2e      # playwright test (boots dev server on :3000)
# or single file:
pnpm --filter @auraspear/web exec playwright test e2e/<feature>.spec.ts
```

Full pre-PR sweep:

```bash
pnpm validate                # turbo run typecheck lint:strict && pnpm format:check
```

Manual smoke (optional): `pnpm dev:web`, open `http://localhost:3000/<feature>`.

> Hard gates that must be green: `pnpm typecheck`, `pnpm build`. `lint`/`format:check`/
> `test`/`test:e2e` are advisory-but-expected (tracked debt is non-blocking, but you must
> run them and report results). See [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md).

---

## Docs to update

- If the feature is user-facing/product-significant, add it to
  [`docs/PRODUCT.md`](../../docs/PRODUCT.md) and the relevant area page.
- Cross-check [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) (web app structure) and
  [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md) if you added a notable surface.
- If a decision was made (new pattern, route-group choice), add an ADR under
  [`docs/decisions/`](../../docs/decisions/).
- Record durable conventions in [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md).
- This BFF/API contract page change should agree with [`docs/API.md`](../../docs/API.md).

---

## Security checks (must hold)

- **Tenant isolation**: the query key includes `tenantId`; the page never builds
  cross-tenant requests. The backend enforces `tenantId` scoping — the proxy forwards
  `X-Tenant-Id` and the auth cookie; do not bypass it. (AGENTS.md §6.)
- **RBAC**: the page is gated by `ROUTE_PERMISSION_MAP` and the sidebar item is filtered
  by permission. Mutations call `requirePermission(...)` and the **backend** endpoint has
  `@RequirePermission(...)`. UI gating is convenience, not the security boundary — the
  backend is authoritative.
- **No auth/secret/permission bypass**: no dev-mode shortcuts, no client-forwarded role
  headers (rule 41/76), no permissions read from anything but the validated session.
- **No raw AI HTML**: if any value can be AI-generated, render it as markdown/plain text
  via a safe renderer — never `dangerouslySetInnerHTML` (rule 43; `react/no-danger` is an
  ESLint error).
- **AI destructive actions are approval-required**: if the page triggers a destructive
  security/infra action, it must surface the `approval-required` flow, not silently
  execute (AGENTS.md §7). For AI surfaces follow [`skills/ai/add-ai-feature.md`](../ai/add-ai-feature.md).
- **No secrets/PII in client state**: never store tokens, API keys, or AI transcripts in
  `localStorage` (rules 46, 55). Error toasts show only `t(getErrorKey(error))` — never
  raw backend messages (rule 40).
- Run the security skill if the change touches auth/RBAC/data exposure:
  [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md).

---

## Common mistakes

- Putting **any** hook call, `useState`, derived `const`, type, or helper inside
  `page.tsx` → ESLint `no-restricted-syntax` error (rules 13–16, 60). Move all of it into
  `useFeaturePage.ts`.
- Forgetting the **proxy route** → fetch returns 404 HTML, not JSON (rule 33/86).
- Adding i18n keys to `en.json` only → other 5 locales break at runtime. Add to **all 6**.
- Marking a column `sortable` but not passing `sortBy/sortOrder/onSort`, or the field
  missing from the backend `sortBy` enum + `buildOrderBy` → validation error / silent
  fallback (rules 35–36).
- Using `'foo' | 'bar'` string-literal unions or raw string comparisons → use enums in
  `src/enums/` (rules 12, 17, 39).
- Deep imports like `@/components/ui/button` → use the barrel `@/components/ui` (rule 29).
- Static Tailwind colors (`text-red-500`, `bg-white`) → use the status/severity classes
  (rule 3). RTL: use `start`/`end`/`ps-`/`me-`, not `left`/`right`.
- `e.target.value` → use `e.currentTarget.value` (rule 37). `console.log` → only
  `console.warn`/`console.error` (rule 8). `any`, `!`, `==` → all ESLint errors.
- Skipping the Playwright spec → rule 48 violation; the page is not done.
- Forgetting the sidebar/breadcrumb/route-guard wiring → page is unreachable or
  unprotected.
- Claiming gates passed without running them (AGENTS.md §13).

---

## Final checklist

- [ ] Branch created (`feat/web-<feature>-page`), not on `main`/`master`.
- [ ] Backend endpoint exists (and permission added end-to-end if new).
- [ ] `apps/web/src/app/(portal)/<feature>/page.tsx` — render-only, JSX only, barrels only.
- [ ] `apps/web/src/hooks/useFeaturePage.ts` (page hook) + `useFeature.ts` (query/mutations),
      both barrel-exported from `hooks/index.ts`; query keys include `tenantId`.
- [ ] `apps/web/src/services/<feature>.service.ts` + `services/index.ts` barrel.
- [ ] Types in `src/types/<feature>.types.ts` (+ barrel), enums in `src/enums/`,
      constants in `src/lib/constants/<feature>.ts`.
- [ ] Proxy route(s) under `apps/web/src/app/api/<feature>/...` using `proxyToBackend`.
- [ ] i18n: `<feature>` namespace + `nav.<feature>` label in **all 6** locale files,
      real translations.
- [ ] Sidebar item (`useSidebarComponent.ts`), breadcrumb (`breadcrumb.ts`), route guard
      (`route-permissions.ts`) all wired.
- [ ] `apps/web/e2e/<feature>.spec.ts` covering loaded + empty state (rule 48).
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ (hard gates — actually run).
- [ ] `pnpm --filter @auraspear/web lint:strict` and `format:check` run; results reported.
- [ ] `pnpm --filter @auraspear/web test:e2e` run; results reported.
- [ ] Security: tenant-scoped, RBAC-gated, no header forwarding, no secrets in client
      state, no raw AI HTML.
- [ ] Docs updated where relevant (`docs/PRODUCT.md` / `docs/ARCHITECTURE.md` / ADR /
      `memory/TECHNICAL_MEMORY.md`).
- [ ] Final response uses the AGENTS.md §13 template; no "all green" unless every required
      gate actually passed.
