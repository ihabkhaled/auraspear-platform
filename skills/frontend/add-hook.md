# Skill — Add a Frontend Hook (`apps/web/src/hooks`)

> **Read `AGENTS.md` first** (loading order in §1; security invariants §6; AI
> safety §7; validation gates §5; "never claim green without running it" §5/§13).
> Then read the hard rules that govern this task —
> `rules/frontend/hook-service-rules.md` (hooks/services/query-keys/derived
> state, the authority for this skill) and `apps/web/CLAUDE.md` (web rules
> **#14, #16, #29, #60**, the RBAC `tenantId` rule, and the Search/Filter
> section). Sibling onboarding dirs: `rules/`, `skills/` (you are here),
> `memory/`, `context/`, `docs/`. Companion skills:
> `skills/frontend/add-page.md`, `skills/frontend/add-ai-panel.md`,
> `skills/backend/add-endpoint.md`.

This recipe adds a custom React hook to `apps/web/src/hooks/`: **one hook per
file**, **barrel-exported** from `hooks/index.ts`, server state via **TanStack
Query**, **every query key includes `tenantId`**, and **derived state computed in
the hook via `useMemo`** (never in the `.tsx`).

---

## When to use

Use this skill when you need any of:

- A **data hook** wrapping one `useQuery`/`useMutation` over a `@/services`
  method (e.g. a new `useFoo()` / `useCreateFoo()`). Hooks are the **only** place
  service methods may be called.
- A **page hook** (`useFooPage`) that orchestrates everything a page renders and
  returns a flat object of ready-to-render values + handlers (the `.tsx` calls
  exactly one page hook and renders JSX only).
- A small **derived-state / UI-logic hook** (filters, dialogs, columns, `canX`
  permission booleans) extracted out of a component because **no hook may be
  called inside a `.tsx` file** (web `CLAUDE.md` #14, #16).

Do **not** use this skill for AI calls — those go through dedicated `useAi*.ts`
hooks; see `rules/frontend/ai-ui-rules.md` and `skills/frontend/add-ai-panel.md`.
Do **not** put the hook in a component, `services/`, `stores/`, or `app/api/`
file (all banned scopes for hooks).

---

## Files to inspect first

Read these real files before writing — copy their shape, don't invent one:

- `rules/frontend/hook-service-rules.md` — the binding rules (§2 hooks, §3 query
  keys, §4 derived state, §7 definition of done).
- `apps/web/src/hooks/useAlerts.ts` — canonical **data hooks**: `useQuery` with
  `queryKey: ['alerts', tenantId, params]`, mutation with `requirePermission(...)`
  inside `mutationFn`, and `invalidateQueries` keyed on `tenantId`.
- `apps/web/src/hooks/useAttackPaths.ts` — list/stats/detail/CRUD hooks with
  `placeholderData: keepPreviousData` and `enabled: id.length > 0`.
- `apps/web/src/hooks/useVulnerabilitiesPageFilters.ts` — **derived state via
  `useMemo`** (`columns`), `useCallback` handlers, `useDebounce(searchQuery, 400)`,
  reset page to 1 on filter change, backend-driven search params.
- `apps/web/src/hooks/useAttackPathsPage.ts` — a page hook composing sub-hooks
  and exposing `canCreate/canEdit/canDelete` from `hasPermission(...)`.
- `apps/web/src/hooks/index.ts` — the **barrel**; every hook is re-exported here.
- `apps/web/src/lib/permissions.ts` — `hasPermission` (UI gating) and
  `requirePermission` (throws `PermissionError`; used inside `mutationFn`).
- `apps/web/src/services/index.ts` + the relevant `*.service.ts` — the service
  method your hook calls (must already exist and be barrel-exported; if not, add
  it per `rules/frontend/hook-service-rules.md` §1 and `skills/frontend/add-page.md`).
- `apps/web/src/types/index.ts` — where the param/return types live (types are
  **banned** inside hook files, web `CLAUDE.md` #13).

---

## Exact step-by-step implementation

### 0. Branch (never work on `main` — `AGENTS.md` §8)

```bash
git checkout -b feat/web-use-foo-hook
```

### 1. Confirm prerequisites exist (prove before writing)

- The service method exists and is exported from `@/services`
  (`apps/web/src/services/index.ts`). If it does not, add it first — hooks never
  call `axios`/`fetch` directly; all HTTP goes through `@/lib/api`.
- The param/return types exist in `src/types/` (barrel `@/types`). **Do not**
  declare `interface`/`type`/`enum`/SCREAMING_CASE `const` in the hook file —
  `hooks/` is a banned scope (web `CLAUDE.md` #13). Move them to `src/types/`,
  `src/enums/`, `src/lib/constants/`.
- The `Permission.*` enum values you will gate on exist in `src/enums`
  (`@/enums`) and mirror the backend enum.

### 2. Create the hook file — one hook per file

File name camelCase, prefixed `use`: `apps/web/src/hooks/useFoo.ts`. Add
`'use client'` only if the hook uses React state/effects/`useTranslations`
(page/filter/dialog hooks do; pure data hooks like `useAlerts.ts` do not — match
the closest sibling).

**Data hook (query)** — query key starts `['<domain>', tenantId, ...]`:

```ts
import { useQuery } from '@tanstack/react-query'
import { fooService } from '@/services'
import { useTenantStore } from '@/stores'
import type { FooSearchParams } from '@/types'

export function useFoos(params?: FooSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['foos', tenantId, params],
    queryFn: () => fooService.getFoos(params),
    placeholderData: keepPreviousData, // for paginated/filtered lists
  })
}

export function useFoo(id: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['foos', tenantId, id],
    queryFn: () => fooService.getFooById(id),
    enabled: id.length > 0,
  })
}
```

**Data hook (mutation)** — enforce permission inside `mutationFn`, invalidate
**every** affected key with `tenantId`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { fooService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'

export function useCreateFoo() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: FooCreateInput) => {
      requirePermission(permissions, Permission.FOOS_CREATE)
      return fooService.createFoo(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['foos', tenantId] })
    },
  })
}
```

> Combine the `@tanstack/react-query` imports into one line
> (`import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'`)
> — `import-x/no-duplicates` is `error`.

### 3. Query keys — ALWAYS include `tenantId` (tenant isolation)

- Read tenant from the store: `const tenantId = useTenantStore(s => s.currentTenantId)`.
- Shape: `['<domain>', tenantId, ...discriminators]`. Examples from
  `useAlerts.ts`: `['alerts', tenantId, params]`, `['alerts', tenantId, id]`,
  `['alerts', 'timeline', tenantId, alertId]`.
- The key must contain **every** filter/sort/pagination param so React Query
  refetches on change (web `CLAUDE.md` Search/Filter rule #6).
- **Mutations must invalidate every affected key with `tenantId`** — both the
  list (`['foos', tenantId]`) and the detail (`['foos', tenantId, id]`).
- **Omitting `tenantId` is a tenant-isolation break**, not a cache quirk: a
  GLOBAL_ADMIN tenant switch would serve another tenant's cached data
  (`AGENTS.md` §6; `rules/frontend/hook-service-rules.md` §3).

### 4. Derived state — compute in the hook via `useMemo`

- **No derived `const` in `.tsx`** (web `CLAUDE.md` #60). Any value computed from
  props/hook results/API responses is produced **inside the hook** and returned
  ready-to-render.
- Use **`useMemo`** keyed on real inputs for mapped/option/column lists; wrap
  handlers in `useCallback`. Pattern in `useVulnerabilitiesPageFilters.ts`:

```ts
const columns = useMemo(() => getFooColumns({ foos: t }), [t])
```

- Backend-driven search/filter/sort/pagination: build `searchParams`, pass into
  the data hook, `useDebounce(searchQuery, 400)` for text, **reset page to 1** on
  any filter change, pass `isFetching` (not `isLoading`) to `<DataTable>`.
- Respect `react-hooks/exhaustive-deps` (warn) — list every dependency; **never**
  silence it with a disable comment (web `CLAUDE.md` #2, absolute).
- **Permission gating is derived state too**: page hooks expose `canX` booleans
  from `hasPermission(permissions, Permission.X)` for the `.tsx` to gate UI
  (`{canX && ...}`). UI gating is **not** enforcement — mutation hooks still call
  `requirePermission(...)`, and the backend `@RequirePermission(...)` is the real
  gate.

### 5. Page hook (if adding one) — flat return object

Compose data hooks + filter/dialog sub-hooks and return one flat object the page
renders. When it grows past ~150 lines, split into
`useFooPageFilters` / `useFooPageDialogs` / `useFooPageCrud` and compose them
(see `useAttackPathsPage.ts`). The `.tsx` calls exactly one page hook.

### 6. Barrel-export from `hooks/index.ts`

In the **same change**, add the export so consumers import from `@/hooks` (never
a subpath — web `CLAUDE.md` #29):

```ts
export { useFoos, useFoo, useCreateFoo } from './useFoo'
```

### 7. Consume via the barrel

```ts
import { useFoos, useCreateFoo } from '@/hooks'
```

### 8. Errors / toasts / i18n (if the hook shows toasts)

Mutation `onError` uses `buildErrorToastHandler(tErrors)` from `@/lib/toast.utils`
(never inline `Toast.error(...)` — web `CLAUDE.md` #62). The error-toast hook uses
`useTranslations('errors')` because `getErrorKey()` returns keys **without** the
`errors.` prefix. Any new user-facing string goes through `t()` and must be added
to **all 6 locale files** (`en, es, it, fr, ar, de`).

---

## Validation commands (run from repo root — `pnpm` only, Node 22)

```bash
pnpm --filter @auraspear/web typecheck   # blocking gate
pnpm --filter @auraspear/web lint        # ESLint (enforces #13/#14/#16/#29/#60)
pnpm --filter @auraspear/web build       # blocking gate
pnpm --filter @auraspear/web test        # if you added/changed a hook test
```

Repo-wide equivalents from `AGENTS.md` §4: `pnpm typecheck`, `pnpm lint`,
`pnpm build`, `pnpm test`, or `pnpm validate` (full). `pnpm typecheck:fast`
(tsgo) is **advisory only** — the blocking gate is `pnpm typecheck`.
**Never claim a gate green without running it** (`AGENTS.md` §5/§13).

---

## Docs to update

- `apps/web/src/hooks/index.ts` — the barrel export (mandatory, same change).
- If the hook backs a new page route, add the Playwright test
  (`apps/web` e2e — web `CLAUDE.md` #48: loaded/empty/error/responsive) and
  follow `skills/frontend/add-page.md`.
- If you introduced new user-facing strings: all 6 `src/i18n/*.json` locale files.
- If the change alters contributor setup/validation/workflow, update the relevant
  `README.md`/`docs/**` and the Codex/Cursor companion rules in the same change
  (web `CLAUDE.md` audit rule #36). Add a `docs/decisions/ADR-*.md` only for a
  notable architectural choice.

---

## Security checks (must all hold)

- **Tenant isolation**: every `queryKey` and every `invalidateQueries` key
  includes `tenantId` from `useTenantStore`. No bare `['foos']` keys
  (`AGENTS.md` §6).
- **RBAC**: every mutation hook calls `requirePermission(permissions, Permission.X)`
  inside `mutationFn` **before** the service call. UI `canX` booleans gate
  rendering but are **not** the enforcement boundary — the backend
  `@RequirePermission(...)` is. Never bypass either.
- **No auth/secret/permission bypass**: hooks never read or forward
  `X-Tenant-Id`/`X-Role`/auth headers — the `@/lib/api` interceptor owns those.
  Never put tokens/secrets in a hook or in `localStorage`.
- **AI safety** (AI hooks only): AI is analyze-and-suggest; destructive AI actions
  are `approval-required` (persisted approval + permission) — surface approval
  state, never auto-fire. **Never render raw AI HTML / `dangerouslySetInnerHTML`**;
  never persist AI transcripts to `localStorage` (`AGENTS.md` §7;
  `rules/frontend/ai-ui-rules.md`).
- **No `any`** anywhere; no `// eslint-disable` / `@ts-ignore` / `@ts-expect-error`
  (web `CLAUDE.md` #1, #2 — absolute).

---

## Common mistakes

- **Query key missing `tenantId`** → tenant-isolation break on tenant switch.
  Always `['<domain>', tenantId, ...]`.
- **Forgetting `tenantId` in `invalidateQueries`** → stale cross-tenant cache.
- **Derived `const` left in the `.tsx`** → violates #60. Move it into the hook via
  `useMemo` and return the finished value.
- **Calling a hook (or a service) inside a `.tsx`** → violates #14/#16. Extract to
  a hook in `src/hooks/`.
- **Declaring an `interface`/`type`/`enum`/SCREAMING_CASE `const` in the hook
  file** → `hooks/` is a banned scope (#13). Move to `src/types/`, `src/enums/`,
  `src/lib/constants/`.
- **Subpath import** (`@/hooks/useFoo`) or forgetting the barrel export → breaks
  #29 and leaves the hook unreachable from `@/hooks`.
- **Calling `axios`/`fetch` in the hook** → all HTTP goes through a `@/services`
  method (which uses `@/lib/api`).
- **`requirePermission` only in the UI, not in `mutationFn`** → relying on UI
  gating for enforcement. Enforce in the mutation; the backend is the real gate.
- **Silencing `react-hooks/exhaustive-deps`** with a disable comment → forbidden
  (#2). Fix the dependency array.
- **Passing `isLoading` instead of `isFetching`** to `<DataTable>` loading on a
  filtered list → flicker; use `isFetching` + `placeholderData: keepPreviousData`.
- **Working on `main`** or claiming "all green" without running the gates.

---

## Final checklist

- [ ] Branched off `main` (`feat/…` | `fix/…` | `chore/…`).
- [ ] One hook concern per file, in `apps/web/src/hooks/`, correct `'use client'`.
- [ ] Server state via **TanStack Query** (`useQuery`/`useMutation`); duplicate
      `@tanstack/react-query` imports merged.
- [ ] **Every** `queryKey` and `invalidateQueries` key includes `tenantId` from
      `useTenantStore`; keys contain all filter/sort/pagination params.
- [ ] Derived state computed in the hook via **`useMemo`** (handlers via
      `useCallback`); none left in the `.tsx`; `exhaustive-deps` satisfied (no
      disable).
- [ ] Mutations call `requirePermission(permissions, Permission.X)` in
      `mutationFn`; page hooks expose `canX` from `hasPermission(...)`.
- [ ] No `any`; no eslint-disable/ts-ignore; no `interface`/`type`/`enum`/const
      declared in the hook file; no direct `axios`/`fetch`; no secrets/tokens.
- [ ] Barrel-exported from `hooks/index.ts`; consumers import from `@/hooks`.
- [ ] New user-facing strings added to all 6 locale files; toasts via
      `buildErrorToastHandler`.
- [ ] (AI hooks) approval-required surfaced; no raw AI HTML; no transcripts in
      `localStorage`.
- [ ] `pnpm --filter @auraspear/web typecheck`, `lint`, `build`
      (and `test` if applicable) **run and green** — not assumed.
