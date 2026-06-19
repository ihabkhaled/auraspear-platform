# Adding Permissions And Route Access

## Goal

Permissions in AuraSpear are database-backed. A frontend route or action is not complete until the backend permission, seed data, locale labels, and route gating all line up.

## Required checklist

1. Add the permission to the backend enum.
2. Add its label metadata in backend permission definitions.
3. Add default-role coverage in backend seeds.
4. Mirror the permission in the frontend enum.
5. Add locale labels in all supported languages.
6. Gate the page or action through the page hook with `hasPermission()` or `canAccessRouteByPermission()`.
7. Add regression tests for route access or role-matrix behavior.

## Route gating pattern

- Page hooks compute `canX` booleans.
- TSX pages receive those booleans and render actions conditionally.
- Never hide an action in TSX without also enforcing the permission in the backend.

## Role matrix notes

- If a module is meant to be visible but not editable for a role, enforce that in both the backend definitions and the frontend matrix behavior.
- Special modules such as `roleSettings` and `usersControl` must preserve higher-order admin restrictions and cannot rely on frontend-only locks.
