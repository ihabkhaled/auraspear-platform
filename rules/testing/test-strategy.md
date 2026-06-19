# Rules — Test strategy

> **Read [`../../AGENTS.md`](../../AGENTS.md) first** (loading order + the one
> rule: understand before you edit). Then the app guides that own these
> conventions: [`../../apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) → _Testing_
> and [`../../apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (rule 48, separation
> of concerns). Deep reference: [`../../docs/TESTING.md`](../../docs/TESTING.md).
> Sibling rules: gate posture in [`../global/validation-gates.md`](../global/validation-gates.md);
> security invariants the tests protect in [`../security/security-rules.md`](../security/security-rules.md)
> and [`../backend/tenant-permission-rules.md`](../backend/tenant-permission-rules.md).

Two apps, two stacks. **Web** (`@auraspear/web`, Next.js 16) uses **Vitest** for
logic and **Playwright** for browser flows. **API** (`@auraspear/api`, NestJS 11)
uses **Jest** (`ts-jest`) for units and **Jest + supertest** for e2e. Tests are
run per-workspace and orchestrated by Turborepo (`pnpm test` → `turbo run test`).
**pnpm only, Node 22** at the root — never `npm`/`yarn`/`npx` at the monorepo root
(see [`../global/validation-gates.md`](../global/validation-gates.md)).

Tests are an **advisory gate today** (CI `test` job is `continue-on-error`), not
a hard gate. Advisory ≠ optional: run them before claiming behavior works, and
never make the suite worse. The blocking gates remain `tsc` typecheck + build +
Docker + gitleaks + CodeQL.

---

## 1. Where each kind of test lives (cite: `apps/*/package.json`)

| Layer                                                 | Tool             | Location                               | Pattern         | Script (`apps/*/package.json`)                     |
| ----------------------------------------------------- | ---------------- | -------------------------------------- | --------------- | -------------------------------------------------- |
| Web logic (services/hooks/utils/stores/schemas/enums) | Vitest           | `apps/web/test/`                       | `*.test.ts`     | `"test": "vitest run --pool=threads"`              |
| Web critical flows                                    | Playwright       | `apps/web/e2e/`                        | `*.spec.ts`     | `"test:e2e": "playwright test"`                    |
| API units (services/utilities/guards/pipes)           | Jest             | `apps/api/test/` + module `__tests__/` | `*.spec.ts`     | `"test": "jest --maxWorkers=100%"`                 |
| API e2e (full HTTP)                                   | Jest + supertest | `apps/api/test/**`                     | `*.e2e-spec.ts` | `"test:e2e": "jest --config ./test/jest-e2e.json"` |

Do not invent a third runner or a new pattern. Match the config that already
exists: `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, the inline
`"jest"` key in `apps/api/package.json`, and `apps/api/test/jest-e2e.json`.

---

## 2. Web — Vitest (components/hooks/utils)

Config: `apps/web/vitest.config.ts` — `environment: 'node'`, `globals: true`,
`include: ['test/**/*.test.ts']`, `setupFiles: ['test/setup.ts']`, alias `@ → ./src`.
Coverage tool: `@vitest/coverage-v8` (devDep in `apps/web/package.json`).

- **What Vitest tests = the logic layer.** The frontend pushes business logic out
  of components into `services/`, `hooks/`, `lib/` utils, `stores/`, and Zod
  `lib/validation/` schemas (ESLint separation-of-concerns rules #13–#16 in
  `apps/web/CLAUDE.md`). That is exactly the layer Vitest covers — there are ~100
  spec files (`alert-service.test.ts`, `ai-triage-hook.test.ts`, `permissions.test.ts`,
  `stores.test.ts`, etc.).
- **Environment is `node`, not `jsdom`.** `apps/web/test/setup.ts` installs an
  in-memory `Storage` shim for `globalThis.localStorage`/`sessionStorage` so
  store/service code runs without a DOM. **Do not render React components in
  Vitest** — there is no jsdom and no Testing Library wired. Component/UI behavior
  is Playwright's job (§3).
- **Mock collaborators in-process.** Stub the Axios instance, not the network:
  `vi.mock('@/lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), ... } }))`,
  then assert on call args + returned data (see `apps/web/test/ai-triage-hook.test.ts`).
- **Test files import directly from source via `@`** and use Vitest matchers.
  File naming is `*.test.ts` (the `include` glob ignores anything else).
- **MSW (target convention, not yet wired).** `apps/web/CLAUDE.md`'s structure
  lists `src/mocks/` for "MSW mock handlers + data", but `msw` is **not** a
  dependency and no `setupServer`/handlers exist in the tree today (see
  `docs/TESTING.md` → _MSW / request mocking_). **If you introduce network-level
  mocking**, add `msw`, put handlers under `src/mocks/`, and register the server
  via `vitest.config.ts` `setupFiles` (alongside `test/setup.ts`) — do not bypass
  the storage shim or hardcode fetch stubs.

Scripts: `npm run test` (single pass, CI-style) · `npm run test:watch`.

---

## 3. Web — Playwright (critical flows)

Config: `apps/web/playwright.config.ts` — `testDir: './e2e'`, `timeout: 30_000`,
`retries: 0`, `baseURL: http://localhost:3000`, chromium-only,
`screenshot: 'only-on-failure'`, `trace: 'on-first-retry'`. `webServer.command`
is `npm run dev` with `reuseExistingServer: true` (auto-boots the app).

- **Playwright owns UI behavior** the logic-layer Vitest suite deliberately does
  not render: real route navigation, form fill/submit, clicks, redirects, toasts
  (e.g. `e2e/auth.spec.ts` checks redirect-to-login, login success, invalid-creds
  error toast). Existing specs: `auth`, `dashboard`, `alerts`, `cases`, `ai-config`.
- **Rule 48 (`apps/web/CLAUDE.md`) is mandatory:** **every new page route MUST
  have a Playwright spec** in `e2e/`, minimally covering **loaded, empty, error,
  and responsive** states.
- These run against the real `npm run dev` server (no mocked API layer today).
  Keep them deterministic — `retries: 0` means flake = failure.

Scripts: `npm run test:e2e` · `npm run test:e2e:ui` (interactive).

---

## 4. API — Jest (services/utilities/e2e)

Unit config is **inline** in `apps/api/package.json` `"jest"`:
`testRegex: ".*\\.spec\\.ts$"`, `testEnvironment: "node"`, `ts-jest` (`diagnostics: false`),
`moduleNameMapper "^@/(.*)$" → "<rootDir>/src/$1"`,
`collectCoverageFrom: ["src/**/*.ts", "!src/main.ts"]`, `coverageDirectory: "./coverage"`.

- **What Jest tests = services + utilities + guards + pipes.** Strict layering
  (`apps/api/CLAUDE.md` rules #14, #14a–c) keeps business logic in `*.service.ts`
  and `*.utilities.ts`; controllers only route, repositories only do data access.
  So Jest concentrates on **services and `*.utilities.ts`** (the logic), plus
  **guards** (`test/guards/`: auth/roles/tenant/permissions) and **common utils**
  (`test/utils/`: `encryption`, `ssrf`, `mask`, `redaction`, `role`). Controllers
  and full request flows go to e2e.
- **Locations:** the bulk live in `apps/api/test/{modules,guards,utils,services}/`;
  the per-module structure (`apps/api/CLAUDE.md` → _File Structure Per Module_)
  also supports co-located `src/modules/<m>/__tests__/*.spec.ts`. Both match
  `*.spec.ts` and run under `npm run test`.
- **Relaxed ESLint in test files** (`apps/api/CLAUDE.md` → _Testing_): no `any`
  enforcement, no explicit-return-type requirement. This relaxation is **for test
  bodies only** — it never licenses weakening production code.
- **Security checks are tested through fixtures/DI, never `NODE_ENV` bypasses**
  (rule #56). No `if (NODE_ENV === ...) skip` in code under test.

**E2e** config: `apps/api/test/jest-e2e.json` — `rootDir: ".."`,
`testRegex: ".e2e-spec.ts$"`, `ts-jest`, same `@` mapper. E2e specs bootstrap a
real Nest app via `@nestjs/testing` (`Test.createTestingModule`), wire the **real**
guard/filter chain (`AuthGuard` → `TenantGuard` → `RolesGuard`,
`GlobalExceptionFilter`, `ThrottlerGuard`), and drive HTTP with **`supertest`**
(devDeps `supertest`, `@types/supertest` in `apps/api/package.json`). Use these to
prove auth, tenant isolation, RBAC, rate limiting, and `messageKey` error shape
end-to-end — not in-process mocks.

Scripts: `npm run test` · `npm run test:watch` · `npm run test:cov`
(`jest --coverage`) · `npm run test:e2e`.

---

## 5. Coverage philosophy (meaningful, not vanity)

No numeric coverage gate is configured in either app (no `--coverage` in either
`test` script; no `thresholds` in `vitest.config.ts`; no `coverageThreshold` in
the API `"jest"` block). Coverage is **informational** today — run on demand:
web `npx vitest run --coverage`, API `npm run test:cov` (→ `./coverage`).

Aim for **meaningful coverage of the logic layer**, not a global percentage:

- **High / non-negotiable coverage** for security- and tenant-critical code.
  Every one of these has, and must keep, dedicated specs:
  - **Auth & tokens** — `auth.service`, `auth.controller`, `token-blacklist.service`,
    JWT rotation/revocation, the auth e2e flow (`*.e2e-spec.ts`).
  - **Tenant isolation** — `tenant.guard.spec.ts`; assert every queried/updated/
    deleted row is scoped by `tenantId` (no cross-tenant leak; see
    [`../backend/tenant-permission-rules.md`](../backend/tenant-permission-rules.md)).
  - **RBAC** — `roles.guard.spec.ts`, `permissions.guard.spec.ts`,
    `default-permissions.spec.ts`, `route-access-validation.spec.ts`; `@RequirePermission`
    must be enforced, never bypassed.
  - **Crypto & data protection** — `encryption.utility.spec.ts` (AES-256-GCM
    connector secrets), `mask.utility.spec.ts`, `redaction.utility.spec.ts`.
  - **SSRF / outbound safety** — `ssrf*.utility.spec.ts`, `connector-http.utility.spec.ts`.
  - **AI safety** — token-quota/budget, approval-required gating, and provider
    cascade are behavior that must be tested (suggest-only; destructive actions are
    approval-gated; never render raw AI output as HTML — see [`../ai/`](../ai/)).
- **Solid coverage** for module services and `*.utilities.ts` (web `services/`,
  `hooks/`, `lib/` utils, `stores/`, schemas) — the layers ESLint forces logic
  into. A bug here is a logic bug; cover the branches.
- **Don't chase coverage on glue.** Controllers, repositories, NestJS modules,
  and barrel files are thin by design — exercise them through service units and
  e2e, not by padding line counts. Web React components are covered by Playwright
  (§3), not by unit renders.
- **Every bug fix lands with a regression test** that fails before the fix and
  passes after. Every new tenant-scoped query/mutation lands with a test proving
  the `tenantId` scope.

---

## 6. Before you commit / claim done

- **Run the relevant suite** for what you touched: web → `npm run test`
  (+ `npm run test:e2e` for new pages); API → `npm run test` (+ `npm run test:e2e`
  for HTTP/auth changes). From root: `pnpm test`, `pnpm test:cov`, `pnpm test:e2e`.
- **Pre-commit hooks do NOT run tests.** Husky + lint-staged run ESLint + `tsc`
  - Prettier on staged files only (`apps/*/CLAUDE.md`). Running tests is on you.
- **Never claim green without running it** ([`../global/validation-gates.md`](../global/validation-gates.md) §3,
  enforced by the `qa-gatekeeper` subagent). A suite you didn't run is RED. Quote
  the actual command + result; state hard-vs-advisory in the `AGENTS.md` §13 final
  block.
- **Never work on `main`** — branch first (`feat/…`, `fix/…`, `chore/…`).
