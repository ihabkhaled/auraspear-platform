# Skill: Split a large React surface (`apps/web` — god page-hook → sub-hooks)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order §1, the one rule:
> _no AI agent may edit first and understand later_). This is a **refactor**, so
> read [`rules/global/refactor-workflow.md`](../../rules/global/refactor-workflow.md)
> end to end first. Then the targets:
> [`rules/global/clean-code-rules.md`](../../rules/global/clean-code-rules.md),
> [`rules/global/solid-rules.md`](../../rules/global/solid-rules.md). The frontend
> constraints you must keep: [`rules/frontend/component-rules.md`](../../rules/frontend/component-rules.md)
> (`.tsx` render-only), [`rules/frontend/hook-service-rules.md`](../../rules/frontend/hook-service-rules.md)
> (where hook logic lives, derived state in hooks),
> [`rules/frontend/frontend-performance-rules.md`](../../rules/frontend/frontend-performance-rules.md)
> (don't over-render). Then read [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) —
> the 63 ESLint-enforced ABSOLUTE RULES, especially **#13–#17, #60** and the audit
> rule **#29 "No page hook > 150 lines"**. Evidence:
> [`docs/audit/architecture-clean-code-audit.md`](../../docs/audit/architecture-clean-code-audit.md)
> (FE-02/FE-03 god hooks). Sibling recipes:
> [`skills/frontend/add-hook.md`](add-hook.md), [`skills/frontend/add-component.md`](add-component.md),
> [`skills/frontend/add-page.md`](add-page.md).
>
> **The real debt is in HOOKS, not components.** A 820-line `.tsx` that is a thin
> renderer is acceptable; a 648-line page-hook is the thing to split.

This recipe decomposes an oversized **page-level hook** into focused domain
sub-hooks composed by a thin parent hook — **preserving the exact return interface
the page consumes**, so the `.tsx` does not change. The pattern already exists in
the repo: **read `useKnowledgePage` + its three sub-hooks before writing anything.**

---

## When to use

Use this skill when a page-hook has grown past the **150-line** budget
(`apps/web/CLAUDE.md` audit rule #29) or mixes filters + CRUD + dialog state in one
file. The real offenders (`wc -l`, this branch):

| Hook                                        | Lines | Split into                                                      |
| ------------------------------------------- | ----- | --------------------------------------------------------------- |
| `apps/web/src/hooks/useAiConfigPage.ts`     | 648   | `…Filters` / `…Crud` / `…Dialogs` composed by `useAiConfigPage` |
| `apps/web/src/hooks/useTenantConfigPage.ts` | 565   | same shape                                                      |
| `apps/web/src/hooks/useAiFindingsPage.ts`   | 424   | candidate                                                       |
| `apps/web/src/hooks/useDashboardPage.ts`    | 418   | candidate                                                       |

**Do not** use this skill to split a large component file just for line count.
`ConnectorForm.tsx` (820 lines) is a render-only form composed of `@/components/ui`
fields — splitting it for size alone adds indirection without value. Split a `.tsx`
**only** if it secretly violates render-only rules (a hook call, a `useState`, a
declared `interface`/`enum`, a utility function inside it — rules 13–16, 60); in
that case the fix is to **move that logic into a hook / `src/lib`**, which is this
recipe (for the hook part) plus [`add-component.md`](add-component.md). For a brand
new hook use [`add-hook.md`](add-hook.md).

---

## Files to inspect first (the reference pattern — read all four)

The Knowledge page is the canonical god-hook split. Open these and mirror the shape:

| Role                                                 | File                                                                  |
| ---------------------------------------------------- | --------------------------------------------------------------------- |
| **Thin parent hook (composes + returns interface)**  | `apps/web/src/hooks/useKnowledgePage.ts`                              |
| Filters/query sub-hook (search, sort, page, columns) | `apps/web/src/hooks/useKnowledgePageFilters.ts`                       |
| Dialog/selection state sub-hook                      | `apps/web/src/hooks/useKnowledgePageDialogs.ts`                       |
| CRUD/mutations sub-hook (takes dialogs as arg)       | `apps/web/src/hooks/useKnowledgePageCrud.ts`                          |
| A second worked example (same split)                 | `apps/web/src/hooks/useAiAgentsPage.ts` + `…PageCrud/Dialogs/Filters` |
| The barrel you must keep exporting from              | `apps/web/src/hooks/index.ts`                                         |
| The page that consumes the hook (must NOT change)    | the matching `apps/web/src/app/(portal)/<area>/page.tsx`              |

**How `useKnowledgePage` composes (the contract to copy):** the parent hook calls
`useKnowledgePageFilters()`, `useKnowledgePageDialogs()`, and
`useKnowledgePageCrud(dialogs)`, then returns a **single flat object** combining
their fields (`t`, `data`, `columns`, `pagination`, `createOpen`, `handleCreate`,
`canCreate`, …). The page reads only that object — so the page file is untouched.

**Hard facts (ESLint-enforced — `apps/web/CLAUDE.md`):**

- `.tsx` is **render-only**: zero hook calls, zero `useState`/`useEffect`/
  `useMemo`, zero declared `interface`/`type`/`enum`, zero utility functions
  (rules 13–16). All logic lives in `src/hooks/`.
- **Derived state is computed in the hook via `useMemo`, not in `.tsx`** (rule 60;
  `frontend-performance-rules.md` §7).
- One hook per file, **barrel-exported from `src/hooks/index.ts`** (rule 14, 29).
- Types/interfaces → `src/types/`, enums → `src/enums/`, constants →
  `src/lib/constants/` — never inline in a hook file (rule 13, 17).
- `'use client'` stays at the top of hook files (they use React hooks).

---

## Exact step-by-step implementation

Run from repo root. **pnpm only, Node 22.** Prettier: no semicolons, single quotes,
width 100.

### 0. Branch first

```bash
git checkout -b refactor/web-split-<area>-page-hook
```

### 1. Read the god hook and group its concerns (freeze the return shape)

Open the target hook and the page that consumes it. **Write down the exact object
the hook returns** — that is the contract the `.tsx` depends on and it must be
identical after the split (`refactor-workflow.md` §1). Group every field/handler by
concern, matching the Knowledge split:

- **Filters** — `useTranslations`, the `useQuery` for the list, `searchQuery`,
  `sortBy`/`sortOrder`, `currentPage`, `columns`, pagination, `handleSearchChange`,
  `handleSort`, `handlePageChange` (debounced, server-driven —
  `frontend-performance-rules.md` §4).
- **Dialogs** — `createOpen`/`editOpen`, the selected/detail row, `openEditDialog`,
  `handleRowClick`.
- **Crud** — the `useMutation`s, `handleCreate`/`handleEdit`/`handleDelete`,
  `createLoading`/`editLoading`, the `canCreate`/`canEdit`/`canDelete` permission
  booleans (from `hasPermission()`).

### 2. Ensure the page's Playwright states exist (the safety net)

A page route has Playwright states (loaded / empty / error / responsive —
`apps/web/CLAUDE.md` rule 48). They are your behavior-preservation net for a
UI-state refactor (`refactor-workflow.md` §3). If they exist, you will re-run them;
if missing for the touched page, add them before refactoring.

### 3. Create the sub-hooks (mirror the Knowledge files)

Create one file per concern under `apps/web/src/hooks/`, moving the grouped logic
**verbatim** (same query keys, same mutations, same `invalidateQueries` with
`tenantId` — RBAC section of `apps/web/CLAUDE.md`):

```ts
// apps/web/src/hooks/useAiConfigPageFilters.ts
'use client'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
// ...services/types via barrels
export function useAiConfigPageFilters() {
  const t = useTranslations('aiConfig')
  // search/sort/page state, the list useQuery (keepPreviousData), derived columns via useMemo
  return {
    t,
    data,
    columns,
    isFetching,
    pagination,
    searchQuery,
    handleSearchChange,
    handleSort,
    handlePageChange /* ... */,
  }
}
```

```ts
// apps/web/src/hooks/useAiConfigPageDialogs.ts  → create/edit open state, selected row, openEditDialog, handleRowClick
// apps/web/src/hooks/useAiConfigPageCrud.ts     → takes the dialogs object as an arg, owns the mutations + canX booleans
```

Keep each sub-hook focused and well under 150 lines. **Move, don't rewrite** — same
behavior, re-run after each move (`refactor-workflow.md` §4).

### 4. Make the parent hook a thin composer (preserve the interface)

Rewrite the original page-hook to compose the sub-hooks and return the **same flat
object** as before — copy the `useKnowledgePage` shape exactly:

```ts
// apps/web/src/hooks/useAiConfigPage.ts
'use client'
import { useAiConfigPageCrud } from './useAiConfigPageCrud'
import { useAiConfigPageDialogs } from './useAiConfigPageDialogs'
import { useAiConfigPageFilters } from './useAiConfigPageFilters'

export function useAiConfigPage() {
  const filters = useAiConfigPageFilters()
  const dialogs = useAiConfigPageDialogs()
  const crud = useAiConfigPageCrud(dialogs)
  return {
    ...filters,
    ...dialogs,
    ...crud,
    // (or spell out fields explicitly, like useKnowledgePage, to keep the contract obvious)
  }
}
```

The page-hook keeps the **same name and export** so `src/hooks/index.ts` and the
page do not change.

### 5. Update the barrel; do NOT touch the page

Add the new sub-hooks to `apps/web/src/hooks/index.ts`. The page `.tsx` and the
parent hook's export name are unchanged — verify by **not** editing the page file.

### 6. Prove the deletion / re-point consumers

If the god hook was imported anywhere besides its page, grep and confirm those
imports still resolve (the parent name is unchanged, so they should):

```bash
grep -rn "useAiConfigPage" apps/web/src
```

---

## Validation commands (real pnpm commands, from repo root)

Run and read the output. **Never claim green without running it** (`AGENTS.md` §5).

```bash
pnpm typecheck                              # HARD gate (tsc --noEmit, monorepo). Must pass.
pnpm build                                   # HARD gate. Must pass.
pnpm --filter @auraspear/web lint:strict     # --max-warnings 0; rules 13–17, 29, 60 are error/advisory
pnpm --filter @auraspear/web format:check    # Prettier
pnpm --filter @auraspear/web test            # vitest — component/hook tests still green
```

If the touched page has Playwright coverage, re-run it (states unchanged):

```bash
pnpm --filter @auraspear/web test:e2e
```

Hard gates (`typecheck`, `build`) must pass; advisory failures are reported, not
hidden. `tsc` is the trusted typecheck.

---

## Common mistakes

- **Splitting a render-only `.tsx` for line count.** A long thin renderer
  (`ConnectorForm.tsx`) is fine. Split hooks (the real debt), or split a `.tsx`
  only to remove a logic violation — and then the logic goes into a hook/`src/lib`.
- **Changing the parent hook's return shape** so the page must change — the whole
  point is the page is untouched (`refactor-workflow.md` §1).
- **Rewriting instead of moving** — change behavior in the same step and you can't
  tell a refactor bug from a feature change.
- **Putting a hook call, `useState`, declared `interface`/`enum`, or a utility
  function back in the `.tsx`** (rules 13–16) — it stays in the hook.
- **Computing derived state in the `.tsx`** instead of `useMemo` in the hook
  (rule 60).
- **Dropping `tenantId` from a `useQuery`/`invalidateQueries` key** during the move
  (RBAC section) — tenant switches then read stale data.
- **Forgetting `keepPreviousData` / `isFetching` / 400ms debounce / page-reset-to-1**
  when moving the filters logic (`frontend-performance-rules.md` §4) — these are
  part of the behavior you must preserve.
- **`any` / `eslint-disable` / `@ts-ignore`** to absorb a type break (rules 1, 2, 12).
- **Not adding the sub-hooks to `src/hooks/index.ts`** (rule 29 barrel).
- **Claiming green without running `pnpm typecheck` / `pnpm build`** (`AGENTS.md` §13).

---

## Final checklist

- [ ] Read `AGENTS.md`, `refactor-workflow.md`, `apps/web/CLAUDE.md` (rules 13–17,
      29, 60), and the four `useKnowledgePage*` reference files.
- [ ] Branched (`refactor/web-split-<area>-page-hook`), not on `main`.
- [ ] Parent hook's return object written down and **frozen**; the page `.tsx` is
      not edited.
- [ ] Page Playwright states exist (added if missing) — behavior net in place.
- [ ] Concerns split into `…Filters` / `…Dialogs` / `…Crud` sub-hooks, each well
      under 150 lines, moved **verbatim** (same query keys / mutations / `canX`).
- [ ] Parent hook is a thin composer returning the identical interface; same export
      name; sub-hooks added to `src/hooks/index.ts`.
- [ ] No logic/hooks/declarations/utility functions in any `.tsx`; derived state in
      `useMemo`; `tenantId` in query/invalidate keys preserved.
- [ ] No `any` / `eslint-disable`.
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ (ran them); `lint:strict`,
      `format:check`, `test` (+ `test:e2e` if applicable) run and reported.
- [ ] Final response uses the `AGENTS.md` §13 report block.
