# Testing Strategy — AuraSpear Platform

> **Start at [`AGENTS.md`](../../AGENTS.md)** (repo root) — it is the single AI +
> human entry point: the loading order (§1), the one rule ("no AI agent may edit
> first and understand later"), the validation gates (§5), the security
> invariants (§6) and AI-safety invariants (§7) that the test suites exist to
> protect. This document is the **strategy / "why"** layer. It does **not** repeat
> the per-config reference or the hard rules — those live in:
>
> - **Reference (the "what" — configs, scripts, file inventory, CI):**
>   [`docs/TESTING.md`](../TESTING.md)
> - **Hard rules (the "must"):** [`rules/testing/test-strategy.md`](../../rules/testing/test-strategy.md)
>   (where each test lives + coverage philosophy), [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)
>   (hard vs advisory gates), [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md)
>   (Playwright, four states, rule 48).
> - **Recipes (the "how"):** [`skills/qa/add-unit-test.md`](../../skills/qa/add-unit-test.md),
>   [`skills/qa/add-e2e-test.md`](../../skills/qa/add-e2e-test.md),
>   [`skills/qa/validate-release.md`](../../skills/qa/validate-release.md).
> - **App guides (the source of truth this inherits):**
>   [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) → _Testing_ + layering rules
>   #14/#14a–c; [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) → rule **48** +
>   separation-of-concerns rules #13–#16.

This is the first occupant of [`docs/testing/`](.), the deep-dive area that
[`docs/DOCS_INDEX.md`](../DOCS_INDEX.md) points to alongside `docs/TESTING.md`.
Read it to understand **why the suites are shaped the way they are**; read the
linked reference and rules for the exact config values and enforceable
constraints.

---

## 1. The shape of the strategy in one breath

AuraSpear is a two-app monorepo (`apps/web` Next.js 16, `apps/api` NestJS 11),
orchestrated by Turborepo. The testing strategy follows directly from the
**architecture**, not from a generic "aim for X% coverage" target:

- The **web app deliberately has no business logic in components.** ESLint
  separation-of-concerns rules (`apps/web/CLAUDE.md` #13–#16) force all logic out
  of `.tsx` files into `services/`, `hooks/`, `lib/` utils, `stores/`, and Zod
  `lib/validation/` schemas. **That logic layer is what we unit-test, with
  Vitest. Component/route behavior is tested in the browser, with Playwright.**
- The **api deliberately has no business logic in controllers or repositories.**
  Strict layering (`apps/api/CLAUDE.md` #14, #14a–c) puts logic in `*.service.ts`
  and `*.utilities.ts`; controllers only route, repositories only do data access.
  **So Jest unit-tests services + utilities + guards + pipes; full HTTP / auth /
  tenant / RBAC flows go to Jest + supertest e2e.**

The result is a layer-aligned strategy: **test where the logic actually is, and
prove the security invariants end-to-end where they actually run.**

| Layer               | Tool                 | Tests                                                                   | App        |
| ------------------- | -------------------- | ----------------------------------------------------------------------- | ---------- |
| Web logic           | **Vitest**           | services, hooks (their logic), `lib/` utils, stores, Zod schemas, enums | `apps/web` |
| Web UI / flows      | **Playwright**       | real browser navigation, forms, redirects, toasts                       | `apps/web` |
| API logic           | **Jest** (`ts-jest`) | services, `*.utilities.ts`, guards, pipes, common utils                 | `apps/api` |
| API HTTP / contract | **Jest + supertest** | full Nest app, real guard chain, `messageKey` shape                     | `apps/api` |

Exact config values, scripts, and the spec file inventory are in
[`docs/TESTING.md`](../TESTING.md) — not duplicated here.

---

## 2. Why three runners (Vitest + Jest + Playwright)

This is intentional, not accidental divergence. Each runner is the right tool for
its app and layer:

### Vitest (web) — fast logic checks, no DOM

`apps/web/vitest.config.ts` runs `environment: 'node'` (not `jsdom`),
`globals: true`, `include: ['test/**/*.test.ts']`, `setupFiles: ['test/setup.ts']`,
alias `@ → ./src`. Two design decisions drive the strategy:

- **No jsdom and no Testing Library are wired.** This is a feature: it keeps the
  unit suite fast and forces the discipline that **React rendering is Playwright's
  job, not Vitest's**. Do not add `renderHook`/component renders to Vitest — test
  the service + permission logic a hook orchestrates instead (canonical pattern:
  `apps/web/test/ai-triage-hook.test.ts`).
- **`test/setup.ts` installs an in-memory `Storage` shim** for
  `globalThis.localStorage`/`sessionStorage`, so `localStorage`-backed Zustand
  stores and services run without a DOM. Don't hand-roll storage stubs — use the
  shim.

Vitest aligns with Vite/ESM and React 19's toolchain, and `vitest run` is a single
CI-style pass.

### Jest (api) — NestJS-native, ts-jest

The api stays on **Jest** because it is the NestJS default and integrates cleanly
with `@nestjs/testing` (`Test.createTestingModule`) and `ts-jest`. Unit config is
inline in `apps/api/package.json` (`"jest"` key): `testRegex: ".*\\.spec\\.ts$"`,
`testEnvironment: "node"`, `ts-jest` with `diagnostics: false`, `moduleNameMapper`
`^@/(.*)$ → <rootDir>/src/$1`. Services are constructed with hand-built
`jest.fn()` mocks for their repository + collaborators (services never import
`PrismaService`), so units stay pure and in-process (canonical:
`apps/api/test/modules/alerts.service.spec.ts`).

### Playwright (web) — real browser, real server

`apps/web/playwright.config.ts`: `testDir: './e2e'`, `timeout: 30_000`,
`retries: 0`, chromium-only, `baseURL: http://localhost:3000`,
`screenshot: 'only-on-failure'`, `trace: 'on-first-retry'`, `webServer` auto-boots
`npm run dev` with `reuseExistingServer: true`. Playwright owns the UI contract
the Vitest layer deliberately doesn't render. `retries: 0` is a strategy choice:
**flake = failure**, so specs wait on real conditions (`expect(...).toBeVisible`,
`toHaveURL`) and never `waitForTimeout`. The mandate is `apps/web/CLAUDE.md`
**rule 48** — every new page route ships a spec covering **loaded · empty · error
· responsive**; details in [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md).

### supertest (api e2e) — the HTTP contract

API e2e uses a separate config (`apps/api/test/jest-e2e.json`,
`testRegex: ".e2e-spec.ts$"`) and **`supertest`** to bootstrap a real Nest app
and wire the **real** guard/filter chain (`AuthGuard → TenantGuard → RolesGuard`,
`GlobalExceptionFilter`, `ThrottlerGuard`). This is where tenant isolation, RBAC,
rate limiting, and the `messageKey` error shape are proven end-to-end rather than
mocked — e.g. `apps/api/test/auth/auth-flow.e2e-spec.ts`.

---

## 3. MSW — target convention, not yet wired (do not fake it)

`apps/web/CLAUDE.md`'s project structure lists `src/mocks/` for "MSW mock
handlers + data", but **MSW is not installed and no handlers exist in the tree
today** — there is no `msw` dependency in `apps/web/package.json`, no
`src/mocks/` directory, and no `setupServer`/`http`/`rest` handlers (verified;
see [`docs/TESTING.md`](../TESTING.md) → _MSW / request mocking_). The strategy
today is therefore:

- **Vitest mocks the Axios instance, not the network.** Stub `@/lib/api`
  (`vi.mock('@/lib/api', () => ({ default: { get: vi.fn(), post: vi.fn(), ... } }))`)
  and assert on call args + returned data. Do **not** add an `msw` import to a
  routine test — the import will fail.
- **Playwright runs against the real `npm run dev` server** (and the BFF it
  proxies to), not a mocked API layer.

**If/when network-level mocking is genuinely introduced**, treat it as a real
setup change, not a routine test: add `msw`, put handlers under
`apps/web/src/mocks/`, register `setupServer` via `vitest.config.ts` `setupFiles`
**alongside** `test/setup.ts` (keep the storage shim), and update
[`docs/TESTING.md`](../TESTING.md) + [`rules/testing/test-strategy.md`](../../rules/testing/test-strategy.md)
§2 in the same change (per `apps/web/CLAUDE.md` audit rule #36). Until then,
"MSW" in any doc means _intended convention_, not present capability.

---

## 4. Coverage philosophy — meaningful, not vanity

**No numeric coverage gate is configured in either app** — no `--coverage` baked
into either `test` script, no `thresholds` in `vitest.config.ts`, no
`coverageThreshold` in the api `"jest"` block. Tooling is `@vitest/coverage-v8`
(web devDep) and `jest --coverage` → `./coverage` (api,
`collectCoverageFrom: ["src/**/*.ts", "!src/main.ts"]`). Coverage is
**informational**, run on demand:

```bash
pnpm --filter @auraspear/web exec vitest run --coverage   # web
pnpm --filter @auraspear/api test:cov                     # api → ./coverage
```

The strategy is **coverage of the logic layer and the security invariants, not a
global percentage.** Priorities (the authoritative breakdown is
[`rules/testing/test-strategy.md`](../../rules/testing/test-strategy.md) §5):

- **Non-negotiable — security- and tenant-critical code keeps dedicated specs:**
  - **Auth & tokens** — `auth.service`, `auth.controller`,
    `token-blacklist.service`, JWT rotation/revocation, the auth e2e flow
    (`*.e2e-spec.ts`).
  - **Tenant isolation** — `tenant.guard.spec.ts`; every queried/updated/deleted
    row scoped by `tenantId`, no cross-tenant leak (`AGENTS.md` §6;
    [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)).
  - **RBAC** — `roles.guard`/`permissions.guard` specs; `@RequirePermission`
    enforced, never bypassed.
  - **Crypto & data protection** — `encryption.utility.spec.ts` (AES-256-GCM
    connector secrets), `mask`/`redaction` util specs.
  - **SSRF / outbound safety** — `ssrf*.utility.spec.ts`,
    `connector-http.utility.spec.ts`.
  - **AI safety** — token-quota/budget, approval-required gating, provider
    cascade; AI **suggests**, destructive actions are approval-gated, raw AI
    output is **never** rendered as HTML (`AGENTS.md` §7; [`rules/ai/`](../../rules/ai/)).
- **Solid** coverage for module services and `*.utilities.ts` (api) / `services/`,
  `hooks/`, `lib/` utils, `stores/`, schemas (web) — a bug there is a logic bug;
  cover the branches.
- **Don't chase coverage on glue.** Controllers, repositories, NestJS modules,
  and barrel files are thin by design — exercise them through service units and
  e2e, not by padding line counts. React components are covered by Playwright, not
  unit renders.
- **Every bug fix lands with a regression test** that fails before the fix and
  passes after. **Every new tenant-scoped query/mutation lands with a test proving
  the `tenantId` scope.**

This is _why_ a global threshold isn't enforced: a high number on thin glue would
be vanity, while the code that must never regress (auth, tenancy, RBAC, crypto,
SSRF, AI safety) is covered by intent, not by a line-count gate.

---

## 5. Hard vs advisory gates — where tests sit

The gate posture is the single most important strategic fact about testing here,
because it is **counterintuitive**: tests are an **advisory** gate today. The full
matrix is [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)
and `AGENTS.md` §5 — summary:

| Gate                                                                                   | Posture                                    | Why                                                                                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck` (tsc), `pnpm build`, Docker image build, gitleaks secret scan, CodeQL | **HARD** — block merge                     | No `continue-on-error` in CI; a red one is a stop.                                                                                                |
| **Unit tests** (`pnpm test`), ESLint, Prettier check, `pnpm audit`, Trivy fs           | **ADVISORY** — run + annotate, don't block | `continue-on-error: true` in CI **only because of pre-existing tracked debt** ([`docs/audit/02-risk-register.md`](../audit/02-risk-register.md)). |

The CI `test` job (`.github/workflows/ci.yml`) is named **`test (advisory)`**,
marked `continue-on-error: true`, spins up `postgres:16` + `redis:7`, runs
`prisma:generate`, then `pnpm test` (Turborepo → web Vitest + api Jest units).
**Playwright (`test:e2e`) and api e2e are not invoked by this CI job.**

**Advisory ≠ optional — the strategic rules:**

- **Advisory means "tracked debt", not "free pass".** New code must not add new
  failures, and the absolute code rules still apply (no `any`, no
  `eslint-disable`, no `@ts-ignore`/`@ts-expect-error`) even though lint/test are
  non-blocking — `apps/web/CLAUDE.md` / `apps/api/CLAUDE.md` rules #1/#2.
- **Run the suite for what you touched** before claiming behavior works: web →
  `pnpm --filter @auraspear/web test` (+ `test:e2e` for new pages); api →
  `pnpm --filter @auraspear/api test` (+ `test:e2e` for HTTP/auth changes); or
  `pnpm test` from root.
- **Never claim a gate green without running it and quoting the output.** A suite
  you didn't run is RED. This is enforced by the `qa-gatekeeper` subagent and the
  `AGENTS.md` §13 final-report block (`Green checks:` / `Failed checks:` —
  not "should work"). `typecheck:fast` (tsgo) is advisory; **`tsc` is the blocking
  truth** — if they disagree, `tsc` wins.
- **Pre-commit hooks do NOT run tests.** Husky + lint-staged run ESLint +
  `tsc --noEmit` + Prettier on staged files only (both app `CLAUDE.md`s). Running
  tests is on you, never on the hook.
- **Never weaken a gate to pass:** don't flip a hard job to `continue-on-error`,
  add `|| true`, suppress a hard scan, or relax a `tsconfig` strict flag. And
  never trade a security/tenancy/RBAC/AI-safety invariant for a green build.

---

## 6. How tests run (per-app and orchestrated)

Per-app scripts (exact list in [`docs/TESTING.md`](../TESTING.md)):

- **Web** (`apps/web/package.json`): `test` → `vitest run --pool=threads`,
  `test:watch` → `vitest`, `test:e2e` → `playwright test`, `test:e2e:ui` →
  `playwright test --ui`.
- **API** (`apps/api/package.json`): `test` → `jest --maxWorkers=100%`,
  `test:watch` → `jest --watch`, `test:cov` → `jest --coverage`, `test:e2e` →
  `jest --config ./test/jest-e2e.json`.

Orchestrated from the repo root via Turborepo (root `package.json`):
`pnpm test` → `turbo run test`, `pnpm test:cov` → `turbo run test:cov`,
`pnpm test:e2e` → `turbo run test:e2e`, and `pnpm validate:full` →
`turbo run typecheck lint:strict test build`.

**pnpm only, Node 22 at the root** — never `npm`/`yarn`/`npx` at the monorepo
root ([`rules/testing/test-strategy.md`](../../rules/testing/test-strategy.md)).
A meaningful e2e/integration run expects the api and its **seeded Postgres +
Redis** reachable — CI provides those service containers for the advisory `test`
job; locally use `pnpm docker:infra`.

> **Note (workspace mid-upgrade):** the pnpm/Turborepo workspace is being
> upgraded; if root `pnpm` commands are unavailable, drive each app directly with
> its own `npm run` scripts (e.g. `cd apps/web && npm run test`) per the per-app
> tables above. The strategy and gate posture are unchanged.

---

## 7. Where to go next

- **Add a unit test** → [`skills/qa/add-unit-test.md`](../../skills/qa/add-unit-test.md)
  (web Vitest / api Jest; canonical patterns + the four "Files to inspect first").
- **Add an e2e / Playwright test** → [`skills/qa/add-e2e-test.md`](../../skills/qa/add-e2e-test.md)
  and the hard rules in [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md)
  (rule 48, the four states, real-login auth, tenant + RBAC + AI assertions).
- **Validate a release** → [`skills/qa/validate-release.md`](../../skills/qa/validate-release.md).
- **Full config/script/CI reference** → [`docs/TESTING.md`](../TESTING.md).
- **Gate posture detail** → [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md);
  the broader index → [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md);
  the entry point for everything → [`AGENTS.md`](../../AGENTS.md).
