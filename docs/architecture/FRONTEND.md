# Frontend Architecture — `apps/web` (`@auraspear/web`)

> **Entry point for all contributors and AI agents is [`AGENTS.md`](../../AGENTS.md)** (repo root).
> Read it first; it defines the loading order (`memory/` → `context/` → `rules/` → `skills/` →
> `docs/` → code) and the hard invariants. This document is the **deep reference for the web app's
> internals**. It does **not** repeat the end-to-end request flow, route map, or backend wiring
> already covered in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — read that for the system view,
> then come here for `apps/web/src` structure and conventions.

## Scope and sibling docs

This file describes how the Next.js app under `apps/web/src` is organized: the App Router shell,
the layered `components / hooks / services / stores / lib / i18n / enums / types` split, the
Next.js API proxy routes, and the providers/guards that wrap the app.

| For…                                                | Read                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| System-wide architecture, request flow, route map   | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)                                   |
| The exhaustive frontend rule set (the law)          | [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)                               |
| Backend (BFF) the proxies call                      | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md), [`docs/API.md`](../API.md)   |
| Hard rules / step-by-step recipes for frontend work | `rules/frontend/**`, `skills/frontend/**` (e.g. `skills/frontend/add-page.md`) |
| AI panels / surfaces                                | [`docs/AI.md`](../AI.md), `skills/frontend/add-ai-panel.md`                    |
| Docs index                                          | [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md)                                       |

The web app's rules are extensive and **ESLint-enforced** — this doc summarizes the architecture
they produce. When this doc and `apps/web/CLAUDE.md` diverge, the **code and CLAUDE.md win**; please
fix the divergence.

---

## 1. Stack and posture

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5** (strict; see the long strict-flag
  list in `apps/web/CLAUDE.md` — `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, etc.).
- **Tailwind CSS v4** (CSS-first `@theme` in `src/app/globals.css`, no `tailwind.config.js`) +
  **shadcn/ui** (new-york) base components.
- **@tanstack/react-query** (server state), **react-hook-form** + **zod** (forms),
  **Zustand** (global client state), **next-intl** (i18n), **next-themes** (dark/light),
  **Axios** (HTTP), **sonner** (toasts), **sweetalert2** (confirm dialogs), **lucide-react** (icons),
  **react-virtuoso** (virtualized lists), **@serwist** (PWA service worker).
- **Build/lint scripts** use **webpack** (`next dev --webpack` / `next build --webpack`); see the
  NPM scripts table in `apps/web/CLAUDE.md`. Do **not** run `pnpm` while the workspace is mid-upgrade.

The app is a pure **BFF client**: it never calls Wazuh / OpenSearch / MISP / etc. directly. The
browser talks only to `/api/**` route handlers in this same app, which proxy to the NestJS backend
(see §5).

---

## 2. `apps/web/src` directory map

```
src/
├── app/                # Next.js App Router: route groups, pages, API proxy routes
│   ├── (auth)/         # login, callback (auth route group, no shell)
│   ├── (portal)/       # authenticated portal shell + all SOC/AI/admin pages
│   ├── api/            # 315 Next.js route handlers → proxy to NestJS (§5)
│   ├── layout.tsx      # Root layout: reads locale cookie, mounts <Providers> + <Toaster>
│   ├── providers.tsx   # Client providers (Serwist, next-intl, react-query, next-themes) (§4)
│   ├── page.tsx        # Home redirect
│   ├── globals.css     # Tailwind v4 @theme + status/severity color classes
│   └── sw.ts           # Service worker (EXCLUDED from tsconfig — see CLAUDE rule 38)
├── components/         # 43 domain folders + common/ + ui/ + layout/ + charts/ (§6)
├── hooks/              # ~380 custom hooks; ALL hooks live here, barrel via index.ts (§7)
├── services/           # 45 API service objects (Axios calls), barrel via index.ts (§8)
├── stores/             # 7 Zustand stores, barrel via index.ts (§9)
├── lib/                # utils, api.ts, backend-proxy.ts, dayjs.ts, constants/ (§10)
├── i18n/               # en/es/it/fr/ar/de JSON + getRequestConfig (§11)
├── enums/              # 50+ enum files; ALL string-literal types live here, barrel index.ts
└── types/              # 44 type/interface files; ALL types live here, barrel index.ts
```

> **Note on the route layout vs. CLAUDE examples.** Some `apps/web/CLAUDE.md` snippets show paths
> like `src/app/[locale]/incidents/page.tsx`. The **actual** routing uses **route groups**
> `(auth)` and `(portal)` with **no `[locale]` URL segment** — locale is chosen from a `locale`
> **cookie** (see §11), not the path. Also, `apps/web/CLAUDE.md` references `src/middleware.ts` for
> route protection; **no such file exists** in `apps/web/src` today. Auth/permission gating is done
> by client components (`AuthGuard` / `RoleGuard`, §4) and enforced authoritatively by the backend
> guard chain (`docs/ARCHITECTURE.md` §3–5).

### The separation-of-concerns invariant (ESLint-enforced)

`.tsx` component files contain **only JSX and component structure** — no hook calls, no
`const`/`interface`/`enum`/`type` declarations, no utility functions, no Zod schemas. Everything is
hoisted to its dedicated home: hooks → `hooks/`, types → `types/`, enums → `enums/`, constants →
`lib/constants/`, utilities → `lib/*.utils.ts`, validation schemas → `lib/validation/`. This is
`no-restricted-syntax` enforced; see rules #13–#16 in `apps/web/CLAUDE.md`.

---

## 3. App Router shell (`src/app`)

### Root layout — `app/layout.tsx`

Server component. Reads the `locale` cookie, validates it against `SUPPORTED_LOCALES`
(`lib/constants/locales`), computes text direction (`ar` → `rtl`, else `ltr`), dynamically imports
`@/i18n/<locale>.json`, sets `<html lang dir suppressHydrationWarning>`, and renders `<Providers>`
plus the sonner `<Toaster>` (RTL-aware position). Page metadata, viewport, and PWA manifest/icons
are declared here.

### Route groups

- **`(auth)`** — `login`, `callback`. Has its own `layout.tsx` with no portal chrome.
- **`(portal)`** — the authenticated app. `(portal)/layout.tsx` wraps every page:

  ```tsx
  <AuthGuard>
    <PortalShell>
      <RoleGuard>{children}</RoleGuard>
    </PortalShell>
  </AuthGuard>
  ```

  `PortalShell` (`components/layout`) is the chrome: `Sidebar`, `Topbar`, `Breadcrumb`,
  `TenantSwitcher`, `NotificationBell`, `CommandPalette`, `LanguageSwitcher`, `ThemeSwitcher`,
  `UserMenu`, `ImpersonationBanner`, `SidebarHealthFooter`.

The portal pages cover the full product surface (core SOC, connectors/data-explorer, AI surfaces,
admin/account). The canonical list is in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §7 — not
duplicated here.

### Page = thin shell over a page hook (MANDATORY)

Each page imports exactly one page-level hook (e.g. `useAlertsPage`, `useIncidentPage`) and renders
JSX only:

```tsx
export default function AlertsPage() {
  const { t, data, isLoading, columns, pagination /* … */ } = useAlertsPage()
  return (/* ONLY JSX — no hooks, no logic */)
}
```

See `useAlertsPage` (`src/hooks/useAlertsPage.ts`) for the real pattern: it composes filter state,
debounced search, pagination, permission booleans (`canInvestigate`, `canCreateCase`, …), react-query
data, DataTable columns, and all handlers, then returns one ready-to-render object. Large page hooks
are split into `useXPageFilters` / `useXPageCrud` / `useXPageDialogs` and composed (CLAUDE rule:
no page hook > ~150 lines).

---

## 4. Providers and guards

### `app/providers.tsx`

A `'use client'` component that nests, outermost → innermost:

1. `SerwistProvider` (PWA service worker, `swUrl="/serwist/sw.js"`).
2. `NextIntlClientProvider` (`messages` + `locale` from the root layout, `DEFAULT_TIME_ZONE`).
3. `QueryClientProvider` — the `QueryClient` is created once in `useProviders()`
   (`hooks/useProviders.ts`) with `staleTime: 0` and `refetchOnWindowFocus: true`.
4. `ThemeProvider` (next-themes, `attribute="class"`, `defaultTheme="dark"`, `enableSystem`).

The `QueryClient` lives in a hook (not inline in the `.tsx`) per the no-hooks-in-components rule.

### Client guards (`components/common`)

- **`AuthGuard`** — delegates to `useAuthGuard()`. Shows a spinner until the auth store has
  hydrated; renders `null` (which triggers redirect to `/login` via the Axios interceptor / store)
  when unauthenticated; otherwise renders children.
- **`RoleGuard`** — delegates to `useRoleGuard()`; renders children only when the user's role is
  allowed for the route. Route→permission gating uses `ROUTE_PERMISSION_MAP`
  (`lib/constants/route-permissions.ts`), which maps path prefixes (e.g. `/alerts` →
  `Permission.ALERTS_VIEW`) checked with `startsWith`.

These are **defense-in-depth UX guards**. The authoritative authorization is the backend guard chain
(`AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard`); see
[`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) §3–5.

---

## 5. Next.js API proxy routes (`src/app/api/**`)

The browser Axios client points at `/api` (not the backend), so **every** backend endpoint the
frontend calls has a matching Next.js route handler under `src/app/api/`. **All 315 route handlers**
delegate to a helper in `src/lib/backend-proxy.ts` — none talk to Postgres or upstream tools.

> **Hard rule** (`apps/web/CLAUDE.md` #33, `apps/api/CLAUDE.md` #86): every new backend endpoint the
> frontend uses **must** get a matching proxy route, or the call returns a 404 HTML page instead of
> JSON.

### The three proxy helpers (`src/lib/backend-proxy.ts`)

| Helper                | Use                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `proxyToBackend()`    | Default. Forwards method/query/body/headers, wraps the response in the standard `{ data, … }` envelope, applies `no-store` cache headers, forwards `Set-Cookie` back to the browser. |
| `fetchBackendJson()`  | When the route needs to **read and transform** the JSON (e.g. `auth/login`, `auth/me`, `compliance/stats`). Throws `BackendError` with a `messageKey` on non-2xx.                    |
| `streamFromBackend()` | Binary passthrough for downloads (e.g. `reports/[id]/download`) — does not parse JSON.                                                                                               |

A typical route handler is tiny:

```ts
// src/app/api/alerts/route.ts
import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyToBackend(request, { path: '/alerts' })
}
```

What the proxy forwards/handles (see `backend-proxy.ts`):

- **Target URL** = `BACKEND_URL` (`backend-client.ts`, `BACKEND_API_URL ?? http://localhost:4000/api/v1`)
  - path, with original query params + any merged `options.params`.
- **Headers forwarded**: `Authorization`, `Cookie` (HttpOnly auth cookies), `X-Tenant-Id`,
  `User-Agent`, `X-Forwarded-For`, `X-Real-Ip`, `X-CSRF-Token`. It does **not** forward
  client-supplied role headers (security rule — auth/role comes from the JWT only).
- **Transport**: `backendClient` (a server-side Axios instance in `src/lib/backend-client.ts`,
  separate from the browser client) with a 120s default timeout and 50MB content limits — chosen
  over `fetch` because undici has a hard 30s body timeout that breaks long AI requests.
- **Response**: `Set-Cookie` from the backend is re-emitted to the browser (so auth cookies round-trip);
  the body is normalized into `{ data, error?, messageKey?, errors? }`; cache headers are forced to
  `no-store`. Backend failures become a `502` with `messageKey: SERVICE_UNAVAILABLE`.

---

## 6. Components (`src/components`)

43 domain folders (e.g. `alerts/`, `cases/`, `dashboard/`, `ai-findings/`, `connectors/`) plus four
cross-cutting groups:

- **`common/`** — reusable building blocks. The MUST-USE set lives here: `DataTable` (never raw
  `<table>`), `PageHeader`, `Toast` (sonner wrapper), `SweetAlertDialog` (sweetalert2 wrapper),
  `LoadingSpinner`, `EmptyState`, `ErrorMessage`, `Pagination`, `KpiCard`, `SearchInput`,
  `VirtualizedList` (wraps react-virtuoso), `AiConnectorSelect`, `AiResultCard`, `AuthGuard`,
  `RoleGuard`, plus OSINT/AI helpers. Imported via the **barrel** `@/components/common`.
- **`ui/`** — shadcn/ui base primitives (`Button`, `Badge`, `Input`, `Select`, `Dialog`,
  `Collapsible`, …). Imported via the **barrel** `@/components/ui` — never from subpaths.
- **`layout/`** — portal chrome (`PortalShell`, `Sidebar`, `Topbar`, `TenantSwitcher`, etc.).
- **`charts/`** — recharts visualizations.

Component contract: typed props via explicit interfaces in `types/`, `t` passed in as a prop (not
called inside), **render-only** (no hooks, no derived-state `const`s — those come pre-computed from
the page hook). Third-party UI libraries are wrapped in `common/` before use. Styling uses the
semantic status/severity class system from `globals.css` (never raw Tailwind color classes) — see the
Styling Rules and Design System sections of `apps/web/CLAUDE.md`.

---

## 7. Hooks (`src/hooks`)

Roughly **380 hooks**, one per file, all barrel-exported from `hooks/index.ts`. **All hooks live
here** — no `useXxx` may be declared inside a `.tsx` file (ESLint #14/#16). Categories:

- **Page hooks** (`useAlertsPage`, `useIncidentPage`, …) — orchestrate one page; compose the smaller
  hooks below and return everything the page JSX needs.
- **Data hooks** — wrap react-query `useQuery` / `useMutation` over a service method
  (`useAlerts`, `useCreateCase`, …). Mutation `invalidateQueries` keys **must include `tenantId`**
  so tenant switching invalidates caches correctly.
- **AI hooks** (`useAi*`) — the only place AI services are called; they own loading/error/permission
  state and read the selected connector from the AI-connector store (CLAUDE rules #41/#61).
- **Utility hooks** — `useDebounce`, `usePagination`, `useDeleteWithConfirmation`,
  `useAvailableAiConnectors`, `useProviders`, `useAuthGuard`, `useRoleGuard`, `usePermissionSync`,
  `useTenantSwitcher`.

Backend-driven search/filter/pagination is mandatory: filters are debounced (~400ms), `currentPage`
resets to 1 on filter change, query keys include every filter param, and `placeholderData:
keepPreviousData` keeps the table populated while refetching (`DataTable` gets `isFetching` as its
`loading` prop).

---

## 8. Services (`src/services`)

45 service objects (`alert.service.ts`, `case.service.ts`, `auth.service.ts`, …), barrel-exported
from `services/index.ts`. Each is a **singleton object of async methods** that call the pre-configured
Axios instance from `@/lib/api` and return typed `ApiResponse<T>`:

```ts
// src/services/alert.service.ts
export const alertService = {
  getAlerts: (params?: AlertSearchParams) =>
    api.get<ApiResponse<Alert[]>>('/alerts', { params }).then(r => r.data),
  investigateAlert: (id: string) =>
    api.post<ApiResponse<AIInvestigation>>(`/alerts/${id}/investigate`).then(r => r.data),
  // …
}
```

Services contain no React, no business logic, and no inline types/constants — just the HTTP surface.
Hooks consume services; components/pages never import services directly. The paths here (`/alerts`)
hit the Next.js proxy routes (§5), not the backend directly.

---

## 9. Stores (`src/stores`)

Seven **Zustand** stores, barrel-exported from `stores/index.ts`:

| Store                  | Persist key (localStorage) | Holds                                                       |
| ---------------------- | -------------------------- | ----------------------------------------------------------- |
| `useAuthStore`         | `auth-storage`             | `accessToken`, `user`, `permissions`, `impersonator`, flags |
| `useTenantStore`       | `tenant-storage`           | `currentTenantId` for GLOBAL_ADMIN tenant switching         |
| `useFilterStore`       | (in-memory)                | shared list filters (severity, time range, KQL query)       |
| `useHuntStore`         | (per store)                | threat-hunt working state                                   |
| `useUIStore`           | (per store)                | UI flags (sidebar, panels)                                  |
| `useNotificationStore` | (per store)                | notification/unread state                                   |
| `useAiConnectorStore`  | (in-memory)                | globally shared AI connector selection                      |

Persistence goes through `createPersistStorage()` (`lib/persist-storage.ts`), an SSR-safe wrapper
that returns a no-op storage on the server and `window.localStorage` in the browser — so direct
`localStorage` access stays out of components/hooks (CLAUDE rule #41). The auth and tenant stores are
what the Axios interceptor reads to attach `Authorization` and `X-Tenant-Id` (§10).

---

## 10. `lib` — utilities, the HTTP clients, and constants

`src/lib` holds the cross-cutting plumbing (48 entries). Highlights:

- **`api.ts`** — the **browser** Axios instance (`baseURL = NEXT_PUBLIC_API_URL ?? '/api'`). A request
  interceptor reads `auth-storage` / `tenant-storage` and attaches `Authorization: Bearer <token>`,
  `X-Tenant-Id`, and `X-CSRF-Token` (on non-GET, from the `csrf_token` cookie). A response interceptor
  performs **single-flight token refresh** on `401` (queues concurrent failures, calls `/auth/refresh`,
  retries) and `clearAuthAndRedirect()` to `/login` on refresh failure.
- **`backend-proxy.ts`** + **`backend-client.ts`** — the **server-side** proxy helpers and Axios
  instance used by route handlers (§5). Distinct from `api.ts`: no auth interceptors, points straight
  at `BACKEND_URL`.
- **`api-error.ts`** — `getErrorKey(error)` extracts the i18n key from an API error (returns keys
  **without** the `errors.` prefix, so error toasts use `useTranslations('errors')`).
- **`dayjs.ts`** — the only allowed date module (`formatDate`, `formatTimestamp`, `formatRelativeTime`,
  `nowISO`, `todayDate`, `uniqueId`, `sortByDateAsc/Desc`). Raw `new Date()` / `Date.now()` is banned.
- **`permissions.ts`** (`hasPermission`), **`roles.ts`**, **`utils.ts`** (`cn`, `lookup`,
  `copyToClipboard`), **`cookies.ts`** (`getCookie`/`setCookie`), **`toast.utils.ts`**
  (`buildErrorToastHandler`), **`column-renderers.tsx`** (DataTable cell renderers),
  **`validation/`** (Zod schemas), and the domain `*.utils.ts` files.
- **`constants/`** — all shared/domain constants by file (`storage.ts`, `locales.ts`, `alerts.ts`,
  `route-permissions.ts`, …). Never inline constants in components/hooks/services.

---

## 11. i18n (`src/i18n`)

- **next-intl**, six locales: `en`, `es`, `it`, `fr`, `ar`, `de` (one JSON file each; `en.json` is the
  source of truth, ~5k lines). Defaults/locale list in `lib/constants/locales`.
- **Locale selection is cookie-based** (`locale` cookie), not URL-based. The root `app/layout.tsx`
  reads the cookie and passes `messages` + `locale` into `NextIntlClientProvider` (via `Providers`).
- **`src/i18n/index.ts`** exports `getRequestConfig` (next-intl server config) so **server
  components** can resolve messages/locale/timezone from the same cookie.
- **Rules**: all user-facing text goes through `t()` (`useTranslations` in client, `getTranslations`
  in server) — no hardcoded strings. Every new key must exist in **all six** files. Backend error
  keys follow `errors.<module>.<key>` and must be mirrored here. **RTL** (Arabic) is built in — use
  logical CSS (`start`/`end`, `ps-3`, `me-2`, `text-start`), and `dir` is set on `<html>` plus the
  toast position.

---

## 12. Enums and types (`src/enums`, `src/types`)

- **`enums/`** (50+ files, barrel `@/enums`) — **every** string-literal union is an enum here
  (`AlertSeverity`, `Permission`, `SortOrder`, `AiAgentId`, `StatusBgClass`, …). String-literal unions
  in `.tsx`/hooks/services are ESLint-banned. The frontend `Permission` enum **mirrors the backend
  enum exactly** and must be updated in lock-step.
- **`types/`** (44 files, barrel `@/types`) — **all** interfaces and type aliases (`Alert`,
  `ApiResponse`, `ProvidersProps`, `RoleGuardProps`, `*ColumnTranslations`, …). No inline
  `interface`/`type` in `.tsx`, hooks, services, stores, or API routes. `interface` for shapes,
  `type` for unions/intersections; duplicates are prohibited.

---

## 13. Where to make changes (quick map)

| You want to…                 | Touch                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Add a page                   | `app/(portal)/<x>/page.tsx` (JSX only) + `hooks/use<X>Page.ts` + `skills/frontend/add-page.md` |
| Call a new backend endpoint  | `services/<x>.service.ts` method **and** a matching `app/api/<x>/route.ts` (proxy)             |
| Add a data/AI fetch          | a hook in `hooks/` wrapping react-query over the service                                       |
| Add global client state      | a store in `stores/` (+ persist key if it must survive reload)                                 |
| Add a reusable widget        | `components/common/` (+ barrel export); wrap any 3rd-party UI lib first                        |
| Add a constant / enum / type | `lib/constants/` / `enums/` / `types/` — never inline                                          |
| Add user-facing text         | a `t()` key in **all six** `i18n/*.json` files                                                 |
| Add a permission             | mirror the backend enum in `enums/permission.enum.ts` + proxy route + i18n (CLAUDE #34)        |

Before claiming done, run the gates listed in `apps/web/CLAUDE.md` (lint, build, test) and follow the
final-response format in [`AGENTS.md`](../../AGENTS.md) §13. Remember the
**no-`pnpm`-during-upgrade** caveat from the current task context.
