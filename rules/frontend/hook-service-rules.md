# Rules — Frontend Hooks & Services

> Read `AGENTS.md` first (loading order + security/AI invariants), then
> `apps/web/CLAUDE.md` (the 63 absolute web rules), then this file, then the
> matching skill (`skills/frontend/add-page.md`, `skills/frontend/add-ai-panel.md`).
> Sibling rules: `rules/global/branch-safety.md`, `rules/frontend/` (component/
> styling rules), `rules/ai/` (AI-safety rules), `rules/security/`.

Scope: the two layers in `apps/web/src` — **services** (`services/*.ts`) and
**hooks** (`hooks/*.ts`). `.tsx` components contain JSX only: zero hook calls,
zero service calls, zero derived `const` (web `CLAUDE.md` rules #14, #16, #60).

---

## 1. Services — singletons over the central Axios client

- A service is a **plain singleton object** of async methods, exported as a
  named `const` (e.g. `export const alertService = { ... }`). One file per
  domain, kebab-case: `<domain>.service.ts`. Pattern proven in
  `apps/web/src/services/alert.service.ts`.
- **Every service is barrel-exported** from `apps/web/src/services/index.ts`.
  Consumers import from `@/services` only — never a subpath
  (web `CLAUDE.md` rule #29). Add the `export { xService } from './x.service'`
  line in the same change as the new file.
- **All HTTP goes through the central client** `import api from '@/lib/api'`.
  Never call `axios` directly, never `fetch`, never build a second instance.
  `@/lib/api` (`apps/web/src/lib/api.ts`) attaches the `Authorization` bearer,
  the `X-Tenant-Id` header, the CSRF token on mutations, and the 401 →
  refresh-and-retry interceptor. Bypassing it breaks auth + tenant scoping.
- **`X-Tenant-Id` is sent by the interceptor, not by service code.** Services
  must never read/forward `tenantId` into the request themselves, and must
  never forward role/auth headers (`X-Role`) — web `CLAUDE.md` rule #41.
- Methods take typed params and return `r.data` (or `r.data.data` when the
  caller wants the unwrapped payload, as in `alertService.triageSummarize`).
  Type the call: `api.get<ApiResponse<Alert[]>>('/alerts', { params })`.
- **No `any`, no `eslint-disable`, no `console.log`** (web `CLAUDE.md` #1, #2,
  #8). **No interfaces/types/enums/SCREAMING_CASE consts inside service files**
  — `services/` is a banned scope (web `CLAUDE.md` #13). Types → `src/types/
<domain>.types.ts`, enums → `src/enums/`, constants → `src/lib/constants/`.
- **No business logic, state, React, or derived computation in services** —
  they only shape and fire the HTTP call. Mapping/transforms belong in
  `src/lib/<domain>.utils.ts`; orchestration belongs in hooks.
- Every backend endpoint a service calls **must have a matching Next.js proxy
  route** under `src/app/api/` via `proxyToBackend()` (web `CLAUDE.md` #33).
  A service method hitting a path with no proxy route returns a 404 HTML page.

## 2. Hooks — all in `src/hooks`, one hook per file

- **Every `useXxx` hook lives in `apps/web/src/hooks/`** (web `CLAUDE.md` #14).
  Hooks are banned inside `.tsx` files and inside `services/`, `stores/`,
  `app/api/`. One hook per file, kebab/camel filename, **barrel-exported from
  `src/hooks/index.ts`**; consumers import from `@/hooks` (rule #29).
- **No interfaces/types/enums/standalone consts in hook files** — `hooks/` is a
  banned scope (web `CLAUDE.md` #13). Move them to `src/types/`, `src/enums/`,
  `src/lib/constants/`.
- Two hook tiers:
  - **Data hooks** wrap one `useQuery`/`useMutation` over a service method
    (e.g. `useAlerts`, `useInvestigateAlert` in `hooks/useAlerts.ts`). They are
    the _only_ place service methods are called.
  - **Page hooks** (`useXxxPage`) orchestrate everything a page needs and return
    a flat object of ready-to-render values + handlers (see
    `hooks/useAlertsPage.ts`). The `.tsx` page calls exactly one page hook and
    renders. When a page hook grows large, split into composable sub-hooks
    (e.g. `useAttackPathsPageCrud` / `...Dialogs` / `...Filters`).

## 3. Query keys — always include `tenantId`

- **Every `queryKey` and every `invalidateQueries` key MUST include `tenantId`**
  (web `CLAUDE.md` #60-area / RBAC section: "All mutation `invalidateQueries`
  calls MUST include `tenantId`"). Read it from the tenant store:
  `const tenantId = useTenantStore(s => s.currentTenantId)`.
- Shape: `['<domain>', tenantId, ...discriminators]` — e.g.
  `['alerts', tenantId, params]`, `['alerts', tenantId, id]`,
  `['alerts', 'timeline', tenantId, alertId]` (all from `hooks/useAlerts.ts`).
  Omitting `tenantId` means a GLOBAL_ADMIN tenant switch serves another
  tenant's cached data — a **tenant-isolation break**, not a cache quirk.
- **The key must contain every filter/sort/pagination param** so react-query
  refetches on change (web `CLAUDE.md` search/filter rule #6). Mutations must
  invalidate every affected key — both the list and the detail
  (`['alerts', tenantId]` and `['alerts', tenantId, id]`).
- Search, filter, sort, and pagination are **backend-driven**: pass values as
  query params into the service; never filter client-side
  (web `CLAUDE.md` "Search, Filter & Pagination"). Debounce text inputs 400ms
  (`useDebounce`), reset page to 1 on any filter change, pass `isFetching`
  (not `isLoading`) to `<DataTable>`'s `loading`.

## 4. Derived state — compute in the hook via `useMemo`

- **No derived `const` in `.tsx` files** (web `CLAUDE.md` #60). Any value
  computed from props, hook results, or API responses is produced **inside the
  hook** and returned ready-to-render. Components receive finished values only.
- Compute derived values with **`useMemo`**, keyed on their real inputs — e.g.
  `severityCounts` and `assigneeOptions` in `hooks/useAlertsPage.ts` (memoized
  on `data?.data` / `membersData`). Memoize derived `columns` and any mapped
  option lists; wrap event handlers in `useCallback`.
- Respect `react-hooks/exhaustive-deps` — list every dependency; never silence
  it with a disable comment (rule #2).
- **Permission gating is derived state too.** Page hooks expose `canX` booleans
  from `hasPermission(permissions, Permission.X)` (see `canInvestigate`,
  `canClose` in `useAlertsPage.ts`); the `.tsx` gates UI with `{canX && (...)}`.
  Mutation hooks additionally **enforce** with `requirePermission(...)` inside
  `mutationFn` before calling the service (`hooks/useAlerts.ts`,
  `useInvestigateAlert`). UI gating is not enforcement — never rely on it alone;
  the backend `@RequirePermission(...)` is the real gate.

## 5. AI hooks — dedicated, never from components or page hooks directly

- **Never call AI services from a component or a generic page hook.** All AI
  calls route through dedicated AI hooks `hooks/useAi*.ts` that own loading,
  error, and permission state (web `CLAUDE.md` #41). Page hooks compose the AI
  hook and re-expose its result (e.g. `useAlertsPage` uses `useAiAlertTriage`).
- AI hooks read the connector from the **global store**, not from props:
  `const selectedConnector = useAiConnectorStore(s => s.selectedConnector)` and
  pass `connectorValue` to the service (`hooks/useAiAlertTriage.ts`). Never pass
  `availableConnectors`/`selectedConnector`/`onConnectorChange` as props
  (web `CLAUDE.md` #61); render `<AiConnectorSelect />` with zero props.
- AI is **analyze-and-suggest** (`AGENTS.md` §7). Destructive AI actions are
  `approval-required` — the hook must surface approval state, never auto-fire.
  Use the `AiActionCategory` labels (rule #44). The component renders AI output
  as markdown/plain text — **never raw HTML / `dangerouslySetInnerHTML`**
  (rules #43, #36). Never persist AI transcripts to `localStorage` (rule #46).

## 6. Error handling, toasts, and i18n

- Mutation `onError` uses `buildErrorToastHandler(tErrors)` from
  `@/lib/toast.utils` — `onError: buildErrorToastHandler(tErrors)` (simple) or
  `buildErrorToastHandler(tErrors)(error)` (multi-statement). Never inline
  `Toast.error(tErrors(getErrorKey(error)))` (web `CLAUDE.md` #62).
- `getErrorKey()` returns keys **without** the `errors.` prefix, so the error
  toast hook uses `useTranslations('errors')` (web `CLAUDE.md` RBAC section).
- All user-facing strings go through `t()` (rule #9); never hardcode text in a
  hook's toast/label. Add the i18n key to **all 6 locale files**.

## 7. Definition of done (run before claiming done — never "all green" unguessed)

- `pnpm typecheck` (blocking gate; `pnpm typecheck:fast` / tsgo is advisory only
  — `AGENTS.md` §5).
- `pnpm lint` and `pnpm build`.
- New service → barrel-exported from `services/index.ts` **and** has its
  `src/app/api/` proxy route. New hook → barrel-exported from `hooks/index.ts`.
- New page route → Playwright test covering loaded/empty/error/responsive
  (web `CLAUDE.md` #48).
- `pnpm` only, Node 22 (`AGENTS.md` §4). **Never work on `main`** — branch
  `feat/…` | `fix/…` | `chore/…` first (`AGENTS.md` §8). **Prove before
  deleting** a service/hook/export (check imports, barrels, proxy routes,
  tests) — `AGENTS.md` §8.
