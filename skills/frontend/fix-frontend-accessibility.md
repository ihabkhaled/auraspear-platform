# Skill: Fix frontend accessibility (`apps/web` — keyboard, labels, semantics, color)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order §1, the one rule:
> _no AI agent may edit first and understand later_). The governing rule file is
> [`rules/frontend/accessibility-rules.md`](../../rules/frontend/accessibility-rules.md)
> (keyboard / focus / labels / semantic tables / color-not-sole-signal). Related:
> [`rules/frontend/color-and-theme-rules.md`](../../rules/frontend/color-and-theme-rules.md)
> (the semantic status/severity class system — color is never the only signal),
> [`rules/frontend/component-rules.md`](../../rules/frontend/component-rules.md)
> (use the design system; `.tsx` render-only),
> [`rules/frontend/i18n-rules.md`](../../rules/frontend/i18n-rules.md) (labels go
> through `t()`). Then read [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) — the
> jsx-a11y ESLint table (`alt-text`, `anchor-has-content`, `aria-props`,
> `aria-role`, `tabindex-no-positive` are **`error`-level**) and rules 4, 9, 11.
>
> A SOC analyst works keyboard-only under incident pressure. Accessibility here is
> **operational reliability**, and several a11y rules **block `pnpm lint`** — let
> the linter drive the fix.

This recipe finds and fixes accessibility violations in the web app: unlabeled
controls, click-handlers on `<div>`s, raw HTML elements, color-only signaling,
broken keyboard/focus, invalid ARIA, and non-semantic tables.

---

## When to use

Use this skill when: `pnpm lint` reports jsx-a11y errors; a control is unreachable
by keyboard or unnamed for screen readers; status/severity is conveyed by color
alone; a custom widget reimplements something the design system already makes
accessible; or you are hardening a page before release.

**Do not** use this skill for: backend/API work; pure performance (→
[`fix-frontend-performance.md`](fix-frontend-performance.md)); building a brand-new
accessible component (→ [`add-component.md`](add-component.md), which bakes a11y in
from the start).

---

## Files to inspect first

| Concern                                                      | File / location                                                                                                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| The a11y rule home (the checklist this skill executes)       | `rules/frontend/accessibility-rules.md`                                                                                               |
| Accessible primitives — use these, don't roll your own       | `apps/web/src/components/ui` (`Button`, `Dialog`, `Select`, `Input`) and `apps/web/src/components/common` (`DataTable`, `PageHeader`) |
| Semantic color system (color-not-sole-signal)                | `apps/web/src/app/globals.css` (`status-*` / `severity-*`); `color-and-theme-rules.md`                                                |
| Severity/status badges that already pair text + icon + color | `apps/web/src/components/common` (`SeverityBadge`, `renderSeverityBadge`/`renderStatusBadge` from `@/lib/column-renderers`)           |
| i18n for accessible names                                    | `apps/web/src/i18n/{en,ar,es,fr,de,it}.json`                                                                                          |
| The jsx-a11y rule list + levels                              | `apps/web/CLAUDE.md` "Accessibility Rules (jsx-a11y)"                                                                                 |

---

## Exact step-by-step implementation

Run from repo root. **pnpm only, Node 22.** Lead with the linter — it pinpoints the
`error`-level violations.

### 0. Branch first

```bash
git checkout -b a11y/web-<area>
```

### 1. Run lint and triage the jsx-a11y errors

```bash
pnpm --filter @auraspear/web lint
```

`jsx-a11y/alt-text`, `anchor-has-content`, `aria-props`, `aria-role`, and
`tabindex-no-positive` are **`error`-level** (`apps/web/CLAUDE.md`) — fix every one;
do **not** silence with `// eslint-disable` (rule 2/12, zero exceptions). For a JSON
report to triage at scale:

```bash
pnpm --filter @auraspear/web lint-report-ts   # writes eslint-reports/eslint-ts-report.json
```

### 2. Use real controls, not clickable `<div>`/`<span>` (rules §1–§2)

- Replace any `<div onClick>` / `<span onClick>` with `<Button>` from
  `@/components/ui` (or a real `<a>` for navigation). A handler on a
  non-interactive element is keyboard-unreachable.
- Replace raw `<input>`/`<select>`/`<textarea>`/`<table>` with the shadcn/ui
  equivalents and `<DataTable>` (`apps/web/CLAUDE.md` rules 4, 11) — they carry the
  correct roles, labels, and keyboard handling.

### 3. Label every control; name every icon-only button (rule §3)

- Inputs get an associated `<label>` (or `aria-label`/`aria-labelledby`). A
  placeholder is **not** a label.
- Icon-only buttons (lucide-react icons) get an `aria-label` — and it goes through
  `t()` (rule 9):

  ```tsx
  <Button variant="ghost" size="icon" aria-label={t('actions.dismiss')} onClick={onDismiss}>
    <X className="h-3.5 w-3.5" />
  </Button>
  ```

- Images get `alt` (`alt=""` for decorative); anchors get content.

### 4. Keyboard access and visible focus (rule §4)

- Everything mouse-operable is keyboard-operable — using the design-system
  `Dialog`/`Select`/menu components gives focus trap/restore and arrow navigation
  for free.
- **No positive `tabindex`** (`tabindex-no-positive` is `error`) — `0`/`-1` only.
- Never strip the focus ring (`outline:none`) without a themed replacement.

### 5. Valid ARIA only; prefer native semantics (rule §5)

Only valid `aria-*` props and roles (`aria-props`/`aria-role` are `error`). Prefer
a real `<button>`/`<nav>`/`<table>` over `<div role="...">`.

### 6. Color is never the only signal (rule §6; `color-and-theme-rules.md`)

Pair color with text/icon/shape. Severity and status must show an icon/label too,
not just red — use the status/severity badges (which carry text + icon), not a bare
colored dot. Use the semantic `text-status-*` / `text-severity-*` classes from
`globals.css`, never static `text-red-*`/`bg-white`/`text-gray-*` or `dark:*`
variants (`apps/web/CLAUDE.md` "Forbidden Color Classes").

### 7. Semantic tables and structure (rule §7)

- Tabular data uses `<DataTable>` (semantic `<table>` with proper headers) — never
  CSS-grid-faking-a-table. Column headers come from `t()`.
- Sortable columns expose sort state: wire `sortBy`/`sortOrder`/`onSort` so it is
  announceable (rule 35).
- Logical heading order: one `h1` per page via `PageHeader`, then nested headings —
  pick level by structure, not size.

### 8. RTL and responsive are accessibility too (rule §8)

Use logical properties (`ms-`, `pe-`, `start-0`, `text-start`) so Arabic reads
correctly — never physical (`ml-`, `pr-`, `left-0`, `text-left`). Responsive states
are covered by the page's Playwright test.

---

## Validation commands (real pnpm commands, from repo root)

Run and read the output. **Never claim green without running it** (`AGENTS.md` §5).

```bash
pnpm --filter @auraspear/web lint            # the jsx-a11y error-level rules — fix every one
pnpm --filter @auraspear/web lint:strict     # --max-warnings 0
pnpm typecheck                               # HARD gate (tsc --noEmit). Must pass.
pnpm build                                    # HARD gate.
pnpm --filter @auraspear/web test:e2e        # Playwright loaded/empty/error/responsive (rule 48)
```

Manual keyboard pass (`pnpm dev:web`): Tab through the surface — every control
reachable and operable (Enter/Space/Esc), focus visible, dialogs trap/restore
focus, screen-reader names present on icon buttons. Hard gates (`typecheck`,
`build`) must pass.

---

## Common mistakes

- **`// eslint-disable` to silence a jsx-a11y `error`** — absolute ban (rule 2/12).
  Fix the markup.
- **Clickable `<div>`/`<span>`** instead of `<Button>` — keyboard-unreachable
  (rule §2).
- **Raw `<input>`/`<select>`/`<textarea>`/`<table>`** instead of the design-system
  components / `<DataTable>` (rules 4, 11).
- **Placeholder used as a label**, or an icon-only button with no `aria-label`
  (rule §3); a hardcoded `aria-label` string instead of `t()` (rule 9).
- **Color-only signaling** (a bare red dot) — pair with text/icon; use the
  status/severity badges (rule §6).
- **Static color classes / `dark:*`** instead of semantic `status-*`/`severity-*`
  classes (`color-and-theme-rules.md`; "Forbidden Color Classes").
- **Positive `tabindex`** or stripping the focus ring (rule §4).
- **Invalid ARIA** props/roles (`aria-props`/`aria-role` are `error`) — or reaching
  for ARIA where native HTML would do (rule §5).
- **Physical direction classes** (`ml-`, `pr-`, `text-left`) breaking RTL (rule §8).
- **Claiming green without running `pnpm lint` + `pnpm typecheck`** (`AGENTS.md` §13).

---

## Final checklist

- [ ] Read `AGENTS.md`, `accessibility-rules.md`, `color-and-theme-rules.md`,
      `apps/web/CLAUDE.md` (jsx-a11y table, rules 4, 9, 11).
- [ ] Branched (`a11y/web-<area>`), not on `main`.
- [ ] `pnpm --filter @auraspear/web lint` jsx-a11y errors all fixed (none silenced
      with `eslint-disable`).
- [ ] Built from `@/components/ui` / `@/components/common`; no clickable `<div>`;
      no raw `<input>`/`<select>`/`<textarea>`/`<table>`.
- [ ] Every input labeled; every icon-only button has a `t()`-backed `aria-label`;
      images have `alt`; anchors have content.
- [ ] Keyboard-operable; no positive `tabindex`; focus visible; dialogs manage focus.
- [ ] Only valid ARIA props/roles; native semantics preferred.
- [ ] Status/severity conveyed by text/icon + color (semantic classes), never color
      alone.
- [ ] Tabular data via `<DataTable>`; sort state wired; logical heading order;
      logical RTL properties.
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ (ran them); `lint:strict` and
      `test:e2e` run and reported; manual keyboard pass done.
- [ ] Final response uses the `AGENTS.md` §13 report block.
