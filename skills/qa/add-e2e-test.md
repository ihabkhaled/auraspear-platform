# Skill: Add a Playwright e2e test for a new web route (`apps/web/e2e`)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order + the one rule: _no AI
> agent may edit first and understand later_), then the hard constraints in
> [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md) (the four states,
> real-login auth, tenant/RBAC, AI safety) and
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md) (what
> "green" means — e2e is **advisory but run it**). The authoritative source is
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) **rule 48**: _every new page route
> MUST have a corresponding Playwright test file — loaded, empty, error, responsive._
> For AI surfaces also read [`rules/frontend/ai-ui-rules.md`](../../rules/frontend/ai-ui-rules.md).
> Sibling onboarding: [`skills/`](../), [`rules/`](../../rules/),
> [`memory/`](../../memory/), [`context/`](../../context/), [`docs/`](../../docs/).
> Stable truths: [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md),
> [`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md).
>
> **Inspect the existing specs and copy the closest one end-to-end before adapting.**
> Do not invent locators, login flows, or config — the five specs in
> [`apps/web/e2e/`](../../apps/web/e2e) are the pattern, not the ceiling.

This recipe adds a Playwright spec at `apps/web/e2e/<route>.spec.ts` covering the four
required states — **loaded · empty · error · responsive** — for a new (or newly
touched) page route in the web app. Replace `<route>` (kebab route segment, e.g.
`ai-chat`, `connectors`) consistently. The runner is `@playwright/test` (v1.58.x dev
dep in `apps/web/package.json`); the script is `test:e2e` → `playwright test`.

---

## When to use

Use this skill when:

- You added a new `page.tsx` under `apps/web/src/app/**` (routes live in the `(portal)`
  and `(auth)` route groups — those folders don't appear in the URL). Rule 48 makes the
  spec **part of the same change** — a page that renders without a spec is incomplete.
- You touched an existing route that has **no** spec yet (most routes are uncovered today
  — `admin/*`, `connectors/*`, `hunt`, `intel`, `incidents`, `soar`, `reports`,
  `settings`, the `ai-*` family, etc.). When you touch it, add it.
- You need to extend a thin/happy-path spec to the full four states.

**Do not** use this skill for:

- The **page itself** → [`skills/frontend/add-page.md`](../frontend/add-page.md) (its
  step 10 stubs the spec; this skill is the full four-state version).
- **API (NestJS) e2e** → those live in
  `apps/api/src/modules/<module>/__tests__/<module>.e2e.spec.ts` (see
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) "File Structure Per Module"), run via
  `pnpm --filter @auraspear/api test:e2e`. This skill is the **web Playwright suite only**.
- Unit/component tests → those use Vitest (`apps/web` `test` → `vitest run`).

---

## Files to inspect first (copy the closest one)

Open these and mirror their structure exactly. Pick the reference whose shape matches
your route (list page, detail/drawer, tabbed page, auth page).

| Concern                                                                                 | Reference file                                                           |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Playwright config (login `beforeEach` target, `baseURL :3000`, single chromium project) | [`apps/web/playwright.config.ts`](../../apps/web/playwright.config.ts)   |
| List page → table + row-click detail drawer                                             | [`apps/web/e2e/alerts.spec.ts`](../../apps/web/e2e/alerts.spec.ts)       |
| Page with KPI cards + sidebar nav                                                       | [`apps/web/e2e/dashboard.spec.ts`](../../apps/web/e2e/dashboard.spec.ts) |
| List → detail navigation (dynamic `[id]` route)                                         | [`apps/web/e2e/cases.spec.ts`](../../apps/web/e2e/cases.spec.ts)         |
| Tabbed page + "rows **or** empty state" tolerance                                       | [`apps/web/e2e/ai-config.spec.ts`](../../apps/web/e2e/ai-config.spec.ts) |
| Auth: signed-out redirect + invalid-credentials error surface                           | [`apps/web/e2e/auth.spec.ts`](../../apps/web/e2e/auth.spec.ts)           |
| Hard rules this spec obeys                                                              | [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md)         |
| Design-system components the locators target                                            | [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) "Components — MUST USE" |

**Hard facts about the harness (don't fork them per-spec):**

- `testDir: './e2e'`, `timeout: 30_000`, **`retries: 0`** (flaky = failed suite), one
  `chromium` project, `headless: true`, `screenshot: 'only-on-failure'`,
  `trace: 'on-first-retry'`.
- `webServer` runs `npm run dev` on port **3000**, `reuseExistingServer: true`,
  `baseURL: 'http://localhost:3000'` — so `page.goto('/<route>')` resolves against the
  running web app. The web app proxies to the BFF via `src/app/api/*` routes, so a
  meaningful run needs the **API + seeded Postgres/Redis** reachable
  ([`rules/global/validation-gates.md`](../../rules/global/validation-gates.md) §2).
- The spec is **TypeScript held to the repo's hard rules**: no `any`, no
  `// eslint-disable`/`@ts-ignore`, `===`/`!==` only, `const`/`let` (no `var`), no
  non-null `!`, no semicolons, single quotes (`apps/web/CLAUDE.md` rules 1, 2, 5–7).

---

## Exact step-by-step implementation

Run everything from repo root. **pnpm only, Node 22.** Replace `<route>` (kebab),
`<Route>` (PascalCase describe name) consistently.

### 0. Branch (never work on `main`/`master`)

```bash
git checkout -b test/web-<route>-e2e
```

(`AGENTS.md §8`, [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md).)

### 1. Name the spec after the route, kebab-case

`/alerts` → `apps/web/e2e/alerts.spec.ts`, `/ai-config` → `e2e/ai-config.spec.ts`,
`/ai-chat` → `e2e/ai-chat.spec.ts`. Dynamic routes share the parent's spec and add a
detail test (`/cases/[id]` → extend `cases.spec.ts`).

### 2. Authenticate via the real login flow in `test.beforeEach` (NO bypass)

Every protected route logs in through the **real form**, exactly as the existing four
protected specs do — no token injection, no fake session, no bypass flag (`AGENTS.md §6`;
`apps/api/CLAUDE.md` rule 23). The seed credentials below are the **local-dev test
fixture** inlined in all five existing specs (`platform-admin@auraspear.io` /
`Admin@123!Secure`) — they are seed-only, **not a production secret**; prefer reading
from the test environment over hardcoding new ones (the seed password is a required env
var with no fallback, `apps/api/CLAUDE.md` rule 54).

```ts
import { test, expect } from '@playwright/test'

test.describe('<Route> Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'platform-admin@auraspear.io')
    await page.fill('input[name="password"]', 'Admin@123!Secure')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
  })
  // tests below
})
```

### 3. Write the four required state tests (rule 48) — explicit and named

One `test(...)` per state so a reviewer sees coverage at a glance. Use **role/text
locators** and the **design-system component** selectors; class-substring (`[class*=]`)
is a last resort. **No `waitForTimeout`/sleeps** — wait on real conditions
(`expect(...).toBeVisible({ timeout })`, `toHaveURL(...)`) because `retries: 0`.

**(a) Loaded** — authenticated, data present, the primary surface is visible. Assert the
real thing: `PageHeader` title (`<h1>`), `<DataTable>` (`table, [role="table"]`), KPI
cards, or the detail drawer/sheet (`[role="dialog"]`). Mirror `alerts.spec.ts` (table →
open row detail) or `dashboard.spec.ts` (title + card).

```ts
test('loaded: renders the page with its primary surface', async ({ page }) => {
  await page.goto('/<route>')
  await expect(page).toHaveURL(/<route>/)
  await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible()
  const table = page.locator('table, [role="table"]')
  await expect(table.first()).toBeVisible({ timeout: 10_000 })
})
```

**(b) Empty** — zero rows / no results. The page MUST show the empty state
(`<EmptyState>` from `@/components/common`, or the DataTable `emptyMessage`) — **never** a
crash or an infinite spinner. Drive it with a no-match filter/search (or a tenant/account
with no data). Like `ai-config.spec.ts`, tolerate "rows **or** empty":

```ts
test('empty: shows the empty state for a no-match query', async ({ page }) => {
  await page.goto('/<route>?search=zzz-no-such-record-zzz')
  await expect(
    page.locator('[class*="empty"], [data-testid="empty-state"], table, [role="table"]').first()
  ).toBeVisible({ timeout: 10_000 })
})
```

**(c) Error** — the backend call fails (401/403/5xx) or returns an error `messageKey`.
Assert a **visible, localized** error surface: `[role="alert"]`, `[data-sonner-toast]`
(the `Toast` from `@/components/common`), or `.text-destructive` / `.text-status-error`.
**Never** assert on a raw backend message — the UI renders `t(getErrorKey(error))` only
(`apps/web/CLAUDE.md` Security rule 40). Drive the failure deterministically with
`page.route(...)` interception (the reference for the surface is `auth.spec.ts`'s
invalid-credentials test):

```ts
test('error: surfaces a localized error when the API fails', async ({ page }) => {
  await page.route('**/api/<route>**', route =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: '{"messageKey":"errors.common.unknown"}',
    })
  )
  await page.goto('/<route>')
  await expect(
    page
      .locator('[role="alert"], [data-sonner-toast], .text-destructive, .text-status-error')
      .first()
  ).toBeVisible({ timeout: 10_000 })
})
```

**(d) Responsive** — verify a mobile/narrow viewport, not only desktop. Set
`page.setViewportSize({ width: 375, height: 812 })` and assert the layout adapts: the
sidebar (`nav, [class*="sidebar"]`, as in `dashboard.spec.ts`) collapses/toggles and the
primary content stays reachable. The app ships RTL (`ar`) — for direction-sensitive
layouts add an RTL assertion rather than assuming LTR.

```ts
test('responsive: adapts at a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/<route>')
  await expect(page.locator('h1, [data-testid="page-title"]').first()).toBeVisible()
  await expect(page.locator('nav, [class*="sidebar"], [class*="Sidebar"]').first()).toBeVisible()
})
```

### 4. Add the signed-out redirect assertion

Every protected route should confirm it redirects to `/login` when unauthenticated
(`src/middleware.ts` route protection) — either a dedicated test (outside the logged-in
`beforeEach`, as `auth.spec.ts` does for `/dashboard`) or by relying on the shared
`auth.spec.ts`. Don't silently drop this.

### 5. Tenant isolation + RBAC (for admin/connectors/cases specs)

These invariants (`AGENTS.md §6`) are E2E-testable and **should** be exercised by the
named privileged specs:

- **Tenant isolation** — assert a user only sees **their** tenant's rows. For the
  GLOBAL_ADMIN tenant switch (`X-Tenant-Id` via `useTenantStore`), assert switching tenant
  changes the visible data set; no cross-tenant rows ever appear.
- **RBAC** — connector create/update/toggle require `TENANT_ADMIN` (`apps/api/CLAUDE.md`
  rule 55); `/admin/*` pages and mutations carry `@RequirePermission(...)`. A lower-role
  user (`SOC_ANALYST_L1`, `EXECUTIVE_READONLY`) must find those actions **hidden/disabled**
  — assert it. Protected users (`isProtected`) hide delete/block/role-change controls —
  assert the shield/no-action state.

### 6. AI surfaces (for `ai-chat`, `ai-config`, `ai-findings`, the `ai-*` family)

Enforce the AI-UI invariants ([`rules/frontend/ai-ui-rules.md`](../../rules/frontend/ai-ui-rules.md),
`AGENTS.md §7`):

- Assert the **five AI states** are present: loading, error, confidence (when available),
  provider attribution, regenerate (`apps/web/CLAUDE.md` rule 42). The error state doubles
  as state (c) above.
- **Approval-required actions stay gated** — an AI action that mutates security state
  shows an approval badge and is **disabled until APPROVED** (rules 44, 59). Assert the
  apply/execute control is disabled while pending; AI **never silently executes**
  destructive actions.
- **Never assert AI output rendered as HTML** — the app renders AI text as plain
  text/safe markdown, never `dangerouslySetInnerHTML` (rules 43, `react/no-danger` is an
  ESLint error). A test expecting raw HTML injection is testing forbidden behavior.
- **Don't depend on a live model** — AI falls back to `model: 'rule-based'` when no
  connector is configured (`apps/web/CLAUDE.md` rule 30). Assert the **UI contract**
  (states, badges, gating), not a model's text — keep specs deterministic/offline-safe.

---

## Validation commands (real pnpm commands, from repo root)

Run in order. **Never claim a gate green without running it** (`AGENTS.md §5`,
[`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)).

```bash
pnpm install                                  # if deps changed (usually not for a spec)
pnpm --filter @auraspear/web typecheck        # the spec is TS — must type-clean (tsc --noEmit)
pnpm --filter @auraspear/web lint:strict      # ESLint --max-warnings 0; no any / disable / @ts-ignore
pnpm --filter @auraspear/web format:check     # Prettier (no semicolons, single quotes, width 100)
```

Run the e2e suite (boots `npm run dev` on `:3000`, `reuseExistingServer: true`; needs the
API + seeded Postgres/Redis reachable):

```bash
pnpm test:e2e                                 # root: turbo run test:e2e
# scope to the web app:
pnpm --filter @auraspear/web test:e2e         # → playwright test
# single file while iterating:
pnpm --filter @auraspear/web exec playwright test e2e/<route>.spec.ts
# debug the assertions visually (headed UI runner):
pnpm --filter @auraspear/web test:e2e:ui      # → playwright test --ui
```

> **Gate status:** `pnpm typecheck` and `pnpm build` are **hard gates**. `test:e2e` (and
> `lint`/`format:check`/`test`) are **advisory** today (tracked debt is non-blocking) —
> but rule 48 makes the spec's _existence_ mandatory for a new route, and you must **run**
> e2e and report exactly what ran. See
> [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md).

If the seeded API/DB is not up, first-run may need: `pnpm docker:infra` (Postgres/Redis),
`pnpm prisma:migrate`, `pnpm prisma:seed`, then `pnpm dev` — see
[`memory/COMMANDS_MEMORY.md`](../../memory/COMMANDS_MEMORY.md). The seed password is a
required env var (`SEED_DEFAULT_PASSWORD`); a missing-seed failure is a setup blocker, not
a test bug.

---

## Docs to update

- If you added coverage for a previously-uncovered route, reflect it in
  [`docs/TESTING.md`](../../docs/TESTING.md) (+ [`docs/testing/`](../../docs/testing/)) and
  the e2e coverage table in
  [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md) §1 (mark the route's spec
  as existing).
- Record durable testing conventions (new locator pattern, a reusable login helper) in
  [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md).
- If you introduced a new e2e pattern/decision (e.g. shared auth fixture, `page.route`
  error-injection convention), add an ADR under
  [`docs/decisions/`](../../docs/decisions/).
- Cross-check [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md) only if you added a notable
  testing surface.

---

## Security checks (must hold)

- **No auth bypass** — authenticate via the real login form (`test.beforeEach`); never
  inject tokens, fake a session, or set a bypass flag. The full guard chain (JWT verify +
  DB active check) runs (`AGENTS.md §6`; `apps/api/CLAUDE.md` rule 23).
- **No real/production secrets in the spec** — the inline seed credential is a local-dev
  fixture only; never commit a production secret or treat the fixture as one. Prefer the
  test environment over hardcoding new credentials (`AGENTS.md §6`; `apps/api/CLAUDE.md`
  rule 54). Don't log tokens/credentials from the test.
- **Tenant isolation is asserted, not assumed** — cross-tenant rows must never appear;
  the GLOBAL_ADMIN tenant switch changes the visible set (`AGENTS.md §6`).
- **RBAC is asserted** — privileged actions (`@RequirePermission`, `TENANT_ADMIN`
  connector mutations) are hidden/disabled for lower roles. UI gating is convenience; the
  **backend is the authoritative boundary** — don't write a test that implies otherwise.
- **AI approval-required actions stay gated** — destructive AI actions show an approval
  badge and are disabled until APPROVED; AI never silently executes (`AGENTS.md §7`).
- **Never assert raw AI HTML** — the app renders AI as plain text / safe markdown
  (`react/no-danger` is an ESLint error). A spec expecting HTML injection tests forbidden
  behavior.
- **Errors are localized, not raw** — assert the `Toast`/`[role="alert"]` surface, never
  a raw backend message or internal path (`apps/web/CLAUDE.md` Security rule 40).
- If the change touches auth/RBAC/data exposure, run
  [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md).

---

## Common mistakes

- **Happy path only** — shipping one `test(...)` without **empty · error · responsive** is
  a rule 48 violation. All four states, explicit and named.
- **`waitForTimeout`/sleeps** — `retries: 0` makes flakiness a hard failure. Wait on
  `expect(...).toBeVisible({ timeout })` / `toHaveURL(...)`, never arbitrary sleeps.
- **Asserting raw `<table>` / raw inputs** — the app uses `<DataTable>` and shadcn/ui
  (`apps/web/CLAUDE.md` rules 4, 11). Target `table, [role="table"]`, `[data-sonner-toast]`,
  `<h1>`, `[role="dialog"]` — not raw HTML elements.
- **Auth bypass / token injection** — always log in via the form; never fake a session.
- **Hardcoding a new secret** — reuse the seed fixture or read from env; never invent a
  production-looking credential.
- **Error test asserting backend text** — the UI shows `t(getErrorKey(error))`; assert the
  surface, not internal strings.
- **Brittle class-substring locators as the first choice** — prefer
  `getByRole('tab'|'button'|...)`, `[role="table"]`, `[role="dialog"]`; `[class*=]` is a
  last resort.
- **`any` / `// eslint-disable` / `@ts-ignore` in the spec** — `@playwright/test` is fully
  typed; type your fixtures (`apps/web/CLAUDE.md` rules 1, 2).
- **Spec name not matching the route** — `/ai-chat` → `e2e/ai-chat.spec.ts` (kebab-case).
- **Claiming `test:e2e` passed without the output**, or claiming "all green" when only the
  advisory gate ran (`AGENTS.md §13`).
- **Deleting a spec to make the suite pass** — if the route still exists, its spec must too
  (prove before removing, `AGENTS.md §8`).

---

## Final checklist

- [ ] Branch created (`test/web-<route>-e2e`), not on `main`/`master`.
- [ ] `apps/web/e2e/<route>.spec.ts` exists, named after the route (kebab-case) — rule 48.
- [ ] Real-login `test.beforeEach` (seed fixture, no bypass, no production secret).
- [ ] **Loaded** test — asserts the primary surface (`<h1>` / `[role="table"]` / cards /
      `[role="dialog"]`).
- [ ] **Empty** test — shows `<EmptyState>` / `emptyMessage` for a no-match query; no
      crash, no infinite spinner.
- [ ] **Error** test — visible localized surface (`[role="alert"]` / `[data-sonner-toast]`
      / `.text-destructive`); driven deterministically (`page.route` 5xx); no raw backend
      text asserted.
- [ ] **Responsive** test — `setViewportSize({ width: 375, height: 812 })`, layout adapts
      (sidebar + primary content reachable); RTL asserted if direction-sensitive.
- [ ] Signed-out → `/login` redirect covered (dedicated test or shared `auth.spec.ts`).
- [ ] Admin/connectors/cases specs assert **tenant isolation + RBAC** (privileged actions
      hidden/disabled for lower roles).
- [ ] AI specs assert the **five AI states + approval gating**; never expect raw-HTML AI
      output; offline-safe (don't depend on a live model).
- [ ] Locators use role/text + design-system selectors; **no `waitForTimeout`/sleeps**.
- [ ] Spec obeys repo rules: no `any` / `// eslint-disable` / `@ts-ignore`; `===`/`!==`;
      `const`/`let`; no `!`; no semicolons; single quotes.
- [ ] `pnpm --filter @auraspear/web typecheck` ✅, `lint:strict` ✅, `format:check` ✅
      (actually run).
- [ ] `pnpm --filter @auraspear/web test:e2e` (or single file) **run**; results reported —
      never claim it passed without the output.
- [ ] Docs updated where relevant (`docs/TESTING.md` / e2e coverage table /
      `memory/TECHNICAL_MEMORY.md` / ADR).
- [ ] Final response uses the `AGENTS.md §13` template; no "all green" unless the gates
      actually passed.
