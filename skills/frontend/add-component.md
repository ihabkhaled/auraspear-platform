# Skill — Add a frontend component (`apps/web/src/components`)

> **Read `AGENTS.md` (repo root) FIRST.** The one rule: _no AI agent may edit
> first and understand later._ Follow the loading order in `AGENTS.md` §1, then
> load these in order before you touch a file:
>
> 1. `AGENTS.md` (repo root) — invariants, command map, validation gates
> 2. `apps/web/CLAUDE.md` — the 63 enforced frontend rules + full ESLint/TS config
> 3. `rules/frontend/component-rules.md` — `.tsx` is render-only (hard constraints)
> 4. `rules/frontend/i18n-rules.md`, `rules/frontend/ai-ui-rules.md` (if AI)
> 5. `context/` (the area you're building), `docs/` (deep reference)
> 6. Sibling recipes: `skills/frontend/add-page.md`, `skills/frontend/add-ai-panel.md`
> 7. `memory/` for stable truths the repo expects you to already know
>
> Where this recipe and `apps/web/CLAUDE.md` disagree, **the CLAUDE.md rule
> number wins** — it is authoritative and ESLint-enforced.

This recipe adds a **render-only, presentational** component under
`apps/web/src/components/` — typed props in, JSX out. No data fetching, no
hooks, no business logic. If you need a component that owns state or fetches
data, that logic lives in a hook (`src/hooks/`) and a service (`src/services/`);
this recipe only covers the rendering surface. For a full page, use
`skills/frontend/add-page.md`. For an AI panel, use
`skills/frontend/add-ai-panel.md` (extra AI-safety steps apply).

---

## When to use

Use this recipe when you need a **new reusable visual component** that:

- renders props it is given (a badge, card, header row, empty state, banner,
  status pill, summary block, etc.), and
- has **no** `useState`/`useEffect`/`useQuery`/`useTranslations` or any other
  hook call inside the `.tsx`, and
- composes existing `@/components/ui` (shadcn) + `@/components/common` pieces.

**Decide where it goes:**

| Scope of the component                                                | Directory                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Reused across modules (badge, card, header, empty state)              | `apps/web/src/components/common/` (barrel: `index.ts`)                   |
| shadcn/ui base primitive (rare — usually generated, not hand-written) | `apps/web/src/components/ui/`                                            |
| Belongs to one domain only (alert row, case sidebar, hunt panel)      | `apps/web/src/components/<domain>/` (e.g. `alerts/`, `cases/`, `hunt/`)  |
| Structured AI output block (risk gauge, IOC table, MITRE map)         | `apps/web/src/components/ai-renderer/` — **use the add-ai-panel recipe** |

**Do NOT use this recipe** to build a custom version of something that already
exists. `DataTable`, `PageHeader`, `Toast`, `SweetAlertDialog`, `SearchInput`,
`CollapsibleSection`, `KpiCard`, `EmptyState`, `LoadingSpinner`,
`AiConnectorSelect`, `AiResultCard`, `VirtualizedList` already exist in
`@/components/common`. Compose them; never reimplement them
(`rules/frontend/component-rules.md` §2).

---

## Files to inspect first

Read these before writing anything — they are your templates and your guardrails:

- **`apps/web/CLAUDE.md`** — rules 1–63, "Components — MUST USE", "Styling
  Rules", "Dark Mode Colors", "Import Rules", "i18n". This is the contract.
- **`rules/frontend/component-rules.md`** — the render-only constraints and the
  "Quick gate" checklist.
- **Two real components to copy the shape of:**
  - `apps/web/src/components/common/KpiCard.tsx` — `'use client'`, barrel UI
    import (`@/components/ui`), `cn()` from `@/lib/utils`, props typed via
    `import type { KPICardProps } from '@/types'`, semantic status classes
    (`text-status-success` / `text-status-error`).
  - `apps/web/src/components/common/SeverityBadge.tsx` — uses `Badge` from
    `@/components/ui`, severity classes via `lookup()` + constants from
    `@/lib/constants`, no inline literals.
- **`apps/web/src/types/common.types.ts`** — where prop interfaces live
  (`KPICardProps`, `SeverityBadgeProps`, `CollapsibleSectionProps`,
  `SearchInputProps` are the examples to mirror). Barrel: `apps/web/src/types/index.ts`.
- **`apps/web/src/components/common/index.ts`** — the barrel you must add your
  export to (one `export { Name } from './Name'` line).
- **`apps/web/src/components/ui/index.ts`** — confirm which shadcn primitives are
  already exported (`Button`, `Badge`, `Card`, `Input`, `Select`, `Textarea`,
  `Dialog`, …) so you import from the barrel, not a subpath.
- **`apps/web/src/app/globals.css`** — the `@theme inline` CSS variables and the
  `status-*` / `severity-*` semantic classes you must use for color.
- **`apps/web/src/enums/index.ts`** — for any status/severity/category value
  your props accept (never a raw string union).
- **`apps/web/src/i18n/en.json`** (+ `ar.json`, `es.json`, `fr.json`, `de.json`,
  `it.json`) — if your component renders any fallback/default text. Render-only
  components should take text as props from the parent's `t()`; only add i18n
  keys if the component itself renders literal copy.

---

## Exact step-by-step implementation

Example below: a reusable `common` component `InfoBanner` (an inline status
banner). Adapt names to your case. **All file paths are absolute from repo
root.**

### 1. Define the prop type in `src/types/` — never inline in the `.tsx`

`apps/web/CLAUDE.md` rule 13 bans `interface`/`type` declarations in `.tsx`
files (ESLint `no-restricted-syntax` on `TSInterfaceDeclaration`). Add the prop
interface to the matching domain file (e.g. `common.types.ts`):

```ts
// apps/web/src/types/common.types.ts (append; keep file alphabetical-ish by area)
import type { ReactNode } from 'react'
import type { StatusVariant } from '@/enums'

export interface InfoBannerProps {
  variant: StatusVariant // enum, NOT a 'info' | 'warning' string union (rule 17)
  message: string // the parent passes t('...') — banner does not call t()
  icon?: ReactNode
  onDismiss?: () => void
  className?: string
}
```

If `StatusVariant` (or whatever enum you need) does not exist, create it in
`apps/web/src/enums/<domain>.enum.ts` and barrel-export it from
`apps/web/src/enums/index.ts` (rule 17 — string literal unions must be enums).

Ensure the type is reachable from the `@/types` barrel — `common.types.ts` is
already re-exported by `apps/web/src/types/index.ts`; a brand-new types file must
be added to that barrel.

### 2. Create the component file — render-only, PascalCase, no consecutive caps

Path: `apps/web/src/components/common/InfoBanner.tsx`
(filename rule 25 / `unicorn/filename-case`: `InfoBanner.tsx`, not
`INFOBanner.tsx`; `KpiCard.tsx`, not `KPICard.tsx`).

```tsx
'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui'
import { STATUS_BG_CLASSES, STATUS_BORDER_CLASSES, STATUS_TEXT_CLASSES } from '@/lib/constants'
import { cn, lookup } from '@/lib/utils'
import type { InfoBannerProps } from '@/types'

export function InfoBanner({ variant, message, icon, onDismiss, className }: InfoBannerProps) {
  const textClass = lookup(STATUS_TEXT_CLASSES, variant) ?? 'text-status-info'
  const bgClass = lookup(STATUS_BG_CLASSES, variant) ?? 'bg-status-info'
  const borderClass = lookup(STATUS_BORDER_CLASSES, variant) ?? 'border-status-info'

  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-2 rounded-lg border p-2.5',
        textClass,
        bgClass,
        borderClass,
        className
      )}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <p className="text-xs font-medium">{message}</p>
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="ms-auto h-6 w-6"
          onClick={onDismiss}
          aria-label={message}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
```

Rules enforced by this file (each is ESLint `error`-level unless noted):

- **`'use client'`** only because it renders interactive JSX / takes an
  `onClick`. A purely static presentational component can stay a Server Component
  (omit the directive) — see "Server Components are the default" in
  `apps/web/CLAUDE.md` Architecture.
- **Barrel imports only** (rule 29): `@/components/ui`, never
  `@/components/ui/button`. Value imports before `import type` (rule 24), no
  blank lines between import groups (rule 26), `@/lib/*` alphabetical (rule 28).
- **Zero hooks, zero declarations, zero pure functions in the `.tsx`** (rules
  13–16, 60). The `lookup()` calls are the only logic allowed — and even derived
  values should ideally come pre-computed from a parent hook (rule 60). Keep it
  trivial or move it out.
- **`lookup()` from `@/lib/utils`** for `Record`/constant-map access — never
  `OBJ[variable]` bracket access (rule 22, `security/detect-object-injection`).
- **Semantic color classes only** (rule 3): `text-status-*` / `bg-status-*` /
  `border-status-*` / `text-severity-*`. Never `text-red-*`, `bg-white`,
  `text-gray-*`, or any `dark:*` variant (rules in "Styling Rules" / "Dark Mode
  Colors"). Dark mode is automatic via CSS variables — **no `isDark`
  conditionals for color.**
- **RTL-safe logical properties**: `ms-auto`, not `ml-auto`; `ps-3`/`pe-3`,
  `text-start`/`text-end` — never `left`/`right`/`pl-`/`mr-` ("i18n", RTL is
  built-in for `ar`).
- **No raw HTML form/data elements** (rules 4, 11): use `Button` from
  `@/components/ui`, never `<button>`/`<input>`/`<select>`/`<textarea>`/`<table>`.
  `<table>` → `<DataTable>` from `@/components/common`.
- **a11y is `error`-level**: the icon `Button` has an `aria-label`; if you render
  an `<img>` it needs `alt`; only valid ARIA props/roles; no positive `tabindex`.
- **Text comes from props** (`message`), which the parent produced via `t()`
  (rule 9). The component does not hardcode user-facing strings.

### 3. Responsive, dark, RTL — bake them into the classes

- **Responsive**: build mobile-up with Tailwind breakpoints (`sm:`, `md:`,
  `lg:`). Don't hardcode pixel widths; prefer flex/grid + `gap-*`.
- **Dark**: nothing to do — `text-foreground`, `bg-card`, `border-border`,
  `text-muted-foreground`, and the `status-*`/`severity-*` classes already adapt
  via the `.dark` CSS variables in `globals.css`.
- **RTL**: only logical properties (`start`/`end`). Verify by reading the JSX —
  if you typed `left`/`right`/`pl-`/`pr-`/`ml-`/`mr-`, fix it.

### 4. Register the component in the barrel

Add one line to `apps/web/src/components/common/index.ts` (rule 29 — consumers
import from the barrel, never the file):

```ts
export { InfoBanner } from './InfoBanner'
```

For a domain component, create/extend `apps/web/src/components/<domain>/index.ts`
the same way. Consumers then write `import { InfoBanner } from '@/components/common'`.

### 5. Add i18n keys ONLY if the component renders its own literal copy

A render-only component should receive all visible text as props. If it must
render fixed copy (e.g. a default empty message), add the key to **all 6 locale
files** — `apps/web/src/i18n/{en,ar,es,fr,de,it}.json` — namespaced by module
(rule 9 + "Translation Rules"). Never leave a key in only `en.json`; missing
locales break the build for `ar`/`de`/etc. Prefer passing text in as a prop to
avoid this entirely.

---

## Validation commands (run from repo root — pnpm only, Node 22)

Run these and read the output. **Never claim a gate is green without running
it** (`AGENTS.md` §5, §13).

```bash
# Blocking gate (must pass) — full TS type check across the monorepo
pnpm typecheck

# Lint the web app (component-rules.md / ESLint error-level rules)
pnpm lint
# or zero-tolerance:
pnpm lint:strict

# Formatting (Prettier, also auto-sorts Tailwind classes)
pnpm format:check     # check only
pnpm format           # auto-fix

# Combined gate the repo uses
pnpm validate         # turbo typecheck + lint:strict + format:check

# See the component render (manual): start the web app and view it in a page
pnpm dev:web
```

Per `AGENTS.md` §5: **`pnpm typecheck` and `pnpm build` are the hard gates.**
`pnpm lint` / `format:check` / `pnpm test` are advisory today (tracked debt) but
your component must still pass them — `react/no-danger`, `no-explicit-any`,
`no-restricted-syntax`, and the barrel/import rules are all `error`-level and
will block the pre-commit hook (`.husky/pre-commit` runs `next lint` + `tsc
--noEmit` + Prettier on staged files).

If the component is used on a **page route**, that route needs a Playwright test
(loaded / empty / error / responsive) — `apps/web/CLAUDE.md` rule 48,
`pnpm test:e2e`. A standalone presentational component does not by itself require
one, but the page that mounts it does.

---

## Docs to update

Only touch docs when the change is real and load-bearing:

- **`apps/web/CLAUDE.md`** — if the component is a new reusable `common`
  building block, add a row to the "New Common Components" table (Component /
  Import / Purpose), mirroring `AiResultCard`, `CollapsibleSection`,
  `SearchInput`, `VirtualizedList`.
- **`apps/web/src/components/common/index.ts`** — the barrel (done in step 4;
  this _is_ the public surface).
- **`apps/web/src/types/index.ts`** — ensure the prop type is exported via the
  `@/types` barrel (add the new `*.types.ts` file if you created one).
- **i18n files** — only if you added keys (step 5): all 6 locales.
- If the component changes a documented pattern, note it where that pattern
  lives (`docs/` index: `docs/DOCS_INDEX.md`). Don't invent new doc files.

---

## Security checks

These are platform invariants (`AGENTS.md` §6–§7); a violation is a blocker:

- **Never render raw AI output (or any untrusted string) as HTML.**
  `react/no-danger` is `error` — **no `dangerouslySetInnerHTML`** anywhere
  (rules 36, 43; `AGENTS.md` §7). Render as plain text or markdown via a safe
  renderer. Structured AI blocks must use `src/components/ai-renderer/` (rule 53)
  — that's the `add-ai-panel` recipe, not this one.
- **No raw inter-agent AI JSON** rendered to users — transform to
  human-readable first (rule 58).
- **Components never call AI services or fetch data directly** — all AI calls go
  through `src/hooks/useAi*.ts` (rule 41). A presentational component receives
  ready data via props.
- **No secrets/tokens in component code or props**, and never log them
  (`apps/web/CLAUDE.md` Security rule 39). Don't store AI responses in
  `localStorage` (rule 46).
- **Tenant isolation / RBAC** are enforced server-side and in hooks/proxies, not
  in render-only components — but never add a client-side bypass, a hardcoded
  permission, or a "dev mode" shortcut. Permission-gated UI uses `RoleGuard` /
  the permission hooks, not ad-hoc checks in the component.
- **Links**: external `target="_blank"` requires `rel="noopener noreferrer"`
  (`react/jsx-no-target-blank`, `error`).
- **No `eval`/`new Function`/`javascript:` URLs**, no dynamic `new RegExp()` with
  non-literal args (security ESLint rules, `error`/`warn`).

## Common mistakes

- **Putting a hook call in the `.tsx`.** `useState`/`useTranslations`/
  `useRouter`/store hooks are all banned in component files (rules 14, 16). Move
  every hook into `src/hooks/` and pass results in as props.
- **Declaring the prop `interface`/`type`/`enum` inline** in the `.tsx`
  (rule 13). It must live in `src/types/` / `src/enums/`.
- **Deep-importing** `@/components/ui/button` instead of `@/components/ui`
  (rule 29). Same for `@/components/common`, `@/hooks`, `@/services`, `@/stores`.
- **Static Tailwind colors**: `text-red-500`, `bg-white`, `text-gray-400`,
  `border-gray-200`, or any `dark:bg-*` (rule 3 + "Forbidden Color Classes").
  Use `text-status-error`, `bg-card`, `text-muted-foreground`, `border-border`.
- **Physical direction classes** (`ml-`, `pr-`, `left-0`, `text-left`) — breaks
  RTL/Arabic. Use logical (`ms-`, `pe-`, `start-0`, `text-start`).
- **Raw HTML elements**: `<button>`, `<input>`, `<select>`, `<textarea>`,
  `<table>` (rules 4, 11) — use the shadcn/`common` equivalents.
- **String literal unions / raw status strings** (`'info' | 'warning'`,
  `'active'`) instead of an enum from `@/enums` (rule 17).
- **`e.target.value`** in an event handler — React 19 types it as `EventTarget`.
  Use `e.currentTarget.value` (rule 37).
- **`obj[variable]` bracket access** on a constant map — use `lookup()` from
  `@/lib/utils` (rule 22).
- **Hardcoded user-facing text** instead of a `t()`-sourced prop (rule 9).
- **`any`** anywhere (rule 1) — use `unknown`/generics/`ReactNode`.
- **`// eslint-disable` / `@ts-ignore` / `@ts-expect-error`** to silence a rule
  (rule 2) — fix the root cause; these are absolute, zero-exception bans.
- **Filename with consecutive caps** (`APIBadge.tsx`) — PascalCase, no run of
  uppercase (rule 25).
- **Forgetting the barrel export** — the component is unreachable from
  `@/components/common` until you add the `index.ts` line.

## Final checklist

Before you say done (mirrors `rules/frontend/component-rules.md` "Quick gate"):

- [ ] Read `AGENTS.md`, `apps/web/CLAUDE.md`, `rules/frontend/component-rules.md`.
- [ ] Component lives in the right dir (`common/` vs `<domain>/` vs `ui/`),
      PascalCase filename with no consecutive caps.
- [ ] `.tsx` is render-only: **zero** hook calls, **zero** `type`/`interface`/
      `enum`/`const`-constant declarations, **zero** inline util/pure functions.
- [ ] Prop type lives in `src/types/` and is reachable via the `@/types` barrel;
      no `any`; status/category values are enums from `@/enums`, not string unions.
- [ ] Composes `@/components/ui` (shadcn) + `@/components/common`; no raw
      `<input>`/`<select>`/`<textarea>`/`<button>`/`<table>`; no third-party UI
      imported directly.
- [ ] All imports are **barrels**; value-before-type; `@/lib/*` alphabetical; no
      blank lines between import groups.
- [ ] Colors are semantic `status-*`/`severity-*`/`foreground`/`muted`/`border`
      classes — no static colors, no `dark:*`, no `isDark` color branching.
- [ ] Layout uses logical properties (`start`/`end`); responsive mobile-up;
      a11y satisfied (`alt`, `aria-label`, valid roles, no positive `tabindex`).
- [ ] All user-facing text is `t()`-sourced (via props or, if literal, keys added
      to **all 6** locale files).
- [ ] **No `dangerouslySetInnerHTML`**; no direct AI/service calls; no secrets in
      props or logs; external `target="_blank"` has `rel="noopener noreferrer"`.
- [ ] Exported from the component barrel `index.ts`; "New Common Components" doc
      row added if it's a reusable `common` block.
- [ ] Ran `pnpm typecheck` (blocking) and `pnpm lint` / `pnpm format:check` —
      and they actually passed. **Do not claim green without the output.**
