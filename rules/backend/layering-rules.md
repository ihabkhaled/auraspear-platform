# Backend layering rules — Controller → Service → Repository → Utilities

> **Read `AGENTS.md` first** (repo root) for the AI loading order and the one
> rule: _no AI agent may edit first and understand later._ Then read
> `apps/api/CLAUDE.md` — it holds the 100 enforced backend rules and the full
> ESLint config (`eslint.config.mjs`) this file summarizes. Where this file and
> `apps/api/CLAUDE.md` overlap, the CLAUDE.md rule number is authoritative.

These are **hard constraints** for every NestJS module under
`apps/api/src/modules/**`. Most are ESLint `error`/`warn` via `no-restricted-syntax`,
`max-lines-per-function`, and `complexity`, and they block (or annotate) the
`pnpm lint` gate; type errors block `pnpm typecheck` — the single blocking gate
(`../global/validation-gates.md`). Code that breaks a rule below is wrong even if
it compiles and the endpoint responds.

Related: `../global/absolute-rules.md` §1 (type safety), §2 (auth/tenant/RBAC),
`../security/tenant-isolation.md`, `../security/rbac-rules.md`, and the recipes
`../../skills/backend/add-endpoint.md`, `add-permission.md`, `add-prisma-model.md`.
The canonical working module is `apps/api/src/modules/cases/` — copy its shape.

---

## 0. The flow (one direction, no skipping)

```
Controller → Service → Repository → Prisma
               ↓
           Utilities
```

- A layer may call **only the layer directly below it** plus Utilities.
- Controllers never touch the Repository or Prisma. Services never touch Prisma.
- The Repository is the **only** place `PrismaService` is imported
  (`apps/api/CLAUDE.md` §"Architecture Enforcement").
- Declarations (types/enums/constants/functions) live in their home file, never
  inline — see §5. This is ESLint-enforced (`apps/api/CLAUDE.md` rules 13, 14c).

Each module owns this file set (`apps/api/CLAUDE.md` §"File Structure Per Module"):

```
src/modules/<module>/
├── <module>.module.ts        # wires controller + providers
├── <module>.controller.ts    # route + delegate only
├── <module>.service.ts       # thin orchestrator (<30 lines/method)
├── <module>.repository.ts    # pure data access, tenantId on every method
├── <module>.utilities.ts     # all business logic (pure named functions)
├── <module>.types.ts         # interfaces/types
├── <module>.enums.ts         # enums
├── <module>.constants.ts     # constants
└── dto/<name>.dto.ts         # Zod schemas
```

---

## 1. Controller — route and delegate, nothing else

The controller binds HTTP to one service call and returns the result. It does
**not** contain business logic (`apps/api/CLAUDE.md` rule 14).

- **No `try/catch`.** `GlobalExceptionFilter` handles all errors — `TryStatement`
  is banned in controller files (`no-restricted-syntax`, rule 14).
- **No `throw`.** Errors come from the service via `BusinessException` —
  `ThrowStatement` is banned in controller files (rule 14).
- **No data transformation, no standalone functions, no inline constants.** Mapping
  a result for the response is the service/utilities' job, not the controller's.
- **Call exactly one service method and return it.** Parse the query/body, extract
  decorators, delegate.
- **Every endpoint has `@RequirePermission(Permission.MODULE_ACTION)`** from
  `@/common/decorators/permission.decorator` (rule 25; `../security/rbac-rules.md`).
  Mutations also carry `@Throttle(...)` (rules 74, 80).
- **Scope by tenant via `@TenantId()`**, never read it from the body/query
  (`apps/api/CLAUDE.md` §"Key Principles"; `../security/tenant-isolation.md`).
- **Validation belongs on the controller boundary.** Body: `@Body(new
ZodValidationPipe(Schema)) dto: Dto`. Query: parse manually with
  `Schema.parse(rawQuery)` — never type a raw `@Query()` as a DTO (rule 19), and
  never put `@UsePipes()` on a method that has `@Param()` (rule 16).

Real example — `apps/api/src/modules/cases/cases.controller.ts` `listCases`: it
calls `ListCasesQuerySchema.parse(rawQuery)`, then `this.casesService.listCases(...)`,
and returns. No logic, no try/catch, no throw.

```ts
@Get()
@RequirePermission(Permission.CASES_VIEW)
async listCases(
  @TenantId() tenantId: string,
  @Query() rawQuery: Record<string, string>
): Promise<PaginatedCases> {
  const { page, limit, sortBy, sortOrder, status } = ListCasesQuerySchema.parse(rawQuery)
  return this.casesService.listCases(tenantId, page, limit, sortBy, sortOrder, status)
}
```

## 2. Service — thin orchestrator (under 30 lines, no Prisma)

The service reads like a recipe: **validate → call util → call repo → return**
(`apps/api/CLAUDE.md` rule 14a).

- **Never import `PrismaService`.** All data access goes through the Repository.
  Calling Prisma from a service is an architecture violation
  (`apps/api/CLAUDE.md` §"Architecture Enforcement").
- **No method over 30 lines** (excluding blank lines/comments) —
  `max-lines-per-function` (warn, max 30) on `*.service.ts`. **Cyclomatic
  complexity ≤ 10** per service method (`complexity` warn). When a method grows,
  extract logic into `<module>.utilities.ts`.
- **Extract every 3–5 lines of cohesive logic to a named utility.** No long
  procedural blocks, no inline helper functions, no inline constants — they go to
  `<module>.utilities.ts` / `<module>.constants.ts` (rule 14a).
- **This is where business rules live**: throw `BusinessException` with a specific
  `messageKey` (`errors.<module>.<action>`) here, never raw Nest exceptions
  (rules 17, 18). Enforce tenant ownership, RBAC beyond the decorator, state
  machines, approvals (`AGENTS.md` §6–§7).
- **Pass `tenantId` down to every repository call.** The service decides _what_;
  the repository only executes the already-built query.
- **AI safety:** AI may analyze/suggest, but destructive actions are
  approval-required — create an `ApprovalRequest` record before execution and
  never silently execute (rule 97; `../ai/ai-safety-rules.md`). Never render raw
  AI output as HTML (`AGENTS.md` §7).

`apps/api/src/modules/cases/cases.service.ts` shows the shape: it imports ~25
`build*`/`map*`/`format*` helpers from `cases.utilities.ts` and the repositories,
and imports **no** `PrismaService`. Each public method composes those helpers.

```ts
@Injectable()
export class CasesService {
  constructor(
    private readonly casesRepository: CasesRepository,
    private readonly notificationsService: NotificationsService
  ) {}

  async listCases(tenantId: string, page: number, limit: number /* … */): Promise<PaginatedCases> {
    const where = buildCaseWhereClause(tenantId /* filters */)
    const orderBy = buildCaseOrderBy(sortBy, sortOrder)
    const { rows, total } = await this.casesRepository.findCases(
      tenantId,
      where,
      orderBy,
      page,
      limit
    )
    return { items: rows.map(mapCaseListItem), meta: buildPaginationMeta(total, page, limit) }
  }
}
```

## 3. Repository — pure data access, `tenantId` on every method

The repository is the only Prisma boundary. It accepts fully-built query
parameters and returns **raw Prisma results** (`apps/api/CLAUDE.md` rule 14b).

- **No business logic, no conditionals, no transforms, no mapping.** Shaping a
  result is the utilities' job; deciding _whether_ to query is the service's job.
- **No `throw` / `BusinessException`.** `ThrowStatement` is banned in repository
  files (`no-restricted-syntax`, rule 14b). A not-found is `null`/`[]` for the
  service to interpret.
- **No standalone functions, no inline constants.** Move them to
  `<module>.utilities.ts` / `<module>.constants.ts`.
- **Every method takes `tenantId`** and every read/`update`/`delete` is scoped by
  it. `where: { id, tenantId }` — never `where: { id }` alone for
  tenant-owned models (rule 26; `../security/tenant-isolation.md`). This is the
  core multi-tenant invariant: no cross-tenant data, ever (`AGENTS.md` §6).
- **Accept already-built `where`/`orderBy`/pagination** from the service; do not
  build filters here. `buildCaseWhereClause` / `buildCaseOrderBy` live in
  utilities.
- **Other data-access invariants still apply**: batch operations chunked in 50s
  with `Promise.allSettled()` (rule 36); migrations created for every schema
  change (rule 30); connection pool stays bounded (rule 46).

`apps/api/src/modules/cases/cases.repository.ts`: constructor injects
`PrismaService`; methods like `findUserById` are thin `prisma.*` calls returning
the raw row. No conditionals, no throws, no mapping.

```ts
@Injectable()
export class CasesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCaseById(id: string, tenantId: string): Promise<Case | null> {
    return this.prisma.case.findFirst({ where: { id, tenantId } })
  }

  async updateCase(id: string, tenantId: string, data: Prisma.CaseUpdateInput): Promise<Case> {
    return this.prisma.case.update({ where: { id, tenantId }, data })
  }
}
```

## 4. Utilities — all business logic, pure named functions only

`<module>.utilities.ts` is where the logic the service extracts actually lives:
mappers, transformers, filter/`where`/`orderBy` builders, calculators, validators,
formatters (`apps/api/CLAUDE.md` rule 14c).

- **Export pure named functions only.** No interfaces, types, enums, or constants
  in utility files — `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`,
  `TSEnumDeclaration`, and top-level `const` are banned here by
  `no-restricted-syntax` (rule 14c). Move them to `<module>.types.ts` /
  `<module>.enums.ts` / `<module>.constants.ts`.
- **Prefer pure functions** with explicit inputs/outputs and explicit return
  types (rule 67). No hidden Prisma/HTTP/Redis I/O — utilities transform data, the
  service performs side effects via repositories and other services.
- **Shared, cross-module helpers** go to `src/common/utils/<name>.utility.ts`
  (e.g. `encryption.utility.ts`, `ssrf.utility.ts`, `date-time.utility.ts`).
  Use the full word **`utilities`/`utility`** — `.utils.ts`/`.util.ts` violate
  `unicorn/prevent-abbreviations` (`apps/api/CLAUDE.md` §"File Naming").
- **Don't duplicate logic across services** — extract shared logic to utilities
  (`apps/api/CLAUDE.md` §"Architecture Enforcement").

`cases.service.ts` imports `buildCaseWhereClause`, `buildCaseOrderBy`,
`mapCaseListItem`, `truncateBody`, etc. from `cases.utilities.ts` — that file is
where the cyclomatic complexity lives so the service stays under 30 lines.

## 5. Declarations live in their home file — never inline

Every interface, type, enum, constant, and standalone function has a dedicated
home file. Inline declarations in services, controllers, repositories, guards,
interceptors, filters, pipes, or utilities are ESLint-enforced violations
(`apps/api/CLAUDE.md` rules 13, 14c).

| Declaration                | Home file                                                  |
| -------------------------- | ---------------------------------------------------------- |
| `interface` / `type`       | `<module>.types.ts` or `src/common/interfaces/`            |
| `enum`                     | `<module>.enums.ts` or `src/common/enums/`                 |
| constant                   | `<module>.constants.ts` or `src/common/constants/`         |
| standalone function        | `<module>.utilities.ts` or `src/common/utils/*.utility.ts` |
| Zod schema + inferred type | `dto/<name>.dto.ts`                                        |

- **No raw string literals or string-literal union types.** Use an enum
  (`CaseStatus.ACTIVE`, not `'active'`; never `type X = 'a' | 'b'`) — rule 12.
- **Exported domain types** go in `*.types.ts`. Internal-only interfaces (unused
  outside the file) may stay in that file (`apps/api/CLAUDE.md` §"File Naming").
- **Exception:** DTO files in `dto/` may define Zod-inferred types
  (`export type CreateCaseDto = z.infer<typeof CreateCaseSchema>`).

---

## Self-check before you commit

- [ ] Controller: one service call, `@RequirePermission`, `@TenantId()`, no
      `try/catch`, no `throw`, no logic, mutations throttled.
- [ ] Service: no `PrismaService` import, every method < 30 lines & complexity ≤ 10,
      logic extracted to utilities, `BusinessException` + `messageKey` for errors.
- [ ] Repository: only Prisma access, every method takes `tenantId`, every
      `update`/`delete` scoped `{ id, tenantId }`, no throws/conditionals/transforms.
- [ ] Utilities: pure named functions only — no types/enums/constants inside.
- [ ] No inline `interface`/`type`/`enum`/`const`/`function`; no raw string
      literals where an enum exists.
- [ ] `pnpm lint` and `pnpm typecheck` pass (`../global/validation-gates.md`).
- [ ] Never worked on `main` — branched first (`../global/branch-safety.md`).

```

```
