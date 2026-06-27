# Color & theme rules — semantic classes only, never static Tailwind colors

> **Read `AGENTS.md` first** (repo root) for the loading order and the one rule:
> _no AI agent may edit first and understand later._ Then `apps/web/CLAUDE.md`
> ("Styling Rules" + rules 3, 40) — the authoritative, detailed spec this file
> distills. This is the deep color/theme home referenced by `component-rules.md`
> §3–§4. GOD MODE §5.2 is the source. Where this file and `apps/web/CLAUDE.md`
> overlap, the CLAUDE.md rule number wins.

The platform uses a **semantic status/severity class system** defined in
`apps/web/src/app/globals.css` (Tailwind v4, CSS-first `@theme`). Color carries
**meaning** (severity, status), so it must come from named semantic classes, not
raw palette classes. **Rule 3 is absolute**: never use static Tailwind color
classes for semantic colors. Related: `accessibility-rules.md` §6
(color-not-sole-signal), `component-rules.md`.

---

## 1. Status colors — use the `*-status-*` classes

Defined in `globals.css`; use these for warning/error/success/info meaning:

| Meaning          | Text                    | Background          | Border                  |
| ---------------- | ----------------------- | ------------------- | ----------------------- |
| Warning          | `text-status-warning`   | `bg-status-warning` | `border-status-warning` |
| Error            | `text-status-error`     | `bg-status-error`   | `border-status-error`   |
| Success          | `text-status-success`   | `bg-status-success` | `border-status-success` |
| Info             | `text-status-info`      | `bg-status-info`    | `border-status-info`    |
| Hint/helper      | `text-muted-foreground` | —                   | —                       |
| Validation error | `text-destructive`      | —                   | —                       |

Backgrounds are ~10–15% opacity, borders ~25–30% — built for the alert/panel
pattern in `apps/web/CLAUDE.md` "Alert/Panel Pattern".

## 2. Severity colors — use the `*-severity-*` classes

For alert/incident severity (`AlertSeverity`):
`text-severity-critical` / `bg-severity-critical` / `border-severity-critical`,
and the same for `high`, `medium`, `low`, `info` (`apps/web/CLAUDE.md` "Severity
Colors"). Never map severity to `text-red-*`/`text-orange-*` by hand.

## 3. Forbidden static color classes → replacement

`apps/web/CLAUDE.md` "Forbidden Color Classes" — these are violations:

| Forbidden                                     | Use instead                                 |
| --------------------------------------------- | ------------------------------------------- |
| `text-red-*`                                  | `text-destructive` / `text-status-error`    |
| `text-green-*`                                | `text-status-success`                       |
| `text-amber-*`                                | `text-status-warning`                       |
| `text-blue-*` (semantic)                      | `text-status-info`                          |
| `text-gray-*`                                 | `text-foreground` / `text-muted-foreground` |
| `bg-white`                                    | `bg-card` / `bg-background`                 |
| `bg-gray-*`                                   | `bg-muted` / `bg-card`                      |
| `border-gray-*`                               | `border-border`                             |
| `dark:bg-*` / `dark:text-*` / `dark:border-*` | not needed — CSS variables handle dark mode |

**Allowed exceptions:** `text-white` on a brand/status-colored background (for
contrast); `bg-white/5`, `bg-white/10` opacity overlays on brand sections.

## 4. Utility functions return `StatusXClass` enum values, not literals

- **A `src/lib/` helper that returns a class string MUST return
  `StatusTextClass` / `StatusBgClass` / `StatusBorderClass` enum values from
  `@/enums`**, never a literal like `'text-status-error'` — `apps/web/CLAUDE.md`
  rule 40, ESLint-enforced (`no-restricted-syntax`) in `src/lib/`. Compound:
  `` `${StatusBgClass.ERROR} ${StatusTextClass.WHITE} ${StatusBorderClass.ERROR}` ``.
- This keeps color logic in enums (`file-organization-rules.md`,
  `component-rules.md` §3) and out of scattered string literals.

## 5. Dark mode is automatic — never branch on theme for color

- **CSS variables defined via `@theme inline` in `globals.css`** switch with the
  `.dark` class (Tailwind v4, **no `tailwind.config.js`** — variables in `:root`
  for light and `.dark` for dark). The Tailwind classes already adapt.
- **Never use `isDark` conditionals for colors; never add `dark:*` variants.**
  Use `bg-card` / `text-foreground` / `border-border` / `text-muted-foreground`
  instead of `isDark ? a : b` (`apps/web/CLAUDE.md` "Dark Mode Colors", rule 4 in
  `component-rules.md`). `useTheme` is a hook — it never lives in a `.tsx`
  anyway (`component-rules.md` §1).

## 6. Surfaces — the semantic background tokens

- Modals/dialogs → `bg-card`; pages → `bg-background`; panels/sections →
  `bg-card` + `border border-border`; hover → `hover:bg-muted`; muted sections →
  `bg-muted` / `bg-muted/50` (`apps/web/CLAUDE.md` "Layout Backgrounds").
- KPI cards use `bg-card`, uppercase muted labels, bold values; badges are
  semantic, uppercase, small (`apps/web/CLAUDE.md` "Design System").

## 7. RTL + color-not-sole-signal

- **Logical properties, not physical** — `start`/`end` so Arabic renders
  correctly (`component-rules.md` §5). This applies to bordered/colored panels too
  (`border-s`, not `border-l`).
- **Color is never the only signal** — pair severity/status color with text and
  an icon (`accessibility-rules.md` §6). The status/severity badges already do
  this; prefer them over a bare colored swatch.

## 8. Adding a new semantic color

- Add the CSS variable in **both** `:root` and `.dark` in `globals.css`, register
  it in `@theme inline`, add the `Status*Class` enum member in `@/enums`, and use
  the class — never a raw palette value. Document it if it changes the design
  system (`../docs/documentation-rules.md`).

---

## Self-check before you commit a styling change

- [ ] No static Tailwind color class for semantic meaning (no `text-red-*`,
      `bg-white`, `bg-gray-*`, `border-gray-*`, …) — used `*-status-*` /
      `*-severity-*` / `bg-card` / `text-foreground` / `border-border`.
- [ ] No `isDark` color conditional, no `dark:*` variant.
- [ ] `src/lib/` class-returning helpers return `Status*Class` enum values, not
      literals (rule 40).
- [ ] Surfaces use the semantic background tokens; new colors added in `:root` +
      `.dark` + `@theme` + enum.
- [ ] RTL logical properties; color paired with text/icon (not color-alone).
- [ ] `pnpm lint` (incl. the `src/lib/` `no-restricted-syntax`) + `pnpm typecheck`
      ran and passed (`../global/validation-gates.md`); branched first
      (`../global/branch-safety.md`).
