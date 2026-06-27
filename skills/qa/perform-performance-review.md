# Skill: Perform a performance review (backend query shape + frontend rendering)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order §1, the one rule:
> _no AI agent may edit first and understand later_; §5 gates). The governing rule
> file is [`rules/global/performance-rules.md`](../../rules/global/performance-rules.md)
> (bounded queries, no N+1, no unbounded `Promise.all`, query-driven aggregations,
> indexed hot paths); the frontend depth is
> [`rules/frontend/frontend-performance-rules.md`](../../rules/frontend/frontend-performance-rules.md);
> the backend query patterns are [`rules/backend/prisma-rules.md`](../../rules/backend/prisma-rules.md).
> The **evidence baseline** — strengths and exact offenders with `file:line` — is
> [`docs/audit/security-performance-audit.md`](../../docs/audit/security-performance-audit.md)
> Part B (PERF-01 … PERF-05). This skill is **read-only** (it finds and reports; the
> fixes live in [`../frontend/fix-frontend-performance.md`](../frontend/fix-frontend-performance.md)
> and the backend skills). Sibling: [`skills/qa/perform-security-review.md`](perform-security-review.md),
> [`skills/qa/validate-release.md`](validate-release.md).
>
> AuraSpear is a multi-tenant SOC platform — a single tenant can hold millions of
> alerts/events. An unbounded query that is fine in a demo is a **DoS-class
> liability** at SOC scale (GOD MODE §14).

This recipe reviews a change (or a branch) for performance: on the backend
(unbounded `findMany`, N+1, unbounded `Promise.all`, in-memory aggregation, missing
indexes, scheduler scans) and on the frontend (needless client components, polling,
client-side filtering, bundles).

---

## When to use

Use this skill when a change touches a list/query path, a batch operation, a
scheduler/cron, a KPI/stats aggregation, a Prisma index, or a page's
rendering/data-fetching posture — and before merging in those areas. Also use it for
a periodic posture pass.

**Do not** use this skill for: _applying_ the frontend fix (→
[`../frontend/fix-frontend-performance.md`](../frontend/fix-frontend-performance.md));
a security review (→ [`perform-security-review.md`](perform-security-review.md)); a
maintainability split that does not change behavior (→
[`../backend/split-god-service.md`](../backend/split-god-service.md)).

---

## Files to inspect first

| Concern                                                     | Where to look                                                                                                                       |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **The audit baseline (PERF-01..05, strengths, file:line)**  | `docs/audit/security-performance-audit.md` Part B                                                                                   |
| Bounded-pagination pattern to compare against (copy this)   | `apps/api/src/modules/jobs/jobs.repository.ts:115-119` (`findMany({ skip, take })` + `count`)                                       |
| **PERF-01 (HIGH)** — unbounded N+1 in risk recalculation    | `apps/api/src/modules/entities/risk-scoring.service.ts:65-79`; `entities.repository.ts:102-104` (`findAllByTenant`, no take/select) |
| **PERF-02** — unbounded cross-tenant scheduler scans        | `apps/api/src/modules/jobs/job-scheduler.service.ts:63-66, 91-94`                                                                   |
| **PERF-03** — two unbounded entity-keyed `findMany`         | `ai-writeback.repository.ts:338-351` (`findingsByEntity`); `ai-handoff.service.ts:268-273` (`getFindingLinks`)                      |
| The `take: 5000` cap precedent (the pattern is understood)  | `ai-writeback.repository.ts:363-367` (`exportFindings`)                                                                             |
| **PERF-04** — frontend opts out of RSC (507 `'use client'`) | `apps/web/src/**` page shells; `frontend-performance-rules.md` §1                                                                   |
| **PERF-05** — polling fires in hidden tabs                  | `apps/web/src/hooks/usePermissionSync.ts:30` (the one correct one)                                                                  |
| Index discipline (231 indexes / 84 models — good baseline)  | `apps/api/prisma/schema.prisma` (composite `(tenantId, …)` indexes)                                                                 |

---

## Exact step-by-step review (each step: grep/read, then judge against the rule)

Run from repo root. For each item, find the evidence with `Grep`/`Read` and record
PASS / FINDING with `file:line`.

### 1. Every `findMany` on a tenant model is bounded — `take` is mandatory (rule §1; PERF-03)

No "fetch all rows then slice in JS". Find unbounded reads:

```bash
grep -rnE "findMany\(" apps/api/src --include="*.repository.ts" -A6 | grep -L "take"   # inspect hits without take nearby
```

Compare to the bounded `jobs.repository.ts:115-119`. Known PERF-03 sites:
`ai-writeback.repository.ts:338-351`, `ai-handoff.service.ts:268-273` (a `take: 500`
cap or pagination is the fix; `exportFindings` caps at 5000).

### 2. No N+1 (rule §2; PERF-01 HIGH)

No query inside a per-row loop/map — fetch related data in one query
(`include`/`in`-filter) or batch it. The canonical anti-pattern is
`risk-scoring.service.ts:65-79`: it loads **all** tenant entities unbounded
(`findAllByTenant`) then `Promise.all`s a per-entity relation query **and** a
per-entity update. Flag any new `await`/query inside `.map()`/`for` over a fetched
collection.

### 3. No unbounded `Promise.all` — chunk in 50s (rule §3)

DB batch operations chunk in 50s with `Promise.allSettled()` (rule 36); never fire
hundreds of concurrent Prisma ops (pool capped at 20, rule 46). Find unbounded fans:

```bash
grep -rnE "Promise\.all\(" apps/api/src --include="*.service.ts" -B3   # check the array is bounded, not a raw findMany result
```

### 4. Aggregations are query-driven, not in-memory (rule §4)

Counts/sums/group-bys use `count`/`groupBy`/`aggregate` scoped by `tenantId` — not
`findMany` + `.length`/`.reduce`. KPI/stats endpoints especially. Spot-check:

```bash
grep -rnE "\.length|\.reduce\(" apps/api/src --include="*.service.ts" -B4 | grep -i "findMany"   # findMany feeding a JS fold = finding
```

### 5. Scheduler/cron scans are bounded and tenant-aware (rule §5; PERF-02)

Scheduled work pages the scan and processes per-tenant in bounded chunks.
`job-scheduler.service.ts:63-66,91-94` runs global `findMany` across **all** tenants
with no `take` (the in-code TODOs already flag it). A `status`-only `where` can't use
the `(tenantId, status)` composite index — note any missing `@@index([status])`.

### 6. Hot paths are indexed (rule §6)

New filter/sort/join columns get a Prisma `@@index` with a migration. The baseline
is strong (231 `@@index` / 84 models, composite `(tenantId, <sortField>)` /
`(tenantId, status)` on hot tables) — verify a new sortable/filterable column was
added to the schema with an index, not left to a table scan.

### 7. Frontend (rule §7 + the FE file; PERF-04/05)

- **RSC:** page shells should be Server Components; `'use client'` belongs on
  interactive leaves. Count today is **507** directives / **59 of 61** pages client
  (PERF-04) — flag any new page that adds to it:

  ```bash
  grep -rln "'use client'" apps/web/src/app | grep "page.tsx" | wc -l
  ```

- **Polling:** every `refetchInterval` hook sets `refetchIntervalInBackground:
false` (PERF-05; only `usePermissionSync.ts:30` does today):

  ```bash
  grep -rn "refetchInterval" apps/web/src/hooks         # each should pair with refetchIntervalInBackground: false
  ```

- **Server-driven, debounced** search/filter/pagination with stable query keys;
  `VirtualizedList` for huge lists; heavy UI dynamic-imported
  (`frontend-performance-rules.md` §§2–5).

---

## Validation commands (real pnpm commands, from repo root)

This is a review — the deliverable is an evidence-backed finding list. Confirm the
change still passes the hard gates and inspect the build output:

```bash
pnpm --filter @auraspear/api prisma:generate
pnpm typecheck                              # HARD gate
pnpm build                                   # HARD gate (Next.js route/bundle sizes print here)
pnpm --filter @auraspear/api test            # if backend query shape changed
pnpm --filter @auraspear/web test:e2e        # if a page's rendering/data-fetching changed
```

**Never claim "performant" / "no regressions" without the grep/read evidence**
(`AGENTS.md` §5, §13). Quote the `file:line` for each finding and the rule it breaks.

---

## Common mistakes

- **`findMany` with no `take`** on a tenant model (rule §1; PERF-03) — at SOC scale
  this returns millions of rows.
- **A query inside `.map()`/`for`** over a fetched collection (N+1; PERF-01) — batch
  with one `include`/`in` query.
- **`Promise.all` over an unbounded array** (e.g. a raw `findMany` result) — chunk in
  50s with `Promise.allSettled` (rule §3).
- **Aggregating in JS** (`findMany` + `.length`/`.reduce`) instead of `count`/
  `groupBy`/`aggregate` (rule §4).
- **An unbounded, status-only scheduler scan** (PERF-02) without paging or an
  `@@index([status])`.
- **A new sortable/filterable column without a Prisma `@@index` + migration** (rule §6).
- **A new `'use client'` page shell** (grows the 59/61 count, PERF-04) or a polling
  hook missing `refetchIntervalInBackground: false` (PERF-05).
- **Client-side filtering/sorting** instead of server-driven (FE rules §4).
- **Calling the build output "fine" without reading the route/bundle sizes**, or
  claiming "no regression" without the grep evidence (`AGENTS.md` §13).

---

## Final checklist

- [ ] Read `AGENTS.md` §5, `performance-rules.md`, `frontend-performance-rules.md`,
      `prisma-rules.md`, and `security-performance-audit.md` Part B.
- [ ] **Backend:** every `findMany` on a tenant model has `take`; no N+1 (no query in
      a per-row loop); no unbounded `Promise.all` (chunked 50s / `allSettled`);
      aggregations query-driven; scheduler scans bounded + tenant-aware; new hot
      columns indexed with a migration.
- [ ] **Frontend:** no new `'use client'` page shell; polling hooks set
      `refetchIntervalInBackground: false`; search/filter server-driven + debounced
      with stable keys; huge lists virtualized; heavy UI dynamic-imported.
- [ ] Findings reported with `file:line` evidence and the rule each breaks (no "looks
      fast").
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ on the change under review (route/bundle
      output reviewed); relevant `test` / `test:e2e` run.
- [ ] Final response uses the `AGENTS.md` §13 report block (Green checks / Failed
      checks / Risks / Next steps).
