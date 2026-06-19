# Dependency Matrix

Inventory of key dependencies, why they exist, and upgrade posture. Full
per-package vuln status: `docs/audit/vulnerability-remediation.md`. Upgrade
policy: `rules/security/dependency-audit.md`. Generate an outdated report with
`pnpm audit:deps` (`pnpm -r outdated`).

> Rule: patch/minor security upgrades first; framework majors only via an ADR;
> remove a dependency only after proving it is unused; validate after risky
> batches. **pnpm is the only package manager** — no mixed lockfiles.

## Frontend (`apps/web`)

| Package                                   | Version           | Why                                     | Upgrade risk                                              |
| ----------------------------------------- | ----------------- | --------------------------------------- | --------------------------------------------------------- |
| `next`                                    | 16.2.9            | App Router framework + API proxy        | medium (framework major); patched for the HIGH advisories |
| `react` / `react-dom`                     | ^19.2             | UI runtime                              | medium (major)                                            |
| `typescript`                              | ^5.9              | types                                   | low                                                       |
| `tailwindcss`                             | ^4                | styling                                 | medium (v4 CSS-first)                                     |
| `@tanstack/react-query`                   | ^5.90             | server state                            | low                                                       |
| `zustand`                                 | ^5                | client state                            | low                                                       |
| `next-intl`                               | ^4.8              | i18n (6 locales)                        | low                                                       |
| `react-hook-form` + `@hookform/resolvers` | ^7.71 / ^5.2      | forms; **zod peer re-added** (ADR-0004) | low                                                       |
| `zod`                                     | ^4 (pinned 4.4.3) | schemas; web on Zod 4                   | medium                                                    |
| `vitest` / `@vitest/coverage-v8`          | ^2.1              | unit tests (dev)                        | **critical advisory** → plan vitest 3                     |
| `@playwright/test`                        | ^1.58             | e2e (dev)                               | low                                                       |
| `serwist`                                 | ^9.5              | PWA service worker                      | low                                                       |

## Backend (`apps/api`)

| Package                           | Version  | Why                                                     | Upgrade risk                       |
| --------------------------------- | -------- | ------------------------------------------------------- | ---------------------------------- |
| `@nestjs/*`                       | ^11      | framework                                               | medium (major)                     |
| `prisma` / `@prisma/client`       | ^7.6     | ORM                                                     | medium (major)                     |
| `express`                         | ^5       | HTTP (via Nest)                                         | medium                             |
| `ioredis`                         | ^5       | Redis                                                   | low                                |
| `zod`                             | ^3.23    | DTO validation; **api stays on Zod 3** (intentional)    | medium (3→4 later)                 |
| `jsonwebtoken` / `jwks-rsa`       | ^9 / ^4  | auth                                                    | low                                |
| `helmet`                          | ^8       | HTTP hardening                                          | low                                |
| `pino` / `nestjs-pino`            | ^10 / ^4 | logging                                                 | low                                |
| `@aws-sdk/client-bedrock-runtime` | ^3       | AI (Bedrock)                                            | low                                |
| `ws` / `form-data`                | ^8 / ^4  | **added by the monorepo migration** (were phantom deps) | low                                |
| `multer` (transitive)             | —        | file uploads                                            | **high advisory** → plan `>=2.2.0` |

## Known duplications to consolidate later

- `sweetalert2` vs `sonner` (web), `dayjs` vs `date-fns` (web), Zod 4 (web) vs
  Zod 3 (api). Tracked for a dedup PR — see `docs/ROADMAP.md`.

## Root tooling

`pnpm@10.30.3`, `turbo`, `typescript`, `@typescript/native-preview` (tsgo,
advisory — ADR-0005), `prettier` (+ `prettier-plugin-tailwindcss`), `husky`,
`lint-staged`, `@commitlint/*`.
