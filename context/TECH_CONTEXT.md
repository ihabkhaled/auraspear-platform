# TECH_CONTEXT.md — AuraSpear stack, monorepo & toolchain

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → `memory/*.md` → this `context/*.md`
> → `rules/**` → `skills/**` → `docs/**` → code. This file is step 3 for any task
> that touches the build system, runtime, TypeScript config, tooling, or "where
> does code live." Do not edit before you have read the rules and skills linked
> below.

This is the **technical orientation** file: the monorepo layout, the package
manager / task runner, the runtime, the TypeScript toolchain, and the validation
gates. For deep narrative read [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
(+ [`../docs/architecture/`](../docs/architecture/)) and the stable summary in
[`../memory/TECHNICAL_MEMORY.md`](../memory/TECHNICAL_MEMORY.md) — this file is the
concise map; those are the full story.

---

## What this area is

AuraSpear is a **pnpm + Turborepo monorepo** on **Node 22**, all TypeScript. Two
deployable apps share one workspace and one root lockfile:

- **`apps/web`** (`@auraspear/web`) — Next.js 16 (App Router) / React 19 /
  Tailwind 4 SOC console. TanStack Query, Zustand, next-intl (6 locales), Vitest
  (unit) + Playwright (e2e), Serwist (PWA). It **proxies every backend call**
  through `apps/web/src/app/api/*` routes — it never calls downstream tools
  directly.
- **`apps/api`** (`@auraspear/api`) — NestJS 11 on Express 5 / Prisma 7 +
  PostgreSQL / Redis (ioredis) BFF. Zod DTOs, JWT/JWKS auth, Pino logs, Helmet,
  Socket.IO, AWS Bedrock. Strict layering: Controller → Service → Repository →
  Utilities. Jest tests.

Three internal packages back the apps: `packages/shared` (`@auraspear/shared`,
cross-app contracts), `packages/config` (`@auraspear/config`, shared tooling
presets — `prettier/`, `tsconfig/base.json`), `packages/ai` (`@auraspear/ai`,
dependency-free AI safety/redaction/routing/eval/prompts).

Workspace wiring: [`../pnpm-workspace.yaml`](../pnpm-workspace.yaml)
(`apps/*`, `packages/*`, dependency overrides, pnpm-10 build-script allowlist),
[`../turbo.json`](../turbo.json) (task graph + caching),
[`../package.json`](../package.json) (root scripts, `engines.node >=22 <25`,
`packageManager: pnpm@10.30.3`), [`../tsconfig.base.json`](../tsconfig.base.json)
(strict flags inherited by every app/package).

---

## Where files live

```
auraspear-platform/
├── apps/
│   ├── web/   @auraspear/web — Next.js 16 SOC UI (+ src/app/api proxy)
│   └── api/   @auraspear/api — NestJS 11 BFF (+ prisma/)
├── packages/
│   ├── shared/  @auraspear/shared — cross-app contracts
│   ├── config/  @auraspear/config — prettier/ + tsconfig/base.json presets
│   └── ai/      @auraspear/ai     — AI safety/redaction/routing/eval/prompts
├── infra/docker/ — base + dev/prod/infra compose, Dockerfiles built from apps/*
├── scripts/      — install/ (doctor.mjs, setup-env.mjs, install.sh/.ps1) + ci/
├── docs/         — product, architecture, security, ai, tools, audit, decisions
├── rules/ skills/ memory/ context/ — AI onboarding system (this repo's brain)
└── .claude/agents/ .cursor/rules/  — Claude subagents + Cursor rules
```

- **Frontend code** → `apps/web/src` (pages in `app/(portal)/<route>/`, proxy
  routes in `app/api/`, components in `components/<domain>/`, page logic in
  `hooks/`, API calls in `services/`, state in `stores/`, `enums/`, `types/`,
  `i18n/`). Structure detailed in [`../apps/web/CLAUDE.md`](../apps/web/CLAUDE.md).
- **Backend code** → `apps/api/src` (domain modules in `modules/<module>/` with
  strict `controller → service → repository → prisma` layering plus
  `*.utilities.ts` / `*.types.ts` / `*.enums.ts` / `*.constants.ts` / `dto/`;
  cross-cutting in `common/`, env schema in `config/env.validation.ts`).
  Detailed in [`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md).
- **Database** → `apps/api/prisma` (`schema.prisma`, `migrations/`, seed).
- **Shared contracts** → `packages/shared/src`. **AI foundations** →
  `packages/ai/src`.
- **Docker** → `infra/docker` (compose) + `apps/web/Dockerfile`,
  `apps/api/Dockerfile` (+ `Dockerfile.dev`), built with the **repo root** as
  context.
- **CI** → [`../.github/`](../.github/) workflows. **Scripts** → `scripts/install`
  (`doctor.mjs`, `setup-env.mjs`) and `scripts/ci`.

> The module/route sets grow. Run `ls apps/api/src/modules` and
> `ls "apps/web/src/app/(portal)"` for the live inventory — see
> [`./PRODUCT_CONTEXT.md`](./PRODUCT_CONTEXT.md) for the domain → module/route map.

### Toolchain facts (don't guess — these are real)

- **Package manager**: **pnpm only** (`pnpm@10.30.3`). One root `pnpm-lock.yaml`;
  never introduce `npm`/`yarn` lockfiles. Note: scripts _inside_ `apps/api` and
  `apps/web` `package.json` are written with `npm run …` (run them via pnpm at the
  root, e.g. `pnpm --filter @auraspear/api start:dev`).
- **Task runner**: **Turborepo** — root scripts (`dev`, `build`, `lint`,
  `typecheck`, `test`) fan out via `turbo run …`. `build`/`lint`/`typecheck`/
  `test` depend on `^build`; `dev` is persistent and uncached.
- **Runtime**: **Node 22 LTS** (`engines: node >=22 <25`).
- **TypeScript**: `tsc --noEmit` (`pnpm typecheck`) is the **blocking** gate.
  `tsgo` (`@typescript/native-preview`, `pnpm typecheck:fast`) is the **advisory**
  fast path — never substitute it for the blocking gate. Both apps extend the
  strict `tsconfig.base.json` (`strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, etc.). web targets ES2020
  / ESNext+bundler / `jsx: preserve`; api targets ES2022 / CommonJS with
  decorators.

---

## What rules apply (read before editing)

Always load `rules/global/*`, then the area rules for your task:

- **Global:** [`../rules/global/absolute-rules.md`](../rules/global/absolute-rules.md),
  [`branch-safety.md`](../rules/global/branch-safety.md),
  [`repo-navigation.md`](../rules/global/repo-navigation.md),
  [`validation-gates.md`](../rules/global/validation-gates.md).
- **Testing / gates:** [`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md),
  [`test-strategy.md`](../rules/testing/test-strategy.md),
  [`e2e-rules.md`](../rules/testing/e2e-rules.md).
- **Security (incl. Docker/deps):** [`../rules/security/`](../rules/security/) —
  `security-rules.md`, `secret-handling.md`, `docker-security.md`,
  `dependency-audit.md`, `ai-security.md`.
- **Area rules** when your change reaches into an app:
  [`../rules/frontend/`](../rules/frontend/), [`../rules/backend/`](../rules/backend/),
  [`../rules/ai/`](../rules/ai/).

**Invariants that govern every technical change (from [`../AGENTS.md`](../AGENTS.md) §6–8):**

- **pnpm only · Node 22** — no other package manager, no other runtime.
- **No `any`** — `@typescript-eslint/no-explicit-any: error`; no
  `// eslint-disable`, `@ts-ignore`, or `@ts-expect-error`. Fix the root cause.
- **Tenant isolation** — every tenant-owned query/`update`/`delete` is scoped by
  `tenantId` (`where: { id, tenantId }`). No cross-tenant data, ever.
- **RBAC** — every backend endpoint has `@RequirePermission(...)`; every frontend
  surface mirrors the permission enum + proxy route. Never bypass.
- **No auth / secret / permission bypass** in any environment (no `NODE_ENV`
  shortcuts); secrets are env-loaded with no fallbacks; connector creds are
  AES-256-GCM encrypted at rest.
- **AI safety** — destructive AI actions are **approval-required** (persist an
  `ApprovalRequest` before executing); **never render raw AI output as HTML**;
  output carries provenance; redact PII/secrets before model calls.
- **Branch first** — never commit directly to `main`; never run destructive
  commands (`rm -rf`, `git reset --hard`, `docker compose down -v`) unless
  explicitly required and documented.

---

## What skills apply (recipes for the work)

Match your task to a recipe in [`../skills/`](../skills/):

- Add / upgrade a dependency → [`../skills/devsecops/upgrade-dependency.md`](../skills/devsecops/upgrade-dependency.md)
- Add an env variable → [`../skills/devsecops/add-env-variable.md`](../skills/devsecops/add-env-variable.md)
- Add a Docker service → [`../skills/devsecops/add-docker-service.md`](../skills/devsecops/add-docker-service.md)
- Add a CI gate → [`../skills/devsecops/add-ci-gate.md`](../skills/devsecops/add-ci-gate.md)
- Run a security scan → [`../skills/devsecops/run-security-scan.md`](../skills/devsecops/run-security-scan.md)
- Add a unit / e2e test → [`../skills/qa/add-unit-test.md`](../skills/qa/add-unit-test.md),
  [`add-e2e-test.md`](../skills/qa/add-e2e-test.md)
- Validate a release → [`../skills/qa/validate-release.md`](../skills/qa/validate-release.md)
- Record a decision (ADR) → [`../skills/docs/add-adr.md`](../skills/docs/add-adr.md)
- App-specific work → [`../skills/backend/`](../skills/backend/),
  [`../skills/frontend/`](../skills/frontend/), [`../skills/ai/`](../skills/ai/).

---

## What docs to read

- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) (+
  [`../docs/architecture/`](../docs/architecture/), esp. `MONOREPO.md`,
  `RUNTIME.md`, `BACKEND.md`, `FRONTEND.md`, `DEPLOYMENT.md`) — system shape.
- [`../docs/tools/TYPESCRIPT_AND_TSGO.md`](../docs/tools/TYPESCRIPT_AND_TSGO.md) —
  why `tsc` is blocking and `tsgo` is advisory.
- [`../docs/tools/LIBRARIES.md`](../docs/tools/LIBRARIES.md) (+
  `FRONTEND_LIBRARIES.md`, `BACKEND_LIBRARIES.md`, `DEVOPS_TOOLS.md`,
  `SECURITY_TOOLS.md`, `AI_TOOLS.md`) — the dependency catalog.
- [`../docs/decisions/`](../docs/decisions/) — ADRs:
  `ADR-0001-monorepo-pnpm-turborepo`, `ADR-0002-node-22-lts`,
  `ADR-0004-zod-resolver-peer`, `ADR-0005-typescript-and-tsgo`.
- [`../docs/ENVIRONMENT.md`](../docs/ENVIRONMENT.md),
  [`../docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md),
  [`../docs/MONOREPO_MIGRATION.md`](../docs/MONOREPO_MIGRATION.md), and the central
  index [`../docs/DOCS_INDEX.md`](../docs/DOCS_INDEX.md).
- [`../memory/TECHNICAL_MEMORY.md`](../memory/TECHNICAL_MEMORY.md) +
  [`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md) — stable truths
  and the full command list.

---

## Common mistakes

- **Reaching for `npm`/`yarn`** — pnpm only; a stray `package-lock.json` or
  `yarn.lock` breaks the single-lockfile guarantee. Use
  `pnpm --filter @auraspear/<app> <script>` to run an app script.
- **Trusting `typecheck:fast` (tsgo) as the gate** — it is advisory. The blocking
  typecheck is `pnpm typecheck` (`tsc --noEmit`). See
  [`../docs/tools/TYPESCRIPT_AND_TSGO.md`](../docs/tools/TYPESCRIPT_AND_TSGO.md).
- **Using `any` or suppressing ESLint** — both are banned repo-wide; fix the type
  or the code, never disable the rule.
- **Hand-editing the lockfile or adding a dep without the workspace** — install
  with `pnpm add` in the right `--filter`; respect the overrides /
  `onlyBuiltDependencies` policy in [`../pnpm-workspace.yaml`](../pnpm-workspace.yaml)
  (Zod stays v3 in api / v4 in web on purpose; build scripts are allowlisted).
- **Defining inline declarations** — backend enums/types/constants live in
  `<module>.enums.ts` / `.types.ts` / `.constants.ts`; frontend in `src/enums/`,
  `src/types/`, `src/lib/constants/`. ESLint enforces this.
- **Building Docker images from the wrong context** — Dockerfiles in `apps/*` are
  built with the **repo root** as context (they need the workspace + root
  lockfile); don't `docker build` from inside an app dir.
- **Assuming advisory == optional** — `lint:strict` / `test` / `format:check` are
  advisory in CI today only because of tracked debt
  ([`../docs/audit/02-risk-register.md`](../docs/audit/02-risk-register.md)). Still
  run them; don't add new failures.
- **Claiming "all green" without running the gate** — forbidden
  ([`../AGENTS.md`](../AGENTS.md) §5, §13).

---

## Validation commands

Run from repo root (**pnpm only, Node 22**). Full list:
[`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
pnpm install            # install workspace deps (one root lockfile)
pnpm doctor             # check environment (Node/pnpm/tooling)
pnpm setup:env          # generate .env files with fresh secrets
pnpm typecheck          # BLOCKING gate — tsc --noEmit across the workspace
pnpm typecheck:fast     # advisory — tsgo (@typescript/native-preview)
pnpm build              # BLOCKING gate — turbo run build (web + api)
pnpm lint               # advisory — eslint (run + annotate)
pnpm lint:strict        # advisory — eslint --max-warnings 0
pnpm format:check       # advisory — prettier --check
pnpm test               # unit tests (web: Vitest, api: Jest) — advisory
pnpm test:e2e           # Playwright e2e (web) — advisory
pnpm validate           # typecheck + lint:strict + format:check
pnpm validate:full      # + test + build
pnpm scan:secrets       # gitleaks (hard gate in CI)
pnpm scan:trivy         # Trivy fs (advisory)
```

Scope to one app with `--filter`, e.g.
`pnpm --filter @auraspear/web typecheck` or
`pnpm --filter @auraspear/api build`.

**Hard gates (must pass):** `pnpm typecheck` · `pnpm build` · Docker image builds
· gitleaks (no secrets) · CodeQL. **Advisory** gates (`lint` / `format:check` /
`test` / `pnpm audit` / Trivy fs) are non-blocking today due to tracked debt —
still run and annotate. See
[`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md) and
[`../docs/audit/02-risk-register.md`](../docs/audit/02-risk-register.md).

> **Never claim a gate is green without running it.** Report exactly what passed,
> what failed, and any blocker — per [`../AGENTS.md`](../AGENTS.md) §5 and §13.
