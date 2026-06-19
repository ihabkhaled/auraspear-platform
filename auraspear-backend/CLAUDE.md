# AuraSpear SOC BFF - AI Development Guidelines

## ABSOLUTE RULES — NEVER VIOLATE

1. **NEVER use `any`** — Use `unknown`, generics, or proper types. `@typescript-eslint/no-explicit-any` is enforced.
2. **NEVER disable ESLint rules** — No `// eslint-disable`, no `@ts-ignore`, no `@ts-expect-error`. Fix the root cause.
3. **NEVER use `==` or `!=`** — Always use `===` and `!==` (`eqeqeq: error`).
4. **NEVER use `var`** — Use `const` (preferred) or `let`.
5. **NEVER use `!` (non-null assertion)** — Use proper null checks (`if`, `??`, `?.`).
6. **NEVER use `console.log`** — Only `console.warn` and `console.error` are allowed. Prefer NestJS `Logger` service.
7. **NEVER use `eval()`** — No `eval`, `new Function()`, or `setTimeout('code')`.
8. **NEVER return data from another tenant** — Every query MUST be scoped by `tenantId`.
9. **NEVER use string concatenation** — Use template literals (`prefer-template: warn`).
10. **NEVER use `Buffer()` constructor** — Use `Buffer.alloc()` or `Buffer.from()`.
11. **NEVER import without `node:` prefix** — Use `node:crypto`, `node:fs`, `node:path` etc. (`unicorn/prefer-node-protocol`).
12. **NEVER use plain text string literals or string literal unions** — Never use raw strings like `'active'` for comparisons/assignments — use enums (e.g., `CaseCycleStatus.ACTIVE`). Never define string literal union types like `type Theme = 'system' | 'light' | 'dark'` — define an enum instead (e.g., `enum Theme { SYSTEM = 'system', LIGHT = 'light', DARK = 'dark' }`). Enums live in `src/common/enums/` or module-level `<module>.enums.ts`. Export and import them.
13. **NEVER define interfaces, types, enums, constants, or standalone functions inline** — Every declaration has a dedicated home file. Move interfaces/types to `<module>.types.ts` or `src/common/interfaces/`. Move enums to `<module>.enums.ts` or `src/common/enums/`. Move constants to `<module>.constants.ts` or `src/common/constants/`. Move standalone helper functions to `<module>.utilities.ts` or `src/common/utils/`. This applies to services, controllers, repositories, guards, interceptors, filters, pipes, modules, and utility files. Exception: DTOs in `dto/` files may define Zod-inferred types. **ESLint-enforced** via `no-restricted-syntax` on `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`, `TSEnumDeclaration`, `FunctionDeclaration`, and top-level `VariableDeclaration[kind="const"]` in logic/utility files.
14. **Controllers MUST only route and delegate** — No business logic, no `try/catch` (let `GlobalExceptionFilter` handle errors), no `throw` (delegate to service layer), no data transformation, no standalone functions, no inline constants. Call ONE service method and return the result. **ESLint-enforced** via `no-restricted-syntax` on `TryStatement` and `ThrowStatement` in controller files.
    14a. **Services MUST be thin orchestrators** — Services call repository methods for data access and utility functions for business logic. No Prisma imports, no inline helper functions (move to `<module>.utilities.ts`), no inline constants (move to `<module>.constants.ts`). Every 3-5 lines of cohesive logic must be extracted to a utility function. Service methods should read like a recipe: validate → call util → call repo → return. **No service method may exceed 30 lines** (excluding blank lines and comments). **Cyclomatic complexity must not exceed 10** per method in services, 15 globally. **ESLint-enforced** via `max-lines-per-function` (warn, max: 30) and `complexity` (warn, max: 10 for services, max: 15 globally) on `*.service.ts` files. When a method grows beyond 30 lines or has too many branches, extract logic into named utility functions in `<module>.utilities.ts`.
    14b. **Repositories MUST be pure data access** — No business logic, no conditionals, no transforms, no `throw`/`BusinessException`, no standalone functions, no inline constants. Accept fully-built query parameters, return raw Prisma results. Every method takes `tenantId`. **ESLint-enforced** via `no-restricted-syntax` on `ThrowStatement` in repository files.
    14c. **Utility files MUST only contain business logic functions** — No interfaces, types, enums, or constants in utility files. Move them to their dedicated files (`<module>.types.ts`, `<module>.enums.ts`, `<module>.constants.ts`). Utility files export pure named functions only. **ESLint-enforced** via `no-restricted-syntax` on `TSInterfaceDeclaration`, `TSTypeAliasDeclaration`, `TSEnumDeclaration`, and top-level `VariableDeclaration[kind="const"]` in utility files.
15. **Seeders MUST be idempotent** — Use `upsert` or `createMany({ skipDuplicates: true })`. Seeders must be safe for `npm run start:prod` and never crash on duplicate data.
16. **NEVER use `@UsePipes()` at method level when `@Param()` is present** — It runs the pipe on ALL parameters including path params, causing validation to fail. Apply the pipe directly on `@Body()`: `@Body(new ZodValidationPipe(Schema)) dto: Dto`.
17. **EVERY exception MUST use `BusinessException` with a specific `messageKey`** — Never throw raw `UnauthorizedException`, `NotFoundException`, `ForbiddenException`, etc. Always use `throw new BusinessException(status, message, 'errors.module.specificKey')` so the frontend can show localized error messages via `t(messageKey)`.
18. **EVERY API response error MUST include `messageKey`** — The GlobalExceptionFilter ensures this. Use `BusinessException` for all business-logic errors. The `messageKey` follows the pattern `errors.<module>.<specificAction>` (e.g., `errors.auth.invalidCredentials`, `errors.connectors.notFound`).
19. **NEVER use `@Query()` with a DTO type directly** — NestJS passes raw query strings without Zod validation. Always parse manually: `const query = Schema.parse(rawQuery)` or use individual `@Query('key')` params with explicit number coercion.
20. **NEVER allow deletion/blocking/role-change of protected users** — Users with `isProtected: true` (seeded GLOBAL_ADMIN) cannot be deleted, blocked, suspended, or have their role changed. Always check `isProtected` before these operations.
21. **NEVER hard-delete users** — Use soft delete (set `status: 'inactive'`). Provide restore functionality. Blocked users get `status: 'suspended'`.
22. **NEVER allow self-deletion or self-blocking** — Check `callerId !== userId` before delete/block operations.
23. **NEVER bypass authentication in any environment** — No dev mode auth bypass, no fake users, no skipping JWT verification regardless of `NODE_ENV`. All requests must go through the full auth guard chain.
24. **NEVER use hardcoded or fallback secrets** — Encryption keys, JWT secrets, and API keys must be loaded from environment variables with no default values. Fail loudly at startup if missing.
25. **EVERY endpoint MUST have `@RequirePermission()`** — All endpoints must include `@RequirePermission(Permission.MODULE_ACTION)` from `@/common/decorators/permission.decorator`. Permissions are dynamic and stored in the database. GLOBAL_ADMIN always passes. The old `@Roles()` decorator is only used on the `role-settings` controller itself.
26. **EVERY Prisma `update()` and `delete()` MUST include `tenantId` in the where clause** — Never update/delete by `id` alone. Always scope: `where: { id, tenantId }`.
27. **EVERY Zod string field MUST have `.max()` limit** — All string fields in DTOs must have a maximum length. Use DB column size as guide (e.g., `.max(255)` for VarChar(255), `.max(4096)` for Text).
28. **EVERY Zod array field MUST have `.max()` limit** — Unbounded arrays enable DoS. Add reasonable limits (e.g., `.max(500)` for alertIds).
29. **JWT signing/verification MUST specify algorithm** — Always use `{ algorithm: 'HS256' }` for signing and `{ algorithms: ['HS256'] }` for verification. Never allow algorithm confusion.
30. **ALWAYS create Prisma migration scripts for schema changes** — When adding or modifying models in `prisma/schema.prisma`, ALWAYS create a migration file in `prisma/migrations/` with the correct SQL. Use `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` to generate the SQL, then create the migration directory and `migration.sql` file. Never leave schema changes without a corresponding migration. Also update the seed script if new tables need default data.
31. **validateUserActive MUST check membership status** — Not just user existence. Query `memberships` with `where: { status: 'active' }` and reject if none found.
32. **Auth endpoints MUST have strict rate limiting** — Login: `@Throttle({ default: { limit: 5, ttl: 60000 } })`. Refresh: `@Throttle({ default: { limit: 10, ttl: 60000 } })`.
33. **AI endpoints MUST have rate limiting** — Apply `@Throttle({ default: { limit: 10, ttl: 60000 } })` at controller level for all AI endpoints.
34. **Request body size MUST be limited** — `express.json({ limit: '1mb' })` is configured in `main.ts`. Never remove this.
35. **Elasticsearch queries MUST be sanitized** — Strip `script`, `_search`, `_mapping`, `_cluster`, `_cat`, `_nodes` patterns. Limit query length. Use `allow_leading_wildcard: false`.
36. **Database batch operations MUST be chunked** — Never fire hundreds of concurrent Prisma operations. Batch in chunks of 50 using `Promise.allSettled()`.
37. **Token revocation MUST use server-side blacklist** — On logout, blacklist both access and refresh JTIs in Redis with TTL matching token expiry. `TokenBlacklistService` handles this via `token:blacklist:{jti}` keys.
38. **EVERY JWT MUST include `jti` and `tokenType` claims** — Access tokens get `tokenType: 'access'`, refresh tokens get `tokenType: 'refresh'`. Verify `tokenType` on every token validation to prevent token type confusion.
39. **Connector configs MUST be validated with per-type Zod schemas** — Each connector type (wazuh, graylog, logstash, velociraptor, grafana, influxdb, misp, shuffle, bedrock) has its own Zod config schema in `connector.dto.ts`. Call `validateConnectorConfig(type, config)` before encrypting.
40. **Hunt run state transitions MUST follow a valid state machine** — Only `running` → `completed` or `running` → `error` are valid transitions. Use `VALID_TRANSITIONS` map in `hunts.service.ts`. Reject invalid transitions with `BusinessException`.
41. **Case owner MUST be validated as active tenant member** — Before creating/updating a case with `ownerUserId`, call `validateOwnerInTenant(ownerUserId, tenantId)` to verify active membership.
42. **Linked alert IDs MUST belong to the same tenant** — Before linking alerts to a case, verify each alert belongs to the caller's tenant via Wazuh/OpenSearch query.
43. **Case number generation MUST use advisory locks** — Use `pg_advisory_xact_lock` in a Prisma `$transaction` to prevent race conditions when generating sequential case numbers.
44. **Error messages MUST NOT leak internal paths** — Sanitize error details by stripping file paths (`/path/to/file`) and truncating to 500 chars before returning to clients. See `connectors.service.ts` L329.
45. **Source maps MUST be disabled in production** — `tsconfig.build.json` has `"sourceMap": false`. Never enable source maps in production builds.
46. **Prisma connection pool MUST be configured** — `PrismaService` appends `connection_limit=20&pool_timeout=10` to DATABASE_URL. Never use unbounded connection pools.
47. **Health check Redis MUST reuse connections** — `HealthService` creates one shared Redis instance in constructor. Never create per-request Redis connections.
48. **AI investigation MUST validate alert tenant ownership** — Before investigating an alert, verify it belongs to the caller's tenant. Never allow cross-tenant alert investigation.
49. **EVERY i18n messageKey MUST exist in ALL language files** — When adding a new `messageKey` to any `BusinessException`, add the corresponding translation to ALL 6 i18n files: `en.json`, `ar.json`, `es.json`, `fr.json`, `de.json`, `it.json`. Missing translations cause frontend display errors.
50. **TLS verification warnings MUST be logged** — When `rejectUnauthorized: false` is used in connector HTTP calls, log a `console.warn` with the connector type. See `connector-http.util.ts`.
51. **Refresh token rotation MUST blacklist the old JTI** — When issuing a new token pair via `/refresh`, the old refresh token's `jti` MUST be added to the Redis blacklist with its remaining TTL. Without this, intercepted refresh tokens can be replayed indefinitely for 7 days, creating persistent account takeover. Never issue new tokens without revoking the old ones.
52. **Login MUST use constant-time comparison for missing users** — When a login attempt targets a non-existent email, ALWAYS run `bcrypt.compare()` against a pre-computed dummy hash before returning 401. This prevents timing-based email enumeration (bcrypt ~500ms vs immediate rejection ~1ms). Store a static `DUMMY_BCRYPT_HASH` constant.
53. **NEVER ship zero-entropy or placeholder secrets in .env.example** — `CONFIG_ENCRYPTION_KEY`, `JWT_SECRET`, and all signing/encryption secrets MUST have empty values in `.env.example` with generation instructions in comments. All-zero keys (`0000...`) are effectively plaintext. The `env.validation.ts` schema MUST reject all-zero values with a `.refine()` check.
54. **Seed scripts MUST NOT have fallback passwords** — `SEED_DEFAULT_PASSWORD` must be a required environment variable with no `??` fallback. Fail loudly at seed start if missing. This prevents seeded admin accounts from having publicly-known weak passwords like `Admin@123`.
55. **Connector create/update/toggle MUST require `TENANT_ADMIN` role** — Connector configuration controls security infrastructure (Wazuh, MISP, Shuffle, Bedrock). A `SOC_ANALYST_L2` must NOT be able to redirect connector URLs, modify API keys, or disable integrations. All connector mutation endpoints require `@Roles(UserRole.TENANT_ADMIN)`.
56. **NEVER bypass security checks based on `NODE_ENV`** — No `if (NODE_ENV === 'development') { skip validation }` patterns. AI enablement checks, connector HTTPS enforcement, and all security validations must run in every environment. Use test fixtures or dependency injection for testing, not runtime env checks that skip security.
57. **Passwords MUST be redacted from structured request logs** — The pino logger `redact` array in `app.module.ts` MUST include `req.body.password`, `req.body.currentPassword`, `req.body.newPassword`, and `req.body.confirmPassword`. Logging plaintext passwords to log aggregation systems (ELK, CloudWatch) is a credential exposure vector.
58. **`NODE_ENV` MUST default to `'production'`** — In `env.validation.ts`, the default value for `NODE_ENV` must be `'production'`, not `'development'`. This ensures that misconfigured deployments get production security behavior (no Swagger, no verbose errors, HTTPS-only connectors) instead of development permissiveness.
59. **Connector URLs MUST be SSRF-validated at input time** — Call `validateUrl()` from `ssrf.util.ts` during connector create/update (before encryption), not only at fetch time. This prevents storing malicious URLs (e.g., `http://169.254.169.254/`) that would persist in the database even though they're rejected on use.
60. **Health endpoints MUST NOT disclose application version** — The `@Public()` health endpoint must not include `version` in the response body. Version disclosure helps attackers identify specific vulnerable versions.
61. **Connector test and logout endpoints MUST have rate limiting** — `POST /:type/test`: `@Throttle({ default: { limit: 5, ttl: 60000 } })` to prevent internal port scanning. `POST /auth/logout`: `@Throttle({ default: { limit: 10, ttl: 60000 } })` to prevent Redis blacklist flooding.
62. **CSP MUST NOT allow `'unsafe-inline'`** — The Helmet `contentSecurityPolicy` directive for `styleSrc` must not include `'unsafe-inline'`. For a backend API, no inline styles are needed. This prevents CSS injection attacks.
63. **Exception filter MUST sanitize file paths from error responses** — All error messages returned to clients must have internal file paths stripped using regex (e.g., `/[A-Z]:\\[^\s]+|\/[\w/.-]+/g` → `[path]`) and be truncated to 500 characters. Prisma errors, Node.js stack traces, and module resolution errors can all leak internal paths.
64. **OIDC environment variables MUST be group-validated** — `OIDC_AUTHORITY`, `OIDC_CLIENT_ID`, `OIDC_REDIRECT_URI`, `OIDC_JWKS_URI` must all be present or all absent. Partial configuration causes runtime failures. Use a Zod `.refine()` to enforce all-or-nothing.
65. **Docker production compose MUST NOT expose internal service ports** — PostgreSQL (5432), Redis (6379), and pgAdmin (5050) must NOT have `ports:` bindings in production docker-compose. Only the backend API port (4000) should be exposed. Internal services communicate via Docker networks only.
66. **Audit interceptor sensitive keys MUST cover all credential patterns** — The sanitization list must include: `password`, `apiKey`, `token`, `secret`, `bearerToken`, `accessKey`, `clientSecret`, `refreshToken`, `accessToken`, `encryptedConfig`, `authorization`. Missing any pattern leaks credentials to audit logs.
67. **EVERY function MUST have an explicit return type** — All methods in repositories, services, controllers, and utility files must declare their return type (e.g., `async foo(): Promise<Bar>`). The `@typescript-eslint/explicit-function-return-type` rule is enforced as a warning.
68. **NEVER use `Array#reduce()`** — Use `for...of` loops instead for readability (`unicorn/no-array-reduce`).
69. **NEVER use abbreviated file or variable names** — `unicorn/prevent-abbreviations` is enforced. Use full words: `utility` not `util`, `utilities` not `utils`, `parameter` not `param`, `definition` not `def`, `error` not `err` (except in allowed list: `req`, `res`, `env`, `db`, `fn`, `args`, `params`, `props`, `ctx`, `dto`, `e`, `err`).
70. **NEVER nest ternary expressions** — Extract into variables or use `if/else` blocks. Both `no-nested-ternary` and `unicorn/no-nested-ternary` are enforced.
71. **NEVER use `await` inside loops when operations are independent** — Use `Promise.all()` or batch patterns instead (`no-await-in-loop`). Exception: sequential-dependent operations like pagination scroll APIs where each iteration depends on the previous result.
72. **NEVER pass useless `undefined` arguments** — Don't pass `undefined` as a function argument when it matches the default. Use optional parameters instead (`unicorn/no-useless-undefined`).
73. **Prefer `??` over ternary for nullish values** — Use `??` (nullish coalescing) instead of `value ? value : default` or `value !== null ? value : default` (`@typescript-eslint/prefer-nullish-coalescing`). Use `??=` for nullish assignment.
74. **EVERY controller with mutations MUST have `@Throttle()`** — No unrate-limited POST/PATCH/DELETE endpoints. Apply rate limiting at the controller or method level for all mutation operations.
75. **EVERY sub-resource endpoint MUST validate parent ownership before accessing child entities** — When accessing nested resources (e.g., `/cases/:caseId/artifacts/:artifactId`), verify the parent entity belongs to the caller's tenant before querying the child. Never trust that a valid child ID implies valid parent access.
76. **NEVER forward client-provided role headers** — No `X-Role` header forwarding, even in dev mode. Role information must come exclusively from the validated JWT token, never from client-supplied headers.
77. **EVERY error response MUST be sanitized** — No stack traces, no internal paths, no table/column names in ANY environment (including development). The GlobalExceptionFilter must strip all internal details before returning errors to clients.
78. **JSON payload size MUST be validated for nested fields** — Add `.refine()` to Zod schemas for JSON/record fields (e.g., `config`, `metadata`, `parameters`) with a max size of 64KB. The global 1MB body limit is not enough — individual JSON fields must be constrained to prevent oversized nested payloads.
79. **EVERY Elasticsearch query MUST use the shared `sanitizeEsQueryString()` utility** — Never build raw Elasticsearch query strings manually. Always pass user input through `sanitizeEsQueryString()` from the shared utilities before embedding in queries.
80. **Rate limit tiers MUST follow these standards** — Auth endpoints: 5/min, Standard CRUD: 30/min, Bulk operations: 5/min, Delete operations: 10/min, AI endpoints: 10/min. Apply the appropriate tier via `@Throttle()` based on the endpoint category.
81. **NEVER return internal service URLs in API responses** — Health checks and status endpoints must return service names only (e.g., `"redis": "healthy"`), never the actual connection URLs, hosts, or ports of internal services.
82. **Prisma errors MUST be caught explicitly in the exception filter** — The GlobalExceptionFilter must handle `PrismaClientKnownRequestError`, `PrismaClientValidationError`, and `PrismaClientInitializationError` with generic error messages. Never leak table names, column names, or constraint names from Prisma error metadata.
83. **`CORS_ORIGINS` MUST reject `localhost` in production** — The `env.validation.ts` schema must include a `.refine()` check that rejects any origin containing `localhost` or `127.0.0.1` when `NODE_ENV === 'production'`. Development origins must not leak into production configuration.
84. **WebSocket CORS MUST match HTTP CORS validation** — The notifications gateway (or any WebSocket gateway) must validate origins using the same `CORS_ORIGINS` environment variable as HTTP CORS. Never use `cors: true` (allow all) or a separate unvalidated origin list for WebSocket connections.
85. **EVERY new permission MUST be added end-to-end in a single change** — When adding a permission (e.g., `JOBS_CANCEL_ALL`), ALL of these must be done atomically: (1) Backend `Permission` enum in `src/common/enums/permission.enum.ts`, (2) `permission-definitions.ts` with `labelKey` and `sortOrder`, (3) `default-permissions.ts` for the appropriate roles, (4) `@RequirePermission()` decorator on the endpoint, (5) Prisma migration using `WHERE NOT EXISTS` pattern (NOT `ON CONFLICT ("key")` — the unique constraint is compound `(tenantId, key)`, so `ON CONFLICT ("key")` fails), (6) Frontend permission enum (mirror), (7) Frontend API proxy route in `src/app/api/`, (8) i18n keys in ALL 6 locale files for both the feature text and the `roleSettings.permissions.<module>.<action>` label, (9) Run `npx prisma db seed` to populate the database.
86. **EVERY new backend endpoint that the frontend calls MUST have a corresponding Next.js API proxy route** — The frontend proxies all backend calls through `src/app/api/` routes using `proxyToBackend()`. When adding a new backend endpoint (e.g., `POST /jobs/cancel-all`), the frontend MUST also create `src/app/api/jobs/cancel-all/route.ts`. Missing proxy routes cause 404 HTML responses instead of JSON API responses.
87. **EVERY sortable column MUST be registered in the backend DTO's `sortBy` enum AND the `buildOrderBy` utility** — When the frontend marks a DataTable column as `sortable: true`, the field name must exist in: (1) the backend's `ListXxxQuerySchema` Zod `.enum()` for `sortBy`, (2) the corresponding `buildXxxOrderBy()` switch/map function. Missing either causes `errors.validation.sortBy.invalidOption` or silent fallback to default sort.
88. **AI provider cascade MUST try ALL configured connectors before falling back** — `findAvailableAiConnectors()` returns ALL configured connectors (not just the first). The `tryConnectorsInOrder()` method iterates through them sequentially — if Bedrock fails, it tries LLM APIs, then OpenClaw Gateway. Rule-based fallback ONLY triggers if ALL connectors fail or none are configured. Never short-circuit to fallback after a single provider failure.
89. **NEVER use `BEDROCK_MOCK` or any env-var-gated mock mode in production code** — AI connectors must always call the real provider SDK/API. If the SDK is not installed or credentials are invalid, the error is caught and the next connector in the cascade is tried. Mock modes mask real integration failures.
90. **Job processor MUST log Redis connection state changes** — The `JobProcessorService` must track `redisConnected` state via `connect`/`error`/`close` events and skip polling with a logged warning when Redis is down. Silent lock acquisition failures (returning `false` without logging) cause jobs to sit PENDING indefinitely with no diagnostic trail.
91. **Stale jobs MUST be auto-recovered** — Jobs stuck in RUNNING status for longer than `STALE_RUNNING_WINDOW_MS` (30 minutes) must be automatically reset to PENDING by a periodic recovery task. The `recoverStaleJobs()` interval handles this. Never rely on manual intervention to unstick stale jobs.

## AI Agent Configuration Rules

92. **EVERY agent config mutation MUST validate against `AiAgentId` enum** — Only the 7 defined agents are valid.
93. **EVERY provider_mode MUST be validated against `AiProviderMode` enum** — Only direct_api, bedrock, openclaw, inherit are valid.
94. **EVERY trigger_config JSON MUST be validated by a mode-specific Zod schema** — No arbitrary JSON.
95. **EVERY custom OSINT source URL MUST pass SSRF validation** — Use SsrfUtility.validateUrl().
96. **EVERY custom OSINT source API key MUST be encrypted at rest** — Use EncryptionUtility.encrypt().
97. **EVERY approval-required action MUST create an ApprovalRequest record before execution** — Never execute without persisted approval.
98. **EVERY agent execution MUST check token quota before calling the provider** — Check per-agent limits.
99. **EVERY trigger evaluation MUST be logged** — Log trigger type, result, agent_id, tenant_id.
100.  **NEVER hardcode OSINT source definitions in service files** — All builtins in constants files.

---

## Security Architecture (Post-Audit)

### Token Lifecycle

1. **Login** → Issues access token (`15m`) + refresh token (`7d`), both with `jti` (UUID) and `tokenType`
2. **Refresh** → Verifies refresh token type + blacklist, issues new pair, **blacklists old refresh JTI** (prevents replay)
3. **Logout** → Blacklists both access `jti` and refresh `jti` in Redis with remaining TTL
4. **Every request** → AuthGuard verifies access token, checks `tokenType === 'access'`, checks Redis blacklist

### Files Added by Security Audit

- `src/modules/auth/token-blacklist.service.ts` — Redis-backed JTI blacklist
- `src/modules/auth/dto/auth-logout.dto.ts` — Logout request validation
- `src/modules/cases/dto/list-cases-query.dto.ts` — Cases listing query validation
- `src/modules/hunts/dto/list-hunts-query.dto.ts` — Hunts listing query validation
- `src/modules/tenants/dto/list-users-query.dto.ts` — Users listing query validation

### HTTP Hardening (`main.ts`)

- X-Request-ID middleware (generates UUID if missing, propagates to response)
- Helmet with explicit CSP (default-src: self, script-src: self, frame-ancestors: none)
- HSTS (1 year, includeSubDomains, preload)
- CORS origins validated as proper URLs via `new URL()`
- Request timeout: 30 seconds (`server.setTimeout(30_000)`)
- Body size limit: 1MB (`express.json({ limit: '1mb' })`)

---

## Architecture

- **Pattern**: Backend-for-Frontend (BFF) — the Next.js frontend never calls Wazuh/OpenSearch/MISP directly
- **Framework**: NestJS 11 with TypeScript strict mode
- **Database**: PostgreSQL via Prisma ORM
- **Cache**: Redis via ioredis
- **Auth**: OIDC (Microsoft Entra ID) with JWT + JWKS verification
- **Validation**: Zod schemas for all DTOs (no class-validator)
- **Logging**: nestjs-pino (structured JSON logs)
- **Security**: Helmet, Throttler, SSRF protection, AES-256-GCM encryption at rest
- **Architecture**: Repository pattern with strict layering

### Layering (strict separation)

```
Controller → Service → Repository → Prisma
              ↓
          Utilities
```

- **Controllers**: HTTP routing, parameter extraction, validation delegation, response return. No business logic. Call ONE service method and return. Always have `@Roles()` + `RolesGuard` on mutations.
- **Services**: Thin orchestrators. Call repository methods and utility functions. NEVER import `PrismaService`. NEVER have long procedural blocks. Every 3-5 lines of cohesive logic must be extracted to a utility function.
- **Repositories**: Pure data access. Accept fully-built query params, return raw Prisma results. EVERY method takes `tenantId`. No business logic, no conditionals, no transforms, no `BusinessException`.
- **Utilities**: All business logic lives here. Mappers, transformers, filter builders, calculators, validators, formatters — all exported named functions in `<module>.utilities.ts`.
- **Types**: All interfaces/types in `<module>.types.ts` or `src/common/interfaces/`. Never inline in services/controllers.
- **Constants**: All shared constants in `<module>.constants.ts` or `src/common/constants/`. Never inline.
- **Enums**: Every string literal must be an enum. Enums in `<module>.enums.ts` or `src/common/interfaces/`.
- **DTOs**: Zod schemas in `<module>.dto.ts`. Every string field has `.max()`. Every array field has `.max()`.

### Architecture Enforcement

- **NEVER call Prisma directly from service files** — All data access through repository.
- **NEVER put business logic in controllers** — Controllers only route and delegate.
- **NEVER put logic in repositories** — Pure data access only, no conditionals or transforms.
- **NEVER inline logic in service methods** — Extract to utilities every 3-5 lines of cohesive logic.
- **NEVER duplicate logic across services** — Extract to shared utilities or services.

### File Structure Per Module

```
src/modules/<module>/
├── <module>.module.ts
├── <module>.controller.ts
├── <module>.service.ts
├── <module>.repository.ts
├── <module>.utilities.ts
├── <module>.types.ts
├── <module>.enums.ts
├── <module>.constants.ts
├── dto/
│   └── <module>.dto.ts
├── __tests__/
│   ├── <module>.service.spec.ts
│   ├── <module>.controller.spec.ts
│   └── <module>.e2e.spec.ts
```

---

## ESLint Rules (ALL enforced — `eslint.config.mjs`)

### Presets Applied

- `js.configs.recommended`
- `tseslint.configs.strict` — includes `no-dynamic-delete`, `no-invalid-void-type`, `no-unnecessary-type-arguments`, `unified-signatures`, `no-useless-constructor`, `no-array-delete`

### Plugins

- `eslint-plugin-security` — Backend security (ReDoS, injection, timing attacks, CSRF, etc.)
- `eslint-plugin-unicorn` — Modern JS best practices and code modernization
- `eslint-plugin-import-x` — Import organization and hygiene

### TypeScript Strict Rules

| Rule                            | Level     | Details                                                                      |
| ------------------------------- | --------- | ---------------------------------------------------------------------------- |
| `no-explicit-any`               | **error** | Use `unknown`, generics, or proper types                                     |
| `no-unused-vars`                | **error** | Exception: `_` prefix (`argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`) |
| `no-non-null-assertion`         | **error** | Use proper null checks (`if`, `??`, `?.`)                                    |
| `consistent-type-imports`       | **warn**  | Use `import type { Foo }` (inline style)                                     |
| `no-shadow`                     | **warn**  | Prevent variable name collisions with outer scope                            |
| `default-param-last`            | **error** | Default parameters must come last in function signature                      |
| `no-useless-empty-export`       | **error** | No empty `export {}` that does nothing                                       |
| `no-loop-func`                  | **error** | No functions defined inside loops (closure bugs)                             |
| `explicit-function-return-type` | **warn**  | Required for API contracts (allows expressions)                              |
| `no-floating-promises`          | **error** | Catch all promises (critical for NestJS async)                               |
| `no-misused-promises`           | **error** | No passing async to non-async contexts                                       |
| `prefer-nullish-coalescing`     | **warn**  | Use `??` instead of `\|\|` for nullish values                                |
| `prefer-optional-chain`         | **warn**  | Use `?.` instead of `&&` chains                                              |
| `no-extraneous-class`           | **off**   | NestJS modules are decorated empty classes                                   |

### General Code Quality Rules

| Rule                          | Level                    | Details                                                    |
| ----------------------------- | ------------------------ | ---------------------------------------------------------- |
| `eqeqeq`                      | **error**                | Always use `===` / `!==`                                   |
| `no-console`                  | **warn**                 | Only `console.warn` and `console.error` allowed            |
| `prefer-const`                | **error**                | Use `const` when not reassigned                            |
| `no-var`                      | **error**                | Use `const` / `let`                                        |
| `no-implicit-coercion`        | **error**                | No `!!`, `+str`, etc. Use explicit `Boolean()`, `Number()` |
| `no-template-curly-in-string` | **warn**                 | Warn when `${x}` appears in regular strings                |
| `curly`                       | **error** (`multi-line`) | Multi-line `if`/`else`/`for`/`while` must use braces       |
| `no-throw-literal`            | **error**                | Only throw `Error` objects                                 |
| `prefer-template`             | **warn**                 | Use template literals over string concatenation            |

#### Clean Code Rules

| Rule                    | Level     | Details                                       |
| ----------------------- | --------- | --------------------------------------------- |
| `no-useless-rename`     | **error** | No `{ foo: foo }` style renaming              |
| `object-shorthand`      | **warn**  | Use `{ foo }` instead of `{ foo: foo }`       |
| `no-lonely-if`          | **warn**  | Combine with parent `else` when possible      |
| `no-else-return`        | **warn**  | Return early instead of `else` blocks         |
| `no-unneeded-ternary`   | **error** | No `x ? true : false` (just use `x`)          |
| `prefer-arrow-callback` | **error** | Use arrow functions for callbacks             |
| `prefer-destructuring`  | **warn**  | Prefer `const { x } = obj` (objects only)     |
| `no-nested-ternary`     | **warn**  | Avoid nested `a ? b : c ? d : e`              |
| `no-useless-concat`     | **error** | No `'a' + 'b'` (just write `'ab'`)            |
| `no-return-assign`      | **error** | No assignment in return statements            |
| `no-param-reassign`     | **warn**  | Don't reassign function parameters            |
| `prefer-object-spread`  | **error** | Use `{ ...obj }` instead of `Object.assign()` |

#### Bug Prevention Rules

| Rule                         | Level     | Details                                                |
| ---------------------------- | --------- | ------------------------------------------------------ |
| `no-await-in-loop`           | **warn**  | Prefer `Promise.all()` over sequential awaits in loops |
| `no-promise-executor-return` | **error** | Don't return values from Promise executor              |
| `no-constructor-return`      | **error** | Constructors must not return values                    |
| `no-unreachable-loop`        | **error** | Loops must execute more than once                      |
| `no-self-compare`            | **error** | No `x === x` (use `Number.isNaN()` instead)            |
| `no-sequences`               | **error** | No comma operator (confusing control flow)             |

#### Security Rules (core ESLint)

| Rule              | Level     | Details                                     |
| ----------------- | --------- | ------------------------------------------- |
| `no-eval`         | **error** | Never use `eval()`                          |
| `no-implied-eval` | **error** | No `setTimeout('code')` style implicit eval |
| `no-new-func`     | **error** | No `new Function('code')`                   |
| `no-script-url`   | **error** | No `javascript:` URLs                       |

#### Security Rules (eslint-plugin-security)

| Rule                                    | Level     | Details                                              |
| --------------------------------------- | --------- | ---------------------------------------------------- |
| `detect-unsafe-regex`                   | **error** | Detect catastrophic exponential-time regexes (ReDoS) |
| `detect-non-literal-regexp`             | **warn**  | Detect `RegExp()` with non-literal arguments         |
| `detect-bidi-characters`                | **error** | Detect trojan source attacks via bidi control chars  |
| `detect-object-injection`               | **warn**  | Detect `obj[variable]` (prototype pollution risk)    |
| `detect-possible-timing-attacks`        | **warn**  | Detect timing attacks in string comparisons          |
| `detect-new-buffer`                     | **error** | Use `Buffer.alloc()`/`Buffer.from()` instead         |
| `detect-pseudoRandomBytes`              | **warn**  | `Math.random()` is not cryptographically secure      |
| `detect-non-literal-fs-filename`        | **warn**  | Non-literal fs paths (path traversal risk)           |
| `detect-child-process`                  | **warn**  | `child_process` with non-literal arguments           |
| `detect-non-literal-require`            | **warn**  | Non-literal `require()` calls                        |
| `detect-buffer-noassert`                | **error** | Buffer with noAssert flag                            |
| `detect-eval-with-expression`           | **error** | `eval()` with expression                             |
| `detect-no-csrf-before-method-override` | **error** | CSRF vulnerability detection                         |
| `detect-disable-mustache-escape`        | **error** | Disabled mustache escaping                           |

### Import Rules (eslint-plugin-import-x)

| Rule                                | Level     | Details                                                    |
| ----------------------------------- | --------- | ---------------------------------------------------------- |
| `import-x/no-duplicates`            | **error** | No duplicate imports from same module                      |
| `import-x/no-self-import`           | **error** | A module cannot import itself                              |
| `import-x/no-cycle`                 | **warn**  | Detect circular dependencies (maxDepth: 4)                 |
| `import-x/no-useless-path-segments` | **warn**  | No useless path segments                                   |
| `import-x/order`                    | **warn**  | Order: builtin -> external -> internal -> relative -> type |

### Unicorn Rules (Modern JS Best Practices)

| Rule                                | Level     | Details                                                                                                             |
| ----------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------- |
| `prefer-array-find`                 | **error** | Use `.find()` instead of `.filter()[0]`                                                                             |
| `prefer-array-flat`                 | **error** | Use `.flat()` instead of manual flattening                                                                          |
| `prefer-array-flat-map`             | **error** | Use `.flatMap()` instead of `.map().flat()`                                                                         |
| `prefer-array-some`                 | **error** | Use `.some()` instead of `.find() !== undefined`                                                                    |
| `prefer-includes`                   | **error** | Use `.includes()` instead of `.indexOf() !== -1`                                                                    |
| `no-array-for-each`                 | **warn**  | Prefer `for...of` over `.forEach()`                                                                                 |
| `prefer-string-replace-all`         | **warn**  | Use `.replaceAll()` instead of `.replace(/g/)`                                                                      |
| `prefer-string-starts-ends-with`    | **error** | Use `.startsWith()`/`.endsWith()`                                                                                   |
| `prefer-string-trim-start-end`      | **error** | Use `.trimStart()`/`.trimEnd()`                                                                                     |
| `prefer-number-properties`          | **error** | Use `Number.isNaN()`, `Number.parseInt()`, etc.                                                                     |
| `prefer-math-trunc`                 | **error** | Use `Math.trunc()` instead of `~~x`                                                                                 |
| `no-zero-fractions`                 | **error** | No `1.0` — just write `1`                                                                                           |
| `prefer-date-now`                   | **off**   | Disabled — raw `Date.now()` banned; use `nowMs()` from `date-time.utility.ts`                                       |
| `prefer-type-error`                 | **error** | Throw `TypeError` for type-checking failures                                                                        |
| `prefer-regexp-test`                | **error** | Use `.test()` instead of `.match()` for boolean checks                                                              |
| `prefer-spread`                     | **warn**  | Use `[...arr]` instead of `Array.from(arr)`                                                                         |
| `prefer-switch`                     | **warn**  | Use `switch` when 3+ `if/else if` on same variable                                                                  |
| `prefer-ternary`                    | **warn**  | Use ternary for simple if/else assignments                                                                          |
| `no-useless-undefined`              | **warn**  | Don't pass `undefined` explicitly                                                                                   |
| `no-useless-spread`                 | **error** | No `[...array]` when not needed                                                                                     |
| `no-useless-promise-resolve-reject` | **error** | Use `throw` instead of `Promise.reject()` in async                                                                  |
| `no-unnecessary-await`              | **error** | Don't await non-Promise values                                                                                      |
| `no-lonely-if`                      | **error** | Merge nested `if` into `else if`                                                                                    |
| `throw-new-error`                   | **error** | Always use `throw new Error()`, not `throw Error()`                                                                 |
| `error-message`                     | **error** | Error constructors must have a message                                                                              |
| `no-instanceof-array`               | **error** | Use `Array.isArray()` instead of `instanceof Array`                                                                 |
| `no-negated-condition`              | **warn**  | Prefer positive conditions in if/else                                                                               |
| `no-object-as-default-parameter`    | **error** | No `function(options = {})` pattern                                                                                 |
| `consistent-function-scoping`       | **warn**  | Move functions to smallest needed scope                                                                             |
| `prefer-node-protocol`              | **error** | Use `node:crypto` not `crypto`                                                                                      |
| `no-nested-ternary`                 | **error** | No nested ternaries                                                                                                 |
| `filename-case`                     | **warn**  | Files: `kebab-case` only (NestJS convention)                                                                        |
| `prevent-abbreviations`             | **warn**  | Full words preferred; allowed: `req`, `res`, `env`, `db`, `fn`, `args`, `params`, `props`, `ctx`, `dto`, `e`, `err` |

---

## Formatting (Prettier — `.prettierrc`)

| Setting         | Value                   |
| --------------- | ----------------------- |
| Semi            | `false` (no semicolons) |
| Single quotes   | `true`                  |
| Print width     | `100`                   |
| Tab width       | `2`                     |
| Trailing comma  | `es5`                   |
| Arrow parens    | `avoid`                 |
| Bracket spacing | `true`                  |
| End of line     | `lf`                    |

---

## TypeScript Configuration (`tsconfig.json`)

- **Target**: ES2022
- **Module**: CommonJS (NestJS requirement)
- **ALL strict flags enabled**: `strict`, `noImplicitAny`, `strictNullChecks`, `strictBindCallApply`
- **`noUncheckedIndexedAccess`**: `true` — indexed access returns `T | undefined`
- **`noFallthroughCasesInSwitch`**: `true` — switch cases must `break`/`return`
- **`forceConsistentCasingInFileNames`**: `true`
- **Decorators**: `emitDecoratorMetadata` + `experimentalDecorators` (NestJS requires both)

### Path Alias

```typescript
@/* -> ./src/*
```

---

## Pre-Commit Hooks (Husky + lint-staged)

On every commit, the following checks run automatically on staged files:

1. **ESLint** — Lints all staged `.ts` files
2. **TypeScript** — `tsc --noEmit --pretty` (full type check)
3. **Prettier** — Formats all staged `.ts`, `.json`, `.md`, `.yml`, `.yaml` files

Configuration:

- `.husky/pre-commit` runs `npm run lint-staged`
- `.lintstagedrc.cjs` — Uses `npm run` scripts
- `.husky/install.mjs` — Skips Husky install in CI/production/Vercel/GitHub Actions

---

## Key Principles

1. **Multi-tenant isolation**: Every query MUST be scoped by `tenantId`. Never return data from another tenant.
2. **RBAC enforcement**: Use `@Roles()` decorator on every mutation endpoint. Guard chain: `AuthGuard` (JWT verify + DB active check + GLOBAL_ADMIN tenant switch) → `TenantGuard` → `RolesGuard`.
3. **Zod for validation**: All DTOs use Zod schemas via `ZodValidationPipe`. No class-validator.
4. **Secrets encrypted at rest**: Connector configs stored via AES-256-GCM encryption (`src/common/utils/encryption.utility.ts`).
5. **SSRF protection**: All user-supplied URLs validated against allowlist before any outbound request (`src/common/utils/ssrf.utility.ts`).
6. **Audit logging**: All mutations automatically logged via `AuditInterceptor`.
7. **Auth guard validates user on every request**: After JWT verification, the guard calls `validateUserActive(userId)` which checks the user still exists and has `status: 'active'`. Blocked/deleted users get 401.
8. **GLOBAL_ADMIN tenant switching**: The auth guard reads the `X-Tenant-Id` header. If the user is `GLOBAL_ADMIN` and the header contains a valid tenant ID different from the JWT's, `request.user.tenantId` is overridden. This makes `@TenantId()` return the switched tenant automatically. Non-GLOBAL_ADMIN users cannot switch tenants.
9. **Soft delete + restore pattern**: User deletion sets `status` to `inactive`, not database deletion. Blocking sets `status` to `suspended`. Both are reversible with restore/unblock endpoints.

---

## Role Hierarchy (most to least privileged)

1. `GLOBAL_ADMIN`
2. `TENANT_ADMIN`
3. `SOC_ANALYST_L2`
4. `THREAT_HUNTER`
5. `SOC_ANALYST_L1`
6. `EXECUTIVE_READONLY`

> **Protected users**: The seeded GLOBAL_ADMIN users have `isProtected: true` in the database. They cannot be deleted, blocked, or have their role changed by anyone, including other GLOBAL_ADMIN users. The `isProtected` flag is set during seed and should never be set manually.

---

## User Management Patterns

### Soft Delete

- `DELETE /tenants/:id/users/:userId` → sets `status: 'inactive'` (not hard delete)
- `POST /tenants/:id/users/:userId/restore` → sets `status: 'active'`

### Block/Unblock

- `POST /tenants/:id/users/:userId/block` → sets `status: 'suspended'`
- `POST /tenants/:id/users/:userId/unblock` → sets `status: 'active'`

### Validation Rules

- Cannot delete/block yourself (`callerId !== userId`)
- Cannot delete/block/modify protected users (`isProtected: true`)
- Protected user role cannot be changed
- All operations require `TENANT_ADMIN` or higher role
- All changes are audit-logged

### User Statuses

| Status      | Meaning      | Can Login | Restorable      |
| ----------- | ------------ | --------- | --------------- |
| `active`    | Normal state | Yes       | N/A             |
| `inactive`  | Soft-deleted | No (401)  | Yes (`restore`) |
| `suspended` | Blocked      | No (401)  | Yes (`unblock`) |

---

## Project Structure

```
src/
+-- app.module.ts           # Root module
+-- main.ts                 # Application bootstrap
+-- common/
|   +-- decorators/         # @CurrentUser, @Roles, @Public, @TenantId
|   +-- filters/            # Exception filters
|   +-- guards/             # AuthGuard, TenantGuard, RolesGuard
|   +-- interceptors/       # AuditInterceptor
|   +-- interfaces/         # Shared interfaces (AuthenticatedRequest, JwtPayload)
|   +-- pipes/              # ZodValidationPipe
|   +-- utils/              # encryption.utility.ts, mask.utility.ts, ssrf.utility.ts
+-- config/                 # env.validation.ts (Zod env schema)
+-- modules/
|   +-- ai/                 # AI-powered analysis endpoints
|   |   +-- dto/            # ai-hunt.dto, ai-investigate.dto, ai-explain.dto
|   |   +-- ai.types.ts     # AiTokenUsage, AiResponse
|   +-- alerts/             # Alert management (Wazuh alerts)
|   |   +-- dto/            # search-alerts.dto, investigate-alert.dto, close-alert.dto
|   |   +-- alerts.types.ts # Alert, PaginatedResult
|   +-- auth/               # Authentication (OIDC callback, token exchange)
|   |   +-- dto/            # auth-callback.dto, auth-refresh.dto, auth-logout.dto
|   |   +-- token-blacklist.service.ts # Redis-backed JTI blacklist for token revocation
|   +-- cases/              # Case management (CRUD, notes, linked alerts)
|   |   +-- dto/            # create-case.dto, update-case.dto, create-note.dto, link-alert.dto
|   |   +-- cases.types.ts  # CaseRecord, CaseNote, PaginatedCases, etc.
|   +-- connectors/         # Connector management + service adapters
|   |   +-- dto/            # connector.dto, toggle-connector.dto
|   |   +-- services/       # wazuh, opensearch, misp, shuffle, bedrock adapters
|   |   +-- connectors.types.ts # ConnectorResponse, TestResult, ConnectorTestResult
|   +-- dashboards/         # Dashboard aggregation endpoints
|   +-- health/             # Health check endpoints
|   |   +-- health.types.ts # ServiceHealthResult, OverallHealth
|   +-- hunts/              # Threat hunting endpoints
|   |   +-- dto/            # run-hunt.dto
|   |   +-- hunts.types.ts  # HuntEvent, HuntRunResult
|   +-- intel/              # Threat intelligence (MISP integration)
|   |   +-- dto/            # match-iocs.dto
|   |   +-- intel.types.ts  # MISPEvent, IOCSearchResult, IOCMatchResult
|   +-- tenants/            # Tenant management
|   |   +-- dto/            # tenant.dto
|   |   +-- tenants.types.ts # TenantRecord, UserRecord (isProtected field)
|   +-- users/              # User profile + preferences
|   |   +-- dto/            # update-profile.dto, change-password.dto, update-preferences.dto
|   |   +-- users.types.ts  # UserProfile, UserPreference
+-- prisma/
    +-- prisma.module.ts
    +-- prisma.service.ts
    +-- schema.prisma
test/
+-- utils/                  # Unit tests for utility functions
```

---

## Commands

```bash
# Development
npm run start:dev           # Development with watch mode
npm run start:debug         # Debug mode with watch
npm run start:prod          # Production mode

# Build
npm run build               # Production build (nest build)

# Linting & Formatting
npm run lint                # ESLint check
npm run lint:strict         # ESLint with zero warnings allowed
npm run lint:fix            # ESLint auto-fix
npm run format              # Prettier format all files
npm run format:check        # Prettier check (no write)

# Type Checking
npm run typecheck           # TypeScript type check (no emit)
npm run typecheck:watch     # Type check in watch mode

# Validation (all checks)
npm run validate            # typecheck + lint:strict + format:check
npm run validate:fix        # lint:fix + format

# Reports
npm run lint-report-all     # Generate ESLint JSON report (all files)
npm run lint-report-ts      # Generate ESLint JSON report (TS only)

# Testing
npm run test                # Run unit tests
npm run test:watch          # Tests in watch mode
npm run test:cov            # Tests with coverage
npm run test:e2e            # End-to-end tests

# Database
npm run prisma:generate     # Generate Prisma client
npm run prisma:migrate      # Run migrations (dev)
npm run prisma:migrate:prod # Run migrations (production)
npm run prisma:seed         # Seed database
npm run prisma:studio       # Open Prisma Studio

# Docker
npm run docker:up           # Start containers
npm run docker:down         # Stop containers
npm run docker:dev          # Start with dev overrides
```

---

## NestJS Conventions

### Module Pattern

NestJS modules are decorated empty classes — this is the intended pattern. `@typescript-eslint/no-extraneous-class` is turned off.

```typescript
@Module({
  imports: [PrismaModule],
  controllers: [AlertsController],
  providers: [AlertsService],
})
export class AlertsModule {}
```

### Controller Pattern

Controllers handle HTTP routing, validation, and delegation to services. Use decorators for auth, roles, and parameter extraction.

```typescript
@Controller('alerts')
@UseGuards(AuthGuard, TenantGuard, RolesGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @Roles(UserRole.SOC_ANALYST_L1)
  async getAlerts(
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AlertsResponse> {
    return this.alertsService.getAlerts(tenantId)
  }
}
```

> **Note on GLOBAL_ADMIN tenant switching**: `@TenantId()` automatically returns the switched tenant ID when a GLOBAL_ADMIN sends an `X-Tenant-Id` header. Controllers do not need special handling — the auth guard performs the override on `request.user.tenantId` before the controller runs.

### Service Pattern

Services are thin orchestrators. Call repository methods and util functions. Use NestJS `Logger` instead of `console.log`. NEVER import `PrismaService` — use the repository.

```typescript
@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name)

  constructor(private readonly alertsRepository: AlertsRepository) {}
}
```

### Repository Pattern

Repositories handle all Prisma data access. Pure data operations only — no business logic, no conditionals, no `BusinessException`.

```typescript
@Injectable()
export class AlertsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string, page: number, limit: number) {
    return this.prisma.alert.findMany({
      where: { tenantId },
      skip: (page - 1) * limit,
      take: limit,
    })
  }
}
```

### DTO Pattern (Zod)

All DTOs use Zod schemas. Validate with `ZodValidationPipe`.

```typescript
import { z } from 'zod'

export const CreateAlertSchema = z.object({
  title: z.string().min(1).max(255),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
})

export type CreateAlertDto = z.infer<typeof CreateAlertSchema>
```

---

## File Naming

- All files use **kebab-case**: `auth.guard.ts`, `create-case.dto.ts`, `ssrf.utility.ts`
- Modules follow NestJS conventions: `*.module.ts`, `*.controller.ts`, `*.service.ts`
- Repositories: `<module>.repository.ts` — pure data access layer
- Utilities: `<module>.utilities.ts` — business logic functions (mappers, transformers, validators). **NEVER use `.utils.ts`** — `unicorn/prevent-abbreviations` requires the full word `utilities`.
- Common utilities: `src/common/utils/<name>.utility.ts` — **NEVER use `.util.ts`** — use `.utility.ts` (same ESLint rule).
- DTOs in `dto/` subdirectory per module
- Type/interface files: `<module>.types.ts` at the module root (e.g. `alerts.types.ts`)
- Enum files: `<module>.enums.ts` — module-specific enums
- Constants files: `<module>.constants.ts` — module-specific constants
- Exported domain types go in `*.types.ts`, NOT in service files
- Internal-only interfaces (not used outside the file) stay in the service file
- Connector adapter services share types from `connectors.types.ts`

---

## Testing

- Unit tests: `test/` directory, `*.spec.ts` pattern
- Test guards, utilities, and pipes — services tested via e2e
- Test files have relaxed ESLint rules (no `any` enforcement, no return type requirements)
- Run tests before committing: `npm test`

### Testing Requirements Per Module

For every module, the following test coverage is required:

- Unit tests for services and utilities
- Integration/e2e tests for all endpoints
- Validation tests (invalid inputs, boundary values)
- RBAC tests (unauthorized access denied)
- Tenant isolation tests (cannot access other tenant data)
- Error path tests (missing data, invalid state transitions)
- Seed idempotency validation

Run before claiming done:

```bash
npm run lint
npm run build
npm test
```

---

## Migration Rules

- **ALWAYS generate a migration when schema changes**: `npx prisma migrate dev --name <descriptive-name>`
- **NEVER edit existing migrations** — Create new ones.
- Test migration applies cleanly on fresh DB.
- Seed must work after migration.

---

## Code Quality Checklist

Before committing any module:

- [ ] No `any` types
- [ ] No ESLint disables
- [ ] No `console.log`
- [ ] No raw string literals (all enums)
- [ ] No Prisma in services (all in repository)
- [ ] No business logic in controllers
- [ ] No logic in repositories
- [ ] All service methods are short (logic in utilities)
- [ ] All functions have explicit return types
- [ ] No `Array#reduce()` — use `for...of` loops
- [ ] No nested ternaries
- [ ] No `await` in loops (use `Promise.all()` for independent operations)
- [ ] No abbreviated names (`.utility.ts` not `.util.ts`, `definition` not `def`)
- [ ] No raw `new Date()` or `Date.now()` — use `dayjs` via `date-time.utility.ts`
- [ ] All queries tenant-scoped
- [ ] All mutations have RBAC guards
- [ ] All DTOs have Zod with `.max()`
- [ ] All exceptions use `BusinessException` with `messageKey`
- [ ] All `messageKey`s in all 6 i18n files
- [ ] All tests pass
- [ ] Lint passes
- [ ] Build passes

---

## Libraries — Reference

| Library             | Purpose                          | Import                                         |
| ------------------- | -------------------------------- | ---------------------------------------------- |
| `@nestjs/common`    | Core NestJS decorators/utilities | `Injectable`, `Controller`, `Module`, `Logger` |
| `@nestjs/config`    | Environment configuration        | `ConfigService`                                |
| `@nestjs/swagger`   | API documentation                | `ApiTags`, `ApiOperation`                      |
| `@nestjs/throttler` | Rate limiting                    | `ThrottlerGuard`                               |
| `@prisma/client`    | Database ORM                     | via `PrismaService`                            |
| `zod`               | Schema validation                | `z.object()`, `z.string()`                     |
| `helmet`            | HTTP security headers            | Applied globally in `main.ts`                  |
| `nestjs-pino`       | Structured logging               | `LoggerModule`                                 |
| `ioredis`           | Redis client                     | Cache operations                               |
| `jwks-rsa`          | JWKS key retrieval               | JWT verification                               |
| `jsonwebtoken`      | JWT parsing/verification         | Token validation                               |
| `dayjs`             | Date/time operations             | via `src/common/utils/date-time.utility.ts`    |
| `uuid`              | UUID generation                  | `randomUUID()` from `node:crypto` preferred    |

---

## Commit Messages

Follow Conventional Commits (enforced by commitlint):

- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation only
- `style:` — Formatting, no code change
- `refactor:` — Code change that neither fixes a bug nor adds a feature
- `perf:` — Performance improvement
- `test:` — Adding or updating tests
- `build:` — Build system or dependency changes
- `ci:` — CI configuration changes
- `chore:` — Other changes (tooling, configs)
- `revert:` — Revert a previous commit

Subject max length: 100 characters. No sentence-case, start-case, PascalCase, or UPPER_CASE in subject.

---

## Audit Rules (discovered during SpearX audit — MANDATORY)

### Shared Utilities

19. **Always use `toSortOrder()` from `src/common/utils/query.utility.ts`** — Never inline `sortOrder === 'asc' ? 'asc' : 'desc'`. Import and use the shared utility.

### Service Method Size

20. **No service method > 20 lines** — Extract logic (validation, mapping, query building, prompt construction, response parsing) into the module's `*.utilities.ts` file. The service method should read like a recipe: call util, call repo, return result.

### Tenant Scoping

21. **Every `update()` and `delete()` in a repository MUST include `tenantId` (or parent entity ID) in the where clause** — No exceptions. Use `updateMany({ where: { id, tenantId } })` + `findFirst` pattern when Prisma doesn't support compound unique. This is a critical security requirement for tenant isolation.

### Seed Idempotency

22. **All seed `.create()` calls MUST be idempotent** — Use `findFirst` guard + try/catch, or `.upsert()` with `update: {}`. Seeds must run twice without error. Use deterministic UUIDs for tenant records. Wrap each section in try/catch to log warnings, never crash.

### Query Optimization

23. **Never fetch all records to count in JS** — Use Prisma `_count`, `_avg`, `_sum`, `groupBy`, or raw SQL aggregations instead of `.findMany()` + `.length` / `.reduce()`.
24. **Every `findMany` must have pagination (`take` + `skip`)** — Exception: small lookup tables (dropdowns, enum-like data). Add `take: 500` as a safety limit for larger unbounded queries.
25. **BigInt fields (`totalTokens`, `processedCount`, `fileSize`) must serialize as strings** — Use `String()` not `Number()` to prevent JS Number overflow in API responses.

### Database Indexes

26. **Every FK field and every field used in `where` filters must have an `@@index`** — Especially `tenantId` on high-traffic tables. `@unique` fields already have implicit indexes.
27. **Dashboard analytics MUST stay query-driven and reusable** — Extend shared dashboard contracts and module utilities before adding endpoint-specific shaping in controllers or services.
28. **Operational metrics changes MUST ship with tests and docs** — New dashboards, reports, session controls, or role-aware admin flows must include validation coverage plus README/INSTALL/docs updates when contributor workflows or product behavior change.
29. **NEVER instantiate Redis directly with `new Redis()`** — Always inject the shared Redis client via `@Inject(REDIS_CLIENT)` from `src/redis`. The `RedisModule` is `@Global()` and provides a singleton connection. Creating separate Redis connections wastes resources, duplicates config, and makes connection management inconsistent. Import: `import { REDIS_CLIENT } from '../../redis'` and `import Redis from 'ioredis'` (for the type only).
30. **NEVER hardcode AI agent IDs as string literals** — Use `AiAgentId` enum from `src/common/enums/ai-agent-config.enum.ts`. Write `AiAgentId.ALERT_TRIAGE` not `'alert-triage'`.
31. **AI event listeners MUST be fire-and-forget** — Use `void this.agentEventListener.onX()` pattern wrapped in try-catch. AI failures must NEVER block core operations (alert creation, incident escalation, job processing). Use `@Optional()` + `@Inject(forwardRef(...))` for graceful degradation when AI module is unavailable.
32. **Agent automation dispatch MUST go through OrchestratorService** — Never call AI directly from event listeners or schedulers. The orchestrator validates: agent enabled, automation mode, budget/quota, provider availability, and approval requirements before enqueuing jobs.
33. **Cross-cutting libraries MUST be modularized as shared modules** — ANY library, utility, or infrastructure concern — even if used by only 1 module — MUST be wrapped in a dedicated shared module under `src/redis/`, `src/common/services/`, or a new top-level `src/<concern>/` directory. Never instantiate external library clients (Redis, Axios, S3, SMTP, crypto, Bull, WebSocket, etc.) directly in service constructors. Each shared module provides a `@Global()` NestJS module or a plain reusable class. Examples: `RedisModule` for Redis, `ServiceLogger` for logging, `PrismaModule` for database, `AxiosService` for HTTP. When adding ANY new infrastructure dependency, create a shared module first, then inject it.
34. **Service logging MUST use `ServiceLogger` from `src/common/services/service-logger.ts`** — Never define inline `logEntry()`, `logError()`, `logSuccess()` helper methods in service files. Instead, instantiate `ServiceLogger` in the constructor: `this.log = new ServiceLogger(this.appLogger, AppLogFeature.X, 'ClassName')`. Then call `this.log.entry()`, `this.log.success()`, `this.log.error()`, `this.log.warn()`, `this.log.debug()`, `this.log.skipped()`. This eliminates ~83 duplicate helper methods across services and ensures consistent structured log format.
35. **NEVER use raw `new Date()` or `Date.now()`** — All date/time operations MUST use `dayjs` via the shared utility at `src/common/utils/date-time.utility.ts`. This ensures consistent timezone handling, testability, and eliminates scattered date arithmetic. Use the following functions:
    - `nowDate()` instead of `new Date()` for current timestamp
    - `nowMs()` instead of `Date.now()` for performance timing
    - `nowUnix()` instead of `Math.floor(Date.now() / 1000)` for epoch seconds
    - `toIso(date?)` instead of `.toISOString()` for serialization
    - `toDay(value)` instead of `new Date(value)` for parsing strings/numbers
    - `daysAgo(n)` instead of manual date arithmetic for "N days ago" patterns
    - `elapsedMs(startMs)` instead of `Date.now() - start` for latency tracking
    - `startOf(unit, date?, { utc: true })` for UTC day/month boundaries
    - `fromUnixToDate(epoch)` instead of `new Date(epoch * 1000)` for epoch conversion
    - `diffMs(from, to)` instead of `.getTime() - .getTime()` for duration calculation
    - `getYear()`, `getMonth()`, `getYearMonth()` instead of `.getFullYear()`, `.getMonth()`
    - `expiresInSeconds(ttl)` instead of `new Date(Date.now() + ttl * 1000)` for expiry
    - `remainingSecondsUntilEpoch(epoch)` / `remainingSecondsUntilDate(date)` for TTL computation
    - `: Date` type annotations in interfaces/types MUST remain as native `Date` (Prisma compatibility)
    - Date-only strings in tests MUST include explicit UTC timezone: `toDay('2025-01-01T00:00:00.000Z')` not `toDay('2025-01-01')`

---

## RBAC / Permission System

- **Permission enum** (`src/common/enums/permission.enum.ts`) is the single source of truth. When adding a new permission, ALL steps must be completed in one change:
  1. Add to the backend `Permission` enum (`src/common/enums/permission.enum.ts`)
  2. Add to `permission-definitions.ts` (with `labelKey` matching `roleSettings.permissions.<module>.<action>` and `sortOrder`)
  3. Add to `default-permissions.ts` for appropriate roles (only PLATFORM_OPERATOR and TENANT_ADMIN for admin-level permissions)
  4. Add `@RequirePermission()` decorator to the controller endpoint
  5. Create Prisma migration using `WHERE NOT EXISTS` pattern (NOT `ON CONFLICT ("key")` — the unique constraint is compound `(tenantId, key)`)
  6. Mirror the new permission in the frontend enum (`src/enums/permission.enum.ts`)
  7. Create the frontend Next.js API proxy route (`src/app/api/<path>/route.ts` using `proxyToBackend()`)
  8. Add frontend service method, TanStack Query hook, and UI elements (button/dialog gated by `hasPermission()`)
  9. Add i18n translations in ALL 6 locale files: feature text (e.g., `jobs.cancelAll`) AND `roleSettings.permissions.<module>.<action>` label
  10. Run `npx prisma db seed` to populate the database
- **NEVER use `@Roles()` decorator for permission checks** — use `@RequirePermission(Permission.X)` instead. The `PermissionsGuard` handles all permission checks including GLOBAL_ADMIN bypass.
- **`@AllowCaseOwner()` decorator** allows case owners to bypass permission checks on case-specific endpoints (tasks, artifacts, comments, status changes). Applied alongside `@RequirePermission()`.
- **GLOBAL_ADMIN always bypasses** all permission checks — this is handled in `PermissionsGuard`, not in individual services.
- **Seeder is idempotent** — uses `createMany` with `skipDuplicates` and cleans up stale permissions. Safe to run multiple times.
- **`/tenants/current` and `/tenants/current/members`** are intentionally unguarded by permissions — any authenticated user needs tenant context. Protected by `AuthGuard` + `TenantGuard` only.
