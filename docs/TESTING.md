# Testing

This document describes the testing setup for the AuraSpear platform monorepo. Two apps have distinct stacks:

- **`apps/web`** (`@auraspear/web`, Next.js 16) — unit/logic tests with **Vitest**, browser end-to-end tests with **Playwright**.
- **`apps/api`** (`@auraspear/api`, NestJS 11) — unit and e2e tests with **Jest** (`ts-jest`).

Tests are run per-workspace and orchestrated across the monorepo by **Turborepo** (`pnpm test` → `turbo run test`, see root `package.json`).

---

## Web (`apps/web`)

### Vitest — unit / logic tests

Configured in [`apps/web/vitest.config.ts`](../apps/web/vitest.config.ts):

| Setting       | Value                                        |
| ------------- | -------------------------------------------- |
| `environment` | `node`                                       |
| `globals`     | `true` (no need to import `describe`/`test`) |
| `include`     | `test/**/*.test.ts`                          |
| `setupFiles`  | `test/setup.ts`                              |
| Alias         | `@` → `./src`                                |
| Coverage      | `@vitest/coverage-v8` (dev dependency)       |

Tests live in [`apps/web/test/`](../apps/web/test/) and use the `*.test.ts` naming pattern. There are ~100 spec files covering services, hooks, utilities, enums, stores, schemas, and permission logic — e.g. `utils.test.ts`, `alert-service.test.ts`, `ai-triage-hook.test.ts`, `permissions.test.ts`, `stores.test.ts`.

Because the environment is `node` (not `jsdom`), the test setup ([`apps/web/test/setup.ts`](../apps/web/test/setup.ts)) installs an in-memory `Storage` shim for `globalThis.localStorage` and `globalThis.sessionStorage`, so store/service code that touches web storage runs without a DOM.

Tests import directly from source via the `@` alias and assert on Vitest matchers:

```ts
import { describe, test, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn', () => {
  test('should resolve Tailwind conflicts via twMerge', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })
})
```

**Scope:** Vitest covers the logic layer — services (Axios wrappers), custom hooks, `lib/` utilities, enums/constants, Zustand stores, Zod schemas, and column/permission helpers. It does **not** render React components (no jsdom, no Testing Library). UI behavior is covered by Playwright instead.

Scripts (from [`apps/web/package.json`](../apps/web/package.json)):

```bash
npm run test          # vitest run --pool=threads  (single pass, CI-style)
npm run test:watch    # vitest                     (watch mode)
```

### Playwright — end-to-end tests

Configured in [`apps/web/playwright.config.ts`](../apps/web/playwright.config.ts):

| Setting             | Value                                              |
| ------------------- | -------------------------------------------------- |
| `testDir`           | `./e2e`                                            |
| `timeout`           | `30_000` ms per test                               |
| `retries`           | `0`                                                |
| `baseURL`           | `http://localhost:3000`                            |
| `headless`          | `true`                                             |
| `screenshot`        | `only-on-failure`                                  |
| `trace`             | `on-first-retry`                                   |
| `projects`          | `chromium` only                                    |
| `webServer.command` | `npm run dev` (auto-starts the app on port `3000`) |
| `webServer`         | `reuseExistingServer: true`, `timeout: 120_000` ms |

Playwright boots the dev server automatically (reusing one already running) before the suite. Specs live in [`apps/web/e2e/`](../apps/web/e2e/): `auth.spec.ts`, `dashboard.spec.ts`, `alerts.spec.ts`, `cases.spec.ts`, `ai-config.spec.ts`.

These are real browser flows that navigate routes, fill forms, click, and assert on URLs and visible elements — for example the auth flow checks redirect-to-login, successful login, and the invalid-credentials error toast:

```ts
test('should show login page when not authenticated', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/login/)
})
```

Per the web app conventions ([`apps/web/CLAUDE.md`](../apps/web/CLAUDE.md), rule 48), **every new page route must have a corresponding Playwright test file**, minimally covering loaded, empty, error, and responsive states.

Scripts:

```bash
npm run test:e2e       # playwright test
npm run test:e2e:ui    # playwright test --ui  (interactive runner)
```

### MSW / request mocking

There is **no MSW (Mock Service Worker) integration in the current codebase** — `msw` is not a dependency in `apps/web/package.json`, and no `setupServer`/`http`/`rest` handlers exist in the source tree. The architecture diagram in [`apps/web/CLAUDE.md`](../apps/web/CLAUDE.md) references a `src/mocks/` directory for "MSW mock handlers + data", but that directory is not present in the repository as inspected.

In practice:

- **Vitest** tests exercise logic directly and mock collaborators in-process (e.g. the `localStorage`/`sessionStorage` shims in `test/setup.ts`); they do not intercept network calls via MSW.
- **Playwright** e2e tests run against the real `npm run dev` server rather than a mocked API layer.

> If you add network mocking later, follow the `src/mocks/` convention named in `CLAUDE.md` and wire it through `vitest.config.ts`'s `setupFiles`.

---

## API (`apps/api`)

### Jest — unit tests

The Jest config is inline in [`apps/api/package.json`](../apps/api/package.json) under the `"jest"` key:

| Setting                | Value                                  |
| ---------------------- | -------------------------------------- |
| `moduleFileExtensions` | `js`, `json`, `ts`                     |
| `rootDir`              | `.`                                    |
| `testRegex`            | `.*\.spec\.ts$`                        |
| `transform`            | `ts-jest` (with `diagnostics: false`)  |
| `testEnvironment`      | `node`                                 |
| `moduleNameMapper`     | `^@/(.*)$` → `<rootDir>/src/$1`        |
| `collectCoverageFrom`  | `src/**/*.ts`, excluding `src/main.ts` |
| `coverageDirectory`    | `./coverage`                           |

Unit specs use the `*.spec.ts` pattern and live in [`apps/api/test/`](../apps/api/test/), organized into subfolders:

- `test/guards/` — `auth.guard.spec.ts`, `roles.guard.spec.ts`, `tenant.guard.spec.ts`, `permissions.guard.spec.ts`
- `test/utils/` — `encryption.utility.spec.ts`, `ssrf.utility.spec.ts`, `mask.utility.spec.ts`, `redaction.utility.spec.ts`, `role.utility.spec.ts`, `connector-http.utility.spec.ts`, etc.
- `test/services/` — `impersonation.spec.ts`, `service-logger.spec.ts`, `tenant-privacy.spec.ts`
- `test/modules/` — the bulk of coverage: per-module service specs (`alerts.service.spec.ts`, `cases.service.spec.ts`, `auth.service.spec.ts`, `connectors.service.spec.ts`, `ai.service.spec.ts`, `hunts.service.spec.ts`, …), connector adapter specs (`wazuh`, `opensearch`, `misp`, `shuffle`, `bedrock`, `grafana`, `graylog`, `influxdb`, `logstash`, `velociraptor`), executors (`detection-executor`, `correlation-executor`, `normalization-executor`), and controllers/gateways (`auth.controller.spec.ts`, `notifications.controller.spec.ts`, `notifications.gateway.spec.ts`).

Specs import directly from source and test pure functions, guards, and services with mocked dependencies. Example from the encryption utility:

```ts
import { encrypt, decrypt } from '../../src/common/utils/encryption.utility'

it('should encrypt and decrypt a string', () => {
  const encrypted = encrypt(plaintext, key)
  expect(decrypt(encrypted, key)).toBe(plaintext)
})
```

Per the backend conventions ([`apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) → _Testing_): test guards, utilities, and pipes as units; **test files have relaxed ESLint rules** (no `any` enforcement, no explicit-return-type requirement). The per-module structure also anticipates `__tests__/` folders co-located with modules for `*.service.spec.ts` / `*.controller.spec.ts` / `*.e2e.spec.ts`.

Scripts:

```bash
npm run test          # jest --maxWorkers=100%   (unit, *.spec.ts)
npm run test:watch    # jest --watch
npm run test:cov      # jest --coverage          (outputs to ./coverage)
```

### Jest — e2e tests

End-to-end API tests use a separate Jest config, [`apps/api/test/jest-e2e.json`](../apps/api/test/jest-e2e.json):

| Setting            | Value                           |
| ------------------ | ------------------------------- |
| `rootDir`          | `..` (the app root)             |
| `testEnvironment`  | `node`                          |
| `testRegex`        | `.e2e-spec.ts$`                 |
| `transform`        | `ts-jest`                       |
| `moduleNameMapper` | `^@/(.*)$` → `<rootDir>/src/$1` |

E2e specs use the `*.e2e-spec.ts` pattern — e.g. [`apps/api/test/auth/auth-flow.e2e-spec.ts`](../apps/api/test/auth/auth-flow.e2e-spec.ts). They bootstrap a real Nest application via `@nestjs/testing` (`Test.createTestingModule`), wire real guards/filters (`AuthGuard`, `GlobalExceptionFilter`, `ThrottlerGuard`), and drive HTTP requests with **`supertest`**. Per [`apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) (rule 56), security checks are exercised through real fixtures/DI rather than `NODE_ENV`-gated bypasses.

Script:

```bash
npm run test:e2e      # jest --config ./test/jest-e2e.json
```

---

## Test types at a glance

| Type            | Web                                                                           | API                                                                           |
| --------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Unit**        | Vitest — services, hooks, utils, enums, stores, schemas (`test/**/*.test.ts`) | Jest — guards, utilities, pipes, service logic (`*.spec.ts`)                  |
| **Integration** | Covered within Vitest service/hook specs (no separate runner)                 | Jest module specs that exercise service + repository/util collaboration       |
| **E2E**         | Playwright — real browser flows against `npm run dev` (`e2e/*.spec.ts`)       | Jest + supertest — full Nest app over HTTP (`*.e2e-spec.ts`, `jest-e2e.json`) |

---

## Coverage

- **Web:** coverage tooling is `@vitest/coverage-v8` (dev dependency). There is no `--coverage` flag baked into the `test` script and no enforced threshold in `vitest.config.ts` — run coverage on demand with `npx vitest run --coverage`.
- **API:** `npm run test:cov` produces a report in `./coverage`. `collectCoverageFrom` includes all of `src/**/*.ts` except the bootstrap entry `src/main.ts`. No coverage threshold is enforced in the Jest config.

**Coverage philosophy** (as reflected in the suites and the app CLAUDE.md files):

- The web app pushes business logic out of components and into services, hooks, `lib/` utilities, and stores (enforced by ESLint separation-of-concerns rules). That logic layer is where Vitest concentrates — components themselves are validated through Playwright e2e rather than unit-rendered.
- The API app pushes business logic out of controllers/repositories and into services and `*.utilities.ts` (strict layering). Jest concentrates on services, utilities, guards, and pipes; controllers and full request flows are validated via the supertest e2e suites.
- Security-sensitive code (encryption, SSRF validation, masking/redaction, auth guards, token blacklist, JWT rotation) has dedicated specs.

No numeric coverage gate is configured in either app, so coverage is treated as informational rather than a hard CI gate (see CI section below).

---

## What to run before committing

**Pre-commit hooks (Husky + lint-staged)** run automatically on staged files and cover **ESLint + TypeScript (`tsc --noEmit`) + Prettier** — they do **not** run the test suites (see each app's `CLAUDE.md`).

Run tests manually before committing meaningful changes:

```bash
# Web
cd apps/web
npm run test           # Vitest unit/logic
npm run test:e2e       # Playwright (optional — needs the app to build/run)

# API
cd apps/api
npm run test           # Jest unit
npm run test:e2e       # Jest + supertest e2e
```

Convenience aggregate scripts (per app `package.json`):

- **Web:** `npm run validate` = `typecheck` + `lint:strict` + `format:check`; `npm run validate:full` additionally runs `test` and `build`.
- **API:** `npm run validate` = `typecheck` + `lint:strict` + `format:check`; `npm run validate:full` additionally runs `test` and `build`.

From the **monorepo root**, run everything through Turborepo:

```bash
pnpm test         # turbo run test       (Vitest + Jest across workspaces)
pnpm test:cov     # turbo run test:cov
pnpm test:e2e     # turbo run test:e2e
pnpm validate:full # turbo run typecheck lint:strict test build
```

---

## CI — advisory test job

The GitHub Actions workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) defines a dedicated `test` job:

- Named **`test (advisory)`** and marked **`continue-on-error: true`** — test failures are surfaced but **do not block** the pipeline (advisory only).
- Spins up service containers: **PostgreSQL 16** (`auraspear_soc` database, `auraspear`/`auraspear` credentials, port 5432) and **Redis 7** (port 6379), each with health checks.
- Exposes `DATABASE_URL`, `REDIS_HOST`, and `REDIS_PORT` to the job so the API tests can reach the services.
- Steps: checkout → set up pnpm → set up Node → `pnpm install --frozen-lockfile` → `pnpm --filter @auraspear/api prisma:generate` → **`pnpm test`** (labeled "Unit tests (web + api)").

Because the job runs `pnpm test` (Turborepo), it executes the **web Vitest** and **API Jest** unit suites together. The Playwright (`test:e2e`) and API e2e (`test:e2e`) suites are **not** invoked by this CI job. Treat green tests as a signal, not a gate — the advisory status means a failing test will not fail the overall CI run.
