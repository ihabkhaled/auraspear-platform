# Troubleshooting — AuraSpear Platform

Common setup, build, and runtime failures in the monorepo, grouped by area. Each
entry gives the symptom, the root cause, and the fix grounded in the actual repo
config.

The repo is a pnpm workspace (`pnpm@10.30.3`, Node `>=22 <25`) driven by Turbo.
Apps live in `apps/web` (`@auraspear/web`) and `apps/api` (`@auraspear/api`);
shared libs in `packages/*`; Docker compose files in `infra/docker/`.

---

## pnpm / corepack

### corepack EPERM on Windows

**Symptom:** `corepack enable` or the first `pnpm` invocation fails with
`EPERM: operation not permitted` while creating shims (often in
`...\nodejs\` or `AppData\npm`).

**Cause:** Corepack writes shim executables into the Node install directory,
which is not writable from a non-elevated shell on Windows.

**Fixes (in order of preference):**

- Run the corepack/enable step once in an **elevated** terminal
  (Administrator PowerShell), then use pnpm normally from a regular shell.
- Or install pnpm standalone (without corepack) and skip `corepack enable`
  entirely. The repo pins `"packageManager": "pnpm@10.30.3"` in the root
  `package.json`, so any pnpm `>=10` (per `engines.pnpm`) will respect the
  pinned version when corepack is active, but a standalone pnpm 10.x also works.
- If a previous partial install left read-only shims, delete the stale
  `pnpm`/`pnpx` shims and re-run enable elevated.

> Note: the Docker image (`apps/api/Dockerfile`) runs `corepack enable` inside a
> Linux `node:22-alpine` base, so this EPERM class of error is a host-Windows
> problem only — it does not affect container builds.

### "This project is configured to use pnpm" / wrong package manager

**Cause:** running `npm install` or `yarn` at the repo root. The workspace is
pnpm-only (`pnpm-workspace.yaml`, `pnpm-lock.yaml`, and the `packageManager`
pin).

**Fix:** use `pnpm install` at the repo root. Per-app scripts are driven through
pnpm filters (e.g. `pnpm --filter @auraspear/api start:dev`).

---

## Prisma generate / migrate

The api's npm `start*` scripts chain Prisma steps before booting Nest, e.g.
`start:dev` runs `prisma:generate && prisma:migrate:prod && prisma:seed && nest
start --watch` (`apps/api/package.json`). So a Prisma failure blocks the whole
dev boot.

Script map (`apps/api/package.json`):

| Script                | Command                                        |
| --------------------- | ---------------------------------------------- |
| `prisma:generate`     | `prisma generate`                              |
| `prisma:migrate`      | `prisma migrate dev` (dev: creates migrations) |
| `prisma:migrate:prod` | resolve-failed step + `prisma migrate deploy`  |
| `prisma:seed`         | `prisma db seed`                               |

### `prisma generate` fails — missing engine / OpenSSL / DATABASE_URL

- **OpenSSL missing (Alpine/Docker):** the Dockerfile installs it explicitly
  (`apk add --no-cache openssl`). Locally on minimal Linux you may need the
  system OpenSSL package for the query engine.
- **`prisma generate` wants a DATABASE_URL:** `prisma.config.ts` resolves
  `DATABASE_URL` eagerly, so generate fails if it is unset even though generate
  never connects. The Dockerfile works around this with a throwaway build-time
  value:
  `ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public`
  (overridden at runtime). Locally, set any syntactically valid `DATABASE_URL`
  before running generate.
- Prisma is on pnpm's `onlyBuiltDependencies` allowlist (`@prisma/client`,
  `@prisma/engines`, `prisma`, `esbuild` in `pnpm-workspace.yaml`). If you tightened
  pnpm's build-script policy and removed these, the engine won't be fetched —
  keep them allowlisted.

### `prisma migrate deploy` — failed / pending migrations

The production migrate path is `prisma:migrate:prod`, which first runs
`scripts/resolve-failed-migrations.mjs` (`prisma:migrate:resolve`) and then
`prisma migrate deploy`. If a migration is left in a failed state, this resolve
step is what unblocks deploy — run `pnpm --filter @auraspear/api
prisma:migrate:resolve` (or the full `prisma:migrate:prod`) rather than editing
the `_prisma_migrations` table by hand.

### Schema changes without a migration

Per the api guidelines (CLAUDE.md rule 30), every `schema.prisma` change must
ship a matching migration in `prisma/migrations/`. If `migrate deploy` reports
drift or a model is missing at runtime, you likely changed the schema without
generating the SQL migration. New permissions specifically must use a
`WHERE NOT EXISTS` insert pattern (not `ON CONFLICT ("key")`) because the unique
constraint is the compound `(tenantId, key)` (CLAUDE.md rule 85).

---

## Environment validation failures (boot-time)

The api validates its environment with a Zod schema at startup
(`apps/api/src/config/env.validation.ts`). On any failure it throws
`Environment validation failed:` followed by one indented line per offending
variable, then exits — the app never starts. See `docs/ENVIRONMENT.md` for the
full table.

`NODE_ENV` defaults to **`production`** (`NodeEnvironment.PRODUCTION`). This is
deliberate (CLAUDE.md rule 58): a misconfigured deployment gets strict prod
validation instead of permissive dev behavior. Several rules below only trigger
when `NODE_ENV=production`, so locally you must set `NODE_ENV=development`
explicitly to relax them.

### `JWT_SECRET` too short / not hex

**Message:** `JWT_SECRET must be at least 64 hex characters...` (or the
all-zeros refinement).

**Cause:** `JWT_SECRET` must be `min(32)` and additionally pass a refine
requiring `length >= 64` and matching `^[\da-f]+$` (hex only), and must not be
all zeros.

**Fix:** generate a real 32-byte hex secret (64 chars):

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### `CONFIG_ENCRYPTION_KEY` wrong length

**Message:** `CONFIG_ENCRYPTION_KEY must be exactly 64 hex characters (32
bytes)...` (or the all-zeros refinement).

**Cause:** AES-256 needs exactly 32 bytes. The schema enforces `.length(64)` +
`^[\da-f]{64}$` + not-all-zeros. Note this is **stricter** than `JWT_SECRET`:
exactly 64 chars, not "at least 64".

**Fix:** same generator as above produces exactly 64 hex chars.

### `REDIS_PASSWORD` in production

**Message:** `REDIS_PASSWORD must be at least 16 characters in production`.

**Cause:** `REDIS_PASSWORD` defaults to `''` and is allowed empty in
dev/test, but a refine requires `value.length >= 16` when
`NODE_ENV=production`.

**Fix:** set a 16+ char `REDIS_PASSWORD`, or run with `NODE_ENV=development`
locally where the empty default is accepted.

### `CORS_ORIGINS` rejects localhost in production

**Messages (any of):**

- `CORS_ORIGINS must be a comma-separated list of valid http/https URLs`
- `CORS_ORIGINS must not be empty in production`
- `CORS_ORIGINS must not include localhost origins in production`

**Cause:** `CORS_ORIGINS` defaults to `http://localhost:3000`. Three refines
apply:

1. Always: every entry must parse as an `http:`/`https:` URL.
2. Prod only: the list must be non-empty.
3. Prod only: no entry may have hostname `localhost` or `127.0.0.1`
   (CLAUDE.md rule 83).

**Fix:** in production, set `CORS_ORIGINS` to real comma-separated origins
(e.g. `https://soc.example.com`). The default localhost value is fine in dev,
but will hard-fail boot if `NODE_ENV=production`.

### OIDC variables are all-or-nothing

**Message:** `OIDC configuration is incomplete — set all of OIDC_ISSUER_URL,
OIDC_AUDIENCE, OIDC_JWKS_URI, OIDC_CLIENT_ID or none of them`.

**Cause:** a `superRefine` group check — these four are individually optional,
but if you set some and not all, boot fails (CLAUDE.md rule 64).

**Fix:** set all four, or leave all four unset.

### `PLATFORM_ADMIN_PASSWORD` too short

**Message:** `PLATFORM_ADMIN_PASSWORD must be at least 12 characters when set`.

**Cause:** optional, but when present must be `min(12)`.

### `DATABASE_URL` missing / invalid

**Cause:** required, must be a valid URL (`z.string().url()`). Empty or
malformed values fail boot.

---

## `@hookform/resolvers` + Zod peer (ADR-0004)

**Symptom:** `pnpm --filter @auraspear/web typecheck` fails with ~37–40
`TS2769: No overload matches this call` on `zodResolver(schema)`, with a nested
message like `The types of '_zod.version.minor' are incompatible. Type '4' is
not assignable to type '0'`.

**Cause:** `@hookform/resolvers@5` consumes schemas via Standard Schema and
**dropped `zod` from its `peerDependencies`**. Under pnpm's isolated
`node_modules` the resolver has no `zod` in scope, so TS resolves its internal
`import ... from 'zod'` to a default where Zod's `version.minor` is `0`, never
matching the web app's real Zod 4. This is a dependency-graph problem, not an
app-code or true version incompatibility.

**Fix (already in the repo — `pnpm-workspace.yaml`):** a `packageExtensions`
entry re-declares the peer so pnpm co-locates the web app's Zod 4 with the
resolver:

```yaml
packageExtensions:
  '@hookform/resolvers':
    peerDependencies:
      zod: '*'
```

plus `overrides: { zod@4: 4.4.3 }` to dedupe the web tree to a single Zod 4.x.
The api app intentionally stays on Zod 3.x and is untouched by the `zod@4`
override.

**If the error returns after a fresh clone:** run `pnpm install` so pnpm rebuilds
the dependency graph with these extensions applied. Do **not** "fix" it by
pinning an older resolver or by enabling `node-linker=hoisted` /
`public-hoist-pattern[]=zod` — those were considered and rejected (see the ADR);
the declarative `packageExtensions` fix is the intended one. The repo keeps
strict isolation: `shamefully-hoist=false` and `strict-peer-dependencies=false`
with `auto-install-peers=true` (`.npmrc`).

---

## Docker: health waits, build args, migrate/seed at boot

The api image is built with the **repo root as build context**
(`apps/api/Dockerfile`, `context: ../..` in the compose files). Run compose from
the repo root so it reads the root `.env`. Convenience scripts:
`pnpm docker:dev` (base + dev overlay) and `pnpm docker:prod` (base + prod
overlay).

### Build-time `DATABASE_URL` arg

The deps stage sets a throwaway
`ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public`
**only so the api's postinstall `prisma generate` can resolve the eagerly-read
URL**. `prisma generate` never connects; the real `DATABASE_URL` is injected at
runtime by compose. If you remove this line, the image build fails at
generate time with a missing-`DATABASE_URL` error — keep it.

### Container won't become healthy / `web` never starts

- The `web` service has `depends_on: api: { condition: service_healthy }`, and
  `api` depends on `postgres` and `redis` being healthy. So a stuck container
  cascades: if Postgres or Redis never report healthy, `api` never starts, and
  `web` waits indefinitely.
- The api healthcheck polls
  `wget --spider http://localhost:4000/api/v1/health` with
  `interval=30s, timeout=5s, start_period=25s, retries=3` (same in the Dockerfile
  `HEALTHCHECK` and the compose `api.healthcheck`). During the 25s start period,
  failures don't count — give it time before assuming a crash.
- If `api` is marked unhealthy, check its logs first: the most common cause is an
  **env-validation throw at boot** (see the section above), or the entrypoint
  failing on migrate.

### Entrypoint: migrate + seed at boot

`apps/api/docker-entrypoint.sh` runs, in order:

```
npx prisma migrate deploy
npx prisma db seed || echo "Seeding skipped or already applied"
node dist/main.js
```

- `migrate deploy` uses `set -e`, so a **failed migration aborts the container
  before the app starts**. Inspect logs and resolve the failed migration (the
  api also ships `prisma:migrate:resolve`).
- Seeding is non-fatal (the `|| echo` swallows errors), **except** that the seed
  script itself requires `SEED_DEFAULT_PASSWORD` (see below) — a missing value
  prints the "skipped" line but does not seed an admin.

### Postgres requires a password

`docker-compose.yml` declares
`POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}` — compose
will refuse to start (`POSTGRES_PASSWORD is required`) if it's unset in the root
`.env`. The same `.env` value is interpolated into the api's `DATABASE_URL`
(`postgresql://...:${POSTGRES_PASSWORD}@postgres:5432/...`). The dev overlay's
pgAdmin similarly requires `PGADMIN_PASSWORD`.

---

## Port conflicts

Host port bindings (override the left side via root `.env`):

| Service  | Host port (env)              | Exposed in                                      |
| -------- | ---------------------------- | ----------------------------------------------- |
| api      | `${API_PORT:-4000}` → 4000   | base `docker-compose.yml`                       |
| web      | `${WEB_PORT:-3000}` → 3000   | base `docker-compose.yml`                       |
| postgres | `${POSTGRES_PORT:-5432}`     | **dev overlay only** (`docker-compose.dev.yml`) |
| redis    | `${REDIS_PORT:-6379}`        | **dev overlay only**                            |
| pgadmin  | `${PGADMIN_PORT:-5050}` → 80 | **dev overlay only**                            |

**Symptom:** `bind: address already in use` (or `port is already allocated`) on
`up`.

**Fixes:**

- Something already listens on 3000/4000 (another dev server) or
  5432/6379 (a local Postgres/Redis). Stop the other process, or override the
  host port, e.g. `API_PORT=4100`, `WEB_PORT=3100`, `POSTGRES_PORT=5433` in
  `.env`.
- Note: Postgres, Redis, and pgAdmin are **only published to the host by the dev
  overlay** (`pnpm docker:dev`). The base/prod stack keeps them on the internal
  Docker network with no host ports (secure-by-default; CLAUDE.md rule 65). If
  you need to reach them from the host, use the dev overlay or `docker exec`.
- For local (non-Docker) dev, the api `PORT` env var (default `4000`) sets the
  Nest listen port; change it to dodge a conflict.

---

## Seed: `SEED_DEFAULT_PASSWORD` is required

**Symptom:** `prisma db seed` (or the boot chain / Docker entrypoint) fails
loudly because the seed password env var is unset.

**Cause:** `apps/api/prisma/seed.ts` reads
`const DEFAULT_PASSWORD = requireEnv('SEED_DEFAULT_PASSWORD')` — there is **no
`??` fallback** (CLAUDE.md rule 54). This is intentional: it prevents seeding
admin accounts with a publicly-known weak default. `SEED_DEFAULT_PASSWORD` is
secret and required for seeding (`docs/ENVIRONMENT.md`).

**Fix:** set `SEED_DEFAULT_PASSWORD` (use a strong value — `PLATFORM_ADMIN_PASSWORD`
enforces 12+ chars when set, a good guideline here too) before running
`pnpm prisma:seed` / `pnpm --filter @auraspear/api prisma:seed`, or before any
`start*` script (which chains seeding) or Docker boot.

> In Docker, the entrypoint's seed step is wrapped in `|| echo "..."`, so a
> missing `SEED_DEFAULT_PASSWORD` will **not** crash the container — but no admin
> user gets seeded and you'll be unable to log in. Check the entrypoint logs for
> the "Seeding skipped" line if the first login fails.

Other seed credentials (`SEED_WAZUH_PASSWORD`, `SEED_GRAYLOG_PASSWORD`,
`SEED_MISP_AUTH_KEY`, etc.) are optional demo-connector values and do not block
seeding.

---

## Quick pre-run checklist

From `docs/ENVIRONMENT.md`:

- [ ] `CONFIG_ENCRYPTION_KEY` = exactly 64 hex chars
- [ ] `JWT_SECRET` = ≥ 64 hex chars (not all zeros)
- [ ] `SEED_DEFAULT_PASSWORD` set (no fallback)
- [ ] `REDIS_PASSWORD` ≥ 16 chars if `NODE_ENV=production`
- [ ] `CORS_ORIGINS` real origins, no localhost, in production
- [ ] OIDC vars all set or all empty
- [ ] `POSTGRES_PASSWORD` set (compose requires it)
- [ ] Ports 3000 / 4000 (and 5432 / 6379 / 5050 under the dev overlay) free
