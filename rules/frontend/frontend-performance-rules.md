# Frontend performance rules — RSC by default, light bundles, bounded polling

> **Read `AGENTS.md` first** (repo root) for the loading order and the one rule:
> _no AI agent may edit first and understand later._ Then `apps/web/CLAUDE.md`
> ("Next.js Specific Patterns", "Search, Filter & Pagination"). GOD MODE §14.1
> (frontend rendering) is the source; the evidence (real offenders FE-01,
> PERF-04, PERF-05) is in `docs/audit/security-performance-audit.md`. This file
> is the frontend depth behind `../global/performance-rules.md` §7.

`apps/web` is Next.js 16 / React 19 — a stack built around React Server
Components. The current posture **opts out of RSC almost everywhere** (PERF-04/
FE-01), which forfeits the framework's main performance lever. These rules pull
it back. Related: `component-rules.md` (`.tsx` render-only),
`hook-service-rules.md` (query/hook patterns), `../backend/prisma-rules.md` /
`../global/performance-rules.md` (bounded backend queries that feed the UI).

---

## 1. Server Components are the default — push `'use client'` to the leaves

- **Only add `'use client'` when the component uses hooks, events, or browser
  APIs** (`apps/web/CLAUDE.md` "Next.js Specific Patterns"). A page/layout that is
  pure markup stays a Server Component.
- **Known offender — PERF-04 / FE-01:** there are **507** `'use client'`
  directives across `apps/web/src`, and **59 of 61** page files are client
  components (`docs/audit/security-performance-audit.md` PERF-04). **Do not add to
  that count.** When you build/touch a page, keep the page shell server-rendered
  and push `'use client'` **down to the leaf** components that actually need
  interactivity.
- This composes with the rules elsewhere: a `.tsx` is render-only and its hook
  logic lives in `src/hooks/` (`component-rules.md` §1) — a small interactive leaf
  hook component is the right place for `'use client'`, not the whole page.

## 2. Keep client bundles small — dynamic-import heavy UI

- **Lazy-load heavy client-only UI** (charts/recharts, editors, big modals) with
  `next/dynamic` so it isn't in the initial bundle. Charts live in
  `src/components/charts/`; load them on demand where the page isn't chart-first.
- **Wrap third-party UI in `@/components/common` first** (e.g. `VirtualizedList`
  over raw `react-virtuoso`), which gives one place to code-split it
  (`apps/web/CLAUDE.md` rule 63; `../global/library-wrapper-rules.md`).
- **Barrel imports** keep the dep graph clean (`apps/web/CLAUDE.md` rule 29), but
  don't pull a heavy module into a server component just to re-export it.

## 3. Virtualize large lists

- **Use `VirtualizedList` from `@/components/common` for long lists** (alert/
  event streams, IOC tables) so the DOM stays bounded regardless of result size
  (`apps/web/CLAUDE.md` "New Common Components", rule 63). Tabular data uses
  `<DataTable>` (`component-rules.md` §2).

## 4. Server-driven search, filter, and pagination — never client-side

`apps/web/CLAUDE.md` "Search, Filter & Pagination" (MANDATORY):

- **Every search/filter/sort sends its value to the backend** as a query param —
  never filter or sort an array in the browser. The backend returns the bounded
  page (`../global/performance-rules.md` §1).
- **Debounce search inputs** (~400ms) — use the `useDebounce` hook or
  `useRef`+`setTimeout` — so keystrokes don't fire a request each.
- **Reset `currentPage` to 1 on any filter change.**
- **`placeholderData: keepPreviousData`** to avoid flicker while refetching.
- **Pass `isFetching` (not `isLoading`) to `<DataTable loading>`.**

## 5. Stable, complete query keys

- **The query key includes every filter/sort/page param** so react-query
  refetches exactly when inputs change and caches correctly
  (`apps/web/CLAUDE.md` "Search, Filter & Pagination" #6). Build keys from a
  single factory rather than scattering inline literals (the audit's FE-04 noted
  68 inline keys — `docs/audit/architecture-clean-code-audit.md` FE-04;
  `../global/clean-code-rules.md` §6). Unstable keys cause refetch storms or stale
  reads.

## 6. Polling stops in hidden tabs

- **Every polling query sets `refetchIntervalInBackground: false`** so a hidden/
  backgrounded tab stops hammering the API.
- **Known offender — PERF-05:** only `usePermissionSync.ts:30` sets it today;
  other polling hooks keep firing in the background
  (`docs/audit/security-performance-audit.md` PERF-05). Copy the
  `usePermissionSync` pattern on any hook with a `refetchInterval`.

## 7. Don't over-render

- **Derived values are computed in the hook (via `useMemo`), not in the `.tsx`**
  (`apps/web/CLAUDE.md` rule 60; `component-rules.md` §1) — components receive
  ready-to-render values, avoiding recompute on every render.
- **`react-hook-form`: use `useWatch({ control, name })`, never `watch()`**
  (`apps/web/CLAUDE.md` rule 23) — `watch()` re-renders the whole form on every
  keystroke and is React-Compiler-incompatible.
- Provide stable `key`s in lists (`react/jsx-key` is `error`) and stable callback
  identities where they gate memoized children.

---

## Self-check before you commit a frontend perf-sensitive change

- [ ] Page shell stays a Server Component; `'use client'` pushed to interactive
      leaves only (didn't grow the 59/61 client-page count).
- [ ] Heavy client UI dynamic-imported; long lists use `VirtualizedList`; tables
      use `<DataTable>`.
- [ ] Search/filter/sort is server-driven and debounced; page resets to 1 on
      filter change; `keepPreviousData`; `isFetching` → DataTable `loading`.
- [ ] Query keys are stable and include every param (from a factory, not inline).
- [ ] Every polling hook sets `refetchIntervalInBackground: false`.
- [ ] Derived state in the hook (`useMemo`); `useWatch` not `watch()`; stable
      `key`s.
- [ ] `pnpm typecheck` + `pnpm build` green (`../global/validation-gates.md`);
      branched first (`../global/branch-safety.md`).
