# Rules — Backend Prisma (schema, migrations, queries, seeds)

> Read `../../AGENTS.md` first (loading order + the one rule: understand before
> you edit). Then `../../apps/api/CLAUDE.md` (the 100+ absolute rules — this file
> distills #15, #26, #30, #46). DB lives in `apps/api/prisma/`. These are **hard
> constraints**, not guidance. A schema change that ships without a migration is
> a broken production deploy; an `update`/`delete` without `tenantId` is a
> cross-tenant write; an unbounded pool is an outage.

Prisma 7 with the `@prisma/adapter-pg` driver adapter (`PrismaPg`) over
PostgreSQL. Client generation: `generator client { provider = "prisma-client-js" }`
(`schema.prisma:1`). Access is **repository-only** — services never import
`PrismaService` (CLAUDE.md #14a, see `./layering-rules.md`).

## 1. Every schema change ships a migration (CLAUDE.md #30)

Editing `apps/api/prisma/schema.prisma` without a matching migration in
`apps/api/prisma/migrations/` is a **review blocker**. Production runs
`prisma migrate deploy` (via `prisma:migrate:prod` → `start`/`start:prod` in
`apps/api/package.json:9,37`), which applies **migration files**, not the
schema. A model that exists only in `schema.prisma` is invisible to prod — every
query against it 500s on a missing table.

- Generate the migration locally with `pnpm prisma:migrate`
  (`prisma migrate dev`, `package.json:35`). For a hand-authored SQL file, derive
  the diff with `prisma migrate diff` (CLAUDE.md #30) — never guess the SQL.
- One directory per migration: `<timestamp>_<snake_description>/migration.sql`
  (e.g. `20260318_add_jobs_table/migration.sql`). Match the existing naming.
- Migration SQL uses the **snake_case DB names** (`@map`/`@@map` targets), not
  the Prisma camelCase field names: `"tenant_id"`, `"created_at"`,
  `CREATE TABLE "jobs"` (see `20260318_add_jobs_table/migration.sql`).
- New tables that need default rows → also update `prisma/seed.ts` (CLAUDE.md #30,
  §5 below).
- `pnpm typecheck` passes whether or not the migration exists — `tsc` only sees
  the generated client. The migration is **not** type-checked into existence;
  you must add it by hand.

## 2. Never edit an applied migration

Migrations are an append-only ledger. `migrate deploy` records each file's
checksum; changing an applied `migration.sql` makes deploy **fail with a
checksum mismatch** (or, worse, silently diverges environments).

- To change schema, **add a new migration**. Never rewrite history.
- A failed/partial migration is repaired forward, not by hand-editing — this repo
  ships `prisma:migrate:resolve`
  (`scripts/resolve-failed-migrations.mjs`, wired into `prisma:migrate:prod`,
  `package.json:36-37`). Use it; do not delete rows from `_prisma_migrations`.
- Permission inserts (and any data backfill) inside a migration must be
  **idempotent** so re-runs are safe — use the `WHERE NOT EXISTS` pattern, **not**
  `ON CONFLICT ("key")` (the unique key is the compound `(tenant_id, key)`, so
  single-column `ON CONFLICT` fails — CLAUDE.md #85, see `./tenant-permission-rules.md` §5).

## 3. `update()` / `delete()` MUST include `tenantId` in `where` (CLAUDE.md #26)

Never write by `id` alone on a tenant-owned model. The codebase pattern is
`updateMany`/`deleteMany` with a compound `where: { id, tenantId }`, which scopes
the write and returns `count: 0` (instead of throwing) when the row is in another
tenant:

```ts
await tx.case.updateMany({ where: { id, tenantId }, data: updateData })
// cases.repository.ts (see ./tenant-permission-rules.md §2)
```

- Reads too: every tenant-owned `findMany`/`findFirst` carries `tenantId` in
  `where`. A bare `findUnique({ where: { id } })` on a tenant-owned model is a
  blocker unless the row is genuinely global (e.g. a `User` by id, or a
  `permission_definitions` row with `tenant_id IS NULL`).
- Sub-resources validate **parent** tenant ownership before touching the child
  (CLAUDE.md #75): scope the child by `{ id, caseId }` _after_ the parent case is
  confirmed tenant-owned. Full rationale + the guard chain: `./tenant-permission-rules.md`.

## 4. Indexing — `@@index` on FK and filtered/sorted columns

Every column you filter, join, or sort on needs an index, or it becomes a seq
scan as the tenant's data grows. Index in `schema.prisma` (so it is captured by
the generated migration), never as a manual `CREATE INDEX` outside a migration.

- **Tenant-owned models lead with `tenantId`**: a compound `@@index([tenantId, ...])`
  serves the tenant-scoping `where` from §3 plus the common filter. The `alert`
  model is the template (`schema.prisma:818-822`):

  ```prisma
  @@index([tenantId])
  @@index([tenantId, severity])
  @@index([tenantId, status])
  @@index([tenantId, timestamp])
  ```

- **Every foreign key gets an index.** Postgres does **not** auto-index FK
  columns; an unindexed FK makes joins and cascade deletes slow
  (e.g. `@@index([caseId])`, `@@index([cycleId])`, `schema.prisma:878-880`).
- **Sortable columns**: any field exposed in a DTO's `sortBy` enum / `buildOrderBy`
  (CLAUDE.md #87) must be indexed — usually folded into a `[tenantId, <field>]`
  compound so the ordered scan stays tenant-local.
- Tenant-scoped uniqueness uses a compound `@@unique`, never a bare `@unique`
  on a tenant-owned field: `@@unique([tenantId, key])`,
  `@@unique([tenantId, externalId])` (`schema.prisma:571,817`). A bare `@unique`
  would collide across tenants and leak existence.

## 5. Seeds MUST be idempotent (CLAUDE.md #15)

`prisma db seed` runs on **every** `start`/`start:dev`/`start:prod`
(`package.json:9-12`). It must be safe to run repeatedly against a populated DB
and must never crash on duplicate data.

- Use `upsert` for single rows and `createMany({ ..., skipDuplicates: true })`
  for batches — both are used throughout `prisma/seed.ts`
  (`refreshTokenFamily.upsert` L131, `huntEvent.createMany({ skipDuplicates: true })`
  L1569, `aiAuditLog.createMany({ skipDuplicates: true })` L1846).
- Stable rows use **deterministic** ids so re-seeds target the same record, not a
  new one — `buildDeterministicUuid(seed)` (`seed.ts:103`). Never `randomUUID()`
  for a row you intend to upsert.
- **No fallback secrets in seeds** (CLAUDE.md #54). `SEED_DEFAULT_PASSWORD` is
  read via `requireEnv()` which throws if unset — no `??` default
  (`seed.ts:85-95`). Never reintroduce a hardcoded password.
- Seed reads `DATABASE_URL` from `process.env` through the same `PrismaPg`
  adapter (`seed.ts:82-83`); it fails loudly on an empty URL.

## 6. BigInt is serialized as a string (never raw in JSON)

`BigInt` columns exist in the schema: `aiUsageLedger.totalTokens`
(`schema.prisma:1487`), `fileSize` (`:1809`), `normalizationPipeline.processedCount`
(`:1908`). `JSON.stringify(1n)` **throws** `TypeError: Do not know how to
serialize a BigInt`, so a raw `BigInt` reaching a response body crashes the
request.

- **Map BigInt to a JSON-safe form in the utility/mapper layer before it leaves
  the repository.** Two grounded patterns in this repo:
  - Small counts from `$queryRaw` (which returns `bigint` for `COUNT`/`SUM`) are
    coerced with `Number(...)` when they cannot overflow `Number.MAX_SAFE_INTEGER`
    — `Number(usageRow?.total_tokens ?? 0)` and the surrounding aggregate map
    (`ai-ops-workspace.service.ts:216-238`).
  - For values that **can** exceed 2^53 (token totals, byte sizes, cumulative
    counters), serialize with `.toString()` and type the field as `string` in the
    DTO/response type. Never `Number()` a value that may overflow — that loses
    precision silently.
- Keep the conversion out of controllers and repositories: controllers only route
  (CLAUDE.md #14), repositories return raw Prisma results (CLAUDE.md #14b). The
  BigInt→string/number mapping is business logic → `<module>.utilities.ts`.
- Computations stay in `BigInt` until the boundary: increment as
  `BigInt(currentProcessedCount + result.outputCount)`
  (`jobs/handlers/normalization.handler.ts:65`), serialize only when returning.

## 7. Connection pool is configured — never unbounded (CLAUDE.md #46)

`PrismaService` appends `connection_limit` and `pool_timeout` to `DATABASE_URL`
and constructs the `PrismaPg` adapter with the pooled URL
(`apps/api/src/prisma/prisma.service.ts:16-23`). Defaults live in
`prisma.constants.ts`: `DEFAULT_CONNECTION_LIMIT = 20`,
`DEFAULT_POOL_TIMEOUT_SECONDS = 10`.

- **Never remove the pool params** or construct a `PrismaClient`/`PrismaPg`
  without them. An unbounded pool exhausts Postgres connections under load.
- Connect is retried with backoff (`connectWithRetry`, `MAX_RETRIES = 5`,
  `BASE_DELAY_MS = 2000`); `onModuleDestroy` calls `$disconnect`. Don't bypass the
  lifecycle by `new PrismaClient()`-ing elsewhere — inject `PrismaService` (into
  repositories only).
- `prisma.config.ts` applies the **same** `connection_limit=20&pool_timeout=10`
  for migrate/seed (`prisma.config.ts:11-12`), respecting an existing `?` in the
  URL.

## 8. `prisma.config.ts` reads `process.env` — `generate` must not require `DATABASE_URL`

`prisma generate` runs in `postinstall` (`package.json:40`) and again at the
start of `start*` scripts. It **does not connect**, so it must succeed on a fresh
clone / CI install / Docker build where `DATABASE_URL` is absent.

- `prisma.config.ts` reads the URL via `process.env['DATABASE_URL'] ?? ''`
  (`prisma.config.ts:1,10`) — **not** Prisma's `env("DATABASE_URL")` helper,
  which **throws** when the var is unset and would break `generate`. The empty
  string flows through to an empty pooled URL, which is fine for generate.
- This does **not** weaken runtime guarantees: the NestJS app validates
  `DATABASE_URL` at boot (`apps/api/src/config/env.validation.ts`; no fallback
  secrets — CLAUDE.md #24), and `migrate`/`seed` fail loudly on an empty URL.
- The `datasource db` block in `schema.prisma` has **no `url`**
  (`schema.prisma:6-8`) — the URL is supplied by `prisma.config.ts` (CLI) and the
  `PrismaPg` adapter (runtime). Don't add a hardcoded or `env()` url back into the
  schema.

## Checklist before you commit a Prisma change

- [ ] Schema change has a **new** migration dir in `apps/api/prisma/migrations/`
      (generated via `pnpm prisma:migrate` or `migrate diff`, not hand-guessed).
- [ ] No **existing** migration file was edited (append-only ledger).
- [ ] Every `update`/`delete` scopes by `{ id, tenantId }`
      (`updateMany`/`deleteMany`), never `id` alone; tenant-owned reads carry
      `tenantId`.
- [ ] New/changed model has `@@index` on every FK and on each filtered/sorted
      column, tenant-owned indexes lead with `tenantId`; tenant uniqueness is a
      compound `@@unique`.
- [ ] Seed additions use `upsert` / `createMany({ skipDuplicates: true })` with
      deterministic ids; no fallback secrets.
- [ ] BigInt fields are serialized to string (or `Number()` only when overflow is
      impossible) in the utility layer — never a raw BigInt in a response.
- [ ] Pool params (`connection_limit`/`pool_timeout`) untouched in
      `prisma.service.ts` and `prisma.config.ts`.
- [ ] `prisma generate` still reads the URL via `process.env` (no `env()` in
      config, no `url` in the `datasource` block).
- [ ] `pnpm typecheck` passes (blocking; `tsgo`/`typecheck:fast` advisory). No
      `any`, no `eslint-disable`. pnpm only, Node 22. Branch first — never work on
      `main`. Prove before deleting a model/field/migration.

## Related

- `../../apps/api/CLAUDE.md` — full rule list (#15, #26, #30, #46, #54, #85, #87).
- `./tenant-permission-rules.md` — tenant scoping + the `WHERE NOT EXISTS`
  permission-migration pattern.
- `./layering-rules.md` — repository-only Prisma access; services never import
  `PrismaService`.
- `./dto-validation-rules.md` — the Zod boundary that bounds inputs before they
  reach a query.
- `../../skills/backend/add-prisma-model.md` — step-by-step recipe (AGENTS.md §11).
- `../../docs/architecture/` — DB/architecture deep reference.
