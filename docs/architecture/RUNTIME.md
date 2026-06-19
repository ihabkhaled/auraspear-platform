# Runtime — AuraSpear Platform

> **Entry point for all contributors and AI agents is [`AGENTS.md`](../../AGENTS.md)** (loading
> order, monorepo map, security invariants). Read it first. The per-app guides
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) and [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)
> are the authoritative rule sets for backend and frontend code.

This document describes **how AuraSpear runs as live processes**: the Node runtime, the two
deployable apps (web + api), their bootstrap sequences, the data services they depend on
(PostgreSQL, Redis), startup/shutdown behavior, and in-process background work.

For the **static system architecture** (BFF pattern, module map, auth/RBAC/tenancy, connectors,
AI cascade, request flow) see [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — this file deliberately
does not repeat it and links to it instead. For deployment topology and operations see
[`../DEPLOYMENT.md`](../DEPLOYMENT.md) and [`../OPERATIONS.md`](../OPERATIONS.md); for env vars see
[`../ENVIRONMENT.md`](../ENVIRONMENT.md).

> Every claim below is grounded in real repo files (paths cited). Where this file and a `CLAUDE.md`
> guide diverge, the **code wins**.

---

## 1. Node runtime

- **Node 22** is the target runtime for both apps. The root `package.json` pins
  `engines.node: ">=22 <25"` and `packageManager: pnpm@10.30.3`
  ([`package.json`](../../package.json)). Both Docker images build on `node:22-alpine`
  ([`apps/api/Dockerfile`](../../apps/api/Dockerfile),
  [`apps/web/Dockerfile`](../../apps/web/Dockerfile)). The Node 22 LTS choice is recorded in
  [`../decisions/ADR-0002-node-22-lts.md`](../decisions/ADR-0002-node-22-lts.md).
- TypeScript everywhere; the **api** compiles to CommonJS (`nest build` → `dist/`), the **web**
  app is built by `next build`. Module/target details live in each app's `tsconfig.json` (see
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) and [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)).
- Native modules at runtime: `openssl` is installed in the api image for Prisma/`pg`
  ([`apps/api/Dockerfile`](../../apps/api/Dockerfile) line 7).

> **Workspace is mid-upgrade.** Do not run `pnpm` to "verify" — the toolchain is being moved (see
> `@typescript/native-preview` / `tsgo` in [`package.json`](../../package.json) and
> [`../tools/TYPESCRIPT_AND_TSGO.md`](../tools/TYPESCRIPT_AND_TSGO.md)).

---

## 2. The two runtime processes

AuraSpear runs as **two long-lived Node processes** plus two backing data services. There is no
separate worker process — background jobs run **in-process inside the api** (see §6).

| Process  | Package          | Stack                        | Listens on                   | Entry (prod)                                   |
| -------- | ---------------- | ---------------------------- | ---------------------------- | ---------------------------------------------- |
| **web**  | `@auraspear/web` | Next.js 16 standalone server | `:3000` (`HOSTNAME=0.0.0.0`) | `node apps/web/server.js`                      |
| **api**  | `@auraspear/api` | NestJS 11 on Express 5       | `:4000` (`/api/v1`)          | `./docker-entrypoint.sh` → `node dist/main.js` |
| postgres | —                | PostgreSQL 16                | `:5432` (internal)           | `postgres:16-alpine`                           |
| redis    | —                | Redis 7                      | `:6379` (internal)           | `redis:7-alpine`                               |

Sources: [`infra/docker/docker-compose.yml`](../../infra/docker/docker-compose.yml),
[`apps/web/Dockerfile`](../../apps/web/Dockerfile),
[`apps/api/Dockerfile`](../../apps/api/Dockerfile),
[`apps/api/docker-entrypoint.sh`](../../apps/api/docker-entrypoint.sh).

The **BFF boundary**: the browser never talks to the api directly. It calls Next.js route handlers
under `apps/web/src/app/api/**`, which proxy to the api over the network
(`BACKEND_API_URL`, default `http://api:4000/api/v1` in Docker). Full request flow is in
[`../ARCHITECTURE.md`](../ARCHITECTURE.md) §15.

---

## 3. Web runtime (Next.js standalone)

[`apps/web/next.config.ts`](../../apps/web/next.config.ts) sets **`output: 'standalone'`**, so
`next build` emits a self-contained server (`server.js`) plus a traced minimal `node_modules`. The
production image copies only:

- `/.next/standalone` → app root (the server),
- `/.next/static` → `apps/web/.next/static`,
- `/public` → `apps/web/public`,

then runs `node apps/web/server.js` as a non-root `nextjs` user with `PORT=3000 HOSTNAME=0.0.0.0`
([`apps/web/Dockerfile`](../../apps/web/Dockerfile) lines 34-47). Because it is a workspace build,
the standalone `server.js` lands under `apps/web/` (not the repo root) — the `CMD` path reflects
that.

Runtime configuration split (see [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) "Next.js Specific
Patterns"):

- **`NEXT_PUBLIC_*`** vars (e.g. `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_ENV`) are **baked into the
  client bundle at build time** as Docker `ARG`s — they are not runtime-configurable
  ([`apps/web/Dockerfile`](../../apps/web/Dockerfile) lines 23-31).
- **Server-only** vars (e.g. `BACKEND_API_URL`) are read at runtime by the standalone server and
  the proxy route handlers.

`next.config.ts` also emits **security headers + CSP** for every response and registers the PWA
service worker via `withSerwist` (`@serwist/turbopack`). `productionBrowserSourceMaps: false`.
Note: the web CSP intentionally allows `'unsafe-inline'` for `script-src`/`style-src` (Next
hydration + `next-themes` + Radix inline styles) — see the comment block in `next.config.ts`. This
is the **frontend** CSP and is looser than the api's Helmet CSP (§5).

The `start` script is `cross-env NODE_ENV=production next start`
([`apps/web/package.json`](../../apps/web/package.json)); the Docker image uses the standalone
`server.js` directly instead.

---

## 4. API bootstrap (`apps/api/src/main.ts`)

The api boots through [`apps/api/src/main.ts`](../../apps/api/src/main.ts). It supports **two run
modes** from one entry file:

### 4.1 App creation (cached)

`createApp()` builds the Nest app **once** and caches it in module scope (`cachedApp`) so the
serverless handler reuses a warm instance. Order of setup (all in `main.ts`):

1. `NestFactory.create(AppModule, { bufferLogs: true })`, then `app.useLogger(app.get(Logger))` —
   structured logging via **nestjs-pino**.
2. `expressApp.set('trust proxy', 1)` — correct client IP behind Vercel / load balancers (for rate
   limiting + logs).
3. **Body limits**: `express.json({ limit: '1mb' })` + `express.urlencoded({ extended: true, limit: '1mb' })`.
4. **X-Request-ID** middleware — reuse incoming `x-request-id` or generate a `randomUUID()`, echo
   on the response.
5. **Helmet** with an explicit strict CSP (`default-src 'self'`, `script-src 'self'`,
   `style-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`), **HSTS** (1 year,
   includeSubDomains, preload), `frameguard: deny`, `referrer-policy: strict-origin-when-cross-origin`.
6. **Cache-Control** middleware — forces `no-store` on any request carrying an `Authorization`
   header or `access_token`/`refresh_token` cookies; otherwise sets `Vary: Authorization, Cookie`.
7. `cookieParser()` — required for the HttpOnly auth cookies.
8. **CORS** — `CORS_ORIGINS` (default `http://localhost:3000`) is split, each entry validated as a
   real `http:`/`https:` URL via `new URL()`; in production an empty list **throws**.
   `credentials: true`.
9. `app.setGlobalPrefix('api/v1', { exclude: ['/'] })` — all routes are under **`/api/v1`** except
   the root `/`.
10. `app.useGlobalFilters(new GlobalExceptionFilter())`.
11. **Swagger** mounted at `api/docs` **only when `NODE_ENV === 'development'`**.
12. `await app.init()`.

### 4.2 Run modes

- **Serverless (Vercel)**: `export default async function handler(req, res)` calls `createApp()`
  and hands the request to the underlying Express instance. No `app.listen()`.
- **Local / container (long-lived)**: when `NODE_ENV !== 'production'` **or** `process.env.VERCEL`
  is unset, an IIFE calls `createApp()`, sets `server.setTimeout(120_000)` (120s request timeout),
  and `app.listen(PORT)`. **`PORT` defaults to `4000`** (`main.ts` line 157).

> Note: `main.ts` excludes `src/main.ts` from coverage and is not unit-tested
> ([`apps/api/package.json`](../../apps/api/package.json) jest `collectCoverageFrom`). The docker
> image runs the **long-lived** mode via `node dist/main.js`.

### 4.3 Root module wiring (`app.module.ts`)

[`apps/api/src/app.module.ts`](../../apps/api/src/app.module.ts) assembles the runtime:

- **`ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment })`** — env is validated
  at boot by `validateEnvironment` (§7); invalid env **fails the process before it serves traffic**.
- **`ThrottlerModule.forRootAsync`** — global rate limit from `RATE_LIMIT_THROTTLE_TTL`
  (default 60_000 ms) and `RATE_LIMIT_THROTTLE_LIMIT` (default 250). Per-endpoint `@Throttle()`
  tiers tighten this (see [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 80).
- **`LoggerModule.forRoot`** (pino) — `pino-pretty` transport in non-production, raw JSON in
  production; `level` from `LOG_LEVEL` (default `info`); **redacts** `req.headers.authorization`,
  `req.headers.cookie`, and the password body fields.
- **`PrismaModule`** (§5.1) and **`RedisModule`** (global, §5.2) provide the data layer.
- 40+ feature modules (catalogued in [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §6).
- **Global guard chain** (registered as `APP_GUARD`, executed in order):
  `ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard`, plus a
  global `AuditInterceptor`. Guard semantics are documented in
  [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §3-§5.
- **`StartupHealthService`** (§5.3) runs deferred startup probes.

---

## 5. Backing services & lifecycle

### 5.1 PostgreSQL (via Prisma 7 + pg adapter)

- The api is the **sole owner** of the database; the web app never touches Postgres.
- [`apps/api/src/prisma/prisma.service.ts`](../../apps/api/src/prisma/prisma.service.ts) extends
  `PrismaClient` and connects through the **`@prisma/adapter-pg`** driver adapter (`PrismaPg`).
  Before connecting it appends pool params to `DATABASE_URL`:
  **`connection_limit=20&pool_timeout=10`** (`DEFAULT_CONNECTION_LIMIT=20`,
  `DEFAULT_POOL_TIMEOUT_SECONDS=10` in
  [`prisma.constants.ts`](../../apps/api/src/prisma/prisma.constants.ts)). Never use an unbounded
  pool ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 46).
- **Connect-with-retry on boot**: `onModuleInit()` calls `$connect()` with up to **5 retries**
  (`MAX_RETRIES=5`) and a linear backoff (`BASE_DELAY_MS=2000 * attempt`). After 5 failures it
  rethrows — i.e. the process **fails fast** if the DB never comes up.
- **Graceful shutdown**: `onModuleDestroy()` calls `$disconnect()`.

### 5.2 Redis (ioredis, global singleton)

- [`apps/api/src/redis/redis.module.ts`](../../apps/api/src/redis/redis.module.ts) is a `@Global()`
  module providing a **single shared `ioredis` client** (`REDIS_CLIENT` token) built from
  `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD`. Reuse this client — never open per-request
  connections ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 47).
- Client tuning ([`redis.constants.ts`](../../apps/api/src/redis/redis.constants.ts)):
  `connectTimeout=5000`, `maxRetriesPerRequest=1`, and **`retryStrategy: () => null`** — it does
  **not** auto-reconnect aggressively; connection state is tracked by consumers (e.g. the job
  processor, §6). `error` events are logged at `warn` (Redis being down does not crash the api).
- **Graceful shutdown**: `onModuleDestroy()` calls `redis.quit()`.
- Redis is used for the **token blacklist / JTI revocation**, **distributed job locks**, and
  health checks (see [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §3, §12).

### 5.3 Health & startup probes

- **Public health endpoint**: `GET /api/v1/health`
  ([`apps/api/src/modules/health/health.controller.ts`](../../apps/api/src/modules/health/health.controller.ts))
  is `@Public()` and reports overall DB + Redis status. It returns **service names only** (no
  versions, no internal URLs/hosts/ports) per
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rules 60/81. Both Docker healthchecks hit this
  path (`wget --spider http://localhost:4000/api/v1/health`).
- **Tenant-scoped connector health**: `GET /api/v1/health/services` (auth + `SYSTEM_HEALTH_VIEW`).
- **Startup probe**:
  [`StartupHealthService`](../../apps/api/src/common/services/startup-health.service.ts) runs
  ~2 s after `onModuleInit` (deferred via `setTimeout`), pings Postgres (`SELECT 1`) and Redis
  (`PING`) in parallel, and logs a structured summary (`up`/`down` + latency). It is observational
  logging — it does not block or kill the process.

---

## 6. In-process background work (jobs)

There is **no separate worker process**. Background jobs run inside the api process, driven by
`@nestjs/schedule` intervals.

- [`JobProcessorService`](../../apps/api/src/modules/jobs/job-processor.service.ts) polls the `Job`
  table on a fixed interval (`POLL_INTERVAL_MS`), acquires a **Redis lock** per job
  (`JOB_LOCK_PREFIX`, `JOB_LOCK_TTL_SECONDS`) so multiple api replicas don't double-run a job, and
  dispatches to a registered `JobHandler` by `JobType`. Concurrency is bounded by
  `JOB_PROCESSOR_CONCURRENCY` (default **5**).
- It **tracks Redis connection state** (`redisConnected` via `connect`/`error`/`close` events) and
  skips polling with a logged warning when Redis is down — required by
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 90 (silent lock failures would leave jobs
  stuck PENDING).
- **Stale-job recovery**: jobs stuck `RUNNING` longer than `STALE_RUNNING_WINDOW_MS` (30 min) are
  auto-reset to `PENDING` on a recovery interval (rule 91).
- Every `JobType` MUST have a registered handler (rules 31/32); the full job/handler table is in
  [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) "Job Types & Handlers".

**Runtime implication**: because the worker is in-process and uses Redis locks for mutual
exclusion, the api can be scaled to multiple replicas safely, but **Redis is a hard dependency for
jobs to make progress**. See [`../OPERATIONS.md`](../OPERATIONS.md) for operational guidance.

Real-time delivery uses a **Socket.IO** gateway on the `notifications` namespace (same process,
same `CORS_ORIGINS` allow-list) — details in [`../ARCHITECTURE.md`](../ARCHITECTURE.md) §11.

---

## 7. Runtime configuration & boot-time validation

The api validates its environment at startup via
[`apps/api/src/config/env.validation.ts`](../../apps/api/src/config/env.validation.ts) (Zod schema,
wired through `ConfigModule.validate`). A failure throws a formatted error and **stops the process
before it serves traffic**. Key runtime-shaping vars:

| Var                              | Default / rule                                                       | Effect                                          |
| -------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `NODE_ENV`                       | **`production`** (default)                                           | Gates Swagger, pretty logs, CORS strictness     |
| `PORT`                           | `4000`                                                               | api listen port                                 |
| `DATABASE_URL`                   | required, must be a URL                                              | Postgres connection (pool params auto-appended) |
| `REDIS_HOST` / `REDIS_PORT`      | `localhost` / `6379`                                                 | Redis connection                                |
| `REDIS_PASSWORD`                 | `''`; **≥16 chars required in production**                           | Redis auth                                      |
| `JWT_SECRET`                     | ≥64 hex chars, non-zero                                              | HS256 token signing/verification                |
| `JWT_ACCESS_EXPIRY`              | `15m`                                                                | Access token TTL                                |
| `JWT_REFRESH_EXPIRY`             | `7d`                                                                 | Refresh token TTL                               |
| `CONFIG_ENCRYPTION_KEY`          | exactly 64 hex chars, non-zero                                       | AES-256-GCM connector-secret encryption         |
| `CORS_ORIGINS`                   | `http://localhost:3000`; **no localhost in prod**, non-empty in prod | Allowed origins (HTTP + WS)                     |
| `RATE_LIMIT_THROTTLE_*`          | `60000` ms / `250`                                                   | Global throttle window/limit                    |
| `LOG_LEVEL`                      | `info`                                                               | pino log level                                  |
| `OIDC_*`                         | optional, **all-or-nothing** (`.superRefine`)                        | Optional OIDC auth path                         |
| `AWS_*` / `AWS_BEDROCK_MODEL_ID` | optional; region default `us-east-1`                                 | Bedrock AI provider defaults                    |

The defaults that matter for **secure-by-default** behavior: `NODE_ENV` defaults to `production`
(so a misconfigured deploy gets production hardening, not dev permissiveness — rule 58), and CORS
rejects `localhost` in production. Full var reference: [`../ENVIRONMENT.md`](../ENVIRONMENT.md).

The **web** app's runtime config is split between build-time `NEXT_PUBLIC_*` (baked into the
bundle) and server-only vars read by the standalone server (§3).

---

## 8. Container runtime & startup ordering

Compose stacks live in `infra/docker/` (base + dev/prod/infra/connectors overlays). The base stack
[`infra/docker/docker-compose.yml`](../../infra/docker/docker-compose.yml) defines `postgres`,
`redis`, `api`, `web` on a private `auraspear` network.

- **Startup ordering**: `api` `depends_on` postgres+redis **`service_healthy`**; `web` `depends_on`
  api **`service_healthy`**. So the boot order is **postgres/redis → api → web**.
- **api boot inside the container**:
  [`apps/api/docker-entrypoint.sh`](../../apps/api/docker-entrypoint.sh) runs
  `prisma migrate deploy` → `prisma db seed` (seed is best-effort: `|| echo "...skipped"`) →
  `exec node dist/main.js`. Seeds are **idempotent** (`upsert` / `skipDuplicates`,
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 15) so this is safe to re-run on every boot.

  > The npm `start*` scripts ([`apps/api/package.json`](../../apps/api/package.json)) run the same
  > `prisma:generate → prisma:migrate:prod → prisma:seed` chain for local/non-container runs.

- **Secure-by-default networking**: Postgres (5432) and Redis (6379) are **not** published to the
  host in base/prod — only `web` (3000) and `api` (4000) are reachable. The **dev** overlay opens
  the internal ports for debugging; the **prod** overlay
  ([`infra/docker/docker-compose.prod.yml`](../../infra/docker/docker-compose.prod.yml)) adds
  `restart: always`, `NODE_ENV=production`, and a **required Redis password**.
- **Non-root**: both images run as a dedicated unprivileged user (`nestjs` / `nextjs`, uid 1001).
- **Container healthchecks**: api/web both poll `GET /api/v1/health`; postgres uses `pg_isready`;
  redis uses `redis-cli ping` (password-aware in prod).

Deployment topology, scaling, and the Vercel serverless path are covered in
[`../DEPLOYMENT.md`](../DEPLOYMENT.md); day-2 operations in [`../OPERATIONS.md`](../OPERATIONS.md).

---

## 9. Process lifecycle summary

```
                 ┌──────────────────────────── api process ─────────────────────────────┐
boot:  validate env (env.validation.ts) ─► Nest bootstrap (main.ts §4) ─► ConfigModule
        │ (fail-fast on invalid env)        │ helmet/CORS/prefix/filters    │
        ▼                                    ▼                               ▼
   PrismaModule.onModuleInit            RedisModule (global singleton)   feature modules
   $connect() ×5 retries, backoff       ioredis, no auto-reconnect       + guard chain
        │                                    │                               │
        ▼                                    ▼                               ▼
   app.listen(PORT=4000)  ──►  StartupHealthService (~2s later: PG SELECT 1 + Redis PING, logged)
        │                                    │
        ▼                                    ▼
   serve /api/v1/**            JobProcessorService polls Job table, Redis-locked, in-process
        │
   shutdown: PrismaService.$disconnect() + RedisModule.quit()
                 └────────────────────────────────────────────────────────────────────────┘

 web process: node apps/web/server.js (Next standalone, :3000) ─► proxies /api/* ─► api /api/v1/*
```

---

## See also

- [`../ARCHITECTURE.md`](../ARCHITECTURE.md) — full system architecture (BFF, modules, auth/RBAC/
  tenancy, connectors, AI cascade, request flow). **This file is the runtime companion to it.**
- [`../DEPLOYMENT.md`](../DEPLOYMENT.md) · [`../OPERATIONS.md`](../OPERATIONS.md) ·
  [`../TROUBLESHOOTING.md`](../TROUBLESHOOTING.md)
- [`../ENVIRONMENT.md`](../ENVIRONMENT.md) — environment variable reference
- [`../decisions/ADR-0002-node-22-lts.md`](../decisions/ADR-0002-node-22-lts.md) ·
  [`../decisions/ADR-0001-monorepo-pnpm-turborepo.md`](../decisions/ADR-0001-monorepo-pnpm-turborepo.md)
- App rule sets: [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) ·
  [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)
- Backend rules: [`../../rules/backend/`](../../rules/backend/) · DevSecOps skills:
  [`../../skills/devsecops/`](../../skills/devsecops/) (e.g. `add-env-variable.md`)
- Index: [`../DOCS_INDEX.md`](../DOCS_INDEX.md) (start at [`AGENTS.md`](../../AGENTS.md))

```

```
