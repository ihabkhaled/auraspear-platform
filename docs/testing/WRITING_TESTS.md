# Writing Tests — patterns & recipes

> **Entry point: [`AGENTS.md`](../../AGENTS.md).** Start there (loading order §1;
> the one rule — _understand before you edit_; validation gates §5; the §13 final
> report). This file is the **how-to-author** companion. It does **not** repeat
> the runner/config tables or the CI posture — those live in the top-level
> reference [`docs/TESTING.md`](../TESTING.md). Read that for "where everything is
> wired"; read this for "what a good test looks like and how to mock."

## How this fits the docs

| You want…                                               | Go to                                                                                               |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| The runner config, file locations, CI advisory posture  | [`docs/TESTING.md`](../TESTING.md)                                                                  |
| The binding rule for **where each kind of test lives**  | [`rules/testing/test-strategy.md`](../../rules/testing/test-strategy.md)                            |
| Hard-vs-advisory **quality gates** (what "green" means) | [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md)                            |
| The four-state rule for Playwright e2e                  | [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md)                                    |
| **Step-by-step recipe** to add a unit test              | [`skills/qa/add-unit-test.md`](../../skills/qa/add-unit-test.md)                                    |
| **Step-by-step recipe** to add a web e2e test           | [`skills/qa/add-e2e-test.md`](../../skills/qa/add-e2e-test.md)                                      |
| Validating a whole release                              | [`skills/qa/validate-release.md`](../../skills/qa/validate-release.md)                              |
| The app coding rules a test file still obeys            | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) · [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) |

This page covers **unit tests** (component-logic / hook-logic / util / service)
and how to **mock Prisma and AI providers**. Browser e2e (Playwright) and HTTP
e2e (supertest) are out of scope here — see the e2e skill/rules above.

---

## Two apps, two runners (the 30-second version)

| App                        | Runner             | Unit pattern | Lives in                                                       |
| -------------------------- | ------------------ | ------------ | -------------------------------------------------------------- |
| `@auraspear/web` (Next 16) | **Vitest**         | `*.test.ts`  | [`apps/web/test/`](../../apps/web/test)                        |
| `@auraspear/api` (Nest 11) | **Jest** (ts-jest) | `*.spec.ts`  | [`apps/api/test/`](../../apps/api/test) or module `__tests__/` |

**Filename is load-bearing.** Vitest's `include` is `test/**/*.test.ts`; Jest's
`testRegex` is `.*\.spec\.ts$`. A web file named `*.spec.ts` or an api file named
`*.test.ts` **will not run** — and a suite that never runs is RED, not green
(`apps/web/vitest.config.ts`, the `"jest"` block in `apps/api/package.json`).

Both test trees are **real TypeScript held to the repo rules**: no `any`, no
`// eslint-disable` / `@ts-ignore` / `@ts-expect-error`, `===`/`!==`, `const`/`let`,
no `!`, no semicolons, single quotes (`apps/web/CLAUDE.md` #1/#2; `apps/api/CLAUDE.md`
#1/#2). Test bodies get **relaxed** ESLint (no `any`-enforcement, no
explicit-return-type) — that relaxation is for the test file only and never
licenses weakening production code (`apps/api/CLAUDE.md` → _Testing_).

---

## What the unit layer tests (and what it does NOT)

The codebase deliberately pushes logic **out of glue and into testable layers**,
so that is exactly where unit tests concentrate:

- **Web** — `services/` (Axios wrappers), the logic a **hook** orchestrates,
  `lib/` utils, `stores/` (Zustand), Zod `lib/validation/` schemas, and `enums/`.
- **API** — `*.service.ts` methods and `*.utilities.ts` pure functions, plus
  guards/pipes (`common/guards`, `common/pipes`) and common utils
  (`common/utils/*.utility.ts`).

**Not** unit tests:

- **Rendering a React component / DOM behavior.** Web Vitest runs
  `environment: 'node'` — there is **no jsdom and no Testing Library wired**
  (`apps/web/test/setup.ts` only shims `localStorage`/`sessionStorage`). Do not
  call `renderHook`/`render`. Component, route, and UI behavior are **Playwright's**
  job (`apps/web/CLAUDE.md` rule 48; [`skills/qa/add-e2e-test.md`](../../skills/qa/add-e2e-test.md)).
- **Controllers, repositories, NestJS modules, barrel files.** Thin by design —
  exercise them through service units and e2e, not padded renders
  (`rules/testing/test-strategy.md` §5).
- **Full HTTP / auth / tenant-isolation flows.** Those are e2e: api
  `*.e2e-spec.ts` (real guard chain + `supertest`), web Playwright.

---

## API unit (Jest) — service pattern

Services are thin orchestrators that **never import `PrismaService`** — they take
a **repository** (`apps/api/CLAUDE.md` #14a/#14b). So you **mock the repository**,
not Prisma. Build the service with hand-rolled `jest.fn()` mocks. Canonical
reference: [`apps/api/test/modules/alerts.service.spec.ts`](../../apps/api/test/modules/alerts.service.spec.ts).

```ts
// apps/api/test/modules/foo.service.spec.ts
import { BusinessException } from '../../src/common/exceptions/business.exception'
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
    jest.clearAllMocks()
    service = new FooService(repository as never) // mock satisfies the repo contract
  })

  it('scopes the lookup by tenantId', async () => {
    repository.findFirstByIdAndTenant.mockResolvedValue({ id: FOO_ID, tenantId: TENANT_ID })

    await service.getFoo(TENANT_ID, FOO_ID)

    expect(repository.findFirstByIdAndTenant).toHaveBeenCalledWith(FOO_ID, TENANT_ID)
  })

  it('throws BusinessException 404 when not found', async () => {
    repository.findFirstByIdAndTenant.mockResolvedValue(null)

    try {
      await service.getFoo(TENANT_ID, 'nonexistent')
      fail('Expected BusinessException to be thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessException)
      expect((error as BusinessException).getStatus()).toBe(404)
    }
  })
})
```

Non-negotiables for an api service spec:

- **Assert the `tenantId` scope** on every data-access call — that is the
  tenant-isolation regression (`AGENTS.md` §6; `apps/api/CLAUDE.md` #26;
  [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)).
  Real example: `alerts.service.spec.ts` asserts
  `findFirstByIdAndTenant` was called `(ALERT_ID, TENANT_ID)`.
- **Assert `BusinessException` + the right status/`messageKey`** on error paths —
  never raw `NotFoundException`/`ForbiddenException` (`apps/api/CLAUDE.md` #17/#18).
  `alerts.service.spec.ts` checks `getStatus()` of `400`/`404`; the guard spec
  [`tenant.guard.spec.ts`](../../apps/api/test/guards/tenant.guard.spec.ts) checks
  `messageKey === 'errors.auth.tenantRequired'`.
- **Use `build*` fixture factories with overrides** for entities
  (`buildMockAlert({ status: 'closed' })`) and constants like
  `const TENANT_ID = 'tenant-001'` — copy `alerts.service.spec.ts`.
- **`jest.clearAllMocks()` in `beforeEach`** so call counts don't leak across cases.

### API unit — utility / guard pattern

For `*.utilities.ts` and `common/utils/*.utility.ts`, import the named function and
assert **input → output** directly — no service to construct. See
[`apps/api/test/utils/encryption.utility.spec.ts`](../../apps/api/test/utils/encryption.utility.spec.ts)
(encrypt/decrypt round-trip, wrong-key throws, tampered-ciphertext throws).

For **guards**, stub an `ExecutionContext` and assert allow/deny + the thrown
`BusinessException`. See
[`tenant.guard.spec.ts`](../../apps/api/test/guards/tenant.guard.spec.ts) and
[`permissions.guard.spec.ts`](../../apps/api/test/guards/permissions.guard.spec.ts)
(which mocks `RoleSettingsService.getUserPermissions` and the `Reflector`):

```ts
function createMockContext(user?: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext
}
```

RBAC/tenant guard specs are **non-negotiable coverage** — keep them green and add
a case for any new permission-gated behavior (`rules/testing/test-strategy.md` §5).
A test must **never** disable a guard, fake a token, or bypass auth to "make it
pass" (`apps/api/CLAUDE.md` #23/#25; `AGENTS.md` §6).

---

## Web unit (Vitest) — service / hook-logic pattern

Mock the **Axios instance** (`@/lib/api`), not `fetch` and not the network. MSW is
a documented target convention but **`msw` is not installed and no handlers exist**
today (`docs/TESTING.md` → _MSW / request mocking_; `rules/testing/test-strategy.md`
§2) — do **not** add an `msw` import in a routine test. Canonical reference:
[`apps/web/test/ai-triage-hook.test.ts`](../../apps/web/test/ai-triage-hook.test.ts).

```ts
// apps/web/test/foo-service.test.ts
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

### "Component / hook" tests test the **logic**, not a render

Because there is no Testing Library, a "hook test" exercises the **service calls +
the `hasPermission(...)` gating** the hook composes — not a rendered hook.
`ai-triage-hook.test.ts` does exactly this: it asserts `alertService.triage*` hit
the right endpoint **and** that `hasPermission(perms, Permission.AI_ALERT_TRIAGE)`
gates correctly. That permission gating **is** the component-logic coverage; the
visible UI is then covered by a Playwright spec (`apps/web/CLAUDE.md` rule 48).

### Web unit — util / schema / store patterns

- **Pure utils / enums** — import via `@` and assert outputs. See
  [`apps/web/test/case-utils.test.ts`](../../apps/web/test/case-utils.test.ts)
  (`getInitials`, status-transition maps).
- **Zod schemas** — assert `.safeParse(input).success`. See
  [`apps/web/test/cases-schema.test.ts`](../../apps/web/test/cases-schema.test.ts).
- **Stores** — drive actions and assert state; the `test/setup.ts` storage shim
  makes `localStorage`-backed stores work without a DOM. See
  [`apps/web/test/auth-store-permissions.test.ts`](../../apps/web/test/auth-store-permissions.test.ts)
  (`setPermissions`, `logout` clears state). Reset state in `beforeEach`
  (e.g. `useAuthStore.getState().logout()`).

---

## Mocking Prisma

**You almost never mock `PrismaClient` directly in a unit test.** Layering
(`apps/api/CLAUDE.md` #14a/#14b) keeps all Prisma access inside repositories, and
services depend on the **repository interface**. So:

- **Service unit** → mock the **repository** (`createMockRepository()` returning
  `jest.fn()`s), as in `alerts.service.spec.ts`. The repository's Prisma calls are
  out of scope for the service test. Assert the repository was called with the
  right args **including `tenantId`**.
- **Repository unit** → not the focus of the unit layer; repositories are thin
  data-access and are validated through service units + e2e
  (`rules/testing/test-strategy.md` §5). If you must construct one, inject a stub
  with only the Prisma model methods the code calls
  (`{ alert: { findMany: jest.fn(), ... } } as never`) — never spin up a real DB
  in a `*.spec.ts`.
- **Real database** belongs to **e2e** (`*.e2e-spec.ts`), which bootstraps a real
  Nest app via `@nestjs/testing` and the CI `test` job's Postgres/Redis containers
  (`docs/TESTING.md` → _CI_). Even there, `auth-flow.e2e-spec.ts` mocks
  `PrismaService` methods rather than hitting a live DB for deterministic auth
  assertions.

**`tenantId` in mocks is the point, not decoration.** The reason to mock the repo
(rather than Prisma) is to make the tenant-scope assertion explicit:
`expect(repository.updateByIdAndTenant).toHaveBeenCalledWith(ID, TENANT_ID, ...)`.
Every new tenant-scoped query/mutation lands with that assertion (`AGENTS.md` §6).

---

## Mocking AI providers

AI work routes through a **provider cascade** (bedrock → llm_apis → openclaw_gateway,
then rule-based fallback) and pulls decrypted connector config via the connectors
service (`apps/api/CLAUDE.md` #88/#89; `apps/web/CLAUDE.md` "AI Connector Strategy").
Keep unit tests **offline and deterministic** — never call a real provider SDK or
network:

- **API service unit** — inject a **mock connectors service**
  (`createMockConnectorsService()` with `getDecryptedConfig: jest.fn()`) and stub
  the provider/adapter collaborators. `alerts.service.spec.ts` already does this for
  the Wazuh path (`connectorsService.getDecryptedConfig.mockResolvedValue(config)`,
  `wazuhService.searchAlerts.mockResolvedValue(...)`) — mirror it for AI: stub the
  adapter's `complete`/`invoke` method, assert which connector was chosen, and assert
  the **fallback** triggers only when all connectors are unavailable (#88). Provider
  adapter specs (`test/modules/bedrock.service.spec.ts`) mock the SDK/transport, not
  the cloud.
- **Web** — AI calls go through `@/lib/api`, so mock it exactly like any other
  service (`ai-triage-hook.test.ts`). Assert the endpoint + that the result shape
  (`result`, `confidence`, `model`) flows through, and that the **permission gate**
  (e.g. `Permission.AI_ALERT_TRIAGE`) is enforced. Don't assert a model's prose —
  it's non-deterministic; assert the **contract** (endpoint, states, gating).

AI-safety invariants a test must respect (`AGENTS.md` §7; `rules/ai/`):

- Destructive AI actions are **approval-required** — assert a persisted
  `ApprovalRequest` exists before execution (`apps/api/CLAUDE.md` #97); AI never
  silently executes.
- AI memory/transcripts **must not store secrets** — never put a real key/token in
  an AI fixture.
- **Never** assert or encode raw-AI-output-as-HTML — the invariant is plain
  text / safe markdown only (`AGENTS.md` §7; `react/no-danger` is an ESLint error).

---

## Security & fixture hygiene (applies to every test)

- **No real secrets in fixtures** — use obvious dummies (`'tenant-001'`,
  `'test-key'`, `randomBytes(32).toString('hex')` as in `encryption.utility.spec.ts`).
  Never paste a real JWT, API key, or connector credential — gitleaks is a
  **hard** gate over full history (`rules/testing/quality-gates.md`).
- **No `NODE_ENV` bypass** — security is tested via fixtures/DI, never an
  `if (NODE_ENV === ...) skip` shortcut (`apps/api/CLAUDE.md` #56).
- **No auth/guard/permission bypass** to make a test pass; the backend is the
  authoritative boundary.
- **Bug fix → regression test** that **fails before** the fix and **passes after**;
  a test green before the fix tests nothing (`rules/testing/test-strategy.md` §5).

---

## Run commands

`pnpm` only, Node 22, from repo root — never `npm`/`yarn`/`npx` at the monorepo
root (`rules/testing/test-strategy.md`). The full command map is in
[`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md).

> **Workspace is mid-upgrade — do not run `pnpm install` as part of this doc task.**
> The commands below are the canonical invocations to use once the workspace is
> healthy.

```bash
# whole monorepo (Turborepo) — runs web Vitest + api Jest unit suites
pnpm test

# scope to one app
pnpm --filter @auraspear/web test     # vitest run --pool=threads
pnpm --filter @auraspear/api test     # jest --maxWorkers=100%

# iterate on a single file / single test
pnpm --filter @auraspear/web exec vitest run test/<name>.test.ts
pnpm --filter @auraspear/api exec jest test/modules/<name>.service.spec.ts -t "scopes the lookup"

# watch mode while writing
pnpm --filter @auraspear/web exec vitest            # watch
pnpm --filter @auraspear/api test:watch

# coverage (informational — no numeric gate is configured)
pnpm --filter @auraspear/web exec vitest run --coverage   # @vitest/coverage-v8
pnpm --filter @auraspear/api test:cov                     # jest --coverage → ./coverage
```

Because the test file is real source, also keep the **blocking** gates green
(`AGENTS.md` §5; `rules/testing/quality-gates.md`):

```bash
pnpm typecheck   # tsc --noEmit (blocking) — NOT typecheck:fast (tsgo is advisory)
pnpm lint        # ESLint runs on test/ too (relaxed rules, not absent)
pnpm build       # blocking gate
```

Tests themselves are the **advisory** `test` gate (CI `continue-on-error`) — but
advisory ≠ optional: run them, never make the suite worse, and **never claim a
gate green without running it** (`AGENTS.md` §5/§13; enforced by the
`qa-gatekeeper` subagent, which rejects claims without command output). Pre-commit
hooks run ESLint/`tsc`/Prettier on staged files only — **they do not run tests**
(`apps/*/CLAUDE.md`), so running the suite is on you.

---

## Common mistakes

- **Wrong filename → the test never runs.** Web = `test/*.test.ts`; api = `*.spec.ts`.
- **Rendering a React component / `renderHook` in Vitest** — no jsdom, no Testing
  Library. Test the service/util/store/permission logic; render behavior is Playwright.
- **Importing `msw` / `setupServer`** in a routine web test — not installed; mock
  `@/lib/api` with `vi.mock(...)`.
- **Mocking `PrismaService` in a service unit** — services take a **repository**;
  mock that.
- **Asserting raw `NotFoundException`/`ForbiddenException`** instead of
  `BusinessException` + status/`messageKey`.
- **Missing the `tenantId` assertion** on a tenant-scoped path.
- **Calling a real AI provider / asserting model prose** — mock the connector/adapter
  and assert the contract.
- **Forgetting `vi.clearAllMocks()` / `jest.clearAllMocks()`** — call counts leak
  and give false greens.
- **Claiming "tests pass" without running them**, or running only one file and
  skipping `pnpm test` + the blocking `typecheck`/`build` gates.
- **Working on `main`** instead of a branch (`AGENTS.md` §8).

---

## See also

- [`docs/TESTING.md`](../TESTING.md) — runner config, locations, CI posture (the reference).
- [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md) — the central docs index.
- [`rules/testing/`](../../rules/testing/) — `test-strategy.md`, `quality-gates.md`, `e2e-rules.md`.
- [`skills/qa/`](../../skills/qa/) — `add-unit-test.md`, `add-e2e-test.md`, `validate-release.md`.
- [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) · [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) — the app coding rules a test still obeys.
