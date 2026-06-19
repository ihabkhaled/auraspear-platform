# Audit 07 — Frontend (`apps/web`, `@auraspear/web`)

Scope: routing, components, hooks, services, stores, i18n (6 locales), MSW, auth/tenant
flow, RBAC guards, AI surfaces, PWA/serwist, and responsive/RTL/dark-mode behavior.

All claims below are grounded in files actually read; key paths are cited inline. Where the
documented behavior (`apps/web/CLAUDE.md`) diverges from the code, the divergence is called
out explicitly.

---

## 1. Stack & Topology

- **Next.js 16.1.6** (App Router) + **React 19.2** + TypeScript 5, per `apps/web/package.json`.
- State/data libs: `@tanstack/react-query` 5.90, `zustand` 5.0, `react-hook-form` 7.71, `axios`.
- i18n: `next-intl` 4.8; theming: `next-themes` 0.4; PWA: `serwist` 9.5 + `@serwist/turbopack`.
- Output is `standalone` with `productionBrowserSourceMaps: false` (`next.config.ts`).

`apps/web/CLAUDE.md` is an unusually rich (1000+ line) contributor spec encoding ~66 hard
rules (no `any`, no inline hooks/types/enums in `.tsx`, barrel-only imports, mandatory
status-color classes, mandatory i18n, mandatory page-hook pattern, etc.). This document
audits the _code_ against that spec.

### Directory layout (`apps/web/src/`)

```
app/(auth)         login + OAuth callback (callback/page.tsx)
app/(portal)       58 page.tsx routes across 40 route groups
app/(portal)/explorer  portal page
app/api            315 route.ts proxy/handler files
enums/             53 enum files (barrel)
hooks/             384 files (one hook per file, barrel)
services/          45 singleton service modules (barrel index.ts)
stores/            7 Zustand stores + index.ts barrel
i18n/              6 locale JSON + getRequestConfig (index.ts)
lib/               api.ts, backend-proxy.ts, permissions.ts, dayjs, constants/, validation/
components/        43 domain folders + ui/ (shadcn) + common/
```

The scale is substantial: **58 portal routes**, **315 API route files**, **384 hook files**,
**45 services**, **53 enums**. This is a large, mature surface, not a scaffold.

---

## 2. Routing & Route Groups

- Two route groups: `(auth)` (login shell) and `(portal)` (authenticated shell). They share
  the URL root and differ only in layout — `app/(auth)/layout.tsx` vs `app/(portal)/layout.tsx`.
- **No URL-based locale segment** (`[locale]`). Despite the CLAUDE.md "Architecture" snippet
  showing `src/app/[locale]/incidents/page.tsx`, the real tree has no `[locale]` directory —
  locale is **cookie-driven** (see §6). The doc snippet is stale relative to the code.
- Portal routes cover the full SOC domain plus an exceptionally broad AI suite:
  - Core SOC: `alerts`, `cases`, `incidents`, `correlation`, `detection-rules`, `hunt`,
    `intel`, `connectors`, `dashboard`, `entities`, `ueba`, `vulnerabilities`, `soar`,
    `attack-paths`, `cloud-security`, `compliance`, `normalization`, `jobs`,
    `system-health`, `reports`, `knowledge`, `notifications`, `explorer`, `admin`.
  - AI surfaces (16 routes): `ai-agents`, `ai-agent-graph`, `ai-chat`, `ai-config`,
    `ai-eval`, `ai-findings`, `ai-finops`, `ai-handoffs`, `ai-history`, `ai-memory`,
    `ai-ops`, `ai-rag`, `ai-search`, `ai-simulations`, `ai-transcripts`.

### Gap — no `middleware.ts`

`apps/web/CLAUDE.md` ("Architecture") asserts `src/middleware.ts` "handles route protection
and auth guards." **No `middleware.ts` exists anywhere in the app** (confirmed via search).
Route protection is done entirely **client-side** via `AuthGuard`/`RoleGuard` wrapping the
portal layout (§5). Practical implications:

- Unauthenticated requests still render the portal HTML shell on the server, then redirect on
  the client. No server-side gate; protection depends on JS execution and on the backend
  rejecting unauthenticated API calls.
- The doc-claimed middleware is a documentation/implementation drift.

---

## 3. Components

- shadcn/ui base lives in `components/ui/`; cross-cutting wrappers in `components/common/`
  (`DataTable`, `PageHeader`, `Toast`, `SweetAlert`, `LoadingSpinner`, `AuthGuard`,
  `RoleGuard`, `AiConnectorSelect`, `AiResultCard`, `AiFindingsPanel`, `OsintResultCard`,
  `AiAutomationBadge`, etc.). 43 domain component folders mirror the route domains.
- The enforced **render-only component / page-hook** pattern is real and pervasive: page
  files are JSX-only and pull everything from a single page hook. Confirmed by
  `app/(portal)/layout.tsx` (pure JSX) and the hook directory holding all logic
  (`useRoleGuard`, `useAuthGuard`, `usePermissionSync`, etc. each in their own file).
- Strength: the barrel-import + separation-of-concerns rules are enforced by ESLint
  (`no-restricted-syntax` bans interfaces/enums/hooks/SCREAMING_CASE consts in `.tsx`), so the
  architectural consistency is mechanically guaranteed, not just aspirational.

### Gap — `components/ai-renderer/` does not exist

CLAUDE.md rule #53 mandates that "EVERY rich AI output block MUST use a standardized renderer
component … from `src/components/ai-renderer/`." That directory is **absent**. Rich AI
rendering instead lives in `components/common/` (`AiResultCard`, `AiFindingsPanel`) and in the
per-feature `components/ai-*/` folders. The rule's named location is aspirational; reviewers
relying on it will not find the intended single home for AI renderers.

---

## 4. Services, Hooks, Stores

### Services (`src/services/`, 45 modules)

Singleton service objects calling the shared Axios instance (`@/lib/api`), one per domain
(`alert.service.ts`, `case.service.ts`, `auth.service.ts`, plus a large AI fleet:
`ai-agent`, `ai-eval`, `ai-graph`, `ai-handoff`, `ai-ops`, `ai-rag`, `ai-search`,
`ai-simulation`, `ai-transcript`, `ai-usage`, `agent-config`, `memory`, `llm-connector`).
Barrel-exported via `services/index.ts`.

### Hooks (`src/hooks/`, 384 files)

One hook per file, barrel-exported. **53 `useAi*` hooks** confirm AI logic is funneled through
dedicated hooks (CLAUDE.md rule #41 — "never call AI services directly from components").
Page-orchestration, RBAC, and tenant hooks are all here (`usePermissionSync`, `useRoleGuard`,
`useAuthGuard`, `useTenantSwitcher`, `useTenantSessionSync`, `useCreateTenantDialog`, etc.).

### Stores (`src/stores/`, 7 stores)

`auth.store.ts`, `tenant.store.ts`, `ai-connector.store.ts`, `filter.store.ts`,
`hunt.store.ts`, `notification.store.ts`, `ui.store.ts`. The auth/tenant split matches the
documented multi-tenant design.

#### Gap — `ai-connector.store.ts` contradicts its own spec

CLAUDE.md describes an `ai-connector-storage` **persisted** store whose value field is
`connectorValue`, read by all AI hooks and `AiConnectorSelect`. The actual store
(`stores/ai-connector.store.ts`) is **in-memory** (no `zustand/persist`), and the field is
`selectedConnector` (default `'default'`), not `connectorValue`:

```ts
export const useAiConnectorStore = create<AiConnectorStoreState>(set => ({
  selectedConnector: 'default',
  setSelectedConnector: selectedConnector => set({ selectedConnector }),
}))
```

So the globally-selected AI connector is **not** persisted across reloads, and the documented
field name is wrong. Either a doc drift or an unfinished persistence migration.

---

## 5. Auth & Tenant Flow

The flow is well-engineered and is one of the codebase's strengths.

### Client Axios interceptor (`src/lib/api.ts`)

- **Request interceptor** reads `accessToken` + tenant from `localStorage` (`getAuthState`),
  attaches `Authorization: Bearer`, and resolves the active tenant: the **switched** tenant
  (`tenant-storage.currentTenantId`) overrides the JWT's `user.tenantId`, sent as
  `X-Tenant-Id`. CSRF: for non-GET/HEAD/OPTIONS it reads the `csrf_token` cookie and sets
  `X-CSRF-Token` (double-submit pattern).
- **Response interceptor** implements single-flight refresh: on 401 (non-auth route, not
  already retried) it calls `/auth/refresh` once, queues concurrent failures in `failedQueue`,
  replays them with the new token, and on refresh failure calls `clearAuthAndRedirect()`
  (wipes auth+tenant storage, `window.location.href = '/login'`). Auth routes (`/auth/login`,
  `/auth/refresh`) are excluded to avoid loops. This is a robust, correct refresh design.

### Server proxy (`src/lib/backend-proxy.ts`)

- `proxyToBackend()` forwards `Authorization`, `Cookie` (HttpOnly auth cookies),
  `X-Tenant-Id`, `User-Agent`, `X-Forwarded-For`, `X-Real-Ip`, `X-CSRF-Token` to the NestJS
  backend, and forwards `Set-Cookie` back to the browser. Notably it **does not** forward any
  role/auth-decision header (matches the security rule "never forward role/auth headers from
  client").
- Uses Axios (not `fetch`) deliberately to escape undici's hard 30s body timeout for
  long-running AI calls; `validateStatus: () => true`; 50 MB body caps; all responses wrapped
  in `{ data, error?, messageKey? }` and stamped `Cache-Control: no-store` (`jsonNoStore`).
- `fetchBackendJson()` (transform-and-rebuild variant) maps backend status→`ErrorMessageKey`
  for i18n; `streamFromBackend()` handles binary downloads.

This proxy layer is mature: cookie forwarding, no-store hygiene, i18n error mapping, and a
consistent response envelope.

### Guards (client-only)

- `app/(portal)/layout.tsx`: `<AuthGuard><PortalShell><RoleGuard>{children}</RoleGuard>…`.
- `AuthGuard` (`useAuthGuard`) uses `useSyncExternalStore` to detect hydration; shows a spinner
  until hydrated, renders `null` and `router.replace('/login')` when unauthenticated.
- `RoleGuard` (`useRoleGuard`) computes `allowed = canAccessRouteByPermission(permissions,
pathname)` and, when not allowed, `router.replace(getFirstAccessibleRoute(permissions))` —
  so users land on their first permitted route instead of a dead end.

---

## 6. i18n (6 locales) & RTL

- Locales: `en, es, it, fr, ar, de` (`lib/constants/locales.ts`, `SUPPORTED_LOCALES`); JSON
  per locale in `src/i18n/`. Default `en`, default time zone `UTC`.
- **Cookie-based locale selection**, not URL-based: `i18n/index.ts` (`getRequestConfig`) reads
  the `locale` cookie, validates against `SUPPORTED_LOCALES`, dynamically imports the matching
  JSON. The root layout (`app/layout.tsx`) re-reads the same cookie to set `<html lang dir>`.
- **RTL**: `app/layout.tsx` sets `dir = locale === 'ar' ? 'rtl' : 'ltr'` on `<html>`, and even
  flips the Sonner `<Toaster position>` to `top-left` for RTL. Logical CSS utilities
  (`ps-/pe-/ms-/me-/text-start/text-end`) are used across ~67 component files — real RTL
  discipline, not just a `dir` attribute.
- Strength: server + client share one cookie source of truth; `suppressHydrationWarning` on
  `<html>` guards against theme/locale hydration mismatch.

### Gaps

- RTL is gated solely on `locale === 'ar'`. If an RTL locale were ever added beyond Arabic,
  the hard-coded check in both `app/layout.tsx` and the Toaster would need updating (no shared
  `isRtl(locale)` helper).
- Translation completeness across all 6 JSON files is asserted by CLAUDE.md rules but not
  verified here (per the read budget); given the breadth of new AI routes, missing keys in the
  non-`en` locales are the most likely i18n debt and warrant a key-parity check.

---

## 7. MSW (Mock Service Worker)

### Gap — MSW is not present

CLAUDE.md lists "MSW for API mocking in development" in the tech-stack summary and the
Architecture tree shows `src/mocks/`. In the actual code:

- **`msw` is not a dependency** in `apps/web/package.json`.
- **`src/mocks/` is empty/absent** (no handler or data files found).

Mocking is instead achieved through the `src/app/api/` proxy routes (315 files) that either
proxy to the NestJS backend or return data directly. The MSW references in the docs are
obsolete; there is no browser-level request interception layer.

---

## 8. RBAC Guards

- Frontend `Permission` enum mirrors the backend (`src/enums/permission.enum.ts`); route
  gating logic lives in `lib/permissions.ts` (`canAccessRouteByPermission`,
  `getFirstAccessibleRoute`). Roles/permission helpers in `lib/roles.ts`, `lib/permissions.ts`,
  `lib/role-settings*.ts`.
- **Permission sync** (`usePermissionSync`): polls `authService.getMe()` on
  `['auth','me', tenantId]`, `refetchInterval = PERMISSION_SYNC_INTERVAL`, only when
  authenticated and a tenant is resolved. On change it applies a snapshot
  (`applyPermissionSnapshot`) and invalidates permission-sensitive queries. Including
  `tenantId` in the key means a tenant switch forces an immediate permission refresh — exactly
  the documented intent.
- Per CLAUDE.md, pages expose `canX` booleans from `hasPermission()` and gate UI with
  `{canX && …}`; case-owner bypass is intentionally backend-only.

### Gaps / risk

- RBAC is **defense-in-depth on the client only** at the routing layer (no middleware). The
  real enforcement boundary is the backend; the frontend guards are UX, not security. This is
  acceptable _if and only if_ every backend endpoint enforces `@RequirePermission`. Worth
  cross-checking against the backend audit.
- Permission changes propagate with up to a `PERMISSION_SYNC_INTERVAL` lag (doc says ~60s);
  acceptable but means revoked access lingers briefly in the UI until the next poll or 401.

---

## 9. AI Surfaces

This is the most expansive part of the app — 16 AI routes, 53 `useAi*` hooks, 12 AI service
modules, and dedicated common components (`AiResultCard`, `AiFindingsPanel`,
`AiConnectorSelect`, `AiAutomationBadge`, `OsintResultCard`).

- **Connector abstraction**: `AiConnectorSelect` is meant to be a zero-prop, store-backed
  dropdown (CLAUDE.md rule #61) reading the global connector store; the AI API surface includes
  rich endpoints under `app/api/ai*`, `app/api/agent-config/*`, `app/api/ai-agents/*` (run,
  stop, start, soul, tools, sessions, dispatch, history, reset-usage, approvals).
- **Governance affordances** exist in code: `AiAutomationBadge` (action-category labeling per
  rule #44), `AiResultCard` (confidence/provider attribution per rule #42), approval routes
  (`agent-config/approvals/[id]/resolve`), findings status transitions
  (`api/ai/findings/[id]`), schedules with pause/toggle/run-now, and per-alert AI sub-actions
  (`alerts/[id]/ai/{summarize,explain-severity,false-positive-score,next-action}`).
- Strength: AI is treated as a first-class, governed surface (approvals, attribution,
  categories, FinOps/usage routes), not bolted on.

### Gaps

- `src/components/ai-renderer/` (the mandated standardized-renderer home, rule #53) does not
  exist (§3) — rich-output standardization is asserted but not structurally enforced.
- The connector store drift (§4) means the "global, shared, persisted AI connector selection"
  the AI hooks depend on is actually in-memory and renamed; AI surfaces will reset their
  connector choice on reload.

---

## 10. PWA / Serwist

- **Build wiring**: `next.config.ts` wraps config in `withSerwist` from `@serwist/turbopack`.
- **Service worker**: `src/app/sw.ts` builds a `Serwist` instance with `skipWaiting`,
  `clientsClaim`, `navigationPreload`, and `defaultCache`. Critically, it prepends an
  **`apiNetworkOnly`** rule forcing all same-origin `/api/*` requests through `NetworkOnly`,
  explicitly so authenticated API responses are never served from cache after logout — a
  thoughtful security choice. The SW uses `webworker` lib references and (per CLAUDE.md rule
  #38) must be excluded from the main `tsconfig` compilation.
- **Registration**: `Providers` (`app/providers.tsx`) wraps the tree in `SerwistProvider`
  (`@/lib/serwist-client`) with `swUrl="/serwist/sw.js"`.
- **Manifest/metadata**: `public/manifest.json` exists; `app/layout.tsx` wires `manifest`,
  `appleWebApp` (capable, black-translucent), apple-touch icon, and a `Viewport` with
  `themeColor: '#135bec'`.

### Gap / note

- `viewport` sets `maximumScale: 1, userScalable: false`. This disables pinch-zoom, which is an
  **accessibility concern** (WCAG 1.4.4 reflow/zoom) and somewhat at odds with the otherwise
  strong a11y ESLint posture. Worth revisiting.

---

## 11. Responsive / Dark Mode

- **Dark mode**: `next-themes` `ThemeProvider attribute="class" defaultTheme="dark"
enableSystem` (`app/providers.tsx`). The design system is dark-primary with a CSS-variable
  theme (`@theme inline` in `globals.css`); CLAUDE.md forbids `isDark` color conditionals and
  `dark:` utilities in favor of semantic tokens (`bg-card`, `text-foreground`,
  `text-severity-*`). `suppressHydrationWarning` prevents theme FOUC mismatch.
- **Responsive**: CLAUDE.md codifies mandatory breakpoint patterns (KPI grids
  `grid-cols-2 sm:… lg:… xl:…`, dialogs `max-w-[95vw] sm:max-w-xl`, mobile fallbacks like
  `w-full sm:w-[160px]`, viewport-relative scroll heights, and a mobile chat slide-over
  pattern). These are enforced by convention/review rather than lint, so adherence is
  page-by-page and not independently verified in this pass.

---

## 12. Security Posture (frontend)

Strengths worth recording:

- **CSP** in `next.config.ts` with `default-src 'self'`, `frame-ancestors 'none'`,
  `object-src 'none'`, dynamic `connect-src` derived from API/WS env, `upgrade-insecure-requests`.
  Honest inline comments explain why `script-src`/`style-src` retain `'unsafe-inline'` (Next
  hydration + next-themes + Radix inline styles) and flag nonce-based CSP as future work.
- Full security-header set: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `X-XSS-Protection: 0`, HSTS w/ preload, `Referrer-Policy`, `Permissions-Policy`
  (camera/mic/geo disabled).
- CSRF double-submit (cookie → `X-CSRF-Token`) on mutating requests; no-store on all proxied
  API responses; SW never caches `/api/*`; proxy never forwards client-supplied auth/role
  decisions.

Residual risks: `'unsafe-inline'` in CSP (acknowledged), tokens kept in `localStorage`
(`getAuthState` reads `accessToken` from `localStorage` — XSS-exposed; HttpOnly cookies are
used for the refresh path but the access token is still JS-readable), and client-only route
protection (no middleware/SSR gate).

---

## 13. Summary — Strengths & Gaps

### Strengths

1. **Architecturally consistent at scale** — 58 routes / 384 hooks / 45 services with
   ESLint-enforced separation of concerns (no inline hooks/types/enums in `.tsx`, barrel-only
   imports). Consistency is mechanical, not aspirational.
2. **Robust auth/tenant flow** — single-flight token refresh with a replay queue, tenant
   override via `X-Tenant-Id`, CSRF double-submit, and a mature server proxy that forwards
   cookies, maps errors to i18n keys, and enforces `no-store`.
3. **Genuine multi-locale + RTL** — cookie-driven `next-intl`, `<html dir>` flip, RTL-aware
   Toaster, and logical CSS utilities (`ps-/pe-/ms-/me-`) used across ~67 files.
4. **First-class, governed AI surface** — connector abstraction, approvals, action-category
   and confidence/provider badges, FinOps/usage, per-entity AI actions.
5. **Security-conscious PWA** — serwist SW forces `/api/*` to `NetworkOnly` so authenticated
   data is never served from cache post-logout; strong CSP + header set with honest rationale.
6. **Theming discipline** — dark-primary CSS-variable system with `dark:`/`isDark` color
   conditionals banned in favor of semantic tokens.

### Gaps / Risks (prioritized)

1. **No `middleware.ts`** despite the docs claiming server-side route protection — gating is
   client-only; security depends entirely on backend enforcement. (High — verify backend.)
2. **MSW is undocumented-but-absent** — `msw` is not a dependency and `src/mocks/` is empty,
   yet CLAUDE.md lists it as the dev mocking layer. (Medium — doc drift / dead expectation.)
3. **`ai-connector.store.ts` contradicts spec** — in-memory (not persisted) and field renamed
   `selectedConnector` vs documented `connectorValue`; AI connector choice resets on reload.
   (Medium — likely a bug or unfinished migration.)
4. **`src/components/ai-renderer/` missing** — the mandated home for standardized AI renderers
   (rule #53) does not exist; rich-output standardization is unenforced. (Medium.)
5. **Access token in `localStorage`** — XSS-readable; refresh uses HttpOnly cookies but the
   access token does not. (Medium.)
6. **`userScalable: false` / `maximumScale: 1`** disables zoom — accessibility regression
   against the otherwise strong a11y posture. (Low–Medium.)
7. **Stale doc snippets** — CLAUDE.md shows a `[locale]` URL segment that does not exist
   (locale is cookie-based); RTL hard-codes `locale === 'ar'` with no shared helper. (Low.)
8. **Translation key parity unverified** — 6 locale files + a fast-growing AI route surface
   make missing non-`en` keys the most probable i18n debt; recommend an automated parity check.
   (Low–Medium, unverified here.)

```

```
