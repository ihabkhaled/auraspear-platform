# Skill: Add a NestJS module (`apps/api`)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order + the security/AI/branch
> invariants), then the backend rules in [`rules/backend/`](../../rules/backend/) —
> especially [`layering-rules.md`](../../rules/backend/layering-rules.md),
> [`api-rules.md`](../../rules/backend/api-rules.md),
> [`dto-validation-rules.md`](../../rules/backend/dto-validation-rules.md),
> [`tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md), and
> [`prisma-rules.md`](../../rules/backend/prisma-rules.md). Always-on:
> [`rules/global/absolute-rules.md`](../../rules/global/absolute-rules.md),
> [`rules/global/branch-safety.md`](../../rules/global/branch-safety.md),
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md), and
> [`rules/security/security-rules.md`](../../rules/security/security-rules.md). Then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — the ~100 ABSOLUTE RULES are
> ESLint-enforced and **will block your commit**. Sibling onboarding:
> [`skills/`](../), [`memory/`](../../memory/), [`context/`](../../context/),
> [`docs/`](../../docs/). Stable truths: [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md),
> [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md).
>
> **No AI agent may edit first and understand later.** Open the reference module below,
> copy it end-to-end, then adapt. Do not invent file layouts.

This recipe scaffolds a new feature module under `apps/api/src/modules/<module>/` with the
strict layered structure NestJS uses here (module → controller → service → repository →
utilities → types → enums → constants → dto → `__tests__`) and registers it in
`apps/api/src/app.module.ts`. `incidents` is the cleanest full-structure reference; mirror
it. The placeholder `<module>` is the kebab-case route/folder name (e.g. `runbooks`),
`<Module>` is the PascalCase class prefix (e.g. `Runbooks`).

---

## When to use

Use this skill when you need a **new cohesive backend feature area** with its own data
access, endpoints, and types — for example a new SOC resource (`runbooks`, `watchlists`,
`playbook-templates`). The module owns one bounded responsibility and exposes it via a
NestJS `@Controller`.

**Do not** use this for:

- A single new endpoint on an **existing** module → use
  [`add-endpoint.md`](add-endpoint.md). Adding files to a module that already exists is not
  "scaffolding a module".
- A new **permission** the endpoints require → that is a separate end-to-end change:
  [`add-permission.md`](add-permission.md) (CLAUDE.md rule 85 — backend enum,
  `permission-definitions.ts`, `default-permissions.ts`, migration, frontend mirror, proxy,
  i18n ×6, seed — all atomic). Reuse an existing `Permission.*` if one fits.
- A new **Prisma model** the repository reads → do that first:
  [`add-prisma-model.md`](add-prisma-model.md) (schema + migration + seed). A repository
  with no model cannot compile.
- An **AI** feature/subsystem → [`../ai/add-ai-feature.md`](../ai/add-ai-feature.md) (feature
  catalog, provider cascade, provenance, approval categories are extra requirements).

---

## Files to inspect first (copy the closest one)

Open these and mirror them exactly. `incidents` is the canonical full module.

| Concern                                                          | Reference file                                                               |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Module (`@Module`, providers, exports, `forwardRef`)             | `apps/api/src/modules/incidents/incidents.module.ts`                         |
| Controller (route + delegate only)                               | `apps/api/src/modules/incidents/incidents.controller.ts`                     |
| Service (thin orchestrator, `ServiceLogger`)                     | `apps/api/src/modules/incidents/incidents.service.ts`                        |
| Repository (pure Prisma, every method takes `tenantId`)          | `apps/api/src/modules/incidents/incidents.repository.ts`                     |
| Utilities (all business logic — mappers, where/orderBy builders) | `apps/api/src/modules/incidents/incidents.utilities.ts`                      |
| Types (`*.types.ts`, no inline interfaces elsewhere)             | `apps/api/src/modules/incidents/incidents.types.ts`                          |
| Constants (`*.constants.ts`, sort-field maps)                    | `apps/api/src/modules/incidents/incidents.constants.ts`                      |
| Create/Update DTO (Zod, `.max()` on every string/array)          | `apps/api/src/modules/incidents/dto/create-incident.dto.ts`                  |
| List query DTO (parse manually, never `@Query()` typed)          | `apps/api/src/modules/incidents/dto/list-incidents-query.dto.ts`             |
| Tests (`__tests__/*.spec.ts`, mocked repo)                       | `apps/api/src/modules/notifications/__tests__/notifications.service.spec.ts` |
| Root registration (the `imports:` array)                         | `apps/api/src/app.module.ts` (lines ~105–146)                                |
| `Permission` enum (reuse or add via add-permission skill)        | `apps/api/src/common/enums/permission.enum.ts`                               |
| Module enums file (only if you need new literals)                | a `<module>.enums.ts`, or shared `apps/api/src/common/enums/`                |

**Hard architecture facts (ESLint-enforced — see `apps/api/CLAUDE.md` rules 12–14c, 17, 25, 26, 67):**

- **Controllers** only route and delegate: call exactly **one** service method and return.
  No `try/catch`, no `throw`, no business logic, no transforms, no inline constants
  (`no-restricted-syntax` bans `TryStatement`/`ThrowStatement` in `*.controller.ts`).
- **Services** are thin orchestrators: validate → util → repo → return. **Never import
  `PrismaService`.** No method > 30 lines, cyclomatic complexity ≤ 10. Extract every 3–5
  lines of cohesive logic to `<module>.utilities.ts` (`max-lines-per-function`, `complexity`).
- **Repositories** are pure data access: accept fully-built params, return raw Prisma
  results, **every method takes `tenantId`**, no conditionals, no `throw`/`BusinessException`.
- **Utilities** export pure named functions only — no interfaces/types/enums/constants.
- No inline `interface`/`type`/`enum`/`const`/`function` in logic files (rule 13): types →
  `<module>.types.ts`, enums → `<module>.enums.ts` (or `src/common/enums/`), constants →
  `<module>.constants.ts`, helpers → `<module>.utilities.ts`.
- All files **kebab-case**; use the full word `utilities` (never `utils`/`util` —
  `unicorn/prevent-abbreviations`). No `any`, no `!`, no `==`, no `console.log`, `node:`
  import prefix, explicit return types on every function.

---

## Exact step-by-step implementation

Run everything from repo root. **pnpm only, Node 22.** Replace `<module>` (kebab) and
`<Module>` (PascalCase) consistently. Match Prettier: **no semicolons, single quotes,
width 100, no trailing semicolons** (`apps/api` `.prettierrc`).

### 0. Branch (never work on `main`/`master`)

```bash
git checkout -b feat/api-<module>-module
```

### 1. Confirm prerequisites exist

- The Prisma model the repository will read exists in `apps/api/prisma/schema.prisma` (and
  has a migration). If not, do [`add-prisma-model.md`](add-prisma-model.md) first.
- A `Permission.*` value exists for each endpoint in
  `apps/api/src/common/enums/permission.enum.ts`. If you need a new one, complete
  [`add-permission.md`](add-permission.md) end-to-end (rule 85) before wiring the endpoint.

### 2. Create the folder and files

```bash
mkdir -p apps/api/src/modules/<module>/dto apps/api/src/modules/<module>/__tests__
```

Create these files (copy the matching `incidents` file and adapt):

```
apps/api/src/modules/<module>/
├── <module>.module.ts          # @Module: imports/controllers/providers/exports
├── <module>.controller.ts      # routes only; @RequirePermission + @Throttle on mutations
├── <module>.service.ts         # thin orchestrator; ServiceLogger; no PrismaService
├── <module>.repository.ts      # pure Prisma; every method takes tenantId
├── <module>.utilities.ts       # where/orderBy builders, mappers, validators (pure fns)
├── <module>.types.ts           # domain types (extend Prisma types; PaginatedResponse<…>)
├── <module>.enums.ts           # ONLY if you need module-local enums (else use common/enums)
├── <module>.constants.ts       # sort-field map, defaults
├── dto/
│   ├── create-<module>.dto.ts  # Zod; .max() on every string + array
│   ├── update-<module>.dto.ts  # usually CreateSchema.partial()
│   └── list-<module>-query.dto.ts  # page/limit coercion + sortBy enum + sortOrder
└── __tests__/
    ├── <module>.service.spec.ts
    ├── <module>.controller.spec.ts
    └── <module>.utilities.spec.ts
```

> Only create `<module>.enums.ts` if you genuinely need new literals. Reusable enums
> (`SortOrder`, status sets) usually already live in `apps/api/src/common/enums/` — import
> from `../../common/enums`. Remember rule 12: never use a raw string literal or a string
> literal **union** type — define/import an enum.

### 3. Types (`<module>.types.ts`)

Extend the generated Prisma types; do not redefine columns. Use the shared
`PaginatedResponse<T>` for list results. Mirror `incidents.types.ts`:

```ts
import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { Runbook } from '@prisma/client'

export type RunbookWithTenant = Runbook & { tenant: { name: string } }

export type PaginatedRunbooks = PaginatedResponse<Runbook>

export interface RunbookStats {
  total: number
  active: number
}
```

### 4. Constants (`<module>.constants.ts`)

Sort-field allow-list and defaults. The `sortBy` enum in the list DTO and this map must
agree (CLAUDE.md rule 87). Mirror `incidents.constants.ts`:

```ts
export const RUNBOOK_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  title: 'title',
}
```

### 5. DTOs (Zod — `dto/`)

No class-validator. **Every string field has `.max()`** (rule 27), **every array has
`.max()`** (rule 28), JSON/record fields get a `.refine()` ≤ 64KB (rule 78). Mirror
`create-incident.dto.ts`:

```ts
import { z } from 'zod'

export const CreateRunbookSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(4096).optional(),
  steps: z.array(z.string().max(2000)).max(200),
})

export type CreateRunbookDto = z.infer<typeof CreateRunbookSchema>
```

List query DTO — **never type `@Query()` directly** (rule 19); coerce numbers and constrain
`sortBy`/`sortOrder`. Mirror `dto/list-incidents-query.dto.ts`:

```ts
import { z } from 'zod'

export const ListRunbooksQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  query: z.string().max(255).optional(),
})
```

### 6. Repository (`<module>.repository.ts`)

Inject `PrismaService` (this is the **only** layer allowed to). Pure data access — accept
built params, return raw Prisma results, **every method takes `tenantId`**, no conditionals,
no `throw`. Mirror `incidents.repository.ts`:

```ts
import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type { Prisma, Runbook } from '@prisma/client'

@Injectable()
export class RunbooksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyAndCount(params: {
    where: Prisma.RunbookWhereInput
    orderBy: Prisma.RunbookOrderByWithRelationInput
    skip: number
    take: number
  }): Promise<[Runbook[], number]> {
    return Promise.all([
      this.prisma.runbook.findMany(params),
      this.prisma.runbook.count({ where: params.where }),
    ])
  }

  async updateScoped(
    id: string,
    tenantId: string,
    data: Prisma.RunbookUpdateInput
  ): Promise<Runbook> {
    return this.prisma.runbook.update({ where: { id, tenantId }, data })
  }
}
```

> **Tenant isolation (rule 26, AGENTS.md §6):** every `update()`/`delete()` `where` clause
> includes `tenantId` (`where: { id, tenantId }`) — never `id` alone. Every `findMany` is
> filtered by `tenantId` (built in the utility `where` builder). Batch ops chunk in 50s with
> `Promise.allSettled()` (rule 36).

### 7. Utilities (`<module>.utilities.ts`)

All business logic: the `where`-clause builder (always injects `tenantId`), the `orderBy`
builder (uses the constants sort map), mappers, validators. Pure exported functions with
explicit return types. Mirror `incidents.utilities.ts`.

```ts
import type { Prisma } from '@prisma/client'

export function buildRunbookWhereClause(
  tenantId: string,
  query?: string
): Prisma.RunbookWhereInput {
  const where: Prisma.RunbookWhereInput = { tenantId }
  if (query) {
    where.title = { contains: query, mode: 'insensitive' }
  }
  return where
}
```

### 8. Service (`<module>.service.ts`)

Thin orchestrator. Inject the repository (and `AppLoggerService` for `ServiceLogger`).
**Never inject/import `PrismaService`.** Throw only `BusinessException` with a `messageKey`
(rules 17, 18). Keep methods ≤ 30 lines / complexity ≤ 10 — extract to utilities. Mirror
`incidents.service.ts`:

```ts
import { Injectable, Logger } from '@nestjs/common'
import { RunbooksRepository } from './runbooks.repository'
import { buildRunbookWhereClause } from './runbooks.utilities'
import { AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import type { PaginatedRunbooks } from './runbooks.types'

@Injectable()
export class RunbooksService {
  private readonly logger = new Logger(RunbooksService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: RunbooksRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.RUNBOOKS, 'RunbooksService')
  }

  async list(
    tenantId: string,
    page: number,
    limit: number,
    query?: string
  ): Promise<PaginatedRunbooks> {
    const where = buildRunbookWhereClause(tenantId, query)
    const [items, total] = await this.repository.findManyAndCount({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return { data: items, meta: buildPaginationMeta(total, page, limit) }
  }
}
```

> `AppLogFeature.RUNBOOKS` must exist in `apps/api/src/common/enums/` — add the enum member
> (and its label) if your feature is new, since `ServiceLogger` requires a feature key.

### 9. Controller (`<module>.controller.ts`)

Route and delegate **only** — one service call per handler. Guards `AuthGuard, TenantGuard`
at class level; `@RequirePermission(Permission.MODULE_ACTION)` on **every** endpoint (rule
25); `@Throttle` on the class and tighter on mutations/deletes (rules 74, 80: CRUD 30/min,
delete 10/min, bulk 5/min). Validate bodies with `@Body(new ZodValidationPipe(Schema))`;
parse list queries manually (rule 19); never `@UsePipes()` with `@Param()` present (rule 16).
Mirror `incidents.controller.ts`:

```ts
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type CreateRunbookDto, CreateRunbookSchema } from './dto/create-runbook.dto'
import { ListRunbooksQuerySchema } from './dto/list-runbooks-query.dto'
import { RunbooksService } from './runbooks.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { PaginatedRunbooks } from './runbooks.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('runbooks')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class RunbooksController {
  constructor(private readonly runbooksService: RunbooksService) {}

  @Get()
  @RequirePermission(Permission.RUNBOOKS_VIEW)
  async list(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedRunbooks> {
    const { page, limit, query } = ListRunbooksQuerySchema.parse(rawQuery)
    return this.runbooksService.list(tenantId, page, limit, query)
  }

  @Post()
  @RequirePermission(Permission.RUNBOOKS_CREATE)
  async create(
    @Body(new ZodValidationPipe(CreateRunbookSchema)) dto: CreateRunbookDto,
    @CurrentUser() user: JwtPayload
  ): Promise<PaginatedRunbooks['data'][number]> {
    return this.runbooksService.create(dto, user)
  }
}
```

> `@TenantId()` returns the (possibly GLOBAL_ADMIN-switched) tenant from the validated JWT —
> never read tenant/role from client headers (rule 76). The global guard chain is
> Throttler → Auth → Csrf → Tenant → Roles → Permissions (`app.module.ts` providers).

### 10. Module (`<module>.module.ts`)

Wire controller + providers; export the service only if another module injects it. Use
`forwardRef(() => OtherModule)` for circular deps (the `incidents`/`orchestrator` pattern).
`PrismaModule` is global — do not re-import it. Mirror `incidents.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { RunbooksController } from './runbooks.controller'
import { RunbooksRepository } from './runbooks.repository'
import { RunbooksService } from './runbooks.service'

@Module({
  controllers: [RunbooksController],
  providers: [RunbooksRepository, RunbooksService],
  exports: [RunbooksService],
})
export class RunbooksModule {}
```

### 11. Register in `app.module.ts` (the step the task is named for)

Two edits in `apps/api/src/app.module.ts`:

1. Add the import alongside the other module imports (alphabetical-ish; `import-x/order`):

   ```ts
   import { RunbooksModule } from './modules/runbooks/runbooks.module'
   ```

2. Add `RunbooksModule,` to the `imports:` array under the `// Feature modules` block
   (currently ~lines 105–146). Without this, the controller routes never register and the
   endpoints 404.

### 12. Tests (`__tests__/*.spec.ts`)

Jest picks up `*.spec.ts` (`testRegex: ".*\\.spec\\.ts$"`). Unit-test the service with a
mocked repository and logger, and the utilities directly. Test files have relaxed ESLint
(no `any`/return-type enforcement). Mirror
`apps/api/src/modules/notifications/__tests__/notifications.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { RunbooksRepository } from '../runbooks.repository'
import { RunbooksService } from '../runbooks.service'

describe('RunbooksService', () => {
  let service: RunbooksService
  const mockRepository = { findManyAndCount: jest.fn(), updateScoped: jest.fn() }
  const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const moduleRef = await Test.createTestingModule({
      providers: [
        RunbooksService,
        { provide: RunbooksRepository, useValue: mockRepository },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile()
    service = moduleRef.get(RunbooksService)
  })

  it('scopes the where clause by tenantId', async () => {
    mockRepository.findManyAndCount.mockResolvedValue([[], 0])
    await service.list('tenant-1', 1, 20)
    expect(mockRepository.findManyAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1' }) })
    )
  })
})
```

---

## Validation commands (real pnpm commands, from repo root)

Run in order. **Never claim a gate green without running it** (AGENTS.md §5,
[`rules/global/validation-gates.md`](../../rules/global/validation-gates.md)).

```bash
pnpm install                              # if deps changed
pnpm --filter @auraspear/api prisma:generate   # if you added/changed Prisma usage
pnpm typecheck                            # HARD GATE (turbo → api tsc --noEmit). Must pass.
pnpm --filter @auraspear/api lint:strict  # ESLint --max-warnings 0. Enforces rules 1–100.
pnpm --filter @auraspear/api format:check # Prettier (no semicolons, single quotes, width 100).
pnpm --filter @auraspear/api test         # jest (your new *.spec.ts files).
pnpm build                                # HARD GATE (turbo → nest build). Must pass.
```

Single-module test while iterating:

```bash
pnpm --filter @auraspear/api exec jest src/modules/<module>
```

Full pre-PR sweep:

```bash
pnpm validate                             # turbo run typecheck lint:strict && pnpm format:check
```

Manual smoke (optional): `pnpm dev:api`, then hit the new route through the BFF.

> Hard gates that **must** be green: `pnpm typecheck`, `pnpm build`. `lint:strict` /
> `format:check` / `test` are advisory-but-expected (tracked debt is non-blocking, but you
> must run them and report results). See AGENTS.md §5 +
> [`rules/global/validation-gates.md`](../../rules/global/validation-gates.md).

---

## Docs to update

- Add the module/endpoints to [`docs/API.md`](../../docs/API.md) (the BFF contract).
- If it is a product-significant surface, note it in [`docs/PRODUCT.md`](../../docs/PRODUCT.md)
  and cross-check [`docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md) +
  [`docs/DOCS_INDEX.md`](../../docs/DOCS_INDEX.md).
- New pattern or notable decision → add an ADR under
  [`docs/decisions/`](../../docs/decisions/).
- Record durable conventions in [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md).
- If the frontend will consume these endpoints, each one needs a Next.js proxy route
  (rule 86) — follow [`../frontend/add-api-client.md`](../frontend/add-api-client.md) /
  [`../frontend/add-page.md`](../frontend/add-page.md).

---

## Security checks (must hold — AGENTS.md §6/§7)

- **Tenant isolation**: every repository `findMany` is filtered by `tenantId` (via the
  utility `where` builder), and **every `update()`/`delete()` includes `tenantId` in the
  `where`** (`{ id, tenantId }`, rule 26). No method returns cross-tenant data. Sub-resource
  endpoints validate parent ownership before touching children (rule 75).
- **RBAC**: every endpoint has `@RequirePermission(Permission.MODULE_ACTION)` (rule 25).
  Never bypass; GLOBAL_ADMIN passing is handled by the guard, not by you. Connector/infra
  mutations additionally require `@Roles(UserRole.TENANT_ADMIN)` (rule 55).
- **No auth/secret/permission bypass**: no `NODE_ENV`-gated shortcuts (rules 23, 56), no
  fallback/hardcoded secrets (rule 24), no client-forwarded role/tenant headers (rule 76).
- **Validation & DoS**: every Zod string `.max()` (rule 27), every array `.max()` (rule 28),
  JSON fields `.refine()` ≤ 64KB (rule 78); list queries parsed, not typed (rule 19); SSRF
  validation (`ssrf.utility.ts`) on any user-supplied URL (rule 59); ES query strings via
  `sanitizeEsQueryString()` (rule 79).
- **Errors & logs**: throw only `BusinessException` with an `errors.<module>.<key>`
  messageKey (rules 17, 18) and add that key to **all 6** i18n files if frontend-visible
  (rule 49); never leak paths/stack/table names (rules 44, 63, 77); credentials redacted in
  audit/structured logs (rules 57, 66).
- **AI destructive actions are approval-required**: if any method triggers a destructive
  security/infra action, it must create a persisted `ApprovalRequest` before executing
  (rule 97, AGENTS.md §7) — AI may suggest, not silently execute. **Never render raw AI
  output as HTML** (that is the frontend's job, but never emit HTML for it either).
- Touching auth/RBAC/data exposure? Run
  [`../devsecops/run-security-scan.md`](../devsecops/run-security-scan.md).

---

## Common mistakes

- **Forgetting to register the module** in `app.module.ts` `imports:` → routes 404 even
  though the files compile. This is the most common miss for this task.
- Importing `PrismaService` into the **service** → architecture violation; all data access
  goes through the repository (CLAUDE.md rule 14a).
- Business logic, `try/catch`, or `throw` in the **controller** → `no-restricted-syntax`
  ESLint error (rule 14). Controllers call one service method and return.
- A service method > 30 lines or complexity > 10 → `max-lines-per-function`/`complexity`
  warnings; extract to `<module>.utilities.ts`.
- `update()`/`delete()` by `id` alone (missing `tenantId`) → tenant-isolation breach
  (rule 26) and a security-review block.
- Inline `interface`/`type`/`enum`/`const`/`function` in a logic file, or a raw string
  literal / string-literal-union type → rules 12, 13 (`no-restricted-syntax`). Move to the
  dedicated home file; use an enum.
- Naming the file `<module>.utils.ts` / `*.util.ts` → `unicorn/prevent-abbreviations`
  requires `utilities`/`utility`.
- Typing `@Query()` with a DTO (rule 19) or using `@UsePipes()` with `@Param()` present
  (rule 16) → silent unvalidated input / broken path params.
- Missing `.max()` on a Zod string/array (rules 27, 28) or a missing
  `@RequirePermission`/`@Throttle` on a mutation (rules 25, 74) → lint/security block.
- Using a **new** `Permission.*` without completing the end-to-end add-permission flow
  (rule 85) → seed/migration drift; the permission won't exist in the DB.
- `any`, `!`, `==`, `console.log`, bare `crypto` import, semicolons → all ESLint/Prettier
  failures (CLAUDE.md rules 1–11).
- Claiming gates passed without running them (AGENTS.md §13).

---

## Final checklist

- [ ] Branch created (`feat/api-<module>-module`), not on `main`/`master`.
- [ ] Prisma model exists + migration applied (or N/A); needed `Permission.*` exists (or
      added end-to-end via add-permission).
- [ ] Folder `apps/api/src/modules/<module>/` with: `module`, `controller`, `service`,
      `repository`, `utilities`, `types`, `constants`, `dto/` (create + update + list query),
      `__tests__/`, and `enums` only if new literals are needed.
- [ ] Controller: class guards `AuthGuard, TenantGuard`; **every** endpoint
      `@RequirePermission`; `@Throttle` on class + tighter on mutations/deletes; routes only.
- [ ] Service: thin, `ServiceLogger`, **no `PrismaService`**, methods ≤ 30 lines, only
      `BusinessException` with messageKeys.
- [ ] Repository: pure Prisma, **every method takes `tenantId`**, `update`/`delete` scoped by
      `{ id, tenantId }`.
- [ ] Utilities: `where`/`orderBy` builders inject `tenantId` and use the constants sort map.
- [ ] DTOs: every string `.max()`, every array `.max()`, JSON `.refine()` ≤ 64KB; list query
      parsed manually with `sortBy` enum matching the constants map.
- [ ] **`RunbooksModule` (or your module) added to `app.module.ts` import + `imports:` array.**
- [ ] `__tests__/` cover the service (mocked repo) and utilities; tenant scoping asserted.
- [ ] `pnpm typecheck` ✅ and `pnpm build` ✅ (hard gates — actually run).
- [ ] `pnpm --filter @auraspear/api lint:strict`, `format:check`, and `test` run; results
      reported.
- [ ] Security: tenant-scoped everywhere, RBAC on every endpoint, no header trust, no
      secret/auth/`NODE_ENV` bypass, validation bounded, approval-required for destructive AI.
- [ ] Docs updated where relevant (`docs/API.md` / `docs/ARCHITECTURE.md` / ADR /
      `memory/TECHNICAL_MEMORY.md`); frontend proxy routes planned if consumed.
- [ ] Final response uses the AGENTS.md §13 template; no "all green" unless every required
      gate actually passed.
