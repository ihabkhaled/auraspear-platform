# Accessibility rules — keyboard, semantics, labels, focus

> **Read `AGENTS.md` first** (repo root) for the loading order and the one rule:
> _no AI agent may edit first and understand later._ Then `apps/web/CLAUDE.md`
> (the 63 enforced frontend rules + the `jsx-a11y` ESLint config). This file is
> the accessibility home referenced by `component-rules.md` (§6) and
> `i18n-rules.md`. GOD MODE §5.7 is the source. Where this file and `apps/web/CLAUDE.md`
> overlap, the CLAUDE.md rule number is authoritative.

A SOC analyst lives in this UI for full shifts, often keyboard-only, under
incident-response pressure. Accessibility here is operational reliability, not a
checkbox. `eslint-plugin-jsx-a11y` makes several of these **`error`-level** —
they block `pnpm lint`. Related: `component-rules.md` (design-system components
that are already accessible), `color-and-theme-rules.md` (color-not-sole-signal).

---

## 1. Use the design system — its components are already accessible

- **Compose from `@/components/ui` (shadcn/ui) and `@/components/common`** —
  `Button`, `Dialog`, `Select`, `Input`, `DataTable`, etc. (`apps/web/CLAUDE.md`
  rules 4, 11, "Components — MUST USE"). They ship keyboard handling, focus
  management, and ARIA. Rolling your own re-introduces a11y bugs the system
  already solved.

## 2. Interactive elements are real controls — buttons, not divs

- **Never make a `<div>`/`<span>` clickable.** Use `<Button>` (or a real `<a>`
  for navigation). A click-handler on a non-interactive element is unreachable by
  keyboard and invisible to assistive tech.
- **No raw `<input>`/`<select>`/`<textarea>`/`<table>`** — use the shadcn/ui
  equivalents and `<DataTable>` (`apps/web/CLAUDE.md` rules 4, 11). These carry
  the correct roles and label associations.

## 3. Every input is labeled; every icon-only control has an accessible name

- **Inputs have an associated `<label>`** (or `aria-label` / `aria-labelledby`).
  A placeholder is **not** a label.
- **Icon-only buttons (lucide-react icons) need an accessible name** —
  `aria-label` on the button, or visually-hidden text. An icon with no name is a
  mystery to a screen reader. All such labels go through `t()`
  (`apps/web/CLAUDE.md` rule 9; `i18n-rules.md`).
- **Images need `alt`** — `jsx-a11y/alt-text` is **`error`**
  (`apps/web/CLAUDE.md` a11y rules). Decorative images use `alt=""`.
- **Anchors need content** — `jsx-a11y/anchor-has-content` is **`error`**; an
  empty `<a>` is invisible to AT.

## 4. Keyboard access and focus

- **Everything operable by mouse is operable by keyboard.** Dialogs trap and
  restore focus, menus are arrow-navigable, custom widgets handle Enter/Space/Esc
  — using the design-system components gives you this for free.
- **No positive `tabindex`.** `jsx-a11y/tabindex-no-positive` is **`error`**
  (`apps/web/CLAUDE.md` a11y rules). Use DOM order; `tabindex={0}` / `tabindex={-1}`
  only.
- **Visible focus.** Never remove the focus ring without a replacement; keyboard
  users must see where they are. Use the theme's focus tokens, not `outline:none`.

## 5. Valid ARIA only — and prefer native semantics

- **`jsx-a11y/aria-props` and `jsx-a11y/aria-role` are `error`** — only valid ARIA
  attributes and roles (`apps/web/CLAUDE.md` a11y rules). Don't invent
  `aria-*`/`role` values.
- **Native semantics beat ARIA.** A real `<button>`/`<nav>`/`<table>` is better
  than a `<div role="button">`. Reach for ARIA only to fill a gap native HTML
  can't.

## 6. Color is never the only signal

- **Pair color with text/icon/shape.** Severity and status must not be conveyed by
  color alone — a critical alert shows an icon/label too, not just red. This
  matters for color-blind analysts and for the semantic-class system in
  `color-and-theme-rules.md`. Use the status/severity badges (which carry text +
  icon), not a bare colored dot.

## 7. Semantic tables and structure

- **Tabular data uses `<DataTable>`** (semantic `<table>` under the hood with
  proper headers), never CSS-grid-faking-a-table or raw `<table>`
  (`apps/web/CLAUDE.md` rules 4, 11). Column headers come from `t()`.
- **Sortable columns expose sort state** so it's announceable — wire `sortBy`/
  `sortOrder`/`onSort` (`apps/web/CLAUDE.md` rule 35).
- **Heading order is logical** (one `h1` per page via `PageHeader`, then nested
  headings) — don't pick a heading level for its size; style with classes.

## 8. RTL and responsive are accessibility too

- **Logical properties, not physical** — `start`/`end`, `ps-3`, `me-2`,
  `text-start` so Arabic (one of 6 locales) reads correctly
  (`apps/web/CLAUDE.md` "i18n"; `component-rules.md` §5).
- **Responsive states are tested** in the page's Playwright test (loaded / empty /
  error / responsive) (`apps/web/CLAUDE.md` rule 48; `../testing/e2e-rules.md`).

---

## Self-check before you commit a UI change

- [ ] Built from `@/components/ui` / `@/components/common`, not custom interactive
      `<div>`s; no raw `<input>`/`<select>`/`<textarea>`/`<table>`.
- [ ] Every input labeled; every icon-only button has a `t()`-backed `aria-label`;
      images have `alt`; anchors have content.
- [ ] Keyboard-operable; no positive `tabindex`; focus visible; dialogs/menus
      manage focus.
- [ ] Only valid ARIA props/roles; native semantics preferred.
- [ ] Status/severity conveyed by text/icon + color, never color alone.
- [ ] Tabular data via `<DataTable>`; logical heading order; sort state wired.
- [ ] RTL logical properties; responsive covered in the Playwright test.
- [ ] `pnpm lint` (jsx-a11y `error`s) + `pnpm typecheck` ran and passed
      (`../global/validation-gates.md`); branched first
      (`../global/branch-safety.md`).
