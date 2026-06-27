# Skill: Fix frontend performance (`apps/web` — RSC, bundles, polling, pagination)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order §1, the one rule:
> _no AI agent may edit first and understand later_). The governing rule file is
> [`rules/frontend/frontend-performance-rules.md`](../../rules/frontend/frontend-performance-rules.md)
> (RSC-by-default, light bundles, bounded polling, server-driven pagination); its
> cross-cutting parent is [`rules/global/performance-rules.md`](../../rules/global/performance-rules.md).
> Related: [`rules/frontend/component-rules.md`](../../rules/frontend/component-rules.md)
> (`.tsx` render-only), [`rules/frontend/hook-service-rules.md`](../../rules/frontend/hook-service-rules.md).
> If the fix is also a structural cleanup, follow
> [`rules/global/refactor-workflow.md`](../../rules/global/refactor-workflow.md).
> Then read [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) — "Next.js Specific
> Patterns", "Search, Filter & Pagination", rules 60, 63 (all ESLint-context). The
> evidence and the exact offenders are in
> [`docs/audit/security-performance-audit.md`](../../docs/audit/security-performance-audit.md)
> Part B (PERF-04, PERF-05) and the architecture audit (FE-01).
>
> This is GOD MODE §14.1 (frontend rendering/efficiency). It is **not** a security
> change — but never trade a security/tenant/RBAC invariant for a faster render.

This recipe pulls `apps/web` (Next.js 16 / React 19) back toward its own rules: a
codebase that **opts out of React Server Components almost everywhere** (PERF-04:
**507** `'use client'` directives, **59 of 61** pages are client components) and
has **polling that fires in hidden tabs** (PERF-05: only `usePermissionSync.ts:30`
sets `refetchIntervalInBackground: false`).

---

## When to use

Use this skill when you need to make a page/component/hook faster: it loads slowly,
ships a heavy bundle, polls wastefully, filters client-side, or renders a huge list
without virtualization. Use it as a deliberate fix, not a "while I'm here" change —
PERF-04 in particular is **a sizeable incremental refactor; schedule it, don't
rush it** (audit fix note). For a read-only assessment first, run
[`../qa/perform-performance-review.md`](../qa/perform-performance-review.md).

**Do not** use this skill for:

- **Backend** query shape (N+1, unbounded `findMany`, scheduler scans) →
  [`../qa/perform-performance-review.md`](../qa/perform-performance-review.md) +
  the backend skills. The UI can only be as bounded as the API it calls.
- A pure **god-hook split** for maintainability → [`split-large-react-component.md`](split-large-react-component.md)
  (though pushing `'use client'` to the leaves often pairs with it).

---

## Files to inspect first

| Concern                                                   | File / location                                                                                                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| The one correct background-polling example (copy it)      | `apps/web/src/hooks/usePermissionSync.ts` (`refetchIntervalInBackground: false`)                                                                    |
| Polling hooks that need the fix                           | `apps/web/src/hooks/useDashboard.ts`, `useSystemHealth.ts`, `useUsersControl.ts`, `useNotifications.ts`, `useConnectors.ts`, `useAiOpsWorkspace.ts` |
| Page shells that are needlessly `'use client'`            | `apps/web/src/app/(portal)/<area>/page.tsx` (59/61 are client today)                                                                                |
| Virtualized list + table primitives (use, don't reinvent) | `apps/web/src/components/common` (`VirtualizedList`, `DataTable`)                                                                                   |
| Charts to dynamic-import                                  | `apps/web/src/components/charts/`                                                                                                                   |
| Debounce + server-driven pagination pattern               | `apps/web/src/hooks/useDebounce.ts`; any `use*Page` filters hook                                                                                    |
| The rules + audit                                         | `frontend-performance-rules.md`; `security-performance-audit.md` PERF-04/05                                                                         |

---

## Exact step-by-step implementation

Run from repo root. **pnpm only, Node 22.** Apply only the items relevant to the
surface you are fixing; each maps to a numbered rule in
`frontend-performance-rules.md`.

### 0. Branch first

```bash
git checkout -b perf/web-<area>
```

### 1. Remove needless `'use client'` — push it to the leaves (PERF-04 / FE-01)

`'use client'` belongs only on a component that uses hooks, events, or browser APIs
(`apps/web/CLAUDE.md` "Next.js Specific Patterns"; rule §1). For the page you touch:

- Keep the **page/layout shell a Server Component** (no `'use client'` at the top of
  `page.tsx`).
- Move the interactive part into a leaf component that owns the `'use client'`
  directive and the page-hook call. Because `.tsx` is render-only and all hook logic
  lives in `src/hooks/` (`component-rules.md`), the interactive leaf is the right
  home for the directive — not the whole page.
- **Do not add to the 507 count.** When in doubt, the shell stays server-rendered
  and only the smallest interactive subtree is a client component.

### 2. Bound polling to the foreground (PERF-05)

For every `useQuery` with a `refetchInterval`, add `refetchIntervalInBackground:
false` so hidden/backgrounded tabs stop hammering the API — copy the
`usePermissionSync.ts:30` pattern (rule §6):

```ts
useQuery({
  queryKey: ['dashboard', tenantId],
  queryFn: () => dashboardService.getOverview(),
  refetchInterval: 30_000,
  refetchIntervalInBackground: false, // PERF-05
})
```

Where several dashboard polls fan out, prefer **one consolidated query** or the
existing notifications WebSocket gateway over many independent intervals
(audit PERF-05 fix).

### 3. Dynamic-import heavy client-only UI (rule §2)

Lazy-load charts, editors, and big modals with `next/dynamic` so they are not in the
initial bundle. Charts live in `src/components/charts/`; wrap third-party UI in
`@/components/common` first (rule 63), then code-split there:

```ts
import dynamic from 'next/dynamic'
const MitreBarChart = dynamic(() => import('@/components/charts/MitreBarChart'), { ssr: false })
```

### 4. Virtualize long lists; use the table primitive (rule §3)

Long alert/event/IOC streams use `VirtualizedList` from `@/components/common` so the
DOM stays bounded; tabular data uses `<DataTable>` (never raw `<table>` — rule 4).
Never import `react-virtuoso` directly (rule 63).

### 5. Server-driven, debounced search / filter / pagination (rule §4)

Filtering, sorting, and pagination **must** be backend-driven — never filter or sort
an array in the browser (`apps/web/CLAUDE.md` "Search, Filter & Pagination",
MANDATORY). Verify the hook:

- sends every search/filter/sort value as a query param;
- debounces search ~400ms (`useDebounce`);
- resets `currentPage` to 1 on any filter change;
- uses `placeholderData: keepPreviousData`;
- passes **`isFetching`** (not `isLoading`) to `<DataTable loading>`;
- builds a **stable query key including every filter/sort/page param** (rule §5) —
  no scattered inline keys.

### 6. Stop over-rendering (rule §7)

- Compute derived values in the hook via `useMemo`, not in the `.tsx` (rule 60).
- With `react-hook-form`, use `useWatch({ control, name })`, never `watch()`
  (rule 23) — `watch()` re-renders the whole form per keystroke.
- Provide stable `key`s in lists (`react/jsx-key` is `error`).

---

## Validation commands (real pnpm commands, from repo root)

Run and read the output. **Never claim green without running it** (`AGENTS.md` §5).

```bash
pnpm typecheck                              # HARD gate (tsc --noEmit). Must pass.
pnpm build                                   # HARD gate; also where Next reports bundle/route output.
pnpm --filter @auraspear/web lint:strict     # --max-warnings 0 (rules 23, 60, 63, jsx-key)
pnpm --filter @auraspear/web format:check
pnpm --filter @auraspear/web test            # vitest
pnpm --filter @auraspear/web test:e2e        # Playwright states for the touched page (rule 48)
```

Inspect the production bundle/route output from `pnpm build` (server vs client
components, route sizes) to confirm a page shell moved back to server rendering.
Manual smoke: `pnpm dev:web`. Hard gates (`typecheck`, `build`) must pass; advisory
results reported.

---

## Common mistakes

- **Adding a new `'use client'` to a page shell** — you grow the 59/61 count the
  audit flags. The shell is a Server Component; push the directive to the leaf.
- **`ssr: false` dynamic import on something that should render on the server** —
  use it for genuinely client-only UI (charts/editors), not as a blanket fix.
- **Client-side filtering/sorting** of a fetched array — every filter must hit the
  backend (`apps/web/CLAUDE.md` "Search, Filter & Pagination").
- **Forgetting `refetchIntervalInBackground: false`** on a polling hook (PERF-05) —
  the tab keeps polling when hidden.
- **Unstable / incomplete query keys** (missing a filter param) → refetch storms or
  stale reads (rule §5).
- **Passing `isLoading` instead of `isFetching`** to `<DataTable loading>` → flicker.
- **`watch()` from react-hook-form** instead of `useWatch` (rule 23) → full-form
  re-render per keystroke.
- **Importing `react-virtuoso` / a chart lib directly** instead of the
  `@/components/common` wrapper (rule 63).
- **Computing derived state in the `.tsx`** instead of `useMemo` in the hook (rule 60).
- **Removing a security/tenant guard to "speed things up"** — never; this is an
  efficiency change only (`AGENTS.md` §6).
- **Claiming green without running `pnpm typecheck` / `pnpm build`** (`AGENTS.md` §13).

---

## Final checklist

- [ ] Read `AGENTS.md`, `frontend-performance-rules.md`, `apps/web/CLAUDE.md`
      ("Next.js Specific Patterns", "Search, Filter & Pagination"), and the PERF-04/05
      findings.
- [ ] Branched (`perf/web-<area>`), not on `main`.
- [ ] Page shell stays a Server Component; `'use client'` pushed to interactive
      leaves only (did not grow the 59/61 count).
- [ ] Heavy client UI dynamic-imported; long lists use `VirtualizedList`; tables use
      `<DataTable>`; third-party UI wrapped in `@/components/common`.
- [ ] Search/filter/sort server-driven + debounced; page resets to 1; `keepPreviousData`;
      `isFetching` → DataTable `loading`; query keys stable and complete.
- [ ] Every polling hook sets `refetchIntervalInBackground: false`.
- [ ] Derived state in `useMemo`; `useWatch` not `watch()`; stable `key`s.
- [ ] No `any` / `eslint-disable`; no security/tenant/RBAC invariant traded.
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ (ran them; bundle output reviewed);
      `lint:strict` / `format:check` / `test` / `test:e2e` run and reported.
- [ ] Final response uses the `AGENTS.md` §13 report block.
