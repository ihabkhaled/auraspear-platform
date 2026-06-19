# DATABASE_CONTEXT.md — AuraSpear DB (`apps/api/prisma`)

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → `memory/*.md` → this `context/*.md`
> → `rules/**` → `skills/**` → `docs/**` → code + tests. This file is step 3 for
> any task that touches the schema, a migration, or the seed. Do **not** edit
> before you have read the rules and skills linked below — the one rule is _no AI
> agent may edit first and understand later._ A schema change that ships without a
> migration is a broken production deploy; an `update`/`delete` without `tenantId`
> is a cross-tenant write.

This is the **database orientation** file: where the schema/migrations/seed live,
the `tenantId` tenancy model (Prisma scoping + Postgres RLS defense-in-depth),
indexing, and idempotent seeding. The exhaustive, authoritative source for hard
constraints is [`../rules/backend/prisma-rules.md`](../rules/backend/prisma-rules.md)
(8 numbered rules + a pre-commit checklist) and the rule numbers it distills from
[`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) (#15, #26, #30, #46, #54, #85,
#87). For how the repository layer consumes the DB, see
[`./BACKEND_CONTEXT.md`](./BACKEND_CONTEXT.md).

---

## What this area is

`apps/api/prisma/` is the **single source of truth for the data model** of the
NestJS BFF (`apps/api`). Stack: **Prisma 7** with the `@prisma/adapter-pg` driver
adapter (`PrismaPg`) over **PostgreSQL**. The schema is large —
**84 models, 60 enums** (`grep -c '^model '` / `'^enum '` over `schema.prisma`) —
spanning alerts, cases, incidents, hunts, intel/IOC, connectors, SOAR, UEBA,
compliance/reports, jobs, and the AI subsystem (agents, findings, memory, chat,
FinOps, eval). Almost everything is **tenant-owned**: `tenantId` appears ~328
times in the schema.

Access is **repository-only**: services never import `PrismaService`; the
repository is the only Prisma boundary (CLAUDE.md #14a, see
[`../rules/backend/layering-rules.md`](../rules/backend/layering-rules.md)). The
`datasource db` block has **no `url`** (`schema.prisma:6-8`) — the connection URL
is supplied by `PrismaService` (runtime) and `prisma.config.ts` (CLI), both
appending `connection_limit=20&pool_timeout=10`. **pnpm only, Node 22.**

---

## Where files live

Everything lives under `apps/api/prisma/`:

```
apps/api/prisma/
├── schema.prisma        # the model — 84 models, 60 enums, 231 @@index, 36 @@unique
├── migrations/          # append-only ledger, <timestamp>_<snake_desc>/migration.sql
│   └── <…>/migration.sql
└── seed.ts              # idempotent seed (upsert / createMany skipDuplicates)
```

Supporting code (under `apps/api/src/`):

- `src/prisma/prisma.service.ts` — injectable `PrismaService extends PrismaClient`;
  builds the `PrismaPg` adapter with the pooled URL, retries connect with backoff
  (`MAX_RETRIES=5`), `$disconnect` on destroy. Pool defaults in
  `src/prisma/prisma.constants.ts` (`DEFAULT_CONNECTION_LIMIT=20`,
  `DEFAULT_POOL_TIMEOUT_SECONDS=10`).
- `apps/api/prisma.config.ts` — CLI config for `migrate`/`seed`/`generate`; reads
  the URL via `process.env['DATABASE_URL'] ?? ''` (**not** `env()`, which would
  throw and break `generate`), applying the same pool params.
- `src/common/middleware/rls.middleware.ts` + `src/common/utils/rls.utility.ts` —
  set the Postgres session variable `app.current_tenant_id` per request, which
  drives the **Row-Level Security** policies (see tenancy below).
- `src/config/env.validation.ts` — Zod env schema; validates `DATABASE_URL` at
  boot, rejects all-zero/placeholder secrets.

**Migration naming** is `<timestamp>_<snake_description>/migration.sql`
(e.g. `20260318_add_jobs_table`, `20260318_add_rls_policies`). SQL uses the
**snake_case DB names** (`@map`/`@@map` targets: `"tenant_id"`, `"created_at"`,
`CREATE TABLE "alerts"`), never the Prisma camelCase field names.

---

## The tenancy model (read this before any query change)

Tenant isolation is enforced at **three** layers — treat all three as load-bearing:

1. **Prisma `where` scoping (primary).** Every tenant-owned read carries
   `tenantId` in `where`; every `update`/`delete` uses a **compound**
   `where: { id, tenantId }` via `updateMany`/`deleteMany`, **never `id` alone**
   (CLAUDE.md #26). The `Alert` model is the index template
   (`schema.prisma:818-822`): `tenantId @map("tenant_id") @db.Uuid`, a
   `tenant Tenant @relation(... onDelete: Cascade)`, `@@unique([tenantId, externalId])`,
   and `@@index([tenantId])` + `@@index([tenantId, severity|status|timestamp|source])`.
2. **Postgres RLS (defense-in-depth).** `20260318_add_rls_policies/migration.sql`
   enables `ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` on `tenants` and
   tenant-scoped tables. Policies restrict rows to
   `tenant_id = current_setting('app.current_tenant_id', true)::uuid`. The RLS
   middleware sets that session var from the authenticated request. A
   `prisma_migration` role carries a `bypass_rls` policy for migrate/seed.
   **System-wide rows** (`tenant_id IS NULL`, e.g. `permission_definitions`
   defaults, `application_logs`) are matched by `tenant_id IS NULL OR …`.
3. **Tenant-scoped uniqueness.** Never a bare `@unique` on a tenant-owned field —
   use a compound `@@unique([tenantId, …])` (`@@unique([tenantId, externalId])`,
   `@@unique([tenantId, key])`). A bare `@unique` collides across tenants and
   leaks existence.

`Tenant` (`schema.prisma:487`, `@@map("tenants")`) is the hub: nearly every model
back-relates to it with `onDelete: Cascade`. GLOBAL_ADMIN tenant-switching is a
**guard/middleware** concern (the `X-Tenant-Id` override) — never add a role/tenant
check inside the schema, a repository, or a query builder.

---

## What rules apply (read before editing)

Always load `rules/global/*`, then the DB-specific hard constraints:

- [`../rules/backend/prisma-rules.md`](../rules/backend/prisma-rules.md) — the
  authoritative 8: (1) every schema change ships a migration; (2) never edit an
  applied migration (append-only ledger); (3) `update`/`delete` scope by
  `{ id, tenantId }`; (4) `@@index` on every FK and filtered/sorted column,
  tenant-owned leading with `tenantId`; (5) idempotent seeds; (6) BigInt
  serialized as string; (7) bounded connection pool; (8) `generate` must not
  require `DATABASE_URL`.
- [`../rules/backend/tenant-permission-rules.md`](../rules/backend/tenant-permission-rules.md) —
  tenant scoping + the `WHERE NOT EXISTS` permission-migration pattern (the unique
  key is compound `(tenant_id, key)`, so single-column `ON CONFLICT ("key")`
  fails — CLAUDE.md #85).
- [`../rules/backend/layering-rules.md`](../rules/backend/layering-rules.md) —
  repository-only Prisma access; services never import `PrismaService`.
- [`../rules/backend/dto-validation-rules.md`](../rules/backend/dto-validation-rules.md) —
  the Zod boundary (`.max()` on every string/array, JSON-field size caps) that
  bounds inputs before they reach a query.

Global: [`../rules/global/absolute-rules.md`](../rules/global/absolute-rules.md),
[`branch-safety.md`](../rules/global/branch-safety.md),
[`validation-gates.md`](../rules/global/validation-gates.md). Security:
[`../rules/security/secret-handling.md`](../rules/security/secret-handling.md)
(no fallback secrets — incl. `SEED_DEFAULT_PASSWORD`, CLAUDE.md #54).

**Invariants that govern every DB change (from [`../AGENTS.md`](../AGENTS.md) §6):**

- **Tenant isolation** — every tenant-owned `findMany`/`findFirst`/`update`/
  `delete` is scoped by `tenantId`; writes use compound `{ id, tenantId }`. No
  cross-tenant data, ever. RLS is a backstop, not a substitute for explicit
  scoping.
- **No secret/auth bypass** — `SEED_DEFAULT_PASSWORD` is read via `requireEnv()`
  with no `??` fallback (`seed.ts:85-95`); never reintroduce a hardcoded password.
  Connector credentials are AES-256-GCM encrypted at rest before storage.
- **No `any`**, no `eslint-disable`, no `@ts-ignore`. pnpm only, Node 22. Branch
  first — never edit on `main`. **Prove before removing** a model/field/migration
  (check repositories, seed, RLS migration, FKs).

---

## What skills apply (recipes for the work)

Match your task to a recipe in [`../skills/backend/`](../skills/backend/) (each
opens with "Read `AGENTS.md` first"):

- Add / change a model end-to-end (schema → migration → index → seed → repository)
  → [`add-prisma-model.md`](../skills/backend/add-prisma-model.md)
- Add a permission (includes the idempotent `WHERE NOT EXISTS` migration + seed
  step) → [`add-permission.md`](../skills/backend/add-permission.md)
- Add a connector type (new `ConnectorType` enum value + encrypted config) →
  [`add-connector.md`](../skills/backend/add-connector.md)
- Add a module that owns new tables →
  [`add-module.md`](../skills/backend/add-module.md)

Validate before shipping →
[`../skills/qa/validate-release.md`](../skills/qa/validate-release.md).

---

## What docs to read

- [`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) — **authoritative** backend rule
  list. Read #15, #26, #30, #46, #54, #85, #87 before any non-trivial DB change.
- [`./BACKEND_CONTEXT.md`](./BACKEND_CONTEXT.md) — how repositories consume the DB;
  the strict layering.
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) (+ `docs/architecture/`) —
  data flow, where the DB sits in the BFF.
- [`../docs/SECURITY.md`](../docs/SECURITY.md) (+ `docs/security/`) — tenant
  isolation, RLS, encryption at rest, audit logging.
- [`../memory/TECHNICAL_MEMORY.md`](../memory/TECHNICAL_MEMORY.md) and
  [`../memory/SECURITY_MEMORY.md`](../memory/SECURITY_MEMORY.md) — stable DB/tenancy
  truths; [`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md) for the
  full command list.

---

## Common mistakes

- **Schema change without a migration** — `pnpm typecheck` passes (`tsc` only sees
  the generated client), but prod runs `prisma migrate deploy` against migration
  **files**, so a model that exists only in `schema.prisma` 500s on a missing
  table. Generate the migration (`pnpm prisma:migrate`, or `prisma migrate diff`
  for hand-authored SQL — never guess the SQL). CLAUDE.md #30.
- **Editing an applied migration** — migrations are an append-only ledger;
  `migrate deploy` records a checksum, so changing applied SQL **fails with a
  checksum mismatch**. Add a _new_ migration; repair forward via
  `prisma:migrate:resolve`, never delete from `_prisma_migrations`.
- **`where: { id }` without `tenantId`** on a tenant-owned model — a cross-tenant
  read/write and a review blocker. Always `{ id, tenantId }`
  (`updateMany`/`deleteMany`). A bare `findUnique({ where: { id } })` is a blocker
  unless the row is genuinely global (a `User` by id, a `permission_definitions`
  row with `tenant_id IS NULL`). CLAUDE.md #26.
- **Bare `@unique` on a tenant-owned field** — collides across tenants. Use
  compound `@@unique([tenantId, …])`.
- **Missing index** — a column you filter/join/sort on without an index becomes a
  seq scan as the tenant grows. Add `@@index` _in `schema.prisma`_ (so the
  migration captures it), tenant-owned leading with `tenantId`; index **every** FK
  (Postgres does not auto-index FK columns); index every field in a DTO's `sortBy`
  enum (CLAUDE.md #87). Never a manual `CREATE INDEX` outside a migration.
- **Permission migration with `ON CONFLICT ("key")`** — the unique key is the
  compound `(tenant_id, key)`, so single-column `ON CONFLICT` fails. Use the
  idempotent `WHERE NOT EXISTS` pattern (CLAUDE.md #85).
- **Non-idempotent seed** — `prisma db seed` runs on **every** `start`/`start:dev`/
  `start:prod`. Use `upsert` / `createMany({ skipDuplicates: true })` with
  **deterministic** ids (`buildDeterministicUuid(seed)`, `seed.ts:103`), never
  `randomUUID()` for a row you intend to upsert. CLAUDE.md #15.
- **Fallback password in the seed** — `SEED_DEFAULT_PASSWORD` must stay a required
  env var (`requireEnv()`), no `??` default. CLAUDE.md #54.
- **Raw BigInt in a response** — `aiUsageLedger.totalTokens`, `fileSize`,
  `processedCount` are `BigInt`; `JSON.stringify(1n)` throws. Serialize to
  `string` (or `Number()` only when overflow past `2^53` is impossible) in the
  **utility layer**, not the controller or repository. CLAUDE.md (prisma-rules §6).
- **Touching the connection pool** — never remove `connection_limit`/`pool_timeout`
  from `prisma.service.ts`/`prisma.config.ts`, and never `new PrismaClient()`
  elsewhere; inject `PrismaService` (into repositories only). An unbounded pool is
  an outage. CLAUDE.md #46.
- **Putting `url`/`env()` back in the schema or config** — keep `datasource db`
  url-less and `prisma.config.ts` on `process.env[...]` so `prisma generate`
  succeeds on a fresh clone / CI / Docker build with no `DATABASE_URL`.

---

## Validation commands

Run from **repo root** (pnpm only, Node 22). Full list:
[`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
pnpm install            # install workspace deps (runs prisma generate in postinstall)
pnpm prisma:generate    # regenerate the Prisma client after a schema edit
pnpm prisma:migrate     # create + apply a dev migration (prisma migrate dev)
pnpm prisma:seed        # idempotent seed (requires SEED_DEFAULT_PASSWORD)
pnpm typecheck          # blocking gate (tsc --noEmit; sees the generated client only)
pnpm build              # blocking gate (includes nest build for apps/api)
pnpm lint               # advisory — run + annotate
pnpm validate           # typecheck + lint + format:check
```

Backend-scoped equivalents (`apps/api/package.json`): `npm run prisma:generate`,
`npm run prisma:migrate`, `npm run prisma:seed`, `npm run prisma:studio`. Prod
applies migrations via `prisma:migrate:prod`
(`prisma:migrate:resolve && prisma migrate deploy`), wired into `start`/`start:prod`.

**After a Prisma change, verify the [`prisma-rules.md`](../rules/backend/prisma-rules.md)
checklist:** a _new_ migration dir exists; no applied migration was edited; every
`update`/`delete` scopes by `{ id, tenantId }`; new/changed models index every FK
and sorted/filtered column (tenant-owned leading with `tenantId`); seed additions
are idempotent with deterministic ids and no fallback secrets; BigInt serialized;
pool params untouched; `pnpm typecheck` and `pnpm build` pass.

> **Never claim a gate is green without running it.** `pnpm typecheck` passing
> does **not** mean your migration exists — the migration is not type-checked into
> existence. Report exactly what passed, what failed, and any blocker — per
> [`../AGENTS.md`](../AGENTS.md) §5 and §13.
