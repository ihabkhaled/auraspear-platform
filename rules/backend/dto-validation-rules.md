# Rules — Backend DTO & Validation (Zod)

> Read `../../AGENTS.md` first (loading order + the one rule: understand before
> you edit). Then `../../apps/api/CLAUDE.md` (the 100+ absolute rules — this file
> distills #16, #19, #27, #28, #39, #78 and the DTO pattern). These are **hard
> constraints**. Validation is a security boundary, not a formality: every
> unbounded field is a DoS or injection vector.

Backend uses **Zod only** — no `class-validator`. Validation runs via
`ZodValidationPipe` (`apps/api/src/common/pipes/zod-validation.pipe.ts`) on
`@Body()`, and via **manual `Schema.parse()`** for `@Query()`.

## 1. Where schemas live

- One file per module: `apps/api/src/modules/<module>/dto/<name>.dto.ts`
  (kebab-case, e.g. `create-case.dto.ts`, `list-cases-query.dto.ts`).
- Each schema is a `const` `export`, and its inferred type is co-located —
  this is the **only** allowed inline `type` in the DTO layer (CLAUDE.md #13
  exception):

  ```ts
  // apps/api/src/modules/cases/dto/create-case.dto.ts
  export const CreateCaseSchema = z.object({
    /* ... */
  })
  export type CreateCaseDto = z.infer<typeof CreateCaseSchema>
  ```

- Enums used by the schema go in `<module>.enums.ts` or `src/common/enums/`
  and are imported (e.g. `SortOrder` from `../../../common/enums`). Do **not**
  define standalone enums/interfaces/constants in the DTO file beyond the
  Zod-inferred type. Inline `z.enum([...])` for closed value sets is fine.

## 2. Every string field MUST have `.max()` (CLAUDE.md #27)

No exceptions. Size it from the DB column. Use `.min(1)` for required text.

```ts
title: z.string().min(1, 'Title is required').max(256),   // VarChar(256)
description: z.string().min(1).max(4096),                  // Text-ish body
query: z.string().max(500).optional(),                     // search box
```

Real references: `cases/dto/create-case.dto.ts`,
`connectors/dto/connector.dto.ts` (every `z.string()` carries `.max()`:
`.max(255)`, `.max(500)`, `.max(10000)` for certs).

- A bare `z.string()` with no `.max()` is a **review blocker**.
- `.max(65536)` (64KB) is the cap for large text blobs — see
  `ai-agents/dto/update-soul.dto.ts` (`soulMd: z.string().max(65536)`).

## 3. Every array field MUST have `.max()` (CLAUDE.md #28)

Unbounded arrays = DoS. Cap by realistic batch size.

```ts
linkedAlertIds: z.array(z.string().uuid()).max(500).optional(),
```

Reference: `cases/dto/create-case.dto.ts`. Match the cap to downstream
batching (DB ops chunk in 50s per CLAUDE.md #36) — never leave a list open.

## 4. JSON / record fields: cap at 64KB (CLAUDE.md #78)

The global body limit is `express.json({ limit: '1mb' })` in `main.ts` — that
is **not enough**. Every JSON/`record` field (`config`, `metadata`,
`parameters`, `conditions`, `actions`, `triggerConfig`, `filters`) MUST add a
`.refine()` that rejects payloads over **64KB (65536)**:

```ts
// pattern used across the codebase
parameters: z.record(z.string(), z.unknown()).refine(
  value => JSON.stringify(value).length <= 65536,
  {
    message: 'Parameters too large (max 64KB)',
  }
)
```

Real references: `connector-workspaces/dto/connector-workspace.dto.ts:23`,
`correlation/dto/{create,update}-rule.dto.ts`,
`detection-rules/dto/{create,update}-detection-rule.dto.ts`,
`agent-config/dto/update-agent-config.dto.ts`.

Also bound key/property count on open records. Connector `config` caps key
length and property count:

```ts
config: z.record(z.string().max(100), z.unknown()).refine(
  value => Object.keys(value).length <= 50,
  {
    message: 'Config must have at most 50 properties',
  }
)
```

Reference: `connectors/dto/connector.dto.ts:265`.

## 5. `@Query()` MUST be parsed manually (CLAUDE.md #19)

NestJS passes raw query strings without running the Zod pipe. **Never** type a
`@Query()` parameter as a DTO and assume it is validated.

- Take the raw query, then `Schema.parse()` it in the controller:

  ```ts
  @Get()
  @RequirePermission(Permission.CASES_VIEW)
  async listCases(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedCases> {
    const { page, limit, sortBy, sortOrder } = ListCasesQuerySchema.parse(rawQuery)
    // ...
  }
  ```

  Reference: `cases/cases.controller.ts:50`.

- Query schemas MUST `z.coerce` numbers (strings come over the wire) and bound
  every field:

  ```ts
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'severity', 'title']).default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
  ```

  Reference: `cases/dto/list-cases-query.dto.ts`. Always cap `limit` (DoS) and
  `page`. A failed `parse` throws through the pipe path (see §7).

- Every value in the `sortBy` `.enum()` MUST also be handled in the module's
  `buildXxxOrderBy()` utility, or sorting silently falls back / errors
  (CLAUDE.md #87).

## 6. `@Body()` validation + the `@Param()` trap (CLAUDE.md #16)

- Validate body with the pipe at the parameter, not `@UsePipes()`:

  ```ts
  @Post()
  create(@Body(new ZodValidationPipe(CreateCaseSchema)) dto: CreateCaseDto) { ... }
  ```

- **Never** use method-level `@UsePipes()` when a `@Param()` is present — it
  runs the schema against path params too and validation fails. Apply the pipe
  directly on `@Body()`.

## 7. Errors MUST be `BusinessException` with a `messageKey` (CLAUDE.md #17, #18)

The `ZodValidationPipe` already converts Zod failures into a `BusinessException`
(status 400) with i18n keys via `issueToMessageKey`
(`apps/api/src/common/pipes/zod-validation.utilities.ts`). For **any** other
validation you do in services/utilities (ownership checks, state machines,
business rules), throw:

```ts
throw new BusinessException(404, 'Case not found', 'errors.cases.notFound')
```

- Never throw raw `NotFoundException` / `BadRequestException` / `Error`.
- `messageKey` pattern: `errors.<module>.<specificAction>`
  (e.g. `errors.connectors.notFound`, `errors.validation.sortBy.invalidOption`).
- Every new `messageKey` MUST exist in **all 6** i18n files
  (`en/ar/es/fr/de/it.json`) — CLAUDE.md #49. Missing keys break the frontend
  (it renders `t(messageKey)`).
- Signature: `new BusinessException(status, message, messageKey, errors?)`
  (`apps/api/src/common/exceptions/business.exception.ts`).

## 8. Connector configs: per-type schemas (CLAUDE.md #39)

Each connector type has its own Zod config schema in
`connectors/dto/connector.dto.ts` (`WazuhConfigSchema`, `MispConfigSchema`,
`BedrockConfigSchema`, `LlmApisConfigSchema`, …). Call
`validateConnectorConfig(type, config)` **before** encrypting (AES-256-GCM at
rest). Validate SSRF on URL fields at input time too (CLAUDE.md #59). Never
store an unvalidated connector config.

## Checklist before you commit a DTO

- [ ] File at `modules/<module>/dto/<name>.dto.ts`; only the Zod-inferred
      `type` is inline.
- [ ] Every `z.string()` has `.max()`; required ones have `.min(1)`.
- [ ] Every `z.array()` has `.max()`.
- [ ] Every JSON/`record` field has a `.refine(... <= 65536 ...)` (64KB) and,
      for open records, a key-count cap.
- [ ] Query schemas use `z.coerce` for numbers, bound `page`/`limit`, and
      every `sortBy` value is wired into `buildXxxOrderBy`.
- [ ] `@Query()` is parsed via `Schema.parse(rawQuery)` in the controller —
      never typed-and-trusted.
- [ ] `@Body()` uses `@Body(new ZodValidationPipe(Schema))`; no `@UsePipes()`
      alongside `@Param()`.
- [ ] Non-Zod validation failures throw `BusinessException` with an
      `errors.<module>.<action>` key present in all 6 locale files.
- [ ] `pnpm typecheck` passes (blocking gate; `tsgo`/`typecheck:fast` is
      advisory). No `any`, no `eslint-disable`.

## Related

- `../../apps/api/CLAUDE.md` — full backend rule list + DTO pattern (§DTO Pattern).
- `../security/*` — tenant isolation, RBAC, secrets, SSRF.
- `../../skills/backend/add-endpoint.md` — end-to-end recipe (DTO + controller +
  proxy route).
- `../testing/quality-gates.md` — what "green" means.
