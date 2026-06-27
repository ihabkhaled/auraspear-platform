# KNOWN_PITFALLS_MEMORY

Stable gotchas an agent must know **before** editing. These are the silent
traps the gates do not always catch. Sourced from `apps/api/CLAUDE.md`,
`apps/web/CLAUDE.md`, and `docs/audit/`. Cross-references, not duplicates, of
[[SECURITY_MEMORY]] / [[TECHNICAL_MEMORY]].

- **`PermissionsGuard` fails OPEN on a missing decorator** — no
  `@RequirePermission` ⇒ `canActivate` returns `true`
  (`permissions.guard.ts:26-29`). A new data endpoint without the decorator is a
  silent auth hole. Always add `@RequirePermission(Permission.X)` (or `@Public()`
  - document it). `apps/api` rule 25.
- **`update`/`delete` must carry `tenantId` in `where`** — service-layer checks
  are not enough; use the `updateMany`/`deleteMany` compound `{ id, tenantId }`
  pattern. A bare `update({ where: { id } })` is a cross-tenant write. `apps/api`
  rule 26.
- **`@auraspear/ai` is NOT imported by `apps/api`** (grep: zero matches). The
  package's `redact()` / `AiActionCategory` are **not wired into model calls** —
  `apps/api` runs its own parallel safety code. Do **not** assume the boundary is
  crossed when editing AI flows. See [[AI_MEMORY]].
- **`AiActionCategory` values differ across the boundary** — `packages/ai`
  (`safety.ts:9`) uses **HYPHEN** (`analysis-only`); `apps/api`
  (`common/enums/ai-feature.enum.ts:39`) and `apps/web` use **UNDERSCORE**
  (`analysis_only`). Never copy a value from one side to the other.
- **AI approval is computed but not yet enforced at execution** — the
  orchestrator sets `requiresApproval` (`orchestrator.service.ts:168-179`) but the
  job handler does not block on a persisted `ApprovalRequest` yet (`apps/api` rule
  97 is the target). Treat approval as not-yet-gating when reasoning about safety.
- **Services must NOT import `PrismaService`; controllers must NOT `try/catch`
  or `throw`** — both are ESLint-enforced (`no-restricted-syntax` on
  `TryStatement`/`ThrowStatement` in controllers; repository is the only Prisma
  boundary). `apps/api` rules 14/14a/14b.
- **Adding a permission is a 10-step end-to-end change** — `apps/api` rule 85 /
  `apps/web` rule 34. The migration uses **`WHERE NOT EXISTS`**, never
  `ON CONFLICT ("key")` — the unique key is compound `(tenantId, key)`.
- **No raw `new Date()` / `Date.now()`** — backend uses `nowMs()` from
  `date-time.utility.ts` (`prefer-date-now: off` + ban); frontend uses helpers
  from `@/lib/dayjs` (`nowISO`, `formatDate`), never `dayjs` directly.
- **Husky runs on every commit** — `pre-commit` (lint-staged → ESLint + `tsc`
  - Prettier) and `commit-msg` (commitlint, conventional commits). On Windows
    `corepack enable` may EPERM; use standalone pnpm. See `docs/TROUBLESHOOTING.md`.
- **Web ESLint is NOT type-aware** (no `projectService`) — type-level bugs slip
  past `pnpm lint` and only surface at `tsc` (`pnpm typecheck`, the blocking
  gate). Never treat a green web lint as a green typecheck.
- **Turbo's `^build` edge to `packages/*` is effectively a no-op today** — apps
  do not yet depend on the packages, so editing `packages/ai` does not trigger an
  app rebuild via the dependency graph. Build/verify the app explicitly.
- Related: [[SECURITY_MEMORY]] [[AI_MEMORY]] [[PERFORMANCE_MEMORY]]
  [[TECHNICAL_MEMORY]] [[DECISIONS_MEMORY]].
