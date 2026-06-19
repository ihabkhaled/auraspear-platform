# E2E Testing — Playwright (`apps/web/e2e`)

> **Start at [`AGENTS.md`](../../AGENTS.md)** (repo root) — the single AI + human
> entry point: the loading order (§1), the one rule (_no AI agent may edit first
> and understand later_), the validation gates (§5), and the security (§6) /
> AI-safety (§7) invariants the E2E suite exists to protect from the browser side.
>
> This page is the **practitioner walkthrough** of the web app's Playwright
> end-to-end suite: what specs exist today, the config contract, the four states
> each page must cover (with the **real selectors** the specs use), how to run
> `pnpm test:e2e`, and what has to be reachable first. It deliberately does **not**
> repeat the layers that already own each concern — read those instead of this:
>
> | You want…                                                                                   | Read                                                                     |
> | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
> | **Why** the suite is shaped this way (Vitest vs Jest vs Playwright, layer-aligned strategy) | [`docs/testing/TESTING_STRATEGY.md`](./TESTING_STRATEGY.md)              |
> | The full config/script/CI **reference** (all three runners)                                 | [`docs/TESTING.md`](../TESTING.md)                                       |
> | **How to author** a new spec, step by step                                                  | [`skills/qa/add-e2e-test.md`](../../skills/qa/add-e2e-test.md)           |
> | The **hard rules** (rule 48, the four states, real-login auth, tenant/RBAC, AI safety)      | [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md)         |
> | What "green" means (hard vs advisory gates)                                                 | [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md) |
> | The mandate itself                                                                          | [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) **rule 48**             |
>
> Sibling deep-dive: [`docs/testing/WRITING_TESTS.md`](./WRITING_TESTS.md) covers
> the **unit** layer (Vitest/Jest, mocking) — Playwright is out of scope there, by
> design, and is the subject of this page.

---

## 1. What this layer is (and is not)

E2E = **real browser, real Next.js dev server, real login**. Playwright drives
[`@auraspear/web`](../../apps/web) (Next.js 16) as a user would: navigate a route,
fill the login form, click rows, and assert on URLs and visible design-system
elements. It is the **only** layer that renders React in this repo — the Vitest
unit layer runs `environment: 'node'` with **no jsdom and no Testing Library**, so
component/route/UI behavior is Playwright's job, not Vitest's
([`docs/testing/TESTING_STRATEGY.md`](./TESTING_STRATEGY.md) §2;
[`docs/testing/WRITING_TESTS.md`](./WRITING_TESTS.md)).

Scope note: this page is the **web app's Playwright suite only**. The API (NestJS)
has a separate end-to-end layer — Jest + `supertest` over the real Nest app
(`*.e2e-spec.ts`, `apps/api/test/jest-e2e.json`); see
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) → _Testing_ and
[`docs/TESTING.md`](../TESTING.md) → _Jest e2e_. The two are different runners with
different files — don't conflate them.

|          | Web E2E (this page)                                                    | API E2E                                           |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| Runner   | `@playwright/test` (real browser)                                      | Jest + `supertest` (HTTP)                         |
| Lives in | [`apps/web/e2e/*.spec.ts`](../../apps/web/e2e)                         | `apps/api` `*.e2e-spec.ts`                        |
| Config   | [`apps/web/playwright.config.ts`](../../apps/web/playwright.config.ts) | `apps/api/test/jest-e2e.json`                     |
| Script   | `test:e2e` → `playwright test`                                         | `test:e2e` → `jest --config …`                    |
| Proves   | UI contract, redirects, four states                                    | guard chain, tenant isolation, `messageKey` shape |

---

## 2. The suite today

Five specs live in [`apps/web/e2e/`](../../apps/web/e2e). They are the **pattern to
copy, not the ceiling** — the route inventory is far larger than five and most
routes are not yet covered ([`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md)
§1 lists the gaps and the named must-add surfaces: `ai-chat`, the `admin/*` family,
`connectors`).

| Spec                                                        | Route(s)                | What it exercises                                                                                    |
| ----------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------- |
| [`auth.spec.ts`](../../apps/web/e2e/auth.spec.ts)           | `/login`, `/dashboard`  | signed-out → `/login` redirect; valid-credentials login; invalid-credentials **error surface**       |
| [`dashboard.spec.ts`](../../apps/web/e2e/dashboard.spec.ts) | `/dashboard`            | KPI cards visible; sidebar nav visible (the responsive/chrome anchor)                                |
| [`alerts.spec.ts`](../../apps/web/e2e/alerts.spec.ts)       | `/alerts`               | `<DataTable>` renders; row-click opens the detail **drawer/sheet**                                   |
| [`cases.spec.ts`](../../apps/web/e2e/cases.spec.ts)         | `/cases`, `/cases/[id]` | list table; navigate to a dynamic detail route; AI Findings panel present                            |
| [`ai-config.spec.ts`](../../apps/web/e2e/ai-config.spec.ts) | `/ai-config`            | tab navigation (`agents`/`schedules`/`findings`); agent cards; **"rows _or_ empty state"** tolerance |

Spec naming is **kebab-case after the route**: `/alerts` → `alerts.spec.ts`,
`/ai-config` → `ai-config.spec.ts`. Dynamic routes (`/cases/[id]`) share the
parent's spec and add a detail test.

---

## 3. The config contract

Everything the runner does is defined in
[`apps/web/playwright.config.ts`](../../apps/web/playwright.config.ts) — respect it,
don't fork it per-spec. The full table is also in
[`docs/TESTING.md`](../TESTING.md); the load-bearing values:

| Setting                         | Value                   | Why it matters to you                                                            |
| ------------------------------- | ----------------------- | -------------------------------------------------------------------------------- |
| `testDir`                       | `./e2e`                 | specs only run from here                                                         |
| `timeout`                       | `30_000` ms/test        | individual `expect(...)` timeouts (e.g. `10_000`) are tighter, set per-assertion |
| `retries`                       | **`0`**                 | **flake = failure** — wait on real conditions, never `waitForTimeout`            |
| `baseURL`                       | `http://localhost:3000` | `page.goto('/alerts')` resolves against the running web app                      |
| `headless`                      | `true`                  | no visible browser in a normal run; use `test:e2e:ui` to watch                   |
| `screenshot`                    | `only-on-failure`       | a failing test leaves a screenshot artifact                                      |
| `trace`                         | `on-first-retry`        | with `retries: 0`, traces are effectively off in plain runs                      |
| `projects`                      | `chromium` only         | one browser today; not cross-browser                                             |
| `webServer.command`             | `npm run dev`           | Playwright **auto-boots** the app on port `3000`                                 |
| `webServer.reuseExistingServer` | `true`                  | if `:3000` is already up, it reuses it                                           |
| `webServer.timeout`             | `120_000` ms            | how long it waits for the dev server to come up                                  |

**`retries: 0` is a strategy choice, not an oversight** — a flaky spec fails the
suite, so specs must wait on real conditions (`expect(locator).toBeVisible({ timeout })`,
`expect(page).toHaveURL(...)`) and **never** sleep
([`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md) §6).

---

## 4. Authentication — a real login, every time

Every protected-route spec authenticates through the **real login form** in a
`test.beforeEach` — there is **no auth bypass, no token injection, no fake
session** anywhere (`AGENTS.md` §6; [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
rule 23 — no dev-mode auth shortcut in any environment). The full guard chain
(JWT verify + DB-active check) runs. This is the shared shape used by
`dashboard.spec.ts`, `alerts.spec.ts`, `cases.spec.ts`, and `ai-config.spec.ts`:

```ts
test.beforeEach(async ({ page }) => {
  await page.goto('/login')
  await page.fill('input[name="email"]', 'platform-admin@auraspear.io')
  await page.fill('input[name="password"]', 'Admin@123!Secure')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
})
```

- The literal credential inline in the specs is a **seed-only, local-dev test
  fixture** — _not_ a production secret. Don't reuse or treat it as one; prefer
  reading it from the test environment over hardcoding new credentials. The seed
  password is a **required env var with no fallback** (`SEED_DEFAULT_PASSWORD`,
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 54), and `AGENTS.md` §6
  forbids committed/fallback secrets.
- The **signed-out redirect is itself a test**: `auth.spec.ts` asserts `/dashboard`
  redirects to `/login` when unauthenticated (`src/middleware.ts` route
  protection). Each protected route should have an equivalent assertion or lean on
  the shared `auth.spec.ts`.

---

## 5. The four states every page spec covers

`apps/web/CLAUDE.md` **rule 48** is absolute: _every new page route MUST have a
Playwright spec covering **loaded · empty · error · responsive**._ A happy-path-only
spec is a rule-48 violation. Structure each spec as `test.describe('<Page>')` with
one named `test(...)` per state so a reviewer sees coverage at a glance. The
authoritative wording is [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md)
§2; the selectors below are the ones the **existing specs actually use**.

### Selectors track the design system

Assert on the MUST-USE components from
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) → _Components — MUST USE_, **not**
raw HTML — the app does not use raw `<table>`/`<input>` (rules 4, 11). Prefer
role/text locators; class-substring (`[class*=…]`) is a **last resort**.

| Surface       | Locator the specs use                                    | Component                                |
| ------------- | -------------------------------------------------------- | ---------------------------------------- |
| Page title    | `h1, [data-testid="page-title"]`                         | `PageHeader`                             |
| Data table    | `table, [role="table"]`                                  | `<DataTable>` from `@/components/common` |
| Table row     | `tbody tr, [role="row"]`                                 | `<DataTable>` row                        |
| Detail panel  | `[role="dialog"], [class*="Sheet"], [class*="Drawer"]`   | Sheet/Drawer                             |
| Tabs          | `getByRole('tab', { name: /…/i })`                       | shadcn Tabs                              |
| Toast / error | `[role="alert"], [data-sonner-toast], .text-destructive` | `Toast` (sonner)                         |
| Sidebar       | `nav, [class*="sidebar"], [class*="Sidebar"]`            | layout chrome                            |
| KPI cards     | `[class*="card"], [class*="Card"]`                       | dashboard cards                          |

### (a) Loaded — primary surface visible

Authenticated, data present, the page's main surface renders. `alerts.spec.ts`
asserts the table, then opens the row detail drawer; `dashboard.spec.ts` asserts the
title + a card:

```ts
test('should navigate to alerts page and show table', async ({ page }) => {
  await page.goto('/alerts')
  await expect(page).toHaveURL(/alerts/)
  const table = page.locator('table, [role="table"]')
  await expect(table.first()).toBeVisible({ timeout: 10_000 })
})
```

### (b) Empty — empty state, never a crash or infinite spinner

Zero rows / no results must show `<EmptyState>` (or the DataTable `emptyMessage`),
not a crash or an endless spinner. Drive it with a no-match filter/search. Like
`ai-config.spec.ts`, tolerate "rows **or** empty" so the spec is deterministic
regardless of seed data:

```ts
await expect(
  page.locator('[class*="finding"], [class*="Finding"], [class*="empty"]').first()
).toBeVisible({ timeout: 10_000 })
```

### (c) Error — a visible, **localized** surface

A failed backend call (401/403/5xx) or an error `messageKey` must surface a visible,
localized error: a `[role="alert"]`, a `[data-sonner-toast]` (the `Toast` from
`@/components/common`), or `.text-destructive`/`.text-status-error`.
`auth.spec.ts`'s invalid-credentials test is the reference:

```ts
await expect(page.locator('[role="alert"], .text-destructive, [data-sonner-toast]')).toBeVisible({
  timeout: 5_000,
})
```

**Never assert on a raw backend message** — the UI renders `t(getErrorKey(error))`
only ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) Security rule 40), so the test
must not depend on internal error text or paths. To make a failure deterministic,
intercept the call with `page.route('**/api/<route>**', route => route.fulfill({ status: 500, … }))`
(pattern in [`skills/qa/add-e2e-test.md`](../../skills/qa/add-e2e-test.md) step 3c).

### (d) Responsive — a mobile/narrow viewport

Verify the layout at a narrow viewport, not only desktop. Set
`page.setViewportSize({ width: 375, height: 812 })`, then assert the layout adapts:
the sidebar (`nav, [class*="sidebar"]`, the locator `dashboard.spec.ts` already
asserts) toggles/collapses and the primary content stays reachable. The app ships
RTL (`ar`, [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) → i18n) — for
direction-sensitive layouts add an RTL assertion rather than assuming LTR.

```ts
test('responsive: adapts at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/dashboard')
  await expect(page.locator('nav, [class*="sidebar"], [class*="Sidebar"]').first()).toBeVisible()
})
```

---

## 6. Critical-flow invariants (tenant, RBAC, AI safety)

The platform's core invariants are **testable from the UI** and should be exercised
by the privileged specs — not just left to the API layer
([`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md) §§4–5):

- **Tenant isolation** (`AGENTS.md` §6) — a tenant-admin/connectors/cases spec
  confirms a user only sees **their** tenant's rows. For the GLOBAL*ADMIN tenant
  switch (`X-Tenant-Id` via `useTenantStore` — see
  [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) → \_Tenant switching* and
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) Key Principle 8), assert switching
  tenant changes the visible data set. No cross-tenant rows ever appear.
- **RBAC** — connector create/update/toggle require `TENANT_ADMIN`
  ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 55); `/admin/*` pages and
  mutations carry `@RequirePermission(...)` (rule 25). A lower-role user
  (`SOC_ANALYST_L1`, `EXECUTIVE_READONLY`) must find those actions
  **hidden/disabled** — assert it, don't assume it. Protected users (`isProtected`)
  hide delete/block/role-change controls — assert the shield/no-action state.
- **AI surfaces** (`/ai-config`, `/ai-chat`, `/ai-findings`, the `ai-*` family) —
  assert the **five required AI states**: loading, error, confidence (when
  available), provider attribution, regenerate
  ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rule 42; the error state doubles
  as state (c) above). **Approval-required actions stay gated** — the apply/execute
  control is **disabled until APPROVED**; AI never silently executes destructive
  actions (rules 44, 59; `AGENTS.md` §7). **Never** assert AI output rendered as HTML
  (`react/no-danger` is an ESLint error — rules 36, 43), and **don't depend on a live
  model**: AI falls back to `model: 'rule-based'` when no connector is configured
  (rule 30), so assert the **UI contract** (states, badges, gating), not a model's
  prose. Details: [`rules/frontend/ai-ui-rules.md`](../../rules/frontend/ai-ui-rules.md).

---

## 7. Prerequisites — what must be reachable

Because `webServer.command` is `npm run dev` and `baseURL` is `http://localhost:3000`,
Playwright **auto-boots the web app** (or reuses one on `:3000`). But the web app is
a **BFF proxy** — it forwards to the NestJS API via `src/app/api/*` routes — so a
meaningful run also needs the **API and its seeded Postgres + Redis** reachable
([`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md) §6;
[`rules/global/validation-gates.md`](../../rules/global/validation-gates.md) §2).
A missing seed user makes login fail — that's a **setup blocker, not a test bug**.

First-run bring-up (commands per [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md)
and `AGENTS.md` §4):

```bash
pnpm docker:infra     # Postgres + Redis
pnpm prisma:migrate   # apply schema
pnpm prisma:seed      # seed users (needs SEED_DEFAULT_PASSWORD — required, no fallback)
pnpm dev:api          # start the NestJS BFF
# Playwright will boot `npm run dev` (web) itself, or reuse an already-running :3000
```

> **Workspace is mid-upgrade — do NOT run `pnpm install` as part of a docs task.**
> If root `pnpm` commands are unavailable, drive the web app directly with its own
> `npm run` scripts (e.g. `cd apps/web && npm run test:e2e`) — see
> [`docs/testing/TESTING_STRATEGY.md`](./TESTING_STRATEGY.md) §6. The config and gate
> posture are unchanged.

---

## 8. Running the suite

`pnpm` only, Node 22, from repo root (`AGENTS.md` §4). The web script is
`test:e2e` → `playwright test`:

```bash
# whole web E2E suite (Turborepo → web Playwright)
pnpm test:e2e

# scope to the web app
pnpm --filter @auraspear/web test:e2e          # → playwright test

# a single spec while iterating
pnpm --filter @auraspear/web exec playwright test e2e/alerts.spec.ts

# watch/debug the assertions visually (headed UI runner)
pnpm --filter @auraspear/web test:e2e:ui       # → playwright test --ui
```

Because the spec is **real TypeScript held to the repo's hard rules**, also keep the
blocking gates green — the spec must type-clean and pass lint
([`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md) §7):

```bash
pnpm --filter @auraspear/web typecheck     # tsc --noEmit (hard gate)
pnpm --filter @auraspear/web lint:strict   # ESLint --max-warnings 0 — no any / disable / @ts-ignore
pnpm --filter @auraspear/web format:check  # Prettier: no semicolons, single quotes, width 100
```

---

## 9. Gate posture — advisory, not optional

E2E is an **advisory** gate today, and this is the single most counterintuitive
fact about it (full matrix:
[`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md); `AGENTS.md`
§5):

- The CI `test` job (`.github/workflows/ci.yml`) is named **`test (advisory)`**,
  `continue-on-error: true`, and runs `pnpm test` — the **web Vitest + API Jest unit
  suites**. **Playwright (`test:e2e`) and API e2e are NOT invoked by that CI job.**
  `continue-on-error` is there **only because of pre-existing tracked debt**
  ([`docs/audit/02-risk-register.md`](../audit/02-risk-register.md)), not because
  tests are optional.
- **Advisory ≠ optional.** Rule 48 makes the spec's _existence_ **mandatory** for a
  new page route, and you must **run** the suite and report what actually ran. New
  code must not add new failures.
- **Pre-commit hooks do NOT run tests** — Husky + lint-staged run ESLint + `tsc` +
  Prettier on staged files only ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) →
  pre-commit). Running E2E is on you.
- **Never claim a gate green without running it and quoting the output** — a suite
  you didn't run is RED. Enforced by the `qa-gatekeeper` subagent and the `AGENTS.md`
  §13 final-report block (`Green checks:` / `Failed checks:` — not "should work").

---

## 10. Common mistakes

- **Happy path only** — shipping a spec without **empty · error · responsive** is a
  rule-48 violation. All four states, explicit and named.
- **`waitForTimeout` / arbitrary sleeps** — `retries: 0` makes flake a hard failure.
  Wait on `expect(...).toBeVisible({ timeout })` / `toHaveURL(...)`.
- **Asserting raw `<table>` / raw inputs** — the app uses `<DataTable>` and shadcn/ui;
  target `table, [role="table"]`, `[data-sonner-toast]`, `<h1>`, `[role="dialog"]`.
- **Auth bypass / token injection** — always log in via the form; never fake a
  session (`AGENTS.md` §6; `apps/api/CLAUDE.md` rule 23).
- **Hardcoding a new secret** — reuse the seed fixture or read from env; never invent
  a production-looking credential.
- **Error test asserting backend text** — the UI shows `t(getErrorKey(error))`;
  assert the surface, not internal strings.
- **Expecting raw-HTML AI output / depending on a live model** — forbidden behavior /
  non-deterministic; assert the contract (states, badges, gating).
- **Running unit tests in the wrong runner** — Playwright specs are `e2e/*.spec.ts`;
  web **unit** tests are Vitest `test/*.test.ts` (a misnamed file never runs — and a
  suite that never runs is RED). See [`docs/testing/WRITING_TESTS.md`](./WRITING_TESTS.md).
- **Working on `main`** instead of a branch (`AGENTS.md` §8).

---

## 11. See also

- **Author a spec** → [`skills/qa/add-e2e-test.md`](../../skills/qa/add-e2e-test.md)
  (the full four-state recipe + checklist).
- **Hard rules** → [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md);
  AI-UI rules → [`rules/frontend/ai-ui-rules.md`](../../rules/frontend/ai-ui-rules.md).
- **Strategy / why** → [`docs/testing/TESTING_STRATEGY.md`](./TESTING_STRATEGY.md).
- **Full config/script/CI reference** → [`docs/TESTING.md`](../TESTING.md).
- **Unit layer** → [`docs/testing/WRITING_TESTS.md`](./WRITING_TESTS.md).
- **Gate posture** → [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md);
  central index → [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md); entry point →
  [`AGENTS.md`](../../AGENTS.md).

```

```
