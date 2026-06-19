# Adding Permissions And Roles

## Goal

AuraSpear uses dynamic, database-backed permissions. Adding a new capability means touching enum, metadata, defaults, tests, and frontend mirrors together.

## Required backend changes

1. Add the permission to `src/common/enums/permission.enum.ts`.
2. Add the permission metadata to `permission-definitions.ts`.
3. Add the permission to default-role seed coverage where appropriate.
4. Protect the endpoint with `@RequirePermission(...)`.
5. Add or update tests for success, denial, and tenant isolation.

## Role design guidance

- Prefer task-oriented permissions instead of broad role checks.
- Keep `GLOBAL_ADMIN` implicit and avoid duplicating logic in services.
- For exceptional modules such as `role-settings` and `users-control`, document who can view vs who can modify.
- If a tenant admin can see a permission but must not edit it, enforce that in backend definitions and frontend matrix rendering.

## Frontend follow-up

After backend changes, mirror the permission in the frontend repo and add the locale label in all supported language files.
