# Integration rules — every external system is reached through an adapter

> **Read `AGENTS.md` first** (repo root) for the AI loading order and the one
> rule: _no AI agent may edit first and understand later._ Then `apps/api/CLAUDE.md`
> (rules 39, 50, 55, 59, 78, 95, 96). GOD MODE §6.10 (integration adapters) is the
> source. Where this file and `apps/api/CLAUDE.md` overlap, the CLAUDE.md rule
> number is authoritative. A violation here is an **SSRF, a credential leak, or a
> vendor lock-in landmine**, not a style nit.

AuraSpear is a **Backend-for-Frontend**: the Next.js app never calls Wazuh/
OpenSearch/MISP directly — `apps/api` owns every outbound call. Each external
system (SIEM/SOAR/threat-intel/email/AI/storage/Redis/Prisma/HTTP/webhooks) is
reached through a dedicated **adapter**, and provider details never leak into
domain logic. Related: `../global/library-wrapper-rules.md` (the wrap-everything
principle), `../security/security-rules.md` §8 (SSRF) & §11 (encryption),
`../ai/ai-safety-rules.md` (AI provider cascade), `layering-rules.md`.

---

## 1. Every integration is an adapter under `connectors/services/`

- **One adapter service per provider**, in
  `apps/api/src/modules/connectors/services/`: `wazuh.service.ts`,
  `opensearch.service.ts`, `misp.service.ts`, `shuffle.service.ts`,
  `graylog.service.ts`, `logstash.service.ts`, `velociraptor.service.ts`,
  `grafana.service.ts`, `influxdb.service.ts`, `bedrock.service.ts`,
  `llm-apis.service.ts`, `openclaw-gateway.service.ts`. Add a new integration by
  adding a new adapter — never by branching inside a domain service
  (`solid-rules.md` §OCP; `../../skills/backend/add-connector.md`).
- **Provider SDKs/HTTP clients live only inside the adapter.** Domain services
  depend on the adapter's typed contract (shared via `connectors.types.ts` —
  `TestResult`, `ConnectorTestResult`), not on `axios`/the vendor SDK directly
  (`../global/library-wrapper-rules.md`; `solid-rules.md` §DIP/§LSP).

## 2. Provider details never leak into domain logic

- A case/alert/hunt service talks to "the SIEM adapter," not to Wazuh-specific
  request shapes. Mapping vendor responses to domain types is the adapter's job
  (in its mapper/utilities), so swapping a provider doesn't ripple into business
  code (`layering-rules.md` §4).
- **No raw provider error to the client.** Adapter errors surface as
  `BusinessException` with a `messageKey`; the `GlobalExceptionFilter` sanitizes
  paths/metadata (`apps/api/CLAUDE.md` rules 17, 44, 63;
  `../security/security-rules.md` §10).

## 3. SSRF-validate every user-supplied URL at INPUT time

- **Connector URLs, custom OSINT sources, and AI gateway URLs are validated
  before encryption and storage**, not only at fetch time — storing
  `http://169.254.169.254/` is itself the bug (`apps/api/CLAUDE.md` rules 59, 95).
- **Use the shared SSRF utility, never hand-rolled checks.**
  `connectors.service.ts` `validateConfigUrls` (`:342-346`) runs every URL field
  through `resolveAndValidateUrl()` from
  `apps/api/src/common/utils/ssrf.utility.ts` — DNS-aware (resolves the host and
  re-checks the IP, blocking DNS-rebinding) (`../security/security-rules.md` §8).
- Frontend OSINT forms pre-validate with `isAllowedSourceUrl()`
  (`apps/web/CLAUDE.md` rule 54) — UX only; the backend `resolveAndValidateUrl()`
  is the authoritative gate.

## 4. Credentials are encrypted at rest and never leak

- **Connector configs and OSINT API keys are AES-256-GCM encrypted** via
  `apps/api/src/common/utils/encryption.utility.ts` (`apps/api/CLAUDE.md` "Key
  Principles" #4, rules 96; `../security/security-rules.md` §11). Decrypted config
  never appears in responses, logs, or audit details.
- **New credential fields are added to the redaction key set**
  (`redaction.constants.ts` `SENSITIVE_KEYS`, `apps/api/CLAUDE.md` rule 66) or
  they leak into audit logs.
- **Connector create/update/toggle requires `TENANT_ADMIN`** — connector config
  controls security infrastructure; a lower role must not redirect URLs or change
  keys (`apps/api/CLAUDE.md` rule 55; this is one of the few legacy `@Roles()`
  uses — `../security/rbac-rules.md` §1).

## 5. Per-type config validation with Zod

- **Each connector type has its own Zod config schema**; call
  `validateConnectorConfig(type, config)`
  (`apps/api/src/modules/connectors/dto/connector.dto.ts:235`) before encrypting
  (`apps/api/CLAUDE.md` rule 39). No arbitrary JSON.
- **Nested JSON/config fields are size-capped** with `.refine()` (max ~64KB) — the
  global 1MB body limit isn't enough (`apps/api/CLAUDE.md` rule 78;
  `dto-validation-rules.md`).

## 6. TLS, rate-limiting, and webhooks

- **Log a `console.warn` (with the connector type) whenever TLS verification is
  skipped.** Adapters drive TLS off `config.verifyTls` (e.g.
  `grafana.service.ts:43`, `graylog.service.ts:64`); when `rejectUnauthorized` is
  `false`, warn so it's auditable (`apps/api/CLAUDE.md` rule 50). This is the only
  sanctioned raw `console.warn`.
- **`HTTPS enforcement and all SSRF/security checks run in every environment** —
  no `NODE_ENV` bypass (`apps/api/CLAUDE.md` rule 56).
- **Connector test endpoints are throttled** (`POST /:type/test`: 5/60s) to
  prevent internal port scanning (`apps/api/CLAUDE.md` rule 61); mutations carry
  `@Throttle` (rule 74).
- **Inbound webhooks validate origin/signature** and treat the payload as
  untrusted input — Zod-validate and SSRF-check any URL it carries before acting.

## 7. AI, Redis, Prisma, and storage are integrations too

- **AI providers go through the cascade adapters** (`bedrock → llm_apis →
openclaw_gateway → rule-based`); never hardcode one or use a mock mode
  (`apps/api/CLAUDE.md` rules 88, 89; `../ai/ai-safety-rules.md`). The
  provider-agnostic policy stays in `packages/ai` (SDK-free).
- **Redis via `RedisModule`** (one shared connection, rule 47); **Prisma only in
  repositories** with a bounded pool (`connection_limit=20`, rule 46;
  `layering-rules.md` §3). Outbound HTTP/email/storage clients are wrapped the
  same way (`../global/library-wrapper-rules.md`).

---

## Self-check before you commit an integration change

- [ ] New external system added as an adapter under `connectors/services/`;
      provider SDK/HTTP client stays inside it; domain code uses the typed
      contract.
- [ ] No provider-specific shapes/errors leaking into domain services; errors are
      `BusinessException` + `messageKey`.
- [ ] Every user-supplied URL validated with `resolveAndValidateUrl()` at input
      time (before encryption); frontend pre-check is UX only.
- [ ] Credentials AES-256-GCM encrypted; new credential keys added to
      `SENSITIVE_KEYS`; never logged/returned; create/update/toggle is
      `TENANT_ADMIN`.
- [ ] Per-type Zod config validated via `validateConnectorConfig`; nested JSON
      `.refine()`-capped.
- [ ] TLS-skip logged with connector type; security checks run in all envs; test
      endpoint + mutations throttled; webhooks validate origin/signature.
- [ ] AI via cascade (no hardcode/mock); Redis via `RedisModule`; Prisma only in
      repositories.
- [ ] No `any`/`eslint-disable`/secret; `pnpm typecheck` green (blocking,
      `../global/validation-gates.md`); branched first
      (`../global/branch-safety.md`).

## Related

- `../../apps/api/CLAUDE.md` rules 39, 50, 55, 56, 59, 61, 66, 78, 88, 89, 95, 96.
- `apps/api/src/modules/connectors/services/` (adapters),
  `connectors.service.ts` (`validateConfigUrls`),
  `dto/connector.dto.ts` (`validateConnectorConfig`),
  `common/utils/{ssrf,encryption}.utility.ts`.
- `../global/library-wrapper-rules.md`, `../security/security-rules.md` §8/§11,
  `../ai/ai-safety-rules.md`, `layering-rules.md`, `dto-validation-rules.md`.
- `../../skills/backend/add-connector.md`; `docs/architecture/CONNECTORS.md`.
