# Skill — Add a Unit Test (web Vitest · api Jest)

> **Read `AGENTS.md` first** (loading order §1; the one rule "understand before
> you edit"; security invariants §6; AI safety §7; validation gates §5;
> "never claim green without running it" §5/§13). Then read the hard rules that
> govern this task — `rules/testing/test-strategy.md` (the authority for where
> each kind of test lives and what each runner covers), `rules/testing/quality-gates.md`
> (advisory vs blocking posture), and the app guides `apps/web/CLAUDE.md`
> (rule 48 + separation-of-concerns #13–#16) and `apps/api/CLAUDE.md`
> (_Testing_ + layering #14/#14a–c). Deep reference: `docs/TESTING.md`. Sibling
> onboarding dirs: `rules/`, `skills/` (you are here), `memory/`, `context/`,
> `docs/`. Companion skills: `skills/frontend/add-hook.md`,
> `skills/backend/add-endpoint.md`, `skills/qa/validate-release.md`.

This recipe adds a **unit test** to one of the two apps:

- **Web** (`@auraspear/web`, Next.js 16) — **Vitest** over the **logic layer**:
  `services/`, `hooks/` (their underlying logic), `lib/` utils, `stores/`, Zod
  schemas, enums. Config `apps/web/vitest.config.ts`, files in `apps/web/test/`,
  pattern `*.test.ts`.
- **API** (`@auraspear/api`, NestJS 11) — **Jest** (`ts-jest`) over **services**
  and **`*.utilities.ts`** (+ guards/pipes/common utils). Inline `"jest"` config
  in `apps/api/package.json`, files in `apps/api/test/**` or co-located
  `src/modules/<m>/__tests__/`, pattern `*.spec.ts`.

Then run `pnpm test`. Tests are an **advisory gate** today
(`rules/testing/quality-gates.md`) — advisory ≠ optional. Run them; never make
the suite worse; never claim green without running.

---

## When to use

Use this skill when you need any of:

- A **regression test for a bug fix** — write it so it **fails before** the fix
  and **passes after** (`rules/testing/test-strategy.md` §5).
- A **unit test for new/changed logic**: a web service method, the logic a hook
  orchestrates, a `lib/` util, a store, a Zod schema, an enum mapping (web); a
  NestJS **service** method or a **`*.utilities.ts`** function (api).
- A **security/tenant regression**: every new tenant-scoped query/mutation lands
  with a test proving the `tenantId` scope; auth/RBAC/crypto/SSRF/AI-safety code
  keeps its dedicated specs (`rules/testing/test-strategy.md` §5).

Do **NOT** use this skill for:

- **Rendering a React component / DOM behavior.** Web Vitest runs
  `environment: 'node'` — there is **no jsdom and no Testing Library wired**.
  Component/route/UI behavior is **Playwright's** job (`apps/web/e2e/`, web
  `CLAUDE.md` **rule 48**: every new page route gets a spec covering
  loaded/empty/error/responsive). See `skills/frontend/add-page.md`.
- **Full HTTP / auth / tenant-isolation end-to-end** flows. Those are **e2e**:
  api → `*.e2e-spec.ts` (`apps/api/test/jest-e2e.json`, real guard chain +
  `supertest`); web → Playwright. This skill is in-process units only.
- **Controllers, repositories, NestJS modules, barrel files** — thin by design;
  exercise them through service units and e2e, not padded unit renders
  (`rules/testing/test-strategy.md` §5).

---

## Files to inspect first

Read these real files before writing — copy their shape, don't invent one:

**Web (Vitest)**

- `rules/testing/test-strategy.md` §2 — the binding rules for the web logic layer
  (node env, no React rendering, mock the Axios instance not the network).
- `apps/web/vitest.config.ts` — `globals: true`, `environment: 'node'`,
  `include: ['test/**/*.test.ts']`, `setupFiles: ['test/setup.ts']`, alias
  `@ → ./src`. Do not change this to add a one-off test.
- `apps/web/test/setup.ts` — the in-memory `Storage` shim for
  `globalThis.localStorage`/`sessionStorage` (so store/service code runs without
  a DOM). Don't bypass it with hand-rolled stubs.
- `apps/web/test/ai-triage-hook.test.ts` — **canonical pattern**:
  `vi.mock('@/lib/api', ...)` at top, `const mockPost = api.post as Mock`,
  `afterEach(() => vi.clearAllMocks())`, assert on call args + returned data, and
  the explicit note that hook tests exercise the **service + permission logic**
  the hook orchestrates (not a rendered hook).
- `apps/web/test/alert-service.test.ts`, `apps/web/test/case-utils.test.ts`,
  `apps/web/test/auth-store-permissions.test.ts` — service / util / store shapes.
- The source under test: `apps/web/src/services/*.service.ts`,
  `apps/web/src/lib/*.ts`, `apps/web/src/stores/*`, `apps/web/src/lib/validation/*`.

**API (Jest)**

- `rules/testing/test-strategy.md` §4 — the binding rules for the api unit layer.
- `apps/api/package.json` → the inline `"jest"` block:
  `testRegex: ".*\\.spec\\.ts$"`, `testEnvironment: "node"`, `ts-jest`
  (`diagnostics: false`), `moduleNameMapper "^@/(.*)$" → "<rootDir>/src/$1"`.
- `apps/api/test/modules/alerts.service.spec.ts` — **canonical service pattern**:
  `createMockRepository()` / `createMockConnectorsService()` factories returning
  `jest.fn()`s, `TENANT_ID`/`ALERT_ID` constants, `build*` fixture helpers, then
  `new AlertsService(...mocks)` and assertions.
- `apps/api/test/guards/tenant.guard.spec.ts`,
  `apps/api/test/guards/permissions.guard.spec.ts` — tenant/RBAC guard specs (the
  non-negotiable coverage).
- `apps/api/test/utils/` — `encryption`, `ssrf`, `mask`, `redaction` util specs.
- A co-located example: `apps/api/src/modules/notifications/__tests__/notifications.service.spec.ts`
  (shows the in-module `__tests__/*.spec.ts` placement).
- The source under test: the `*.service.ts` / `*.utilities.ts` you changed.

---

## Exact step-by-step implementation

### 0. Branch (never work on `main` — `AGENTS.md` §8)

```bash
git checkout -b fix/<area>-add-unit-test
```

### 1. Decide app, runner, and file location (prove, don't guess)

| You changed…                                  | Runner     | Put the test in                                              | Pattern          |
| --------------------------------------------- | ---------- | ------------------------------------------------------------ | ---------------- |
| Web service/hook-logic/util/store/schema/enum | **Vitest** | `apps/web/test/`                                             | `<name>.test.ts` |
| API service or `*.utilities.ts`               | **Jest**   | `apps/api/test/modules/` **or** `src/modules/<m>/__tests__/` | `<name>.spec.ts` |
| API guard / pipe / common util                | **Jest**   | `apps/api/test/{guards,utils,services}/`                     | `<name>.spec.ts` |

Naming is enforced by the runner globs: web Vitest only picks up
`test/**/*.test.ts`; api Jest only picks up `.*\.spec\.ts$`. A web file named
`*.spec.ts` or an api file named `*.test.ts` **will not run** — and a suite that
doesn't run is RED.

### 2A. Web — write the Vitest test (`apps/web/test/<name>.test.ts`)

Mock the Axios instance, **not** the network. MSW is a documented **target**
convention but **`msw` is not installed and no handlers exist** today
(`rules/testing/test-strategy.md` §2) — do **not** add an `msw` import in a
routine test. Mock `@/lib/api`:

```ts
import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'

vi.mock('@/lib/api', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}))

import api from '@/lib/api'
import { fooService } from '@/services/foo.service'

const mockGet = api.get as Mock

afterEach(() => {
  vi.clearAllMocks()
})

describe('fooService.getFoos', () => {
  it('calls the correct endpoint and unwraps data', async () => {
    const payload = { items: [], total: 0 }
    mockGet.mockResolvedValue({ data: { data: payload } })

    const result = await fooService.getFoos({ page: 1 })

    expect(mockGet).toHaveBeenCalledWith('/foos', { params: { page: 1 } })
    expect(result).toEqual(payload)
  })

  it('propagates errors for the hook to handle', async () => {
    mockGet.mockRejectedValue(new Error('boom'))
    await expect(fooService.getFoos({ page: 1 })).rejects.toThrow('boom')
  })
})
```

- **Hook "tests" exercise the orchestrated logic**, not a rendered hook (no
  `renderHook` — Testing Library isn't wired). Test the **service calls** and the
  **`hasPermission(...)` gating** the hook composes — copy `ai-triage-hook.test.ts`.
- **Pure utils / schemas / enums**: import directly via `@` and assert outputs
  (`case-utils.test.ts`); Zod schema tests assert `.safeParse()` success/failure.
- **Stores**: drive store actions and assert state (`auth-store-permissions.test.ts`);
  the `test/setup.ts` storage shim makes `localStorage`-backed stores work.
- Imports are real `@`-aliased source. **No `any`**, no `// eslint-disable`,
  no `@ts-ignore`/`@ts-expect-error` (web `CLAUDE.md` #1/#2 — absolute, and ESLint
  runs on `test/` too).

### 2B. API — write the Jest spec (`apps/api/test/modules/<name>.service.spec.ts`)

Construct the service with **hand-built `jest.fn()` mocks** for its repository and
collaborators (services never import `PrismaService` — they take a repository, so
mock that). Copy `alerts.service.spec.ts`:

```ts
import { FooService } from '../../src/modules/foo/foo.service'

function createMockRepository() {
  return {
    findManyAndCount: jest.fn(),
    findFirstByIdAndTenant: jest.fn(),
    updateByIdAndTenant: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'
const FOO_ID = 'foo-001'

describe('FooService', () => {
  let repository: ReturnType<typeof createMockRepository>
  let service: FooService

  beforeEach(() => {
    repository = createMockRepository()
    service = new FooService(repository as never) // mock satisfies the repo contract
  })

  it('scopes the lookup by tenantId', async () => {
    repository.findFirstByIdAndTenant.mockResolvedValue({ id: FOO_ID, tenantId: TENANT_ID })

    await service.getFoo(FOO_ID, TENANT_ID)

    expect(repository.findFirstByIdAndTenant).toHaveBeenCalledWith(FOO_ID, TENANT_ID)
  })

  it('throws BusinessException with a messageKey when not found', async () => {
    repository.findFirstByIdAndTenant.mockResolvedValue(null)

    await expect(service.getFoo(FOO_ID, TENANT_ID)).rejects.toMatchObject({
      messageKey: 'errors.foo.notFound',
    })
  })
})
```

- **Test the logic layer**: service methods and `*.utilities.ts` pure functions.
  For utilities, import the named function and assert input → output directly.
- **Assert the `tenantId` scope** on every data-access call — that is the tenant-
  isolation regression (`AGENTS.md` §6; `rules/backend/tenant-permission-rules.md`).
- **Assert `BusinessException` + `messageKey`** on error paths (api `CLAUDE.md`
  #17/#18) rather than raw Nest exceptions.
- For **guards** (auth/tenant/roles/permissions), follow `test/guards/*.spec.ts`:
  build an `ExecutionContext` stub and assert allow/deny. Prove RBAC is enforced,
  never bypassed.
- **Security is tested via fixtures/DI, never `NODE_ENV` bypasses** (api
  `CLAUDE.md` #56). No `if (NODE_ENV === ...) skip` in the code under test.
- Test bodies have **relaxed ESLint** (no `any`-enforcement, no explicit-return-
  type) — this is for the test file only and **never** licenses weakening
  production code.

### 3. Run only your new test first (fast loop)

```bash
# web — one file / one name
pnpm --filter @auraspear/web exec vitest run test/<name>.test.ts
# api — one file / one test name
pnpm --filter @auraspear/api exec jest test/modules/<name>.service.spec.ts -t "scopes the lookup"
```

Use `pnpm --filter <pkg> exec <bin>` (pnpm only — never `npx`/`npm`/`yarn` at the
monorepo root, `rules/testing/test-strategy.md`).

### 4. For a bug fix — prove the regression

Run the new test **before** applying the fix and confirm it **fails**; apply the
fix; run again and confirm it **passes**. A regression test that was green before
the fix tests nothing.

### 5. Run the app suite, then the workspace gates

See _Validation commands_ below. Don't stop at the single-file run.

---

## Validation commands (run from repo root — `pnpm` only, Node 22)

```bash
# the suite for what you touched
pnpm --filter @auraspear/web test     # vitest run --pool=threads
pnpm --filter @auraspear/api test     # jest --maxWorkers=100%

# or both, orchestrated by Turborepo
pnpm test                             # turbo run test

# coverage (informational — no numeric gate is configured)
pnpm --filter @auraspear/web exec vitest run --coverage   # @vitest/coverage-v8
pnpm --filter @auraspear/api test:cov                     # jest --coverage → ./coverage
```

Because the test file is real source, also keep the **blocking** gates green
(`AGENTS.md` §5; `rules/testing/quality-gates.md`):

```bash
pnpm typecheck      # blocking gate (tsc); NOT typecheck:fast (tsgo is advisory)
pnpm lint           # ESLint runs on test/ too (relaxed rules, not absent)
pnpm build          # blocking gate
```

Tests themselves are the **advisory** `test` gate (CI `continue-on-error`) — run
them anyway and quote the result. **Never claim a gate green without running it**
(`AGENTS.md` §5/§13; enforced by the `qa-gatekeeper` subagent, which rejects
claims without command output).

---

## Docs to update

- **None for a routine test** — adding a `*.test.ts`/`*.spec.ts` next to existing
  ones needs no doc change. Do not edit `vitest.config.ts` or the api `"jest"`
  block for a single test; the existing globs already pick it up.
- **If you add a new web page route** as part of the work, that route also needs a
  **Playwright** spec (web `CLAUDE.md` #48: loaded/empty/error/responsive) —
  follow `skills/frontend/add-page.md`; a Vitest logic test does not satisfy #48.
- **If you genuinely introduce network-level mocking** (MSW), that is a real
  setup change, not a routine test: add `msw`, put handlers under
  `apps/web/src/mocks/`, register `setupServer` via `vitest.config.ts`
  `setupFiles` **alongside** `test/setup.ts` (don't drop the storage shim), and
  update `docs/TESTING.md` + `rules/testing/test-strategy.md` §2 in the same
  change (web `CLAUDE.md` audit rule #36).
- **If the test reflects a notable testing-architecture decision**, add a
  `docs/decisions/ADR-*.md`. Otherwise skip.

---

## Security checks (must all hold)

- **Tenant isolation**: any test touching data asserts the call is scoped by
  `tenantId` (api: repository called with `tenantId`; web: query/service param
  carries it). Add this assertion for every new tenant-scoped query/mutation
  (`AGENTS.md` §6).
- **RBAC**: keep the dedicated `roles.guard`/`permissions.guard` specs green; new
  permission-gated behavior gets a test that `@RequirePermission`/`requirePermission`
  is **enforced**. A test must **never** disable auth, fake a token, or skip a
  guard to "make it pass" (api `CLAUDE.md` #23/#25; `AGENTS.md` §6).
- **No auth/secret/permission bypass via env**: never test through an
  `if (NODE_ENV === ...)` shortcut — use fixtures/DI (api `CLAUDE.md` #56).
- **No real secrets in fixtures**: use obvious dummies (`'tenant-001'`,
  `'test-key'`); never paste a real JWT, API key, or connector credential into a
  test — gitleaks is a **blocking** gate (`AGENTS.md` §5). AI memory/transcripts
  must not store secrets (`AGENTS.md` §7).
- **AI safety**: tests for AI code assert it **suggests** and that destructive
  actions are **approval-required** (a persisted `ApprovalRequest` exists before
  execution — api `CLAUDE.md` #97). Never assert/encode raw-AI-HTML rendering; the
  invariant is **never render raw AI output as HTML** (`AGENTS.md` §7).
- **No `any`**, no `// eslint-disable`, no `@ts-ignore`/`@ts-expect-error`
  anywhere (`AGENTS.md`; web `CLAUDE.md` #1/#2; api `CLAUDE.md` #1/#2 — absolute).

---

## Common mistakes

- **Wrong filename → test never runs.** Web must be `test/*.test.ts`; api must be
  `*.spec.ts`. The runner globs silently skip the other — and an unrun suite is RED.
- **Rendering a React component in Vitest.** No jsdom, no Testing Library. Test
  the service/util/store logic the component uses; render behavior is Playwright
  (web `CLAUDE.md` #48).
- **Importing `msw` / `setupServer` in a routine test.** `msw` is not installed —
  the import fails. Mock `@/lib/api` with `vi.mock(...)` instead.
- **Mocking `fetch`/`axios` directly or hitting the network.** Stub the `@/lib/api`
  instance (`vi.mock('@/lib/api', ...)`); the storage shim in `test/setup.ts`
  already covers `localStorage`.
- **Forgetting `vi.clearAllMocks()` / `jest.clearAllMocks()`** between tests →
  call counts leak across cases and give false greens.
- **api: importing `PrismaService` into the test.** Services don't take Prisma;
  mock the **repository** the service depends on (`createMockRepository()`).
- **Asserting raw `NotFoundException`/`ForbiddenException`** instead of
  `BusinessException` + `messageKey` (api `CLAUDE.md` #17/#18).
- **No `tenantId` assertion** on a tenant-scoped path → the isolation regression
  you were supposed to lock in is missing.
- **Bug fix without a failing-first test** → you didn't prove the regression.
- **Running `npx jest`/`npx vitest`** or `npm test` at the root → pnpm only,
  Node 22 (`rules/testing/test-strategy.md`).
- **Claiming "tests pass" without running them**, or running only the single file
  and skipping `pnpm test` + the blocking `typecheck`/`build` gates.
- **Working on `main`** instead of a branch (`AGENTS.md` §8).

---

## Final checklist

- [ ] Branched off `main` (`fix/…` | `feat/…` | `chore/…`).
- [ ] Correct app/runner/location/name: web Vitest → `apps/web/test/*.test.ts`;
      api Jest → `apps/api/test/**` or `src/modules/<m>/__tests__/` `*.spec.ts`.
- [ ] No React render / no jsdom assumptions in Vitest; UI behavior left to
      Playwright (web `CLAUDE.md` #48) where applicable.
- [ ] Web: mocked `@/lib/api` via `vi.mock`, `clearAllMocks` in teardown, asserted
      call args + returned data; **no `msw` import** (not installed).
- [ ] API: service built with `jest.fn()` repository/collaborator mocks; asserted
      **`tenantId` scope** and **`BusinessException` + `messageKey`** on errors.
- [ ] Security: no auth/guard/permission bypass, no env shortcut, no real
      secrets/tokens in fixtures; AI tests honor suggest-only + approval-required +
      no-raw-AI-HTML.
- [ ] No `any`; no eslint-disable/ts-ignore/ts-expect-error (ESLint runs on tests).
- [ ] Bug fix: the new test **failed before** the fix and **passes after**.
- [ ] `pnpm --filter @auraspear/web test` and/or `pnpm --filter @auraspear/api test`
      (or `pnpm test`) **run and green** — quoted, not assumed.
- [ ] Blocking gates green: `pnpm typecheck` (tsc, not tsgo), `pnpm lint`,
      `pnpm build`.
- [ ] No config edits (`vitest.config.ts` / api `"jest"`) unless you genuinely
      wired MSW — in which case `docs/TESTING.md` + `rules/testing/test-strategy.md`
      updated in the same change.
