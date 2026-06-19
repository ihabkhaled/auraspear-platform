# AUDIT 05 — Dependency Report (Inventory + Duplication)

> Scope: `apps/web` (`@auraspear/web`), `apps/api` (`@auraspear/api`), and the workspace
> root (`auraspear-platform`). Versions below are taken verbatim from each `package.json`.
> Sources:
> [`apps/web/package.json`](../../apps/web/package.json),
> [`apps/api/package.json`](../../apps/api/package.json),
> [`package.json`](../../package.json) (root).
>
> This is an analysis-only report. **No dependency changes are made here** — only
> findings and recommendations.

---

## 1. Workspace Topology

| Workspace  | Package name         | Runtime                           | Package manager       |
| ---------- | -------------------- | --------------------------------- | --------------------- |
| Root       | `auraspear-platform` | — (tooling only)                  | pnpm `10.30.3`, Turbo |
| `apps/web` | `@auraspear/web`     | Next.js `16.1.6` + React `19.2.4` | pnpm workspace        |
| `apps/api` | `@auraspear/api`     | NestJS `11` + Express `5`         | pnpm workspace        |

- Root declares `engines.node: ">=22 <25"` and `pnpm: ">=10"`, and uses Turbo (`turbo@^2.5.8`)
  to fan tasks out to the workspaces (`turbo run dev|build|lint|test`).
- Root keeps a minimal shared dev toolchain only: commitlint, husky, lint-staged, prettier,
  **prettier-plugin-tailwindcss**, turbo, typescript.

---

## 2. Inventory

### 2.1 Web (`@auraspear/web`) — runtime dependencies

| Package                                                               | Version                                     | Role                          |
| --------------------------------------------------------------------- | ------------------------------------------- | ----------------------------- |
| `next`                                                                | `16.1.6`                                    | Framework (App Router)        |
| `react` / `react-dom`                                                 | `^19.2.4`                                   | UI runtime                    |
| `next-intl`                                                           | `^4.8.3`                                    | i18n                          |
| `next-themes`                                                         | `^0.4.6`                                    | Theme switching               |
| `@tanstack/react-query`                                               | `^5.90.21`                                  | Server state / caching        |
| `react-hook-form` + `@hookform/resolvers`                             | `^7.71.2` / `^5.2.2`                        | Forms                         |
| `zod`                                                                 | **`^4.3.6`**                                | Schema validation             |
| `axios`                                                               | `^1.13.6`                                   | HTTP client                   |
| `socket.io-client`                                                    | `^4.8.3`                                    | Realtime (notifications)      |
| `radix-ui` / `cmdk` / `shadcn` / `lucide-react`                       | `^1.4.3` / `^1.1.1` / `^4.0.8` / `^0.577.0` | UI primitives / icons         |
| `class-variance-authority` / `clsx` / `tailwind-merge`                | `^0.7.1` / `^2.1.1` / `^3.5.0`              | Class utilities               |
| `tailwindcss` / `@tailwindcss/postcss` / `postcss` / `tw-animate-css` | `^4` / `^4` / `^8.5.6` / `^1.4.0`           | Styling                       |
| `recharts`                                                            | `^3.7.0`                                    | Charts                        |
| `react-day-picker`                                                    | `^9.14.0`                                   | Date picker                   |
| `react-virtuoso`                                                      | `^4.18.3`                                   | Virtualized lists             |
| `serwist` / `@serwist/turbopack`                                      | `^9.5.7`                                    | Service worker / PWA          |
| `zustand`                                                             | `^5.0.11`                                   | Global client state           |
| `cross-env`                                                           | `^10.1.0`                                   | Cross-platform env in scripts |
| **`sweetalert2`**                                                     | **`^11.26.21`**                             | Confirmation dialogs          |
| **`sonner`**                                                          | **`^2.0.7`**                                | Toast notifications           |
| **`dayjs`**                                                           | **`^1.11.19`**                              | Date formatting               |
| **`date-fns`**                                                        | **`^4.1.0`**                                | Date utilities                |

Web dev tooling of note: full ESLint 9 stack (`eslint-config-next`, `@typescript-eslint/*`,
`eslint-plugin-*`), `vitest@^2.1.9` + `@vitest/coverage-v8`, `@playwright/test`, `prettier`,
and a **local copy of `prettier-plugin-tailwindcss@^0.7.2`**.

### 2.2 API (`@auraspear/api`) — runtime dependencies

| Package                                                                                                            | Version                                      | Role                               |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ---------------------------------- |
| `@nestjs/*` (common, core, config, platform-express, swagger, throttler, schedule, websockets, platform-socket.io) | `^11.x`                                      | Framework                          |
| `@prisma/client` / `@prisma/adapter-pg` (+ `prisma` dev)                                                           | `^7.6.0`                                     | ORM                                |
| `pg`                                                                                                               | `^8.20.0`                                    | Postgres driver                    |
| `ioredis`                                                                                                          | `^5.0.0`                                     | Redis client                       |
| `express`                                                                                                          | `^5.0.0`                                     | HTTP server                        |
| `axios`                                                                                                            | `^1.13.6`                                    | Outbound HTTP                      |
| `socket.io`                                                                                                        | `^4.8.3`                                     | Realtime server                    |
| **`ws`**                                                                                                           | **`^8.21.0`**                                | WebSocket (migration-added)        |
| **`form-data`**                                                                                                    | **`^4.0.6`**                                 | Multipart bodies (migration-added) |
| `zod`                                                                                                              | **`^3.23.0`**                                | DTO validation                     |
| `bcryptjs`                                                                                                         | `^3.0.3`                                     | Password hashing                   |
| `jsonwebtoken` / `jwks-rsa`                                                                                        | `^9.0.0` / `^4.0.1`                          | JWT / OIDC                         |
| `cookie-parser`                                                                                                    | `^1.4.7`                                     | Cookie parsing                     |
| `helmet`                                                                                                           | `^8.0.0`                                     | HTTP hardening                     |
| `cache-manager`                                                                                                    | `^7.2.8`                                     | Caching                            |
| `cron-parser`                                                                                                      | `^5.5.0`                                     | Cron schedules                     |
| `@aws-sdk/client-bedrock-runtime`                                                                                  | `^3.1014.0`                                  | AI (Bedrock)                       |
| `pdfkit`                                                                                                           | `^0.18.0`                                    | Report PDF generation              |
| `nestjs-pino` / `pino` / `pino-http` / `pino-pretty`                                                               | `^4.0.0` / `^10.3.1` / `^11.0.0` / `^13.0.0` | Logging                            |
| `reflect-metadata` / `rxjs`                                                                                        | `^0.2.0` / `^7.0.0`                          | NestJS runtime                     |
| `uuid`                                                                                                             | `^13.0.0`                                    | ID generation                      |
| `yaml`                                                                                                             | `^2.8.2`                                     | YAML parsing                       |
| **`dayjs`**                                                                                                        | **`^1.11.20`**                               | Date/time utility                  |

API dev tooling of note: `jest@^30` + `ts-jest` + `supertest`, NestJS CLI/schematics/testing,
`@types/*` (incl. **`@types/ws@^8.18.1`** — migration-added), ESLint 9 stack, `prettier`.

---

## 3. Duplication & Overlap Findings

### 3.1 Toast vs. Confirmation — `sonner` vs `sweetalert2` (web) — NOT a true duplicate

Both live in `apps/web`:

- `sonner@^2.0.7` — toast notifications (wrapped by `Toast` in `@/components/common`).
- `sweetalert2@^11.26.21` — confirmation/modal dialogs (wrapped by `SweetAlertDialog`).

**Finding:** These are frequently flagged together as "two notification libraries," but per
`apps/web/CLAUDE.md` they serve **distinct, non-overlapping roles**: `sonner` = transient
toasts, `sweetalert2` = blocking confirmation dialogs. Both are first-class, documented, and
wrapped behind centralized modules. This is **intentional, not redundant**.

**Recommendation:** **Keep both.** Optional hygiene only — if the team wants to shed
`sweetalert2` (a relatively heavy dependency, `^11.x`), confirmation dialogs could be migrated
to a Radix/shadcn `AlertDialog` (Radix is already present via `radix-ui@^1.4.3`). Not urgent;
treat as a size-optimization backlog item.

### 3.2 Date libraries — `dayjs` vs `date-fns` (web) — REAL duplicate

`apps/web` ships **both**:

- `dayjs@^1.11.19` — the **documented, sanctioned** date module. `apps/web/CLAUDE.md` explicitly
  mandates all date work go through `@/lib/dayjs` (`formatDate`, `formatTimestamp`,
  `formatRelativeTime`, `nowISO`, `todayDate`, `sortByDateAsc/Desc`) and says **"NEVER import
  dayjs directly."**
- `date-fns@^4.1.0` — **not referenced anywhere in the web CLAUDE.md** date guidance.

**Finding:** This is a genuine duplicate. `date-fns` overlaps `dayjs` entirely and contradicts
the single-source-of-truth date policy. The most likely source is a transitive UI need
(`react-day-picker@^9` historically paired with `date-fns`), pulled up into direct deps.

**Recommendation:** **Remove `date-fns` from web direct dependencies** unless a concrete
first-party usage is found. Action item: grep `src/` for `from 'date-fns'`. If only
`react-day-picker` uses it, let it resolve transitively (v9 bundles its own formatting) rather
than declaring it directly. Standardize all app date logic on the `@/lib/dayjs` wrapper.

### 3.3 Cross-workspace `zod` skew — `zod@4` (web) vs `zod@3` (api) — MAJOR-VERSION SPLIT

- `apps/web`: `zod@^4.3.6`
- `apps/api`: `zod@^3.23.0`

**Finding:** A **major-version split** of the same validation library across the two apps. Zod 3
and 4 differ in API surface and inferred-type behavior. Risk concentrates wherever schemas or
inferred types are intended to be shared (e.g., DTO shapes mirrored between BFF and frontend) —
copy-pasting a schema across the boundary can break under v3↔v4 differences, and any future
`packages/shared` schema would have to target one major.

**Recommendation:** **Converge on a single major** — preferably **Zod 4 everywhere**, upgrading
the API from `^3.23.0` to `^4.x`. Caveats: the API uses a custom `ZodValidationPipe` (no
class-validator) and Zod-inferred DTO types throughout, so the upgrade must be validated against
the pipe and all `*.dto.ts` schemas (`.max()` constraints, `z.enum`, `.refine()` checks for env
validation). Do this before introducing any shared Zod schemas in `packages/shared`. If a v4
upgrade of the API is deemed too risky short-term, document the split explicitly and keep schemas
strictly per-app (no cross-boundary schema sharing) until aligned.

### 3.4 `prettier-plugin-tailwindcss` declared in two places — root vs web — VERSION SKEW

- Root (`package.json` devDependencies): `prettier-plugin-tailwindcss@^0.7.4`
- `apps/web` (devDependencies): `prettier-plugin-tailwindcss@^0.7.2`

**Finding:** The Tailwind class-sorting Prettier plugin is declared at **both** the root and the
web workspace, at **different ranges** (`^0.7.4` vs `^0.7.2`). The root `format`/`format:check`
scripts run `prettier ... .` across the whole repo, while web has its own `format` scripts. The
plugin is only meaningful for Tailwind/JSX files, which live in `apps/web`; the API has no
Tailwind. The duplicate declaration risks two resolved versions and divergent class ordering
depending on which Prettier invocation runs.

**Recommendation:** **Pick one home.** Since Tailwind exists only in `apps/web`, keep the plugin
in `apps/web` and **remove it from the root** (or vice-versa, but not both). If kept in both for
convenience, **align the version range** (`^0.7.4` in both) so the resolved plugin is identical.
Confirm which `.prettierrc` actually loads the plugin (web's `.prettierrc` lists
`prettier-plugin-tailwindcss` per `apps/web/CLAUDE.md`).

---

## 4. Migration-Added Dependencies (verify intent)

These appear to have been introduced by a migration/move into this monorepo and should be
audited for actual usage:

| Package     | Where      | Version   | Notes                                                                                                                                                                                                                                                                                                               |
| ----------- | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ws`        | api dep    | `^8.21.0` | Raw WebSocket lib. API already uses `@nestjs/websockets` + `@nestjs/platform-socket.io` + `socket.io` for its gateway. `ws` may be required transitively by socket.io or by an outbound WebSocket connector — confirm a **direct** first-party `import 'ws'` exists; otherwise it is a redundant direct dependency. |
| `@types/ws` | api devDep | `^8.18.1` | Types for `ws`. Keep only if `ws` is used directly in TypeScript. Tied to the `ws` decision above.                                                                                                                                                                                                                  |
| `form-data` | api dep    | `^4.0.6`  | Multipart form bodies for outbound HTTP. `axios@^1` bundles its own `form-data` internally, so a **direct** declaration is only needed if first-party code constructs `FormData` manually (e.g., connector file uploads to Shuffle/MISP). Confirm direct usage.                                                     |

**Recommendation:** Run a usage check (`grep -rn "from 'ws'"`, `"require('ws')"`,
`"from 'form-data'"` under `apps/api/src`). For each with no direct import, **remove the direct
declaration** and let it resolve transitively. Keep `@types/ws` if and only if `ws` stays a
direct dependency. If all three are genuinely used, leave them but note them in this report so
future audits don't re-flag.

---

## 5. Root-Level Tooling Note

`prettier-plugin-tailwindcss@^0.7.4` at the root (covered in §3.4) is the one root-level
dependency that overlaps a workspace. The rest of the root devDependencies are legitimately
shared meta-tooling (commitlint, husky, lint-staged, prettier, turbo, typescript) and are
appropriate to keep at the root. Note that `husky`, `lint-staged`, `prettier`, `@commitlint/*`,
and `typescript` are **also** declared inside each app's `devDependencies`; this is common in
pnpm + Turbo monorepos (per-workspace tooling resolution) and is **not flagged as a problem**,
but the team may consider hoisting these to root-only to reduce range drift over time.

---

## 6. Summary of Recommendations

| #   | Item                                                        | Severity       | Recommendation                                                                                                                                          |
| --- | ----------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `date-fns` vs `dayjs` (web)                                 | **Medium**     | Remove `date-fns` from web direct deps unless first-party usage exists; standardize on `@/lib/dayjs`.                                                   |
| 2   | `zod@4` (web) vs `zod@3` (api)                              | **High**       | Converge on a single major (prefer Zod 4 everywhere); upgrade API after validating `ZodValidationPipe` + all DTO schemas. Blocks any shared Zod schema. |
| 3   | `prettier-plugin-tailwindcss` root `^0.7.4` vs web `^0.7.2` | **Low**        | Declare in one place (web); if kept in both, align the range.                                                                                           |
| 4   | `ws` / `@types/ws` (api)                                    | **Low–Medium** | Verify direct usage; remove direct declarations if only transitive.                                                                                     |
| 5   | `form-data` (api)                                           | **Low**        | Verify direct usage; axios bundles form-data — remove direct dep if unused.                                                                             |
| 6   | `sonner` + `sweetalert2` (web)                              | **Info**       | Keep both — distinct roles (toasts vs confirm dialogs). Optional future: drop `sweetalert2` for Radix `AlertDialog`.                                    |
| 7   | Per-workspace tooling (husky/prettier/etc.)                 | **Info**       | Acceptable; optionally hoist to root to avoid range drift.                                                                                              |

> **No code or dependency changes have been applied.** All items above are recommendations for a
> follow-up change, each gated on the "verify direct usage" checks called out in §3 and §4.
