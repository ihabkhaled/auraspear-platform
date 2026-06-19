# AuraSpear SOC BFF - GPT/Codex Rules

## Inheritance

This file is the GPT companion to `CLAUDE.md`.

All rules in `CLAUDE.md` apply here in full, including:

- controller -> service -> repository -> Prisma layering
- security, tenant isolation, and permission enforcement
- enum/type/constants placement rules
- DTO validation and `BusinessException` usage
- migration, seeding, and idempotency requirements
- testing, linting, TypeScript, and formatting requirements
- dayjs for all date/time operations via `src/common/utils/date-time.utility.ts`

If this file and `CLAUDE.md` ever differ, `CLAUDE.md` wins.

## GPT/Codex Execution Rules

1. Treat `CLAUDE.md` as mandatory, not advisory.
2. Never place business logic in controllers or repositories.
3. Never bypass tenant scoping, permission checks, throttling, or validation for convenience.
4. When schema changes are introduced, ship:
   - Prisma schema updates
   - a new migration directory with SQL
   - seed updates
   - tests
5. When adding new permissions, mirror them through:
   - backend permission enums
   - permission definitions
   - default permissions
   - seed data
   - frontend mirrored enums and UI checks
6. When adding analytics or reporting capabilities, keep the contracts concrete and enum-driven.
7. Reuse shared utilities and repository methods where possible instead of duplicating query logic.
8. Keep seeders idempotent and safe for repeated runs.
9. Add or update `messageKey` coverage whenever backend-visible behavior changes.
10. Before finishing, run the relevant validation for changed areas and summarize anything that could not be verified.
11. Dashboard analytics must stay query-driven and reusable; extend shared dashboard contracts before introducing module-specific endpoint shapes.
12. Use `npm run validate:full` for feature-complete backend work that affects tests, docs, schema, or runtime behavior.

## Current Focus Defaults

- Prefer production-grade extensions to existing modules over throwaway scaffolding.
- Keep analytics query-driven first unless persistence is clearly required.
- Keep reports, permissions, and tenant isolation tightly aligned across the stack.
- Keep contributor-facing docs and templates updated whenever validation or operational workflows change.
