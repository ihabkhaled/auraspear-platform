# Deployment Architecture — AuraSpear Platform

> **Entry point for every contributor and AI agent is [`AGENTS.md`](../../AGENTS.md)**
> (loading order, monorepo map, security invariants). Read it first. The per-app
> guides [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) and
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) are the authoritative rule sets
> for backend and frontend code.
>
> **Scope note (avoid duplication).** This file is the _architectural_ reference
> for how AuraSpear is packaged and shipped — the Docker Compose topology, the
> two app Dockerfiles, the boot sequence, and the GitHub Actions CI/CD. The
> **operator-facing how-to** (which `pnpm docker:*` command to run, env
> requirements, hardening checklist, manual non-Docker deploy) is documented once
> in **[`docs/DEPLOYMENT.md`](../DEPLOYMENT.md)** — this doc links there instead of
> repeating it. Runtime process behavior is in
> [`docs/architecture/RUNTIME.md`](./RUNTIME.md); env vars in
> [`docs/ENVIRONMENT.md`](../ENVIRONMENT.md); ops/runbooks in
> [`docs/OPERATIONS.md`](../OPERATIONS.md). The full docs map is
> [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md).

> **Workspace is mid-upgrade — do not run `pnpm` to "verify".** The toolchain is
> being moved (see [`docs/tools/TYPESCRIPT_AND_TSGO.md`](../tools/TYPESCRIPT_AND_TSGO.md)
> and [`package.json`](../../package.json)). Treat the files cited below as the
> source of truth over any prose.

Every claim below is grounded in real repo files (paths cited). Where this doc and
a `CLAUDE.md` guide diverge, the **code wins**.

---

## 1. What gets deployed

AuraSpear ships as **two app images** plus **two stateful services**:

| Unit       | Image / source                                                       | Role                                         |
| ---------- | -------------------------------------------------------------------- | -------------------------------------------- |
| `web`      | `auraspear/web` ([`apps/web/Dockerfile`](../../apps/web/Dockerfile)) | Next.js 16 SOC UI + proxy (`@auraspear/web`) |
| `api`      | `auraspear/api` ([`apps/api/Dockerfile`](../../apps/api/Dockerfile)) | NestJS 11 BFF (`@auraspear/api`)             |
| `postgres` | `postgres:16-alpine` (compose)                                       | Primary datastore (Prisma)                   |
| `redis`    | `redis:7-alpine` (compose)                                           | Cache, token blacklist, job locks/queue      |

The BFF pattern means the browser talks only to `web`, `web` proxies/serves to
`api`, and `api` is the only thing that talks to Postgres, Redis, and the external
security tools. See [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) and
[`docs/architecture/RUNTIME.md`](./RUNTIME.md) for the static/runtime view of that
flow; the security tool integrations themselves are in
[`docs/architecture/CONNECTORS.md`](./CONNECTORS.md).

All deployment files live under **`infra/docker/`** (the monorepo map in
[`AGENTS.md`](../../AGENTS.md) §3 calls this "base + dev/prod/infra/connectors
compose, Dockerfiles via apps/\*"). The build context for both images is the **repo
root**, so all compose/build commands run from there.

---

## 2. Compose topology (`infra/docker/`)

Five files: one **base**, two **overlays** that merge onto it, one standalone
**infra-only** stack, and one standalone **connectors** stack.

| File                                                                                | Compose project   | Composition                        |
| ----------------------------------------------------------------------------------- | ----------------- | ---------------------------------- |
| [`docker-compose.yml`](../../infra/docker/docker-compose.yml)                       | `auraspear`       | Base full stack (web+api+pg+redis) |
| [`docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml)               | `auraspear`       | Dev overlay (merges onto base)     |
| [`docker-compose.prod.yml`](../../infra/docker/docker-compose.prod.yml)             | `auraspear`       | Prod overlay (merges onto base)    |
| [`docker-compose.infra.yml`](../../infra/docker/docker-compose.infra.yml)           | `auraspear-infra` | Standalone pg+redis+pgAdmin        |
| [`docker-compose.connectors.yml`](../../infra/docker/docker-compose.connectors.yml) | _(default)_       | Standalone security-tool stack     |

The base + overlays all declare `name: auraspear`, which is what lets `docker
compose -f base -f overlay` deep-merge the overlay onto the base on the same
project. The `pnpm docker:*` scripts that wire these `-f` combinations together
live in [`package.json`](../../package.json) and are documented for operators in
[`docs/DEPLOYMENT.md`](../DEPLOYMENT.md#topologies).

### 2.1 Base stack — `docker-compose.yml`

The "secure-by-default" full stack. Key architectural decisions baked into the
base file:

- **`postgres`** (`postgres:16-alpine`) and **`redis`** (`redis:7-alpine`) are on
  the internal `auraspear` bridge network with **no `ports:` host bindings** —
  reachable only inside the Docker network. `redis` runs with `--save 60 1` AOF/RDB
  persistence to the `redisdata` volume; `postgres` persists to `pgdata`. Both have
  `pg_isready` / `redis-cli ping` healthchecks.
- **`api`** builds from [`apps/api/Dockerfile`](../../apps/api/Dockerfile) with
  `context: ../..` (repo root). `depends_on` postgres + redis with
  `condition: service_healthy`. It composes `DATABASE_URL` internally from the
  Postgres vars (`postgresql://…@postgres:5432/…?schema=public`), points
  `REDIS_HOST` at the `redis` service, defaults `NODE_ENV` to `production`, and
  publishes `${API_PORT:-4000}:4000`. Runtime secrets come from the repo-root
  `.env` via `env_file: { path: ../../.env, required: false }` (optional so
  `compose config` works before `.env` exists; required for real runs). A
  container `healthcheck` hits `/api/v1/health`.
- **`web`** builds from [`apps/web/Dockerfile`](../../apps/web/Dockerfile), passing
  the `NEXT_PUBLIC_*` values as **build args** (baked into the client bundle).
  `depends_on` `api` with `condition: service_healthy`. Server-side calls reach the
  API over the Docker network via `BACKEND_API_URL` (default
  `http://api:4000/api/v1`); it publishes `${WEB_PORT:-3000}:3000`.

Rule **65** in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) ("Docker production
compose MUST NOT expose internal service ports") is satisfied at the **base**
layer: pg/redis/pgAdmin are never published here, only `api` and `web`.

### 2.2 Dev overlay — `docker-compose.dev.yml`

Merges onto the base for local debugging:

- Publishes `postgres` (`5432`), `redis` (`6379`) host ports, and adds a
  **`pgadmin`** service (`dpage/pgadmin4`, `${PGADMIN_PORT:-5050}:80`,
  `PGADMIN_PASSWORD` required).
- Flips `api` to `NODE_ENV: development`, `LOG_LEVEL: debug`. `web` stays a
  production Next.js build with `NEXT_PUBLIC_APP_ENV: development`.

### 2.3 Prod overlay — `docker-compose.prod.yml`

Merges onto the base for hardened deployment:

- **`redis`** is restarted with `--requirepass ${REDIS_PASSWORD:?…}` (fails fast
  if unset) and a password-aware healthcheck (`redis-cli -a … ping`).
- `api` and `web` get `restart: always`, `NODE_ENV: production`, and
  `LOG_LEVEL: info` (`api`). The prod overlay adds **no** `ports:` for pg/redis,
  so they inherit the base file's internal-only posture.

The operator-facing **production hardening checklist** (TLS/CORS, strong secrets,
volume backups, avoid `docker:clean`) lives in
[`docs/DEPLOYMENT.md`](../DEPLOYMENT.md#production-hardening-checklist) — not
duplicated here.

### 2.4 Infra-only stack — `docker-compose.infra.yml`

A **separate** compose project (`name: auraspear-infra`) that runs only
`postgres` + `redis` + `pgadmin`, all **published to the host** with relaxed
defaults (e.g. `POSTGRES_PASSWORD:-auraspear`, `PGADMIN_PASSWORD:-admin`). It is
intended for the "datastores in Docker, apps on the host" workflow — run
`pnpm docker:infra`, then `pnpm dev` / `pnpm dev:api` on the host. It defines its
own `pgdata` / `redisdata` / `pgadmin_data` volumes (distinct project namespace
from the base stack). Because of the weak defaults, this stack is **local
development only**.

### 2.5 Connectors stack — `docker-compose.connectors.yml`

A large **standalone** stack of the external security tools AuraSpear integrates
with, for local end-to-end testing without real infrastructure. It defines its own
`connectors` bridge network and ~25 named volumes, and brings up:

| Group        | Services                                                                     | Notable host ports                         |
| ------------ | ---------------------------------------------------------------------------- | ------------------------------------------ |
| Wazuh SIEM   | `wazuh-certs-generator`, `wazuh-manager`, `wazuh-indexer`, `wazuh-dashboard` | `55000` (API), `9200`, `5601`, `1514/1515` |
| Graylog      | `graylog`, `graylog-mongo`, `graylog-opensearch`                             | `9000` (UI/API), `12201` (GELF)            |
| Logstash     | `logstash`                                                                   | `9600`, `5044`, `5140`, `8088`             |
| Grafana      | `grafana`                                                                    | `3300:3000` (avoids Next.js `3000`)        |
| InfluxDB     | `influxdb`                                                                   | `8086`                                     |
| MISP intel   | `misp`, `misp-db` (MariaDB), `misp-redis`                                    | `8443` (HTTPS), `8080`                     |
| Shuffle SOAR | `shuffle-backend`, `shuffle-frontend`, `shuffle-opensearch`                  | `3443`, `3444`                             |
| Velociraptor | `velociraptor`                                                               | `8889` (GUI), `8001` (API), `8003`         |

Architectural notes that affect how this stack is run/deployed:

- It is **not** wired into a `pnpm docker:*` script. The header comment in
  [`docker-compose.connectors.yml`](../../infra/docker/docker-compose.connectors.yml)
  shows it is invoked directly: `docker compose -f docker-compose.connectors.yml up -d`.
- Several services bind-mount relative config paths (e.g.
  `./config/wazuh/wazuh-certs.yml`, `./config/logstash/pipeline`). Those paths are
  relative to the **invocation directory**, and the matching config (e.g.
  [`apps/api/config/wazuh/wazuh-certs.yml`](../../apps/api/config/wazuh/wazuh-certs.yml))
  lives under `apps/api/config/`, so this stack is run from a working directory
  where those `./config/...` paths resolve — not blindly from `infra/docker/`.
- Credentials in this file are **local-dev defaults only** (documented in its
  header) and must never be used in any real environment — see the secrets
  invariants in [`AGENTS.md`](../../AGENTS.md) §6 and
  [`docs/SECURITY.md`](../SECURITY.md). The real platform stores connector
  credentials AES-256-GCM-encrypted at rest (see
  [`docs/architecture/CONNECTORS.md`](./CONNECTORS.md)).

The `shuffle-backend` mounts `/var/run/docker.sock` (Shuffle runs workflow
containers); that is a host-privileged bind and another reason this stack is
dev-only.

---

## 3. Image internals (Dockerfiles)

Both images are **multi-stage pnpm-workspace builds** with `node:22-alpine` and the
**repo root as build context** (so every `COPY` path is monorepo-relative). The
Node 22 LTS choice is recorded in
[`docs/decisions/ADR-0002-node-22-lts.md`](../decisions/ADR-0002-node-22-lts.md);
the pnpm/Turborepo workspace is described in
[`docs/architecture/MONOREPO.md`](./MONOREPO.md).

### 3.1 API image — [`apps/api/Dockerfile`](../../apps/api/Dockerfile)

```
base       node:22-alpine + corepack enable + apk add openssl   (WORKDIR /repo)
  └ deps   copy lockfile/workspace/manifests + prisma schema;
           build-time placeholder DATABASE_URL;
           pnpm install --frozen-lockfile --filter @auraspear/api...
     └ build  copy sources; pnpm … exec prisma generate; pnpm … run build (nest build)
        └ production  NODE_ENV=production; non-root user nestjs (uid 1001);
                      EXPOSE 4000; HEALTHCHECK → /api/v1/health;
                      ENTRYPOINT ["./docker-entrypoint.sh"]
```

- The `--filter @auraspear/api...` install pulls in only the api plus its workspace
  deps (`packages/shared`, `packages/config`).
- A **placeholder `DATABASE_URL`** is set at build time so `prisma generate` runs
  without connecting; the **real** URL is injected at runtime by compose/env.
- The built workspace `node_modules` is carried into the `production` stage intact
  because the **entrypoint** still needs the Prisma CLI and the TS seed runner at
  boot (image-size pruning via `pnpm deploy --prod` is a noted follow-up).
- The Dockerfile `HEALTHCHECK` mirrors the compose `api` healthcheck (both hit
  `/api/v1/health`).

### 3.2 Web image — [`apps/web/Dockerfile`](../../apps/web/Dockerfile)

Same `base`/`deps`/`build`/`production` shape, filtered to `@auraspear/web...`:

- The four `NEXT_PUBLIC_*` `ARG`s are promoted to `ENV` before `next build`, so they
  are **baked into the client bundle** at build time (changing them requires a
  rebuild, not just a restart). The base compose passes them as `build.args`.
- `next.config` uses `output: 'standalone'`; in a workspace this emits
  `server.js` under `apps/web/` plus a traced top-level `node_modules`. The
  `production` stage copies `.next/standalone`, `.next/static`, and `public`, runs
  as non-root `nextjs` (uid 1001), `EXPOSE 3000`, and starts with
  `node apps/web/server.js` (`PORT=3000`, `HOSTNAME=0.0.0.0`).

Both images running as dedicated **non-root** users (uid 1001) and source maps
being disabled in the api production build (rule **45** in
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)) are part of the deploy-time
security posture.

---

## 4. Boot sequence: migrate + seed

The api container does **not** start Nest directly — it runs
[`apps/api/docker-entrypoint.sh`](../../apps/api/docker-entrypoint.sh):

```sh
npx prisma migrate deploy                       # apply pending migrations
npx prisma db seed || echo "… already applied"  # idempotent seed (non-fatal)
exec node dist/main.js                          # start the API
```

This is safe to re-run because seeders are **idempotent** (`upsert` /
`skipDuplicates`, rule **15** in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)),
and `api` only starts after Postgres/Redis are `service_healthy`, so
`migrate deploy` runs against a live database. `SEED_DEFAULT_PASSWORD` is a
**required** env var with no fallback — the seed fails loudly if it is missing
(rule **54**). The schema/migration model is detailed in
[`docs/architecture/DATABASE.md`](./DATABASE.md); the operator how-to (host-side
`pnpm prisma:*`, production migrate scripts) is in
[`docs/DEPLOYMENT.md`](../DEPLOYMENT.md#database-migrations-and-seeding).

---

## 5. Networking & exposure summary

| Service  | Container port | Host binding                                 | Network             |
| -------- | -------------- | -------------------------------------------- | ------------------- |
| web      | 3000           | `${WEB_PORT:-3000}` (always)                 | `auraspear`         |
| api      | 4000           | `${API_PORT:-4000}` (always)                 | `auraspear`         |
| postgres | 5432           | **dev/infra only** (`${POSTGRES_PORT}`)      | `auraspear`(-infra) |
| redis    | 6379           | **dev/infra only** (`${REDIS_PORT}`)         | `auraspear`(-infra) |
| pgAdmin  | 80             | **dev/infra only** (`${PGADMIN_PORT:-5050}`) | `auraspear`(-infra) |

In the **base + prod** topology only `web` and `api` are reachable from the host;
everything stateful is internal-network-only. The connectors stack uses its own
`connectors` network and publishes many ports (§2.5) — keep it off any
internet-reachable host. WebSocket/realtime traffic rides the same `web`/`api`
ports (see [`docs/architecture/RUNTIME.md`](./RUNTIME.md)).

---

## 6. CI/CD (GitHub Actions)

Five workflows in [`.github/workflows/`](../../.github/workflows/) implement the
validation gates that [`AGENTS.md`](../../AGENTS.md) §5 calls "green". All run on
`push`/`pull_request` to `main` (Node 22, pnpm via `pnpm/action-setup`).

### 6.1 `ci.yml` — typecheck/build/test

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml):

- **`validate` (hard gate)** — `pnpm install --frozen-lockfile` →
  `pnpm --filter @auraspear/api prisma:generate` → `pnpm typecheck` → `pnpm build`.
  This is the blocking gate.
- **`lint` (advisory)** and **`test` (advisory)** — `continue-on-error: true`; they
  run and annotate but do **not** block, because of tracked pre-existing debt (see
  [`docs/audit/02-risk-register.md`](../audit/02-risk-register.md) and
  [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)). The
  `test` job spins up `postgres:16-alpine` + `redis:7-alpine` services and sets
  `DATABASE_URL`/`REDIS_*` to match.

### 6.2 `docker.yml` — build & publish images

[`.github/workflows/docker.yml`](../../.github/workflows/docker.yml): a matrix over
`web` and `api`. Builds the `production` target of each Dockerfile with
`context: .` (repo root) and GitHub Actions layer cache (`cache-from/to: type=gha`,
scoped per app). On **PRs** it only **validates the build** (no push, no load); on
**`main` and `v*` tags** it logs in to **GHCR** and pushes. Tags come from
`docker/metadata-action`: `type=ref,event=branch`, `type=semver,pattern={{version}}`
(on tags), and `type=sha`. So a release flow is: tag `vX.Y.Z` → images published to
`ghcr.io/<repo>/web` and `…/api`. This "Docker image builds" gate is one of the
**hard** gates in [`AGENTS.md`](../../AGENTS.md) §5.

### 6.3 Security workflows (hard + advisory)

- [`security.yml`](../../.github/workflows/security.yml) — **`gitleaks`** secret
  scan (hard gate), **Trivy** filesystem scan (`vuln,secret,misconfig`, HIGH/CRITICAL,
  reports but `--exit-code 0`, skips `node_modules`), and **`pnpm audit`**
  (advisory). Also runs weekly (Mon 06:00 UTC).
- [`codeql.yml`](../../.github/workflows/codeql.yml) — CodeQL
  `javascript-typescript` `security-and-quality` analysis (hard gate; weekly Tue).
- [`dependency-review.yml`](../../.github/workflows/dependency-review.yml) — PR
  dependency review, `fail-on-severity: high` (currently advisory via
  `continue-on-error` until the base-branch dependency snapshot is computed).

Note that **image vulnerability scanning is covered by the Trivy _filesystem_ scan**
in `security.yml`, not by scanning the built images in `docker.yml` (the
`docker.yml` comments say so explicitly). The broader security model is in
[`docs/SECURITY.md`](../SECURITY.md) and [`docs/security/`](../security/); the
recipe for adding a CI gate is in
[`skills/devsecops/add-ci-gate.md`](../../skills/devsecops/add-ci-gate.md).

### 6.4 Which gates block

Per [`AGENTS.md`](../../AGENTS.md) §5: **hard gates** = `pnpm typecheck`,
`pnpm build`, Docker image builds, gitleaks, CodeQL. **Advisory** (run + annotate,
non-blocking today) = lint, format:check, tests, `pnpm audit`, Trivy fs. Never
claim "all green" unless the required gates actually passed.

---

## 7. Verification & health

- **API health**: `GET /api/v1/health` — used by both the Dockerfile `HEALTHCHECK`
  and the compose `api` healthcheck. Per rule **60** in
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) it must **not** disclose the app
  version, and per rule **81** must not leak internal service URLs.
- **Datastore readiness**: `pg_isready` (postgres) and `redis-cli ping` (redis)
  compose healthchecks gate `api` startup.
- **Compose health helper**: `pnpm docker:healthcheck` →
  [`scripts/ci/docker-healthcheck.mjs`](../../scripts/ci/docker-healthcheck.mjs).
- **Env preflight**: `pnpm doctor`, `pnpm setup:env`, `pnpm audit:env` (see
  [`scripts/install/`](../../scripts/install/) and
  [`scripts/ci/`](../../scripts/ci/), documented in
  [`docs/ENVIRONMENT.md`](../ENVIRONMENT.md)).

---

## 8. Related docs, rules & skills

- **Operator how-to (commands, env, hardening, manual deploy):**
  [`docs/DEPLOYMENT.md`](../DEPLOYMENT.md)
- **Runtime processes / bootstrap:** [`docs/architecture/RUNTIME.md`](./RUNTIME.md)
- **System architecture (BFF, modules, request flow):** [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
- **Workspace wiring (pnpm + Turborepo):** [`docs/architecture/MONOREPO.md`](./MONOREPO.md)
- **DB schema, migrations, seeding:** [`docs/architecture/DATABASE.md`](./DATABASE.md)
- **External tool integrations:** [`docs/architecture/CONNECTORS.md`](./CONNECTORS.md)
- **Environment variables & secrets:** [`docs/ENVIRONMENT.md`](../ENVIRONMENT.md)
- **Ops / runbooks / troubleshooting:** [`docs/OPERATIONS.md`](../OPERATIONS.md) ·
  [`docs/TROUBLESHOOTING.md`](../TROUBLESHOOTING.md)
- **Security model & scans:** [`docs/SECURITY.md`](../SECURITY.md) ·
  [`docs/security/`](../security/)
- **Decisions:** [`docs/decisions/ADR-0002-node-22-lts.md`](../decisions/ADR-0002-node-22-lts.md) ·
  [`ADR-0001-monorepo-pnpm-turborepo.md`](../decisions/ADR-0001-monorepo-pnpm-turborepo.md)
- **Rules / skills:** [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md) ·
  [`skills/devsecops/add-ci-gate.md`](../../skills/devsecops/add-ci-gate.md)
