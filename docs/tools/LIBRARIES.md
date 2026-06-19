# Libraries — Key Dependencies by App

> **Entry point for AI agents and contributors is [`AGENTS.md`](../../AGENTS.md)**
> (loading order, monorepo map, invariants). Read it first. This file is a
> **reference**, not a rule: it explains _why_ each key library exists, _where_
> it is used, _how_ to validate after touching it, and the _upgrade risk_.

## What this file is (and is not)

- **This file** = a grouped, human-readable tour of the load-bearing libraries
  in each app, with a usage and validation note per library.
- It does **not** duplicate the canonical sources — it links them:
  - [`docs/audit/dependency-matrix.md`](../audit/dependency-matrix.md) — the
    short version/why/upgrade-risk **matrix** (the table-of-record).
  - [`docs/audit/05-dependency-report.md`](../audit/05-dependency-report.md) —
    the full inventory, duplication findings, and migration-added deps.
  - [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)
    — `pnpm audit` status and the remediation plan (vitest, multer, …).
  - [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
    — the **hard rules** for adding/upgrading/removing a dependency.
  - [`skills/devsecops/add-ci-gate.md`](../../skills/devsecops/add-ci-gate.md) —
    recipe context for wiring CI gates that these tools feed.
  - [`docs/tools/TYPESCRIPT_AND_TSGO.md`](TYPESCRIPT_AND_TSGO.md) — the focused
    doc for `typescript` / `tsgo` ([ADR-0005](../decisions/ADR-0005-typescript-and-tsgo.md)).

**Source of truth for versions** = the two `package.json` files
([`apps/web/package.json`](../../apps/web/package.json),
[`apps/api/package.json`](../../apps/api/package.json)) and
[`package.json`](../../package.json) (root). Versions are quoted from those files;
when this doc and the matrix disagree, the `package.json` wins — fix the doc.

> **Do not run `pnpm` while reading this** — the workspace is mid-upgrade. Use the
> command names below as references; run them only when actually changing a dep.

## Conventions used below

- **Why** = the reason the library is in the tree.
- **Where** = the wrapper/module that owns it (most libs are wrapped, not used
  raw — see the rules in [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) and
  [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)).
- **Validate** = the gate(s) to run after touching it (see
  [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)
  and [`AGENTS.md` §5](../../AGENTS.md)).
- **Upgrade risk** = `low` / `medium` / `high` per
  [`dependency-matrix.md`](../audit/dependency-matrix.md).

---

## Web — `@auraspear/web` (Next.js 16, React 19, Tailwind 4)

Full library reference table (purpose + import path) also lives in
[`apps/web/CLAUDE.md` → "Libraries — Reference"](../../apps/web/CLAUDE.md). Most
third-party UI must be wrapped in `@/components/common/` before use — never
imported raw in a component (web rule #63).

### Framework & runtime

| Library               | Version        | Why · Where · Validate · Upgrade risk                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`                | `16.2.9`       | **Why** App Router framework + the BFF proxy layer (frontend never calls Wazuh/OpenSearch/MISP directly — see web rules #33/#86). **Where** `src/app/`, `src/middleware.ts`, `src/app/api/*` proxy routes via `proxyToBackend()`. **Validate** `next build` + `typecheck`. **Risk** medium (framework major) — pinned to `16.2.9` to clear the 8 HIGH advisories ([vuln-remediation](../audit/vulnerability-remediation.md)). |
| `react` / `react-dom` | `^19.2.4`      | **Why** UI runtime (React 19 + React Compiler). **Where** all components. **Validate** `typecheck` (React 19 + TS 5.9 types `e.target` as `EventTarget` — use `e.currentTarget.value`, web rule #37). **Risk** medium (major).                                                                                                                                                                                                |
| `eslint-config-next`  | `16.2.9` (dev) | **Why** Next's ESLint preset (`core-web-vitals` + `typescript`). **Where** `eslint.config.mjs`. **Validate** `lint:strict`. **Risk** low (keep aligned with `next`).                                                                                                                                                                                                                                                          |

### State, data & forms

| Library                 | Version                 | Why · Where · Validate · Upgrade risk                                                                                                                                                                                                                                                                                |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tanstack/react-query` | `^5.90.21`              | **Why** server state + caching (all list/detail/mutation flows). **Where** custom hooks in `src/hooks/`; `placeholderData: keepPreviousData` for paginated tables. **Validate** `typecheck` + Playwright `test:e2e`. **Risk** low.                                                                                   |
| `zustand`               | `^5.0.11`               | **Why** global client state (auth, tenant, filters, ui, notifications, hunt, ai-connector). **Where** `src/stores/` (barrel `@/stores`); `AiConnectorSelect` reads the connector store internally (web rule #61). **Validate** `typecheck`. **Risk** low.                                                            |
| `react-hook-form`       | `^7.71.2`               | **Why** form state. **Where** form hooks in `src/hooks/`; use `useWatch({ control, name })` not `watch()` (React Compiler compat, web rule #23). **Validate** `lint:strict` + `typecheck`. **Risk** low.                                                                                                             |
| `@hookform/resolvers`   | `^5.2.2`                | **Why** bridges RHF ↔ Zod via Standard Schema. **Where** `zodResolver(schema)`. **Validate** `typecheck` — the **zod peer is re-declared** in `pnpm-workspace.yaml` to fix pnpm isolation ([ADR-0004](../decisions/ADR-0004-zod-resolver-peer.md)). **Risk** low (but the pnpm `packageExtensions` entry must stay). |
| `zod`                   | `^4.3.6` (pinned 4.4.3) | **Why** schema validation. **Where** `src/lib/validation/<domain>.schema.ts`. **Validate** `typecheck`. **Risk** medium — **web is on Zod 4, api on Zod 3** (intentional split, [report §3.3](../audit/05-dependency-report.md)); do not copy schemas across the boundary.                                           |
| `axios`                 | `^1.13.6`               | **Why** HTTP client. **Where** the pre-configured instance in `@/lib/api` (interceptor sends `X-Tenant-Id` from the tenant store — never import axios raw). **Validate** `typecheck`. **Risk** low.                                                                                                                  |
| `socket.io-client`      | `^4.8.3`                | **Why** realtime notifications (pairs with the API's `socket.io`). **Where** notifications layer. **Validate** `test:e2e`. **Risk** low (keep major aligned with server `socket.io@4`).                                                                                                                              |

### UI, styling & visualization

| Library                                                | Version                        | Why · Where · Validate · Upgrade risk                                                                                                                                                                                                                                                         |
| ------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tailwindcss` + `@tailwindcss/postcss` + `postcss`     | `^4` / `^4` / `^8.5.6`         | **Why** styling (Tailwind v4, CSS-first). **Where** `@theme inline` in `src/app/globals.css` — no `tailwind.config.js`; use the status/severity class system, never raw color classes (web rules #3, styling rules). **Validate** `build` + `lint:strict`. **Risk** medium (v4 is CSS-first). |
| `radix-ui` / `cmdk` / `shadcn`                         | `^1.4.3` / `^1.1.1` / `^4.0.8` | **Why** accessible UI primitives behind shadcn/ui. **Where** `src/components/ui/` (barrel `@/components/ui`); never raw `<select>/<input>/<textarea>` (web rule #11). **Validate** `lint:strict` (jsx-a11y) + `typecheck`. **Risk** low–medium.                                               |
| `lucide-react`                                         | `^0.577.0`                     | **Why** icon set. **Where** components. **Validate** `typecheck`. **Risk** low.                                                                                                                                                                                                               |
| `class-variance-authority` / `clsx` / `tailwind-merge` | `^0.7.1` / `^2.1.1` / `^3.5.0` | **Why** class composition. **Where** `cn()` in `@/lib/utils`. **Validate** `lint:strict`. **Risk** low.                                                                                                                                                                                       |
| `tw-animate-css`                                       | `^1.4.0`                       | **Why** Tailwind animation utilities. **Where** `globals.css`. **Validate** `build`. **Risk** low.                                                                                                                                                                                            |
| `recharts`                                             | `^3.7.0`                       | **Why** dashboard/chart visualizations. **Where** `src/components/charts/`. **Validate** `test:e2e` + `typecheck`. **Risk** low–medium (v3).                                                                                                                                                  |
| `react-day-picker`                                     | `^9.14.0`                      | **Why** date picker. **Where** `src/components/ui/calendar`. **Validate** `typecheck`. **Risk** low.                                                                                                                                                                                          |
| `react-virtuoso`                                       | `^4.18.3`                      | **Why** list virtualization. **Where** wrapped by `VirtualizedList` in `@/components/common` (never import `Virtuoso` raw, web rule #63). **Validate** `test:e2e`. **Risk** low.                                                                                                              |

### Notifications, i18n, theming, dates

| Library       | Version     | Why · Where · Validate · Upgrade risk                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sonner`      | `^2.0.7`    | **Why** transient toast notifications. **Where** `Toast` in `@/components/common`. **Validate** `test:e2e`. **Risk** low. _(Distinct role from `sweetalert2` — not a duplicate, [report §3.1](../audit/05-dependency-report.md).)_                                                                                                                                                              |
| `sweetalert2` | `^11.26.21` | **Why** blocking confirmation dialogs. **Where** `SweetAlertDialog` in `@/components/common`. **Validate** `test:e2e`. **Risk** low (heavy dep; optional future swap to Radix `AlertDialog`).                                                                                                                                                                                                   |
| `next-intl`   | `^4.8.3`    | **Why** i18n across 6 locales (`en`, `es`, `it`, `fr`, `ar`, `de`), RTL-aware. **Where** `src/i18n/`; all user-facing text via `t()` (web rule #9). **Validate** `typecheck` + verify all 6 locale files updated. **Risk** low.                                                                                                                                                                 |
| `next-themes` | `^0.4.6`    | **Why** dark/light theme management. **Where** `src/app/providers.tsx`; colors via CSS variables, never `isDark` conditionals. **Validate** `build`. **Risk** low.                                                                                                                                                                                                                              |
| `dayjs`       | `^1.11.19`  | **Why** the **sanctioned** date library. **Where** `@/lib/dayjs` only (`formatDate`, `formatTimestamp`, `nowISO`, …) — **"NEVER import dayjs directly"**. **Validate** `lint:strict`. **Risk** low.                                                                                                                                                                                             |
| `date-fns`    | `^4.1.0`    | **Why** currently a direct dep but **not** in the date policy — flagged as a real duplicate of `dayjs` ([report §3.2](../audit/05-dependency-report.md)). **Where** likely transitive need of `react-day-picker`. **Validate** before removing: `grep src/ for 'date-fns'`. **Risk** low to remove (prove unused first per [dependency-audit rules](../../rules/security/dependency-audit.md)). |

### PWA & tooling (dev)

| Library                          | Version        | Why · Where · Validate · Upgrade risk                                                                                                                                                                                                                                |
| -------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `serwist` / `@serwist/turbopack` | `^9.5.7`       | **Why** service worker / PWA. **Where** `src/app/sw.ts` (must be in tsconfig `exclude`, web rule #38). **Validate** `build`. **Risk** low.                                                                                                                           |
| `vitest` / `@vitest/coverage-v8` | `^3.2.6`       | **Why** unit tests. **Where** `npm test` (`vitest run`). **Validate** `test`. **Risk** — `package.json` is already on **3.x**; the older `2.1` critical advisory in the matrix is the pre-upgrade state ([vuln-remediation](../audit/vulnerability-remediation.md)). |
| `@playwright/test`               | `^1.58.2`      | **Why** e2e tests (every new route needs a Playwright file, web rule #48). **Where** `test:e2e`. **Risk** low.                                                                                                                                                       |
| `esbuild`                        | `^0.28.1`      | **Why** dev bundling (via vitest). **Where** dev only. **Risk** low (bumped for the moderate advisory).                                                                                                                                                              |
| `prettier-plugin-tailwindcss`    | `^0.7.2` (dev) | **Why** auto-sorts Tailwind classes. **Where** web `.prettierrc`. **Risk** low — **also declared at root** (`^0.7.4`); align ranges ([report §3.4](../audit/05-dependency-report.md)).                                                                               |

---

## API — `@auraspear/api` (NestJS 11, Prisma 7, Postgres, Redis)

Architecture and layering rules are in [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
(Controller → Service → Repository → Prisma; Zod DTOs; no `class-validator`).
Backend deep dives: [`docs/architecture/BACKEND.md`](../architecture/BACKEND.md),
[`docs/architecture/CONNECTORS.md`](../architecture/CONNECTORS.md),
[`docs/architecture/DATABASE.md`](../architecture/DATABASE.md).

### Framework & runtime

| Library                                                           | Version                            | Why · Where · Validate · Upgrade risk                                                                                                                                                                        |
| ----------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@nestjs/common` · `@nestjs/core` · `@nestjs/platform-express`    | `^11`                              | **Why** the BFF framework. **Where** all modules under `src/modules/`. **Validate** `build` + `typecheck` + `test`. **Risk** medium (major).                                                                 |
| `@nestjs/config`                                                  | `^4.0.0`                           | **Why** typed config loading. **Where** `src/config/env.validation.ts` (Zod env schema; `NODE_ENV` defaults to `production`, api rule #58). **Validate** `typecheck` + boot. **Risk** low.                   |
| `@nestjs/swagger`                                                 | `^11`                              | **Why** API docs (disabled outside dev). **Where** `main.ts`. **Validate** `build`. **Risk** low.                                                                                                            |
| `@nestjs/throttler`                                               | `^6.0.0`                           | **Why** rate limiting (auth 5/min, AI 10/min, CRUD 30/min — api rules #32/#33/#80). **Where** `@Throttle()` on controllers. **Validate** `test` + `typecheck`. **Risk** low.                                 |
| `@nestjs/schedule`                                                | `^6.1.1`                           | **Why** periodic tasks (stale-job recovery, api rule #91). **Where** job processor. **Validate** `test`. **Risk** low.                                                                                       |
| `@nestjs/websockets` · `@nestjs/platform-socket.io` · `socket.io` | `^11.1.16` · `^11.1.16` · `^4.8.3` | **Why** the notifications gateway (WS CORS must match HTTP CORS, api rule #84). **Where** notifications gateway. **Validate** `test:e2e`. **Risk** low (keep `socket.io` major aligned with the web client). |
| `express`                                                         | `^5.0.0`                           | **Why** the HTTP server under Nest; `express.json({ limit: '1mb' })` body cap (api rule #34). **Where** `main.ts`. **Validate** `build` + `test`. **Risk** medium (Express 5).                               |
| `reflect-metadata` / `rxjs`                                       | `^0.2.0` / `^7.0.0`                | **Why** required NestJS runtime (decorators + streams). **Where** global. **Validate** `build`. **Risk** low.                                                                                                |

### Data, cache & validation

| Library                           | Version   | Why · Where · Validate · Upgrade risk                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@prisma/client` / `prisma` (dev) | `^7.6.0`  | **Why** the ORM. **Where** repository layer only (services never import Prisma, api rule 14a); `where: { id, tenantId }` on every `update`/`delete` (api rule #26). **Validate** `prisma:generate` + migration + `typecheck` + `test`. **Risk** medium (major) — schema changes require a migration (api rule #30).                                                        |
| `@prisma/adapter-pg`              | `^7.6.0`  | **Why** the pg driver adapter for Prisma 7. **Where** `PrismaService` (pool `connection_limit=20&pool_timeout=10`, api rule #46). **Validate** boot + `test`. **Risk** medium (tied to Prisma major).                                                                                                                                                                      |
| `pg`                              | `^8.20.0` | **Why** Postgres driver. **Where** under the Prisma adapter. **Validate** boot. **Risk** low.                                                                                                                                                                                                                                                                              |
| `ioredis`                         | `^5.0.0`  | **Why** Redis client (token blacklist, job locks, health). **Where** token-blacklist service, job processor (reuse connections, api rules #47/#90). **Validate** `test` + boot. **Risk** low.                                                                                                                                                                              |
| `cache-manager`                   | `^7.2.8`  | **Why** caching abstraction. **Where** caching layer. **Validate** `test`. **Risk** low.                                                                                                                                                                                                                                                                                   |
| `zod`                             | `^3.23.0` | **Why** all DTO validation (no `class-validator`). **Where** `<module>/dto/*.dto.ts` (`.max()` on every string/array, api rules #27/#28). **Validate** `typecheck` + `test`. **Risk** medium — **api stays on Zod 3** while web is on Zod 4 (intentional, [report §3.3](../audit/05-dependency-report.md)); a 3→4 bump must re-validate `ZodValidationPipe` and every DTO. |

### Auth, security & HTTP

| Library         | Version   | Why · Where · Validate · Upgrade risk                                                                                                                  |
| --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `jsonwebtoken`  | `^9.0.0`  | **Why** JWT sign/verify (HS256 only; `jti` + `tokenType` on every token, api rules #29/#38). **Where** auth module. **Validate** `test`. **Risk** low. |
| `jwks-rsa`      | `^4.0.1`  | **Why** OIDC (Microsoft Entra ID) JWKS verification. **Where** auth guard chain. **Validate** `test`. **Risk** low.                                    |
| `bcryptjs`      | `^3.0.3`  | **Why** password hashing + constant-time compare for missing users (api rule #52). **Where** auth service. **Validate** `test`. **Risk** low.          |
| `helmet`        | `^8.0.0`  | **Why** HTTP hardening (CSP without `'unsafe-inline'`, HSTS — api rule #62). **Where** `main.ts`. **Validate** boot + security review. **Risk** low.   |
| `cookie-parser` | `^1.4.7`  | **Why** cookie parsing. **Where** `main.ts`. **Validate** boot. **Risk** low.                                                                          |
| `axios`         | `^1.13.6` | **Why** outbound HTTP to connectors. **Where** connector HTTP utility (SSRF-validated URLs, api rule #59). **Validate** `test`. **Risk** low.          |

### AI, jobs, reporting & utilities

| Library                                              | Version                                      | Why · Where · Validate · Upgrade risk                                                                                                                                                                                                                                                 |
| ---------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@aws-sdk/client-bedrock-runtime`                    | `^3.1014.0`                                  | **Why** AWS Bedrock (Claude) in the AI connector cascade (bedrock → llm_apis → openclaw, api rule #88; no mock mode #89). **Where** `connectors/services/bedrock` adapter. **Validate** `test`. **Risk** low.                                                                         |
| `cron-parser`                                        | `^5.5.0`                                     | **Why** parses scheduled-trigger cron expressions. **Where** AI agent / job scheduling. **Validate** `test`. **Risk** low.                                                                                                                                                            |
| `pdfkit` (+ `@types/pdfkit`)                         | `^0.18.0`                                    | **Why** report PDF generation (`REPORT_GENERATION` job). **Where** report handler. **Validate** `test`. **Risk** low.                                                                                                                                                                 |
| `nestjs-pino` / `pino` / `pino-http` / `pino-pretty` | `^4.0.0` / `^10.3.1` / `^11.0.0` / `^13.0.0` | **Why** structured JSON logging with credential redaction (api rules #57/#66). **Where** `app.module.ts` redact list. **Validate** `test` + boot. **Risk** low (keep the pino family aligned).                                                                                        |
| `uuid`                                               | `^13.0.0`                                    | **Why** ID / `jti` / request-ID generation. **Where** auth, `X-Request-ID` middleware. **Validate** `typecheck`. **Risk** low.                                                                                                                                                        |
| `yaml`                                               | `^2.8.2`                                     | **Why** YAML parsing (e.g., detection/Sigma rules). **Where** rule ingestion. **Validate** `test`. **Risk** low.                                                                                                                                                                      |
| `ws` (+ `@types/ws`)                                 | `^8.21.0`                                    | **Why** raw WebSocket — **added by the monorepo migration** ([report §4](../audit/05-dependency-report.md)). **Where** verify a direct `import 'ws'` exists; otherwise remove (let socket.io pull it transitively). **Validate** prove direct usage before keeping. **Risk** low.     |
| `form-data`                                          | `^4.0.6`                                     | **Why** multipart bodies for connector uploads — **migration-added**; `axios@1` bundles its own. **Where** verify first-party `FormData` construction before keeping ([report §4](../audit/05-dependency-report.md)). **Validate** `grep apps/api/src for 'form-data'`. **Risk** low. |

### Tooling (dev)

| Library                                                  | Version                          | Why · Where · Validate · Upgrade risk                                                                                                                                                                         |
| -------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `jest` / `ts-jest` / `supertest`                         | `^30.3.0` / `^29.4.6` / `^7.2.2` | **Why** unit + e2e tests. **Where** `__tests__/` and `test/`. **Validate** `test` / `test:e2e`. **Risk** low.                                                                                                 |
| `@nestjs/cli` / `@nestjs/schematics` / `@nestjs/testing` | `^11`                            | **Why** build + scaffolding + test harness. **Where** dev. **Risk** low (align with Nest major).                                                                                                              |
| `multer` (transitive via `@nestjs/platform-express`)     | —                                | **Why** file uploads. **Validate** N/A direct. **Risk** **high advisory** → plan `>=2.2.0` via pnpm `overrides` after verifying NestJS 11 compat ([vuln-remediation](../audit/vulnerability-remediation.md)). |

---

## Shared / root tooling

Quoted from [`package.json`](../../package.json) (root) — Turbo fans tasks out to
the workspaces. The cross-cutting ESLint 9 stack
(`@typescript-eslint/*`, `eslint-plugin-security`, `eslint-plugin-unicorn`,
`eslint-plugin-import-x`, plus web's React/jsx-a11y plugins) is documented in
each app's `CLAUDE.md` ESLint section.

| Library                                      | Version                          | Why · Where · Validate · Upgrade risk                                                                                                                                                                                         |
| -------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ----------------------------------------------------------------------- |
| `pnpm`                                       | `10.30.3` (`packageManager`)     | **Why** the **only** package manager — no mixed lockfiles. **Where** workspace. **Validate** `pnpm install` (when not mid-upgrade). **Risk** low.                                                                             |
| `turbo`                                      | `^2.5.8`                         | **Why** task orchestration (`turbo run typecheck                                                                                                                                                                              | lint | test | build`). **Where** root scripts. **Validate** `validate`. **Risk** low. |
| `typescript`                                 | `^5.9.3`                         | **Why** the **blocking** typecheck (`tsc`). **Where** every package. **Validate** `typecheck`. **Risk** low. See [`TYPESCRIPT_AND_TSGO.md`](TYPESCRIPT_AND_TSGO.md).                                                          |
| `@typescript/native-preview` (`tsgo`)        | `7.0.0-dev`                      | **Why** advisory fast typecheck (`typecheck:fast`) — **not** a gate. **Where** root. **Validate** never weaken a tsconfig to make tsgo pass. **Risk** dev preview ([ADR-0005](../decisions/ADR-0005-typescript-and-tsgo.md)). |
| `prettier` (+ `prettier-plugin-tailwindcss`) | `^3.8.1` / `^0.7.4`              | **Why** formatting. **Where** root + per-app. **Validate** `format:check`. **Risk** low (align the tailwind plugin range with web — [report §3.4](../audit/05-dependency-report.md)).                                         |
| `husky` / `lint-staged` / `@commitlint/*`    | `^9.1.7` / `^16.3.1` / `^20.5.0` | **Why** pre-commit (lint + `tsc --noEmit` + prettier) and commit-message gates. **Where** `.husky/`, `.lintstagedrc.cjs`. **Validate** commit. **Risk** low.                                                                  |

---

## Before you touch any dependency

1. Read the rule: [`rules/security/dependency-audit.md`](../../rules/security/dependency-audit.md)
   (patch/minor security first; framework majors only via an ADR; remove only
   after proving unused).
2. Check the status: [`docs/audit/vulnerability-remediation.md`](../audit/vulnerability-remediation.md)
   and [`docs/audit/dependency-matrix.md`](../audit/dependency-matrix.md).
3. Validate after: run the gates in
   [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)
   and **never claim "all green" unless the required gates actually passed**
   ([`AGENTS.md` §5](../../AGENTS.md)).
