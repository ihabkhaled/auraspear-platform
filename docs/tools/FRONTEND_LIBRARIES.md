# Frontend Libraries — `@auraspear/web`

> **Entry point for AI agents and contributors is [`AGENTS.md`](../../AGENTS.md)**
> (loading order, monorepo map, security/AI invariants). Read it first, then the
> web app's rules in [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md). This file is
> a **reference**, not a rule.

## What this file is (and is not)

This is the **frontend-focused deep dive** on the web app's load-bearing
libraries. For each library it answers six questions the broad inventory does not
spell out per-library: **why · where · validate · risk · security · removal
criteria**.

It deliberately does **not** duplicate the existing top-level docs — it links
them and adds the security/removal angle:

- [`docs/tools/LIBRARIES.md`](LIBRARIES.md) — the grouped why/where/validate/risk
  tour across **both** apps (the broad reference). Read it for the API side and
  for shared/root tooling.
- [`apps/web/CLAUDE.md` → "Libraries — Reference"](../../apps/web/CLAUDE.md) — the
  canonical import-path table and the wrapping rules (web rules #11, #29, #63).
- [`docs/audit/dependency-matrix.md`](../audit/dependency-matrix.md) — the
  version/why/upgrade-risk **matrix** (table-of-record).
- [`docs/audit/05-dependency-report.md`](../audit/05-dependency-report.md) — full
  inventory, duplication findings (sonner vs sweetalert2, date-fns vs dayjs),
  migration-added deps.
- [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)
  — `pnpm audit` status (next pin, vitest, esbuild).
- [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
  — the **hard rules** for adding/upgrading/removing a dependency.
- [`docs/tools/TYPESCRIPT_AND_TSGO.md`](TYPESCRIPT_AND_TSGO.md) — `typescript` /
  `tsgo` ([ADR-0005](../decisions/ADR-0005-typescript-and-tsgo.md)).
- [`docs/TESTING.md`](../TESTING.md) and
  [`rules/testing/quality-gates.md`](../../rules/testing/quality-gates.md) — test
  strategy that Vitest/Playwright implement.

**Source of truth for versions** = [`apps/web/package.json`](../../apps/web/package.json).
Versions below are quoted from it; when this doc and the matrix disagree, the
`package.json` wins — fix the doc.

> **Do not run `pnpm` while reading this** — the workspace is mid-upgrade
> ([`AGENTS.md` §4](../../AGENTS.md)). The validation commands are references;
> run them only when actually changing a dep.

## How to read the entries

- **Why** = the reason it is in the tree.
- **Where** = the wrapper/module that owns it. Most third-party UI is **wrapped**
  in `@/components/common/` or `@/components/ui/` and imported via a barrel — never
  raw in a component (web rules #11, #29, #63).
- **Validate** = the gate(s) to run after touching it. Hard gates: `typecheck`
  and `build`. Advisory: `lint:strict`, `test` (Vitest), `test:e2e` (Playwright)
  — see [`AGENTS.md` §5](../../AGENTS.md) and `apps/web/package.json` scripts.
- **Risk** = upgrade risk per [`dependency-matrix.md`](../audit/dependency-matrix.md).
- **Security** = the security property or invariant the library touches.
- **Remove if** = the concrete condition under which the dep can be dropped.
  Always **prove unused before removing** ([`AGENTS.md` §8](../../AGENTS.md),
  [dependency-audit rules](../../rules/security/dependency-audit.md)): check
  imports, routes, Docker, CI, the barrels, and tests.

---

## 1. Framework & runtime

### `next` — `16.2.9`

- **Why** App Router framework **and** the BFF proxy boundary: the browser never
  calls Wazuh/OpenSearch/MISP directly — every backend call goes through a
  `src/app/api/*` route using `proxyToBackend()` (web rules #33/#86,
  [`apps/api/CLAUDE.md` §Architecture](../../apps/api/CLAUDE.md)).
- **Where** `src/app/`, `src/middleware.ts` (route protection), `src/app/api/*`
  proxy routes, and `next.config.ts` (security headers).
- **Validate** `next build` + `typecheck`.
- **Risk** medium (framework major). Pinned to the exact `16.2.9` (no caret) to
  hold the version that clears the HIGH advisories
  ([vuln-remediation](../audit/vulnerability-remediation.md)) — keep
  `eslint-config-next` on the **same** exact version.
- **Security** all hardening is centralized in
  [`apps/web/next.config.ts`](../../apps/web/next.config.ts): CSP, `X-Frame-Options:
DENY`, `frame-ancestors 'none'`, HSTS (2y, preload), `X-Content-Type-Options:
nosniff`, `Referrer-Policy`, `Permissions-Policy`, and
  `productionBrowserSourceMaps: false`. The `connect-src` allowlist is built from
  `NEXT_PUBLIC_API_URL` / `BACKEND_API_URL` / `NEXT_PUBLIC_WS_URL` via
  `buildAllowedConnectSources()` (invalid env values fall back to the strict
  default set). Web security rules #35–#41: no client-forwarded role/auth headers,
  no open redirects, errors shown only as `t(messageKey)`.
- **Remove if** never — it is the framework. A major bump is an ADR-gated change,
  not a removal.

### `react` / `react-dom` — `^19.2.4`

- **Why** UI runtime (React 19, React Compiler). The compiler drives several web
  rules: `useWatch({ control, name })` over `watch()` (#23), no derived-state
  `const` in `.tsx` (#60), hooks extracted to `src/hooks/` (#16).
- **Where** every component.
- **Validate** `typecheck` — React 19 + TS 5.9 types `e.target` as `EventTarget`;
  use `e.currentTarget.value` (web rule #37).
- **Risk** medium (major).
- **Security** `react/no-danger` is **error** (web ESLint) — `dangerouslySetInnerHTML`
  is banned, which underpins the AI-safety invariant "never render raw AI output
  as HTML" (web rule #43, [`AGENTS.md` §7](../../AGENTS.md)).
- **Remove if** never (runtime).

### `@types/react` / `@types/react-dom` — `^19.2.14` / `^19.2.3` (dev)

- **Why** React 19 type definitions that enforce the `e.currentTarget` rule above.
- **Validate** `typecheck`. **Risk** low (keep major aligned with `react`).
- **Remove if** never while on React 19.

> ESLint stack (`eslint`, `eslint-config-next`, `@typescript-eslint/*`,
> `eslint-plugin-react`, `react-hooks`, `jsx-a11y`, `import-x`, `security`,
> `unicorn`) is documented in [`apps/web/CLAUDE.md` → ESLint Rules](../../apps/web/CLAUDE.md)
> and [`LIBRARIES.md` → Shared/root tooling](LIBRARIES.md). Not re-listed here.

---

## 2. State, data & forms

### `@tanstack/react-query` — `^5.90.21`

- **Why** server state + caching for every list/detail/mutation flow.
- **Where** custom hooks in `src/hooks/` (never in `.tsx`, web rule #16);
  `placeholderData: keepPreviousData` for paginated tables; query keys include
  **all** filter params and `tenantId` so refetch is correct (web "Search, Filter
  & Pagination" rules, AI rule #56). The `QueryClient` lives in
  `src/app/providers.tsx`.
- **Validate** `typecheck` + `test:e2e`.
- **Risk** low.
- **Security** caches **server state in memory only** — pairs with the service
  worker forcing `/api/*` to `NetworkOnly` so authenticated responses are not
  persisted past logout (see `serwist` below). AI transcripts must **not** be
  cached to `localStorage` (web rule #46) — keep AI flows out of any persisted
  cache.
- **Remove if** never — it is the data layer for the whole app.

### `zustand` — `^5.0.11`

- **Why** global client state: auth, tenant, filters, ui, notifications, hunt,
  ai-connector.
- **Where** `src/stores/` (barrel `@/stores`). The tenant store feeds the Axios
  `X-Tenant-Id` header; `AiConnectorSelect` reads the ai-connector store
  internally — render it with **zero props** (web rule #61).
- **Validate** `typecheck`.
- **Risk** low.
- **Security** **never log tokens/credentials in Zustand devtools** (web security
  rule #39). The auth store holds JWTs; if it persists to `localStorage`, ensure
  CSP blocks inline scripts (it does — see `next`). Never store AI responses or
  OSINT API keys in any store/localStorage (web rules #46, #55).
- **Remove if** never — central client-state mechanism.

### `react-hook-form` — `^7.71.2`

- **Why** form state for all forms.
- **Where** form hooks in `src/hooks/` (web rules #14/#16); use
  `useWatch({ control, name })` not `watch()` — `react-hooks/incompatible-library`
  flags `watch()` as React-Compiler-incompatible (web rule #23).
- **Validate** `lint:strict` + `typecheck`.
- **Risk** low.
- **Security** client-side validation is UX only — the **backend re-validates**
  every payload with Zod DTOs (`apps/api`, api rule #27). Never trust RHF state as
  a security boundary.
- **Remove if** the app stops having forms (it will not). Coupled to
  `@hookform/resolvers` + `zod`.

### `@hookform/resolvers` — `^5.2.2`

- **Why** bridges react-hook-form ↔ Zod (`zodResolver(schema)`) via Standard Schema.
- **Where** form hooks; schemas in `src/lib/validation/<domain>.schema.ts` (web
  rule #18 — never inline in a component, unless the schema needs `t()` and must
  stay in hook context).
- **Validate** `typecheck`. The Zod peer is re-declared in `pnpm-workspace.yaml`
  to fix pnpm isolation ([ADR-0004](../decisions/ADR-0004-zod-resolver-peer.md))
  — that `packageExtensions` entry must stay.
- **Risk** low.
- **Security** n/a directly (a glue dep).
- **Remove if** `react-hook-form` is removed, or all forms move to manual Zod
  parsing. Removing it also lets you drop the ADR-0004 peer workaround — but only
  after confirming no `zodResolver` imports remain.

### `zod` — `^4.3.6`

- **Why** schema validation on the client (form schemas, parsing).
- **Where** `src/lib/validation/<domain>.schema.ts`.
- **Validate** `typecheck`.
- **Risk** medium — **web is on Zod 4, the API is on Zod 3** (intentional split,
  [report §3.3](../audit/05-dependency-report.md)). Do **not** copy schemas across
  the app boundary; the v3↔v4 API differs.
- **Security** the **client** schema is a UX guard; the **backend** Zod schema is
  the security boundary (string/array `.max()` limits, 64KB JSON-field caps — api
  rules #27/#28/#78). Mirror constraints but rely on the server.
- **Remove if** never — it underpins form validation and is the contract shape.

### `axios` — `^1.13.6`

- **Why** HTTP client for the proxy routes and services.
- **Where** the single pre-configured instance in `@/lib/api` — **never import
  axios raw** (web rule #63 spirit; API-client rules in
  [`rules/frontend/api-client-rules.md`](../../rules/frontend/api-client-rules.md)).
  The interceptor injects `X-Tenant-Id` from the tenant store.
- **Validate** `typecheck`.
- **Risk** low.
- **Security** the interceptor must **not** forward client role/auth headers
  (web security rule #41 / api rule #76) — role comes only from the validated JWT.
  Keep credentials out of logged request objects.
- **Remove if** the app standardizes on `fetch` everywhere; today every service
  depends on the configured instance, so it stays.

### `socket.io-client` — `^4.8.3`

- **Why** realtime notifications; pairs with the API's `socket.io@4` gateway.
- **Where** the notifications layer.
- **Validate** `test:e2e`.
- **Risk** low — keep the **major aligned** with the server `socket.io@4`
  (mismatched majors break the wire protocol).
- **Security** the server gateway validates WS origins against the same
  `CORS_ORIGINS` as HTTP (api rule #84). The WS origin is also reflected in the
  CSP `connect-src` allowlist built in `next.config.ts`.
- **Remove if** realtime notifications are dropped or move to SSE/polling; verify
  no socket usage and drop in lockstep with the server `socket.io`.

---

## 3. UI, styling & visualization

### `tailwindcss` + `@tailwindcss/postcss` + `postcss` — `^4` / `^4` / `^8.5.6`

- **Why** styling (Tailwind v4, CSS-first — no `tailwind.config.js`).
- **Where** `@theme inline` in `src/app/globals.css`; PostCSS wiring in
  [`apps/web/postcss.config.cjs`](../../apps/web/postcss.config.cjs)
  (`@tailwindcss/postcss` plugin only). Use the **status/severity class system**,
  never raw color classes (web rule #3 + the Styling Rules table).
- **Validate** `build` + `lint:strict`.
- **Risk** medium (v4 is a different config model).
- **Security** Tailwind/shadcn emit inline `style` attributes for dynamic CSS
  variables, which is why the CSP keeps `style-src 'unsafe-inline'` (documented
  inline in `next.config.ts`). That is a styling concession, not a script hole —
  `script-src` stays nonce-free-but-`'self'` (with `'unsafe-eval'` only in dev).
- **Remove if** never (core styling). The trio is one unit — do not split.

### `radix-ui` / `cmdk` / `shadcn` — `^1.4.3` / `^1.1.1` / `^4.0.8`

- **Why** accessible UI primitives behind shadcn/ui; `cmdk` powers command/combobox
  surfaces; `shadcn` (CLI/registry) generates the components.
- **Where** `src/components/ui/` (barrel `@/components/ui`); config in
  [`apps/web/components.json`](../../apps/web/components.json) (`style: new-york`,
  `rsc: true`, CSS variables, `lucide` icons). Never use raw
  `<select>/<input>/<textarea>` (web rule #11); always import via the barrel
  (#29).
- **Validate** `lint:strict` (jsx-a11y) + `typecheck`.
- **Risk** low–medium.
- **Security** Radix gives correct ARIA/focus trapping (a11y is enforced as
  **error** via `jsx-a11y`). shadcn components are **vendored into the repo**, not
  a runtime dep surface — review generated code like first-party code.
- **Remove if** `shadcn` (the CLI) can be moved to `devDependencies` or dropped
  once components are vendored and you no longer regenerate them — but
  `radix-ui` stays as long as `src/components/ui/*` import it. Prove no `cmdk`
  usage before removing it.

### `lucide-react` — `^0.577.0`

- **Why** icon set (matches `components.json` `iconLibrary: lucide`).
- **Where** components directly (`<Search />`, `<Plus />`, …).
- **Validate** `typecheck`. **Risk** low. **Security** n/a (static SVGs).
- **Remove if** the icon library changes — high churn (used everywhere), so a swap
  is a project, not a removal.

### `class-variance-authority` / `clsx` / `tailwind-merge` — `^0.7.1` / `^2.1.1` / `^3.5.0`

- **Why** class composition for variants + conditional classes + conflict merging.
- **Where** `cn()` in `@/lib/utils` and the shadcn component variants.
- **Validate** `lint:strict`. **Risk** low. **Security** n/a.
- **Remove if** `cn()` and all `cva` variants are gone — i.e., never while shadcn
  components exist. They form one utility cluster.

### `tw-animate-css` — `^1.4.0`

- **Why** Tailwind animation utilities used in `globals.css`.
- **Where** `src/app/globals.css`.
- **Validate** `build`. **Risk** low. **Security** n/a.
- **Remove if** `globals.css` no longer references its utilities — grep
  `globals.css` first.

### `recharts` — `^3.7.0`

- **Why** dashboard/chart visualizations.
- **Where** `src/components/charts/` (barrel-wrapped chart components).
- **Validate** `test:e2e` + `typecheck`.
- **Risk** low–medium (v3).
- **Security** renders numeric/series data only — never feed unsanitized HTML
  labels; keep AI-derived chart data behind the standardized AI renderers
  (`src/components/ai-renderer/`, web rule #53).
- **Remove if** charts move to another viz lib; prove no `src/components/charts/`
  imports remain.

### `react-day-picker` — `^9.14.0`

- **Why** date picker.
- **Where** `src/components/ui/calendar`.
- **Validate** `typecheck`. **Risk** low.
- **Security** n/a.
- **Remove if** the calendar component is removed. Note `date-fns` (below) is
  likely present **because** of this dep — check that link before touching either.

### `react-virtuoso` — `^4.18.3`

- **Why** list virtualization for large SOC datasets.
- **Where** wrapped by `VirtualizedList` in `@/components/common` — **never import
  `Virtuoso` raw** (web rule #63).
- **Validate** `test:e2e`. **Risk** low. **Security** n/a.
- **Remove if** `VirtualizedList` is removed or re-implemented; prove no
  `react-virtuoso` import outside the wrapper.

---

## 4. Notifications, i18n, theming, dates

### `sonner` — `^2.0.7`

- **Why** transient toast notifications.
- **Where** `Toast` in `@/components/common`; use `buildErrorToastHandler(tErrors)`
  for mutation `onError` (web rule #62). The `<Toaster>` mounts in the root layout.
- **Validate** `test:e2e`. **Risk** low.
- **Security** toast text must be `t(getErrorKey(error))` — never raw backend
  error strings (web security rule #40). **Distinct role** from `sweetalert2`
  (transient vs blocking) — not a duplicate ([report §3.1](../audit/05-dependency-report.md)).
- **Remove if** toasts move to another lib; the `Toast` wrapper is the only
  integration point, so swap there.

### `sweetalert2` — `^11.26.21`

- **Why** blocking confirmation dialogs.
- **Where** `SweetAlertDialog` in `@/components/common`; pair with
  `useDeleteWithConfirmation` for destructive actions.
- **Validate** `test:e2e`. **Risk** low (heavy dep).
- **Security** confirmation gates destructive operations client-side; the real
  authorization is the backend `@RequirePermission()` + tenant scoping (never
  rely on the dialog alone).
- **Remove if** dialogs migrate to Radix `AlertDialog` (the noted future swap) —
  then drop this heavier dep. Only after `SweetAlertDialog` no longer imports it.

### `next-intl` — `^4.8.3`

- **Why** i18n across **6 locales** (`en`, `es`, `it`, `fr`, `ar`, `de`),
  RTL-aware.
- **Where** [`src/i18n/`](../../apps/web/src/i18n/) — `index.ts` is the
  `getRequestConfig` that resolves the locale from the `locale` cookie and lazily
  imports `./<locale>.json`. All user-facing text via `t()` (web rule #9); use
  `start`/`end` (not `left`/`right`) for RTL. Rules:
  [`rules/frontend/i18n-rules.md`](../../rules/frontend/i18n-rules.md); recipe:
  [`skills/frontend/add-i18n-key.md`](../../skills/frontend/add-i18n-key.md).
- **Validate** `typecheck` + confirm **all 6 locale files** updated (backend
  `messageKey`s must exist in the frontend i18n too — web i18n rules, api rule #49).
- **Risk** low.
- **Security** the locale comes from a cookie validated against
  `SUPPORTED_LOCALES` (`isSupportedLocale`) before being used in a dynamic
  `import()` — an allowlist that prevents path traversal via the cookie value.
- **Remove if** never — every visible string depends on it.

### `next-themes` — `^0.4.6`

- **Why** dark/light theme management (dark is primary).
- **Where** `src/app/providers.tsx`; colors via CSS variables, **never `isDark`
  conditionals** (web Dark Mode rules).
- **Validate** `build`. **Risk** low.
- **Security** it injects an **inline `<script>`** to prevent theme FOUC — this is
  the documented reason `script-src` keeps `'unsafe-inline'` in
  `next.config.ts`. A future nonce-based CSP (per-request nonce via middleware) is
  the noted upgrade path.
- **Remove if** theming is dropped or replaced; revisit the CSP note if its inline
  script is the only `'unsafe-inline'` consumer left.

### `dayjs` — `^1.11.19`

- **Why** the **sanctioned** date library.
- **Where** `@/lib/dayjs` **only** (`formatDate`, `formatTimestamp`,
  `formatRelativeTime`, `nowISO`, `todayDate`, …) — **"NEVER import dayjs
  directly"** (web Libraries-Reference table).
- **Validate** `lint:strict`. **Risk** low. **Security** n/a.
- **Remove if** never — it is the date policy. All date logic must route through
  the `@/lib/dayjs` wrapper.

### `date-fns` — `^4.1.0`

- **Why** a direct dep that is **not** part of the date policy — flagged as a
  real duplicate of `dayjs` ([report §3.2](../audit/05-dependency-report.md)).
- **Where** most likely a transitive need of `react-day-picker`.
- **Validate** before removing: `grep apps/web/src for 'date-fns'` and confirm the
  calendar still builds.
- **Risk** low to remove. **Security** n/a.
- **Remove if** no first-party `date-fns` import exists and `react-day-picker`
  pulls its own copy transitively. This is the **clearest removal candidate** on
  the web side — but prove unused first (dependency-audit rule).

---

## 5. PWA & tooling (dev)

### `serwist` / `@serwist/turbopack` — `^9.5.7`

- **Why** service worker / PWA.
- **Where** [`src/app/sw.ts`](../../apps/web/src/app/sw.ts), wired via
  `withSerwist(...)` in `next.config.ts`. `sw.ts` **must** stay in `tsconfig.json`
  `"exclude"` (web rule #38 — its `lib: webworker` reference would otherwise
  break DOM types project-wide); it is excluded today.
- **Validate** `build`.
- **Risk** low.
- **Security** **security-load-bearing**: `sw.ts` forces all same-origin `/api/*`
  requests to `NetworkOnly` so authenticated API responses (alerts, cases,
  incidents) are **never served from cache after logout**. Do not let
  `defaultCache` precede the `apiNetworkOnly` rule. `worker-src 'self' blob:` in
  the CSP permits the worker.
- **Remove if** PWA/offline support is dropped — but first remove the
  `withSerwist` wrapper, the `sw.ts` exclude, and re-verify the post-logout cache
  behavior is still safe (the NetworkOnly guard goes away with it).

### `vitest` / `@vitest/coverage-v8` — `^3.2.6` (dev)

- **Why** unit tests.
- **Where** `npm test` → `vitest run --pool=threads`. Config:
  [`apps/web/vitest.config.ts`](../../apps/web/vitest.config.ts) — `node`
  environment, `test/**/*.test.ts`, `test/setup.ts`, `@` alias to `src`.
- **Validate** `test`. **Risk** low — already on **3.x**; the older `2.1`
  critical advisory in the matrix is the pre-upgrade state
  ([vuln-remediation](../audit/vulnerability-remediation.md)).
- **Security** dev-only (not shipped). Keep on a patched 3.x line.
- **Remove if** never (test runner). A swap is a tooling decision, not a cleanup.

### `@playwright/test` — `^1.58.2` (dev)

- **Why** e2e tests; **every new route needs a Playwright file** (web rule #48:
  loaded/empty/error/responsive states).
- **Where** [`apps/web/playwright.config.ts`](../../apps/web/playwright.config.ts)
  — `testDir: ./e2e`, `chromium`, `baseURL :3000`, auto-starts `npm run dev`,
  screenshots on failure. Rules:
  [`rules/testing/e2e-rules.md`](../../rules/testing/e2e-rules.md).
- **Validate** `test:e2e`. **Risk** low.
- **Security** dev-only. The webServer config runs the dev server — keep it out of
  production images.
- **Remove if** never (e2e gate per quality-gates).

### `esbuild` — `^0.28.1` (dev)

- **Why** dev bundling (used by Vitest).
- **Where** dev only. **Validate** via `test`. **Risk** low (bumped for the
  moderate advisory). **Security** dev-only.
- **Remove if** Vitest stops needing a pinned esbuild; today it is the transitive
  bundler — keep aligned.

### `cross-env` — `^10.1.0` (dependency)

- **Why** cross-platform env-var setting in npm scripts (`NODE_ENV=production`,
  `NODE_OPTIONS=--inspect`).
- **Where** `package.json` `scripts` (`start`, `start:prod`, `dev:debug`).
- **Validate** run the scripts. **Risk** low. **Security** n/a.
- **Remove if** the team standardizes on a shell that sets env inline (the repo
  is Windows-friendly, so it stays for now).

> `prettier-plugin-tailwindcss` (`^0.7.2`, dev) auto-sorts Tailwind classes per
> the web `.prettierrc`; it is also declared at the repo root (`^0.7.4`) — align
> the ranges ([report §3.4](../audit/05-dependency-report.md)). Husky / lint-staged
> / commitlint (pre-commit lint + `tsc --noEmit` + prettier) are covered in
> [`apps/web/CLAUDE.md` → Pre-commit Hooks](../../apps/web/CLAUDE.md) and
> [`LIBRARIES.md`](LIBRARIES.md).

---

## Before you touch any of these

1. **Read the rule:**
   [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
   (patch/minor security first; framework majors only via an ADR; remove only
   after proving unused).
2. **Check status:**
   [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)
   and [`docs/audit/dependency-matrix.md`](../audit/dependency-matrix.md).
3. **Respect the wrappers:** add a wrapper in `@/components/common/` and import via
   the barrel before using any new third-party UI lib (web rules #11/#29/#63).
4. **Validate after:** the gates in
   [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)
   — and **never claim "all green" unless the required gates actually passed**
   ([`AGENTS.md` §5](../../AGENTS.md)).
