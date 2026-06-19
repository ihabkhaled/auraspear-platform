# Skill: Add a NestJS endpoint (`apps/api`)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order + invariants), then the
> backend rules in [`rules/backend/`](../../rules/backend/) — especially
> [`layering-rules.md`](../../rules/backend/layering-rules.md),
> [`tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md),
> [`dto-validation-rules.md`](../../rules/backend/dto-validation-rules.md), and
> [`api-rules.md`](../../rules/backend/api-rules.md). Then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (the ~100 ABSOLUTE RULES — they are
> ESLint-enforced and will block your commit). Sibling onboarding:
> [`skills/`](../), [`rules/`](../../rules/), [`memory/`](../../memory/),
> [`context/`](../../context/), [`docs/`](../../docs/). Stable truths:
> [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md),
> [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md).
>
> **No AI agent may edit first and understand later.** Inspect the reference module
> below, copy it end-to-end, then adapt. Do not invent file layouts, decorators, or
> exception shapes — the linter and the `GlobalExceptionFilter` are strict.

This recipe adds an HTTP endpoint to an existing (or new) module at
`apps/api/src/modules/<m>` following the platform's strict layering:
**Controller (route + delegate) → Service (orchestrate) → Repository (tenant-scoped
data access) → Prisma**, with a Zod DTO, `@RequirePermission`, `@Throttle`, and a
matching Next.js proxy route in `apps/web`. `<m>` is the module placeholder (replace
with your real name, e.g. `runbooks`).

---

## When to use

Use this skill when you need to add a **new HTTP route** to the NestJS BFF:

- A new endpoint on an existing module (`GET`/`POST`/`PATCH`/`DELETE` on tenant-scoped
  data), or a brand-new module under `apps/api/src/modules/<m>`.
- An endpoint the Next.js frontend will call (it then **must** get a proxy route — rule
  86 in `apps/api/CLAUDE.md`).

**Do not** use this skill for:

- A **new permission** the endpoint enforces → that is an end-to-end change (enum,
  definitions, defaults, migration, seed, frontend mirror). Do
  [`skills/backend/add-permission.md`](add-permission.md) **first**, then return here to
  attach `@RequirePermission(...)`.
- A **new Prisma model / column** the endpoint reads or writes → do
  [`skills/backend/add-prisma-model.md`](add-prisma-model.md) first (schema + migration +
  seed).
- An **AI endpoint** (chat / investigate / agent task) → still follows this layering, but
  add the AI rules: `@Throttle({ default: { limit: 10, ttl: 60000 } })` at controller
  level (rule 33), provenance in the response, and **approval-required** persistence for
  any destructive action (`AGENTS.md` §7). See [`skills/ai/add-ai-feature.md`](../ai/add-ai-feature.md).

---

## Files to inspect first (copy the closest one end-to-end)

The **`cases` module** is the canonical, full-featured reference — copy its shape:

| Layer         | Reference file                                                                     |
| ------------- | ---------------------------------------------------------------------------------- |
| Controller    | `apps/api/src/modules/cases/cases.controller.ts`                                   |
| Service       | `apps/api/src/modules/cases/cases.service.ts`                                      |
| Repository    | `apps/api/src/modules/cases/cases.repository.ts`                                   |
| Utilities     | `apps/api/src/modules/cases/cases.utilities.ts`                                    |
| Types         | `apps/api/src/modules/cases/cases.types.ts`                                        |
| Module wiring | `apps/api/src/modules/cases/cases.module.ts`                                       |
| Zod DTO       | `apps/api/src/modules/cases/dto/create-case.dto.ts`, `dto/list-cases-query.dto.ts` |

Shared infrastructure you will import (do **not** reinvent):

| Concern               | File                                                                                |
| --------------------- | ----------------------------------------------------------------------------------- |
| `@RequirePermission`  | `apps/api/src/common/decorators/permission.decorator.ts`                            |
| `@TenantId()`         | `apps/api/src/common/decorators/tenant-id.decorator.ts`                             |
| `@CurrentUser()`      | `apps/api/src/common/decorators/current-user.decorator.ts`                          |
| Guards                | `apps/api/src/common/guards/auth.guard.ts`, `tenant.guard.ts`                       |
| Zod pipe              | `apps/api/src/common/pipes/zod-validation.pipe.ts`                                  |
| `BusinessException`   | `apps/api/src/common/exceptions/business.exception.ts`                              |
| `Permission` enum     | `apps/api/src/common/enums/permission.enum.ts` (barrel: `../../common/enums`)       |
| `JwtPayload`          | `apps/api/src/common/interfaces/authenticated-request.interface.ts`                 |
| Module registration   | `apps/api/src/app.module.ts` (only if you create a **new** module)                  |
| Frontend proxy helper | `apps/web/src/lib/backend-proxy.ts` (`proxyToBackend`)                              |
| i18n error keys       | `apps/api/src/i18n/en.json` + `ar.json`, `es.json`, `fr.json`, `de.json`, `it.json` |

---

## Exact step-by-step implementation

> Replace `<m>` with the module (e.g. `runbooks`), `<X>` with the resource
> (e.g. `Runbook`), and `<action>` with the verb (e.g. `create`).

### 1. Zod DTO — `apps/api/src/modules/<m>/dto/<action>-<m>.dto.ts`

Every string field needs `.max()` (rule 27); every array field needs `.max()` (rule 28);
JSON/record fields need a `.refine()` size cap (~64KB, rule 78). Export the inferred type.

```ts
import { z } from 'zod'

export const Create<X>Schema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(4096).optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  linkedIds: z.array(z.string().uuid()).max(500).optional(),
})

export type Create<X>Dto = z.infer<typeof Create<X>Schema>
```

For **list/query** endpoints make a separate `list-<m>-query.dto.ts` with `page`,
`limit`, `sortBy` (`z.enum([...])`), `sortOrder`. Never type `@Query()` with a DTO
directly (rule 19) — parse the raw record in the controller (step 4). Any `sortBy` value
must also be handled in a `build<X>OrderBy()` utility (rule 87).

### 2. Repository method — `apps/api/src/modules/<m>/<m>.repository.ts`

Pure data access. **Every method takes `tenantId`.** No business logic, no conditionals,
no `throw`/`BusinessException` (rule 14b). Accept fully-built params, return raw Prisma
results. Every `create`/`update`/`delete` is scoped by `tenantId` (rules 8, 26):

```ts
async create<X>(tenantId: string, data: Prisma.<X>UncheckedCreateInput): Promise<<X>> {
  return this.prisma.<x>.create({ data: { ...data, tenantId } })
}

async find<X>ByIdAndTenant(id: string, tenantId: string): Promise<<X> | null> {
  return this.prisma.<x>.findFirst({ where: { id, tenantId } })
}

async update<X>(id: string, tenantId: string, data: Prisma.<X>UpdateInput): Promise<<X>> {
  return this.prisma.<x>.update({ where: { id, tenantId }, data }) // never `where: { id }` alone
}
```

### 3. Service method — `apps/api/src/modules/<m>/<m>.service.ts`

Thin orchestrator: **validate → call utility → call repo → return** (rule 14a). Inject the
repository (never `PrismaService`). Each method ≤ 30 lines, cyclomatic complexity ≤ 10 —
extract any 3–5 lines of cohesive logic into `<m>.utilities.ts`. Throw **only**
`BusinessException` with a `messageKey` (rules 17, 18) — never raw Nest exceptions.

```ts
async create<X>(dto: Create<X>Dto, user: JwtPayload): Promise<<X>> {
  await this.validateOwnerInTenant(dto, user.tenantId) // util/repo, throws BusinessException
  return this.<m>Repository.create<X>(user.tenantId, build<X>CreatePayload(dto, user))
}

async get<X>ById(id: string, tenantId: string): Promise<<X>> {
  const record = await this.<m>Repository.find<X>ByIdAndTenant(id, tenantId)
  if (!record) {
    throw new BusinessException(404, `<X> ${id} not found`, 'errors.<m>.notFound')
  }
  return record
}
```

`BusinessException` signature: `new BusinessException(status, message, messageKey, errors?)`.
`messageKey` follows `errors.<m>.<specificAction>` (e.g. `errors.<m>.notFound`).

### 4. Controller route — `apps/api/src/modules/<m>/<m>.controller.ts`

Thin: route + validate + delegate to **one** service method and return. **No** `try/catch`,
**no** `throw`, no transforms, no inline constants (rule 14 — ESLint-enforced). Mirror the
class-level guards/throttle and per-route decorators from `cases.controller.ts`:

```ts
@Controller('<m>')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } }) // Standard CRUD tier (rule 80)
export class <X>Controller {
  constructor(private readonly <m>Service: <X>Service) {}

  @Get()
  @RequirePermission(Permission.<M>_VIEW)
  async list(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<Paginated<X>> {
    const { page, limit, sortBy, sortOrder } = List<X>QuerySchema.parse(rawQuery) // rule 19
    return this.<m>Service.list(tenantId, page, limit, sortBy, sortOrder)
  }

  @Post()
  @RequirePermission(Permission.<M>_CREATE)
  async create(
    @Body(new ZodValidationPipe(Create<X>Schema)) dto: Create<X>Dto, // pipe on @Body only (rule 16)
    @CurrentUser() user: JwtPayload
  ): Promise<<X>> {
    return this.<m>Service.create<X>(dto, user)
  }

  @Delete(':id')
  @RequirePermission(Permission.<M>_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // Delete tier (rule 80)
  async remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.<m>Service.delete<X>(id, tenantId, user)
  }
}
```

Rate-limit tiers (rule 80): Standard CRUD `30/min`, Bulk `5/min`, Delete `10/min`,
AI `10/min`, Auth `5/min`. Every mutating controller needs `@Throttle()` (rule 74).
For nested routes (`/<m>/:id/children/:childId`), validate parent tenant ownership
before touching the child (rule 75).

### 5. Wire the module — `apps/api/src/modules/<m>/<m>.module.ts`

Register the controller and providers (repo + service). Import `PrismaModule` if it is a
new module. If it is a **new** module, also add it to `imports` in
`apps/api/src/app.module.ts`.

```ts
@Module({
  imports: [PrismaModule],
  controllers: [<X>Controller],
  providers: [<X>Repository, <X>Service],
  exports: [<X>Service],
})
export class <X>Module {}
```

### 6. i18n keys — all 6 locale files

For **every** new `messageKey` (e.g. `errors.<m>.notFound`), add the translation to ALL six
files (rule 49): `apps/api/src/i18n/en.json`, `ar.json`, `es.json`, `fr.json`, `de.json`,
`it.json`. A missing key breaks frontend `t(messageKey)` rendering.

### 7. Frontend proxy route — `apps/web/src/app/api/<m>/route.ts` (rule 86)

Every backend endpoint the frontend calls **must** have a matching Next.js proxy route, or
the call returns a 404 HTML page instead of JSON. Use `proxyToBackend` — never call the BFF
directly, and never forward client `X-Role`/auth headers (web rules 41).

```ts
import { type NextRequest } from 'next/server'
import { proxyToBackend } from '@/lib/backend-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyToBackend(request, { path: '/<m>' })
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, { path: '/<m>' })
}
```

For path params, create `apps/web/src/app/api/<m>/[id]/route.ts` and await `params`:

```ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return proxyToBackend(request, { path: `/<m>/${id}` })
}
```

---

## Validation commands (real `pnpm` commands — run from repo root)

Run these and read the output. **Never claim a gate is green without running it**
(`AGENTS.md` §5).

```bash
pnpm typecheck        # HARD gate — must pass (both apps)
pnpm lint             # advisory but enforced for new code; many rules above are errors
pnpm format:check     # Prettier (no semicolons, single quotes, width 100)
pnpm test             # unit tests
pnpm build            # HARD gate — must pass
```

Backend-only iteration (faster) — from `apps/api`:

```bash
pnpm --filter @auraspear/api typecheck
pnpm --filter @auraspear/api lint:strict   # zero-warnings; this is what CI-quality code must pass
pnpm --filter @auraspear/api test
```

If you touched Prisma (you should have done [`add-prisma-model.md`](add-prisma-model.md)
first), also: `pnpm prisma:generate`. If you added a permission, run `pnpm prisma:seed`
(per [`add-permission.md`](add-permission.md)).

---

## Docs to update

- **i18n**: all 6 `apps/api/src/i18n/*.json` files (every new `messageKey`) — step 6 above.
- **Module README / endpoint inventory**: if the module or `docs/` lists endpoints
  (`docs/PRODUCT.md`, `docs/ARCHITECTURE.md`, or a module-level doc), add the new route.
- **AGENTS.md recipe table** (`§11`): only if you introduce a genuinely new kind of task.
- **ADR** (`docs/decisions/`): only if the endpoint introduces a new architectural pattern
  (new cross-module dependency, new outbound integration, new auth model).
- **Tests**: add/extend `__tests__/<m>.service.spec.ts` and any e2e spec; do not leave the
  endpoint untested.

---

## Security checks (the non-negotiable invariants)

- **Tenant isolation**: every repo `findFirst`/`update`/`delete` is scoped by `tenantId`;
  never `where: { id }` alone (rules 8, 26). Resolve `tenantId` from `@TenantId()` /
  `user.tenantId`, **never** from the request body or a client header.
- **RBAC**: every route has `@RequirePermission(Permission.<M>_<ACTION>)` (rule 25). No
  endpoint ships without it. GLOBAL_ADMIN passes automatically — do not special-case it.
- **No auth/secret/permission bypass**: no `NODE_ENV`-gated shortcuts (rules 23, 56); no
  client-supplied `X-Role` (rule 76); no hardcoded/fallback secrets (rule 24).
- **AI / destructive actions**: any AI-initiated destructive action is **approval-required** —
  persist an `ApprovalRequest` before execution (rule 97, `AGENTS.md` §7). AI endpoints get
  the `10/min` throttle (rule 33).
- **DoS limits**: every string `.max()`, every array `.max()`, JSON fields `.refine()` ≤ 64KB
  (rules 27, 28, 78). Mutations are throttled (rule 74).
- **Error hygiene**: only `BusinessException` with `messageKey`; no raw paths, stack traces,
  table/column names, or internal URLs in responses (rules 44, 77, 81). The
  `GlobalExceptionFilter` sanitizes — do not bypass it by returning errors from the
  controller.
- **SSRF**: any user-supplied URL is validated via `ssrf.utility.ts` at input time before
  storage/use (rules 59, 95).
- Run [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md) /
  `pnpm scan:secrets` before opening a PR.

---

## Common mistakes (each one is an ESLint error or a runtime/security bug)

- Business logic, `try/catch`, or `throw` in the controller → move to the service
  (rule 14, ESLint-enforced on controller files).
- `PrismaService` imported in the service → must go through the repository (rule 14a).
- `BusinessException`/conditionals/transforms in the repository → it is pure data access
  only (rule 14b).
- Service method > 30 lines or complexity > 10 → extract utilities into `<m>.utilities.ts`
  (rule 14a, ESLint warns).
- Inline `interface`/`type`/`enum`/`const`/helper function in a service/controller/repo →
  move to `<m>.types.ts`, `<m>.enums.ts`, `<m>.constants.ts`, `<m>.utilities.ts` (rule 13).
- Raw string literals like `'critical'` instead of an enum (rule 12).
- `@Query()` typed with a DTO directly, or `@UsePipes()` at method level alongside
  `@Param()` → parse with `Schema.parse(rawQuery)` and put the pipe on `@Body` only
  (rules 16, 19).
- A Zod string/array field without `.max()` (rules 27, 28).
- `update`/`delete` by `id` alone (missing `tenantId`) → cross-tenant write (rule 26).
- Missing `@RequirePermission` (rule 25) or missing `@Throttle` on a mutation (rules 74, 80).
- Raw Nest exceptions (`NotFoundException`, etc.) instead of `BusinessException` (rules 17, 18).
- New `messageKey` added to only `en.json` → must be in all 6 locale files (rule 49).
- Forgetting the frontend proxy route → frontend gets 404 HTML, not JSON (rule 86).
- `any`, `==`/`!=`, `!` non-null assertion, `console.log`, `.util.ts`/`.utils.ts`
  filenames, abbreviations (`param`, `utils`) → all ESLint errors (`apps/api/CLAUDE.md`).
- Claiming "green" without running `pnpm typecheck` / `pnpm build` (`AGENTS.md` §5, §13).

---

## Final checklist

- [ ] Read `AGENTS.md`, `rules/backend/*`, and `apps/api/CLAUDE.md` before editing.
- [ ] Permission exists (did [`add-permission.md`](add-permission.md) if new) and is on the
      route via `@RequirePermission`.
- [ ] Prisma model/column exists (did [`add-prisma-model.md`](add-prisma-model.md) if new).
- [ ] DTO in `dto/<action>-<m>.dto.ts`: every string `.max()`, every array `.max()`, JSON
      `.refine()`; inferred type exported. `@Query()` parsed manually.
- [ ] Repository method takes `tenantId`; all writes scoped `where: { id, tenantId }`; no
      logic/throws.
- [ ] Service is thin (≤ 30 lines, complexity ≤ 10); uses the repo not Prisma; throws only
      `BusinessException` with `errors.<m>.<key>`.
- [ ] Controller routes + delegates only; correct `@Throttle` tier; no `try/catch`/`throw`.
- [ ] Module wired (`controllers`, `providers`, `exports`); added to `app.module.ts` if new.
- [ ] `messageKey`s added to all 6 `apps/api/src/i18n/*.json` files.
- [ ] Frontend proxy route(s) created under `apps/web/src/app/api/<m>/...` using
      `proxyToBackend`.
- [ ] Tests added/updated in `__tests__/`.
- [ ] Ran and pasted output for `pnpm typecheck` and `pnpm build` (hard gates) plus
      `pnpm lint` / `pnpm test`. Did not say "green" without evidence.
- [ ] Final response uses the `AGENTS.md` §13 report format (Branch / Commits / Files /
      Commands run / Green checks / Failed checks / Blockers / Risks / Next steps).
