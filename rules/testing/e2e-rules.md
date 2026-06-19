# E2E rules — Playwright, every page route, the four states

> **Read [`AGENTS.md`](../../AGENTS.md) first** (repo root) for the loading order
> and the one rule: _no AI agent may edit first and understand later._ Then read
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) — rule **48** ("EVERY new page
> route MUST have a corresponding Playwright test file: loaded, empty, error,
> responsive") is the authoritative source this file makes concrete. For what
> "green" means and which gates block, read [`../global/validation-gates.md`](../global/validation-gates.md)
> (test/e2e is an **advisory** gate today — run it, don't skip it).

These are **hard constraints** for the end-to-end test layer, which lives in
[`apps/web/e2e/`](../../apps/web/e2e) and is configured by
[`apps/web/playwright.config.ts`](../../apps/web/playwright.config.ts). The API
(NestJS) has its own e2e under `apps/api/src/modules/<module>/__tests__/*.e2e.spec.ts`
(see `apps/api/CLAUDE.md` "File Structure Per Module") — **this file is about the
web app's Playwright suite only.** A page that ships without a matching spec is
incomplete, even if it renders.

Toolchain: **pnpm only**, **Node 22**. The runner is `@playwright/test` (dev
dependency in `apps/web/package.json`). The script is `test:e2e` → `playwright
test`. Run from the web app or via the root: `pnpm test:e2e`
(`../global/validation-gates.md` §2).

---

## 1. Every new page route gets a Playwright spec — no exceptions

`apps/web/CLAUDE.md` rule **48** is absolute. Any new `page.tsx` under
`apps/web/src/app/**` (routes live under the `(portal)` and `(auth)` route groups —
the group folders don't appear in the URL) MUST ship with a `*.spec.ts` in
`apps/web/e2e/` in the **same change**. This includes dynamic routes
(`cases/[id]/page.tsx`, `connectors/[type]/page.tsx`, `cases/cycles/[id]/page.tsx`).

Name the spec after the route, kebab-case: `/alerts` → `e2e/alerts.spec.ts`,
`/ai-config` → `e2e/ai-config.spec.ts`, `/cases` → `e2e/cases.spec.ts`. The five
specs that exist today — `auth.spec.ts`, `dashboard.spec.ts`, `alerts.spec.ts`,
`cases.spec.ts`, `ai-config.spec.ts` — are the **pattern to copy**, not the
ceiling. The route inventory is large (`admin/*`, `connectors/*`, `hunt`, `intel`,
`incidents`, `soar`, `correlation`, `detection-rules`, `reports`, `settings`,
`profile`, `notifications`, `jobs`, the `ai-*` family, the `explorer/*` family,
`dashboard/mssp`, …) and most routes are **not yet covered** — when you touch or
add one, add its spec.

**The named must-have surfaces** (this task's scope): login, dashboard, alerts,
cases, AI chat, tenant-admin, connectors. Each needs a Playwright spec:

| Surface      | Route(s)                                                                         | Spec                                                             |
| ------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Login        | `/login`, `/callback` (under `(auth)`)                                           | `e2e/auth.spec.ts` (exists)                                      |
| Dashboard    | `/dashboard`, `/dashboard/mssp`                                                  | `e2e/dashboard.spec.ts` (exists)                                 |
| Alerts       | `/alerts`                                                                        | `e2e/alerts.spec.ts` (exists)                                    |
| Cases        | `/cases`, `/cases/[id]`, `/cases/cycles`, `/cases/cycles/[id]`                   | `e2e/cases.spec.ts` (exists; extend for detail + cycles)         |
| AI chat      | `/ai-chat`                                                                       | `e2e/ai-chat.spec.ts` (**add**)                                  |
| Tenant-admin | `/admin/tenant`, `/admin/users-control`, `/admin/role-settings`, `/admin/system` | `e2e/admin-tenant.spec.ts` / `e2e/admin-users.spec.ts` (**add**) |
| Connectors   | `/connectors`, `/connectors/[type]`, `/connectors/llm`                           | `e2e/connectors.spec.ts` (**add**)                               |

## 2. Every page spec covers the four states: loaded, empty, error, responsive

Rule **48** lists the minimum: **loaded · empty · error · responsive**. A page
spec with only the happy path is not done.

1. **Loaded** — authenticated, data present, the page's primary surface is
   visible. Assert the real thing: the `PageHeader` title (`<h1>`), the
   `<DataTable>` (`table, [role="table"]`), KPI cards, or the detail drawer/sheet
   (`[role="dialog"]`). `dashboard.spec.ts` asserts the title + a card; `alerts.spec.ts`
   asserts the table then opens the row detail drawer — follow that shape.
2. **Empty** — zero rows / no results. The page MUST show the empty state
   (`<EmptyState>` / DataTable `emptyMessage`), **not** a crash or an infinite
   spinner. Drive it by filtering to a no-match query or a tenant/account with no
   data. `ai-config.spec.ts` already tolerates "finding rows **or** empty state".
3. **Error** — the backend call fails (401/403/5xx) or returns an error
   `messageKey`. Assert a **visible, localized** error surface: a `[role="alert"]`,
   a `[data-sonner-toast]` (the `Toast` from `@/components/common`), or
   `.text-destructive`/`.text-status-error`. `auth.spec.ts`'s invalid-credentials
   test is the reference. **Never** assert on a raw backend message — the UI shows
   `t(getErrorKey(error))` only (`apps/web/CLAUDE.md` Security rule 40); the test
   must not depend on internal error text.
4. **Responsive** — verify the page at a mobile/narrow viewport, not only desktop.
   Use `page.setViewportSize({ width: 375, height: 812 })` (or a `test.describe`
   with a mobile `viewport`) and assert the layout adapts: the sidebar
   (`nav, [class*="sidebar"]`, asserted in `dashboard.spec.ts`) collapses/toggles
   and the primary content stays reachable. RTL is in scope too — the app ships
   `ar` (`apps/web/CLAUDE.md` i18n); when a route's layout is direction-sensitive,
   add an RTL assertion rather than assuming LTR.

Structure each spec as a `test.describe('<Page>')` with one `test(...)` per state
(plus key interactions like row-click → detail). Keep the four states explicit and
named so a reviewer can see coverage at a glance.

## 3. Auth is a real login flow, against the seed user — never a bypass

Every protected-route spec authenticates through the **real** login form in a
`test.beforeEach`, exactly as `dashboard.spec.ts`, `alerts.spec.ts`,
`cases.spec.ts`, and `ai-config.spec.ts` do:

```ts
await page.goto('/login')
await page.fill('input[name="email"]', '<seed admin email>')
await page.fill('input[name="password"]', '<seed password>')
await page.click('button[type="submit"]')
await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 })
```

- **No auth bypass, ever** — this mirrors `AGENTS.md §6` and `apps/api/CLAUDE.md`
  rule **23** (no dev-mode auth shortcut in any environment). Tests authenticate
  like a user; they do not inject tokens, fake a session, or set a bypass flag. The
  full guard chain (JWT verify + DB active check) runs.
- **Unauthenticated redirect is itself a test** — `auth.spec.ts` asserts that
  `/dashboard` redirects to `/login` when not signed in (`src/middleware.ts` route
  protection). Every protected route should have an equivalent "redirects to login
  when signed out" assertion or rely on the shared auth spec.
- **Credentials come from the seed, never hardcoded production secrets.** The seed
  password is a **required env var with no fallback** (`apps/api/CLAUDE.md` rule
  **54**, `SEED_DEFAULT_PASSWORD`); `AGENTS.md §6` forbids committed/fallback
  secrets. The literal credential currently inline in the specs is a **seed-only,
  local-dev test fixture** — do not reuse it as, or treat it as, a real secret, and
  prefer reading it from the test environment over hardcoding new ones.

## 4. Tenant isolation and RBAC are E2E concerns, not just backend ones

The platform's core invariants (`AGENTS.md §6`) are testable from the UI and
SHOULD be exercised by the named specs:

- **Tenant isolation** — a tenant-admin / connectors / cases spec should confirm a
  user only sees **their tenant's** data. For the GLOBAL_ADMIN tenant switch
  (`X-Tenant-Id` via `useTenantStore`, see `apps/web/CLAUDE.md` "Tenant switching"
  and `apps/api/CLAUDE.md` Key Principle 8), assert that switching tenant changes
  the visible data set. No cross-tenant rows ever appear.
- **RBAC** — tenant-admin pages (`/admin/*`) and connector **mutations** are
  privileged: connector create/update/toggle require `TENANT_ADMIN`
  (`apps/api/CLAUDE.md` rule **55**); endpoints carry `@RequirePermission(...)`
  (rule **25**). A lower-role user (e.g. `SOC_ANALYST_L1`, `EXECUTIVE_READONLY`)
  must find those actions **hidden/disabled** — assert that, don't assume it.
  Protected users (`isProtected`) hide delete/block/role-change controls
  (`apps/web/CLAUDE.md` "Protected users") — a tenant-admin spec should verify the
  shield-icon/no-action state.

## 5. AI surfaces: assert provenance and safety, never trust raw output

For the AI chat spec (`/ai-chat`) and any AI-panel route (`/ai-config`,
`/ai-findings`, the `ai-*` family), the E2E test enforces the AI-UI invariants from
[`../frontend/ai-ui-rules.md`](../frontend/ai-ui-rules.md) and `AGENTS.md §7`:

- Assert the **five required AI states** are present (loading, error, confidence
  when available, provider attribution, regenerate) — `apps/web/CLAUDE.md` rule
  **42**. The error path is part of the four-states requirement in §2.
- **Approval-required actions stay gated** — an AI action that mutates security
  state must show an approval badge and be **disabled until APPROVED**
  (`apps/web/CLAUDE.md` rules **44**, **59**). The E2E test asserts the apply/execute
  control is disabled while pending; AI **never silently executes** destructive
  actions (`AGENTS.md §7`).
- **Never assert that AI output rendered as HTML** — the app renders AI text as
  plain text / safe markdown, never `dangerouslySetInnerHTML` (`apps/web/CLAUDE.md`
  rules **36**, **43**; `react/no-danger` is ESLint error). A test that expects raw
  HTML injection is testing a forbidden behavior.
- **Do not depend on a live model.** AI routing falls back to a `model:
'rule-based'` response when no connector is configured (`apps/web/CLAUDE.md` rule
  **30**). E2E specs assert the **UI contract** (states, badges, gating), not a
  specific model's text — keep them deterministic and offline-safe.

## 6. Config, determinism, and what the runner does

The config (`apps/web/playwright.config.ts`) is the contract — respect it, don't
fork it per-spec:

- `testDir: './e2e'`, `timeout: 30_000`, `retries: 0`. The `chromium` project,
  `headless: true`, `screenshot: 'only-on-failure'`, `trace: 'on-first-retry'`.
- `webServer` runs `npm run dev` on port **3000** with `reuseExistingServer: true`
  and `baseURL: 'http://localhost:3000'` — so `page.goto('/alerts')` resolves
  against the running web app. The web app proxies to the BFF via `src/app/api/*`
  routes, so a meaningful E2E run expects the **API (and its Postgres/Redis,
  seeded)** reachable — CI provides those services for the test job
  (`../global/validation-gates.md` §2).
- **Determinism:** `retries: 0` means flaky tests fail the suite. Wait on real
  conditions with `expect(...).toBeVisible({ timeout })` / `toHaveURL(...)` as the
  existing specs do — never `waitForTimeout`/arbitrary sleeps. Prefer role/text
  locators (`getByRole('tab', ...)`, `[role="table"]`, `[role="dialog"]`) over
  brittle CSS; class-substring locators (`[class*="card"]`) are a last resort.
- **Selectors track the design system** — assert on `<DataTable>`
  (`table, [role="table"]`), `Toast` (`[data-sonner-toast]`), `PageHeader` (`<h1>`),
  and the Sheet/Drawer detail (`[role="dialog"]`) — the MUST-USE components from
  `apps/web/CLAUDE.md` "Components — MUST USE". Don't assert on raw `<table>`/raw
  inputs; the app doesn't use them (`apps/web/CLAUDE.md` rules 4, 11).

## 7. The spec is code — it obeys the repo's hard rules

E2E specs are TypeScript and live in the web app; they are held to the same bars:

- **No `any`, no `// eslint-disable`, no `@ts-ignore`** (`apps/web/CLAUDE.md` rules
  1, 2, 12) — `@playwright/test` is fully typed; type your fixtures.
- **`===`/`!==` only**, `const`/`let` (no `var`), no non-null `!`
  (`apps/web/CLAUDE.md` rules 5–7). Prettier: no semicolons, single quotes.
- **Never work on `main`** — branch first (`AGENTS.md §8`,
  [`../global/branch-safety.md`](../global/branch-safety.md)). **Prove before
  deleting** a spec: a page route still exists ⇒ its spec must too; don't remove
  coverage to make a suite pass.

---

### Quick gate

Before you commit a page route, confirm: (1) a `*.spec.ts` exists in
`apps/web/e2e/` named after the route (rule 48); (2) it covers **loaded · empty ·
error · responsive** as explicit, named tests; (3) it authenticates via the **real
login flow** against the seed user — no bypass, no hardcoded production secret;
(4) tenant-admin/connectors specs assert **tenant isolation + RBAC** (privileged
actions hidden/disabled for lower roles); (5) AI specs assert the \*\*five AI states

- approval gating** and never expect raw-HTML AI output; (6) locators use
  role/text and the design-system components, with no arbitrary sleeps
  (`retries: 0`). Then run `pnpm test:e2e` and report what actually ran — e2e is an
  **advisory\*\* gate but you still run it; never claim it passed without the output
  (`../global/validation-gates.md` §3).
