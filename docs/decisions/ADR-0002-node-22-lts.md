# ADR-0002 — Standardize on Node.js 22 LTS

- Status: Accepted
- Date: 2026-06-19

## Context

Before migration the toolchain was inconsistent:

- Frontend `Dockerfile` used `node:20-alpine`.
- Backend `Dockerfile` / `Dockerfile.dev` used `node:22-alpine`.
- Backend README referenced Node 22; both CIs ran on Node 20.
- The developer's local machine runs Node 24.

## Decision

Standardize the entire platform on **Node.js 22 LTS**.

- Root `package.json` `engines`: `"node": ">=22 <25"`, `"pnpm": ">=10"`.
- All Dockerfiles target `node:22-alpine` (frontend bumped 20 → 22).
- CI matrix uses Node 22.
- Docs reference Node 22 as the supported runtime.

## Rationale

- Node 22 is in Active LTS with support into 2027 — the safe production target.
- It matches the backend's existing Docker base and README intent, so it is the
  smallest consistent change.
- Node 24 (local) is allowed by the `<25` ceiling for developer convenience but
  is not the CI/Docker baseline.

## Consequences

- Frontend production image rebuilds on Node 22.
- No application code changes required; both apps already run on Node 22+ APIs.
