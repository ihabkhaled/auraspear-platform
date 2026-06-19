# Connector Architecture (`apps/api` — `connectors` module)

> **Entry point first.** Start your loading order at
> [`AGENTS.md`](../../AGENTS.md) (§1) — it defines the AI loading order and the
> security invariants (§6) every change must respect — then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md), the authoritative backend
> rulebook this doc summarizes. **No AI agent may edit first and understand
> later.**

A **connector** is an outbound integration to security infrastructure — SIEM,
SOAR, threat-intel, observability, and AI providers. AuraSpear is a
Backend-for-Frontend (BFF): the Next.js web app never calls Wazuh / OpenSearch /
MISP / Bedrock directly. Every external call is brokered through the API, which
owns the credentials, the tenant scoping, and the integration logic
([`docs/architecture/API.md`](API.md), [`docs/architecture/BACKEND.md`](BACKEND.md)).

This document explains **how the `connectors` module is designed and wired**:
per-type Zod config, AES-256-GCM encryption at rest, SSRF validation, adapter
services, and the RBAC that gates mutations. All code cited lives under
[`apps/api/src/modules/connectors/`](../../apps/api/src/modules/connectors/) and
[`apps/api/src/common/utils/`](../../apps/api/src/common/utils/).

## Where this doc sits

| You want…                                       | Go to                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| The hard, enforced rules (don't violate)        | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (rules 39, 44, 50, 55, 59, 63, 66, 88–89)                                |
| Step-by-step recipe to add a connector **type** | [`skills/backend/add-connector.md`](../../skills/backend/add-connector.md)                                                |
| Backend layering (controller/service/repo)      | [`docs/architecture/BACKEND.md`](BACKEND.md) · [`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md) |
| Tenancy + permission rules                      | [`rules/backend/tenant-permission-rules.md`](../../rules/backend/tenant-permission-rules.md)                              |
| DTO / Zod validation rules                      | [`rules/backend/dto-validation-rules.md`](../../rules/backend/dto-validation-rules.md)                                    |
| Security invariants (SSRF, secrets, audit)      | [`docs/SECURITY.md`](../SECURITY.md) · [`rules/security/security-rules.md`](../../rules/security/security-rules.md)       |
| AI provider cascade (how connectors are picked) | [`docs/AI.md`](../AI.md)                                                                                                  |

This file does **not** restate the global request flow, the guard chain, or the
AI provider cascade — those live in [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md)
and [`docs/AI.md`](../AI.md). It links them rather than duplicating them.

---

## 1. The 11 connector types

Defined as the canonical enum `ConnectorTypeEnum` in
[`dto/connector.dto.ts`](../../apps/api/src/modules/connectors/dto/connector.dto.ts)
and persisted via the `ConnectorType` enum in
[`prisma/schema.prisma`](../../apps/api/prisma/schema.prisma):

| Type               | Category      | Adapter service                                                                                                      |
| ------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `wazuh`            | SIEM          | [`services/wazuh.service.ts`](../../apps/api/src/modules/connectors/services/wazuh.service.ts)                       |
| `graylog`          | SIEM          | [`services/graylog.service.ts`](../../apps/api/src/modules/connectors/services/graylog.service.ts)                   |
| `logstash`         | Pipeline      | [`services/logstash.service.ts`](../../apps/api/src/modules/connectors/services/logstash.service.ts)                 |
| `velociraptor`     | DFIR          | [`services/velociraptor.service.ts`](../../apps/api/src/modules/connectors/services/velociraptor.service.ts)         |
| `grafana`          | Observability | [`services/grafana.service.ts`](../../apps/api/src/modules/connectors/services/grafana.service.ts)                   |
| `influxdb`         | Metrics       | [`services/influxdb.service.ts`](../../apps/api/src/modules/connectors/services/influxdb.service.ts)                 |
| `misp`             | Threat intel  | [`services/misp.service.ts`](../../apps/api/src/modules/connectors/services/misp.service.ts)                         |
| `shuffle`          | SOAR          | [`services/shuffle.service.ts`](../../apps/api/src/modules/connectors/services/shuffle.service.ts)                   |
| `bedrock`          | AI provider   | [`services/bedrock.service.ts`](../../apps/api/src/modules/connectors/services/bedrock.service.ts)                   |
| `llm_apis`         | AI provider   | [`services/llm-apis.service.ts`](../../apps/api/src/modules/connectors/services/llm-apis.service.ts)                 |
| `openclaw_gateway` | AI provider   | [`services/openclaw-gateway.service.ts`](../../apps/api/src/modules/connectors/services/openclaw-gateway.service.ts) |

> `OpenSearchService` is also registered in the module but indexes via the
> `opensearch` service name (it backs the Wazuh indexer / alert search), not a
> separately configurable connector type.

There is also a **second, distinct** connector concept — the `llm-connectors/`
sub-module — described in [§8](#8-llm-connectors-sub-module). The two are not the
same storage model.

---

## 2. Storage model (`ConnectorConfig`)

One row per `(tenantId, type)` — enforced by the compound unique constraint
`@@unique([tenantId, type])` in
[`prisma/schema.prisma`](../../apps/api/prisma/schema.prisma) (`model
ConnectorConfig`). The credential payload is **never** stored in plaintext or in
discrete columns; it is a single AES-256-GCM ciphertext string in
`encryptedConfig` (`@db.Text`):

| Column                                    | Purpose                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| `tenantId` + `type`                       | Compound unique key — at most one connector of each type per tenant         |
| `name`                                    | Human label (VarChar 255)                                                   |
| `enabled`                                 | Whether the connector participates in runtime calls/cascades                |
| `authType`                                | `basic` \| `api_key` \| `token` \| `iam` (`AuthType` enum, default `basic`) |
| `encryptedConfig`                         | **AES-256-GCM ciphertext** of the validated config JSON                     |
| `lastTestAt` / `lastTestOk` / `lastError` | Result of the most recent `POST /:type/test`                                |
| `lastSyncAt` / `syncEnabled`              | Sync scheduling state (see `connector-sync` module)                         |

Every repository method in
[`connectors.repository.ts`](../../apps/api/src/modules/connectors/connectors.repository.ts)
takes `tenantId` and scopes by it (lookups use the `tenantId_type` compound
key). This satisfies the tenancy invariant: every `update`/`delete` is scoped by
`tenantId`, never by `id` alone (CLAUDE.md rules 26, layering rule for
repositories).

---

## 3. Per-type Zod config (validate before encrypt)

CLAUDE.md **rule 39**: connector configs MUST be validated with per-type Zod
schemas before encrypting. Each type has its own schema in
[`dto/connector.dto.ts`](../../apps/api/src/modules/connectors/dto/connector.dto.ts)
— `WazuhConfigSchema`, `GraylogConfigSchema`, `LogstashConfigSchema`,
`VelociraptorConfigSchema`, `GrafanaConfigSchema`, `InfluxDBConfigSchema`,
`MispConfigSchema`, `ShuffleConfigSchema`, `BedrockConfigSchema`,
`LlmApisConfigSchema`, `OpenClawGatewayConfigSchema` — registered in the
`connectorConfigSchemas` map and dispatched by:

```ts
validateConnectorConfig(type, config) // → parsed config, or throws ZodError
```

Design points visible in the schemas:

- **Bounded strings.** Every string field carries a `.max()` (URLs `.max(500)`,
  credentials `.max(255)`, PEM blobs `.max(10000)`) per CLAUDE.md rule 27.
- **`.passthrough()` + key cap.** Type schemas pass through unknown keys for
  forward compatibility, but the outer `CreateConnectorSchema.config` /
  `UpdateConnectorSchema.config` is a `z.record(...)` capped at **50 properties**
  with **≤100-char keys** to bound payloads.
- **Backward-compat transforms.** `.transform()` normalizes deprecated key names
  on the way in — `verifyTLS → verifyTls`, `mispAuthKey → authKey`,
  `shuffleApiKey → apiKey` — so old encrypted configs keep working. The runtime
  twin of this lives in `normalizeConnectorConfig()` in
  [`connectors.utilities.ts`](../../apps/api/src/modules/connectors/connectors.utilities.ts),
  applied on the **decrypt** path.

The service calls `validateConnectorConfig()` inside `validateAndSanitizeConfig()`
and wraps any `ZodError` into a `BusinessException(400, …,
'errors.connectors.invalidConfig')` — never a raw throw (CLAUDE.md rules 17–18).

---

## 4. AES-256-GCM encryption at rest

Encryption is a shared utility, not connector-specific:
[`common/utils/encryption.utility.ts`](../../apps/api/src/common/utils/encryption.utility.ts)
with constants in
[`encryption.constants.ts`](../../apps/api/src/common/utils/encryption.constants.ts).

- **Algorithm:** `aes-256-gcm`, 16-byte random IV per encryption, 16-byte auth
  tag — authenticated encryption (tamper-evident).
- **Wire format:** `iv:authTag:ciphertext`, each segment base64, joined by `:`.
  `decrypt()` rejects anything that isn't exactly three parts or has a wrong
  auth-tag length.
- **Key:** `CONFIG_ENCRYPTION_KEY`, exactly **64 hex chars (32 bytes)**. The
  service validates this at construction in `validateEncryptionKey()` and throws
  at startup if missing/malformed — **no fallback, no hardcoded default**
  (CLAUDE.md rules 24, 53; the `.env.example` ships empty and `env.validation.ts`
  rejects all-zero keys).

Flow in
[`connectors.service.ts`](../../apps/api/src/modules/connectors/connectors.service.ts):

- **create/update** → validate (§3) → SSRF-check URLs (§5) →
  `encrypt(JSON.stringify(config), key)` → persist `encryptedConfig`.
- **read** → `decryptConfig()` → `normalizeConnectorConfig()` → `maskSecrets()`
  before returning to the client.
- **update merge** → `buildMergedEncryptedConfig()` decrypts the existing config
  and merges via `mergeConfigWithRedacted()` so the client can resend the
  `***REDACTED***` placeholder for unchanged secrets without wiping them.

### Secret masking + audit redaction

Decrypted configs are **never** returned raw. `maskSecrets()`
([`mask.utility.ts`](../../apps/api/src/common/utils/mask.utility.ts)) replaces
any value whose key is in `SENSITIVE_KEYS`
([`mask.constants.ts`](../../apps/api/src/common/utils/mask.constants.ts) —
`password`, `secret`, `token`, `apiKey`, `authKey`, `secretAccessKey`,
`encryptedConfig`, `clientKey`, the deprecated `mispAuthKey`/`shuffleApiKey`, …)
with `***REDACTED***`. The audit interceptor's sensitive-key list independently
covers `encryptedConfig` and credential patterns so connector secrets never reach
audit logs (CLAUDE.md rules 66, 95–96). Test-failure details are also path-
sanitized and truncated to 500 chars (`sanitizeErrorDetails()`, CLAUDE.md rules
44, 63).

---

## 5. SSRF validation (at input time, DNS-aware)

CLAUDE.md **rule 59**: connector URLs MUST be SSRF-validated at **input** time
(before encryption), not only at fetch time — otherwise a malicious URL (e.g.
`http://169.254.169.254/`) persists in the DB even though it's rejected on use.

The service's `validateConfigUrls()` extracts every URL-bearing field via
`extractUrlFields()` (keys in `URL_KEYS` —
[`connectors.constants.ts`](../../apps/api/src/modules/connectors/connectors.constants.ts):
`baseUrl`, `managerUrl`, `indexerUrl`, `webhookUrl`, `apiUrl`, `grafanaUrl`,
`mispUrl`) and runs each through `resolveAndValidateUrl()` from
[`common/utils/ssrf.utility.ts`](../../apps/api/src/common/utils/ssrf.utility.ts):

- **`validateUrl()`** — parses the URL, allows only `http(s)` / `ws(s)`, and (in
  production) blocks hostnames matching `PRIVATE_HOST_PATTERNS`
  ([`ssrf.constants.ts`](../../apps/api/src/common/utils/ssrf.constants.ts):
  loopback, RFC 1918, link-local `169.254.*`, `localhost`, IPv6 ULA/link-local,
  and IPv4-mapped variants).
- **`resolveAndValidateUrl()`** — in production, additionally `dns.lookup()`s the
  hostname and re-checks the **resolved IP** against the same blocklist,
  defeating DNS-rebinding; DNS failures are blocked. In non-production it skips
  the resolution check so localhost dev targets work — but **never** skips the
  structural/protocol checks (CLAUDE.md rule 56: never bypass security on
  `NODE_ENV`).

Adapter services also pass `allowPrivateNetwork`/`rejectUnauthorized` flags to
the shared HTTP client; when TLS verification is disabled the call must emit a
`console.warn` with the connector type (CLAUDE.md rule 50; the
`connector-http`/SSRF utilities are unit-tested per
[`rules/testing/test-strategy.md`](../../rules/testing/test-strategy.md)).

---

## 6. Adapter services (the `ConnectorTestable` contract)

Each connector type has an adapter service under
[`services/`](../../apps/api/src/modules/connectors/services/) implementing the
`ConnectorTestable` interface from
[`connectors.types.ts`](../../apps/api/src/modules/connectors/connectors.types.ts):

```ts
interface ConnectorTestable {
  testConnection(config: Record<string, unknown>): Promise<{ ok: boolean; details: string }>
}
```

`ConnectorsService` holds a `testServiceMap` (built in `buildTestServiceMap()`)
that routes `type → adapter`. `POST /:type/test` decrypts the stored config and
calls the adapter through `runConnectionTest()`, which times the call, sanitizes
errors, and writes `lastTestAt` / `lastTestOk` / `lastError` back to the row.

Adapters follow the strict backend layering
([`docs/architecture/BACKEND.md`](BACKEND.md)): they are thin, share types from
`connectors.types.ts`, push business logic into pure functions in
[`connectors.utilities.ts`](../../apps/api/src/modules/connectors/connectors.utilities.ts)
(e.g. `extractWazuhVersion`, `formatRemoteError`, `buildVelociraptorAuthOptions`,
`buildLlmApiHeaders`, the Bedrock model-family request/response builders), and
call the shared Axios module rather than `fetch` directly. Response→domain
mappers live in [`mappers/`](../../apps/api/src/modules/connectors/mappers/).

The three AI adapters (`bedrock`, `llm_apis`, `openclaw_gateway`) double as the
backends for the **AI provider cascade** — the AI service tries _all_ configured
AI connectors in priority order and only falls back to rule-based output when
none succeed (CLAUDE.md rules 88–89; details in [`docs/AI.md`](../AI.md)). The
`openclaw_gateway` adapter is WebSocket-based via
[`openclaw-ws.utility.ts`](../../apps/api/src/modules/connectors/openclaw-ws.utility.ts).

---

## 7. RBAC — mutations are TENANT_ADMIN-gated

CLAUDE.md **rule 55**: a `SOC_ANALYST_L2` must not be able to redirect connector
URLs, rotate API keys, or disable integrations. Connectors control security
infrastructure, so **mutations are restricted to tenant administrators**.

The live controller
([`connectors.controller.ts`](../../apps/api/src/modules/connectors/connectors.controller.ts))
enforces this through the **permission-based** model — `@RequirePermission(...)`
with the `Permission.CONNECTORS_*` enum
([`common/enums/permission.enum.ts`](../../apps/api/src/common/enums/permission.enum.ts)),
checked by the `AuthGuard → TenantGuard → RolesGuard` chain (GLOBAL_ADMIN always
passes):

| Route                      | Permission          | Notes                                          |
| -------------------------- | ------------------- | ---------------------------------------------- |
| `GET /connectors`          | `CONNECTORS_VIEW`   | List (configs masked)                          |
| `GET /connectors/stats`    | `CONNECTORS_VIEW`   | Counts                                         |
| `GET /connectors/:type`    | `CONNECTORS_VIEW`   | Single (masked)                                |
| `POST /connectors`         | `CONNECTORS_CREATE` | Mutation                                       |
| `PATCH /connectors/:type`  | `CONNECTORS_UPDATE` | Mutation (redacted-merge update)               |
| `DELETE /connectors/:type` | `CONNECTORS_DELETE` | Mutation                                       |
| `POST /:type/test`         | `CONNECTORS_TEST`   | Throttled **5/min** — anti port-scan (rule 61) |
| `POST /:type/toggle`       | `CONNECTORS_UPDATE` | Enable/disable                                 |

The role→permission default matrix
([`role-settings/constants/default-permissions.ts`](../../apps/api/src/modules/role-settings/constants/default-permissions.ts))
is what realizes the TENANT_ADMIN gate: `CONNECTORS_VIEW` is granted to the read
roles, but `CONNECTORS_CREATE` / `_UPDATE` / `_DELETE` / `_TEST` are granted only
to `TENANT_ADMIN` (and the more-privileged `PLATFORM_OPERATOR`; GLOBAL_ADMIN is
implicit). So the **net effect** matches rule 55's "`TENANT_ADMIN` on
mutations," even though the mechanism is the newer `@RequirePermission`
decorator rather than the legacy `@Roles(UserRole.TENANT_ADMIN)`.

> **Doc-vs-code note for contributors.** CLAUDE.md rule 55 and
> [`skills/backend/add-connector.md`](../../skills/backend/add-connector.md) still
> phrase the gate as `@Roles(UserRole.TENANT_ADMIN)` (the retained legacy
> convention). The shipped controller uses `@RequirePermission`. When adding or
> editing a connector route, mirror the existing controller (permission-based)
> and add the new `Permission` end-to-end per CLAUDE.md rule 85.

Body validation uses `ZodValidationPipe` on `@Body()` only (never `@UsePipes` at
method level alongside `@Param()` — CLAUDE.md rule 16). All mutations are
audit-logged by the global `AuditInterceptor` with credentials redacted (§4).

---

## 8. LLM connectors sub-module

Distinct from the 11 `ConnectorConfig` types above, the
[`llm-connectors/`](../../apps/api/src/modules/connectors/llm-connectors/)
sub-module provides full CRUD over **multiple custom OpenAI-compatible LLM
endpoints** per tenant, persisted as the separate `LlmConnector` Prisma model
(`encryptedApiKey`, `baseUrl`, `defaultModel`, `maxTokensParam`, …). It applies
the same patterns — Zod DTOs, AES-256-GCM via the shared `encrypt()`, the
`buildLlmConnectorUpdateData()` helper that encrypts the API key on update — but
is gated by its own `Permission.LLM_CONNECTORS_*` permissions (same
TENANT_ADMIN/PLATFORM_OPERATOR default grant). The
[`ai-available-connectors.controller.ts`](../../apps/api/src/modules/connectors/llm-connectors/ai-available-connectors.controller.ts)
surfaces the union the AI cascade and the frontend `AiConnectorSelect` consume.

---

## 9. Adding a new connector type

Don't free-style it — follow the recipe, which copies the `shuffle` flow
end-to-end across the five coordinated touch points (type enum, per-type Zod
schema + `validateConnectorConfig` entry, adapter service implementing
`ConnectorTestable`, module providers/exports, and the service's runtime maps):

➡️ [`skills/backend/add-connector.md`](../../skills/backend/add-connector.md)

Sibling onboarding system (per [`AGENTS.md`](../../AGENTS.md) §1):
[`rules/`](../../rules/) (hard constraints) ·
[`skills/`](../../skills/) (recipes) ·
[`memory/`](../../memory/) (stable truths) ·
[`context/`](../../context/) (area background). Deep security reference:
[`docs/SECURITY.md`](../SECURITY.md) + [`docs/security/`](../security/).
