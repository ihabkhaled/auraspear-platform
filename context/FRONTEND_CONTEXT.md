# FRONTEND_CONTEXT.md — AuraSpear web console (`apps/web`)

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → `memory/*.md` → this `context/*.md`
> → `rules/**` → `skills/**` → `docs/**` → code. This file is step 3 for any task
> that touches the frontend SOC console. Do **not** edit before you have read the
> rules and skills linked below — and read
> [`../apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) in full: it holds the **63
> enforced frontend rules** and the authoritative ESLint config. Where this file
> and `apps/web/CLAUDE.md` overlap, **the CLAUDE.md rule number wins.**

This is the **frontend orientation** file: what the web app is, where files live,
and which rules/skills/docs govern any change. It is the concise map; the depth
is in `apps/web/CLAUDE.md` and the linked `rules/frontend/*`.

---

## What this area is

`apps/web` (`@auraspear/web`) is the **Next.js 16 / React 19 / Tailwind 4** SOC
console (App Router). It is a **Backend-for-Frontend client**: it **never** calls
Wazuh / OpenSearch / MISP / Shuffle / AI providers directly. Every backend call
goes through a Next.js proxy route in `apps/web/src/app/api/*` (`proxyToBackend()`
from `@/lib/backend-proxy`) to `apps/api` (`@auraspear/api`). See
[`PRODUCT_CONTEXT.md`](./PRODUCT_CONTEXT.md) for the product surface map and
[`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) for the BFF flow.

Strict separation of concerns is the defining constraint: `.tsx` files **render
only**. Hooks, services, stores, enums, types, constants, utilities, validation
schemas, and i18n each have a dedicated home, and ESLint blocks declarations that
live in the wrong place.

---

## Where files live

All paths under `apps/web/src/` (path alias `@/* → ./src/*`):

| What                             | Lives in                                     | Notes                                                                                                                                      |
| -------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Pages (routes)                   | `app/(portal)/<route>/`, `app/(auth)/`       | Route groups share layouts without affecting the URL. Server Components by default; add `'use client'` only for hooks/events/browser APIs. |
| API proxy routes                 | `app/api/<path>/route.ts`                    | One per backend endpoint, via `proxyToBackend()`. Missing = 404 HTML (rule 33).                                                            |
| Components (by domain)           | `components/<domain>/`                       | e.g. `alerts/`, `cases/`, `hunt/`, `ai-findings/`, `ai-agents/`, `dashboard/`. `.tsx` render-only.                                         |
| Base UI primitives (shadcn)      | `components/ui/` → barrel `@/components/ui`  | Never import the subpath; never use raw `<table>`/`<select>`/`<input>`/`<textarea>`.                                                       |
| Shared common components         | `components/common/` → `@/components/common` | `DataTable`, `PageHeader`, `Toast`, `SweetAlertDialog`, `AiConnectorSelect`, `AiResultCard`, `VirtualizedList`, etc.                       |
| AI render blocks                 | `components/ai-renderer/`                    | Standardized renderers for risk gauges, IOC tables, MITRE maps, timelines (rule 53).                                                       |
| Custom hooks (one per file)      | `hooks/` → barrel `@/hooks`                  | All `useXxx`; **every** hook call (`useState`, `useTranslations`, store hooks…) must live here, not in `.tsx` (rules 14, 16).              |
| API service layer                | `services/` → barrel `@/services`            | Singleton objects with async methods calling the Axios instance from `@/lib/api`.                                                          |
| Zustand global stores            | `stores/` → barrel `@/stores`                | `useAuthStore`, `useTenantStore`, `useAiConnectorStore`, etc.                                                                              |
| Enums (ALL string-literal types) | `enums/` → barrel `@/enums`                  | No string-literal unions, no inline enums anywhere (rules 13, 17).                                                                         |
| Types / interfaces               | `types/<domain>.types.ts` → `@/types`        | No inline `interface`/`type` in `.tsx`/`hooks`/`services`/`stores`/`api` (rule 13).                                                        |
| Constants                        | `lib/constants/<domain>.ts`                  | No SCREAMING_CASE module consts in component/hook/service/api files (rule 13).                                                             |
| Utilities / pure functions       | `lib/utils.ts`, `lib/<domain>.utils.ts`      | Mappers, formatters, badge builders, validators (rule 15).                                                                                 |
| Validation schemas (Zod)         | `lib/validation/<domain>.schema.ts`          | Exception: schemas needing `t()` stay in-component (rule 18).                                                                              |
| i18n translations                | `i18n/{en,es,it,fr,ar,de}.json` + `index.ts` | All 6 locales; RTL built-in.                                                                                                               |
| Global CSS + status classes      | `app/globals.css`                            | Tailwind 4 `@theme`; status/severity color system lives here.                                                                              |
| Middleware (route protection)    | `middleware.ts`                              |                                                                                                                                            |

Run `ls "apps/web/src/app/(portal)"` and `ls apps/web/src/components` for the live
route/domain list — they grow; treat the table as a map, not an inventory.

---

## What rules apply (read before editing)

Always load `rules/global/*`, then the frontend area rules:

- **Global:** [`../rules/global/absolute-rules.md`](../rules/global/absolute-rules.md),
  [`branch-safety.md`](../rules/global/branch-safety.md),
  [`repo-navigation.md`](../rules/global/repo-navigation.md),
  [`validation-gates.md`](../rules/global/validation-gates.md).
- **Frontend:** [`../rules/frontend/`](../rules/frontend/) —
  [`component-rules.md`](../rules/frontend/component-rules.md) (`.tsx` is
  render-only), [`hook-service-rules.md`](../rules/frontend/hook-service-rules.md)
  (logic in hooks, data in services),
  [`api-client-rules.md`](../rules/frontend/api-client-rules.md) (proxy routes +
  Axios), [`i18n-rules.md`](../rules/frontend/i18n-rules.md) (next-intl, 6
  locales), [`ai-ui-rules.md`](../rules/frontend/ai-ui-rules.md) (provenance-aware,
  safe, dismissible AI surfaces).
- **AI (for AI surfaces):** [`../rules/ai/`](../rules/ai/) —
  `ai-output-rules.md`, `ai-approval-rules.md`, `ai-agent-rules.md`,
  `ai-memory-rules.md`, `ai-governance.md`.
- **Security:** [`../rules/security/`](../rules/security/) — `security-rules.md`,
  `secret-handling.md`, `ai-security.md`.

**Invariants that govern every frontend change (from [`../AGENTS.md`](../AGENTS.md) §6–7):**

- **Tenant isolation** — the web app carries tenant context via the Axios
  interceptor (`X-Tenant-Id` from `useTenantStore`); never assume client-side
  cross-tenant data. RBAC is enforced server-side.
- **RBAC** — every backend endpoint has `@RequirePermission(...)`; every new
  frontend surface **mirrors** the permission enum in `enums/` + a proxy route in
  `app/api/`. Gate UI affordances on permissions; never bypass.
- **No auth / secret / permission bypass** — no `X-Role`/auth-header forwarding in
  proxy routes; tokens prefer HttpOnly cookies; never log credentials (not in
  `console.warn`, not in Zustand devtools).
- **AI safety** — **never render raw AI output as HTML** (no
  `dangerouslySetInnerHTML`; `react/no-danger` is `error`); render markdown via a
  safe renderer or plain text. Every AI surface shows loading / error / confidence
  / provider + a regenerate and a dismiss affordance (rules 42, 47). Destructive
  AI actions are **approval-required** and show an approval-status badge (rule 59).
  Never store AI transcripts in `localStorage` (rule 46).
- **No `any`** (`@typescript-eslint/no-explicit-any: error`); **no
  `eslint-disable` / `@ts-ignore`**; **pnpm only**; **Node 22**.

---

## What skills apply (recipes for the work)

Match your task to a recipe in [`../skills/frontend/`](../skills/frontend/):

- Add a page (route + proxy + hook + Playwright test) →
  [`add-page.md`](../skills/frontend/add-page.md)
- Add a component → [`add-component.md`](../skills/frontend/add-component.md)
- Add a hook → [`add-hook.md`](../skills/frontend/add-hook.md)
- Add an API client (service + proxy route) →
  [`add-api-client.md`](../skills/frontend/add-api-client.md)
- Add an i18n key (all 6 locales) →
  [`add-i18n-key.md`](../skills/frontend/add-i18n-key.md)
- Add an AI panel → [`add-ai-panel.md`](../skills/frontend/add-ai-panel.md)
  (pairs with [`../skills/ai/add-ai-feature.md`](../skills/ai/add-ai-feature.md))

A permission touching the frontend is end-to-end — see
[`../skills/backend/add-permission.md`](../skills/backend/add-permission.md)
(steps include the frontend enum mirror, proxy route, service/hook/UI, and i18n).
Before releasing, run [`../skills/qa/validate-release.md`](../skills/qa/validate-release.md).

---

## What docs to read

- [`../apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) — **primary reference**: 63
  enforced rules, ESLint/Prettier/tsconfig config, design system, styling/color
  system, components-to-reuse, i18n rules, AI connector strategy.
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) (+ `docs/architecture/`) —
  BFF structure and data flow.
- [`../docs/AI.md`](../docs/AI.md) (+ `docs/ai/AI_GOVERNANCE.md`,
  `AI_ARCHITECTURE.md`) — AI subsystem, providers, governance (for AI surfaces).
- [`../docs/TESTING.md`](../docs/TESTING.md) (+ `docs/testing/`) — Vitest +
  Playwright strategy.
- [`./PRODUCT_CONTEXT.md`](./PRODUCT_CONTEXT.md) — module/route map.
- [`../memory/TECHNICAL_MEMORY.md`](../memory/TECHNICAL_MEMORY.md) and
  [`../memory/PROJECT_MEMORY.md`](../memory/PROJECT_MEMORY.md) — stable technical
  truths.

---

## Common mistakes

- **Putting logic in `.tsx`** — no hook calls, no `useState`/`useEffect`, no
  derived `const`, no helper functions, no `interface`/`type`/`enum` in component
  files. ESLint blocks it (`no-restricted-syntax`). Extract into `hooks/`,
  `services/`, `lib/`, `types/`, `enums/`. (`apps/web/CLAUDE.md` rules 13–16, 60.)
- **Adding a backend endpoint without its Next.js proxy route** — missing
  `app/api/.../route.ts` returns 404 HTML, not JSON. (Rule 33.)
- **Importing subpaths instead of barrels** — use `@/components/ui`,
  `@/components/common`, `@/services`, `@/hooks`, `@/stores`, `@/types`, `@/enums`,
  never the file subpath. (Rule 29.)
- **Hardcoding user-facing strings or string-literal types** — use `t()`
  (next-intl, all 6 locales) and enums in `enums/`; never raw `'active'` or
  `'foo' | 'bar'`. (Rules 9, 13, 17, 39.)
- **Static/semantic Tailwind color classes** — never `text-red-*`/`bg-gray-*`/
  `dark:*`; use the status/severity system (`text-status-error`,
  `bg-severity-critical`, `text-foreground`) from `globals.css`. (Rule 3, Styling
  section.)
- **Raw HTML elements** — never raw `<table>` (use `DataTable`), `<select>`/
  `<input>`/`<textarea>` (use `@/components/ui`). (Rules 4, 11.)
- **Client-side search/filter/sort** — all search, filter, and sort must hit the
  backend via query params; debounce 400ms, reset page to 1 on filter change,
  include all params in the react-query key, pass `isFetching` to `DataTable`'s
  `loading`. (Search/Filter/Pagination section.)
- **Rendering raw AI output as HTML / missing AI states** — banned; AI surfaces
  must show loading/error/confidence/provider, a regenerate and a dismiss
  affordance, route AI calls through `useAi*` hooks (never directly from
  components), and use `<AiConnectorSelect />` with zero props. (Rules 41–47, 53,
  61.)
- **`e.target.value`** — React 19 types `e.target` as `EventTarget`; use
  `e.currentTarget.value`. (Rule 37.)
- **Adding a page without a Playwright test** — every new route needs a test
  covering loaded / empty / error / responsive states. (Rule 48.)

---

## Validation commands

Run from repo root (**pnpm only, Node 22**); turbo fans out to `apps/web`. Full
list: [`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
pnpm install            # install workspace deps
pnpm typecheck          # blocking gate (tsc --noEmit, strict)
pnpm build              # blocking gate (next build)
pnpm lint               # advisory — eslint (run + annotate)
pnpm lint:strict        # eslint --max-warnings 0
pnpm format:check       # advisory — prettier --check
pnpm test               # advisory — Vitest unit tests
pnpm test:e2e           # advisory — Playwright e2e
pnpm validate           # typecheck + lint:strict + format:check
pnpm validate:full      # validate + test + build
```

Scope to the web app with `pnpm --filter @auraspear/web <script>` (e.g.
`pnpm --filter @auraspear/web typecheck`). Run the web app in dev with
`pnpm dev:web`.

**Hard gates (must pass):** `pnpm typecheck` · `pnpm build` · Docker image builds
· gitleaks (no secrets) · CodeQL. **Advisory** gates (lint / format / test) are
non-blocking today due to tracked debt — still run and annotate. See
[`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md) and
[`../rules/global/validation-gates.md`](../rules/global/validation-gates.md).

> **Never claim a gate is green without running it.** Report exactly what passed,
> what failed, and any blocker — per [`../AGENTS.md`](../AGENTS.md) §5 and §13.
