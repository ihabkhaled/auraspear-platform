# Authentication & Session Architecture — `apps/api`

> **Entry point first.** This is a deep-dive reference. Start your loading order
> at [`AGENTS.md`](../../AGENTS.md) (Section 1), then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — the authoritative backend
> rulebook this doc summarizes — before touching auth code. **No AI agent may
> edit first and understand later.** Auth changes must never weaken the security
> invariants in [`AGENTS.md` §6](../../AGENTS.md) or `CLAUDE.md` rules 23–24,
> 29, 37–38, 51–53, 64.

This document covers **how a request proves who it is** in the API: the login
methods (email/password live; OIDC scaffolded), the JWT access/refresh token
lifecycle (15m / 7d, `jti`, `tokenType`, Redis blacklist, DB-backed family
rotation), and the guard chain that runs on every request. Source lives under
`apps/api/src/modules/auth/` and `apps/api/src/common/guards/`.

## Where this doc sits

| You want…                                     | Go to                                                                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| The hard, enforced auth/security rules        | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (rules 23–24, 29, 31–32, 37–38, 51–53, 61, 64)                                                       |
| The full guard chain in backend context       | [`docs/architecture/BACKEND.md` §4](BACKEND.md) (`Guards — the global chain`)                                                                         |
| RBAC model + the "add a permission" checklist | [`docs/architecture/BACKEND.md`](BACKEND.md) · `CLAUDE.md` rule 85                                                                                    |
| Platform-wide security invariants             | [`docs/SECURITY.md`](../SECURITY.md) · [`rules/security/`](../../rules/security/)                                                                     |
| Threat model (tokens, sessions, enumeration)  | [`docs/security/THREAT_MODEL.md`](../security/THREAT_MODEL.md)                                                                                        |
| Secret handling (`JWT_SECRET`, OIDC vars)     | [`docs/security/SECRET_HANDLING.md`](../security/SECRET_HANDLING.md) · [`rules/security/secret-handling.md`](../../rules/security/secret-handling.md) |
| Stable security truths                        | [`memory/SECURITY_MEMORY.md`](../../memory/SECURITY_MEMORY.md)                                                                                        |
| Request flow / layering                       | [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) · [`docs/architecture/RUNTIME.md`](RUNTIME.md)                                                           |

This file does **not** restate the controller→service→repository layering, the
full RBAC permission catalog, or tenant-isolation rules — those live in
[`BACKEND.md`](BACKEND.md) and `CLAUDE.md`. Link them; don't duplicate.

---

## 1. Authentication methods

The API supports two identity sources. **Email/password is the live, wired
path today; OIDC is scaffolded** (env-validated helpers exist but no callback
endpoint is mounted on the controller yet).

### 1a. Email / password (live)

`POST /auth/login` (`auth.controller.ts`) is `@Public()` + `@SkipCsrf()` and
rate-limited to **5 requests / 60s** (`@Throttle({ default: { limit: 5, ttl:
60_000 } })`, per `CLAUDE.md` rule 32). The flow in `AuthService.login()`
(`auth.service.ts`):

1. `authenticateCredentials()` loads the user **with active memberships only**
   (`findUserByEmailWithMemberships(email, MembershipStatus.ACTIVE)`).
2. **Constant-time comparison even for missing users** — `validatePasswordOrDummy()`
   always runs `bcrypt.compare()`, falling back to `DUMMY_BCRYPT_HASH`
   (`auth.constants.ts`) when no user/hash exists. This defeats timing-based
   email enumeration (`CLAUDE.md` rule 52). Bcrypt salt rounds: `12`
   (`AUTH_BCRYPT_SALT_ROUNDS`).
3. On success → `updateLastLogin()`, build the JWT payload from the first
   membership (`buildPayloadFromMembership`), then `issueSession()` (see §2).
4. Response: `{ accessToken, csrfToken, user, permissions, tenants }`. Access +
   refresh tokens are **also set as HttpOnly cookies** (see §4); permissions are
   resolved via `RoleSettingsService.getUserPermissions(tenantId, role)`.

Login DTO (`dto/auth-login.dto.ts`): `email` (`.max(320)`), `password`
(`.max(128)`) — Zod-validated via `ZodValidationPipe` (`CLAUDE.md` rule 27).

There is **no dev-mode auth bypass and no fake users** in any environment
(`AGENTS.md` §6, `CLAUDE.md` rules 23, 56). Blocked/deleted users are rejected
at request time by `validateUserActive()` (see §3).

### 1b. OIDC + JWT / JWKS (scaffolded)

OIDC support is present at the configuration and helper layer but not yet
exposed as a callback route:

- **Env**: `OIDC_ISSUER_URL`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI`, `OIDC_CLIENT_ID`
  are validated in `config/env.validation.ts` as **all-or-nothing** — a Zod
  `.superRefine` rejects partial config (`CLAUDE.md` rule 64). All four are
  `.optional()`, so OIDC is opt-in.
- **DTO**: `dto/auth-callback.dto.ts` (`AuthCallbackSchema`) validates the
  `code` / `state` / `redirect_uri` of an authorization-code callback.
- **Provisioning**: `AuthService.findOrCreateUser(tenantId, oidcSub, email,
name)` upserts the user by `oidcSub` and grants a default
  `SOC_ANALYST_L1` membership (`upsertUserByOidcSub` + `upsertTenantMembership`).
- **JWKS**: `OIDC_JWKS_URI` is the published key set for verifying provider-issued
  ID tokens (RS256). Note: the **session tokens the API itself mints are HS256**,
  signed with `JWT_SECRET` (see §2) — these are independent of any OIDC IdP token.

> When wiring the OIDC callback, keep the post-exchange flow identical to
> §1a step 3 onward (`issueSession` → cookies). Do not bypass `issueSession`,
> the blacklist, or the family/rotation tracking.

---

## 2. Token lifecycle (15m / 7d, `jti`, `tokenType`, blacklist, rotation)

The API mints **its own HS256 JWTs** for sessions. There are two token types,
both carrying a `jti` and a `tokenType` claim (`CLAUDE.md` rule 38).

| Token   | TTL (default)               | `tokenType` | Extra claims                  | Cookie                   |
| ------- | --------------------------- | ----------- | ----------------------------- | ------------------------ |
| Access  | `15m` (`JWT_ACCESS_EXPIRY`) | `access`    | `jti`, `family`               | `access_token` (Lax)     |
| Refresh | `7d` (`JWT_REFRESH_EXPIRY`) | `refresh`   | `jti`, `family`, `generation` | `refresh_token` (Strict) |

Cookie max-ages mirror the TTLs: `ACCESS_COOKIE_MAX_AGE_MS = 15m`,
`REFRESH_COOKIE_MAX_AGE_MS = 7d` (`auth.constants.ts`). TTL strings are parsed by
`parseExpiryToSeconds()` (`auth.utilities.ts`, supports `s/m/h/d/w`).

### 2a. Signing & verification (algorithm pinned)

- **Signing**: `jwt.sign(..., this.jwtSecret, { algorithm: 'HS256', expiresIn })`
  in `issueAccessTokenBundle()` / `issueRefreshToken()`. `JWT_SECRET` must be
  **≥ 64 hex chars (32 bytes)** and is validated both at config load
  (`env.validation.ts`, rejects all-zero per `CLAUDE.md` rule 53) and again in
  the `AuthService` constructor — **fail loudly, no fallback secret**
  (`CLAUDE.md` rule 24).
- **Verification**: `jwt.verify(token, secret, { algorithms: ['HS256'],
clockTolerance: JWT_CLOCK_TOLERANCE_SECONDS })` (30s skew) in
  `verifyToken()`. Pinning `algorithms` prevents algorithm-confusion
  (`CLAUDE.md` rule 29).
- **Type confusion guard**: every verify calls `assertTokenTypeValid(decoded,
expectedType)` — an access token presented where a refresh is expected (or
  vice versa) is rejected 401.

`stripTokenMetaClaims()` removes `iat/exp/jti/family/generation` before
re-signing so stale meta never leaks into a freshly issued token.

### 2b. The four lifecycle events

```
1. Login    → issue access(15m) + refresh(7d); create RefreshTokenFamily +
              first RefreshTokenRotation + UserSession (DB), all keyed by family
2. Refresh  → verify refresh + type + blacklist; validate rotation is current;
              issue NEW pair (generation+1); blacklist OLD refresh jti; advance
              family generation in DB
3. Logout   → blacklist BOTH access + refresh jti (Redis, TTL = remaining exp);
              revoke the refresh family (reason = LOGOUT)
4. Request  → AuthGuard verifies access token, checks tokenType === 'access',
              checks Redis blacklist, validateUserActive(), touchSessionActivity()
```

This expands the summary in `CLAUDE.md` → _Security Architecture (Post-Audit) →
Token Lifecycle_.

### 2c. Refresh rotation & replay detection (DB-backed families)

Refresh is **not** a stateless re-sign. `AuthService.refreshTokens()` enforces a
rotating-token-family model persisted in Postgres (Prisma models
`RefreshTokenFamily`, `RefreshTokenRotation`, `UserSession`):

1. `verifyRefreshToken()` → HS256 + `tokenType === 'refresh'` + blacklist check.
2. `getRefreshRotationOrThrow()` → look up the rotation by **SHA-256 hash of the
   `jti`** (`hashTokenIdentifier()` — raw `jti`s are never stored), and confirm
   it belongs to the claimed `family`.
3. `assertRefreshRotationCurrent()`:
   - rejects on `generation` mismatch,
   - rejects if the family is `revoked` or `expired` (and lazily expires stale
     families),
   - if the presented rotation is **not** the family's `currentGeneration` /
     not `active` → `handleRefreshReplay()` **revokes the entire family**
     (reason `REPLAY_DETECTED`) and throws `errors.auth.tokenReplayDetected`.
4. Re-resolve the user + target membership, mint a new pair at
   `generation + 1` (`rotateAndIssueTokens` → `persistRotation`), and
   `finalizeRefreshRotation()` **blacklists the old refresh `jti`**
   (`CLAUDE.md` rule 51 — without this, an intercepted refresh token could be
   replayed for the full 7-day window).

`refresh` is rate-limited at the controller (`@Throttle({ default: { limit: 8,
ttl: 60_000 } })`). `CLAUDE.md` rule 32 calls for a 10/min refresh tier; the
current controller value is 8/min — treat the stricter value as the floor when
editing.

### 2d. Server-side blacklist (Redis)

`TokenBlacklistService` (`token-blacklist.service.ts`) is the revocation store
(`CLAUDE.md` rule 37). Keys:

| Key pattern             | Purpose                                                 |
| ----------------------- | ------------------------------------------------------- |
| `token:blacklist:{jti}` | Revoked access/refresh `jti`; TTL = remaining token exp |
| `rf:{family}`           | Refresh-family generation marker                        |
| `rf:revoked:{family}`   | Revoked refresh family marker                           |

- `blacklist(jti, ttl)` → `SET key 1 EX ttl` (TTL floored at 1s so keys always
  expire when the token would have).
- `isBlacklisted(jti)` is **fail-open**: if Redis is unavailable it returns
  `false` (not blacklisted) — an intentional availability-over-security
  trade-off, documented in the source. Database-side family revocation
  (`RefreshTokenFamily.status`) remains authoritative for refresh, so a Redis
  outage does not let a revoked _family_ refresh.

### 2e. Logout

`POST /auth/logout` (`@Throttle` 10/min, `CLAUDE.md` rule 61) →
`performLogout()`:

- requires a valid access user (`assertAccessClaimsPresent`),
- verifies the supplied/cookie refresh token and asserts its `sub` matches the
  access token's (`assertRefreshSubjectMatches`),
- `logout()` blacklists **both** `jti`s with their remaining TTLs and revokes
  the refresh family (reason `LOGOUT`),
- `clearAuthCookies()` clears `access_token`, `refresh_token`, `csrf_token`.

Force-logout / session-management variants (`force_logout_user`,
`force_logout_session`, `force_logout_all`) flow through
`revokeSessionTargets()` + `RefreshTokenFamilyRevocationReason` (`auth.enums.ts`).

---

## 3. The JWT payload & per-request validation

`JwtPayload` (`common/interfaces/authenticated-request.interface.ts`):

```ts
{ sub, email, tenantId, tenantSlug, role,
  jti?, iat?, exp?,
  isImpersonated?, impersonatorSub?, impersonatorEmail?,   // impersonation
  family?, generation? }                                    // refresh rotation
```

On **every** non-`@Public()` request, `AuthGuard.canActivate()`
(`common/guards/auth.guard.ts`):

1. extracts the token — **Authorization: Bearer** header first, then the
   HttpOnly `access_token` cookie (`extractTokenFromRequest`),
2. `verifyAccessToken()` (HS256 + `tokenType: 'access'` + blacklist),
3. `validateUserActive(decoded.sub)` — re-checks the DB that the user still
   exists **and has at least one `active` membership** (`CLAUDE.md` rule 31,
   Key Principle 7). Inactive/suspended/deleted users get 401
   (`errors.auth.accountInactive` / `userNotFound`).
4. `buildCurrentUserContext()` → `resolveAuthorizedTenantContext()` performs the
   **GLOBAL_ADMIN tenant switch**: reads the `X-Tenant-Id` header and, only for
   a user with a GLOBAL_ADMIN membership, overrides `request.user.tenantId` /
   `tenantSlug` / `role` to the target tenant. Non-admins cannot switch
   (Key Principle 8). Role/tenant come **only** from this validated path —
   never from client headers (`CLAUDE.md` rule 76).
5. `touchSessionActivity()` updates the `UserSession` row for the token's
   `family`, and throws `errors.auth.sessionRevoked` if the session is no
   longer `ACTIVE`.

`@CurrentUser()` and `@TenantId()` (`common/decorators/`) read the populated
`request.user`; `@TenantId()` re-asserts a tenant is present as
defense-in-depth.

---

## 4. Cookies & CSRF

Tokens are delivered as cookies in addition to the JSON body (`auth-cookie.utility.ts`):

| Cookie          | HttpOnly | SameSite | `secure`  | Max-age |
| --------------- | -------- | -------- | --------- | ------- |
| `access_token`  | yes      | `Lax`    | prod-only | 15m     |
| `refresh_token` | yes      | `Strict` | prod-only | 7d      |
| `csrf_token`    | **no**   | `Strict` | prod-only | 15m     |

`secure` is gated on `NODE_ENV === 'production'` (and `NODE_ENV` defaults to
`production`, `CLAUDE.md` rule 58). The `csrf_token` is intentionally
**non-HttpOnly** so the SPA can read it and echo it in the `X-CSRF-Token`
header (double-submit pattern).

`CsrfGuard` (`common/guards/csrf.guard.ts`) enforces CSRF **only for
state-changing methods on cookie-backed requests**:

- skips safe methods (only `STATE_CHANGING_METHODS` are checked),
- skips endpoints marked `@SkipCsrf()` (login/refresh are `@SkipCsrf()` because
  they bootstrap the token),
- skips requests not using cookie auth (pure Bearer API clients),
- otherwise requires `csrf_token` cookie === `X-CSRF-Token` header, compared
  with **`timingSafeEqual`** (constant-time).

A fresh CSRF token is issued (`issueCsrfToken`) on login, refresh, and
end-impersonation.

---

## 5. The guard chain (order matters)

All guards are registered globally in `app.module.ts` via `APP_GUARD` and run
**in registration order on every request**:

```
ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard
```

| Guard              | Responsibility (auth-relevant)                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ThrottlerGuard`   | Global + per-endpoint rate limits (`@Throttle`); auth tiers: login 5/min, refresh 8/min, logout 10/min.                                  |
| `AuthGuard`        | Token verify (HS256, `tokenType`, blacklist) → `validateUserActive()` → GLOBAL_ADMIN tenant switch → `request.user`. Honors `@Public()`. |
| `CsrfGuard`        | Double-submit CSRF for cookie-backed state-changing requests; `@SkipCsrf()` bypass.                                                      |
| `TenantGuard`      | Rejects 403 (`errors.auth.tenantRequired`) when no tenant context is present. Honors `@Public()`.                                        |
| `RolesGuard`       | Hierarchy-based `@Roles(UserRole.X)` gate (`ROLE_HIERARCHY`); used narrowly (e.g. role-settings, connector mutations).                   |
| `PermissionsGuard` | Primary RBAC gate — `@RequirePermission(Permission.X)`; GLOBAL_ADMIN bypass; `@AllowCaseOwner()` case-owner bypass.                      |

`@Public()` short-circuits `AuthGuard` **and** `TenantGuard`
(`IS_PUBLIC_KEY`). The deeper guard-chain treatment (RolesGuard hierarchy,
PermissionsGuard DB lookup, the 10-step "add a permission" checklist) lives in
[`BACKEND.md`](BACKEND.md) and `CLAUDE.md` rule 85 — see those rather than
duplicating here.

> **Role hierarchy.** `RolesGuard` resolves seniority from `ROLE_HIERARCHY`
> (`authenticated-request.interface.ts`): `GLOBAL_ADMIN` → `PLATFORM_OPERATOR`
> → `TENANT_ADMIN` → `DETECTION_ENGINEER` → `INCIDENT_RESPONDER` →
> `THREAT_INTEL_ANALYST` → `SOAR_ENGINEER` → `THREAT_HUNTER` → `SOC_ANALYST_L2`
> → `SOC_ANALYST_L1` → `EXECUTIVE_READONLY` → `AUDITOR_READONLY`. A user passes
> if their index is **≤** the required role's index. (This live enum is broader
> than the 6-role list in `CLAUDE.md`'s _Role Hierarchy_ section — trust the
> code.)

---

## 6. Impersonation

GLOBAL_ADMIN impersonation issues a session whose JWT carries
`isImpersonated: true` + `impersonatorSub` / `impersonatorEmail`.
`POST /auth/end-impersonation` (`endImpersonation()`):

- asserts the caller is actually impersonating (`assertCallerIsImpersonated`),
- blacklists the current token and revokes its refresh family (reason
  `IMPERSONATION_ENDED`),
- re-issues a fresh session for the original admin (`preserveImpersonationClaims`
  carries impersonation context across refresh rotations until it is ended).

Impersonation is sensitive: it is a privileged, fully-audited action (see the
`AuditInterceptor` and `docs/audit/`). Never widen who can impersonate without
updating `rules/security/security-rules.md`.

---

## 7. Auth endpoints (controller summary)

`AuthController` (`auth.controller.ts`), base path `/auth` (mounted under the
global `/api/v1` prefix):

| Method & path                  | Public? | CSRF        | Throttle | Purpose                                   |
| ------------------------------ | ------- | ----------- | -------- | ----------------------------------------- |
| `POST /auth/login`             | yes     | `@SkipCsrf` | 5/min    | Email/password login → tokens + cookies   |
| `POST /auth/refresh`           | yes     | `@SkipCsrf` | 8/min    | Rotate token pair                         |
| `POST /auth/logout`            | no      | enforced    | 10/min   | Blacklist + revoke family + clear cookies |
| `GET  /auth/me`                | no      | n/a (GET)   | —        | Current `user` + resolved `permissions`   |
| `GET  /auth/tenants`           | no      | n/a (GET)   | —        | User's tenant memberships                 |
| `POST /auth/end-impersonation` | no      | enforced    | 5/min    | Exit impersonation, restore admin session |

All error responses carry a `messageKey` (`errors.auth.*`) for localized
frontend display (`CLAUDE.md` rules 17–18); the i18n keys must exist in all 6
locale files (`CLAUDE.md` rule 49).

---

## 8. Invariants for anyone touching auth

Before editing, re-read `apps/api/CLAUDE.md` and confirm you are not violating:

- **No bypass, no fallback secret** — no `NODE_ENV` shortcuts (rules 23, 56);
  `JWT_SECRET` validated at load and in the constructor (rules 24, 53).
- **Pin algorithms** — `HS256` on sign, `['HS256']` on verify (rule 29).
- **Every JWT carries `jti` + `tokenType`; verify `tokenType` every time**
  (rule 38).
- **Refresh rotation blacklists the old `jti`** and family-revokes on replay
  (rule 51).
- **Constant-time login** against `DUMMY_BCRYPT_HASH` for unknown emails
  (rule 52).
- **`validateUserActive` checks active membership**, not mere existence
  (rule 31).
- **Strict auth rate limits** (rule 32) and **passwords redacted from logs**
  (rule 57).
- **Role/tenant come only from the validated JWT path** — never client headers
  (rule 76).

Then follow the relevant recipe in [`skills/backend/`](../../skills/backend/)
(e.g. `add-endpoint.md`, `add-permission.md`) and the hard rules in
[`rules/security/`](../../rules/security/) and
[`rules/backend/`](../../rules/backend/).
