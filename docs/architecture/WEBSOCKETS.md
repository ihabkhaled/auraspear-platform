# WebSockets / Real-time — `apps/api`

> **Entry point first.** This is a deep-dive reference. Start your loading order
> at [`AGENTS.md`](../../AGENTS.md) (Section 1), then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — the authoritative backend
> rulebook this doc summarizes — before touching gateway code. **No AI agent may
> edit first and understand later.** Real-time code must never weaken the
> security invariants in [`AGENTS.md` §6](../../AGENTS.md) or `CLAUDE.md`
> rules 8, 23, 26, 83–84.

The platform has **two unrelated WebSocket surfaces**, and confusing them is the
most common mistake:

1. An **inbound Socket.IO server** — the `NotificationsGateway`
   (`apps/api/src/modules/notifications/notifications.gateway.ts`) — that the
   **browser connects to** for real-time notifications, unread-count updates,
   and permission-change pushes. This is what "WebSockets" means in this doc.
2. A **generic outbound `ws` client** — `WebSocketService`
   (`apps/api/src/common/modules/websocket/`) — that the **API uses as a
   client** to reach the OpenClaw Gateway connector. It is not a server, has no
   auth/tenancy of its own, and is covered only briefly in §6.

This file deep-dives the handshake auth, tenant scoping, room model, emitted
events, and CORS parity. It does **not** restate the notification persistence
flow, the RBAC permission catalog, or the tenant-switch rules — those live in
the docs linked below. Link them; don't duplicate.

## Where this doc sits

| You want…                                                     | Go to                                                                              |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| The hard, enforced rules (don't violate)                      | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (rules 8, 23, 26, 76, 83–84)      |
| The one-paragraph platform summary of real-time               | [`docs/ARCHITECTURE.md` §11](../ARCHITECTURE.md) (this doc is its deep-dive)       |
| Backend layering / module wiring                              | [`docs/architecture/BACKEND.md`](BACKEND.md)                                       |
| How a request proves identity (`verifyAccessToken`)           | [`docs/architecture/AUTH.md`](AUTH.md)                                             |
| Tenant isolation model + the `X-Tenant-Id` switch             | [`docs/architecture/TENANCY.md`](TENANCY.md) (WebSocket rooms: §"WebSocket rooms") |
| RBAC permissions referenced on the client                     | [`docs/architecture/RBAC.md`](RBAC.md)                                             |
| The OpenClaw connector that consumes the outbound `ws` client | [`docs/architecture/CONNECTORS.md`](CONNECTORS.md)                                 |
| `CORS_ORIGINS` / `NEXT_PUBLIC_WS_URL` env vars                | [`docs/ENVIRONMENT.md`](../ENVIRONMENT.md)                                         |
| Runtime / request lifecycle context                           | [`docs/architecture/RUNTIME.md`](RUNTIME.md)                                       |

---

## 1. The inbound gateway at a glance

Source: `apps/api/src/modules/notifications/notifications.gateway.ts`.

The `NotificationsGateway` is a NestJS `@WebSocketGateway` backed by **Socket.IO**
(`socket.io`'s `Server` / `Socket`), mounted on a dedicated namespace:

```ts
@WebSocketGateway({
  cors: { origin: /* CORS_ORIGINS allow-list, see §4 */, credentials: true },
  namespace: NotificationGatewayNamespace.NOTIFICATIONS, // '/notifications'
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect { … }
```

- **Namespace**: `/notifications` (the `NotificationGatewayNamespace.NOTIFICATIONS`
  enum value in `notifications.enums.ts`). The browser connects to
  `<wsUrl>/notifications`.
- **Same process, same port as HTTP.** The gateway shares the Nest HTTP server
  (`apps/api/src/main.ts`, listening on `PORT`, default `4000`); there is no
  separate WS port. Socket.IO upgrades over the existing server.
- **Server-to-client only.** The gateway implements `OnGatewayConnection` /
  `OnGatewayDisconnect` and a set of `emit*` methods. There are **no
  `@SubscribeMessage` handlers** — clients never send application messages, they
  only receive. All write paths go through HTTP controllers; the socket is a
  push channel.
- It is wired in `NotificationsModule`
  (`apps/api/src/modules/notifications/notifications.module.ts`) as a provider
  and exported, and depends on `AuthService` via
  `forwardRef(() => AuthModule)` (circular: the gateway needs auth to verify
  handshakes; auth-adjacent flows emit through the gateway).

Enums for every wire-level string live in `notifications.enums.ts` — consistent
with `CLAUDE.md` rule 8/12 (no raw string literals). Notable ones:

| Enum                              | Members                                                             |
| --------------------------------- | ------------------------------------------------------------------- |
| `NotificationGatewayNamespace`    | `NOTIFICATIONS = '/notifications'`                                  |
| `NotificationGatewayEvent`        | `NOTIFICATION`, `UNREAD_COUNT`, `PERMISSIONS_UPDATED`               |
| `NotificationSocketAuthField`     | `TOKEN = 'token'`, `TENANT_ID = 'tenantId'` (handshake `auth` keys) |
| `NotificationSocketDataKey`       | `USER = 'user'`, `TENANT_ID = 'tenantId'` (keys on `socket.data`)   |
| `NotificationAuthorizationPrefix` | `BEARER = 'Bearer '`                                                |
| `PermissionUpdateReason`          | `ROLE_UPDATED`, `ROLE_MATRIX_UPDATED`, `MEMBERSHIP_STATUS_UPDATED`  |

---

## 2. Handshake authentication

Every socket is authenticated **once, on connect**, in `handleConnection`. There
is no anonymous connection state — a socket that fails any step is disconnected
immediately. This is the WebSocket equivalent of the HTTP guard chain in
[`AUTH.md`](AUTH.md), and it honours the same invariant from `CLAUDE.md` rule 23
(no auth bypass in any environment).

Flow (`notifications.gateway.ts` `handleConnection`):

1. **Read the token.** The client supplies it on the Socket.IO handshake:
   - primary: `client.handshake.auth.token`
     (`NotificationSocketAuthField.TOKEN`), or
   - fallback: the `Authorization` header with the `Bearer ` prefix stripped
     (`NotificationAuthorizationPrefix.BEARER`).

   If no token is present → `client.disconnect()` and return.

2. **Verify the access token.** `await this.authService.verifyAccessToken(token)`
   runs the **same** verification used for HTTP requests — HS256 signature,
   `tokenType === 'access'`, Redis blacklist check (see [`AUTH.md`](AUTH.md) for
   the token lifecycle). A bad/expired/blacklisted token throws, the `catch`
   fires, and the socket is disconnected.

3. **Reject malformed/empty `tenantId`.** `readRequestedTenantId()` trims the
   handshake `auth.tenantId` and returns `undefined` for non-strings or empty
   strings — so a blank value falls through to the JWT's own tenant rather than
   being treated as a switch request.

4. **Resolve the authorized tenant context.**
   `await this.authService.resolveAuthorizedTenantContext(payload, requestedTenantId)`
   re-uses the exact HTTP tenant-switch logic: it loads the user's **active**
   memberships, picks the requested tenant if the user is a member, and
   otherwise only allows the switch for a `GLOBAL_ADMIN`
   (`resolveGlobalAdminTenantContext`). No active membership → `401`; a
   non-admin requesting a foreign tenant → `403`. Both throw and disconnect the
   socket. See [`TENANCY.md`](TENANCY.md) and [`AUTH.md`](AUTH.md) — this is the
   same code path, not a parallel implementation.

5. **Build the effective identity and stash it on the socket.** A `JwtPayload`
   is assembled from the verified token plus the resolved
   `tenantId` / `tenantSlug` / `role`, then stored on `socket.data`:

   ```ts
   client.data[NotificationSocketDataKey.USER] = currentUser
   client.data[NotificationSocketDataKey.TENANT_ID] = currentUser.tenantId
   ```

6. **Join the per-user room** (see §3) and log a structured connect line
   (`Client connected: <email> (room: <room>)`).

`handleDisconnect` reads the stored user off `socket.data` and logs the
disconnect; it performs no teardown beyond what Socket.IO does (room membership
is dropped automatically when the socket closes).

> **Token lifetime caveat.** Auth is validated only at handshake time. A
> long-lived socket is **not** re-checked against the blacklist on every emit —
> an access token revoked mid-session keeps its socket until the socket drops.
> Sensitive authorization decisions still happen over HTTP (guard chain per
> request); the socket only delivers already-authorized, tenant-scoped pushes.
> The 15-minute access-token TTL bounds the exposure, and the client reconnects
> with a fresh token on its next `io()` (the frontend re-creates the socket when
> `accessToken` changes — see §5).

---

## 3. Tenant scoping via rooms

The gateway never broadcasts. Every emit is addressed to a **per-user room
namespaced by tenant**, which is how cross-tenant leakage is structurally
prevented (`AGENTS.md` §6 tenant isolation; `TENANCY.md` "WebSocket rooms").

- **Room name**: `` `${tenantId}:${userId}` `` — built from the **resolved**
  `tenantId` (post tenant-switch) and the token `sub`. On connect:

  ```ts
  const room = `${currentUser.tenantId}:${currentUser.sub}`
  void client.join(room)
  ```

- Because the room key embeds `tenantId`, a user who is a member of two tenants
  occupies a **different room per tenant**. A `GLOBAL_ADMIN` viewing tenant B
  (via the handshake `tenantId` switch) joins `B:<adminId>`, not `A:<adminId>`,
  so they only receive tenant B's pushes.

- **All `emit*` methods derive the same room** from their `tenantId` +
  `recipientUserId` arguments and call `this.server.to(room).emit(...)`. There is
  no code path that emits without a room target, and no `cors: true` /
  broadcast-to-namespace path. This satisfies `CLAUDE.md` rule 26's spirit
  (tenant-scoped writes) at the transport layer.

---

## 4. CORS parity with HTTP

`CLAUDE.md` rule 84 is explicit: **WebSocket CORS MUST match HTTP CORS
validation** — same `CORS_ORIGINS` env var, no `cors: true`, no separate
unvalidated list. The gateway implements the identical parsing/validation used
in `apps/api/src/main.ts` for `app.enableCors(...)`:

```ts
cors: {
  origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map(o => o.trim())
    .filter(o => {
      try {
        const url = new URL(o)
        return url.protocol === UrlProtocol.HTTP || url.protocol === UrlProtocol.HTTPS
      } catch {
        return false
      }
    }),
  credentials: true,
}
```

Parity checklist (compare with `main.ts` lines ~94–110):

| Aspect                   | HTTP (`main.ts`)                                       | WebSocket (`notifications.gateway.ts`)         |
| ------------------------ | ------------------------------------------------------ | ---------------------------------------------- |
| Source of origins        | `process.env.CORS_ORIGINS`                             | `process.env.CORS_ORIGINS` (same var)          |
| Default                  | `'http://localhost:3000'`                              | `'http://localhost:3000'`                      |
| Parsing                  | split on `,`, trim, drop non-`http(s)` via `new URL()` | identical (uses `UrlProtocol.HTTP/HTTPS` enum) |
| Credentials              | `credentials: true`                                    | `credentials: true`                            |
| Allow-all (`cors: true`) | never                                                  | never                                          |

> **Note — production hardening.** `main.ts` additionally **throws at startup**
> if `NODE_ENV === 'production'` and the parsed origin list is empty, and
> `env.validation.ts` rejects `localhost`/`127.0.0.1` origins in production
> (`CLAUDE.md` rule 83). The gateway re-derives its list from the **same**
> `CORS_ORIGINS`, so it inherits those guarantees transitively. If you ever
> change the HTTP CORS parsing, **change the gateway in lockstep** or rule 84 is
> violated. (The duplicated filter block is the one place to keep in sync; a
> shared utility would be the natural refactor.)

The `http:`/`https:` (and unused `ws:`/`wss:`) protocol literals live in
`apps/api/src/common/enums/url-protocol.enum.ts` — no raw strings, per
`CLAUDE.md` rule 8/12.

---

## 5. Emitted events and the browser client

### Server → client events

All three are addressed to the `` `${tenantId}:${recipientUserId}` `` room. The
event names are `NotificationGatewayEvent` enum values.

| Method (`notifications.gateway.ts`)                | Event name (`'…'`)    | Payload shape                                                                       |
| -------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------- |
| `emitToUser(tenantId, userId, notification)`       | `notification`        | `NotificationResponse` (see `notifications.types.ts`)                               |
| `emitUnreadCount(tenantId, userId, count)`         | `unread-count`        | `{ count: number }`                                                                 |
| `emitPermissionsUpdated(tenantId, userId, reason)` | `permissions-updated` | `{ tenantId, reason: PermissionUpdateReason, changedAt }` (`changedAt` = `toIso()`) |

These are invoked by `NotificationsService`
(`apps/api/src/modules/notifications/notifications.service.ts`), not by the
gateway itself:

- After persisting a notification, `emitToRecipient()` calls **both**
  `gateway.emitToUser(...)` and `gateway.emitUnreadCount(...)` so the bell badge
  updates instantly alongside the toast.
- `emitPermissionsUpdated` / `emitPermissionsUpdatedToUsers` fire when a role,
  the role→permission matrix, or a membership status changes (the
  `PermissionUpdateReason` values), telling affected clients to refetch their
  permission set. This is how an RBAC change propagates without a page reload —
  see [`RBAC.md`](RBAC.md).

The notification **creation/preference/persistence** logic (e.g.
`createAndEmitNotification`, per-user `notify*` helpers, preference suppression)
is out of scope here; it belongs to the notifications module, not the transport.

### Browser client

The web app connects with `socket.io-client` in
`apps/web/src/hooks/useNotificationSocket.ts`:

```ts
const socket = io(`${BACKEND_WS_URL}/notifications`, {
  auth: { token: accessToken, tenantId },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 3000,
})
```

- **URL**: `BACKEND_WS_URL` is `process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000'`
  (`apps/web/src/lib/constants/notifications.ts`), with the `/notifications`
  namespace appended.
- **Handshake auth**: passes `{ token: accessToken, tenantId }`, matching the
  `NotificationSocketAuthField` keys the gateway reads. `tenantId` is the
  current tenant from the Zustand stores (`currentTenantId || authTenantId`) —
  i.e. the same value sent as the `X-Tenant-Id` HTTP header for the
  `GLOBAL_ADMIN` tenant switch (see [`TENANCY.md`](TENANCY.md)).
- **Reconnect / re-auth**: the `useEffect` re-creates the socket when
  `accessToken`, auth state, or `tenantId` change, so a refreshed token or a
  tenant switch transparently re-runs the §2 handshake on a fresh socket.
- **On `notification`** → invalidates the `['notifications', tenantId]` query and
  shows a toast (gated on the `NOTIFICATIONS_VIEW` permission).
- **On `unread-count`** → writes the count straight into the React Query cache
  for an instant badge update.
- **On `permissions-updated`** → calls `refreshCurrentSessionPermissions(...)`,
  toasts, and `router.refresh()`.

Note the frontend uses `socket.io-client`'s `auth` handshake, **not** a raw
browser `WebSocket`, and never sends application messages — consistent with the
server having no `@SubscribeMessage` handlers.

---

## 6. The other WebSocket: the outbound `ws` client

`apps/api/src/common/modules/websocket/` is a small, **global** module that is
completely separate from the gateway above. Do not conflate them.

- `WebSocketModule` (`websocket.module.ts`) is `@Global()` and exports a single
  provider, `WebSocketService`.
- `WebSocketService` (`websocket.service.ts`) wraps the **`ws`** client library
  (Node's WebSocket client, not Socket.IO):

  ```ts
  @Injectable()
  export class WebSocketService {
    createConnection(url: string): WebSocket {
      return new WebSocket(url)
    }
  }
  ```

- It has **no auth, no tenancy, no CORS** of its own — it is just a thin,
  injectable factory so connector code doesn't `import 'ws'` directly (and so it
  can be mocked in tests).
- **Sole consumer today**: the OpenClaw Gateway connector adapter
  (`apps/api/src/modules/connectors/services/openclaw-gateway.service.ts`), which
  uses `createConnection(baseUrl)` plus helpers in `connectors/openclaw-ws.utility.ts`
  (`authenticateOpenClawConnection`, `sendOpenClawRequest`,
  `sendOpenClawChatAndCollect`, `safeCloseWebSocket`) to test connectivity and
  invoke gateway tasks over a WebSocket handshake. See
  [`CONNECTORS.md`](CONNECTORS.md) and [`docs/architecture/AI.md`](AI.md) for the
  provider-routing context.
- It is registered in `app.module.ts` (`WebSocketModule` in the root `imports`).

The `index.ts` barrel re-exports both `WebSocketService` and the `WebSocket`
type, which is why connector code imports `WebSocket` from
`'../../../common/modules/websocket'`.

---

## 7. Deployment / runtime caveats

- **Long-lived sockets vs. serverless.** `main.ts` exports a Vercel serverless
  `handler` **and** an `app.listen()` path for non-Vercel runtimes. Socket.IO
  requires a persistent server process and sticky connections — it works on the
  `app.listen()` (containerized / long-running) path, **not** under per-request
  serverless invocation. Treat real-time delivery as a feature of the
  long-running deployment (Docker), and rely on HTTP polling
  (`GET /notifications/unread-count`) as the degraded fallback when the socket
  can't connect. See [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md) and
  [`RUNTIME.md`](RUNTIME.md).
- **No Redis adapter / single-instance fan-out.** The gateway emits via the
  in-process Socket.IO `Server`; there is no `@socket.io/redis-adapter` wired
  today. With more than one API instance, an emit on instance A only reaches
  sockets held by instance A. For multi-instance real-time you would add a Redis
  adapter — until then, scope expectations to a single API process (or
  sticky-session routing).
- **Body/size limits don't apply.** The `express.json({ limit: '1mb' })` cap in
  `main.ts` guards HTTP, not the socket; the socket carries only small,
  server-generated JSON payloads and accepts no client application messages.

---

## 8. Touching this code? (rules quick-reference)

When you change anything under `notifications.gateway.ts` or the websocket
module, the relevant hard rules from [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md):

- **Rule 84** — WebSocket CORS must use the same `CORS_ORIGINS` validation as
  HTTP; never `cors: true` or a separate origin list. (§4 above.)
- **Rule 83** — `CORS_ORIGINS` must reject `localhost`/`127.0.0.1` in production
  (enforced in `env.validation.ts`, inherited here).
- **Rule 23 / 76** — no auth bypass in any environment; identity comes only from
  the verified JWT, never a client-supplied role/header. (§2.)
- **Rule 8 / 12** — every wire string is an enum (`NotificationGatewayEvent`,
  `NotificationSocketAuthField`, `UrlProtocol`, …). No raw literals.
- **`AGENTS.md` §6** — every emit is tenant-scoped via the
  `` `${tenantId}:${userId}` `` room; never fan out across tenants. (§3.)

Then run the gates from [`AGENTS.md` §5](../../AGENTS.md): `pnpm typecheck` and
`pnpm build` are blocking. The gateway is covered by
`apps/api/test/modules/notifications.gateway.spec.ts` — keep it green.

---

_Sources: `apps/api/src/modules/notifications/notifications.gateway.ts`,
`notifications.enums.ts`, `notifications.service.ts`, `notifications.types.ts`,
`notifications.module.ts`; `apps/api/src/common/modules/websocket/*`;
`apps/api/src/modules/auth/auth.service.ts` (`verifyAccessToken`,
`resolveAuthorizedTenantContext`); `apps/api/src/main.ts`;
`apps/api/src/common/enums/url-protocol.enum.ts`;
`apps/web/src/hooks/useNotificationSocket.ts`;
`apps/web/src/lib/constants/notifications.ts`._
