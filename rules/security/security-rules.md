# Rules — Security (consolidated)

> **Read `../../AGENTS.md` first** (loading order + the one rule: understand
> before you edit; §6 "Security invariants"). Then `../../apps/api/CLAUDE.md`
> (the 100+ absolute rules this file distills) and `../../apps/web/CLAUDE.md`
> (frontend "Security Rules"). These are **hard constraints**, not guidance.
> Each line below maps to real code — cited by path. Violating one is a
> cross-tenant breach, privilege escalation, token replay, credential leak, or
> SSRF, not a style nit. Sibling files: tenant/RBAC depth lives in
> `../backend/tenant-permission-rules.md`; DTO limits in
> `../backend/dto-validation-rules.md`; AI safety in `../ai/*`; secrets/env in
> `../../skills/devsecops/add-env-variable.md`.

AuraSpear is a **multi-tenant SOC BFF** (`apps/api`, NestJS 11) fronted by a
Next.js proxy (`apps/web`). The frontend never calls Wazuh/OpenSearch/MISP
directly — every outbound call and every authorization decision is the API's
job. The guards, `main.ts`, and `config/env.validation.ts` are the trust
boundary; do not weaken them.

---

## 1. Tenant isolation (CLAUDE.md #8, #26)

Every tenant-owned `findMany`/`findFirst`/`update`/`delete` is scoped by
`tenantId`. No cross-tenant read or write, ever.

- `tenantId` flows controller (`@TenantId()`) → service → repository and lands
  in the `where`. Repositories take `tenantId` on **every** method.
- `update()`/`delete()` scope by `{ id, tenantId }` (the codebase uses
  `updateMany`/`deleteMany`, which returns `count: 0` instead of leaking that a
  row exists in another tenant). Never `where: { id }` alone.
- Sub-resources validate **parent** ownership first (CLAUDE.md #75): a valid
  child id never implies valid parent access.
- A bare `findUnique({ where: { id } })` on a tenant-owned model is a review
  blocker unless the row is genuinely global.
- Depth + examples (guard chain, GLOBAL_ADMIN `X-Tenant-Id` switch):
  `../backend/tenant-permission-rules.md`.

## 2. RBAC (CLAUDE.md #25)

Every endpoint carries `@RequirePermission(Permission.MODULE_ACTION)` from
`@/common/decorators/permission.decorator`. No bypass.

- The `PermissionsGuard` (`apps/api/src/common/guards/permissions.guard.ts`)
  reads the metadata, then checks the user's DB-backed role→permission set via
  `roleSettingsService.getUserPermissions(tenantId, role)`. Multiple permissions
  = **AND** (`requiredPermissions.every(...)`, `permissions.guard.ts:55`).
- **Fail-open default is a trap:** an endpoint with no `@RequirePermission` is
  **allowed through** (`permissions.guard.ts:27`). The missing decorator does
  not fail closed — every endpoint needs one, or `@Public()` and a documented
  reason.
- `GLOBAL_ADMIN` bypass is hard-coded in **one place** (`permissions.guard.ts:45`).
  Never replicate `if (role === GLOBAL_ADMIN)` into services/repos/utilities.
- Adding a permission is an **end-to-end** change (CLAUDE.md #85) — see
  `../backend/tenant-permission-rules.md` §5 and
  `../../skills/backend/add-permission.md`.
- `@Roles()` is legacy; it is retained on `role-settings` and on
  connector create/update/toggle (`TENANT_ADMIN`-only, CLAUDE.md #55). Do not
  add it to new feature endpoints.

## 3. No auth bypass — in any environment (CLAUDE.md #23, #56)

Every non-`@Public()` request goes through the full guard chain. The global
order (registered as `APP_GUARD` in `app.module.ts`) is:

```
ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard
```

- `AuthGuard` (`apps/api/src/common/guards/auth.guard.ts`): extracts the token
  (Bearer header, then HttpOnly `access_token` cookie), `verifyAccessToken`,
  `validateUserActive(sub)` (rejects inactive/suspended/deleted users with 401),
  then builds `request.user`. `TenantGuard` rejects 403
  `errors.auth.tenantRequired` if `tenantId` is absent (`tenant.guard.ts:24`).
- **No `NODE_ENV` shortcuts.** No dev fake-user, no skipping JWT verification, no
  `if (NODE_ENV === 'development') { skip }`. Security validations (auth, SSRF,
  HTTPS enforcement, AI enablement) run in **every** environment (CLAUDE.md #56).
- **Never trust client-supplied identity.** Role and tenant come from the
  validated JWT / guard context only. Never read a role from a body or header —
  no `X-Role` forwarding even in dev (CLAUDE.md #76). The frontend proxy must not
  forward auth/role headers either (`apps/web/CLAUDE.md` Security Rule #41). The
  only honored client header is `X-Tenant-Id`, resolved server-side and only for
  `GLOBAL_ADMIN`.
- **CSRF** (`apps/api/src/common/guards/csrf.guard.ts`): state-changing methods
  that use cookie-backed auth require a matching `csrf_token` cookie + header,
  compared with `timingSafeEqual`. Don't disable it; `@SkipCsrf()` is for
  bearer-only routes only.

## 4. Token lifecycle (CLAUDE.md #37, #38, #51; `apps/api/CLAUDE.md` "Token Lifecycle")

Implemented in `apps/api/src/modules/auth/auth.service.ts` +
`token-blacklist.service.ts`.

- **Lifetimes:** access **15m**, refresh **7d**
  (`JWT_ACCESS_EXPIRY` / `JWT_REFRESH_EXPIRY` defaults in `env.validation.ts:36`,
  read in `auth.service.ts:76`). Don't widen these.
- **`jti` + `tokenType` on every token** (CLAUDE.md #38): tokens are minted with
  `jti: randomUUID()` and `tokenType: ACCESS | REFRESH`
  (`auth.service.ts:494`, `:517`). Verify `tokenType === 'access'` on every
  request to prevent token-type confusion; a refresh token must never satisfy an
  access check.
- **Algorithm pinned** (CLAUDE.md #29): sign with `{ algorithm: 'HS256' }`
  (`auth.service.ts:501`, `:529`), verify with `{ algorithms: ['HS256'] }`
  (`auth.service.ts:830`). Never allow algorithm confusion / `none`.
- **Server-side blacklist** (CLAUDE.md #37): logout blacklists both access and
  refresh `jti` in Redis with remaining TTL (`auth.service.ts:283`,
  `token:blacklist:{jti}` keys). `AuthGuard` rejects blacklisted JTIs.
- **Refresh rotation revokes the old token** (CLAUDE.md #51): `/refresh` issues a
  new pair **and** blacklists the old refresh `jti` + advances the refresh-token
  **family** generation (`token-blacklist.service.ts` family tracking,
  `invalidateFamily` on replay). Never issue new tokens without revoking the old
  ones — an intercepted refresh token would otherwise replay for the full 7 days
  (persistent account takeover).
- **Fail-open caveat is deliberate, not a license:** `isBlacklisted` returns
  `false` when Redis is down (`token-blacklist.service.ts:46`,
  availability-over-security). Do **not** lean on this — keep Redis healthy and
  never remove blacklist writes.

## 5. Login: bcrypt + constant-time (CLAUDE.md #52)

- Passwords are bcrypt-hashed; verification is `bcrypt.compare`
  (`auth.service.ts:489`).
- **Constant-time for missing users:** a login for a non-existent email still
  runs `bcrypt.compare` against the pre-computed `DUMMY_BCRYPT_HASH`
  (`auth.constants.ts:4`) via `validatePasswordOrDummy` (`auth.service.ts:488`)
  before returning 401. This kills timing-based email enumeration (~500ms bcrypt
  vs ~1ms early-return). Never short-circuit the compare when the user is absent.
- Auth endpoints carry strict throttling (CLAUDE.md #32, #80): login
  `5/60s`, refresh `10/60s`, logout `10/60s`. Apply the right `@Throttle()` tier.

## 6. HTTP hardening: Helmet + CSP (`main.ts`, CLAUDE.md #62)

In `apps/api/src/main.ts`:

- **Helmet with explicit CSP** (`main.ts:48`): `default-src 'self'`,
  `script-src 'self'`, `style-src 'self'` (**no `'unsafe-inline'`** — CLAUDE.md
  #62; a backend API needs no inline styles), `object-src 'none'`,
  `frame-ancestors 'none'`. Don't loosen these directives.
- **HSTS** 1 year, `includeSubDomains`, `preload` (`main.ts:62`); `frameguard:
deny`; `Referrer-Policy: strict-origin-when-cross-origin`.
- **Body size limit 1MB** (`express.json({ limit: '1mb' })`, `main.ts:30`) — never
  remove (CLAUDE.md #34). Large nested JSON fields also need per-field `.refine()`
  caps (CLAUDE.md #78) — see `../backend/dto-validation-rules.md`.
- **`Cache-Control: no-store`** is set for authenticated requests (`main.ts:69`)
  so tokens/PII never land in shared caches. Keep it.
- Frontend security headers live in `apps/web/next.config.ts`
  (`apps/web/CLAUDE.md` #38): X-Content-Type-Options, X-Frame-Options, HSTS,
  Referrer-Policy, Permissions-Policy.

## 7. Strict CORS — no localhost in prod (`main.ts`, `env.validation.ts`, CLAUDE.md #83, #84)

- CORS origins are read from `CORS_ORIGINS`, **validated as real http/https URLs**
  via `new URL()` (`main.ts:94`), and `credentials: true` is set so cookies flow
  only to allowlisted origins. Production with zero valid origins **throws at
  boot** (`main.ts:106`).
- **`env.validation.ts` rejects `localhost`/`127.0.0.1` in production**
  (`env.validation.ts:84` `.refine()`) and rejects an empty list in production
  (`:71`). Dev origins must never leak into prod config.
- **WebSocket CORS must match** (CLAUDE.md #84): any gateway validates origins
  against the same `CORS_ORIGINS`. Never `cors: true` / allow-all on a socket.

## 8. SSRF validation (CLAUDE.md #59, #95; `ssrf.utility.ts`)

Every user-supplied URL (connector URLs, custom OSINT sources, AI gateway URLs)
is validated **at input time** — before encryption and storage — not only at
fetch time (CLAUDE.md #59). Storing `http://169.254.169.254/` is itself the bug.

- Use `validateUrl()` / `resolveAndValidateUrl()` from
  `apps/api/src/common/utils/ssrf.utility.ts`. Never hand-roll URL checks.
- It blocks non-http(s)/ws(s) protocols, and in production rejects private/
  internal hosts via `PRIVATE_HOST_PATTERNS` (`ssrf.constants.ts`: `127.`, `10.`,
  `172.16–31.`, `192.168.`, `169.254.` link-local/cloud-metadata, `localhost`,
  IPv6 loopback/ULA/link-local, `::ffff:` IPv4-mapped).
- `resolveAndValidateUrl()` adds **DNS-rebinding** defense: resolves the host and
  re-checks the IP (`ssrf.utility.ts:72`). Prefer it for outbound fetches.
- When a connector call uses `rejectUnauthorized: false`, log a `console.warn`
  with the connector type (CLAUDE.md #50). Elasticsearch query strings go through
  `sanitizeEsQueryString()` (CLAUDE.md #35, #79).
- Frontend OSINT forms pre-validate with `isAllowedSourceUrl()` from
  `@/lib/source.utils.ts` (`apps/web/CLAUDE.md` #54) — but the backend
  `validateUrl()` is the authoritative gate; the FE check is UX, not security.

## 9. Audit logging + redaction (CLAUDE.md #57, #66; `audit.interceptor.ts`)

- All mutations (`POST`/`PUT`/`PATCH`/`DELETE`) are auto-audited by
  `apps/api/src/common/interceptors/audit.interceptor.ts` → `auditLog` table
  (tenantId, actor, role, action, resource, resourceId, ipAddress).
- **Credentials are redacted before persistence:** request bodies pass through
  `redactSensitiveFields()`; the key set
  (`apps/api/src/common/utils/redaction.constants.ts` `SENSITIVE_KEYS`) covers
  `password`/`currentPassword`/`newPassword`/`confirmPassword`, `secret`,
  `apiKey`, `token`, `accessToken`, `refreshToken`, `clientSecret`, `accessKey`,
  `secretAccessKey`, `encryptedConfig`, `authorization`, `cookie`,
  `sessionToken`, `encryptionKey`. **Adding a new credential field? Add its key
  here** (CLAUDE.md #66) or it leaks into audit logs.
- The pino logger `redact` array (`app.module.ts`) must also cover
  `req.body.password` et al. so plaintext passwords never reach log aggregation
  (CLAUDE.md #57). Frontend: never log tokens/credentials anywhere, including
  Zustand devtools (`apps/web/CLAUDE.md` #39).

## 10. No information disclosure

- **Error responses are sanitized in every environment** (CLAUDE.md #44, #63,
  #77, #82). The `GlobalExceptionFilter` runs every error through
  `sanitizeMessage()` (`http-exception.utilities.ts:58`): strips Windows/POSIX
  file paths → `[path]` and truncates to 500 chars. Prisma errors
  (`PrismaClientKnownRequestError`/`ValidationError`/`InitializationError`) are
  caught and returned as **generic** messages (`http-exception.utilities.ts:111`)
  — never leak table/column/constraint names or stack traces. Every error
  carries a `messageKey` (CLAUDE.md #18). Throw `BusinessException`, never raw
  Nest exceptions (CLAUDE.md #17).
- **No internal service URLs in responses** (CLAUDE.md #81): health/status
  endpoints return service **names + status** only (`"redis": "healthy"`), never
  hosts/ports/connection strings.
- **No version disclosure** (CLAUDE.md #60): the `@Public()` health endpoint
  (`apps/api/src/modules/health/health.controller.ts`) must not return `version`.
  Version strings help attackers fingerprint vulnerable builds.
- **Swagger is dev-only** (`main.ts:119`, gated on
  `NODE_ENV === 'development'`); production source maps are off
  (`tsconfig.build.json`, CLAUDE.md #45).

## 11. Secrets & connector encryption (AGENTS.md §6, CLAUDE.md #24, #53)

- **No committed or fallback secrets.** `JWT_SECRET` and `CONFIG_ENCRYPTION_KEY`
  are loaded from env with **no defaults** and validated in
  `apps/api/src/config/env.validation.ts`: `JWT_SECRET` must be ≥64 hex chars and
  **rejects all-zeros** (`:33`); `CONFIG_ENCRYPTION_KEY` must be exactly 64 hex
  (32 bytes for AES-256) and **rejects all-zeros** (`:113`). OIDC vars are
  all-or-nothing (`superRefine`, `:134`). Fail loudly at startup if missing.
- `.env.example` ships **empty** values with generation instructions — never
  zero-entropy placeholders (CLAUDE.md #53). Seed scripts have **no fallback
  password** (`SEED_DEFAULT_PASSWORD` required, CLAUDE.md #54).
- **Connector credentials are AES-256-GCM encrypted at rest** via
  `apps/api/src/common/utils/encryption.utility.ts` (CLAUDE.md #4 "Key
  Principles"). OSINT API keys are encrypted the same way (CLAUDE.md #96).
  Decrypted config never appears in responses, logs, or audit details.
- `NODE_ENV` defaults to `production` (`env.validation.ts:49`, CLAUDE.md #58) so
  misconfigured deploys fail **closed** (no Swagger, no verbose errors).

## 12. AI safety boundary (AGENTS.md §7, `../ai/*`)

Security-relevant cuts that live here too:

- AI may **analyze and suggest**, but **destructive security/infra actions are
  `approval-required`** — they need a persisted `ApprovalRequest` before
  execution (CLAUDE.md #97). AI must not silently execute.
- **Never render raw AI output as HTML** (`apps/web/CLAUDE.md` #43): no
  `dangerouslySetInnerHTML` with AI content; render markdown via a safe renderer
  or plain text. `react/no-danger` is an ESLint error.
- Redact PII/secrets before model calls (`@auraspear/ai` `redact()`); AI memory
  is tenant-scoped and stores no secrets. AI transcripts never go to
  `localStorage` (`apps/web/CLAUDE.md` #46).

---

## Checklist before you commit a security-touching change

- [ ] Every new/changed query, `update`, `delete` is scoped by `{ id, tenantId }`;
      sub-resources validate parent ownership.
- [ ] Every endpoint has `@RequirePermission(...)` (or `@Public()` + a documented
      reason). No reliance on the "no decorator = allow" default.
- [ ] No auth/SSRF/security check gated on `NODE_ENV`; no client role/tenant
      header trusted; no `X-Role` forwarded.
- [ ] Tokens keep `jti` + `tokenType`, `HS256` pinned, 15m/7d lifetimes; logout
      and refresh-rotation blacklist the old JTIs.
- [ ] New user-supplied URL goes through `validateUrl()` /
      `resolveAndValidateUrl()` at input time.
- [ ] New credential field added to `SENSITIVE_KEYS` and the pino `redact` array.
- [ ] No secret committed; new env secret added to `env.validation.ts` with a
      no-fallback, no-all-zeros refine and an empty `.env.example` entry.
- [ ] No version / internal URL / stack trace / Prisma metadata in any response.
      Errors use `BusinessException` + `messageKey`.
- [ ] No AI destructive action without a persisted approval; no raw AI HTML.
- [ ] No `any`, no `eslint-disable`. `pnpm typecheck` passes (blocking gate;
      `tsgo`/`typecheck:fast` advisory). pnpm only, Node 22. **Branch first —
      never work on `main`.** Prove before deleting any file/dep/env var.

## Related

- `../../AGENTS.md` — §6 security invariants, §7 AI safety, §8 branch safety.
- `../../apps/api/CLAUDE.md` — full rule list (#8, #18, #23–#66, #75–#84, #95–#97)
  - "Security Architecture (Post-Audit)" + "Token Lifecycle".
- `../../apps/web/CLAUDE.md` — frontend "Security Rules" (#35–#41), #43, #46, #54.
- `../backend/tenant-permission-rules.md` — guard chain, tenant scoping, RBAC,
  GLOBAL_ADMIN, end-to-end permission flow (depth).
- `../backend/dto-validation-rules.md` — Zod `.max()` / nested-JSON caps that run
  before the guards (DoS surface).
- `../ai/*` — AI safety, approval-required actions, output rendering.
- `../../docs/security/` and `../../docs/SECURITY.md` — security architecture +
  audit register.
- `../../skills/devsecops/run-security-scan.md` — `pnpm scan:secrets`
  (gitleaks) / `scan:trivy` / `audit:security`.
