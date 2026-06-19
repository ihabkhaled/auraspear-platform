# Skill: Add a Prisma model (`apps/api/prisma/schema.prisma`)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order + the one rule: _no AI agent
> may edit first and understand later_; the security/tenant/AI/branch invariants in §6–§8).
> Then the backend rules — especially
> [`rules/backend/prisma-rules.md`](../../rules/backend/prisma-rules.md) (the hard
> constraints this recipe operationalizes),
> [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md),
> and [`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md)
> (repository-only Prisma access). Always-on:
> [`rules/global/absolute-rules.md`](../../rules/global/absolute-rules.md),
> [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md),
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md). Then
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — the ~100 ABSOLUTE RULES; this recipe
> implements **#15** (idempotent seeds), **#26** (`tenantId` in every write `where`),
> **#30** (every schema change ships a migration), **#46** (pool config), **#54** (no
> fallback seed secrets), **#85** (compound `(tenant_id, key)`). Sibling onboarding:
> [`skills/`](../), [`memory/`](../../memory/) (stable truths:
> [`PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md),
> [`TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md)),
> [`context/`](../../context/), [`docs/`](../../docs/) (DB reference:
> [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)).
>
> **Open the reference model below and copy it end-to-end before adapting. Do not invent
> field shapes or migration SQL.**

This recipe adds a new **tenant-owned** model to `apps/api/prisma/schema.prisma`, ships the
matching migration (without ever editing an applied one), wires the back-relation, updates
the seed if the table needs default rows, and exposes the model through a repository whose
every method takes `tenantId`. The stack is **Prisma 7** with the `@prisma/adapter-pg`
driver adapter (`PrismaPg`) over PostgreSQL; the `datasource db` block has **no `url`** —
the URL comes from `apps/api/prisma.config.ts` (CLI) and `PrismaService` (runtime). The
`Alert` model (`schema.prisma`, `model Alert`) is the canonical tenant-owned template;
the `20260318_add_jobs_table/migration.sql` is the canonical migration. Mirror both.

Placeholders: `<Model>` = PascalCase Prisma model (e.g. `Watchlist`), `<table>` = snake_case
DB table (e.g. `watchlists`), `<field>` = a column you filter/sort on.

---

## When to use

Use this skill when a new backend feature needs to **persist tenant-scoped data** in
Postgres — a new SOC resource table (`watchlists`, `runbooks`, `playbook_templates`), a
child table of an existing model, or new columns/indexes on an existing model. The output
is a schema change **plus** a migration **plus** (if needed) seed rows **plus** the
repository surface that reads/writes it with `tenantId` scoping.

**Do not** use this for:

- A whole new feature **module** (controller/service/endpoints) → that's
  [`add-module.md`](add-module.md); do this model step first (a repository with no model
  cannot compile, per its §1).
- A single new **endpoint** on an existing module → [`add-endpoint.md`](add-endpoint.md).
- A new **permission** the endpoints require → [`add-permission.md`](add-permission.md)
  (rule 85 — its migration uses the `WHERE NOT EXISTS` compound-key pattern, **not** a plain
  table create).
- A **global/platform** table with no tenant owner (e.g. `permission_definitions` with
  `tenant_id IS NULL`) — rare; most models here are tenant-owned. If yours genuinely is not,
  you still ship a migration and index FKs, but skip the `tenantId` column and tenant
  back-relation. Confirm with [`prisma-rules.md`](../../rules/backend/prisma-rules.md) §3
  before omitting `tenantId`.

---

## Files to inspect first (copy the closest one)

| Concern                                                                                                   | Reference                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical tenant-owned model (tenantId, `@db` types, `@@unique`, `@@index`, `@@map`, tenant relation)     | `apps/api/prisma/schema.prisma` → `model Alert`                                                                                                                         |
| Enum declaration style (lowercase DB values)                                                              | `apps/api/prisma/schema.prisma` → `enum AlertSeverity`, `enum ConnectorType`                                                                                            |
| Tenant back-relation list (the other end of the relation)                                                 | `apps/api/prisma/schema.prisma` → `model Tenant { … alerts Alert[] … }`                                                                                                 |
| Canonical migration SQL (CreateTable + CreateIndex + AddForeignKey ON DELETE CASCADE)                     | `apps/api/prisma/migrations/20260318_add_jobs_table/migration.sql`                                                                                                      |
| Migration naming / directory layout                                                                       | `apps/api/prisma/migrations/<timestamp>_<snake_description>/migration.sql`                                                                                              |
| Prisma client generator (binary targets) + empty `datasource` (no `url`)                                  | `apps/api/prisma/schema.prisma` (top 9 lines)                                                                                                                           |
| Migrate/seed datasource + pool params + `seed: ts-node prisma/seed.ts`                                    | `apps/api/prisma.config.ts`                                                                                                                                             |
| Runtime pool config (never touch)                                                                         | `apps/api/src/prisma/prisma.service.ts`, `…/prisma.constants.ts`                                                                                                        |
| Idempotent seed: `requireEnv`, `buildDeterministicUuid`, `upsert`, `createMany({ skipDuplicates: true })` | `apps/api/prisma/seed.ts` (`requireEnv` ~L85, `buildDeterministicUuid` ~L103, `alert.upsert` ~L1385, `huntEvent.createMany` ~L1569, `rolePermission.createMany` ~L6705) |
| Seed wiring (where per-tenant seed fns are invoked)                                                       | `apps/api/prisma/seed.ts` → `async function main()` ~L6737 and the `seedAlerts(tenantId, profile)` ~L7041 block                                                         |
| Repository pattern (every method takes `tenantId`, returns raw Prisma)                                    | `apps/api/src/modules/incidents/incidents.repository.ts`                                                                                                                |
| Tenant-scoped writes (`updateMany`/`deleteMany` with `{ id, tenantId }`)                                  | `apps/api/src/modules/cases/cases.repository.ts` (`tx.case.updateMany({ where: { id, tenantId } })` ~L285)                                                              |

**Hard facts (from [`prisma-rules.md`](../../rules/backend/prisma-rules.md) + CLAUDE.md):**

- Schema field names are **camelCase**; DB names are **snake_case** via `@map`/`@@map`. The
  **migration SQL uses the snake_case names** (`"tenant_id"`, `CREATE TABLE "<table>"`).
- `pnpm typecheck` passes even **without** a migration — `tsc` only sees the generated
  client. The migration is **not** type-checked into existence; you add it by hand (rule 30).
- `prisma db seed` runs on **every** `start`/`start:dev`/`start:prod`
  (`apps/api/package.json` `start*` → `prisma:migrate:prod` + `prisma:seed`), so seeds must
  be idempotent (rule 15) and must never crash on duplicate data.

---

## Exact step-by-step implementation

Run everything from **repo root**. **pnpm only, Node 22.** Match Prettier for any `.ts` you
touch (seed/repository): **no semicolons, single quotes, width 100** (`apps/api/.prettierrc`).
Prisma's own formatter handles `schema.prisma` (`pnpm --filter @auraspear/api exec prisma format`).

### 0. Branch (never work on `main`/`master`)

```bash
git checkout -b feat/api-<table>-model
```

### 1. Decide the shape before editing (the one rule)

Write down: model name, every field + DB type, which fields you **filter/sort/join** on
(those need indexes), tenant-scoped uniqueness (compound `@@unique`), and whether the table
needs default rows (→ seed). Reuse an existing enum from the schema (`AlertSeverity`,
`CaseStatus`, …) rather than a new one when the value set already exists; never use a raw
string column where an enum fits.

### 2. Add the model to `schema.prisma`

Add the `model <Model>` block near related models (the file is sectioned by `// ─── … ──`
comment banners — put it under the right section). **Copy `model Alert` and adapt.** Every
tenant-owned model MUST have:

```prisma
model Watchlist {
  id          String          @id @default(uuid()) @db.Uuid
  tenantId    String          @map("tenant_id") @db.Uuid

  name        String          @db.VarChar(255)
  description String?         @db.Text
  severity    AlertSeverity   @default(medium)            // reuse an existing enum
  entries     String[]        @default([]) @map("entries")
  metadata    Json?           @map("metadata")

  createdAt   DateTime        @default(now()) @map("created_at")
  updatedAt   DateTime        @updatedAt @map("updated_at")

  tenant      Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, name])        // tenant-scoped uniqueness — NEVER a bare @unique
  @@index([tenantId])               // serves the tenant-scoping where
  @@index([tenantId, severity])     // filter column, folded under tenantId
  @@index([tenantId, createdAt])    // sort column, folded under tenantId
  @@map("watchlists")
}
```

Rules to honor here (all from
[`prisma-rules.md`](../../rules/backend/prisma-rules.md) §4 and CLAUDE.md):

- **`tenantId` + tenant relation with `onDelete: Cascade`** — matches `model Alert`. The
  cascade FK is what lets a tenant delete remove its rows.
- **`@@index([tenantId])`** always, plus a compound `@@index([tenantId, <field>])` for
  **every** column you filter or sort on (any field that will appear in a DTO `sortBy` enum /
  `buildOrderBy`, rule 87, must be indexed). Postgres does **not** auto-index FK columns —
  index every FK explicitly (`@@index([<fkId>])`).
- **Tenant-scoped uniqueness is a compound `@@unique([tenantId, <field>])`** (like
  `Alert`'s `@@unique([tenantId, externalId])`) — a bare `@unique` collides across tenants
  and leaks existence.
- Pick correct `@db` types (`@db.Uuid`, `@db.VarChar(n)`, `@db.Text`, `Json`, `String[]`)
  matching neighbors; arrays/JSON get sane defaults.
- A **new enum** goes in the `// ─── Enums ───` section with lowercase DB values
  (`enum WatchlistKind { ip domain hash }`) — only if no existing enum fits.

### 3. Add the back-relation on `Tenant`

In `model Tenant`, add the plural back-reference alongside `alerts Alert[]`,
`cases Case[]`, `incidents Incident[]`, …:

```prisma
  watchlists  Watchlist[]
```

Without this the relation is one-sided and `pnpm prisma:generate` errors.

### 4. Generate the migration — never hand-guess SQL, never edit an applied one

**Preferred (local DB available):** `prisma migrate dev` creates the migration dir **and**
applies it:

```bash
pnpm --filter @auraspear/api exec prisma migrate dev --name add_<table>_table
```

This writes `apps/api/prisma/migrations/<timestamp>_add_<table>_table/migration.sql` and
regenerates the client. Inspect the generated SQL — it must look like
`20260318_add_jobs_table/migration.sql`: `CREATE TABLE "watchlists" (…)`, the `CREATE INDEX`
/ `CREATE UNIQUE INDEX` lines, and the `ALTER TABLE … ADD CONSTRAINT … FOREIGN KEY
("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE`.

**No-DB fallback (hand-authored file):** derive the SQL with `prisma migrate diff` (CLAUDE.md
rule 30) — **do not write SQL from memory**:

```bash
mkdir -p apps/api/prisma/migrations/$(date +%Y%m%d%H%M%S)_add_<table>_table
pnpm --filter @auraspear/api exec prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel  prisma/schema.prisma \
  --script > apps/api/prisma/migrations/<timestamp>_add_<table>_table/migration.sql
```

Then review the file against the `jobs` reference (snake_case names, FK `ON DELETE CASCADE`,
all indexes present).

**Invariants (rule 30, [`prisma-rules.md`](../../rules/backend/prisma-rules.md) §1–§2):**

- **One directory per migration**, `<timestamp>_<snake_description>/migration.sql`, matching
  the existing naming. A schema change with **no** migration is a review blocker — prod runs
  `prisma migrate deploy` (via `prisma:migrate:prod`), which applies migration **files**, not
  the schema, so a model that lives only in `schema.prisma` 500s on a missing table in prod.
- **NEVER edit an already-applied `migration.sql`.** Migrations are an append-only ledger;
  `migrate deploy` records each file's checksum and **fails on a checksum mismatch**. To
  change schema, add a **new** migration. Repair a failed migration forward via
  `pnpm --filter @auraspear/api prisma:migrate:resolve`
  (`scripts/resolve-failed-migrations.mjs`) — never hand-delete from `_prisma_migrations`.
- Any data backfill inside a migration must be **idempotent** (`WHERE NOT EXISTS`), and for
  permission rows specifically **not** `ON CONFLICT ("key")` — the unique key is the compound
  `(tenant_id, key)` (rule 85).

### 5. Regenerate the Prisma client

If you used the no-DB diff path (or to be safe):

```bash
pnpm --filter @auraspear/api prisma:generate
```

Now `@prisma/client` exposes `Watchlist`, `Prisma.WatchlistWhereInput`, etc.

### 6. Update the seed **only if the table needs default rows** (rule 15)

If the new table needs demo/default data, add an idempotent seed function and wire it in.
Mirror the existing seeders in `apps/api/prisma/seed.ts`. **Idempotency is mandatory** — the
seeder runs on every `start*`:

- Single rows → `prisma.watchlist.upsert({ where: { id }, create: …, update: … })`
  (pattern: `alert.upsert` ~L1385). Batches → `prisma.watchlist.createMany({ data, skipDuplicates: true })`
  (pattern: `huntEvent.createMany({ skipDuplicates: true })` ~L1569).
- Use **deterministic ids** so re-seeds target the same row:
  `buildDeterministicUuid(\`watchlist:${tenantId}:${slug}\`)`(~L103) — **never**`randomUUID()` for an upserted row.
- **No fallback secrets** (rule 54): read any secret via `requireEnv(...)` (~L85), which
  throws if unset. Never reintroduce a `??` default password.
- Wire a per-tenant `seedWatchlists(tenantId, profile)` call into the per-tenant block in
  `main()` next to `seedAlerts(tenantId, profile)` (~L7041). The seed uses its own `PrismaPg`
  adapter over `process.env['DATABASE_URL']` (~L82) — don't `new PrismaClient()` without it.

If the table genuinely needs **no** default rows, skip this step (and say so in your final
report) — but most demo-facing SOC tables get seeded so the UI has data.

### 7. Expose it through a repository (every method takes `tenantId`)

Prisma is accessed **only** from the repository layer — services never import `PrismaService`
([`layering-rules.md`](../../rules/backend/layering-rules.md); CLAUDE.md #14a). Add methods to
the owning module's `*.repository.ts` (or create the module via [`add-module.md`](add-module.md)).
Mirror `incidents.repository.ts` / `cases.repository.ts`:

```ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { Prisma, Watchlist } from '@prisma/client'

@Injectable()
export class WatchlistsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyAndCount(params: {
    where: Prisma.WatchlistWhereInput
    orderBy: Prisma.WatchlistOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<[Watchlist[], number]> {
    return Promise.all([
      this.prisma.watchlist.findMany(params),
      this.prisma.watchlist.count({ where: params.where }),
    ])
  }

  async findOne(id: string, tenantId: string): Promise<Watchlist | null> {
    return this.prisma.watchlist.findFirst({ where: { id, tenantId } })
  }

  async update(
    id: string,
    tenantId: string,
    data: Prisma.WatchlistUpdateInput
  ): Promise<Prisma.BatchPayload> {
    return this.prisma.watchlist.updateMany({ where: { id, tenantId }, data })
  }

  async delete(id: string, tenantId: string): Promise<Prisma.BatchPayload> {
    return this.prisma.watchlist.deleteMany({ where: { id, tenantId } })
  }
}
```

**Tenant isolation (rule 26, AGENTS.md §6):**

- **Every method takes `tenantId`** (rule 14b). The `where` of every `findMany`/`findFirst`
  carries `tenantId`; the caller's utility `where`-builder injects it (see
  [`add-module.md`](add-module.md) §7).
- **Every `update()`/`delete()` is scoped by `{ id, tenantId }`** — the repo uses
  `updateMany`/`deleteMany` so a cross-tenant id returns `count: 0` instead of throwing
  (pattern: `cases.repository.ts` ~L285). **Never** write/read a tenant-owned row by `id`
  alone — that is a cross-tenant breach and a security-review block.
- Repositories are **pure data access**: no conditionals, no `throw`/`BusinessException`, no
  transforms (rule 14b). Batch ops chunk in 50s with `Promise.allSettled()` (rule 36).
- `BigInt` columns never leave the repo raw — map to `string` (or `Number()` only when
  overflow is impossible) in `<module>.utilities.ts` ([`prisma-rules.md`](../../rules/backend/prisma-rules.md) §6).

### 8. Apply locally and sanity-check the table

```bash
pnpm --filter @auraspear/api prisma:migrate         # prisma migrate dev — applies pending
pnpm --filter @auraspear/api prisma:seed            # idempotent; safe to re-run
pnpm --filter @auraspear/api prisma:studio          # optional: eyeball the table + rows
```

---

## Validation commands (real pnpm commands, from repo root)

Run in order. **Never claim a gate green without running it** (AGENTS.md §5,
[`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)).

```bash
pnpm install                                      # if deps changed (usually not)
pnpm --filter @auraspear/api exec prisma validate # schema is syntactically/semantically valid
pnpm --filter @auraspear/api exec prisma format   # canonical schema formatting
pnpm --filter @auraspear/api prisma:generate      # regenerate client for the new model
pnpm --filter @auraspear/api prisma:migrate       # apply the new migration locally (migrate dev)
pnpm --filter @auraspear/api prisma:seed          # re-run seed — MUST be idempotent (no crash)
pnpm typecheck                                    # HARD GATE (turbo → api tsc --noEmit). Must pass.
pnpm --filter @auraspear/api lint:strict          # ESLint --max-warnings 0 (repo touches: seed/repository)
pnpm --filter @auraspear/api format:check         # Prettier (no semicolons, single quotes, width 100)
pnpm --filter @auraspear/api test                 # jest — repository/utility specs
pnpm build                                        # HARD GATE (turbo → nest build). Must pass.
```

Full pre-PR sweep:

```bash
pnpm validate                                     # turbo typecheck + lint:strict + format:check
```

> **Hard gates that MUST be green:** `pnpm typecheck`, `pnpm build`. `lint:strict` /
> `format:check` / `test` are advisory-but-expected (tracked debt is non-blocking, but you
> must run them and report results). **`pnpm typecheck` passing does NOT prove the migration
> exists** — `tsc` only sees the generated client; verify the migration directory is present
> and applied (`prisma:migrate`). See AGENTS.md §5 +
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md).

---

## Docs to update

- Note the new table/columns in [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) (data
  model section) and, if product-significant, [`docs/PRODUCT.md`](../../docs/PRODUCT.md);
  cross-check [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md).
- If the model backs new endpoints, document them in [`docs/API.md`](../../docs/API.md) (done
  as part of [`add-module.md`](add-module.md)/[`add-endpoint.md`](add-endpoint.md)).
- A notable data-model decision (new enum, denormalization, cascade choice) → add an ADR
  under [`docs/decisions/`](../../docs/decisions/).
- Record durable conventions in
  [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md).

---

## Security checks (must hold — AGENTS.md §6/§7)

- **Tenant isolation**: the model has `tenantId` + a `Tenant` relation with
  `onDelete: Cascade`; **every** repository read carries `tenantId`, and **every
  `update()`/`delete()` includes `tenantId` in the `where`** (`{ id, tenantId }`, rule 26).
  No method can return or mutate another tenant's row. Sub-resource (child-table) access
  validates **parent** tenant ownership first (rule 75).
- **RBAC**: the model itself has no guard, but every endpoint that exposes it carries
  `@RequirePermission(Permission.MODULE_ACTION)` (rule 25) — wire that in
  [`add-endpoint.md`](add-endpoint.md)/[`add-module.md`](add-module.md). Reuse a fitting
  `Permission.*` or add one end-to-end via [`add-permission.md`](add-permission.md) (rule 85;
  migration uses `WHERE NOT EXISTS`, **not** `ON CONFLICT ("key")`).
- **No auth/secret/permission bypass**: seed reads any secret via `requireEnv` (rule 54) — no
  hardcoded/fallback passwords; no `NODE_ENV`-gated shortcuts; no client-forwarded
  tenant/role headers (rule 76) — `tenantId` always comes from the validated JWT via
  `@TenantId()`.
- **Pool & config untouched**: do not remove `connection_limit`/`pool_timeout` from
  `prisma.service.ts` or `prisma.config.ts` (rule 46); do not add a hardcoded or `env()`
  `url` back into the `datasource db` block (it must stay empty —
  [`prisma-rules.md`](../../rules/backend/prisma-rules.md) §8).
- **AI / destructive actions**: if AI logic writes to this model as a destructive
  security/infra action, it must persist an `ApprovalRequest` first (rule 97, AGENTS.md §7) —
  AI may suggest, not silently execute. **Never render raw AI output as HTML** anywhere this
  data flows to the UI.
- Touching auth/RBAC/data-exposure surfaces? Run a security scan per
  [`skills/devsecops/`](../devsecops/) (`run-security-scan.md`, AGENTS.md §11) and the scan
  commands in [`AGENTS.md`](../../AGENTS.md) §4 (`pnpm audit:security`, `pnpm scan:secrets`).

---

## Common mistakes

- **Editing schema but shipping no migration** → prod `migrate deploy` has no table; every
  query 500s. `pnpm typecheck` will still pass and hide this (rule 30).
- **Editing an already-applied `migration.sql`** → checksum mismatch; `migrate deploy` fails.
  Add a **new** migration; never rewrite the ledger (rule 30, §2).
- **Hand-writing migration SQL from memory** → drift from the schema. Use
  `prisma migrate dev` or `prisma migrate diff --script` (rule 30).
- **Migration SQL using camelCase names** → it must use the snake_case `@map`/`@@map`
  targets (`"tenant_id"`, `"created_at"`, `CREATE TABLE "watchlists"`).
- **Missing `tenantId` / tenant relation / `onDelete: Cascade`** on a tenant-owned model →
  cross-tenant data and orphaned rows on tenant delete.
- **Bare `@unique` on a tenant-owned field** instead of compound `@@unique([tenantId, …])` →
  cross-tenant collisions + existence leak (§4).
- **No `@@index([tenantId, …])` on filtered/sorted columns, or an unindexed FK** → seq scans
  as tenant data grows; a `sortBy` field not indexed (rule 87).
- **Forgetting the `Tenant` back-relation** → `prisma generate` errors (one-sided relation).
- **`update()`/`delete()` by `id` alone** (no `tenantId`) → tenant-isolation breach (rule 26).
- **Importing `PrismaService` into a service** → architecture violation; Prisma is
  repository-only (rule 14a).
- **Non-idempotent seed** (`create` instead of `upsert`/`skipDuplicates`, or `randomUUID()`
  for upserted rows) → seed crashes on the second `start` (rule 15).
- **Fallback secret in the seed** (`?? 'Admin@123'`) → publicly-known credentials (rule 54).
- **Raw `BigInt` in a response** → `JSON.stringify` throws; map to string in the utility
  layer (§6 of prisma-rules).
- **Removing pool params or adding a `url` to the `datasource` block** → unbounded pool /
  broken `generate` (rules 46, §8).
- **Claiming gates passed without running them**, or saying "typecheck is green so the
  migration exists" (it does not — `tsc` ignores migrations) (AGENTS.md §13).

---

## Final checklist

- [ ] Branch created (`feat/api-<table>-model`), not on `main`/`master`.
- [ ] `model <Model>` added to `schema.prisma` with `tenantId @db.Uuid`, a `Tenant` relation
      `onDelete: Cascade`, correct `@db` types, `@@map("<table>")`, and field `@map`s.
- [ ] `@@index([tenantId])` + a compound `@@index([tenantId, <field>])` for **every**
      filtered/sorted column; **every FK indexed**; tenant uniqueness is a compound
      `@@unique([tenantId, …])` (no bare `@unique`).
- [ ] Back-relation added on `model Tenant` (`<plural> <Model>[]`).
- [ ] New migration dir `apps/api/prisma/migrations/<timestamp>_add_<table>_table/migration.sql`
      generated via `prisma migrate dev` or `migrate diff --script` (snake_case names, FK
      `ON DELETE CASCADE`, all indexes present). **No existing migration edited.**
- [ ] `pnpm --filter @auraspear/api prisma:generate` run; client exposes the model.
- [ ] Seed updated **iff** the table needs default rows — idempotent (`upsert` /
      `createMany({ skipDuplicates: true })`), deterministic ids, no fallback secrets, wired
      into `main()`; **or** explicitly N/A and reported.
- [ ] Repository methods added: **every method takes `tenantId`**; `update`/`delete` scoped
      by `{ id, tenantId }` via `updateMany`/`deleteMany`; pure data access (no `throw`).
- [ ] `prisma validate`, `prisma:migrate`, `prisma:seed` (re-run, no crash) all succeed locally.
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ (hard gates — actually run); migration directory
      verified present (typecheck does **not** prove this).
- [ ] `lint:strict`, `format:check`, `test` run on touched files; results reported.
- [ ] Security: tenant-scoped column + cascade, no `id`-alone writes, no fallback seed secret,
      pool/`datasource` config untouched, RBAC/approval handled at the endpoint layer.
- [ ] Docs updated where relevant (`docs/ARCHITECTURE.md` / ADR /
      `memory/TECHNICAL_MEMORY.md`).
- [ ] Final response uses the AGENTS.md §13 template; no "all green" unless every required
      gate actually passed; do not claim the migration exists from a green typecheck alone.
