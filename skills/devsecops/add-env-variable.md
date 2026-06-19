# Skill: Add an environment variable (end-to-end)

> **Read [`AGENTS.md`](../../AGENTS.md) first** — the loading order (§1), the
> command map (§4), **§5 "Validation gates"** ("Never claim 'all green' unless the
> required gates actually passed — run them"), **§6 Security invariants** (secrets:
> _"never commit secrets; only `_.example` env files. No fallback production
secrets."*), and **§8 Branch & safety** (*"Prove before removing files/deps/env
vars."*). Then read the hard constraints behind this skill:
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rules **#24** (no hardcoded/
fallback secrets — fail loudly), **#31** (no `NODE_ENV`-gated security skips),
**#53** (no zero-entropy/placeholder secrets in `.env.example`; schema must
`.refine()`-reject all-zero), **#54** (seed scripts have no fallback passwords),
**#56** (no `NODE_ENV` security bypass), **#58** (`NODE_ENV`defaults to`production`), **#64** (OIDC vars group-validated), **#83** (`CORS_ORIGINS`
rejects localhost in prod). Sibling onboarding:
[`skills/`](../), [`rules/`](../../rules/) (especially
[`rules/security/`](../../rules/security/) and
[`rules/global/branch-safety.md`](../../rules/global/branch-safety.md)),
[`memory/`](../../memory/) (commands →
[`COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)),
[`context/`](../../context/), [`docs/`](../../docs/) (the authoritative matrix →
[`docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md)).
>
> **No AI agent may edit first and understand later.** An env variable is a
> security surface on a multi-tenant SOC platform. The backend's Zod schema
> (`apps/api/src/config/env.validation.ts`) is enforced **at boot** — a wrong shape
> means the API refuses to start. A secret committed to a `*.example` file is a
> credential leak that gitleaks will (rightly) block. Mirror the existing variables;
> do not invent a new pattern.

This recipe adds one new environment variable everywhere it must exist so the app
boots, Docker runs, secrets stay out of git, and
[`docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md) stays the single source of
truth. The wiring already in the repo is your template — copy it.

The platform has **three** env "planes". Identify which one your variable belongs
to before you touch anything:

| Plane                  | Read by                                                                  | Files involved                                                                                                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend (NestJS)**   | `@nestjs/config` + `validateEnvironment` at boot                         | `apps/api/src/config/env.validation.ts`, `apps/api/.env.example`, `.env.example` (root, for Docker), `infra/docker/docker-compose.yml`                                                               |
| **Frontend (Next.js)** | `process.env['…']` (server) or `NEXT_PUBLIC_*` (browser, baked at build) | `apps/web/.env.example`, `.env.example` (root), `apps/web/next.config.ts` (if it affects CSP), `infra/docker/docker-compose.yml` (build `args:` for `NEXT_PUBLIC_*`, `environment:` for server-only) |
| **Seed / tooling**     | `process.env['…']` in `apps/api/prisma/seed.ts` (via `requireEnv`)       | `apps/api/.env.example`, root `.env.example`, `scripts/install/setup-env.mjs` (only if it's a generated secret)                                                                                      |

---

## When to use

Use this skill when **any** of these is true:

- A new backend feature needs a config value (a URL, a flag, a tuning number, a
  secret/key) read via `ConfigService` in `apps/api/src`.
- A new frontend value must reach the browser (`NEXT_PUBLIC_*`) or the Next.js
  server/proxy only (no prefix, e.g. like `BACKEND_API_URL`).
- The seed script (`apps/api/prisma/seed.ts`) or an install script needs a value.
- You are adding a connector default, an OIDC/AWS field, or a rate-limit knob.

Do **not** use this skill to put per-tenant connector credentials in env — those
are stored **encrypted in the database** (AES-256-GCM), not in `.env`
(`apps/api/CLAUDE.md` §"Secrets encrypted at rest";
`env.validation.ts` lines 117–126 are _fallback defaults only_).

---

## Files to inspect first (read before editing)

1. [`apps/api/src/config/env.validation.ts`](../../apps/api/src/config/env.validation.ts)
   — the Zod `envSchema`. Note the existing patterns: `.url()`,
   `z.coerce.number().default(…)`, `z.nativeEnum(…)`, `.refine()` for security
   (all-zeros rejection on `JWT_SECRET`/`CONFIG_ENCRYPTION_KEY`, prod-only length
   on `REDIS_PASSWORD`, localhost rejection on `CORS_ORIGINS`), and `.superRefine()`
   for all-or-nothing groups (OIDC). Enums come from `../common/enums`
   (`NodeEnvironment`, `LogLevel`).
2. [`apps/api/.env.example`](../../apps/api/.env.example) — the api template
   (committed). Secrets have **empty** values with generate-instructions in comments.
3. [`apps/web/.env.example`](../../apps/web/.env.example) — the web template
   (committed). `NEXT_PUBLIC_*` = browser, no prefix = server-only.
4. [`.env.example`](../../.env.example) and
   [`.env.production.example`](../../.env.production.example) — the **root** Docker
   templates (committed). Root `.env` is what `docker compose` interpolates.
5. [`docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md) — the authoritative matrix
   (backend table, seeding table, docker-only list, frontend table, checklist).
6. [`scripts/install/setup-env.mjs`](../../scripts/install/setup-env.mjs) — the
   `GENERATORS` map (keyed by var name) that auto-fills empty secrets, and `TARGETS`
   (which `.env` files it creates).
7. [`infra/docker/docker-compose.yml`](../../infra/docker/docker-compose.yml) —
   `api` service `env_file` + `environment:`, `web` service build `args:` +
   `environment:`. Plus the overlays
   [`docker-compose.dev.yml`](../../infra/docker/docker-compose.dev.yml) and
   [`docker-compose.prod.yml`](../../infra/docker/docker-compose.prod.yml).
8. [`apps/web/next.config.ts`](../../apps/web/next.config.ts) — only if your
   frontend var is a URL that the CSP `connect-src` allowlist must include
   (`buildAllowedConnectSources()`).
9. [`.gitignore`](../../.gitignore) lines 27–36 — confirms `.env*` is ignored and
   only `*.example` / `*.example`-pattern files are allowed through.

> **Prove the variable is actually new.** Search first so you do not duplicate or
> shadow an existing one:
>
> ```bash
> grep -rn "MY_NEW_VAR" apps/ scripts/ infra/ docs/ .env.example .env.production.example
> ```

---

## Exact step-by-step implementation

> Branch first (never work on `main` —
> [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md)):
>
> ```bash
> git switch -c feat/env-MY_NEW_VAR
> ```
>
> Naming: `SCREAMING_SNAKE_CASE`. Browser-exposed frontend vars **must** start with
> `NEXT_PUBLIC_`; server-only vars **must not**.

### Path A — Backend variable (NestJS)

1. **Add it to the Zod schema** in
   `apps/api/src/config/env.validation.ts`, inside `z.object({ … })`, in the matching
   commented section. Pick the validator by intent — mirror a sibling:

   ```ts
   // a URL (optional connector default)
   MY_SERVICE_URL: z.string().url().optional(),

   // a tuning number with a default (NOTE: env values are strings → coerce)
   MY_TIMEOUT_MS: z.coerce.number().default(30_000),

   // an enum-backed value (define the enum in src/common/enums, import it — never
   //   a raw string-literal union; apps/api/CLAUDE.md rule #12)
   MY_MODE: z.nativeEnum(MyMode).default(MyMode.SAFE),
   ```

   - **If it is a secret/key**, give it strength validation **and reject zero-entropy
     values** (rule #53). Mirror `JWT_SECRET` / `CONFIG_ENCRYPTION_KEY`:
     ```ts
     MY_SIGNING_KEY: z
       .string()
       .length(64)
       .regex(/^[\da-f]{64}$/i, {
         message:
           "MY_SIGNING_KEY must be exactly 64 hex characters. Generate: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
       })
       .refine(value => !/^0+$/.test(value), {
         message: 'MY_SIGNING_KEY must not be all zeros — generate a real key',
       }),
     ```
   - **If it must be group-validated** (all-or-nothing, like OIDC) or stricter in
     production (like `CORS_ORIGINS`/`REDIS_PASSWORD`), add the cross-field check in
     the existing `.superRefine((data, ctx) => { … })` block (lines 134–151) — do
     **not** create a second `.superRefine`. Use `process.env.NODE_ENV` for
     prod-only refinements exactly as `REDIS_PASSWORD` (lines 15–17) does. **Never**
     add a check that _skips_ security based on `NODE_ENV` (rules #31, #56).
   - **Defaults must be production-safe** (rule #58). A new flag that gates security
     must default to the _secure_ value.

2. **Consume it** where needed via the injected `ConfigService` — never read
   `process.env` directly in a service. Match the existing call site
   (`apps/api/src/modules/connectors/connectors.service.ts:72`):

   ```ts
   const value = this.configService.get<string>('MY_SERVICE_URL')
   ```

   `EnvironmentConfig` (the `z.infer` type at the bottom of the file) is the source
   of truth for the value's type.

3. **Add it to `apps/api/.env.example`** in the matching section. **Secrets get an
   empty value + a generate comment** (never a real or placeholder-entropy value):

   ```dotenv
   # ---------- My feature ----------
   # MUST be exactly 64 hex characters. REQUIRED — generate before first run:
   #   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   MY_SIGNING_KEY=
   # Non-secret with a safe default is fine to show:
   MY_TIMEOUT_MS=30000
   ```

4. **Add it to the root `.env.example`** (and, if it changes for prod, to
   `.env.production.example`) — this is what `docker compose` interpolates. Keep the
   same empty-secret convention.

5. **Wire it into Docker** in `infra/docker/docker-compose.yml`:
   - Runtime **secrets** for the API arrive via `env_file: ../../.env` (lines
     59–61) — usually **nothing to add** if it's in the root `.env`.
   - Add an explicit `environment:` line only for values composed/overridden by
     compose (mirror `DATABASE_URL`/`REDIS_HOST` on the `api` service, lines 62–66),
     e.g. `MY_TIMEOUT_MS: ${MY_TIMEOUT_MS:-30000}`.
   - For prod-only requirements, use the fail-fast form in
     `docker-compose.prod.yml` (mirror
     `${REDIS_PASSWORD:?REDIS_PASSWORD is required in production}`).

6. **If it is a generated secret**, add a generator to `scripts/install/setup-env.mjs`
   `GENERATORS` map so `pnpm setup:env` auto-fills it when empty (mirror
   `CONFIG_ENCRYPTION_KEY: hex32`, lines 18–25):

   ```js
   MY_SIGNING_KEY: hex32, // exactly 64 hex
   ```

   The key name **must exactly match** the `.env.example` key. `setup:env` only
   fills keys whose value is empty (or with `--force`).

7. **If it is used by the seeder**, read it in `apps/api/prisma/seed.ts` via the
   existing `requireEnv('MY_VAR')` helper (mirror `SEED_DEFAULT_PASSWORD`,
   seed.ts:95). **No `??` fallback** (rules #24, #54) — fail loudly if missing.

### Path B — Frontend variable (Next.js)

1. **Decide the scope.** Browser-visible → `NEXT_PUBLIC_*` (baked into the bundle at
   **build** time, so it must be a compose **build `arg`**). Server/proxy-only →
   **no** prefix (mirror `BACKEND_API_URL`). Never put a secret in `NEXT_PUBLIC_*` —
   it ships to every browser.

2. **Add it to `apps/web/.env.example`** in the matching section, with a comment on
   scope:

   ```dotenv
   # client-side (browser) — baked at build time
   NEXT_PUBLIC_MY_FLAG=false
   # server-only (Next proxy) — NOT exposed to the browser
   MY_INTERNAL_URL=http://api:4000/api/v1
   ```

3. **Add it to the root `.env.example`** (frontend wiring section) too — the root
   `.env` feeds the compose build args / web env.

4. **Wire it into Docker** in `infra/docker/docker-compose.yml`:
   - `NEXT_PUBLIC_*` → add under the `web` service **`build.args:`** (mirror lines
     91–94), e.g. `NEXT_PUBLIC_MY_FLAG: ${NEXT_PUBLIC_MY_FLAG:-false}`.
   - server-only → add under the `web` service **`environment:`** (mirror
     `BACKEND_API_URL`, line 102).

5. **CSP:** if the new var is a URL the browser must call, confirm
   `apps/web/next.config.ts` `buildAllowedConnectSources()` already covers it (it
   reads `NEXT_PUBLIC_API_URL`, `BACKEND_API_URL`, `NEXT_PUBLIC_WS_URL`). A brand-new
   outbound origin must be added to that allowlist or the browser will block the
   request.

### Path C — Update the docs matrix (always, regardless of plane)

Add a row to the correct table in [`docs/ENVIRONMENT.md`](../../docs/ENVIRONMENT.md)
(Backend / Seeding / Docker-compose-only / Frontend), filling **Required**,
**Secret**, **Default**, and **Validation (enforced at boot)** so the doc matches
the schema exactly. If it's a pre-first-run secret, also add it to the **"Quick
checklist before first run"** at the bottom.

---

## Validation commands (run these — do not assume)

Run from the repo root. **pnpm only**, Node 22 (`AGENTS.md` §4).

```bash
# 0. Prove the var is wired everywhere it should be (and nowhere it shouldn't leak)
grep -rn "MY_NEW_VAR" apps/api/src/config apps/api/.env.example apps/web/.env.example \
  .env.example .env.production.example scripts/install/setup-env.mjs \
  infra/docker docs/ENVIRONMENT.md

# 1. Regenerate local .env files / fill generated secrets (idempotent; never
#    overwrites an existing .env without --force)
pnpm setup:env

# 2. HARD GATE — typecheck. Backend ConfigService usage + EnvironmentConfig type,
#    web next.config.ts, and the schema all type-check here.
pnpm typecheck

# 3. HARD GATE — build (Next build bakes NEXT_PUBLIC_* and runs schema imports)
pnpm build

# 4. HARD GATE — no secrets committed. MUST be clean. If this flags your change,
#    you committed a real value into a *.example or .env file — remove it.
pnpm scan:secrets        # gitleaks detect --source . --redact --no-banner

# 5. Prove the backend actually boots with the new schema (fails loudly if the
#    value is missing/weak — that is the schema working as designed)
pnpm dev:api             # Ctrl-C once it logs "Nest application successfully started"

# 6. Prove Docker still interpolates (does NOT start containers)
docker compose -f infra/docker/docker-compose.yml config >/dev/null && echo "compose OK"

# 7. If the seeder consumes it:
pnpm prisma:seed

# 8. Advisory (run + annotate): lint/format/test
pnpm validate
```

> **Do not claim a gate is green unless you ran it and saw it pass** (`AGENTS.md`
> §5; [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)).
> Hard gates here: `pnpm typecheck`, `pnpm build`, gitleaks (`pnpm scan:secrets`).

---

## Docs to update

- **`docs/ENVIRONMENT.md`** — add the row to the right table + the first-run
  checklist (see Path C). This is mandatory, not optional.
- **`apps/api/.env.example`** and/or **`apps/web/.env.example`** — the committed
  templates (these _are_ the contract).
- **`.env.example`** (root) and **`.env.production.example`** if Docker/prod use it.
- If you added a generated secret: a one-line note that `pnpm setup:env` fills it.
- If the variable changes behavior described elsewhere (a feature in
  `docs/AI.md`, `docs/SECURITY.md`, etc.), update that doc too. Cross-check
  [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md).

---

## Security checks (non-negotiable)

- [ ] **No real secret in any committed file.** Secrets in every `*.example` have an
      **empty** value (`KEY=`) with generate-instructions in a comment (rule #53).
      `pnpm scan:secrets` is clean.
- [ ] **No placeholder/zero-entropy secret.** Secret schema entries `.refine()`-reject
      all-zero values, mirroring `JWT_SECRET`/`CONFIG_ENCRYPTION_KEY` (rule #53).
- [ ] **No fallback secret.** No `process.env['X'] ?? 'default'` and no `||` default
      for any secret in code or seed (rules #24, #54). Fail loudly at boot/seed.
- [ ] **No `NODE_ENV`-gated security bypass.** Refinements may be _stricter_ in prod
      (like `REDIS_PASSWORD`/`CORS_ORIGINS`) but must never _skip_ a check based on
      `NODE_ENV` (rules #31, #56). Defaults are production-safe (rule #58).
- [ ] **Browser secrets are impossible.** Nothing sensitive carries a `NEXT_PUBLIC_`
      prefix; server-only values carry no prefix.
- [ ] **`.gitignore` still protects `.env`.** You did not add an exception that lets a
      real `.env` through (only `*.example` is whitelisted — lines 35–36).
- [ ] **Group-validated vars stay all-or-nothing** (OIDC pattern, rule #64) if the var
      belongs to such a group.
- [ ] **No tenant/RBAC/auth invariant weakened.** An env flag must not become a switch
      that disables tenant scoping, `@RequirePermission`, auth, or AI approval-required
      gating (`AGENTS.md` §6, §7).

---

## Common mistakes

- **Forgetting `z.coerce`** on numbers/booleans. Env values are always strings; a bare
  `z.number()` will reject `"30000"`. Use `z.coerce.number()` (see
  `RATE_LIMIT_THROTTLE_TTL`).
- **Raw string-literal union** in the schema for an enum-like value — banned
  (`apps/api/CLAUDE.md` rule #12). Define an enum in `apps/api/src/common/enums`,
  import it, use `z.nativeEnum(...)`.
- **Reading `process.env` directly in a NestJS service** instead of
  `configService.get<T>('KEY')` — the schema/`EnvironmentConfig` type won't protect
  you, and you bypass boot validation.
- **Putting a secret in `apps/web` (`NEXT_PUBLIC_*`)** — it is baked into the client
  bundle and visible to every user.
- **Adding the var to only one `.env.example`.** A backend secret used by Docker must
  be in **both** `apps/api/.env.example` (local dev) **and** the root `.env.example`
  (compose). Missing the root copy = container boots with the value undefined.
- **Generated secret not registered in `setup-env.mjs`** — `pnpm setup:env` leaves it
  empty and the app fails to boot with a confusing error.
- **`NEXT_PUBLIC_*` added to compose `environment:` instead of build `args:`** — it
  won't be baked into the static bundle and will be `undefined` in the browser.
- **Committing a populated `.env`** — gitleaks blocks the hard gate; never bypass it.
- **Editing `docs/ENVIRONMENT.md` "Validation" column to something the schema doesn't
  enforce.** The doc must mirror `env.validation.ts`, not aspirations.
- **A second `.superRefine`** — extend the existing one (lines 134–151).

---

## Final checklist

- [ ] Branched off `main` (`feat/...`), `SCREAMING_SNAKE_CASE` name chosen.
- [ ] `grep` proved the var is new (no duplicate/shadow).
- [ ] Backend: added to `env.validation.ts` with the right validator + (if secret)
      strength + all-zeros `.refine()`; consumed via `ConfigService`.
- [ ] Frontend: correct scope (`NEXT_PUBLIC_` vs none); CSP allowlist checked if a URL.
- [ ] `apps/api/.env.example` and/or `apps/web/.env.example` updated (secrets empty +
      comment).
- [ ] Root `.env.example` (+ `.env.production.example` if prod-relevant) updated.
- [ ] `infra/docker/docker-compose.yml` (+ dev/prod overlays) wired:
      `env_file`/`environment` for backend, build `args`/`environment` for web.
- [ ] `scripts/install/setup-env.mjs` `GENERATORS` updated **iff** it's a generated
      secret.
- [ ] Seeder reads it via `requireEnv` with no fallback **iff** seed needs it.
- [ ] `docs/ENVIRONMENT.md` matrix row + first-run checklist updated.
- [ ] `pnpm setup:env` → `pnpm typecheck` → `pnpm build` → `pnpm scan:secrets` all
      pass; `pnpm dev:api` boots; `docker compose ... config` succeeds.
- [ ] No real secret committed; no fallback/zero-entropy secret; no `NODE_ENV`
      security bypass; no tenant/RBAC/auth/AI-safety invariant weakened.
- [ ] Final response uses the `AGENTS.md` §13 report format; no "all green" unless the
      hard gates actually passed.
