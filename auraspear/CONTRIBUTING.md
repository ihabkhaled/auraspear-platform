# Contributing to AuraSpear SOC (Frontend)

Thank you for your interest in contributing to AuraSpear SOC.

## Getting Started

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Copy environment template: `cp .env.example .env.local`
4. Start the dev server: `npm run dev`

## Code Standards

All code must follow the rules defined in [`CLAUDE.md`](./CLAUDE.md). Key highlights:

- **TypeScript strict mode** — no `any`, no non-null assertions, no unused variables
- **ESLint** — zero warnings allowed (`npm run lint:strict`). Never disable rules with comments
- **Prettier** — auto-formatted on commit. No semicolons, single quotes, 2-space indent
- **No raw HTML** — use shadcn/ui components (`Button`, `Input`, `Select`, `DataTable`, etc.)
- **Semantic colors only** — use `text-status-*`, `bg-severity-*` classes, never static Tailwind colors
- **Enums over string literals** — all string unions must be enums in `src/enums/`
- **Types in `src/types/`** — never define interfaces inline in component or hook files
- **Constants in `src/lib/constants/`** — never define shared constants inline
- **Hooks in `src/hooks/`** — no hook calls allowed in `.tsx` files

## Architecture

- **TSX files** contain only JSX rendering. All logic lives in custom hooks.
- **Page hooks** orchestrate data fetching, state, and actions for each page.
- **Services** in `src/services/` handle API calls via the Axios instance from `@/lib/api`.
- **Stores** in `src/stores/` manage global client state with Zustand.

### Import Conventions

- ALWAYS use barrel imports: `@/components/ui`, `@/components/common`, `@/services`, `@/hooks`, `@/stores`
- NEVER import from subpaths like `@/components/ui/button`
- Use `buildErrorToastHandler(tErrors)` for mutation error handling
- Use `<AiConnectorSelect />` (zero props) for AI connector dropdowns
- Wrap third-party UI libs in `@/components/common/` before using
- NEVER use raw `new Date()` or `Date.now()` — use `@/lib/dayjs` utilities (`nowISO`, `todayDate`, `formatTimestamp`, etc.)

### Mobile Responsiveness Rules
- All fixed widths must have mobile fallback: `w-full sm:w-40` not `w-40`
- All dialogs must use `max-w-[95vw] sm:max-w-xl` pattern
- Scroll containers use viewport heights on mobile: `max-h-[60vh] sm:max-h-[400px]`
- Filter toolbars must use `flex-wrap` with full-width selects on mobile
- Chat sidebar uses slide-over pattern on mobile (state in useAiChat hook)

## Pull Request Workflow

1. Create a feature branch from `main`: `git checkout -b feat/your-feature`
2. Make your changes following the code standards above
3. Run the full validation pipeline before pushing:
   ```bash
   npm run validate:full
   ```
4. Push your branch and open a pull request against `main`
5. Fill in the PR template with a summary and test plan
6. Address review feedback promptly

## Pre-commit Hooks

Husky runs the following checks on every commit via `lint-staged`:

1. **ESLint** — lints staged files
2. **TypeScript** — full type check (`tsc --noEmit`)
3. **Prettier** — auto-formats staged files

If a hook fails, fix the issue before committing. Never bypass hooks with `--no-verify`.

## Testing Requirements

Every feature or fix should include tests covering:

- Component render states (loading, empty, error, data)
- Hook logic (data fetching, state management)
- User interactions (clicks, form submissions)
- i18n rendering (keys resolve correctly)

Run tests with: `npm test`

## Contributor Docs

- [`docs/dashboard-widgets.md`](./docs/dashboard-widgets.md)
- [`docs/permissions-and-routes.md`](./docs/permissions-and-routes.md)
- [`INSTALL.md`](./INSTALL.md)

## Internationalization (i18n)

AuraSpear supports 6 languages: English, Spanish, Italian, French, Arabic (RTL), and German.

- All user-facing text must use `t()` from `next-intl`
- Translation files are in `src/i18n/{locale}.json`
- Every new feature must include translations in **all 6 locale files**
- Use `start`/`end` instead of `left`/`right` for RTL support (e.g., `ps-3`, `me-2`)

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: add alert detail panel`
- `fix: correct pagination reset on filter change`
- `refactor: extract alert hooks from page component`
- `docs: update contributing guide`
- `test: add cases list render tests`

## Questions?

Open a GitHub Discussion or reach out to the maintainers.
