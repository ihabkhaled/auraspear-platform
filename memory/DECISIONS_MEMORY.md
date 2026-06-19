# DECISIONS_MEMORY

Summary of significant decisions. Full ADRs in `docs/decisions/`. Never rewrite
an accepted ADR — supersede it. See `rules/docs/adr-rules.md`.

| ADR                                                               | Decision                                                                                                    | Why                                                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [ADR-0001](../docs/decisions/ADR-0001-monorepo-pnpm-turborepo.md) | Unify into one **pnpm + Turborepo** monorepo (`apps/web`, `apps/api`, `packages/*`)                         | One install, one lockfile, shared contracts; npm hoisting was hiding phantom-dep bugs |
| [ADR-0002](../docs/decisions/ADR-0002-node-22-lts.md)             | Standardize on **Node 22 LTS**                                                                              | Active LTS to 2027; matches backend Docker base                                       |
| [ADR-0003](../docs/decisions/ADR-0003-git-history.md)             | Proceed from the **flattened root** (no history rewrite)                                                    | History was already collapsed; originals remain upstream                              |
| [ADR-0004](../docs/decisions/ADR-0004-zod-resolver-peer.md)       | Re-declare the **Zod peer** for `@hookform/resolvers` via pnpm `packageExtensions`                          | Resolver dropped the zod peer; pnpm could not resolve its internal types              |
| ADR-typescript-and-tsgo                                           | `tsc` is the **blocking** typecheck; **`tsgo`** (`@typescript/native-preview`) is an **advisory** fast path | tsgo is fast but experimental; never the sole gate                                    |

Operational decisions also recorded across the repo:

- **CI**: typecheck + build + Docker build + gitleaks + CodeQL are hard gates;
  lint/format/test/audit/Trivy are advisory (pre-existing lint debt) — documented
  in `docs/audit/02-risk-register.md`, not hidden.
- **prisma.config.ts** reads `process.env['DATABASE_URL']` (not prisma's throwing
  `env()`) so `prisma generate` never fails during install (CI/fresh clone/Docker).
- Related: [[TECHNICAL_MEMORY]].
