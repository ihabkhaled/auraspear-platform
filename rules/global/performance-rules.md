# Performance rules — bounded queries, no N+1, no unbounded fan-out

> **Read `AGENTS.md` first** (repo root) for the AI loading order. Then read the
> app's `CLAUDE.md`. This file consolidates the **cross-cutting** performance
> invariants for both stacks (GOD MODE §14: §14.1 frontend, §14.2 backend). The
> evidence — real good examples and real offenders — comes from
> `docs/audit/security-performance-audit.md` §"Performance". Where a rule maps to
> an enforced CLAUDE.md rule, that number is authoritative.

AuraSpear is a multi-tenant SOC platform: a single tenant can hold millions of
alerts/events. An unbounded query that is fine in a demo is a **DoS-class
liability** at SOC scale. These are hard constraints — a slow path that "works"
in dev is still wrong.

Related (deep dives): `../frontend/frontend-performance-rules.md` (RSC/bundle/
polling) and `../backend/prisma-rules.md` (query patterns). This file is the
shared invariants both inherit.

---

## 1. Every list query is bounded — `take` is mandatory

- **Every `findMany` on a tenant-owned model MUST have a `take`** (audit rule:
  "every `findMany` has `take`"). No "fetch all rows then slice in JS." The
  service decides the limit; the repository receives it (`../backend/layering-rules.md`).
- **Good example (copy this):** `apps/api/src/modules/jobs/jobs.repository.ts`
  (`:115-119`) — `findMany({ where: { tenantId, ... }, skip: (page - 1) * limit,
take: limit })`, paired with a `count`. Server-driven pagination, bounded.
- **Known offender — PERF-03:** two entity-keyed endpoints return unbounded
  `findMany` (no `take`). New code must not repeat this — add a bounded
  page/limit (`security-performance-audit.md` PERF-03).

## 2. No N+1 queries

- **Never query inside a per-row loop/map.** Fetch related data in one query
  (Prisma `include`/`in`-filter) or batch it; do not issue one query per entity.
- **Known offender — PERF-01 (High):** `apps/api/src/modules/entities/
risk-scoring.service.ts` (`recalculateAllRiskScores`, `:66-74`) loads **all**
  tenant entities via `findAllByTenant` (unbounded) and then `Promise.all`s a
  per-entity `findRelationsForEntity` — an unbounded `Promise.all` **and** an
  N+1, on `POST entities/recalculate-risk`. This is the canonical anti-pattern;
  do not clone it. Fix the shape: bound the entity set and fetch relations in a
  single batched query.

## 3. No unbounded `Promise.all` — chunk in 50s

- **Database batch operations MUST be chunked in 50s with
  `Promise.allSettled()`** — never fire hundreds of concurrent Prisma operations
  (`apps/api/CLAUDE.md` rule 36; `../backend/layering-rules.md` §3). A
  `Promise.all` over an unbounded array (PERF-01 above) saturates the connection
  pool (capped at 20 — rule 46) and can exhaust memory.
- **No `await` inside loops when operations are independent** — batch with
  `Promise.all`/`allSettled` (`no-await-in-loop`, warn — `apps/api/CLAUDE.md`
  rule 71). Exception: genuinely sequential-dependent scroll/pagination.

## 4. Aggregations are query-driven, not in-memory

- **Compute counts/sums/group-bys in the database** (`count`, `groupBy`,
  `aggregate`), not by loading rows and folding them in JS (audit rule:
  "query-driven aggregations"). KPI cards and stats endpoints must hit aggregate
  queries scoped by `tenantId`, not `findMany` + `.length`.

## 5. Scheduler/cron scans must be bounded and tenant-aware

- **Known offender — PERF-02:** `apps/api/src/modules/jobs/
job-scheduler.service.ts` runs global `findMany` scans across **all tenants**
  with no `take` (`scheduleDetectionRules` `:63`, `scheduleCorrelationRules`
  `:91`) and maps over the unbounded result. New scheduled work must page the
  scan and process per-tenant in bounded chunks
  (`security-performance-audit.md` PERF-02).

## 6. Index the hot paths

- **Add a Prisma `@@index` for every column you filter/sort/join on at scale**
  (audit rule: "index hot paths"). Tenant-scoped list endpoints sort and filter —
  the `(tenantId, <sortField>)` and `(tenantId, status)` access patterns need
  composite indexes. Schema changes ship a migration (`apps/api/CLAUDE.md`
  rule 30; `../backend/prisma-rules.md`; `../../skills/backend/add-prisma-model.md`).

## 7. Frontend performance (summary — see the FE file for depth)

- **Server Components are the default**; push `'use client'` to the leaves
  (PERF-04/FE-01: 59 of 61 pages are currently client components — do not add to
  that count). Dynamic-import heavy UI; use `VirtualizedList` for huge lists.
- **Polling hooks set `refetchIntervalInBackground: false`** so hidden tabs stop
  firing (PERF-05; the one correct example is `usePermissionSync.ts:30`).
- **Search/filter is server-driven and debounced** (~400ms), with stable query
  keys including every filter param, and `placeholderData: keepPreviousData`
  (`apps/web/CLAUDE.md` "Search, Filter & Pagination"). Never filter client-side.
  Full detail: `../frontend/frontend-performance-rules.md`.

---

## Self-check before you commit a data-path change

- [ ] Every `findMany` on a tenant model has a `take` (bounded page/limit).
- [ ] No query inside a per-row loop/map (no N+1); related data fetched in one
      batched query.
- [ ] No unbounded `Promise.all`; batches chunked in 50s with `Promise.allSettled`;
      no independent `await` in a loop.
- [ ] Counts/sums/group-bys computed in the DB, scoped by `tenantId`.
- [ ] Scheduler/cron scans are bounded and per-tenant.
- [ ] New filter/sort columns are indexed (`@@index`) with a migration.
- [ ] Frontend: no new needless client component; polling stops in background;
      search server-driven + debounced.
- [ ] Gates green (`validation-gates.md`); branched first (`branch-safety.md`).
