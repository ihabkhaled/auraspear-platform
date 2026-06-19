# TECHNICAL_MEMORY

Stable technical truths. Full detail in `docs/ARCHITECTURE.md` + `docs/architecture/`.

- **Monorepo**: pnpm 10 workspaces (`apps/*`, `packages/*`) + Turborepo
  (`turbo.json`). Single root `pnpm-lock.yaml`. **pnpm only** — no mixed lockfiles.
- **Runtime**: Node 22 LTS (`engines: node >=22 <25`).
- **Frontend** (`apps/web`): Next.js 16 (App Router), React 19, TypeScript 5.9,
  Tailwind 4, TanStack Query, Zustand, next-intl (6 locales), Vitest + Playwright,
  Serwist (PWA). Proxies to the API via `src/app/api` routes.
- **Backend** (`apps/api`): NestJS 11 on Express 5, Prisma 7 + PostgreSQL, Redis
  (ioredis), Zod DTOs, JWT/JWKS auth, Pino logging, Helmet, Socket.IO, AWS Bedrock.
  Strict layering: Controller → Service → Repository → Utilities. Jest tests.
- **Packages**: `shared` (contracts), `config` (presets), `ai` (dependency-free
  AI building blocks).
- **TypeScript**: `tsc --noEmit` is the **blocking** typecheck (`pnpm typecheck`);
  `tsgo` / `@typescript/native-preview` is the **advisory** fast path
  (`pnpm typecheck:fast`). See `docs/tools/TYPESCRIPT_AND_TSGO.md` + ADR.
- **Docker**: pnpm-workspace Dockerfiles in `apps/*` (root build context, Node 22,
  non-root, healthchecks); unified compose in `infra/docker` (base + dev/prod/
  infra/connectors). Prod keeps Postgres/Redis internal + Redis password.
- **CI** (`.github/workflows`): `ci` (typecheck+build hard gates; lint/test/format
  advisory), `security` (gitleaks + Trivy fs + pnpm audit), `codeql`,
  `dependency-review`, `docker` (matrix build, push on main/tags).
- **Known debt**: `lint:strict` not green (~46 pre-existing structural errors) —
  advisory in CI; api Docker image ~1.1 GB (prune later). See
  `docs/audit/02-risk-register.md`.
- Related: [[PROJECT_MEMORY]] [[COMMANDS_MEMORY]] [[DECISIONS_MEMORY]].
