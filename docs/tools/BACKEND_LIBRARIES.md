# Backend Libraries — Deep Dive (`@auraspear/api`)

> **Entry point for AI agents and contributors is [`AGENTS.md`](../../AGENTS.md)**
> (loading order, monorepo map, security/AI invariants). **Read it first**, then
> the area docs. This file is a **reference**, not a rule.

## What this file is (and is not)

- **This file** = a focused, per-library deep dive on the **load-bearing backend
  runtime libraries** — NestJS, Prisma, Postgres, Redis/ioredis, Zod,
  jsonwebtoken/jwks-rsa, Pino, Helmet, Socket.IO, and the AWS Bedrock SDK — with
  **why · where · validate · upgrade risk · security · removal** for each,
  grounded in the real code under [`apps/api/src/`](../../apps/api/src/).
- It does **not** replace the broader cross-app library tour. For the grouped
  table of _every_ dependency (web + api + root), read the sibling
  [`docs/tools/LIBRARIES.md`](LIBRARIES.md) — **do not duplicate it here**; this
  doc drills into the API subset and adds explicit security and removal notes.

**Source of truth for versions** = [`apps/api/package.json`](../../apps/api/package.json).
Versions are quoted from that file; when this doc disagrees with it, the
`package.json` wins — fix the doc.

> **Do not run `pnpm` while reading this** — the workspace is mid-upgrade
> ([`LIBRARIES.md`](LIBRARIES.md)). The validate commands below are references;
> run them only when you actually change a dependency.

## Sibling docs, rules & skills (link, don't re-explain)

- **Cross-app library tour**: [`docs/tools/LIBRARIES.md`](LIBRARIES.md).
- **Backend architecture deep dives**: [`docs/architecture/BACKEND.md`](../architecture/BACKEND.md),
  [`API.md`](../architecture/API.md), [`AUTH.md`](../architecture/AUTH.md),
  [`RBAC.md`](../architecture/RBAC.md), [`TENANCY.md`](../architecture/TENANCY.md),
  [`DATABASE.md`](../architecture/DATABASE.md), [`CONNECTORS.md`](../architecture/CONNECTORS.md),
  [`WEBSOCKETS.md`](../architecture/WEBSOCKETS.md), [`JOBS.md`](../architecture/JOBS.md),
  [`AI.md`](../architecture/AI.md), [`RUNTIME.md`](../architecture/RUNTIME.md).
- **Hard backend rules** (the "NEVER" list is the spec these libs implement):
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md),
  [`rules/backend/`](../../rules/backend/) (`api-rules.md`, `layering-rules.md`,
  `dto-validation-rules.md`, `prisma-rules.md`, `tenant-permission-rules.md`).
- **Security & dependency rules**: [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md),
  [`docs/SECURITY.md`](../SECURITY.md) (+ [`docs/security/`](../security/)),
  [`docs/audit/dependency-matrix.md`](../audit/dependency-matrix.md),
  [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md).
- **Recipes (skills)**: [`skills/backend/`](../../skills/backend/) —
  `add-endpoint.md`, `add-module.md`, `add-prisma-model.md`, `add-connector.md`,
  `add-background-job.md`, `add-permission.md`; dependency moves go through
  [`skills/devsecops/upgrade-dependency.md`](../../skills/devsecops/upgrade-dependency.md).

## Conventions used below

Each library has six fields:

- **Why** — the reason it is in the tree.
- **Where** — the module/file that owns it (most libs are wrapped, not used raw).
- **Validate** — the gate(s) to run after touching it. Hard gates per
  [`AGENTS.md` §5](../../AGENTS.md): `typecheck`, `build`, Docker build, gitleaks,
  CodeQL. Backend scripts live in [`apps/api/CLAUDE.md` → Commands](../../apps/api/CLAUDE.md).
- **Upgrade risk** — `low` / `medium` / `high` per [`dependency-matrix.md`](../audit/dependency-matrix.md).
- **Security** — the invariant this library upholds (cross-referenced to the
  numbered rule in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)).
- **Removal** — what proves it is safe (or unsafe) to remove, per the
  prove-before-removing rule ([`AGENTS.md` §8](../../AGENTS.md),
  [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)).

---

## NestJS — the BFF framework

**Packages**: `@nestjs/common` · `@nestjs/core` · `@nestjs/platform-express`
(`^11.0.0`), plus `@nestjs/config@^4`, `@nestjs/throttler@^6`,
`@nestjs/schedule@^6.1.1`, `@nestjs/swagger@^11`, `@nestjs/websockets@^11.1.16`,
`@nestjs/platform-socket.io@^11.1.16`. Runtime deps `reflect-metadata@^0.2.0`
and `rxjs@^7` are required by Nest (decorator metadata + streams).

- **Why** — AuraSpear is a Backend-for-Frontend: the Next.js app never calls
  Wazuh/OpenSearch/MISP directly; everything routes through NestJS modules.
- **Where** — every feature module under
  [`apps/api/src/modules/`](../../apps/api/src/modules/), wired in
  [`app.module.ts`](../../apps/api/src/app.module.ts) (~40 feature modules).
  Bootstrap is [`main.ts`](../../apps/api/src/main.ts) via `NestFactory.create`.
  Global guards are registered as `APP_GUARD` providers in `app.module.ts` in a
  **deliberate order**: `ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard →
RolesGuard → PermissionsGuard`, plus a global `AuditInterceptor`. The strict
  layering (Controller → Service → Repository → Prisma, with Utilities off the
  Service) is the spec in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) and
  [`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md).
  - `@nestjs/config` loads + validates env via
    [`src/config/env.validation.ts`](../../apps/api/src/config/env.validation.ts)
    (`validate: validateEnvironment` in `ConfigModule.forRoot`); `NODE_ENV`
    defaults to `production` (rule #58).
  - `@nestjs/throttler` provides rate limiting — global default
    (`RATE_LIMIT_THROTTLE_TTL`/`_LIMIT`, default 60s/250) plus per-endpoint
    `@Throttle()` tiers (auth 5/min, AI 10/min, CRUD 30/min — rules #32/#33/#80).
  - `@nestjs/schedule` drives periodic tasks (stale-job recovery, rule #91).
  - `@nestjs/swagger` is **only mounted when `NODE_ENV === 'development'`**
    (`main.ts` L119) — no API surface disclosure in prod.
  - `@nestjs/websockets` + `@nestjs/platform-socket.io` back the notifications
    gateway (see Socket.IO below).
- **Validate** — `npm run build` + `npm run typecheck` + `npm run test`; boot the
  app (guard order and module graph fail loudly at startup).
- **Upgrade risk** — **medium** (Nest 11 is a major; keep `@nestjs/*` versions
  aligned, including the dev `@nestjs/cli`/`schematics`/`testing@^11`).
- **Security** — the guard chain enforces the core invariants: no auth bypass in
  any environment (rule #23), `@RequirePermission()` on every endpoint (rule #25),
  tenant isolation (rule #26), throttling on mutations (rule #74). Never reorder
  or drop a global guard.
- **Removal** — not removable; it is the framework. Individual `@nestjs/*`
  sub-packages: `swagger` could be dev-only (it is already gated at runtime) but
  is imported in `main.ts`; `throttler`/`schedule`/`websockets` each back a live
  feature — prove no `@Throttle`/`@Cron`/gateway usage before touching.

---

## Prisma + Postgres — the ORM and database

**Packages**: `@prisma/client@^7.6.0` (+ `prisma@^7.6.0` dev CLI),
`@prisma/adapter-pg@^7.6.0`, `pg@^8.20.0`.

- **Why** — Prisma is the single ORM; Postgres is the system of record (tenants,
  users, connectors, cases, jobs, AI findings/memory, audit logs).
- **Where** — Prisma is accessed **only from the repository layer** (services
  never import `PrismaService` — rule 14a). The client is configured in
  [`src/prisma/prisma.service.ts`](../../apps/api/src/prisma/prisma.service.ts),
  which extends `PrismaClient`, builds a **pooled** connection string
  (`connection_limit=20&pool_timeout=10`, rule #46) and drives it through the
  `PrismaPg` adapter (`@prisma/adapter-pg`) over the `pg` driver. It also adds
  connect-with-retry on `onModuleInit`. Schema + migrations live under
  [`apps/api/prisma/`](../../apps/api/prisma/). Deep dive:
  [`docs/architecture/DATABASE.md`](../architecture/DATABASE.md).
- **Validate** — `npm run prisma:generate`, create the migration (rule #30 — never
  leave a schema change without a `prisma/migrations/.../migration.sql`), then
  `npm run typecheck` + `npm run test`. Permission-bearing migrations use the
  `WHERE NOT EXISTS` pattern, not `ON CONFLICT` (the unique key is compound
  `(tenantId, key)` — rule #85).
- **Upgrade risk** — **medium** (Prisma 7 is a major; client, CLI, and
  `adapter-pg` move together). `pg` itself is **low**.
- **Security** — **tenant isolation lives here**: every `update`/`delete` must
  carry `where: { id, tenantId }` (rule #26); never query by `id` alone. The
  `GlobalExceptionFilter` must catch `PrismaClientKnownRequestError` /
  `ValidationError` / `InitializationError` and emit generic messages so table,
  column, and constraint names never leak (rules #82/#63). The pool is bounded on
  purpose — never use an unbounded pool (rule #46). See
  [`rules/backend/prisma-rules.md`](../../rules/backend/prisma-rules.md) and
  [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md).
- **Removal** — not removable (the data layer). `@prisma/adapter-pg` + `pg`
  are coupled to the Prisma-7 driver-adapter setup in `prisma.service.ts`;
  removing either breaks DB connectivity. `prisma` (CLI) is `devDependencies`
  but is invoked by `postinstall` and the `start*` scripts (`prisma:generate` /
  `migrate:prod` / `seed`) — keep it.

---

## Redis / ioredis — cache, token blacklist, job locks, health

**Package**: `ioredis@^5.0.0` (plus `cache-manager@^7.2.8` as the higher-level
caching abstraction).

- **Why** — Redis backs four concerns: the JWT **token-revocation blacklist**,
  distributed **job locks** for the background processor, **health** probing, and
  startup health.
- **Where** — a single shared client is created as a `@Global()` provider in
  [`src/redis/redis.module.ts`](../../apps/api/src/redis/redis.module.ts)
  (`REDIS_CLIENT` token, `retryStrategy: () => null`, bounded
  `maxRetriesPerRequest`/`connectTimeout`) and consumed by
  [`token-blacklist.service.ts`](../../apps/api/src/modules/auth/token-blacklist.service.ts)
  (keys `token:blacklist:{jti}`, rule #37),
  [`job-processor.service.ts`](../../apps/api/src/modules/jobs/job-processor.service.ts)
  (lock acquisition + `connect`/`error`/`close` state logging, rule #90),
  [`health.service.ts`](../../apps/api/src/modules/health/health.service.ts), and
  [`startup-health.service.ts`](../../apps/api/src/common/services/startup-health.service.ts).
- **Validate** — `npm run test` + boot with Redis up; exercise login → logout
  (blacklist) and a queued job (lock).
- **Upgrade risk** — **low**.
- **Security** — Redis is the only thing that makes JWT logout/refresh-rotation
  real: on logout, **both** access and refresh `jti` are blacklisted with TTL =
  remaining token life (rule #37); on refresh, the **old** refresh `jti` is
  blacklisted to stop replay (rule #51). Reuse the shared connection — never open
  a per-request Redis client (rule #47); the health check must not echo the Redis
  URL/host/port (rule #81). When Redis is down the job processor must log and skip
  rather than silently failing (rule #90).
- **Removal** — not removable without breaking token revocation, job locking, and
  health. `cache-manager` is a thinner concern — prove no importer (`grep
apps/api/src for 'cache-manager'`) before removing it; `ioredis` stays.

---

## Zod — DTO and environment validation

**Package**: `zod@^3.23.0` (the API is **intentionally on Zod 3** while the web app
is on Zod 4 — do not copy schemas across the boundary;
[`LIBRARIES.md`](LIBRARIES.md) / dependency report §3.3).

- **Why** — all input validation is Zod; the codebase uses **no `class-validator`**
  ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md), key principle #3).
- **Where** — DTO schemas in `<module>/dto/*.dto.ts`, enforced by
  [`src/common/pipes/zod-validation.pipe.ts`](../../apps/api/src/common/pipes/zod-validation.pipe.ts)
  (`ZodValidationPipe` — `schema.parse(value)`, mapping `ZodError` issues to i18n
  `messageKey`s via `zod-validation.utilities.ts` and throwing `BusinessException`,
  rules #17/#18). Env validation also uses Zod in
  [`src/config/env.validation.ts`](../../apps/api/src/config/env.validation.ts)
  (all-or-nothing OIDC group, all-zero secret rejection, prod `localhost` CORS
  rejection — rules #53/#64/#83). Connector configs use per-type Zod schemas
  (`validateConnectorConfig`, rule #39).
- **Validate** — `npm run typecheck` + `npm run test`. Apply the pipe on `@Body()`
  directly, never `@UsePipes()` with `@Param()` present (rule #16); never bind a
  DTO type to `@Query()` raw — `Schema.parse(rawQuery)` (rule #19).
- **Upgrade risk** — **medium**. A 3→4 bump must re-validate `ZodValidationPipe`,
  `error.errors` iteration, and **every** DTO (the v4 error/issue API changed).
- **Security** — Zod is the DoS and injection frontline: every string field needs
  `.max()` (rule #27), every array needs `.max()` (rule #28), and JSON/record
  fields need a `.refine()` size cap (~64KB, rule #78). See
  [`rules/backend/dto-validation-rules.md`](../../rules/backend/dto-validation-rules.md).
- **Removal** — not removable; it is the validation substrate for DTOs, env, and
  connector configs.

---

## jsonwebtoken + jwks-rsa — token signing/verification and OIDC

**Packages**: `jsonwebtoken@^9.0.0`, `jwks-rsa@^4.0.1` (types via
`@types/jsonwebtoken`).

- **Why** — `jsonwebtoken` signs and verifies the platform's own access/refresh
  tokens. `jwks-rsa` exists to fetch IdP signing keys for **OIDC (Microsoft Entra
  ID)** RS256 verification.
- **Where** — `jsonwebtoken` is used in
  [`src/modules/auth/auth.service.ts`](../../apps/api/src/modules/auth/auth.service.ts):
  `jwt.sign(..., { algorithm: 'HS256', expiresIn })` for both token types and
  `jwt.verify(token, secret, { algorithms: ['HS256'], ... })`. Tokens carry `jti`
  (UUID) and `tokenType` (`access` / `refresh`) claims. OIDC config
  (`OIDC_ISSUER_URL`, `OIDC_AUDIENCE`, `OIDC_JWKS_URI`, `OIDC_CLIENT_ID`) is
  group-validated in
  [`env.validation.ts`](../../apps/api/src/config/env.validation.ts) (rule #64).
  > **Accuracy note**: at the time of writing, `jwks-rsa` is a **declared
  > dependency for the OIDC JWKS verification path** but is **not yet imported**
  > under `apps/api/src` — verification currently runs HS256 via `jsonwebtoken`.
  > Treat `jwks-rsa` as reserved for the Entra ID JWKS flow described in
  > [`docs/architecture/AUTH.md`](../architecture/AUTH.md); confirm with a
  > `grep apps/api/src for 'jwks-rsa'` before assuming it is wired.
- **Validate** — `npm run test` (auth flow); boot and exercise login → refresh →
  logout.
- **Upgrade risk** — **low** for both.
- **Security** — algorithm is **always pinned** (`HS256` for sign, `['HS256']`
  for verify) to prevent algorithm confusion (rule #29); every token has `jti` +
  `tokenType` and `tokenType` is checked on every validation (rule #38); secrets
  come from env with **no fallback/all-zero values** (rules #24/#53). Never bypass
  verification by environment (rule #23/#56). See
  [`docs/architecture/AUTH.md`](../architecture/AUTH.md) and
  [`docs/SECURITY.md`](../SECURITY.md).
- **Removal** — `jsonwebtoken` is not removable (it is the token engine).
  `jwks-rsa` is a forward-looking OIDC dependency: do **not** drop it before the
  Entra ID JWKS verification path is confirmed dead — verify against
  [`docs/architecture/AUTH.md`](../architecture/AUTH.md) and the OIDC env group,
  per the prove-before-removing rule.

---

## Pino — structured logging with credential redaction

**Packages**: `nestjs-pino@^4.0.0`, `pino@^10.3.1`, `pino-http@^11.0.0`,
`pino-pretty@^13.0.0`.

- **Why** — structured JSON logs (one log line per request) suitable for ELK /
  CloudWatch, with **mandatory redaction** of credentials.
- **Where** — `LoggerModule.forRoot({ pinoHttp: {...} })` in
  [`app.module.ts`](../../apps/api/src/app.module.ts): `pino-pretty` transport in
  non-production only, `LOG_LEVEL`-driven level, and a `redact` array covering
  `req.headers.authorization`, `req.headers.cookie`, and the password fields
  (`password`, `currentPassword`, `newPassword`, `confirmPassword`). `main.ts`
  swaps in the Pino `Logger` via `app.useLogger(app.get(Logger))`.
- **Validate** — `npm run test` + boot; confirm a request log line and that the
  redacted fields show `[Redacted]`.
- **Upgrade risk** — **low** — but **keep the pino family aligned** (`pino`,
  `pino-http`, `pino-pretty`, `nestjs-pino` move together).
- **Security** — passwords must be redacted from structured request logs (rule
  #57); the audit interceptor's credential patterns are a separate, broader list
  (`password`, `apiKey`, `token`, `secret`, `accessToken`, `refreshToken`,
  `encryptedConfig`, `authorization`, … — rule #66). Adding a new sensitive body
  field means extending the `redact` array. `pino-pretty` is intentionally
  dev-only (raw JSON in prod for log shippers).
- **Removal** — not removable; it is the logging backbone (`app.useLogger`
  depends on it). `pino-pretty` is the only candidate to demote (dev convenience).

---

## Helmet — HTTP security headers

**Package**: `helmet@^8.0.0` (paired with `cookie-parser@^1.4.7` for the HttpOnly
auth-cookie path).

- **Why** — sets the baseline HTTP hardening headers (CSP, HSTS, frameguard,
  referrer policy) on every response.
- **Where** — `app.use(helmet({...}))` in
  [`main.ts`](../../apps/api/src/main.ts): an explicit CSP (`default-src 'self'`,
  `script-src 'self'`, `style-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`), HSTS (1 year, `includeSubDomains`, `preload`),
  `frameguard: deny`, and `strict-origin-when-cross-origin` referrer policy.
  This sits alongside hand-rolled middleware in the same file: an `X-Request-ID`
  generator, an auth-aware `Cache-Control: no-store` for authenticated responses,
  the `1mb` body cap, and URL-validated CORS.
- **Validate** — boot + a security review of the response headers; `npm run build`.
- **Upgrade risk** — **low**.
- **Security** — the CSP **must not include `'unsafe-inline'`** in `style-src` —
  for a backend API no inline styles are needed (rule #62). This is the
  client-facing half of the HTTP hardening summarized in
  [`apps/api/CLAUDE.md` → HTTP Hardening](../../apps/api/CLAUDE.md) and
  [`docs/security/`](../security/). Do not loosen these directives.
- **Removal** — not removable (it is the header policy). `cookie-parser` is
  required for the HttpOnly access/refresh cookie path read in `main.ts`'s
  Cache-Control middleware and by auth — prove no cookie usage before touching.

---

## Socket.IO — realtime notifications gateway

**Packages**: `socket.io@^4.8.3` (server), surfaced through
`@nestjs/websockets@^11.1.16` + `@nestjs/platform-socket.io@^11.1.16`. The web app
pairs with `socket.io-client@^4.8.3`. Raw `ws@^8.21.0` is also declared (see
Removal).

- **Why** — pushes realtime notifications (and permission-update events) to the
  SOC UI.
- **Where** — [`src/modules/notifications/notifications.gateway.ts`](../../apps/api/src/modules/notifications/notifications.gateway.ts)
  (`@WebSocketGateway`, `namespace: 'notifications'`), with a shared WS module in
  [`src/common/modules/websocket/`](../../apps/api/src/common/modules/websocket/).
  The gateway authenticates each connection via the JWT in the Socket.IO handshake
  `auth` field, delegating to `AuthService`. Deep dive:
  [`docs/architecture/WEBSOCKETS.md`](../architecture/WEBSOCKETS.md).
- **Validate** — `npm run test:e2e`; verify a connection is rejected without a
  valid token and from a disallowed origin.
- **Upgrade risk** — **low** — but the `socket.io` **major must stay aligned with
  the web `socket.io-client`** (both v4).
- **Security** — WebSocket CORS **must match HTTP CORS**: the gateway validates
  origins from the same `CORS_ORIGINS` env (parsed and `new URL()`-checked in the
  `@WebSocketGateway` `cors.origin`), never `cors: true` and never a separate
  unvalidated list (rule #84). Connections must be authenticated via the handshake
  token, mirroring the HTTP auth guard.
- **Removal** — Socket.IO is not removable (the notifications channel). `ws` is a
  **migration-added** dependency that `socket.io` already pulls transitively —
  before keeping it, verify a **direct** `import ... from 'ws'` exists in
  `apps/api/src`; otherwise remove it ([`LIBRARIES.md`](LIBRARIES.md) /
  dependency report §4).

---

## AWS Bedrock SDK — AI connector (Claude models)

**Package**: `@aws-sdk/client-bedrock-runtime@^3.1014.0`.

- **Why** — Bedrock is the first provider in the AI connector cascade
  (`bedrock → llm_apis → openclaw_gateway`) for hunt/investigate/explain/agent
  tasks.
- **Where** — the Bedrock adapter
  [`src/modules/connectors/services/bedrock.service.ts`](../../apps/api/src/modules/connectors/services/bedrock.service.ts)
  owns it. The SDK is **lazily imported** via `loadAwsBedrockSdk()` (so a missing
  SDK surfaces as a caught error, not a boot crash), constructs a cached
  `BedrockRuntimeClient` per region/credential/endpoint with a 30s request
  timeout, and calls `InvokeModelCommand`. Per-type config is Zod-validated
  (`bedrock` connector schema, rule #39) and credentials are AES-256-GCM encrypted
  at rest. Deep dives: [`docs/architecture/AI.md`](../architecture/AI.md),
  [`docs/architecture/CONNECTORS.md`](../architecture/CONNECTORS.md).
- **Validate** — `npm run test`; exercise the connector "test" endpoint with real
  AWS credentials.
- **Upgrade risk** — **low** (AWS SDK v3 is stable; minor/patch within `^3`).
- **Security** — **never use a mock/`BEDROCK_MOCK` mode in production** — the
  adapter must call the real SDK; if it is missing or credentials are invalid, the
  error is caught and the next connector in the cascade is tried (rules #88/#89).
  The cascade must try **all** configured connectors before any rule-based
  fallback (rule #88). Bedrock connector mutation requires `TENANT_ADMIN`
  (rule #55); connector URLs/endpoints are SSRF-validated (rule #59).
- **Removal** — removing it disables the Bedrock path of the AI cascade; the
  cascade would still function via `llm_apis`/`openclaw_gateway`, but the
  `bedrock` connector type and its tests/adapter reference the SDK — prove no
  `@aws-sdk/client-bedrock-runtime` importer (`loadAwsBedrockSdk` /
  `bedrock.service.ts` / `bedrock.mapper.ts` /
  `strategies/bedrock-workspace.strategy.ts`) before removing.

---

## Before you touch any backend dependency

1. **Read the rule** — [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md):
   patch/minor security first; framework majors only via an ADR; remove only
   after proving unused (imports, routes, Docker, CI, Prisma, seed, tests).
2. **Check the status** — [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)
   and [`docs/audit/dependency-matrix.md`](../audit/dependency-matrix.md). Known
   API item: `multer` (transitive via `@nestjs/platform-express`) carries a HIGH
   advisory tracked there.
3. **Validate after** — run the gates ([`AGENTS.md` §5](../../AGENTS.md)) and
   **never claim "all green" unless the required gates actually passed**.
