# Skill: Add a connector type (`apps/api` — connectors module)

> **Read [`AGENTS.md`](../../AGENTS.md) first** (loading order §1 + the security §6 / AI §7
> invariants), then the backend + security rules for this area:
> [`rules/security/security-rules.md`](../../rules/security/security-rules.md) (§8 SSRF,
> connector `TENANT_ADMIN` rule), [`rules/backend/dto-validation-rules.md`](../../rules/backend/dto-validation-rules.md),
> [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md) (§6 —
> `@Roles()` is legacy but **retained** for connector mutations), and
> [`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md). Then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) — especially ABSOLUTE RULES **39**
> (per-type Zod schema + `validateConnectorConfig`), **55** (`TENANT_ADMIN` on mutations),
> **59** (SSRF at input time), **44/63** (error sanitization), **50** (TLS warn), **66**
> (audit redaction). Sibling onboarding: [`skills/`](../), [`rules/`](../../rules/),
> [`memory/`](../../memory/), [`context/`](../../context/), [`docs/`](../../docs/). Stable
> truths: [`memory/PROJECT_MEMORY.md`](../../memory/PROJECT_MEMORY.md),
> [`memory/TECHNICAL_MEMORY.md`](../../memory/TECHNICAL_MEMORY.md). Deep reference:
> [`docs/SECURITY.md`](../../docs/SECURITY.md) + [`docs/security/`](../../docs/security/).
>
> **No AI agent may edit first and understand later.** The connectors module wires a new
> type in **five** coordinated places. Inspect the existing `shuffle` flow end-to-end, copy
> it, then adapt. Do not invent file layouts, decorators, or exception shapes — the linter,
> the `GlobalExceptionFilter`, and the `ConnectorsService` constructor are strict.

A "connector" is an outbound integration to security infrastructure (SIEM, SOAR, threat
intel, AI providers). Each type stores a **type-specific config** (URLs + credentials),
**AES-256-GCM-encrypted at rest**, validated by its **own Zod schema** before encryption,
with **SSRF-validated URLs at input time**. Adding a new type (`<t>`, e.g. `qradar`) means:
register the type, add a per-type Zod config schema + `validateConnectorConfig` entry, add
an adapter service implementing `ConnectorTestable`, and wire it into the module and the
service's runtime maps. All of this lives under
[`apps/api/src/modules/connectors/`](../../apps/api/src/modules/connectors/).

The 11 existing types: `wazuh`, `graylog`, `logstash`, `velociraptor`, `grafana`,
`influxdb`, `misp`, `shuffle`, `bedrock`, `llm_apis`, `openclaw_gateway`.

---

## When to use

Use this skill when you need to **add a new connector type** to the BFF — a new outbound
SIEM/SOAR/intel/AI integration the platform can configure per-tenant, test, and call.

**Do not** use this skill for:

- A new **HTTP route** that is not a connector → [`skills/backend/add-endpoint.md`](add-endpoint.md).
- A new **AI provider** that participates in the AI cascade → it is still a connector
  (`bedrock` / `llm_apis` / `openclaw_gateway` are the references), but also read
  [`skills/ai/add-ai-feature.md`](../ai/add-ai-feature.md) and CLAUDE.md rules 88–89
  (cascade tries **all** connectors; never a mock mode). Register it in
  `findAvailableAiConnectors()` and the AI routing, not just the test map.
- A new **field on an existing connector type** → just extend that type's existing Zod
  schema in `dto/connector.dto.ts` (add `.max()`), and add the key to `URL_KEYS` in
  `connectors.constants.ts` if it holds a URL. No new service needed.
- LLM-specific custom connectors (the `llm-connectors/` sub-module) — those have their own
  CRUD under `apps/api/src/modules/connectors/llm-connectors/`; follow that sub-module's
  shape if extending it.

---

## Files to inspect first (copy the `shuffle` type end-to-end)

`shuffle` is the simplest full reference (URL + API key + TLS toggle). Copy its shape:

| Concern                                 | File / symbol                                                                                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Per-type Zod config schemas + validator | `apps/api/src/modules/connectors/dto/connector.dto.ts` (`ShuffleConfigSchema`, `connectorConfigSchemas` Map, `validateConnectorConfig`, `ConnectorTypeEnum`) |
| Adapter service (the reference)         | `apps/api/src/modules/connectors/services/shuffle.service.ts` (implements `testConnection(config)`)                                                          |
| Adapter contract                        | `apps/api/src/modules/connectors/connectors.types.ts` (`ConnectorTestable`, `TestResult`)                                                                    |
| Service wiring + runtime maps           | `apps/api/src/modules/connectors/connectors.service.ts` (`buildTestServiceMap()`, `validateAndSanitizeConfig()`, `create()`, `validateConfigUrls()`)         |
| Module DI                               | `apps/api/src/modules/connectors/connectors.module.ts` (`providers` + `exports`)                                                                             |
| Controller (routes — already generic)   | `apps/api/src/modules/connectors/connectors.controller.ts`                                                                                                   |
| Type-name enum                          | `apps/api/src/common/enums/connector-type.enum.ts` (`ConnectorType`)                                                                                         |
| URL field registry                      | `apps/api/src/modules/connectors/connectors.constants.ts` (`URL_KEYS`) + `connectors.utilities.ts` (`extractUrlFields`)                                      |

Shared infrastructure you **import** (do not reinvent):

| Concern                     | File / symbol                                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AES-256-GCM encrypt         | `apps/api/src/common/utils/encryption.utility.ts` (`encrypt` / `decrypt`; `aes-256-gcm`, 16-byte IV + auth tag)                                         |
| SSRF validation             | `apps/api/src/common/utils/ssrf.utility.ts` (`resolveAndValidateUrl` — DNS-aware; `validateUrl` — sync) + `ssrf.constants.ts` (`PRIVATE_HOST_PATTERNS`) |
| Secret masking              | `apps/api/src/common/utils/mask.utility.ts` (`maskSecrets`)                                                                                             |
| Shared HTTP client          | `apps/api/src/common/modules/axios` (`AxiosService.fetch`)                                                                                              |
| `BusinessException`         | `apps/api/src/common/exceptions/business.exception.ts`                                                                                                  |
| Permission enum / decorator | `apps/api/src/common/enums/permission.enum.ts`, `common/decorators/permission.decorator.ts`                                                             |
| i18n error keys             | `apps/api/src/i18n/en.json` + `ar.json`, `es.json`, `fr.json`, `de.json`, `it.json`                                                                     |

---

## Exact step-by-step implementation

> Replace `<t>` with the lowercase type id (e.g. `qradar`), `<T>` with PascalCase
> (e.g. `QRadar`). Keep the type id identical across **all five** registration points —
> a mismatch silently breaks validation or testing.

### 1. Register the type name — `ConnectorType` enum + the two DTO type lists

Add the value to the enum (rule 12 — never raw string literals) in
`apps/api/src/common/enums/connector-type.enum.ts`:

```ts
export enum ConnectorType {
  // ...existing...
  QRADAR = 'qradar',
}
```

Then add the **same** string to **both** type lists in
`apps/api/src/modules/connectors/dto/connector.dto.ts`:

- `ConnectorTypeEnum` (the `z.enum([...])` the create/test DTOs validate against), and
- the `connectorConfigSchemas` Map (step 2).

If the create payload is rejected with a Zod enum error, you forgot `ConnectorTypeEnum`.

### 2. Per-type Zod config schema + `validateConnectorConfig` entry (rule 39)

In `dto/connector.dto.ts`, add a schema next to the others. **Every string field needs
`.max()`** (rule 27); **every array `.max()`** (rule 28). Use `.passthrough()` only if the
adapter reads extra keys (mirror `ShuffleConfigSchema`). Booleans like `verifyTls` are
optional. Do **not** add the field to `URL_KEYS` unless it is a URL.

```ts
export const QRadarConfigSchema = z
  .object({
    baseUrl: z.string().max(500).optional(),
    apiToken: z.string().max(500).optional(),
    verifyTls: z.boolean().optional(),
  })
  .passthrough()
```

Register it in the `connectorConfigSchemas` Map so `validateConnectorConfig(type, config)`
finds it:

```ts
const connectorConfigSchemas = new Map<string, z.ZodType<Record<string, unknown>>>([
  // ...existing...
  ['qradar', QRadarConfigSchema],
])
```

> `validateConnectorConfig` returns the **parsed** config and is the only validator the
> service calls before encryption. If a type has **no** Map entry it falls through to
> "return as-is" (no validation) — that is a security gap. Always add the Map entry.

### 3. Add URL fields to the SSRF allowlist registry (rule 59)

If the config has any URL field whose key is **not** already in `URL_KEYS`, add it to
`apps/api/src/modules/connectors/connectors.constants.ts`:

```ts
export const URL_KEYS = new Set([
  'baseUrl',
  'managerUrl',
  'indexerUrl',
  'webhookUrl',
  'apiUrl',
  'grafanaUrl',
  'mispUrl',
  // add yours only if it is a new key name not already listed:
])
```

`extractUrlFields(config)` (in `connectors.utilities.ts`) collects every value whose key is
in `URL_KEYS`; the service passes each through `resolveAndValidateUrl` (step 5). A URL field
whose key is **not** in `URL_KEYS` is **never SSRF-validated** — that is rule 59 violated.
Prefer reusing `baseUrl` over inventing a new key.

### 4. Adapter service — `services/<t>.service.ts` (implements `ConnectorTestable`)

Copy `services/shuffle.service.ts`. The service is an `@Injectable()` that uses the shared
`AxiosService` and **must** expose `testConnection(config): Promise<TestResult>` (the
`ConnectorTestable` contract in `connectors.types.ts`). It is a thin orchestrator (rules
14a) — extract helpers into `connectors.utilities.ts`, throw nothing raw, return
`{ ok, details }`.

```ts
@Injectable()
export class QRadarService implements ConnectorTestable {
  private readonly logger = new Logger(QRadarService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = config.baseUrl as string | undefined
    if (!baseUrl) return { ok: false, details: 'QRadar URL not configured' }
    const apiToken = config.apiToken as string | undefined
    if (!apiToken) return { ok: false, details: 'QRadar API token not configured' }

    try {
      const res = await this.httpClient.fetch(`${baseUrl}/api/system/about`, {
        headers: { SEC: apiToken },
        rejectUnauthorized: config.verifyTls !== false, // rule 50: warn if false (see below)
      })
      if (res.status !== 200) {
        return { ok: false, details: formatRemoteError('QRadar', res.status, res.data) }
      }
      return { ok: true, details: `QRadar reachable at ${baseUrl}.` }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Connection failed'
      this.logger.warn(`QRadar connection test failed: ${message}`)
      return { ok: false, details: message }
    }
  }
}
```

- Use enums for `connectorType` metadata (`ConnectorType.QRADAR`), `HttpMethod`,
  `AppLogFeature.CONNECTORS` — never raw strings (rule 12).
- When you pass `rejectUnauthorized: false`, log a `console.warn` with the connector type
  (rule 50 / `connector-http` convention).
- **Never** log the decrypted config, `apiToken`, or `Authorization` headers (rules 57, 66).
- Do **not** add `tenantId`/permission logic here — the service layer already enforced it.

### 5. Wire the service into DI + the runtime maps — `connectors.module.ts` + `connectors.service.ts`

**a.** `connectors.module.ts` — add `QRadarService` to **both** `providers` and `exports`
(exported so other modules — e.g. SOAR/intel — can call it).

**b.** `connectors.service.ts` — inject it in the constructor and add it to
`buildTestServiceMap()` keyed by the **same** type id:

```ts
private buildTestServiceMap(): Map<string, ConnectorTestable> {
  return new Map<string, ConnectorTestable>([
    // ...existing...
    ['qradar', this.qradarService],
  ])
}
```

The map drives `runConnectionTest()` (`POST /connectors/:type/test`). A type missing from
the map returns `Unknown connector type` on test.

> **You do not edit the controller or the create/update/encryption flow.** They are generic:
> `ConnectorsService.create()` already runs, in order — `guardDuplicate` →
> `validateAndSanitizeConfig` (which calls `validateConnectorConfig` **then**
> `validateConfigUrls` → `resolveAndValidateUrl`) → `encrypt(JSON.stringify(validated))`.
> **Validation and SSRF happen before encryption, by construction.** Do not reorder, and do
> not encrypt unvalidated input.

### 6. RBAC — connector mutations require `TENANT_ADMIN` (rule 55)

Connector config controls security infrastructure, so create/update/toggle/delete are
**privileged**. The current `connectors.controller.ts` authorizes mutations with
`@RequirePermission(Permission.CONNECTORS_CREATE | _UPDATE | _DELETE)` (the DB-backed model;
`CONNECTORS_*` permissions are granted only to `TENANT_ADMIN`+ in
`default-permissions.ts`). **Do not weaken this** — a `SOC_ANALYST_L2` must never redirect a
connector URL or rotate an API key (rule 55). If you add a **new** mutation route, keep it
behind a `CONNECTORS_*` permission (and, per
[`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)
§6, the `@Roles(UserRole.TENANT_ADMIN)` guard is the retained legacy mechanism for
infrastructure mutations — match whichever the controller already uses; never add a less
privileged gate). Read-only routes use `Permission.CONNECTORS_VIEW`. Test endpoint is
`Permission.CONNECTORS_TEST` and is throttled `5/min` (rule 61 — anti port-scan).

If you need a brand-new permission, do [`skills/backend/add-permission.md`](add-permission.md)
**first** (enum + definitions + defaults + migration + seed + frontend mirror), then attach it.

### 7. i18n keys — all 6 locale files

Any new `messageKey` you introduce (e.g. `errors.connectors.<t>SomethingFailed`) must exist
in **all six** `apps/api/src/i18n/*.json` files (rule 49): `en.json`, `ar.json`, `es.json`,
`fr.json`, `de.json`, `it.json`. The generic connector keys
(`errors.connectors.notFound`, `.alreadyExists`, `.invalidConfig`, `.ssrfBlocked`,
`.dnsResolutionFailed`) already exist — reuse them where possible.

### 8. Tests

Add a `__tests__/<t>.service.spec.ts` covering `testConnection`: success, missing-URL,
missing-credential, and remote-failure paths (mock `AxiosService.fetch`). If you added a Zod
schema, add a case asserting `validateConnectorConfig('qradar', badConfig)` throws.

### 9. Frontend (only if the UI must offer the new type)

The connectors UI lives at `apps/web/src/app/(portal)/connectors/` with proxy routes under
`apps/web/src/app/api/connectors/`. The proxy routes are generic (`:type`), so usually **no
new route** is needed — but add the type to any frontend connector-type enum/list and i18n
labels (`apps/web/src/i18n/*.json`, all 6) so it renders. Never store config secrets in
frontend state or localStorage (web rules) — they go straight to the BFF for encryption.

---

## Validation commands (real `pnpm` commands — run from repo root)

Run these and read the output. **Never claim a gate is green without running it**
(`AGENTS.md` §5).

```bash
pnpm typecheck        # HARD gate — must pass (both apps)
pnpm lint             # many connector rules above are ESLint errors
pnpm format:check     # Prettier (no semicolons, single quotes, width 100)
pnpm test             # unit tests (add your <t>.service.spec.ts)
pnpm build            # HARD gate — must pass
```

Backend-only iteration (faster) — the connectors module lives in `@auraspear/api`:

```bash
pnpm --filter @auraspear/api typecheck
pnpm --filter @auraspear/api lint:strict   # zero-warnings; CI-quality bar
pnpm --filter @auraspear/api test
```

No Prisma change is needed for a new connector **type** (the `ConnectorConfig` model stores
`type` + `encryptedConfig` generically). You only run `pnpm prisma:*` if you did
[`add-permission.md`](add-permission.md) for a new `CONNECTORS_*` permission (then
`pnpm prisma:seed`).

---

## Docs to update

- **i18n**: all 6 `apps/api/src/i18n/*.json` (any new `messageKey`) and, if shown in the UI,
  all 6 `apps/web/src/i18n/*.json` labels — steps 7 and 9.
- **Connector inventory**: update the connector-type list in
  [`docs/PRODUCT.md`](../../docs/PRODUCT.md) / [`docs/tools/`](../../docs/tools/) and the
  `infra/docker/` connectors compose if a dev instance of the integration is provided.
- **Security docs**: if the new type introduces a new auth/credential shape or outbound
  surface, note it in [`docs/SECURITY.md`](../../docs/SECURITY.md) /
  [`docs/security/`](../../docs/security/).
- **ADR** ([`docs/decisions/`](../../docs/decisions/)): only if the type introduces a new
  integration pattern (e.g. a new transport like WebSocket — see `openclaw_gateway`).
- **AGENTS.md §11 recipe table**: not needed (this skill is already linked there as
  connector work falls under backend recipes).

---

## Security checks (the non-negotiable invariants)

- **Config validation before encryption (rule 39)**: every type has a Zod schema in the
  `connectorConfigSchemas` Map; `validateConnectorConfig(type, config)` runs **before**
  `encrypt(...)`. Never encrypt unvalidated input; never skip the Map entry.
- **AES-256-GCM at rest (`AGENTS.md` §6)**: configs are encrypted via
  `encryption.utility.ts` (`aes-256-gcm`, random 16-byte IV, auth tag). Never store config
  in plaintext, never log the decrypted config, and never weaken the cipher. The
  `CONFIG_ENCRYPTION_KEY` must be 64 hex chars — no fallback/zero key (rules 24, 53).
- **SSRF at input time (rule 59)**: every URL field (key in `URL_KEYS`) is validated by
  `resolveAndValidateUrl` during create/update — **before** storage — not only at fetch
  time. This blocks persisting `http://169.254.169.254/`, `http://10.x`, etc. Add new URL
  keys to `URL_KEYS` or they go unchecked.
- **RBAC = `TENANT_ADMIN` (rule 55)**: mutations stay behind `CONNECTORS_*` permissions
  (TENANT_ADMIN+ only). Never drop a mutation to a lower role; read routes use
  `CONNECTORS_VIEW`. GLOBAL_ADMIN passes automatically — do not special-case it.
- **Tenant isolation (`AGENTS.md` §6)**: connectors are keyed by `tenantId`; the service
  resolves it from `@TenantId()`. Never read tenant/credentials from the request body or a
  client header (rule 76 — no `X-Role` forwarding).
- **Secret hygiene (rules 57, 66)**: connector responses mask secrets via `maskSecrets`; the
  audit interceptor redacts `apiKey`, `token`, `secret`, `encryptedConfig`, `authorization`.
  Never add a credential field name that escapes redaction.
- **Error hygiene (rules 44, 63, 77)**: adapter errors go through `sanitizeErrorDetails`
  (strips file paths, truncates 500 chars). Throw only `BusinessException` with a
  `messageKey`; never leak raw remote bodies, paths, or stack traces.
- **TLS (rule 50)**: if the adapter ever uses `rejectUnauthorized: false`, log a
  `console.warn` naming the connector type. Prefer `verifyTls !== false` (secure default).
- **No env-gated bypass (rule 56)**: HTTPS enforcement / SSRF must run in every environment;
  no `if (NODE_ENV === 'development') { skip }`.
- Run [`skills/devsecops/run-security-scan.md`](../devsecops/run-security-scan.md) /
  `pnpm scan:secrets` before opening a PR.

---

## Common mistakes (each is an ESLint error, a test failure, or a security bug)

- Added the type to the `ConnectorType` enum but **not** to `ConnectorTypeEnum` in
  `connector.dto.ts` → create payload rejected with a Zod enum error.
- Added the schema but forgot the `connectorConfigSchemas` **Map** entry → config is stored
  **unvalidated** (silent rule 39 violation; no error at create time).
- Forgot `buildTestServiceMap()` / constructor injection → `POST /:type/test` returns
  `Unknown connector type`.
- New URL field whose key is not in `URL_KEYS` → URL is **never SSRF-validated** (rule 59).
- Encrypting before validating, or hand-rolling encryption instead of
  `encryption.utility.ts` → breaks the validate→SSRF→encrypt order and the GCM format.
- Adapter service does not `implements ConnectorTestable` / wrong `testConnection` signature
  → type error against the `ConnectorTestable` map.
- Logging the decrypted config / `apiKey` / `Authorization` header (rules 57, 66), or a Zod
  string field without `.max()` (rule 27).
- Dropping a connector mutation below `TENANT_ADMIN`, or adding `@Roles()` to a brand-new
  feature route instead of `@RequirePermission` (rule 55; tenant-permission-rules §6).
- Raw Nest exceptions instead of `BusinessException` with `messageKey` (rules 17, 18); new
  `messageKey` added to only `en.json` (rule 49 — all 6 files).
- `any`, `==`/`!=`, `!` non-null assertion, `console.log`, `.util.ts`/`.utils.ts`
  filenames, abbreviations (`util`, `param`, `config` is fine) → all ESLint errors
  (`apps/api/CLAUDE.md`). Files are kebab-case: `<t>.service.ts`.
- Putting helper functions / interfaces / constants inline in the service (rules 13, 14a) →
  move to `connectors.utilities.ts` / `connectors.types.ts` / `connectors.constants.ts`.
- For an **AI** connector: short-circuiting the provider cascade or adding a mock mode
  (rules 88, 89).
- Claiming "green" without running `pnpm typecheck` / `pnpm build` (`AGENTS.md` §5, §13).

---

## Final checklist

- [ ] Read `AGENTS.md`, `rules/security/security-rules.md`, `rules/backend/*`, and
      `apps/api/CLAUDE.md` (rules 39, 50, 55, 57, 59, 63, 66) before editing.
- [ ] Type id added to `ConnectorType` enum, `ConnectorTypeEnum`, and the
      `connectorConfigSchemas` Map — **identical string** in all three.
- [ ] Per-type Zod config schema added; every string field has `.max()`; registered in the
      Map so `validateConnectorConfig(type, config)` resolves it.
- [ ] URL field keys present in `URL_KEYS` (or reuse `baseUrl`) so they are SSRF-validated.
- [ ] Adapter `services/<t>.service.ts` `implements ConnectorTestable`, returns
      `{ ok, details }`, uses `AxiosService`, logs no secrets, warns on
      `rejectUnauthorized: false`.
- [ ] Service wired into `connectors.module.ts` `providers` + `exports`, injected in the
      constructor, added to `buildTestServiceMap()`.
- [ ] Confirmed the generic flow order is intact: validate (`validateConnectorConfig`) →
      SSRF (`resolveAndValidateUrl`) → `encrypt` — did **not** reorder or bypass it.
- [ ] Mutations stay behind `CONNECTORS_*` (TENANT_ADMIN+); did [`add-permission.md`](add-permission.md)
      first if a new permission was needed.
- [ ] Any new `messageKey` added to all 6 `apps/api/src/i18n/*.json`; UI labels added to all
      6 `apps/web/src/i18n/*.json` if the type is shown.
- [ ] `__tests__/<t>.service.spec.ts` covers success / missing-config / remote-failure;
      schema-validation case added.
- [ ] Ran and pasted output for `pnpm typecheck` and `pnpm build` (hard gates) plus
      `pnpm lint` / `pnpm test`. Did not say "green" without evidence.
- [ ] Final response uses the `AGENTS.md` §13 report format (Branch / Commits / Files /
      Commands run / Green checks / Failed checks / Blockers / Risks / Next steps).
