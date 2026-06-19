# Deployment

How to deploy the AuraSpear platform — the Next.js web app (`@auraspear/web`) and the
NestJS BFF API (`@auraspear/api`), backed by PostgreSQL and Redis.

All Docker work is driven from the repo root through the `pnpm docker:*` scripts, which
layer environment-specific overlays on top of a shared base compose file under
`infra/docker/`. Commands are defined in the root [`package.json`](../package.json).

---

## Runtime requirements

- **Node.js 22** — the root [`package.json`](../package.json) pins `"engines": { "node": ">=22 <25" }`.
  Both Docker images build from `node:22-alpine` ([`apps/api/Dockerfile`](../apps/api/Dockerfile),
  [`apps/web/Dockerfile`](../apps/web/Dockerfile)).
- **pnpm 10** — `"packageManager": "pnpm@10.30.3"`, `"engines": { "pnpm": ">=10" }`. Enabled in
  the images via `corepack enable`.
- **PostgreSQL 16** — `postgres:16-alpine` (see compose files).
- **Redis 7** — `redis:7-alpine`.
- **Docker + Docker Compose** for the container topologies.

---

## Topologies

There are three compose files plus two overlays in `infra/docker/`:

| File                                                                             | Purpose                                                                                                                      |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [`docker-compose.yml`](../infra/docker/docker-compose.yml)                       | Base full stack: `web` + `api` + `postgres` + `redis`. Secure-by-default — Postgres/Redis are **not** published to the host. |
| [`docker-compose.dev.yml`](../infra/docker/docker-compose.dev.yml)               | Dev overlay — opens Postgres/Redis host ports and adds pgAdmin.                                                              |
| [`docker-compose.prod.yml`](../infra/docker/docker-compose.prod.yml)             | Prod overlay — Redis password required, `restart: always`, internal-only DB/Redis.                                           |
| [`docker-compose.infra.yml`](../infra/docker/docker-compose.infra.yml)           | Infra-only stack (Postgres + Redis + pgAdmin) for running the apps on the host.                                              |
| [`docker-compose.connectors.yml`](../infra/docker/docker-compose.connectors.yml) | Optional connector services (separate stack).                                                                                |

The base + overlay files all share the compose project `name: auraspear` so the overlays
merge onto the base. The build context is the repo root, so run from the repo root.

### 1. Full stack — development

Brings up web, api, postgres, redis, and pgAdmin, with Postgres/Redis exposed on the host
for debugging:

```bash
pnpm docker:dev
# = docker compose -f infra/docker/docker-compose.yml \
#                  -f infra/docker/docker-compose.dev.yml up -d --build
```

The dev overlay sets the API to `NODE_ENV: development`, `LOG_LEVEL: debug`, publishes
Postgres (`5432`), Redis (`6379`), and pgAdmin (`5050`) to the host.

Related scripts (all target the dev overlay):

```bash
pnpm docker:down       # stop the dev stack
pnpm docker:logs       # follow logs
pnpm docker:rebuild    # up -d --build --force-recreate
pnpm docker:clean      # down -v --remove-orphans (drops volumes)
```

### 2. Full stack — production

```bash
pnpm docker:prod
# = docker compose -f infra/docker/docker-compose.yml \
#                  -f infra/docker/docker-compose.prod.yml up -d --build
```

The prod overlay enforces `NODE_ENV: production`, `LOG_LEVEL: info`, `restart: always`,
and requires a Redis password (`--requirepass ${REDIS_PASSWORD}`). Postgres and Redis stay
on the internal Docker network only (no host port bindings — inherited from the base file).
Only `web` (`3000`) and `api` (`4000`) are reachable from the host.

### 3. Infra-only (apps on the host)

Run just Postgres, Redis, and pgAdmin in Docker and run the apps directly on the host:

```bash
pnpm docker:infra        # up Postgres + Redis + pgAdmin
pnpm dev                 # run web + api on the host (turbo)
# or individually:
pnpm dev:api             # @auraspear/api start:dev
pnpm dev:web             # @auraspear/web dev
pnpm docker:infra:down   # tear down the infra stack
```

This stack (project `auraspear-infra`) publishes Postgres/Redis/pgAdmin to the host with
relaxed defaults — intended for local development only.

### Ports

| Service  | Container port | Host (configurable)                            |
| -------- | -------------- | ---------------------------------------------- |
| web      | 3000           | `WEB_PORT` (default 3000)                      |
| api      | 4000           | `API_PORT` (default 4000)                      |
| postgres | 5432           | `POSTGRES_PORT` — dev/infra only               |
| redis    | 6379           | `REDIS_PORT` — dev/infra only                  |
| pgAdmin  | 80             | `PGADMIN_PORT` (default 5050) — dev/infra only |

The web app reaches the API server-side via `BACKEND_API_URL` (default
`http://api:4000/api/v1` over the Docker network). Browser bundles use the build-time
`NEXT_PUBLIC_API_URL` (default `/api`).

---

## Required environment

Compose reads the repo-root `.env`. The base file declares it via
`env_file: { path: ../../.env, required: false }` so `compose config` and first-time setup
work before `.env` exists — but real runs require it.

The full list of variables, their meaning, and how to generate strong secrets is documented
in **[docs/ENVIRONMENT.md](./ENVIRONMENT.md)**. Notable variables surfaced by the compose
files:

- **Postgres**: `POSTGRES_DB` (default `auraspear_soc`), `POSTGRES_USER` (default
  `auraspear`), `POSTGRES_PASSWORD` (**required** — base file fails fast without it).
- **`DATABASE_URL`** — composed automatically inside the `api` service from the Postgres
  vars, pointing at the `postgres` service:
  `postgresql://<user>:<password>@postgres:5432/<db>?schema=public`.
- **Redis**: `REDIS_HOST` (`redis`), `REDIS_PORT` (`6379`), and `REDIS_PASSWORD`
  (**required in production** by the prod overlay).
- **Runtime secrets** from `.env`: `JWT_SECRET`, `CONFIG_ENCRYPTION_KEY`,
  `SEED_DEFAULT_PASSWORD`, OIDC, and AWS/connector settings (see ENVIRONMENT.md).
- **Web build args** (baked into the client bundle at build time): `NEXT_PUBLIC_API_URL`,
  `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_APP_ENV`, `NEXT_PUBLIC_ENABLE_MSW`.
- **pgAdmin** (dev/infra): `PGADMIN_EMAIL`, `PGADMIN_PASSWORD`.

There are helper scripts to scaffold and audit env:

```bash
pnpm setup:env    # scripts/install/setup-env.mjs
pnpm audit:env    # scripts/ci/env-audit.mjs
pnpm doctor       # scripts/install/doctor.mjs (environment preflight)
```

---

## Database: migrations and seeding

### In Docker (automatic)

The API image runs migrations and seeding at container boot. The entrypoint
[`apps/api/docker-entrypoint.sh`](../apps/api/docker-entrypoint.sh) does:

```sh
npx prisma migrate deploy        # apply pending migrations
npx prisma db seed || echo ...   # idempotent seed (non-fatal if already applied)
exec node dist/main.js           # start the API
```

Because seeders are idempotent (upsert / `skipDuplicates`), re-running on an already-seeded
database is safe. The `api` service `depends_on` Postgres and Redis with
`condition: service_healthy`, so migrations only run once the database is accepting
connections.

> The built workspace `node_modules` is carried into the production image intact because the
> entrypoint needs the Prisma CLI and the TS seed runner at boot (see the Dockerfile comment).

### On the host (manual)

From the repo root:

```bash
pnpm prisma:generate    # generate Prisma client
pnpm prisma:migrate     # prisma migrate dev (development)
pnpm prisma:seed        # prisma db seed
```

Inside `apps/api`, production-style scripts apply migrations without generating new ones:

- `prisma:migrate:prod` → resolves any failed migrations, then `prisma migrate deploy`.
- `setup` → `prisma:migrate:prod` + `prisma:seed`.
- The app start scripts (`start`, `start:prod`, etc.) run
  `prisma generate → prisma:migrate:prod → prisma db seed` before launching Nest.

`SEED_DEFAULT_PASSWORD` is a **required** env var with no fallback — the seed fails loudly if
it is missing.

---

## Manual / non-Docker deployment

To run the compiled apps directly on a Node 22 host:

```bash
pnpm install --frozen-lockfile
pnpm build                       # turbo build (web + api)

# API
pnpm --filter @auraspear/api start:prod
#   runs prisma generate -> migrate deploy -> db seed -> node dist/main

# Web (Next.js standalone output)
node apps/web/.next/standalone/apps/web/server.js
```

Provision a reachable PostgreSQL 16 and Redis 7, set `DATABASE_URL`, `REDIS_HOST`/`REDIS_PORT`
(and `REDIS_PASSWORD` if required), plus the secrets from ENVIRONMENT.md. The web app's
`output: 'standalone'` build emits `server.js` under `apps/web/` with a traced top-level
`node_modules` (it binds `PORT=3000`, `HOSTNAME=0.0.0.0`).

---

## Image internals

Both images are multi-stage pnpm-workspace builds with the repo root as build context:

- **API** ([`apps/api/Dockerfile`](../apps/api/Dockerfile)): `base` (node:22-alpine,
  `corepack enable`, `openssl`) → `deps` (`pnpm install --frozen-lockfile --filter
@auraspear/api...`) → `build` (`prisma generate` + `nest build`) → `production`. Runs as a
  non-root `nestjs` user (uid 1001), exposes `4000`, and has a `HEALTHCHECK` hitting
  `/api/v1/health`. A build-time placeholder `DATABASE_URL` lets `prisma generate` run without
  connecting; the real URL is injected at runtime.
- **Web** ([`apps/web/Dockerfile`](../apps/web/Dockerfile)): same `base`/`deps`/`build`
  pattern, with `NEXT_PUBLIC_*` baked in as build args. The `production` stage copies the
  Next.js `standalone` output, runs as non-root `nextjs` (uid 1001), and exposes `3000`.

The base compose file gives both images Docker `healthcheck` definitions, and `web`
`depends_on` `api` with `condition: service_healthy`.

---

## Production hardening checklist

- **Internal-only datastores** — In the base + prod topology, Postgres and Redis have **no**
  host port bindings; they are reachable only over the internal `auraspear` Docker network.
  Do not add the dev overlay (which opens `5432`/`6379`/`5050`) in production.
- **Redis password required** — The prod overlay starts Redis with `--requirepass
${REDIS_PASSWORD}` and fails fast if `REDIS_PASSWORD` is unset.
- **Strong secrets** — `POSTGRES_PASSWORD`, `JWT_SECRET`, `CONFIG_ENCRYPTION_KEY`,
  `SEED_DEFAULT_PASSWORD`, and `REDIS_PASSWORD` must be strong, non-default values. The API
  fails loudly at startup if required secrets are missing — never ship placeholder or
  all-zero secrets. See [docs/ENVIRONMENT.md](./ENVIRONMENT.md) for generation instructions.
- **`NODE_ENV=production`** — The prod overlay pins `NODE_ENV: production` for both web and
  api (and `LOG_LEVEL: info`). The base `api` service also defaults `NODE_ENV` to
  `production`.
- **HTTPS + CORS** — Serve the platform behind TLS (e.g. a reverse proxy terminating HTTPS in
  front of `web`/`api`). Configure `CORS_ORIGINS` to your real HTTPS origins; `localhost`
  origins are rejected in production (see ENVIRONMENT.md / API config).
- **`restart: always`** — The prod overlay sets `restart: always` on web and api so they
  recover after crashes/reboots.
- **Run as non-root** — Both images already run as dedicated non-root users (`nestjs`,
  `nextjs`, uid 1001).
- **Persisted data** — Postgres data (`pgdata`) and Redis data (`redisdata`) are named Docker
  volumes; back them up. Avoid `pnpm docker:clean` in production — it runs `down -v` and drops
  volumes.

---

## Health and verification

- API health endpoint: `GET /api/v1/health` (used by both the Dockerfile `HEALTHCHECK` and
  the compose `healthcheck`).
- Compose health check helper: `pnpm docker:healthcheck` (`scripts/ci/docker-healthcheck.mjs`).
- Postgres readiness: `pg_isready`; Redis readiness: `redis-cli ping` (compose healthchecks).
