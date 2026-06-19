# BACKEND_CONTEXT.md — AuraSpear API (`apps/api`)

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → `memory/*.md` → this `context/*.md`
> → `rules/**` → `skills/**` → `docs/**` → code + tests. This file is step 3 for
> any task that touches the NestJS backend. Do **not** edit before you have read
> the rules and skills linked below — the one rule is _no AI agent may edit first
> and understand later._

This is the **backend orientation** file: the shape of `apps/api`, the strict
layering, the tenant/permission invariants, the DTO/Zod boundary, and the Prisma
rules. The authoritative, exhaustive source is
[`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) (100+ enforced rules + the full
ESLint config). Where this file and `CLAUDE.md` overlap, the **CLAUDE.md rule
number is authoritative**. For the product map of which module serves which
domain, see [`./PRODUCT_CONTEXT.md`](./PRODUCT_CONTEXT.md).

---

## What this area is

`apps/api` (`@auraspear/api`) is a **NestJS 11 + Prisma 7 + PostgreSQL + Redis**
**Backend-for-Frontend (BFF)**. It is the single integration point for every
downstream tool (Wazuh, OpenSearch, MISP, Shuffle, Bedrock, …), every AI
provider, and the database. The Next.js web app **never** calls those tools or
the DB directly — it proxies every call through `apps/web/src/app/api/*` routes
(`proxyToBackend()`), so **every new backend endpoint the UI reaches also needs a
matching proxy route** (`CLAUDE.md` #86).

Key facts: global prefix `api/v1` (set once in `src/main.ts` —
`@Controller('cases')` already serves `/api/v1/cases`). Validation is **Zod
only** (no `class-validator`). Auth is JWT (HS256) with a Redis-backed JTI
blacklist. Structured logs via `nestjs-pino`. Secrets are env-loaded with **no
fallbacks**; connector configs are AES-256-GCM encrypted at rest. **pnpm only,
Node 22.**

---

## Where files live

**Domain modules** — `apps/api/src/modules/<module>/`. ~38 modules; run
`ls apps/api/src/modules` for the live list (treat any table as a map, not an
inventory). Each module owns this strict file set (`CLAUDE.md` §"File Structure
Per Module"; the canonical reference module is `cases/` — copy its shape):

```
src/modules/<module>/
├── <module>.module.ts        # wires controller + providers (decorated empty class)
├── <module>.controller.ts    # route + delegate only
├── <module>.service.ts       # thin orchestrator (<30 lines/method, no Prisma)
├── <module>.repository.ts    # pure data access, tenantId on every method
├── <module>.utilities.ts     # all business logic (pure named functions)
├── <module>.types.ts         # interfaces/types
├── <module>.enums.ts         # enums
├── <module>.constants.ts     # constants
├── dto/<name>.dto.ts         # Zod schemas + inferred type
└── __tests__/ (or test/)     # *.spec.ts / *.e2e.spec.ts
```

**The layering (one direction, no skipping)** — a layer calls **only the layer
directly below it** plus Utilities:

```
Controller → Service → Repository → Prisma
               ↓
           Utilities
```

- **Controller**: binds HTTP to **one** service call and returns it. No
  `try/catch`, no `throw`, no transforms, no logic (`CLAUDE.md` #14 —
  `TryStatement`/`ThrowStatement` ESLint-banned in controller files). Carries
  `@RequirePermission(...)`, reads tenant via `@TenantId()`, validates the
  boundary (`@Body(new ZodValidationPipe(Schema))`; `Schema.parse(rawQuery)` for
  query).
- **Service**: thin orchestrator — _validate → call util → call repo → return_.
  **Never imports `PrismaService`.** ≤30 lines/method, cyclomatic complexity ≤10
  (`CLAUDE.md` #14a). Business rules + `BusinessException` live here.
- **Repository**: the **only** place `PrismaService` is imported. Pure data
  access — no logic, no conditionals, no transforms, no `throw` (`CLAUDE.md`
  #14b). **Every method takes `tenantId`**.
- **Utilities**: all business logic — mappers, `where`/`orderBy` builders,
  calculators, validators, formatters. Pure named functions only; no
  types/enums/constants inside (`CLAUDE.md` #14c).

**Cross-cutting (`src/common/`):**

- **Decorators** (`common/decorators/`): `@RequirePermission` (`permission.decorator.ts`),
  `@TenantId`, `@CurrentUser`, `@Public`, `@Roles` (legacy), `@AllowCaseOwner`.
- **Guards** (`common/guards/`), registered **globally** as `APP_GUARD` in
  `app.module.ts`, in order:
  `ThrottlerGuard → AuthGuard → CsrfGuard → TenantGuard → RolesGuard → PermissionsGuard`.
  You do **not** add `@UseGuards(...)` to get them.
- **Pipes** (`common/pipes/zod-validation.pipe.ts`), **filters**
  (`common/filters/http-exception.filter.ts` — the GlobalExceptionFilter that
  sanitizes errors), **interceptors** (`common/interceptors/audit.interceptor.ts`).
- **Exceptions**: `common/exceptions/business.exception.ts` — every error is a
  `BusinessException(status, message, 'errors.<module>.<key>')` (`CLAUDE.md`
  #17/#18), never a raw Nest exception.
- **Enums** (`common/enums/`): the `Permission` enum (`permission.enum.ts`), AI
  agent/feature enums, etc. Shared utilities in `common/utils/*.utility.ts`
  (`encryption.utility.ts`, `ssrf.utility.ts`, `date-time.utility.ts`,
  `es-sanitize.utility.ts`, `redaction.utility.ts`, …).

**DB** — `apps/api/prisma/`: `schema.prisma`, `migrations/`, `seed.ts`.
**Config** — `src/config/env.validation.ts` (Zod env schema; rejects all-zero
secrets and validates at boot).

---

## What rules apply (read before editing)

Always load `rules/global/*`, then the **backend** area rules in
[`../rules/backend/`](../rules/backend/):

- [`layering-rules.md`](../rules/backend/layering-rules.md) — Controller →
  Service → Repository → Utilities; declarations live in their home file.
- [`tenant-permission-rules.md`](../rules/backend/tenant-permission-rules.md) —
  the guard chain, `tenantId` scoping, `@RequirePermission`, GLOBAL_ADMIN bypass,
  the 9-step end-to-end permission change.
- [`dto-validation-rules.md`](../rules/backend/dto-validation-rules.md) — Zod
  DTOs, `.max()` on every string/array, JSON-field size caps, query parsing.
- [`prisma-rules.md`](../rules/backend/prisma-rules.md) — migrations, append-only
  ledger, indexing, idempotent seeds, BigInt serialization, bounded pool.
- [`api-rules.md`](../rules/backend/api-rules.md) — routing, error shape,
  pagination, rate-limit tiers, proxy-route pairing.

Global: [`../rules/global/absolute-rules.md`](../rules/global/absolute-rules.md),
[`branch-safety.md`](../rules/global/branch-safety.md),
[`repo-navigation.md`](../rules/global/repo-navigation.md),
[`validation-gates.md`](../rules/global/validation-gates.md). Security:
[`../rules/security/`](../rules/security/) (`security-rules.md`,
`secret-handling.md`, `ai-security.md`). AI work also loads
[`../rules/ai/`](../rules/ai/) (`ai-output-rules.md`, `ai-approval-rules.md`,
`ai-agent-rules.md`).

**Invariants that govern every backend change (from [`../AGENTS.md`](../AGENTS.md) §6–§7):**

- **Tenant isolation** — every tenant-owned `findMany`/`findFirst`/`update`/
  `delete` is scoped by `tenantId`. `update`/`delete` use a compound
  `where: { id, tenantId }` (via `updateMany`/`deleteMany`), **never `id` alone**
  (`CLAUDE.md` #8/#26). Sub-resources validate parent ownership first (#75). No
  cross-tenant data, ever.
- **RBAC** — every endpoint carries `@RequirePermission(Permission.MODULE_ACTION)`
  (`CLAUDE.md` #25). A missing decorator **fails open** in `PermissionsGuard` —
  that is a silent auth hole, so every endpoint needs one (or `@Public()`).
  GLOBAL_ADMIN bypass lives **only** in the guard — never add a role check in a
  service/repo/utility.
- **No auth / secret / permission bypass** in any environment — no `NODE_ENV`
  shortcuts (`CLAUDE.md` #23/#56). Secrets env-loaded, no fallbacks (#24/#53/#54).
- **AI safety** — destructive AI actions are **approval-required**: persist an
  `ApprovalRequest` before executing (`CLAUDE.md` #97). **Never render raw AI
  output as HTML.** Redact PII/secrets before model calls; AI investigation
  validates alert tenant ownership (#48).
- **No `any`** (`@typescript-eslint/no-explicit-any: error`), no `eslint-disable`,
  no `@ts-ignore`, no non-null `!`, no raw string literals where an enum exists
  (`CLAUDE.md` #1/#2/#12). Declarations never inline (#13). pnpm only, Node 22.

---

## What skills apply (recipes for the work)

Match your task to a recipe in [`../skills/backend/`](../skills/backend/) (each
opens with "Read `AGENTS.md` first"):

- Add an endpoint → [`add-endpoint.md`](../skills/backend/add-endpoint.md)
- Add a whole module → [`add-module.md`](../skills/backend/add-module.md)
- Add a permission end-to-end (backend + web) →
  [`add-permission.md`](../skills/backend/add-permission.md)
- Add a Prisma model → [`add-prisma-model.md`](../skills/backend/add-prisma-model.md)
- Add a connector type → [`add-connector.md`](../skills/backend/add-connector.md)
- Add a background job → [`add-background-job.md`](../skills/backend/add-background-job.md)

Cross-area: a backend endpoint the UI calls needs a frontend proxy
([`../skills/frontend/add-api-client.md`](../skills/frontend/add-api-client.md))
and i18n keys ([`../skills/frontend/add-i18n-key.md`](../skills/frontend/add-i18n-key.md)).
Validate before shipping → [`../skills/qa/validate-release.md`](../skills/qa/validate-release.md).

---

## What docs to read

- [`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) — **authoritative** backend
  rule list + ESLint config. Read it before any non-trivial change.
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) (+ `docs/architecture/`) —
  BFF structure, layering, data flow.
- [`../docs/API.md`](../docs/API.md) — endpoint/contract reference.
- [`../docs/SECURITY.md`](../docs/SECURITY.md) (+ `docs/security/`) — token
  lifecycle, tenant isolation, RBAC, SSRF, encryption.
- [`../docs/AI.md`](../docs/AI.md) (+ `docs/ai/`) — AI providers, agents, memory,
  approval governance.
- [`../memory/TECHNICAL_MEMORY.md`](../memory/TECHNICAL_MEMORY.md) and
  [`../memory/SECURITY_MEMORY.md`](../memory/SECURITY_MEMORY.md) — stable
  technical/security truths; [`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md)
  for the full command list.

---

## Common mistakes

- **Calling Prisma from a service** — services never import `PrismaService`; all
  data access goes through the repository (`CLAUDE.md` #14a). The repository is
  the only Prisma boundary.
- **Putting logic in the controller** — no `try/catch`, no `throw`, no transforms;
  one service call and return (`CLAUDE.md` #14). Errors flow up via
  `BusinessException` → `GlobalExceptionFilter`.
- **`where: { id }` without `tenantId`** on a tenant-owned model — cross-tenant
  read/write. Always `{ id, tenantId }` (`CLAUDE.md` #26). A bare
  `findUnique({ where: { id } })` is a review blocker unless the row is genuinely
  global.
- **Endpoint with no `@RequirePermission`** — `PermissionsGuard` lets it through
  (fails open). Add the decorator (or `@Public()` + document it).
- **Adding a permission partially** — it must land in **one** change: backend enum
  → `permission-definitions.ts` (`labelKey` + unique `sortOrder`) →
  `default-permissions.ts` → `@RequirePermission()` → Prisma migration using
  **`WHERE NOT EXISTS`** (never `ON CONFLICT ("key")` — the unique key is compound
  `(tenantId, key)`) → frontend enum mirror → proxy route → i18n ×6 →
  `npx prisma db seed`. See [`add-permission.md`](../skills/backend/add-permission.md).
- **Schema change without a migration** — `tsc` passes, prod 500s on the missing
  table. Generate the migration (`pnpm prisma:migrate` / `migrate diff`); never
  edit an applied migration (append-only ledger).
- **Unbounded Zod fields** — every string needs `.max()`, every array needs
  `.max()`, JSON/record fields need a `.refine()` size cap (`CLAUDE.md` #27/#28/#78).
- **Raw `@Query()` typed as a DTO** — Nest skips Zod; parse manually with
  `Schema.parse(rawQuery)` (`CLAUDE.md` #19). Don't put `@UsePipes()` on a method
  with `@Param()` (#16).
- **Raw string literals / inline declarations** — use enums (`CaseStatus.ACTIVE`,
  not `'active'`); move `interface`/`type`/`enum`/`const`/`function` to their
  home file (`CLAUDE.md` #12/#13). All ESLint-enforced.
- **Leaking a GLOBAL_ADMIN / role check into a service** — authorization stays in
  the guard; spreading it duplicates trust boundaries.
- **Returning a raw `BigInt`** — `JSON.stringify(1n)` throws; serialize to
  `string` (or `Number()` only when overflow is impossible) in the utility layer.
- **Hardcoding one AI provider** — routing cascades
  (Bedrock → LLM APIs → OpenClaw Gateway), falling back to a clearly-labeled
  `rule-based` response only when none are configured.

---

## Validation commands

Run from **repo root** (pnpm only, Node 22). Full list:
[`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
pnpm install            # install workspace deps
pnpm typecheck          # blocking gate (tsc --noEmit across the workspace)
pnpm build              # blocking gate (includes nest build for apps/api)
pnpm lint               # advisory — run + annotate (enforces the backend rules)
pnpm format:check       # advisory
pnpm test               # unit tests (advisory)
pnpm test:e2e           # e2e (advisory)
pnpm validate           # typecheck + lint + format:check
pnpm prisma:generate    # regenerate the Prisma client after schema edits
pnpm prisma:migrate     # create/apply a dev migration
pnpm prisma:seed        # idempotent seed
```

Backend-scoped equivalents (`apps/api/package.json`): `npm run typecheck`,
`npm run lint:strict`, `npm run build`, `npm run validate`, `npm run test:e2e`.

**Hard gates (must pass):** `pnpm typecheck` · `pnpm build` · Docker image builds
· gitleaks (no secrets) · CodeQL. **Advisory** gates (`lint`, `format:check`,
`test`, `audit`) are non-blocking today due to tracked debt — still run and
annotate. See [`../rules/testing/quality-gates.md`](../rules/testing/quality-gates.md)
and [`../docs/audit/02-risk-register.md`](../docs/audit/02-risk-register.md).

> **Never claim a gate is green without running it.** Report exactly what passed,
> what failed, and any blocker — per [`../AGENTS.md`](../AGENTS.md) §5 and §13.
