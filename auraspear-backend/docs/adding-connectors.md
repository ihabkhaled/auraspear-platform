# Adding Connectors

## Goal

Connectors are security-sensitive integrations. New connector work must preserve SSRF protection, encrypted config storage, role restrictions, and explicit validation.

## Required checklist

1. Add the connector type enum.
2. Add connector config Zod validation.
3. Validate URLs at input time with the shared SSRF utility.
4. Encrypt stored secrets and redact them from logs.
5. Restrict create, update, toggle, and test flows to the intended admin roles.
6. Add sync or health reporting only if the connector supports it operationally.
7. Add tests for validation, RBAC, and error handling.

## Dashboard expectations

If a connector contributes operational value, extend the dashboard contracts so operators can see:

- health state
- last successful sync or test
- failure counts
- backlog or delayed work

Avoid connector-specific dashboard fetches in the frontend when the shared dashboard module can own the aggregation.
