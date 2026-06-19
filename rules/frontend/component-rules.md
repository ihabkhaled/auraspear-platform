# Frontend component rules — `.tsx` is render-only

> **Read `AGENTS.md` first** (repo root) for the loading order and the one rule:
> _no AI agent may edit first and understand later._ Then read
> `apps/web/CLAUDE.md` — it holds the 63 enforced frontend rules and the full
> ESLint config (`eslint.config.mjs`) this file summarizes. Where this file and
> `apps/web/CLAUDE.md` overlap, the CLAUDE.md rule number is authoritative.

These are **hard constraints** for any component under `apps/web/src/components/**`
and `apps/web/src/app/**` (page `.tsx`). Most are ESLint `error`-level and block
the `pnpm lint` gate; some block `pnpm typecheck` (the single blocking gate per
`../global/validation-gates.md`). A component that breaks a rule below is wrong
even if it renders.

Related: `../global/absolute-rules.md` §6 (frontend architecture),
`color-and-theme-rules.md` (deep color/theme spec), `i18n-rules.md`,
`accessibility-rules.md`, and the recipes in `../../skills/frontend/`
(`add-page.md`, `add-ai-panel.md`).

---

## 1. `.tsx` files render only — nothing else lives here

A `.tsx` component file contains **only JSX and component structure**. Everything
else has a dedicated home. ESLint enforces this via `no-restricted-syntax`
(`apps/web/CLAUDE.md` rules 13–20).

- **No hooks defined or called in `.tsx`.** Zero hook imports, zero hook calls —
  including `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`,
  `useTranslations`, `useRouter`, `useTheme`, store hooks (`useAuthStore`), and
  every other `useX`. Extract **all** hook logic into a custom hook in
  `src/hooks/` (one hook per file, barrel-exported from `src/hooks/index.ts`).
  The component calls a single page-level hook and renders its return value
  (`apps/web/CLAUDE.md` rules 14 & 16; `FunctionDeclaration[id.name=/^use[A-Z]/]`
  and arrow-function hooks are banned in `.tsx`).
- **No derived/computed state in `.tsx`.** Patterns like
  `const x = computeSomething(hookResult)` belong in the hook's return value (via
  `useMemo`), not the component. Components receive **ready-to-render values
  only** (`apps/web/CLAUDE.md` rule 60).
- **No utility / pure functions in `.tsx`.** Mappers, formatters, status
  resolvers, badge-props builders, validators → `src/lib/utils.ts` or
  `src/lib/<domain>.utils.ts`. Module-scope `function` declarations in `.tsx` are
  zero-tolerance (`apps/web/CLAUDE.md` rule 15).
- **No `type` / `interface` / `enum` / `const`-constant declarations in `.tsx`.**
  Enums → `src/enums/`; types/interfaces → `src/types/<domain>.types.ts`;
  shared/SCREAMING_CASE constants → `src/lib/constants/<domain>.ts`. Exception:
  a small file-local config object used only in that file may sit inline at the
  top (`apps/web/CLAUDE.md` rule 13).
- **No Zod schemas in component files** → `src/lib/validation/<domain>.schema.ts`.
  Exception: a schema that needs `t()` for error messages stays in the component
  because it depends on hook context (`apps/web/CLAUDE.md` rule 18).

If extracting feels like overkill for a one-liner, extract it anyway — the lint
rule has no exceptions and the pre-commit hook (`tsc --noEmit` + `next lint`)
will reject the commit.

## 2. Use the design system — never build custom alternatives

Compose UI from existing components. Building a custom version of something that
already exists is a violation.

- **shadcn/ui base components** via the barrel `@/components/ui` — `Button`,
  `Badge`, `Input`, `Select`, `Textarea`, `Dialog`, etc.
  (`apps/web/CLAUDE.md` "Components — MUST USE").
- **Common components** via `@/components/common` — `DataTable`, `PageHeader`,
  `Toast`, `SweetAlertDialog`, `AiConnectorSelect`, `AiResultCard`,
  `CollapsibleSection`, `SearchInput`, `VirtualizedList`, `LoadingSpinner`,
  `EmptyState`.
- **No raw HTML form/data elements.** Never write `<select>`, `<input>`,
  `<textarea>`, or `<table>`. Use the shadcn/ui equivalents and `<DataTable>`
  (`apps/web/CLAUDE.md` rules 4 & 11). `<table>` specifically → `<DataTable>`
  from `@/components/common`.
- **No third-party UI libraries imported directly in a component.** Wrap them in
  `@/components/common/` first — e.g. use `VirtualizedList`, not `Virtuoso` from
  `react-virtuoso` (`apps/web/CLAUDE.md` rule 63).
- **Barrel imports only.** Import from `@/components/ui`, `@/components/common`,
  `@/services`, `@/hooks`, `@/stores`, `@/types`, `@/enums` — never a deep
  subpath like `@/components/ui/button` (`apps/web/CLAUDE.md` rule 29).
- **`<AiConnectorSelect />` is self-contained** — render it with **zero props**;
  it reads `connectorValue` from `useAiConnectorStore` internally. Never pass
  `availableConnectors`/`selectedConnector`/`onConnectorChange`
  (`apps/web/CLAUDE.md` rule 61).

## 3. Color & theme — semantic classes only

Never use static Tailwind color classes for semantic meaning. Use the
status/severity class system from `src/app/globals.css`
(`apps/web/CLAUDE.md` rule 3 + "Styling Rules"). Full table in
`color-and-theme-rules.md`.

- **Status text/bg/border:** `text-status-error`, `bg-status-warning`,
  `border-status-success`, `text-status-info`, `text-muted-foreground`,
  `text-destructive` (validation errors).
- **Severity:** `text-severity-critical`, `bg-severity-high`,
  `border-severity-medium`, etc.
- **Forbidden → replacement:** `text-red-*` → `text-destructive` /
  `text-status-error`; `text-green-*` → `text-status-success`; `text-gray-*` →
  `text-foreground` / `text-muted-foreground`; `bg-white` → `bg-card` /
  `bg-background`; `bg-gray-*` → `bg-muted`; `border-gray-*` → `border-border`.
- **Utility functions returning class strings** must return `StatusTextClass` /
  `StatusBgClass` / `StatusBorderClass` enum values from `@/enums`, not literal
  strings (`apps/web/CLAUDE.md` rule 40; ESLint-enforced in `src/lib/`).
- **Surfaces:** modals/dialogs → `bg-card`; pages → `bg-background`;
  panels → `bg-card` + `border border-border`; hover → `hover:bg-muted`.

## 4. Dark mode is automatic — never branch on theme for color

Theme-aware colors are CSS variables defined via `@theme inline` in
`src/app/globals.css`, switched by the `.dark` class (Tailwind v4, no
`tailwind.config.js`). The Tailwind classes already adapt.

- **Never use `isDark` conditionals for colors** and never add `dark:bg-*` /
  `dark:text-*` / `dark:border-*` — the CSS variables handle it
  (`apps/web/CLAUDE.md` "Dark Mode Colors"). Use `bg-card`, `text-foreground`,
  `border-border`, `text-muted-foreground` instead of `isDark ? a : b`.

## 5. Responsive + RTL

- **Responsive by default.** Every new page route must cover responsive
  breakpoints in its Playwright test (loaded / empty / error / responsive) —
  `apps/web/CLAUDE.md` rule 48. Build mobile-up with Tailwind breakpoints.
- **RTL is built in (6 locales incl. `ar`).** Use **logical** properties, never
  physical — `start`/`end`, `ps-3`, `me-2`, `text-start` instead of `left`/
  `right`/`pl-`/`mr-`/`text-left` (`apps/web/CLAUDE.md` "i18n"). A layout that
  uses physical directions breaks Arabic.

## 6. Text, events, and JSX hygiene

- **No hardcoded user-facing text.** Every label, placeholder, tooltip, message,
  and confirmation goes through `t()` from `next-intl`, with keys in all 6 locale
  files (`en`, `es`, `it`, `fr`, `ar`, `de`) — `apps/web/CLAUDE.md` rule 9 + "i18n".
  See `i18n-rules.md`.
- **No string-literal unions or raw status strings.** Use enums from `@/enums`
  (e.g. `CaseCycleStatus.ACTIVE`, not `'active'`) — `apps/web/CLAUDE.md` rule 17.
- **Use `e.currentTarget`, not `e.target`.** React 19 + TS 5.9 type `e.target` as
  `EventTarget` with no `.value`/`.files`/`.checked`. Always `e.currentTarget.value`
  (`apps/web/CLAUDE.md` rule 37).
- **`react-hook-form`:** use `useWatch({ control, name })`, never `watch()` from
  the `useForm()` return (`apps/web/CLAUDE.md` rule 23) — and the form hook lives
  in `src/hooks/` per §1.
- **JSX a11y is `error`-level:** images need `alt`, anchors need content, only
  valid ARIA props/roles, no positive `tabindex` (`apps/web/CLAUDE.md` a11y rules).
  See `accessibility-rules.md`.
- **Filenames:** PascalCase with **no consecutive uppercase** — `MitreBarChart.tsx`
  not `MITREBarChart.tsx`, `KpiCard.tsx` not `KPICard.tsx`
  (`unicorn/filename-case`; `apps/web/CLAUDE.md` rule 25).

## 7. Never render raw AI output as HTML (security invariant)

`react/no-danger` is `error` — **no `dangerouslySetInnerHTML`**, with AI content
or otherwise (`AGENTS.md` §7, `apps/web/CLAUDE.md` rules 36 & 43). Render AI
output as markdown via a safe renderer or as plain text; render structured AI
blocks (risk gauges, IOC tables, MITRE maps, timelines) only with components from
`src/components/ai-renderer/` (`apps/web/CLAUDE.md` rule 53). Never render raw
inter-agent JSON — transform to human-readable first (rule 58). Components must
not call AI services directly; go through `src/hooks/useAi*.ts` (rule 41). Deeper
AI-UI rules: `../ai/` and `../../skills/frontend/add-ai-panel.md`.

---

### Quick gate

Before you commit a component, confirm: (1) the `.tsx` has zero hook calls,
zero declarations, zero inline utils; (2) every form/data element is a
shadcn/ui or `@/components/common` component (no raw `<input>`/`<select>`/
`<table>`); (3) all imports are barrels; (4) colors are semantic status/severity
classes, no `dark:`/`isDark`; (5) layout uses `start`/`end`, all text is `t()`;
(6) no `dangerouslySetInnerHTML`. Then run `pnpm lint` and `pnpm typecheck` —
don't claim green until both pass (`../global/validation-gates.md`).
