# Migrations And Seeds

## Goal

Every schema change in AuraSpear must be reproducible on a fresh database and safe to re-run in existing environments.

## Required flow

1. Update `prisma/schema.prisma`.
2. Create a new migration directory with `migration.sql`.
3. Update seed data if the new tables or enums require defaults.
4. Run the migration on a fresh database.
5. Re-run the seed to confirm idempotency.
6. Run `npm run validate:full`.

## Seed rules

- Use `upsert()` or `createMany({ skipDuplicates: true })`.
- Do not rely on fallback passwords or fallback secrets.
- Keep default permissions, report templates, and system records deterministic.
- If a permission or module should appear in the role matrix, the seed or runtime backfill must ensure the definition exists.

## PR checklist

- Migration applies cleanly
- Seed can be run twice without failure
- Tests cover the changed behavior
- README or INSTALL notes updated when local setup changes
