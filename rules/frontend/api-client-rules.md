# Rules — Frontend API Client & Proxy Routes

> Read `AGENTS.md` first (loading order + security/AI invariants), then
> `apps/web/CLAUDE.md` (the 63 absolute web rules), then this file, then the
> matching skill (`skills/frontend/add-page.md`,
> `skills/backend/add-endpoint.md` for the backend half).
> Sibling rules: `rules/frontend/hook-service-rules.md` (services/hooks layer),
> `rules/frontend/component-rules.md`, `rules/global/branch-safety.md`,
> `rules/security/` (tenant isolation, RBAC, headers).

Scope: how `apps/web` talks to the NestJS BFF. Two pieces:

1. the **browser-side Axios client** `@/lib/api` (`apps/web/src/lib/api.ts`),
2. the **Next.js proxy routes** under `apps/web/src/app/api/**/route.ts` that
   forward to the backend via `@/lib/backend-proxy`.

The data path is always:
`.tsx` → hook → service → `@/lib/api` (`/api/...`) → Next proxy route →
`proxyToBackend()` → `@/lib/backend-client` → NestJS (`BACKEND_API_URL`).

---

## 1. Never call APIs directly from components

- **Components (`.tsx`) make zero HTTP calls.** No `fetch`, no `axios`, no
  service calls, no `useQuery`/`useMutation`. TSX is JSX only — it calls one
  page hook and renders (web `CLAUDE.md` #16, #60;
  `rules/frontend/hook-service-rules.md`).
- HTTP belongs to **services** (`src/services/*.service.ts`); React Query
  orchestration belongs to **hooks** (`src/hooks/*.ts`). A component that needs
  data consumes a hook, never the network.

## 2. One client: the central `@/lib/api` Axios instance

- **All browser HTTP goes through `import api from '@/lib/api'`.** Never call
  `axios` directly, never `fetch` from app code, never construct a second
  client. There is exactly one browser instance, created in
  `apps/web/src/lib/api.ts` with `baseURL = NEXT_PUBLIC_API_URL ?? '/api'`.
- That default base (`/api`) is what forces every call through the Next.js proxy
  layer — services request relative paths like `/alerts`, `/alerts/${id}`
  (`services/alert.service.ts`), which resolve to `/api/alerts` and hit
  `src/app/api/alerts/route.ts`. Never hardcode the backend origin
  (`BACKEND_API_URL` / `http://localhost:4000`) in client code.
- Type every call: `api.get<ApiResponse<Alert[]>>('/alerts', { params })`.
  Return `r.data` (or `r.data.data` for the unwrapped payload). No `any`
  (web `CLAUDE.md` #1), no `eslint-disable` (#2), no `console.log` (#8).
- The server-side `backendClient` (`@/lib/backend-client`) is a **separate**
  Axios instance used **only inside proxy routes** — it has no auth interceptor
  and points straight at the backend. Never import it into a component, hook, or
  service.

## 3. Auth & tenant headers are handled centrally — never in app code

The request interceptor in `@/lib/api` attaches, on the browser side:

- `Authorization: Bearer <accessToken>` — read from the auth store
  (`AUTH_STORAGE_KEY`), not passed by callers.
- `X-Tenant-Id` — the effective tenant (switched tenant for GLOBAL_ADMIN from
  `TENANT_STORAGE_KEY`, else the JWT tenant). This is the tenant-isolation
  signal; the backend auth guard reads it (`apps/api/CLAUDE.md` Key Principle 8).
- `X-CSRF-Token` on mutating methods (non GET/HEAD/OPTIONS), read from the
  `csrf_token` cookie.

Rules:

- **Never set `Authorization`, `X-Tenant-Id`, or `X-CSRF-Token` by hand** in a
  service, hook, or component. Never read `tenantId` and inject it into a request
  — the interceptor owns it. Hand-setting it risks sending the wrong tenant and
  is a tenant-isolation break.
- The response interceptor owns the **401 → refresh-and-retry** flow
  (single-flight `/auth/refresh`, queue, then `clearAuthAndRedirect()` to
  `/login` on failure). Don't reimplement refresh/redirect in app code.
- **No auth bypass** anywhere — no dev-mode token injection, no skipping the
  interceptor (`AGENTS.md` §6).

## 4. Every backend endpoint has a Next.js proxy route

- **Every backend endpoint the frontend calls MUST have a matching proxy route**
  under `src/app/api/` (web `CLAUDE.md` #33; `apps/api/CLAUDE.md` #86). A service
  path with no proxy route returns a **404 HTML page**, not JSON.
- The route mirrors the backend path 1:1. Backend `POST /jobs/cancel-all` →
  `src/app/api/jobs/cancel-all/route.ts`. Dynamic segments use folders:
  `src/app/api/alerts/[id]/route.ts`, `.../[tenantId]/users/[userId]/route.ts`.
- Standard route shape (proven in `app/api/alerts/route.ts` and
  `app/api/alerts/bulk/close/route.ts`) — keep it this thin:

  ```ts
  import { type NextRequest } from 'next/server'
  import { proxyToBackend } from '@/lib/backend-proxy'

  export const dynamic = 'force-dynamic'

  export async function GET(request: NextRequest) {
    return proxyToBackend(request, { path: '/alerts' })
  }
  ```

- **`export const dynamic = 'force-dynamic'`** on every authenticated proxy route
  — these responses are per-user/per-tenant and must never be statically cached.
- Pass only `ProxyOptions` (`src/types/common.types.ts`): `path`, `method`,
  `body`, `params`, `timeoutMs`. **Raise `timeoutMs` for AI endpoints**
  (default 30s is too short for long LLM calls); the backend client allows up to
  the configured max.
- **No business logic, transforms, validation, or secrets in route files.** The
  route only forwards. `app/api/` is a banned scope for inline
  interfaces/types/enums/consts and for hooks (web `CLAUDE.md` #13, #14) —
  proxy routes stay declarative.
- Variants of the proxy helper, all in `@/lib/backend-proxy`:
  - `proxyToBackend()` — default JSON passthrough (wraps in `{ data, ... }`,
    forwards `Set-Cookie`, returns 502 + `messageKey` on backend failure).
  - `fetchBackendJson()` — when the route must reshape the payload before
    returning (see `app/api/auth/login/route.ts`).
  - `streamFromBackend()` — binary/file downloads (no JSON parse).
    Never write a raw `fetch(BACKEND_URL...)` in a route; use these helpers so
    header forwarding and error mapping stay consistent.

## 5. Proxy header forwarding — forward auth/tenant, never role

The proxy (`proxyToBackend` / `fetchBackendJson`) forwards a **fixed allowlist**:
`Authorization`, `Cookie` (HttpOnly auth cookies), `X-Tenant-Id`, `User-Agent`,
`X-Forwarded-For`, `X-Real-Ip`, `X-CSRF-Token`. Match this list when adding a
helper — do not widen it.

- **NEVER forward client-supplied role/permission headers** — no `X-Role`,
  `X-Permissions`, `X-User-Role`, or any privilege hint (web `CLAUDE.md` #41;
  `apps/api/CLAUDE.md` #76). Role and permissions come **only** from the
  validated JWT on the backend. Forwarding a client role header is a privilege
  escalation / RBAC bypass. The codebase currently forwards **zero** role
  headers — keep it that way.
- The proxy must not **invent** auth — it forwards what the browser sent; it
  never mints tokens, sets a tenant from query/body, or trusts a client-provided
  `tenantId` in the payload over the `X-Tenant-Id` header.
- The backend `@RequirePermission(...)` is the real gate. UI permission gating
  (`canX` flags) is UX only and is **not** enforcement
  (`rules/frontend/hook-service-rules.md` §4).

## 6. Errors & response shape

- Proxy responses are normalized to `{ data, error?, messageKey?, errors? }` and
  carry `Cache-Control: no-store` (via `jsonNoStore`). Backend failures become
  `502` with a `messageKey`; never leak raw backend internals to the client.
- In hooks, surface errors with `buildErrorToastHandler(tErrors)` from
  `@/lib/toast.utils` and `getErrorKey()` from `@/lib/api-error`
  (web `CLAUDE.md` #62, #40) — never render a raw backend `message`. All
  user-facing strings via `t()`; add `messageKey` translations to all 6 locale
  files.

## 7. Definition of done (run before claiming done — never "all green" unguessed)

- New backend endpoint → its `src/app/api/.../route.ts` proxy exists, uses
  `proxyToBackend()` (or a documented variant), and exports
  `dynamic = 'force-dynamic'` (web `CLAUDE.md` #33, #86).
- New service method → calls a relative path through `@/lib/api` that resolves
  to an existing proxy route; barrel-exported from `services/index.ts`
  (`rules/frontend/hook-service-rules.md`).
- No new `fetch`/`axios` outside `@/lib/api` (client) and `@/lib/backend-client`
  (proxy). No hand-set `Authorization`/`X-Tenant-Id`/`X-CSRF-Token`. No role
  header forwarding anywhere.
- `pnpm typecheck` (blocking gate; `pnpm typecheck:fast`/tsgo advisory only),
  then `pnpm lint` and `pnpm build` (`AGENTS.md` §4–5). `pnpm` only, Node 22.
- **Never work on `main`** — branch `feat/…` | `fix/…` | `chore/…` first
  (`AGENTS.md` §8). **Prove before deleting** a route/service/export (grep
  callers, barrels, the paired backend endpoint) — `AGENTS.md` §8.
