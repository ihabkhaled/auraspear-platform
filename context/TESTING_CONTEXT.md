# TESTING_CONTEXT.md — AuraSpear testing (Vitest · Jest · Playwright)

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → `memory/*.md` → this `context/*.md`
> → `rules/**` → `skills/**` → `docs/**` → code + tests. This file is step 3 for
> any task that adds or changes tests. Do **not** edit before you have read the
> rules and skills linked below — the one rule is _no AI agent may edit first and
> understand later._ The **authoritative** source for where each kind of test
> lives is [`../rules/testing/test-strategy.md`](../rules/testing/test-strategy.md);
> where this file and that rule overlap, **the rule wins**.

---

## What this area is

Two apps, two stacks, three runners — orchestrated per-workspace by **Turborepo**
(`pnpm test` → `turbo run test`; `pnpm test:e2e`; `pnpm test:cov` from
[`package.json`](../package.json)):

- **Web** (`@auraspear/web`, Next.js 16) — **Vitest** for the logic layer
  (`apps/web/package.json` `"test": "vitest run --pool=threads"`) and
  **Playwright** for browser flows (`"test:e2e": "playwright test"`).
- **API** (`@auraspear/api`, NestJS 11) — **Jest** (`ts-jest`) for units
  (`apps/api/package.json` `"test": "jest --maxWorkers=100%"`) and **Jest +
  supertest** for HTTP e2e (`"test:e2e": "jest --config ./test/jest-e2e.json"`).

Tests are an **advisory gate today** (the CI `test` job is `continue-on-error`),
**not** a hard gate. Advisory ≠ optional: run them before claiming behavior
works and never make the suite worse. The blocking gates are `pnpm typecheck`
(`tsc --noEmit`) + `pnpm build` + Docker image builds + gitleaks + CodeQL — see
[`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md). **pnpm
only, Node 22** — never `npm`/`yarn`/`npx` at the monorepo root.

---

## Where files live

Match the four configs that already exist — do **not** invent a third runner or a
new file pattern:

| Layer                                                           | Tool             | Location                                                                                   | Pattern         | Config                                                                     |
| --------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------ | --------------- | -------------------------------------------------------------------------- |
| Web logic (services/hooks/lib utils/stores/Zod schemas/enums)   | Vitest           | `apps/web/test/`                                                                           | `*.test.ts`     | [`apps/web/vitest.config.ts`](../apps/web/vitest.config.ts)                |
| Web critical flows (UI behavior)                                | Playwright       | `apps/web/e2e/`                                                                            | `*.spec.ts`     | [`apps/web/playwright.config.ts`](../apps/web/playwright.config.ts)        |
| API units (services/`*.utilities.ts`/guards/pipes/common utils) | Jest             | `apps/api/test/{modules,guards,services,utils}/` + co-located `src/modules/<m>/__tests__/` | `*.spec.ts`     | inline `"jest"` key in [`apps/api/package.json`](../apps/api/package.json) |
| API e2e (full HTTP, real guard chain)                           | Jest + supertest | `apps/api/test/auth/` (+ `__tests__/`)                                                     | `*.e2e-spec.ts` | [`apps/api/test/jest-e2e.json`](../apps/api/test/jest-e2e.json)            |

Real config facts (cite, don't guess):

- **Web Vitest** — `environment: 'node'` (NOT jsdom), `globals: true`,
  `include: ['test/**/*.test.ts']`, `setupFiles: ['test/setup.ts']`, alias
  `@ → ./src`. `apps/web/test/setup.ts` installs an in-memory `Storage` shim for
  `globalThis.localStorage`/`sessionStorage` so store/service code runs without a
  DOM. Coverage tool is `@vitest/coverage-v8`. ~100 spec files exist
  (`alert-service.test.ts`, `ai-triage-hook.test.ts`, etc.).
- **Web Playwright** — `testDir: './e2e'`, `timeout: 30_000`, `retries: 0`,
  `baseURL: http://localhost:3000`, chromium-only, `screenshot: 'only-on-failure'`,
  `trace: 'on-first-retry'`. `webServer.command` is `npm run dev` with
  `reuseExistingServer: true` (auto-boots the app, no mocked API today). Existing
  specs: `auth`, `dashboard`, `alerts`, `cases`, `ai-config` — copy these.
- **API Jest (units)** — `testRegex: ".*\\.spec\\.ts$"`, `testEnvironment: "node"`,
  `ts-jest` with `diagnostics: false`, `moduleNameMapper "^@/(.*)$" → "<rootDir>/src/$1"`,
  `collectCoverageFrom: ["src/**/*.ts", "!src/main.ts"]`, `coverageDirectory: "./coverage"`.
- **API Jest (e2e)** — `apps/api/test/jest-e2e.json`: `rootDir: ".."`,
  `testRegex: ".e2e-spec.ts$"`, same `ts-jest` + `@` mapper. E2e specs bootstrap a
  real Nest app via `@nestjs/testing` (`Test.createTestingModule`), wire the
  **real** guard chain (`ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard →
RolesGuard → PermissionsGuard` + `GlobalExceptionFilter`), and drive HTTP with
  **`supertest`** (e.g. `apps/api/test/auth/auth-flow.e2e-spec.ts`).

---

## What rules apply (read before editing)

Always load `rules/global/*`, then the **testing** area rules in
[`../rules/testing/`](../rules/testing/):

- [`test-strategy.md`](../rules/testing/test-strategy.md) — **the authority** for
  where each kind of test lives, what each runner covers, and the coverage
  philosophy below.
- [`quality-gates.md`](../rules/testing/quality-gates.md) — hard vs advisory gate
  posture; the one rule: _never claim "green" without running the gate and pasting
  the output_ (the `qa-gatekeeper` subagent rejects evidence-free claims).
- [`e2e-rules.md`](../rules/testing/e2e-rules.md) — Playwright, **every page route
  gets a spec**, the four states (loaded/empty/error/responsive).

Global: [`../rules/global/absolute-rules.md`](../rules/global/absolute-rules.md),
[`branch-safety.md`](../rules/global/branch-safety.md),
[`validation-gates.md`](../rules/global/validation-gates.md). The invariants the
tests exist to protect live in [`../rules/security/`](../rules/security/),
[`../rules/backend/tenant-permission-rules.md`](../rules/backend/tenant-permission-rules.md),
and [`../rules/ai/`](../rules/ai/).

**Invariants tests must protect / must never weaken (from [`../AGENTS.md`](../AGENTS.md) §6–§7):**

- **Tenant isolation** — every tenant-owned query/`update`/`delete` is scoped by
  `tenantId`; `tenant.guard.spec.ts` and e2e prove no cross-tenant leak. Every new
  tenant-scoped query/mutation lands **with a test proving the `tenantId` scope.**
- **RBAC** — `@RequirePermission(...)` is enforced, never bypassed
  (`roles.guard.spec.ts`, `permissions.guard.spec.ts`).
- **No auth/secret/permission bypass** — a test must **never** introduce a
  `NODE_ENV` shortcut, fake user, or disabled guard to make a suite pass. Security
  is tested through **fixtures/DI**, never runtime env bypasses (`apps/api/CLAUDE.md`
  #56). No committed/fallback secrets in test files.
- **AI safety** — destructive AI actions stay **approval-required** (an
  `ApprovalRequest` is persisted before execution); **never render raw AI output
  as HTML**; redaction runs before model calls — all of these are _behavior to
  test_, not to stub away.
- **No `any`** in production code, no `eslint-disable`/`@ts-ignore`/`@ts-expect-error`.
  Test files have **relaxed ESLint** (no `any` enforcement, no explicit-return-type)
  — this relaxation is **for test bodies only** and never licenses weakening
  production code.

---

## What skills apply (recipes for the work)

Match your task to a recipe in [`../skills/qa/`](../skills/qa/) (each opens with
"Read `AGENTS.md` first"):

- Add a unit test (web Vitest · api Jest) →
  [`add-unit-test.md`](../skills/qa/add-unit-test.md)
- Add an e2e test (web Playwright · api supertest) →
  [`add-e2e-test.md`](../skills/qa/add-e2e-test.md)
- Validate a release (run every gate, report honestly) →
  [`validate-release.md`](../skills/qa/validate-release.md)

Cross-area: a new web page route also needs its Playwright spec (rule 48); a new
backend endpoint pairs with an [`add-endpoint`](../skills/backend/add-endpoint.md)
e2e check and a frontend proxy
([`../skills/frontend/add-api-client.md`](../skills/frontend/add-api-client.md)).

---

## What docs to read

- [`../docs/TESTING.md`](../docs/TESTING.md) — deep reference for both stacks,
  including the MSW / request-mocking note (MSW is a **target** convention,
  **not yet wired** — `msw` is not a dependency today).
- [`../apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) — rule **48** (every page route
  gets a Playwright spec) + separation-of-concerns #13–#16 (why the logic Vitest
  tests lives outside `.tsx`).
- [`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) → _Testing_ + layering
  #14/#14a–c (why Jest concentrates on services and `*.utilities.ts`).
- [`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md) — the full command
  list; [`../memory/TECHNICAL_MEMORY.md`](../memory/TECHNICAL_MEMORY.md) for stable
  technical truths.

---

## Coverage philosophy (meaningful, not vanity)

**No numeric coverage gate is configured** in either app — no `--coverage` in the
`test` scripts, no `thresholds` in `vitest.config.ts`, no `coverageThreshold` in
the API `"jest"` block. Coverage is **informational**, run on demand: web
`npx vitest run --coverage`, API `npm run test:cov` (→ `apps/api/coverage`).

Aim for **meaningful coverage of the logic layer**, not a global percentage:

- **High / non-negotiable** for security- and tenant-critical code, each with
  dedicated specs that must stay green: **auth & tokens** (`auth.service`,
  `token-blacklist`, JWT rotation/revocation, the auth e2e flow), **tenant
  isolation** (`tenant.guard.spec.ts`), **RBAC** (`roles.guard.spec.ts`,
  `permissions.guard.spec.ts`), **crypto/data protection** (`encryption.utility.spec.ts`
  for AES-256-GCM, `mask`/`redaction` utility specs), **SSRF/outbound safety**
  (`ssrf*.utility.spec.ts`, `connector-http.utility.spec.ts`), and **AI safety**
  (token-quota/budget, approval-required gating, provider cascade).
- **Solid** for module services and `*.utilities.ts` (web `services/`, `hooks/`,
  `lib/` utils, `stores/`, Zod schemas) — the layers ESLint forces logic into.
- **Don't chase coverage on glue** — controllers, repositories, NestJS modules,
  and barrel files are thin by design (exercise them via service units + e2e). Web
  React components are covered by **Playwright**, not unit renders.
- **Every bug fix lands with a regression test** that fails before the fix and
  passes after.

---

## Common mistakes

- **Rendering React components in Vitest** — `environment: 'node'`, no jsdom, no
  Testing Library wired. Component/UI behavior is **Playwright's** job. Vitest
  covers the logic layer only (`*.test.ts` under `apps/web/test/`).
- **Wrong file pattern / location** — Vitest only picks up `test/**/*.test.ts`
  (web); a `*.spec.ts` in `apps/web/test/` is silently ignored. API units are
  `*.spec.ts`, API e2e are `*.e2e-spec.ts` — mixing them breaks the regex.
- **Hitting the real network** — in Vitest stub the Axios instance, not the wire:
  `vi.mock('@/lib/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))`,
  then assert on call args + returned data. Don't introduce ad-hoc `fetch` stubs;
  if you add network mocking, wire `msw` properly via `setupFiles`.
- **Mocking away the guard chain in API e2e** — e2e exists to prove auth, tenant
  isolation, RBAC, rate limiting, and `messageKey` error shape **through the real**
  `AuthGuard → … → PermissionsGuard` chain. In-process mocks belong in units.
- **`NODE_ENV` bypass to pass a test** — banned (`apps/api/CLAUDE.md` #56). Use
  fixtures/DI. A test that disables a guard or fakes a user is a security hole, not
  a passing suite.
- **Shipping a page route without a Playwright spec** — violates `apps/web/CLAUDE.md`
  rule 48; the page is incomplete even if it renders. Name it after the route
  (`/alerts` → `e2e/alerts.spec.ts`).
- **Expecting pre-commit to run tests** — Husky + lint-staged run ESLint + `tsc`
  - Prettier on **staged files only**. **Running tests is on you.**
- **Claiming green without running** — a suite you didn't run is RED. Quote the
  exact command + result and state hard-vs-advisory in the `AGENTS.md` §13 final
  block. Playwright `retries: 0` means a flake **is** a failure.

---

## Validation commands

Run from **repo root** (pnpm only, Node 22). Full list:
[`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
pnpm install            # install workspace deps
pnpm test               # all unit suites (turbo: web Vitest + api Jest) — advisory
pnpm test:e2e           # all e2e (turbo: web Playwright + api supertest) — advisory
pnpm test:cov           # coverage (turbo run test:cov) — informational, no gate
pnpm typecheck          # BLOCKING gate (tsc --noEmit across the workspace)
pnpm build              # BLOCKING gate
```

Per-app (from `apps/web` / `apps/api`, scripts use `npm run`):

```bash
# web
npm run test            # vitest run --pool=threads
npm run test:watch      # vitest (watch)
npx vitest run --coverage
npm run test:e2e        # playwright test  (auto-boots `npm run dev`)
npm run test:e2e:ui     # playwright test --ui

# api
npm run test            # jest --maxWorkers=100%
npm run test:cov        # jest --coverage  (→ apps/api/coverage)
npm run test:e2e        # jest --config ./test/jest-e2e.json
```

The API e2e job needs Postgres + Redis (CI runs `postgres:16-alpine` +
`redis:7-alpine` and `prisma:generate` first). Reproduce locally with
`pnpm docker:infra` + `pnpm prisma:generate` before asserting e2e passes.

**Hard gates (must pass):** `pnpm typecheck` · `pnpm build` · Docker image builds ·
gitleaks (no secrets) · CodeQL. **Tests/e2e are advisory** (non-blocking today due
to tracked debt — see
[`../docs/audit/02-risk-register.md`](../docs/audit/02-risk-register.md)) — still
run and annotate.

> **Never claim a gate (or a test suite) is green without running it.** Report
> exactly what passed, what failed, and any blocker — per
> [`../AGENTS.md`](../AGENTS.md) §5 and §13.
