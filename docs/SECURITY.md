# AuraSpear Platform — Security Posture

This document describes the security architecture of the AuraSpear SOC platform, focused on the `@auraspear/api` backend-for-frontend (NestJS 11). Every claim below is grounded in the codebase; key file paths are cited inline.

> **Pattern**: The API is a Backend-for-Frontend (BFF). The Next.js frontend never calls Wazuh/OpenSearch/MISP directly — all SIEM traffic is proxied through the authenticated, tenant-scoped API.

---

## 1. Tenant Isolation

Multi-tenancy is enforced as a first-class invariant: **every database query is scoped by `tenantId`, and data from one tenant is never returned to another** (`apps/api/CLAUDE.md`, Key Principles #1).

- **Repository contract**: Every repository method takes `tenantId`. Every Prisma `update()` and `delete()` must include `tenantId` (or a parent entity ID) in the `where` clause — never operate by `id` alone.
- **`TenantGuard`** (`apps/api/src/common/guards/tenant.guard.ts`): Requires a resolved `tenantId` on the authenticated request; rejects with `403 errors.auth.tenantRequired` when tenant context is missing.
- **GLOBAL_ADMIN tenant switching**: The `AuthGuard` reads the `X-Tenant-Id` header and, only for `GLOBAL_ADMIN`, overrides `request.user.tenantId` via `resolveAuthorizedTenantContext()` (`apps/api/src/common/guards/auth.guard.ts`). Non-admin users cannot switch tenants. The `@TenantId()` decorator then returns the authorized tenant automatically.
- **Sub-resource ownership**: Nested resources (e.g. `/cases/:caseId/artifacts/:artifactId`) must validate parent ownership before accessing the child — a valid child ID never implies valid parent access.

---

## 2. RBAC & Permissions

Authorization runs through a layered guard chain on protected routes:

```
AuthGuard  →  TenantGuard  →  PermissionsGuard / RolesGuard
```

- **Permission-based model**: Endpoints declare `@RequirePermission(Permission.MODULE_ACTION)`. Permissions are dynamic, stored per-tenant in the database (compound unique key `(tenantId, key)`). The single source of truth is `src/common/enums/permission.enum.ts`.
- **GLOBAL_ADMIN bypass**: `GLOBAL_ADMIN` always passes permission checks; the bypass lives in `PermissionsGuard`, not in individual services.
- **Role hierarchy** (most → least privileged): `GLOBAL_ADMIN`, `TENANT_ADMIN`, `SOC_ANALYST_L2`, `THREAT_HUNTER`, `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`.
- **Role-gated infrastructure**: Connector create/update/toggle endpoints require `@Roles(UserRole.TENANT_ADMIN)` — an analyst cannot redirect connector URLs, rotate API keys, or disable integrations.
- **Case-owner escape hatch**: `@AllowCaseOwner()` lets a case owner bypass permission checks on case-specific endpoints, applied alongside `@RequirePermission()`.
- **No header-based roles**: Role information comes exclusively from the validated JWT — client-supplied role headers (e.g. `X-Role`) are never trusted, even in development.
- **Protected users**: Seeded `GLOBAL_ADMIN` accounts carry `isProtected: true` and cannot be deleted, blocked, suspended, or have their role changed by anyone.

---

## 3. Token Lifecycle

JWTs are issued and verified in `apps/api/src/modules/auth/auth.service.ts`, with claim assertions in `auth.utilities.ts` and revocation in `token-blacklist.service.ts`.

| Property           | Value                                   | Source                                 |
| ------------------ | --------------------------------------- | -------------------------------------- |
| Access token TTL   | `15m` (`JWT_ACCESS_EXPIRY` default)     | `config/env.validation.ts`             |
| Refresh token TTL  | `7d` (`JWT_REFRESH_EXPIRY` default)     | `config/env.validation.ts`             |
| Signing algorithm  | `HS256` (pinned on sign **and** verify) | `auth.service.ts`                      |
| Per-token identity | `jti` (UUID) on every token             | `auth.service.ts`, `auth.utilities.ts` |
| Token typing       | `tokenType: 'access'` / `'refresh'`     | `auth.service.ts` (`TokenType`)        |

**Flow:**

1. **Login** → issues an access token (`15m`) and a refresh token (`7d`), both carrying a `jti` and a `tokenType`. Refresh tokens additionally carry rotation claims `family` and `generation`.
2. **Refresh** → verifies `tokenType === 'refresh'`, checks the blacklist and refresh-family revocation, issues a new token pair, and **blacklists the old refresh `jti`** (replay prevention). Asserted via `assertRefreshRotationClaimsPresent()` / `assertRefreshSubjectMatches()`.
3. **Logout** → blacklists both the access and refresh `jti` in Redis with TTL matching the token's remaining lifetime.
4. **Every request** → `AuthGuard` verifies the access token (`tokenType === 'access'`), revalidates the user is still active, and checks the Redis blacklist.

**Algorithm pinning** prevents algorithm-confusion attacks: signing uses `{ algorithm: 'HS256' }`, verification uses `{ algorithms: ['HS256'] }` (`auth.service.ts`).

### Token Blacklist & Refresh-Family Tracking

`TokenBlacklistService` (`apps/api/src/modules/auth/token-blacklist.service.ts`) is Redis-backed:

- **JTI blacklist**: `token:blacklist:{jti}` keys, set with `EX` TTL equal to the token's remaining lifetime.
- **Refresh-family rotation**: Tracks a generation counter per family (`REFRESH_FAMILY_PREFIX`) and a revocation marker (`REFRESH_FAMILY_REVOKED_PREFIX`). Detecting reuse of a rotated token invalidates the entire family (`invalidateFamily()`), logged as a possible replay attack.
- **Fail-open trade-off**: When Redis is unreachable, `isBlacklisted()` returns `false` (availability over strict revocation) — an intentional, documented decision in the service.

---

## 4. Authentication Hardening (bcrypt + constant-time)

In `auth.service.ts`:

- **Constant-time login**: A pre-computed `DUMMY_BCRYPT_HASH` is compared against when the target email does not exist (`const hashToCompare = passwordHash ?? DUMMY_BCRYPT_HASH; return bcrypt.compare(password, hashToCompare)`). This equalizes timing between existing and non-existent accounts, defeating timing-based email enumeration.
- **No auth bypass**: There is no dev-mode auth bypass, fake user, or JWT-skip path in any environment — all requests traverse the full guard chain (`AuthGuard.validateUserActive()` re-checks user + active membership on every request).
- **Active-membership check**: `validateUserActive()` rejects users without an `active` membership; soft-deleted (`inactive`) and blocked (`suspended`) users receive `401`.

---

## 5. Connector Secrets — AES-256-GCM at Rest

Connector configurations (API keys, credentials) are encrypted before persistence (`apps/api/src/common/utils/encryption.utility.ts`):

- **Cipher**: `aes-256-gcm` with a 16-byte random IV per encryption and a 16-byte GCM auth tag (`encryption.constants.ts`).
- **Storage format**: `iv:authTag:ciphertext`, each component base64-encoded, colon-joined.
- **Key**: `CONFIG_ENCRYPTION_KEY` — exactly 64 hex characters (32 bytes). The utility re-validates key shape on every call; decryption rejects a wrong auth-tag length, providing integrity/tamper detection.
- **Per-type validation**: Each connector type (wazuh, graylog, logstash, velociraptor, grafana, influxdb, misp, shuffle, bedrock) has its own Zod config schema; `validateConnectorConfig(type, config)` runs before encryption.

---

## 6. SSRF Validation

`apps/api/src/common/utils/ssrf.utility.ts` guards all user-supplied URLs (connectors, custom OSINT sources):

- **Protocol allowlist**: Only `http(s)` and `ws(s)` URLs are accepted; anything else is rejected (`errors.ssrf.unsupportedProtocol`).
- **Private-network blocklist** (`ssrf.constants.ts`): In production, hostnames matching loopback (`127.`, `::1`), RFC1918 (`10.`, `172.16–31.`, `192.168.`), link-local (`169.254.`, `fe80:`), ULA (`fc00:`/`fd`), `0.`, `localhost`, and their IPv4-mapped IPv6 forms (`::ffff:...`) are blocked — this includes the cloud metadata endpoint `169.254.169.254`.
- **DNS-rebinding defense**: `resolveAndValidateUrl()` resolves the hostname via `dns.lookup()` in production and re-validates the resolved IP against the private blocklist; DNS-resolution failure blocks the request.
- **Validate at input time**: URLs are SSRF-checked during connector create/update (before encryption) — not only at fetch time — so malicious URLs never persist.
- **Optional allowlist**: Callers may pass an explicit `allowedHosts` list for exact/suffix host matching.

---

## 7. HTTP Hardening (Helmet, CSP, Headers)

Configured in `apps/api/src/main.ts`:

- **Helmet CSP** (explicit directives): `default-src 'self'`, `script-src 'self'`, `style-src 'self'` (no `'unsafe-inline'`), `img-src 'self' data:`, `connect-src 'self'`, `font-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`.
- **HSTS**: `max-age=31536000` (1 year), `includeSubDomains`, `preload`.
- **Frameguard**: `deny` (clickjacking protection).
- **Referrer-Policy**: `strict-origin-when-cross-origin`.
- **Cache-Control**: Authenticated responses (Authorization header or `access_token`/`refresh_token` cookies present) get `no-store, no-cache, must-revalidate`; otherwise `Vary: Authorization, Cookie`.
- **Request correlation**: `X-Request-ID` middleware generates a UUID when absent and echoes it on the response.
- **Body limits**: `express.json({ limit: '1mb' })` and `urlencoded({ limit: '1mb' })`. Individual nested JSON fields (e.g. `config`, `metadata`) are additionally bounded to 64KB via Zod `.refine()`.
- **Trust proxy**: `trust proxy = 1` so client IPs are correct behind Vercel / load balancers (used for rate limiting and audit IP logging).

---

## 8. CORS — Strict, No Localhost in Production

- **Runtime validation** (`main.ts`): `CORS_ORIGINS` is split, trimmed, and each entry parsed via `new URL()`; only valid `http:`/`https:` origins survive. In production an empty origin list throws at startup. CORS runs with `credentials: true`.
- **Schema validation** (`config/env.validation.ts`): `CORS_ORIGINS` must be valid URLs; must be non-empty in production; and a `.refine()` rejects any origin whose hostname is `localhost` or `127.0.0.1` when `NODE_ENV === 'production'`.
- **WebSocket parity** (`apps/api/src/modules/notifications/notifications.gateway.ts`): The notifications gateway derives its CORS origin list from the same `CORS_ORIGINS` variable with the same URL/protocol validation — it never uses `cors: true`.

---

## 9. Rate-Limit Tiers

Built on `@nestjs/throttler`. Global defaults `RATE_LIMIT_THROTTLE_TTL` (60s) and `RATE_LIMIT_THROTTLE_LIMIT` (250) come from `env.validation.ts`. Per-endpoint `@Throttle()` tiers (per `apps/api/CLAUDE.md`):

| Endpoint category                   | Limit / window                            |
| ----------------------------------- | ----------------------------------------- |
| Auth — login                        | 5 / min                                   |
| Auth — refresh                      | 10 / min                                  |
| Auth — logout                       | 10 / min (prevents blacklist flooding)    |
| Connector test (`POST /:type/test`) | 5 / min (prevents internal port scanning) |
| AI endpoints                        | 10 / min                                  |
| Standard CRUD                       | 30 / min                                  |
| Bulk operations                     | 5 / min                                   |
| Delete operations                   | 10 / min                                  |

Every mutation endpoint (POST/PATCH/DELETE) must carry a `@Throttle()` tier — no unrate-limited mutations.

---

## 10. Audit Logging & Redaction

`apps/api/src/common/interceptors/audit.interceptor.ts`:

- **Scope**: Logs all mutating requests — `POST`, `PUT`, `PATCH`, `DELETE` (`audit.constants.ts`).
- **Recorded fields**: `tenantId`, actor (email or `sub`), role, `action` (`METHOD handler`), resource (controller), `resourceId` (joined path params), sanitized `details` (request body, truncated to 2000 chars), and client `ipAddress`.
- **Tenant-scoped**: Audit rows are written under the request's `tenantId`; entries without tenant/user context are skipped.
- **Redaction** (`common/utils/redaction.utility.ts` + `redaction.constants.ts`): Before persistence, sensitive keys are replaced with `[REDACTED]`, recursing up to depth 5. The `SENSITIVE_KEYS` set covers `password`, `currentPassword`, `newPassword`, `confirmPassword`, `passwordHash`, `secret`, `apiKey`, `token`, `bearerToken`, `accessKey`, `clientSecret`, `refreshToken`, `accessToken`, `encryptedConfig`, `authorization`, `secretAccessKey`, `cookie`, `sessionToken`, and `encryptionKey`.
- **Structured-log redaction**: The same `SENSITIVE_KEYS` set is shared with the pino logger so credential fields never reach log aggregation.

---

## 11. Environment Validation

`apps/api/src/config/env.validation.ts` (`validateEnvironment()`) parses `process.env` against a Zod schema and **fails loudly at startup** on any violation. Notable rules:

- **`NODE_ENV` defaults to `production`** — a misconfigured deployment gets secure-by-default behavior, not development permissiveness.
- **`JWT_SECRET`**: ≥64 hex characters; rejected if all-zeros.
- **`CONFIG_ENCRYPTION_KEY`**: exactly 64 hex chars; rejected if all-zeros.
- **`REDIS_PASSWORD`**: ≥16 characters in production.
- **`PLATFORM_ADMIN_PASSWORD`**: ≥12 characters when set.
- **`CORS_ORIGINS`**: valid URLs, non-empty in production, no localhost/`127.0.0.1` in production (see §8).
- **OIDC group validation**: `OIDC_ISSUER_URL`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI`, `OIDC_CLIENT_ID` must be all-present or all-absent (`superRefine`) — partial config is rejected.
- **No fallback secrets**: Encryption keys, JWT secrets, and seed passwords have no hardcoded defaults; missing required values fail startup.

---

## 12. Swagger — Production Protection

In `main.ts`, the Swagger document and `/api/docs` UI are mounted **only when `NODE_ENV === 'development'`**. In production the OpenAPI spec is never exposed, reducing endpoint/schema disclosure to attackers.

---

## 13. WebSocket Authentication

`apps/api/src/modules/notifications/notifications.gateway.ts`:

- **Handshake auth**: On connection, the gateway reads the token from `handshake.auth.token` or the `Authorization: Bearer` header. A missing token disconnects the client immediately.
- **JWT verification**: The token is verified via `AuthService.verifyAccessToken()` — the same access-token validation path as HTTP requests.
- **Tenant authorization**: `resolveAuthorizedTenantContext()` resolves the authorized tenant (honoring GLOBAL_ADMIN switching), and the socket joins a tenant-scoped room `tenant:userId`, so events (`notification`, `unreadCount`, `permissionsUpdated`) are delivered only to the intended user within the correct tenant.
- **Validated CORS**: Origin validation matches HTTP CORS (see §8).

---

## 14. Additional Hardening

- **Error sanitization** (`GlobalExceptionFilter`): All error responses strip internal file paths and stack traces and truncate to 500 chars, in every environment including development. Prisma errors (`PrismaClientKnownRequestError`, `PrismaClientValidationError`, `PrismaClientInitializationError`) are caught and returned with generic messages so table/column/constraint names never leak. Every error response includes a localizable `messageKey`.
- **Elasticsearch query sanitization**: User input passes through the shared `sanitizeEsQueryString()` utility (`es-sanitize.utility.ts`); patterns like `script`, `_search`, `_mapping`, `_cluster`, `_cat`, `_nodes` are stripped and `allow_leading_wildcard: false` is enforced.
- **Input validation**: All DTOs use Zod with mandatory `.max()` bounds on every string and array field (DoS prevention).
- **TLS warnings**: Connector HTTP calls that set `rejectUnauthorized: false` log a `console.warn` identifying the connector type.
- **Health endpoint minimization**: The public health endpoint omits the application version and returns service names only (e.g. `"redis": "healthy"`) — never internal connection URLs/hosts/ports.
- **Source maps disabled in production** (`tsconfig.build.json`: `"sourceMap": false`).
- **Request timeout**: The HTTP server applies a socket timeout in `main.ts`.

---

## 15. Responsible Disclosure

> **PLACEHOLDER — to be completed before public launch.**
>
> A security contact and coordinated-disclosure process have not yet been published in this repository. Before going to production, add:
>
> - A security contact email or `SECURITY.txt` (`/.well-known/security.txt`).
> - Supported versions / disclosure window and expected response SLA.
> - A safe-harbor statement for good-faith researchers.
>
> Until then, report suspected vulnerabilities privately to the platform maintainers rather than filing public issues.

---

## Reference — Key Security Files

| Concern                                                       | File                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| HTTP bootstrap (Helmet, CSP, CORS, body limits, Swagger gate) | `apps/api/src/main.ts`                                        |
| Environment schema                                            | `apps/api/src/config/env.validation.ts`                       |
| Auth guard (JWT verify + active check + tenant switch)        | `apps/api/src/common/guards/auth.guard.ts`                    |
| Tenant guard                                                  | `apps/api/src/common/guards/tenant.guard.ts`                  |
| Token issuance / verification / bcrypt                        | `apps/api/src/modules/auth/auth.service.ts`                   |
| Token claim assertions & TTL parsing                          | `apps/api/src/modules/auth/auth.utilities.ts`                 |
| Redis JTI blacklist + refresh-family rotation                 | `apps/api/src/modules/auth/token-blacklist.service.ts`        |
| AES-256-GCM encryption                                        | `apps/api/src/common/utils/encryption.utility.ts`             |
| SSRF validation (+ DNS rebinding)                             | `apps/api/src/common/utils/ssrf.utility.ts`                   |
| Audit interceptor                                             | `apps/api/src/common/interceptors/audit.interceptor.ts`       |
| Sensitive-field redaction                                     | `apps/api/src/common/utils/redaction.utility.ts`              |
| WebSocket auth + CORS                                         | `apps/api/src/modules/notifications/notifications.gateway.ts` |
