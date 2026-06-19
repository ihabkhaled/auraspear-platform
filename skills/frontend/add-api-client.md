# Skill — Add an API Client (service in `apps/web/src/services` + Next.js proxy route in `apps/web/src/app/api`)

> **Read `AGENTS.md` first** (loading order §1; security invariants §6; AI safety
> §7; validation gates §5; "never claim green without running it" §5/§13). Then
> read the rules that govern this task — `apps/web/CLAUDE.md` (web rules **#29**
> barrel imports, **#33** every backend endpoint needs a proxy route, **#13**
> no inline types in `services/`/`app/api/`, **#41** API proxy must not forward
> role/auth headers) and `apps/api/CLAUDE.md` (backend rule **#86**: every
> frontend-called endpoint needs a Next.js proxy route, **#25** every endpoint
> has `@RequirePermission()`). Sibling onboarding dirs: `rules/`, `skills/` (you
> are here), `memory/`, `context/`, `docs/`. Companion skills:
> `skills/frontend/add-hook.md` (the hook that calls your service),
> `skills/frontend/add-page.md`, `skills/backend/add-endpoint.md` (the backend
> endpoint your proxy targets).

This recipe wires the **two halves of one API client** in the same change:

1. A **service** in `apps/web/src/services/<domain>.service.ts` — a plain
   **singleton object** whose methods call the pre-configured Axios instance
   `api` from `@/lib/api`, and that is **barrel-exported** from
   `services/index.ts`.
2. The matching **Next.js proxy route** in `apps/web/src/app/api/<path>/route.ts`
   that forwards to the NestJS backend via **`proxyToBackend()`** from
   `@/lib/backend-proxy`.

Why both: the browser-side `api` instance has `baseURL = NEXT_PUBLIC_API_URL ?? '/api'`
(`apps/web/src/lib/api.ts` L13). So `api.get('/jobs')` hits **`/api/jobs`** on the
Next.js server — which only resolves if a proxy route exists at
`src/app/api/jobs/route.ts`. **No proxy route ⇒ Next.js returns a 404 HTML page
instead of JSON** (web `CLAUDE.md` #33; api `CLAUDE.md` #86).

---

## When to use

Use this skill when the frontend needs to call a backend endpoint and there is no
existing client path for it. Concretely:

- You (or `skills/backend/add-endpoint.md`) added a backend endpoint (e.g.
  `POST /jobs/cancel-all`) that the web app must call.
- An existing service needs a **new method** for a new endpoint — you still must
  add the matching proxy route in the same change.
- You are scaffolding a brand-new domain with its own `*.service.ts` file.

Do **not** use this skill to:

- Call `axios`/`fetch` from a component, page, hook, or store directly — all HTTP
  goes through a `@/services` method (which uses `@/lib/api`); the hook that
  consumes the service belongs in `skills/frontend/add-hook.md`.
- Call AI endpoints from components — those still route through `useAi*.ts` hooks,
  but the **service + proxy** layer described here is identical (bump the proxy
  `timeoutMs` for long AI calls — see step 3).

---

## Files to inspect first

Read these real files before writing — copy their shape, do not invent one:

- `apps/web/src/lib/api.ts` — the client Axios singleton (`export default api`).
  `baseURL = process.env['NEXT_PUBLIC_API_URL'] ?? '/api'`. Request interceptor
  injects `Authorization` + `X-Tenant-Id` + `X-CSRF-Token`; response interceptor
  does 401 refresh/retry. **Your service must use this instance — never create a
  new `axios` client and never read tokens/tenant yourself.**
- `apps/web/src/services/job.service.ts` — the **canonical minimal service**:
  a `const jobService = { ... }` singleton, methods return
  `api.get/post/...(...).then(r => r.data)`, typed with `ApiResponse<T>`.
- `apps/web/src/services/memory.service.ts` — a richer service: query `params`,
  path params in the URL, and the `extractData<T>()` helper for endpoints the
  backend already wraps as `{ data }`.
- `apps/web/src/services/index.ts` — the **barrel**; every service is re-exported
  here (`export { jobService } from './job.service'`).
- `apps/web/src/lib/backend-proxy.ts` — `proxyToBackend(request, options)` and
  `ProxyOptions`. It forwards `Authorization`, `Cookie`, `X-Tenant-Id`,
  `X-CSRF-Token`, `User-Agent`, `X-Forwarded-For`, `X-Real-Ip`; wraps the
  response as `{ data }`; sets `Cache-Control: no-store`; returns **502 +
  `messageKey`** on backend failure. Use `streamFromBackend()` instead for file
  downloads (it does not JSON-parse).
- `apps/web/src/lib/backend-client.ts` — `BACKEND_URL = process.env['BACKEND_API_URL']
?? 'http://localhost:4000/api/v1'` and `DEFAULT_TIMEOUT_MS = 120_000`. The
  server-side instance has **no auth interceptors** (it forwards the browser's
  headers verbatim).
- Proxy route examples (copy the closest one):
  - `apps/web/src/app/api/admin/audit-logs/route.ts` — simplest GET, fixed `path`.
  - `apps/web/src/app/api/ai/findings/[id]/status/route.ts` — `PATCH` with a
    dynamic `[id]` segment (`await params`).
  - `apps/web/src/app/api/agent-config/agents/[agentId]/route.ts` — multiple
    methods (`GET` + `PATCH`) in one route file.
  - `apps/web/src/app/api/ai-chat/threads/[id]/messages/route.ts` — `GET` + `POST`
    with a dynamic segment.
- `apps/web/src/types/common.types.ts` — `ApiResponse<T>`, `ProxyOptions`,
  `DynamicIdRouteContext` (barrelled from `@/types`). **Types are banned inside
  `services/` and `app/api/` files** (web `CLAUDE.md` #13) — define them here.

---

## Exact step-by-step implementation

### 0. Branch (never work on `main` — `AGENTS.md` §8)

```bash
git checkout -b feat/web-foo-api-client
```

### 1. Prove the backend endpoint exists (and is permission-gated)

Confirm the backend route you will proxy to actually exists and has
`@RequirePermission(...)` (api `CLAUDE.md` #25) and is `tenantId`-scoped. If it
does not exist yet, add it first via `skills/backend/add-endpoint.md`. Note the
**exact backend path under `/api/v1`** (e.g. `GET /foos`, `POST /foos/:id/run`)
— the proxy `path` is everything **after** `/api/v1`, i.e. `/foos`, `/foos/${id}/run`.

> Path math: client `api.get('/foos')` → `/api/foos` (Next route) →
> `proxyToBackend(request, { path: '/foos' })` → `${BACKEND_URL}/foos`
> = `http://localhost:4000/api/v1/foos`. The `path` you pass to `proxyToBackend`
> is the backend path **minus** the `/api/v1` base, **minus** the leading `/api`.

### 2. Create the proxy route — `apps/web/src/app/api/<path>/route.ts`

Mirror the URL the service will call. Dynamic segments use bracket folders
(`[id]`), and in App Router **`params` is a `Promise` you must `await`**
(Next 16 / React 19). Export `dynamic = 'force-dynamic'` so the route is never
statically cached. Export one async function **per HTTP method** you support.

**Static path (list/create on a collection):** `src/app/api/foos/route.ts`

```ts
import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyToBackend(request, { path: '/foos' })
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: '/foos' })
}
```

**Dynamic segment + action:** `src/app/api/foos/[id]/run/route.ts`

```ts
import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return proxyToBackend(request, { path: `/foos/${id}/run` })
}
```

Notes:

- **Query params and the request body are forwarded automatically** —
  `proxyToBackend` copies `request.nextUrl.searchParams` and reads the body for
  non-GET/HEAD. Do **not** re-read `request.json()` yourself unless you need to
  transform it; if you do, pass `{ body }` in `ProxyOptions`.
- **Long-running / AI endpoints**: pass `{ path, timeoutMs }` (default is
  `DEFAULT_TIMEOUT_MS = 120_000`). E.g. `proxyToBackend(request, { path: '/ai/...', timeoutMs: 300_000 })`.
- **File downloads**: use `streamFromBackend(request, { path })` instead — it
  streams the raw bytes and forwards `Content-Type`/`Content-Disposition` rather
  than JSON-wrapping.
- For a parent + child route family, validate parent ownership on the **backend**
  (api `CLAUDE.md` #75) — the proxy is a dumb forwarder, not an authz boundary.

### 3. Create / extend the service — `apps/web/src/services/<domain>.service.ts`

File name kebab-case + `.service.ts`. Export a **singleton object** (lowercase
`fooService`). Each method calls the **`api`** instance and returns `.then(r => r.data)`.
Type the response with `ApiResponse<T>` (or the backend's wrapper shape). Import
types from `@/types`. **No `'use client'`, no `interface`/`type`/`enum`/const
declarations here** — `services/` is a banned scope (web `CLAUDE.md` #13).

```ts
import api from '@/lib/api'
import type { ApiResponse, FooRecord, FooSearchParams, RunFooResult } from '@/types'

export const fooService = {
  getFoos: (params?: FooSearchParams) =>
    api.get<ApiResponse<FooRecord[]>>('/foos', { params }).then(r => r.data),

  getFoo: (id: string) => api.get<ApiResponse<FooRecord>>(`/foos/${id}`).then(r => r.data),

  createFoo: (data: FooCreateInput) =>
    api.post<ApiResponse<FooRecord>>('/foos', data).then(r => r.data),

  runFoo: (id: string) => api.post<ApiResponse<RunFooResult>>(`/foos/${id}/run`).then(r => r.data),
}
```

Conventions, all proven in `job.service.ts` / `memory.service.ts`:

- **GET with filters/pagination** → `api.get(url, { params })` — never build query
  strings by hand. Backend-driven filtering only (web `CLAUDE.md` Search/Filter).
- **Path params** go in the URL template literal: `` `/foos/${id}` ``.
- **The service returns data; it does not catch errors or show toasts** — the
  consuming hook does that via `buildErrorToastHandler` (see `add-hook.md`).
- If the endpoint is one the backend already wraps as `{ data: ... }` and you
  need the inner payload, reuse the `extractData<T>()` pattern from
  `memory.service.ts` (the proxy passes wrapped responses through unchanged).

### 4. Barrel-export the service from `services/index.ts`

In the **same change** add the re-export so consumers import from `@/services`
(never a subpath — web `CLAUDE.md` #29):

```ts
export { fooService } from './foo.service'
```

Consumers (hooks only) then `import { fooService } from '@/services'`.

### 5. Add the param/return types in `src/types/`

`FooRecord`, `FooSearchParams`, `RunFooResult`, etc. live in
`src/types/<domain>.types.ts` and are barrel-exported from `src/types/index.ts`
(types are banned in `services/` and `app/api/` files — #13). Reuse `ApiResponse<T>`
and the route-context helpers (`DynamicIdRouteContext`) from `@/types` rather than
redeclaring them.

### 6. Wire the hook + UI (separate skill, same change)

The service is consumed **only** by a hook (`skills/frontend/add-hook.md`): the
mutation hook calls `requirePermission(permissions, Permission.FOOS_RUN)` before
the service call, and query keys include `tenantId`. Components never call the
service directly.

---

## Validation commands (run from repo root — `pnpm` only, Node 22)

```bash
pnpm --filter @auraspear/web typecheck   # blocking gate
pnpm --filter @auraspear/web lint        # ESLint (enforces #13 / #29 / no-any)
pnpm --filter @auraspear/web build       # blocking gate (catches missing routes)
```

Repo-wide equivalents from `AGENTS.md` §4: `pnpm typecheck`, `pnpm lint`,
`pnpm build`, or `pnpm validate` (full). `pnpm typecheck:fast` (tsgo) is
**advisory only** — the blocking gate is `pnpm typecheck`.

**Verify the wiring end-to-end** (do not assume): run `pnpm dev` (web) + `pnpm dev:api`
(backend), then exercise the path — a request to `/api/foos` must return **JSON**
(the `{ data }` wrapper), not a 404 HTML page. A 404 HTML body is the signature
of a **missing proxy route** (#33). A 502 `{ messageKey: 'errors.serviceUnavailable' }`
means the proxy ran but the backend was unreachable.

**Never claim a gate green without running it** (`AGENTS.md` §5/§13).

---

## Docs to update

- `apps/web/src/services/index.ts` — barrel export (mandatory, same change).
- `apps/web/src/types/index.ts` — barrel export for any new types you added.
- If you added new user-facing strings (error message keys surfaced via `getErrorKey`),
  ensure the `errors.<module>.<key>` exists in **all 6** locale files
  (`src/i18n/{en,es,it,fr,ar,de}.json`) — backend `messageKey`s must have a
  frontend translation (web `CLAUDE.md` i18n rules; api `CLAUDE.md` #49).
- If the new endpoint backs a new page route, add the Playwright test
  (web `CLAUDE.md` #48) and follow `skills/frontend/add-page.md`.
- If this is part of adding a **permission**, do the full end-to-end change in one
  commit (api `CLAUDE.md` #85 / web `CLAUDE.md` #34) — the proxy route is step (7)
  of that checklist.
- Update contributor docs / Codex / Cursor companion rules only if the workflow
  itself changed (web `CLAUDE.md` audit rule); ADR only for a notable choice.

---

## Security checks (must all hold)

- **No new Axios client, no manual auth** — the service uses the `@/lib/api`
  singleton; the request interceptor owns `Authorization`, `X-Tenant-Id`, and
  `X-CSRF-Token`. The service must **never** read tokens, read/write `localStorage`,
  or set those headers itself.
- **Proxy forwards, never injects, identity** — `proxyToBackend` passes the
  browser's `Authorization`/`Cookie`/`X-Tenant-Id` through to the backend. **Never
  forward or synthesize a role/auth header** (`X-Role`, etc.) in the route — auth
  comes only from the validated JWT (web `CLAUDE.md` #41; api `CLAUDE.md` #76). Do
  not add `params`/`body` overrides that smuggle privilege.
- **RBAC is the backend's job** — the proxy is **not** an authorization boundary.
  The backend endpoint must carry `@RequirePermission(...)` and be `tenantId`-scoped
  (api `CLAUDE.md` #25, #26). The mutation hook adds a UI-level `requirePermission`
  for UX only; never treat the proxy as the gate.
- **Tenant isolation** — never hardcode or override `X-Tenant-Id` in the proxy or
  service; let the interceptor + backend `@TenantId()` resolve it (`AGENTS.md` §6).
- **No secrets in the route/service** — `BACKEND_API_URL` is read server-side in
  `backend-client.ts`; do not inline backend hostnames/keys into the route.
- **AI safety** (AI endpoints): AI is analyze-and-suggest; destructive AI actions
  are `approval-required` (persisted approval + permission) and must not auto-fire
  through a thin proxy. **Never render raw AI output as HTML** in the UI that
  consumes this client; never persist AI transcripts to `localStorage`
  (`AGENTS.md` §7; `rules/frontend/ai-ui-rules.md`).
- **No `any`**, no `// eslint-disable` / `@ts-ignore` / `@ts-expect-error`
  (web `CLAUDE.md` #1, #2 — absolute).

---

## Common mistakes

- **Service method added, proxy route forgotten** → `/api/foos` returns a 404 HTML
  page; `r.data` is HTML, JSON parse/typing breaks (web `CLAUDE.md` #33). Add the
  `route.ts` in the same change.
- **Proxy `path` includes `/api` or `/api/v1`** → double-prefix, 404 from backend.
  `path` is the backend route **minus** `/api/v1` (e.g. `/foos`, not `/api/v1/foos`,
  not `/api/foos`).
- **Service URL mismatch** — `api.get('/foos')` but the route folder is
  `app/api/foo/` → 404. The folder path under `app/api/` must mirror the service URL
  exactly.
- **Not `await`-ing `params`** in a dynamic route → runtime error / `[object Promise]`
  in the path. In App Router, `params` is a `Promise` — `const { id } = await params`.
- **Creating a fresh `axios.create()` in the service** → bypasses the auth/refresh
  interceptor; requests go out unauthenticated. Always `import api from '@/lib/api'`.
- **Declaring `interface`/`type`/`enum`/SCREAMING_CASE const in the service or
  route file** → banned scope (#13). Move to `src/types/`, `src/enums/`,
  `src/lib/constants/`.
- **Subpath import** (`@/services/foo.service`) or forgetting the barrel export →
  breaks #29 and leaves the service unreachable from `@/services`.
- **Manually re-reading and re-forwarding the body** when not transforming it →
  the proxy already forwards it; double-reading throws "body already consumed."
- **Using `proxyToBackend` for a file download** → JSON-wraps the bytes and
  corrupts the file. Use `streamFromBackend` instead.
- **Default 120s timeout on a long AI call** that needs more → pass `timeoutMs`;
  conversely don't crank every route's timeout.
- **Forwarding a client-supplied role/tenant override** in `params`/headers →
  privilege/tenant escalation (#41 / #76). Forward only what `proxyToBackend`
  already forwards.
- **Catching errors / showing toasts in the service** → that belongs in the hook
  via `buildErrorToastHandler`; the service just returns `r.data`.
- **Working on `main`** or claiming "all green" without running the gates.

---

## Final checklist

- [ ] Branched off `main` (`feat/…` | `fix/…` | `chore/…`).
- [ ] Backend endpoint exists, has `@RequirePermission(...)`, is `tenantId`-scoped.
- [ ] Proxy route created at `apps/web/src/app/api/<path>/route.ts` mirroring the
      service URL, with `export const dynamic = 'force-dynamic'` and one async
      function per supported method; dynamic `params` are `await`-ed.
- [ ] Proxy `path` = backend route minus `/api/v1` (and minus `/api`); no
      double-prefix; `timeoutMs` bumped for long/AI calls; `streamFromBackend`
      used for downloads.
- [ ] Service is a singleton object in `apps/web/src/services/<domain>.service.ts`
      using `import api from '@/lib/api'`; methods return `.then(r => r.data)`;
      typed with `ApiResponse<T>` from `@/types`.
- [ ] No new `axios` client; no manual `Authorization`/`X-Tenant-Id`/token/CSRF
      handling in service or route; no role/auth header forwarding.
- [ ] No `any`; no eslint-disable/ts-ignore; no `interface`/`type`/`enum`/const
      declared in the service or route file.
- [ ] Service barrel-exported from `services/index.ts`; new types barrel-exported
      from `types/index.ts`; consumers import from `@/services` / `@/types`.
- [ ] Any new backend `messageKey` translated in all 6 locale files.
- [ ] (AI client) approval-required surfaced downstream; no raw AI HTML; no
      transcripts in `localStorage`.
- [ ] `pnpm --filter @auraspear/web typecheck`, `lint`, `build` **run and green**
      — not assumed — and the path returns JSON (not 404 HTML) end-to-end.
