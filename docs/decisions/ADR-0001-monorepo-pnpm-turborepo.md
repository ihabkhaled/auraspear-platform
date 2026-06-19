# ADR-0001 — Unify into a pnpm + Turborepo monorepo

- Status: Accepted
- Date: 2026-06-19
- Deciders: Platform migration (foundation milestone)

## Context

AuraSpear shipped as two separate repositories — `auraspear` (Next.js frontend,
package `auraspear-soc`) and `auraspear-backend` (NestJS BFF, package
`auraspear-soc-bff`). They share domain concepts (permissions, roles, enums,
DTO shapes, i18n error keys) that were duplicated and drifted independently.
Both repos also carried **two lockfiles each** (`package-lock.json` +
`pnpm-lock.yaml`) and overlapping tooling configs.

## Decision

Merge both apps into a single repository `auraspear-platform` with this layout:

```
apps/web   → @auraspear/web   (was auraspear-soc)
apps/api   → @auraspear/api   (was auraspear-soc-bff)
packages/shared → @auraspear/shared  (cross-app contracts; scaffolded)
packages/config → @auraspear/config  (shared tooling presets; scaffolded)
infra/, scripts/, docs/
```

- **Package manager: pnpm** (`packageManager: pnpm@10.30.3`). All
  `package-lock.json` files removed; a single root `pnpm-lock.yaml` is
  authoritative. Workspaces declared in `pnpm-workspace.yaml`.
- **Orchestration: Turborepo** (`turbo.json`) for `build`, `lint`, `typecheck`,
  `test` with caching and `^build` ordering.
- **Tooling centralized at root:** husky (one lightweight pre-commit running
  lint-staged + a commit-msg commitlint hook), Prettier, commitlint. Per-app
  ESLint configs stay in each app (they are large and app-specific).

## Consequences

- One install, one lockfile, one validation entrypoint (`pnpm validate`).
- pnpm's strict `node_modules` surfaced **two latent phantom-dependency bugs**
  in the API (`ws`, `form-data` imported but undeclared) — now fixed by
  declaring them. This is a feature, not a regression.
- Shared contracts can be consolidated incrementally into `@auraspear/shared`
  without blocking the migration (see docs/MONOREPO_MIGRATION.md).
- Git history was not preserved in this root (the repos were already flattened
  into a single commit before migration); original per-file history remains in
  the source GitHub repos. See ADR-0003.

## Alternatives considered

- **Nx** — more powerful generators/graph, but heavier; Turborepo fits the
  two-app + few-packages shape.
- **npm/yarn workspaces** — both apps already used pnpm; npm's flat hoisting was
  actively masking the phantom-dependency bugs above.
