# AuraSpear SOC - GPT/Codex Rules

## Inheritance

This file is the GPT companion to `CLAUDE.md`.

All rules in `CLAUDE.md` apply here in full, including:

- architecture and file placement rules
- frontend rendering and hook usage rules
- enum/type/constants organization rules
- i18n and no-literal-string requirements
- testing, validation, and security requirements
- lint, TypeScript, and formatting requirements

If this file and `CLAUDE.md` ever differ, `CLAUDE.md` wins.

## GPT/Codex Execution Rules

1. Read the existing feature flow before editing it.
2. Treat `CLAUDE.md` as mandatory, not advisory.
3. Keep TSX render-focused and move logic into hooks/utilities/types/constants as required by the repo rules.
4. Never add raw user-facing strings; add translation keys to all locale files.
5. Never add string literal unions where enums belong.
6. Mirror backend-facing contract changes through frontend enums, types, services, hooks, and permission checks.
7. When adding dashboard or reporting features, update:
   - APIs/BFF routes
   - frontend types and services
   - locales
   - permissions or role handling when applicable
   - tests
8. When touching role settings or permission-driven UI, keep the frontend permission enum aligned with the backend source of truth.
9. When adding analytics UI, prefer shared reusable shells/components over one-off page logic.
10. Before finishing, run the relevant validation for changed areas and summarize anything that could not be verified.
11. For dashboard or reporting work, prefer extending shared contracts such as `analytics-overview` and `operations-overview` before adding page-local fetch shapes.
12. Use `npm run validate:full` for feature-complete changes that touch UI, tests, or documentation.

## Import & Modularization Rules

13. Always use barrel imports: `@/components/ui`, `@/components/common`, `@/services`, `@/hooks`, `@/stores`, `@/types`, `@/enums`.
14. Never import from subpaths (e.g., `@/components/ui/button` is banned — use `@/components/ui`).
15. Use `buildErrorToastHandler(tErrors)` for all mutation `onError` handlers instead of inline toast calls.
16. Use `<AiConnectorSelect />` (zero props) for AI connector dropdowns — it reads from the global `useAiConnectorStore`.
17. New common components (SearchInput, CollapsibleSection, AiResultCard, VirtualizedList, column-renderers, toast.utils) are available via `@/components/common` barrel.
18. NEVER use raw `new Date()` or `Date.now()` — use `@/lib/dayjs` utilities (`nowISO`, `todayDate`, `uniqueId`, `formatTimestamp`, `sortByDateAsc/Desc`).
19. All dialogs must include `max-w-[95vw]` mobile fallback. All fixed-width selects must use `w-full sm:w-*` pattern. All scroll containers must use viewport-relative heights on mobile.

## Current Focus Defaults

- Build concrete, organized features rather than placeholder scaffolding.
- Prefer shared analytics/reporting foundations over isolated page-only additions.
- Preserve AuraSpear's visual identity while improving density, hierarchy, and operational clarity.
- Keep contributor-facing docs and templates updated whenever workflows or validation commands change.
