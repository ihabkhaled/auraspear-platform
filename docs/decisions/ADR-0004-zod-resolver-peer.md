# ADR-0004 — Re-declare Zod peer for @hookform/resolvers under pnpm

- Status: Accepted
- Date: 2026-06-19

## Context

After migrating the web app to the pnpm workspace, `pnpm --filter @auraspear/web
typecheck` failed with ~37–40 `TS2769: No overload matches this call` errors,
all on `zodResolver(schema)` in `src/hooks/*Dialog.ts` form hooks:

```
Overload 2 ... The types of '_zod.version.minor' are incompatible.
  Type '4' is not assignable to type '0'.
```

Root cause: `@hookform/resolvers@5` consumes schemas via **Standard Schema** and
**dropped `zod` from its `peerDependencies`**. Under npm's flat `node_modules`
(the original repos) `zod` was hoisted next to the resolver, so its internal
`import ... from 'zod'` type references resolved fine. Under pnpm's isolated
`node_modules`, the resolver has no `zod` in scope, TS cannot resolve those
references, and falls back to a default where Zod's internal `version.minor` is
`0` — which never matches the app's real Zod 4 (`minor: 4`). This is a
dependency-graph resolution problem, **not** an app code or true version
incompatibility (the original repo built fine with Zod `^4.3.6` + resolvers
`^5.2.2`).

## Decision

Add a pnpm `packageExtensions` entry (in `pnpm-workspace.yaml`) that re-declares
`zod` as a peer dependency of `@hookform/resolvers`, so pnpm co-locates the web
app's Zod 4 with the resolver:

```yaml
packageExtensions:
  '@hookform/resolvers':
    peerDependencies:
      zod: '*'
```

Also keep `overrides: { zod@4: 4.4.3 }` so the web tree resolves to a single
Zod 4.x. The api app stays on Zod 3.x (untouched by the `zod@4` override).

## Alternatives considered

- **Pin `@hookform/resolvers` to an older 5.x** — didn't address the cause (the
  missing peer); all v5 behave the same under pnpm.
- **`public-hoist-pattern[]=zod` / `node-linker=hoisted`** — would work but
  weakens pnpm's strict isolation globally just to satisfy one package.
- **Migrate all form hooks to `standardSchemaResolver`** — a real code change
  across ~37 files; deferred, not needed.

## Consequences

- No application code changes; `zodResolver` keeps working as written.
- The fix is declarative and lives with the workspace config.
