# PERFORMANCE_MEMORY

Stable performance truths. AuraSpear is multi-tenant SOC scale — one tenant can
hold millions of alerts/events, so an unbounded query is a **DoS-class
liability**, not a demo nuisance. Authoritative rules:
`rules/global/performance-rules.md`; evidence: `docs/audit/security-performance-audit.md`
(§"Performance").

- **The data layer is well-indexed** — **231 `@@index` across 84 models**, with
  composite `(tenantId, …)` indexes on hot tables (e.g. `Alert`
  `@@index([tenantId, severity|status|timestamp|source])`, plus `Finding`, `Job`).
  FK and filter/sort columns are indexed. New filter/sort columns need a matching
  `@@index` (tenant-owned leading with `tenantId`) shipped in a migration
  (`apps/api` rules 30/87).
- **List endpoints use the bounded pair** —
  `const [data, total] = await Promise.all([repo.findMany({ skip, take }), repo.count(where)])`
  (canonical: `jobs.repository.ts`, `detection-rules.service.ts`). Server-driven
  pagination is the norm; **every `findMany` on a tenant model MUST have `take`**.
- **Key enforced query rules** — `findMany` bounded with `take`
  (audit rule 24); aggregations are **query-driven** (`count`/`groupBy`/
  `aggregate`, not `findMany` + `.length`); DB batch ops chunked in **50s** with
  `Promise.allSettled` (`apps/api` rule 36); index every FK + filtered/sorted
  field. No `await` in loops for independent ops (rule 71); pool capped at 20
  (rule 46).
- **Known hotspots (do not clone; do not regress)** —
  - **PERF-01 (High):** `entities/risk-scoring.service.ts`
    `recalculateAllRiskScores` — unbounded `findAllByTenant` + N+1
    `Promise.all` over per-entity relation lookups.
  - **PERF-02:** `jobs/job-scheduler.service.ts` — global cross-tenant
    `findMany` scans with no `take` (`scheduleDetectionRules`,
    `scheduleCorrelationRules`).
  - **PERF-03:** two entity-keyed AI write-back endpoints (`ai-handoff.service.ts`
    `getFindingLinks`, the by-entity path) return unbounded `findMany` (no `take`).
- **Frontend** — search/filter/sort is **server-driven and never client-side**
  (`apps/web/CLAUDE.md` "Search, Filter & Pagination"), debounced ~400ms with
  `placeholderData: keepPreviousData`. ~19 `refetchInterval` polling hooks exist;
  set `refetchIntervalInBackground: false` so hidden tabs stop firing (correct
  example: `usePermissionSync.ts`). `VirtualizedList` (`@/components/common`)
  exists for large lists; most pages are still client components (PERF-04 — do not
  add to that count).
- Related: [[KNOWN_PITFALLS_MEMORY]] [[TECHNICAL_MEMORY]] [[SECURITY_MEMORY]].
