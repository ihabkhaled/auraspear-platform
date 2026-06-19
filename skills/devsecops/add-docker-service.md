# Skill: Add a service to the `infra/docker` compose stacks

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the loading order (§1), the
> command map (§4, the `pnpm docker:*` scripts), §5 "Validation gates" (**Docker
> image builds + gitleaks are HARD gates**), §6 "Security invariants", and §8
> "Branch & safety rules" (never `docker compose down -v` without documented
> approval). Then read the **hard constraints** this skill operationalizes:
> [`rules/security/docker-security.md`](../../rules/security/docker-security.md)
> (healthchecks §3, no-secrets-in-images §4, internal-ports §5, destructive
> `-v` §6) and [`rules/security/secret-handling.md`](../../rules/security/secret-handling.md)
> / [`rules/security/security-rules.md`](../../rules/security/security-rules.md) §11
> (no fallback secrets, no all-zeros). The two app rules behind these:
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) **#65** ("Docker production
> compose MUST NOT expose internal service ports"), **#24/#53** (no hardcoded /
> fallback secrets), and [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md).
>
> Sibling onboarding: [`skills/`](../) (e.g. [`devsecops/add-ci-gate.md`](./add-ci-gate.md)),
> [`rules/`](../../rules/), [`memory/`](../../memory/) (commands →
> [`COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)), [`context/`](../../context/),
> [`docs/`](../../docs/) (deploy → [`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md),
> ops → [`docs/OPERATIONS.md`](../../docs/OPERATIONS.md), runtime →
> [`docs/architecture/RUNTIME.md`](../../docs/architecture/RUNTIME.md)).
>
> **No AI agent may edit first and understand later** (AGENTS §0). A compose file
> on a multi-tenant SOC platform is a security control. A published Postgres/Redis
> port in prod, a baked-in secret, or a missing healthcheck is a network-exposure /
> credential-leak bug — not a style nit. **Mirror the existing services; do not
> invent a new shape.**

This recipe adds a new service to the `infra/docker` compose stacks the right way:
a real `healthcheck`, a **named** volume and the shared network, **no host ports
for internal services in prod**, **no secrets in the image**, and the
`.dockerignore` kept tight. The stacks today are:

| File                                                                                             | Purpose                                                                                                 | Host-published ports allowed?                         |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [`infra/docker/docker-compose.yml`](../../infra/docker/docker-compose.yml)                       | **BASE** — `web` + `api` + `postgres` + `redis`, secure-by-default                                      | only `web` (3000) + `api` (4000)                      |
| [`infra/docker/docker-compose.prod.yml`](../../infra/docker/docker-compose.prod.yml)             | **PROD overlay** — hardening (Redis `--requirepass`, `restart: always`)                                 | **internal services stay internal — NO new `ports:`** |
| [`infra/docker/docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml)               | **DEV overlay** — opens `5432`/`6379`, adds pgAdmin `5050`                                              | yes — local debugging only                            |
| [`infra/docker/docker-compose.infra.yml`](../../infra/docker/docker-compose.infra.yml)           | **INFRA-only** — pg/redis/pgAdmin for host-run apps (`pnpm dev`)                                        | yes — host-dev only                                   |
| [`infra/docker/docker-compose.connectors.yml`](../../infra/docker/docker-compose.connectors.yml) | **CONNECTORS** — local SIEM/SOAR stack (Wazuh, Graylog, MISP, …) on its own `connectors` bridge network | yes — local dev only                                  |

Run from the **repo root** (build context is `../..`, i.e. the monorepo root) via
the `pnpm docker:*` scripts in [`package.json`](../../package.json) (`docker:dev`,
`docker:prod`, `docker:infra`, `docker:healthcheck`). **pnpm only, Node 22**
(`engines: node >=22 <25`, `packageManager: pnpm@10`).

---

## When to use

Use this skill when you are **adding a new service** to any `infra/docker/*.yml`
stack, for example:

- A new **internal backing service** for the app (e.g. a message broker, a cache,
  an object store, a worker) — goes in the **base** stack (or an overlay) and
  must stay on the `auraspear` network with **no host ports in prod**.
- A new **local-only tool** for developers (admin UI, mailcatcher, etc.) — goes
  in the **dev** overlay ([`docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml)),
  alongside the existing `pgadmin`.
- A new **security connector** for local integration testing (another SIEM/EDR/TI
  tool) — goes in [`docker-compose.connectors.yml`](../../infra/docker/docker-compose.connectors.yml)
  on the `connectors` bridge network.

**Do not** use this skill when:

- You are **changing an app image** (the `web`/`api` build) — that is a Dockerfile
  change; read [`rules/security/docker-security.md`](../../rules/security/docker-security.md)
  §1–§2 (multi-stage, non-root) and edit [`apps/api/Dockerfile`](../../apps/api/Dockerfile)
  / [`apps/web/Dockerfile`](../../apps/web/Dockerfile) instead.
- You only need to **add an env var** the service reads — that is an env change
  (see `skills/devsecops/add-env-variable.md` per AGENTS §11, and
  [`docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md) / `scripts/install/setup-env.mjs`).
- You are tempted to **publish `postgres`/`redis` (or your new internal service)
  to the host in prod** to "make it reachable". That is a **review blocker**
  (`docker-security.md` §5; CLAUDE.md #65). Reach it over the `auraspear` network.

---

## Files to inspect first (copy the closest one)

Open these and **copy the nearest existing service** rather than writing YAML from
scratch — the repo already encodes every convention you need.

| Concern                                                                 | Reference to copy                                                                                                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Internal service, **no host ports**, named volume, network, healthcheck | [`docker-compose.yml`](../../infra/docker/docker-compose.yml) → `postgres` (L14–30) and `redis` (L32–44)                                                                        |
| App service with host port + `depends_on: service_healthy` + `env_file` | [`docker-compose.yml`](../../infra/docker/docker-compose.yml) → `api` (L46–83)                                                                                                  |
| HTTP healthcheck (`wget --spider`)                                      | [`docker-compose.yml`](../../infra/docker/docker-compose.yml) → `api` (L70–83); [`apps/api/Dockerfile`](../../apps/api/Dockerfile) `HEALTHCHECK` (L47–48)                       |
| Fail-closed required secret (`:?`)                                      | [`docker-compose.yml`](../../infra/docker/docker-compose.yml) → `POSTGRES_PASSWORD:?…` (L21)                                                                                    |
| Prod overlay that adds **no** new ports, only hardening                 | [`docker-compose.prod.yml`](../../infra/docker/docker-compose.prod.yml) (whole file)                                                                                            |
| Auth-aware healthcheck override in prod                                 | [`docker-compose.prod.yml`](../../infra/docker/docker-compose.prod.yml) → `redis` (L13–28)                                                                                      |
| Dev-only service (host ports OK)                                        | [`docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml) → `pgadmin` (L20–34)                                                                                      |
| Named volumes + isolated bridge network                                 | [`docker-compose.connectors.yml`](../../infra/docker/docker-compose.connectors.yml) → `networks`/`volumes` (L24–55)                                                             |
| `.dockerignore` env globs (do not weaken)                               | root [`.dockerignore`](../../.dockerignore) (L14–17), [`apps/api/.dockerignore`](../../apps/api/.dockerignore) (L4–6), [`apps/web/.dockerignore`](../../apps/web/.dockerignore) |
| The `pnpm docker:*` scripts (how stacks are layered)                    | [`package.json`](../../package.json) `scripts` (`docker:dev`/`:prod`/`:infra`/`:down`/`:healthcheck`)                                                                           |
| Health-report tooling                                                   | `scripts/ci/docker-healthcheck.mjs` (`pnpm docker:healthcheck`)                                                                                                                 |

The canonical hard constraints for every line you write are in
[`rules/security/docker-security.md`](../../rules/security/docker-security.md).
**Read it before writing a single service.**

---

## Exact step-by-step implementation

### 0. Branch first

Never work on `main` (AGENTS §8; [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md)).

```bash
git switch -c feat/docker-<service-name>
```

### 1. Decide which stack the service belongs to

- **Internal backing service for the app** → **base** ([`docker-compose.yml`](../../infra/docker/docker-compose.yml)),
  so it ships in both dev and prod runs. Add prod hardening (and **only** hardening,
  never new ports) in the prod overlay if needed.
- **Local-only developer tool** → **dev overlay** ([`docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml)),
  next to `pgadmin`. Host ports are fine here.
- **Security connector for local testing** → [`docker-compose.connectors.yml`](../../infra/docker/docker-compose.connectors.yml)
  on the `connectors` network.

> Decision rule: _if production needs it, it goes in base. If only a developer's
> laptop needs it, it goes in an overlay/connectors file._ Putting a debug tool in
> base (or a published port in prod) is the mistake `docker-security.md` §5 forbids.

### 2. Write the service block (copy `postgres`/`redis`, then adapt)

Use a **pinned, specific image tag** (never `:latest` for a service you depend on —
note `postgres:16-alpine`, `redis:7-alpine`). Set `container_name: auraspear-<svc>`,
`restart: unless-stopped`, and attach the shared network `networks: [auraspear]`.

```yaml
<service>:
  image: <name>:<pinned-tag> # specific tag, NOT :latest (cf. postgres:16-alpine)
  container_name: auraspear-<service>
  restart: unless-stopped # prod overlay may bump to `always`
  # Secrets come from the root .env at RUNTIME — never baked into the image.
  # Required secret? use :? so a missing value fails the stack at boot:
  environment:
    <SVC>_PASSWORD: ${<SVC>_PASSWORD:?<SVC>_PASSWORD is required}
  volumes:
    - <service>data:/var/lib/<service> # NAMED volume (declared in top-level volumes:)
  networks: [auraspear] # shared internal network — NOT host-published
  # NO `ports:` for an internal service in the base/prod stack (see §3 below).
  healthcheck: # REQUIRED for every long-running service
    test: ['CMD', '<in-container health probe>']
    interval: 10s
    timeout: 5s
    retries: 5
    # start_period: 25s   # add if the service is slow to become ready (cf. api)
```

Pick a healthcheck `test` that runs **inside the container** with no extra tooling:

- TCP/DB-style: a client ping the image already ships — e.g. `pg_isready` for
  postgres (`docker-compose.yml:25–30`), `redis-cli ping` for redis (`:40–44`).
- HTTP: `wget --no-verbose --tries=1 --spider http://localhost:<port>/<health>`
  (mirror `api`, `docker-compose.yml:70–83`). The probed health endpoint must
  **not** leak version or internal URLs (CLAUDE.md #60/#81; `security-rules.md` §10).

### 3. Networking — internal by default, host ports ONLY where allowed

- Attach `networks: [auraspear]` (base) so services reach each other by **service
  name** (e.g. `postgres:5432`, `redis:6379` — see the api's `DATABASE_URL`/`REDIS_HOST`,
  `docker-compose.yml:64–66`). The `auraspear` network is declared at the bottom
  of the base file (`:111–113`).
- **For an internal service, add NO `ports:` in the base or prod stack.** Postgres
  and Redis publish nothing in base on purpose (header comment, `docker-compose.yml:8–9`).
  Only `web` (3000) and `api` (4000) are host-reachable.
- **If a developer needs host access**, publish the port **only in the dev
  overlay** ([`docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml)) —
  exactly how `5432`/`6379` are opened there (L11–19), never in base/prod:

  ```yaml
  # docker-compose.dev.yml — DEV ONLY
  services:
    <service>:
      ports:
        - '${<SVC>_PORT:-NNNN}:NNNN'
  ```

### 4. Volume — named, declared at the top level

Use a **named** volume, not a host bind mount, for service data (matches `pgdata`,
`redisdata`, `pgadmin_data`). Declare it in the file's top-level `volumes:` map so
it is managed by Compose and survives a normal `pnpm docker:down` (which is `down`
**without** `-v`, `package.json` `docker:down`):

```yaml
volumes:
  pgdata:
  redisdata:
  <service>data: # ← add yours here (same file the service lives in)
```

> Read-only config bind mounts are fine where the connectors stack does it
> (`...:ro`, e.g. `docker-compose.connectors.yml:85`), but **persistent data**
> belongs in a named volume.

### 5. Wire dependents with `depends_on: condition: service_healthy`

If another service needs this one ready first, gate on the healthcheck — never a
bare `depends_on` (which only waits for _start_, not _ready_). Mirror `api` →
`postgres`/`redis` (`docker-compose.yml:53–55`) and `web` → `api` (`:97–98`):

```yaml
<dependent>:
  depends_on:
    <service>: { condition: service_healthy }
```

### 6. Prod overlay — hardening only, never new ports

If the service needs prod hardening (auth password, `restart: always`, auth-aware
healthcheck), add it in [`docker-compose.prod.yml`](../../infra/docker/docker-compose.prod.yml)
by **re-declaring only the changed keys** — mirror how `redis` gets `--requirepass`
and an auth healthcheck there (L13–28). **Add no `ports:`.** Keep the fail-closed
`:?` guards.

### 7. Keep `.dockerignore` tight (don't let `.env` into the build context)

A **service** added via `image:` (no `build:`) needs no `.dockerignore` change. But
**if your service has a `build:` context**, confirm the relevant `.dockerignore`
still excludes every env file and build noise:

- root [`.dockerignore`](../../.dockerignore) (`**/.env`, `**/.env.*`, keep
  `!**/.env.example`; `node_modules`, `.git`, `*.md`, …) — L14–17 for the env globs.
- [`apps/api/.dockerignore`](../../apps/api/.dockerignore) / [`apps/web/.dockerignore`](../../apps/web/.dockerignore)
  (`.env`, `.env.*`, `!.env.example`, plus `Dockerfile*` / `docker-compose*.yml`).

**Never weaken these globs** to "just get a file in" (`docker-security.md` §4).

### 8. Update the health-report file list if the service is in dev base

`scripts/ci/docker-healthcheck.mjs` (`pnpm docker:healthcheck`) inspects the
base + dev stacks (`-f docker-compose.yml -f docker-compose.dev.yml`). A new
service with a healthcheck is picked up automatically; no edit needed unless you
add a **new compose file** the script must also pass with `-f`.

---

## Validation commands (real `pnpm` commands, run from repo root)

**Never claim a service "works" or a gate "green" without running it** (AGENTS §5;
[`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)). `pnpm`
only, Node 22.

```bash
# 1. Compose syntax + resolved config — render the FULLY MERGED stacks and read them.
#    `config` fails loudly on YAML errors, bad keys, and unset required vars.
docker compose -f infra/docker/docker-compose.yml \
               -f infra/docker/docker-compose.dev.yml config        # dev (mirrors pnpm docker:dev)
docker compose -f infra/docker/docker-compose.yml \
               -f infra/docker/docker-compose.prod.yml config       # prod (mirrors pnpm docker:prod)

# 2. PROVE no host ports leak for internal services in the PROD render.
#    Expect ONLY web (3000) and api (4000). Anything else on postgres/redis/your
#    internal service is a review blocker (docker-security.md §5).
docker compose -f infra/docker/docker-compose.yml \
               -f infra/docker/docker-compose.prod.yml config | grep -nE 'published|target' || true

# 3. Bring the stack up and verify health (dev).
pnpm docker:dev                 # build + up -d (base + dev overlay)
pnpm docker:healthcheck         # scripts/ci/docker-healthcheck.mjs — ✗ on any unhealthy service
docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.dev.yml ps

# 4. HARD security gate — no secret slipped into a compose default or build context.
pnpm scan:secrets               # gitleaks (HARD gate, AGENTS §5)

# 5. If your service has a build: context, the image must build (HARD gate).
pnpm scan:trivy                 # advisory fs/image scan (vuln,secret,misconfig)

# 6. Tear down WITHOUT destroying data (no -v — never -v without documented approval).
pnpm docker:down
```

If you state the stack is healthy, the `pnpm docker:healthcheck` output (all `✓`)
is the proof — paste it. Do not say "should work" (AGENTS §13).

---

## Docs to update

- **[`rules/security/docker-security.md`](../../rules/security/docker-security.md)**
  — if the new internal service has its own port/secret rules, add it to §3
  (healthchecks), §4 (secrets), or §5 (internal-ports) so the hard-constraint doc
  stays complete. At minimum confirm your service satisfies the existing checklist.
- **[`docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md)** — document the new service in
  the deploy topology (what it is, which stack/overlay, internal vs host-reachable).
- **[`docs/OPERATIONS.md`](../../docs/OPERATIONS.md)** — operational notes
  (healthcheck, volume to back up, how to inspect it) for whoever runs the stack.
- **[`docs/architecture/RUNTIME.md`](../../docs/architecture/RUNTIME.md)** — if the
  service changes the runtime/service graph, update it there.
- **[`docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md)** — if the service introduces
  a new env var (and its `.env.example` entry via `scripts/install/setup-env.mjs`).
- **[`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)** — only if you
  added a **new** `pnpm docker:*` script (no edit if you reused existing ones).

---

## Security checks (do not ship without these)

- **No host ports for internal services in prod.** A `ports:` line on
  `postgres`/`redis`/`pgadmin`/your internal service in the base or prod stack is a
  **review blocker** (CLAUDE.md #65; `docker-security.md` §5). Publish a debug port
  **only** in the dev overlay. Render-and-grep the prod config (validation step 2)
  to prove only `web`/`api` are exposed.
- **No secrets in the image or in compose defaults.** Secrets enter at **runtime**
  via the root `.env` (`env_file`, `docker-compose.yml:59–61`) and `environment:`.
  Never put a real credential in an `ENV`/`ARG`, a compose default, or a committed
  file. Use the fail-closed `${VAR:?msg}` form for required secrets (`:21`). No
  all-zeros / placeholder secrets, no `??` fallbacks (`security-rules.md` §11;
  CLAUDE.md #24/#53; `secret-handling.md`). Run `pnpm scan:secrets` before commit.
- **`.dockerignore` stays tight.** Never weaken the `.env`/`.env.*` globs (keep
  `!*.example`); never `COPY` a `.env` into an image (`docker-security.md` §4).
- **Healthcheck required; health endpoint must not disclose.** Every long-running
  service declares a `healthcheck`; the probed endpoint must not leak version or
  internal URLs (CLAUDE.md #60/#81; `security-rules.md` §10).
- **Pin the image tag.** Use a specific tag (`postgres:16-alpine`), not `:latest`,
  for anything you depend on — `:latest` breaks reproducible, audited builds and
  defeats Trivy pinning.
- **Never `docker compose down -v`** (or `docker volume rm`, `system prune
--volumes`) without explicit, documented approval — `-v` deletes the named
  volumes (the database/cache). It is in the `rm -rf` class (AGENTS §8;
  `docker-security.md` §6; `branch-safety.md`). Routine teardown is `pnpm docker:down`.
- **Don't trade a security invariant for a working stack.** A compose change must
  not excuse dropping `tenantId` scoping, `@RequirePermission(...)`, auth/secret
  checks, AI approval-required gating, or the never-render-raw-AI-HTML rule
  (AGENTS §6–§7).

## Common mistakes

- **Adding `ports:` to an internal service in base/prod** "so I can reach it" —
  use the dev overlay; keep base/prod internal (`docker-security.md` §5).
- **Bare `depends_on`** instead of `condition: service_healthy` — the dependent
  starts before the service is _ready_. Gate on the healthcheck (`docker-compose.yml:53–55`).
- **No healthcheck** — the container reports "up" while wedged, and
  `pnpm docker:healthcheck` / `service_healthy` can't see it. Always add one (§3).
- **`image: …:latest`** for a depended-on service — unpinned, non-reproducible.
  Pin a specific tag.
- **Host bind mount for persistent data** instead of a **named** volume declared in
  top-level `volumes:` — breaks the managed-volume model and `pnpm docker:down` safety.
- **Secret in a compose default / `ENV` / `ARG`** — e.g. `PASSWORD: changeme`.
  Use `${VAR:?msg}` and inject at runtime. (Note: the connectors stack's `admin/admin`
  defaults are **local-dev-only** on the isolated `connectors` network — never copy
  that pattern into base/prod app services.)
- **Forgetting the fail-closed `:?`** on a required prod secret — a silently-empty
  password is worse than a boot failure. Match `POSTGRES_PASSWORD:?…` (`:21`).
- **Weakening `.dockerignore`** to sneak a file into the build context — re-tighten
  it; never let `.env` in (`docker-security.md` §4).
- **Editing the wrong overlay** — putting prod hardening in `docker-compose.dev.yml`,
  or a debug tool in base. Base = production-shipped; overlays = environment-specific.
- **Running `pnpm docker:clean`** (which is `down -v`) to "reset" — that destroys
  `pgdata`/`redisdata`. Prefer re-running the api entrypoint migrate/seed.
- **Claiming green without rendering/running** — `docker compose config` +
  `pnpm docker:healthcheck` + `pnpm scan:secrets` are the proof. "Should work" is not.

---

## Final checklist

- [ ] Branched off `main` (`feat/docker-<service>`); not committed/pushed unless asked.
- [ ] Service added to the **correct stack** (base = prod-shipped; dev/connectors = local).
- [ ] **Pinned image tag** (not `:latest`), `container_name: auraspear-<svc>`,
      `restart: unless-stopped`, `networks: [auraspear]`.
- [ ] **`healthcheck`** declared (in-container probe, no version/URL disclosure);
      dependents gate on `condition: service_healthy`.
- [ ] **Named volume** for persistent data, declared in top-level `volumes:`.
- [ ] **No `ports:`** for an internal service in base/prod; any host port is in the
      **dev overlay only**. Prod render proves only `web`/`api` are published.
- [ ] **No secret** in `image`/`ENV`/`ARG`/compose default; runtime injection via
      `.env`; required secrets use fail-closed `${VAR:?msg}`; no all-zeros / `??` fallback.
- [ ] **`.dockerignore` not weakened**; `.env`/`.env.*` still excluded (kept
      `!*.example`); no `.env` copied into a build context.
- [ ] Ran `docker compose ... config` (dev + prod), `pnpm docker:dev` +
      `pnpm docker:healthcheck` (all `✓`), `pnpm scan:secrets` (clean), and
      `pnpm scan:trivy` if a `build:` context was added — **output pasted**.
- [ ] Tore down with `pnpm docker:down` (**no `-v`**); no volume deletion without
      documented approval.
- [ ] Docs updated: `docker-security.md` (if rules changed) + `docs/DEPLOYMENT.md` /
      `docs/OPERATIONS.md` (+ `RUNTIME.md` / `ENVIRONMENT.md` / `COMMANDS_MEMORY.md` if applicable).
- [ ] No security/tenant/RBAC/AI invariant traded for a working stack.

---

> **Final response format** (AGENTS §13): end with Branch / Commits / Files created /
> Files updated / Commands run / Green checks / Failed checks / Blockers / Risks /
> Next steps. Do not say "all green" unless every required gate actually passed — for
> Docker that means the rendered `config`, the `pnpm docker:healthcheck` ✓ output, and
> `pnpm scan:secrets` clean, not "should work."
