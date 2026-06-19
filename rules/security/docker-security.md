# Rules — Docker Security

> **Read `../../AGENTS.md` first** (loading order + the one rule: understand
> before you edit; §6 "Security invariants", §8 "Branch & safety rules"). Then
> `../../apps/api/CLAUDE.md` (#65 "Docker production compose MUST NOT expose
> internal service ports", #24/#53 secrets) and `../../apps/web/CLAUDE.md`.
> These are **hard constraints**, not guidance. Each line maps to a real file —
> cited by path. A weak image or a published Postgres/Redis port is a network
> exposure / credential-leak bug, not a style nit. Sibling files: secrets/env in
> `security-rules.md` §11 + `../../skills/devsecops/add-env-variable.md`;
> branch/destructive-command safety in `../global/branch-safety.md`.

Images and compose stacks live under `apps/api/`, `apps/web/`, and
`infra/docker/`. Build context is **the repo root** (`context: ../..` in
`infra/docker/docker-compose.yml:49,88`) so every `COPY` path is monorepo-root
relative. **pnpm only, Node 22** — both production images are
`FROM node:22-alpine` and `corepack enable` pnpm
(`apps/api/Dockerfile:6-7`, `apps/web/Dockerfile:5-6`). Never reintroduce npm or
a different Node major into a production image.

---

## 1. Multi-stage builds — build deps never ship (`apps/*/Dockerfile`)

Both production images are multi-stage: `base → deps → build → production`.

- **api** (`apps/api/Dockerfile`): `deps` does a filtered, frozen install
  (`pnpm install --frozen-lockfile --filter @auraspear/api...`, `:24`); `build`
  runs `prisma generate` + `nest build` (`:31-32`); `production` is a fresh
  `FROM base` that copies the built `/repo` in (`:38-42`).
- **web** (`apps/web/Dockerfile`): same shape; `production` copies only the
  Next.js `output: 'standalone'` artifact — `.next/standalone`, `.next/static`,
  `public` (`:41-43`) — not the full source tree or dev `node_modules`.
- **Keep the lockfile authoritative**: always `--frozen-lockfile`
  (`apps/api/Dockerfile:24`, `apps/web/Dockerfile:15`). Never `pnpm install`
  unpinned in an image — that defeats reproducible, audited builds.
- **Don't collapse stages.** A single-stage image ships compilers, the full
  source tree, and dev dependencies into production. Add new build steps to the
  `build` stage, runtime-only artifacts to `production`.
- `apps/api/Dockerfile.dev` is **dev-only** (single stage, `npm ci`, watch mode,
  `start:dev`). It is not referenced by any `infra/docker/*.yml` prod path — never
  use it as a production base.

## 2. Non-root user — required in every production image

Containers run as an unprivileged user, never root.

- **api**: `addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001`, copies
  are `--chown=nestjs:nodejs`, then `USER nestjs` before `ENTRYPOINT`
  (`apps/api/Dockerfile:41-49`).
- **web**: `addgroup --system --gid 1001 nodejs && adduser --system --uid 1001
nextjs`, `--chown=nextjs:nodejs`, then `USER nextjs` before `CMD`
  (`apps/web/Dockerfile:38-44`).
- **Rule**: every production image MUST drop to a non-root `USER` _before_ the
  entrypoint/CMD, and copied files MUST be `--chown`ed to that user. Never add a
  `USER root` after the drop, and never run the app as root "just to fix
  permissions" — fix the `--chown` instead.

## 3. Healthchecks — every long-running service

A container without a healthcheck reports "up" even when the process is wedged;
`depends_on: condition: service_healthy` (`docker-compose.yml:54,98`) relies on
real checks.

- **api image** `HEALTHCHECK` hits `/api/v1/health` via `wget --spider`
  (`apps/api/Dockerfile:47-48`); base compose repeats it
  (`docker-compose.yml:70-83`, `start_period: 25s`).
- **postgres**: `pg_isready` (`docker-compose.yml:25-30`).
- **redis**: base uses `redis-cli ping` (`docker-compose.yml:40-44`); the prod
  overlay overrides it to authenticate first:
  `redis-cli -a "$$REDIS_PASSWORD" ping | grep -q PONG`
  (`docker-compose.prod.yml:25-26`) — because prod Redis requires a password (§5).
- **Rule**: any new service in `infra/docker/*.yml` MUST declare a `healthcheck`,
  and dependents MUST gate on `condition: service_healthy`. The health endpoint
  itself must not leak version or internal URLs (`security-rules.md` §10;
  CLAUDE.md #60, #81).

## 4. No secrets in images; `.dockerignore` excludes `.env`

Secrets enter **at runtime**, never baked into a layer.

- **Runtime injection only**: real secrets (`JWT_SECRET`,
  `CONFIG_ENCRYPTION_KEY`, `SEED_DEFAULT_PASSWORD`, `REDIS_PASSWORD`, OIDC/AWS)
  come from the root `.env` via compose `env_file`
  (`docker-compose.yml:59-61`) and `environment:` overlays — not from `ENV`/`ARG`
  in a Dockerfile. The api's build-time `ENV DATABASE_URL=postgresql://build:...`
  (`apps/api/Dockerfile:22`) is a **throwaway placeholder** so `prisma generate`
  can resolve eagerly without connecting; the real URL is injected at runtime
  (`docker-compose.yml:64`). Never put a real credential there.
- **Only `NEXT_PUBLIC_*` may be build args** (`apps/web/Dockerfile:23-31`): these
  are baked into the client bundle and are intentionally public. Never pass a
  secret as a web `ARG` — it ends up in the shipped JS.
- **`.dockerignore` excludes every env file** so a stray `.env` can't slip into
  the build context:
  - root `.dockerignore:14-17`: `**/.env`, `**/.env.*`, but
    `!**/.env.example` / `!**/.env.*.example` (examples allowed).
  - `apps/api/.dockerignore:4-6` and `apps/web/.dockerignore:4-6`: `.env`,
    `.env.*` excluded, `!.env.example` kept.
  - All three also drop `node_modules`, `.git`, `.husky`, `*.md`, test/coverage
    output, and `Dockerfile*` / `docker-compose*.yml`.
- **Rule**: never `COPY` a `.env` into an image, never hardcode a secret in a
  Dockerfile/compose default, never weaken the `.dockerignore` env globs. New
  secrets follow `security-rules.md` §11 (no fallback, no all-zeros, empty
  `.env.example`). Run `pnpm scan:secrets` (gitleaks) before committing image or
  compose changes (`../../skills/devsecops/run-security-scan.md`).

## 5. Production compose — internal services stay internal (CLAUDE.md #65)

PostgreSQL (5432), Redis (6379), and pgAdmin (5050) MUST NOT publish host
ports in production. Only **web** (3000) and **api** (4000) are host-reachable.

- The base stack already omits `ports:` on `postgres` and `redis`
  (`docker-compose.yml:14-44` — comment `:8-9`: "Postgres and Redis are NOT
  published to the host here"); they talk over the `auraspear` Docker network
  (`:111-113`). The prod overlay (`docker-compose.prod.yml`) **inherits** that and
  adds no `ports:` (header comment `:7-9`).
- **The dev overlay is the deliberate exception**: `docker-compose.dev.yml:11-19`
  opens `5432`/`6379` and adds pgAdmin on `5050` for local debugging. Never copy
  those `ports:` bindings into `docker-compose.prod.yml`.
  `docker-compose.infra.yml` also publishes them — it is host-dev only (run apps
  with `pnpm dev`), not a production stack.
- **Redis requires a password in prod**: `docker-compose.prod.yml:13-28` starts
  `redis-server --requirepass '${REDIS_PASSWORD:?REDIS_PASSWORD is required in
production}'` and the api receives `REDIS_PASSWORD` (`:35`). The `:?` makes a
  missing password **fail the stack at boot** — keep that fail-closed default.
  Postgres is the same: `POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required`
  (`docker-compose.yml:21`).
- **Rule**: a `ports:` line on `postgres`/`redis`/`pgadmin` in
  `docker-compose.prod.yml` (or in the base file) is a review blocker. Expose a
  new internal service only over the `auraspear` network; if the host truly needs
  it, justify it and keep it out of the prod overlay.

## 6. Never `docker compose down -v` without approval (AGENTS.md §8)

`-v` deletes the named volumes — `pgdata`, `redisdata`, `pgadmin_data`
(`docker-compose.yml:107-109`) — i.e. the entire database and cache. This is a
destructive command in the same class as `rm -rf` / `git reset --hard`.

- `pnpm docker:down` is intentionally `... down` **without** `-v`
  (`package.json:37`) so volumes survive a normal teardown. Keep it that way.
- **Rule**: never run `docker compose down -v` (or `docker volume rm`,
  `docker system prune --volumes`) unless the user explicitly requires it **and**
  it is documented in the task. Prove what a volume holds before destroying it —
  same "prove before deleting" bar as files/deps/env
  (AGENTS.md §8; `../global/branch-safety.md`).
- Routine teardown is plain `down`. Need a clean DB? Prefer re-running the
  entrypoint migrations/seed (`apps/api/docker-entrypoint.sh` runs
  `prisma migrate deploy` + `db seed` at boot) over nuking volumes.

---

## Checklist before you commit a Docker change

- [ ] Image stays **multi-stage**; build-only deps/source never reach the
      `production` stage; install is `--frozen-lockfile` (pnpm, Node 22).
- [ ] Production image drops to a **non-root `USER`** before ENTRYPOINT/CMD;
      copied files are `--chown`ed to that user.
- [ ] Every long-running service has a **`healthcheck`**; dependents gate on
      `condition: service_healthy`.
- [ ] **No secret** in any `ENV`/`ARG`/compose default (only `NEXT_PUBLIC_*` as
      web build args, only the throwaway build `DATABASE_URL`). Real secrets via
      `env_file` / runtime `environment:`.
- [ ] `.dockerignore` still excludes `.env` / `.env.*` (keeps `*.example`);
      `node_modules`, `.git`, secrets never enter the build context.
- [ ] `docker-compose.prod.yml` exposes **only web (3000) + api (4000)**; no
      `ports:` on postgres/redis/pgadmin; Redis has `--requirepass`; the `:?`
      fail-closed guards on `REDIS_PASSWORD`/`POSTGRES_PASSWORD` are intact.
- [ ] No `docker compose down -v` / volume deletion without explicit, documented
      approval.
- [ ] `pnpm scan:secrets` (gitleaks) clean; image builds (hard gate, AGENTS.md
      §5). **Branch first — never work on `main`.** Prove before deleting any
      file/dep/env/volume.

## Related

- `../../AGENTS.md` — §5 validation gates (Docker image builds are a hard gate),
  §6 security invariants, §8 branch & destructive-command safety.
- `../../apps/api/CLAUDE.md` — #65 (prod compose ports), #24/#53 (secrets),
  #45 (no prod source maps).
- `security-rules.md` — §11 secrets & connector AES-256-GCM encryption, §10
  no-info-disclosure (health endpoint), the env trust boundary.
- `../global/branch-safety.md` — destructive-command rules (incl.
  `docker compose down -v`), prove-before-delete.
- `../../skills/devsecops/run-security-scan.md` — `pnpm scan:secrets` (gitleaks),
  `pnpm scan:trivy` (image/fs scan).
- `infra/docker/docker-compose.yml` (base) + `.prod.yml` / `.dev.yml` /
  `.infra.yml` overlays; `apps/api/Dockerfile`, `apps/web/Dockerfile`,
  `apps/*/.dockerignore`.
