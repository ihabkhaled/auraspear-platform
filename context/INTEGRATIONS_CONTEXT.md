# INTEGRATIONS_CONTEXT.md — connectors & upstream-tool integrations (`apps/api`)

> **Read [`../AGENTS.md`](../AGENTS.md) FIRST.** It is the single AI entry point
> and defines the loading order: `AGENTS.md` → `memory/*.md` → this `context/*.md`
> → `rules/**` → `skills/**` → `docs/**` → code + tests. This file is step 3 for
> any task that adds or changes a connector, an upstream-tool adapter, or an AI
> provider path. Do **not** edit before you have read the rules and skills linked
> below — the one rule is _no AI agent may edit first and understand later._ A
> connector stores **security infrastructure credentials**; getting SSRF,
> encryption, validation, or RBAC wrong here is a direct breach.

This is the **integrations orientation** file: the connector subsystem — the
single place AuraSpear talks to Wazuh, OpenSearch/Graylog, MISP, Shuffle,
Velociraptor, Grafana, InfluxDB, and the AI providers. The authoritative hard
constraints live in [`../rules/backend/integration-rules.md`](../rules/backend/integration-rules.md)
and the rule numbers it distills from [`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md)
(#39, #44, #50, #55, #59, #63, #66, #88, #89). For the AI engine itself (routing,
safety, eval) see [`./AI_CONTEXT.md`](./AI_CONTEXT.md); for the BFF layering see
[`./BACKEND_CONTEXT.md`](./BACKEND_CONTEXT.md).

---

## What this area is

A **connector** is a tenant-owned, encrypted configuration that lets the BFF
reach one external system. The defining architectural fact is the **BFF
boundary**: the Next.js web app **never** calls Wazuh/OpenSearch/MISP directly —
it proxies through `apps/web/src/app/api/*` (`proxyToBackend()`), and the backend
owns every upstream credential and tenant scope (`apps/api` CLAUDE.md
"Architecture"; [[PROJECT_MEMORY]]). Connector configs are **AES-256-GCM
encrypted at rest** and never returned in plaintext.

The `ConnectorType` enum (`schema.prisma:27-39`) is the source of truth —
**verify it before assuming the list**. Today it is:

| Tooling category | Types                                     |
| ---------------- | ----------------------------------------- |
| SIEM / log       | `wazuh`, `graylog`, `logstash`            |
| EDR / DFIR       | `velociraptor`                            |
| Observability    | `grafana`, `influxdb`                     |
| Threat intel     | `misp`                                    |
| SOAR             | `shuffle`                                 |
| AI providers     | `bedrock`, `llm_apis`, `openclaw_gateway` |

---

## Where files live

Everything is under `apps/api/src/modules/connectors/` (the strict module shape
from [`./BACKEND_CONTEXT.md`](./BACKEND_CONTEXT.md) applies):

```
modules/connectors/
├── connectors.controller.ts     # routes — @RequirePermission(CONNECTORS_*), @Throttle
├── connectors.service.ts        # orchestration: validate → SSRF-check → encrypt → persist
├── connectors.repository.ts     # Prisma boundary, tenantId on every method
├── connectors.utilities.ts      # mappers / builders (pure)
├── connectors.enums.ts          # AuthType etc. (ConnectorType lives in schema.prisma)
├── dto/
│   ├── connector.dto.ts         # per-type Zod schemas + validateConnectorConfig()
│   └── toggle-connector.dto.ts
├── services/                    # one ADAPTER per upstream system
│   ├── wazuh.service.ts · opensearch.service.ts · graylog.service.ts
│   ├── logstash.service.ts · velociraptor.service.ts · grafana.service.ts
│   ├── influxdb.service.ts · misp.service.ts · shuffle.service.ts
│   ├── bedrock.service.ts · llm-apis.service.ts · openclaw-gateway.service.ts
├── mappers/                     # upstream payload → typed contract mappers
├── llm-connectors/              # AI-connector listing (incl. /ai-available controller)
└── openclaw-ws.utility.ts       # OpenClaw websocket helper
```

Related cross-cutting code: `src/common/utils/encryption.utility.ts`
(AES-256-GCM, `CONFIG_ENCRYPTION_KEY`), `src/common/utils/ssrf.utility.ts`
(`resolveAndValidateUrl`), and the connector-sync background job
(`modules/jobs/handlers/connector-sync.handler.ts`, `JobType.CONNECTOR_SYNC`).

---

## How a connector flows (the load-bearing path)

1. **Adapter per type** — every external system is an adapter under
   `connectors/services/` exposing a typed contract (shared via
   `connectors.types.ts`). New systems are added as a new adapter + a new
   `ConnectorType` value, not by branching an existing adapter.
2. **Per-type Zod config validation** — each type has its own config schema in
   `dto/connector.dto.ts`; the service calls `validateConnectorConfig(type, config)`
   **before** encrypting (`apps/api` rule 39). No arbitrary JSON reaches storage.
3. **SSRF validation at input time** — every URL field is run through
   `resolveAndValidateUrl` (`connectors.service.ts` `validateConfigUrls`) on
   create/update, **before** encryption — so a malicious URL (e.g.
   `http://169.254.169.254/`) is never persisted, not merely rejected on use
   (`apps/api` rule 59).
4. **Encrypt at rest** — `encrypt(JSON.stringify(validatedConfig), key)`
   (AES-256-GCM) before the repository writes; configs are never logged or
   returned raw (audit redaction includes `encryptedConfig`, rule 66).
5. **AI provider cascade** — for AI types, `AiService` tries **all** configured
   connectors in order (`bedrock → llm_apis → openclaw_gateway`) via
   `findAvailableAiConnectors()` + `tryConnectorsInOrder()`
   (`ai.service.ts:842/906`); it falls back to a clearly-labeled `rule-based`
   response **only** when all fail or none are configured (`apps/api` rule 88/89).
   No `BEDROCK_MOCK` / env-gated mock mode.

---

## What rules apply (read before editing)

Always load `rules/global/*`, then:

- [`../rules/backend/integration-rules.md`](../rules/backend/integration-rules.md) —
  the authoritative connector constraints (adapter-per-type, per-type Zod config,
  SSRF-at-input, encryption, `TENANT_ADMIN` mutation gate, TLS-skip logging).
- [`../rules/security/security-rules.md`](../rules/security/security-rules.md)
  (§8 SSRF, the connector RBAC rule) and
  [`secret-handling.md`](../rules/security/secret-handling.md) (no fallback
  secrets; `CONFIG_ENCRYPTION_KEY` 64 hex).
- [`../rules/backend/dto-validation-rules.md`](../rules/backend/dto-validation-rules.md) —
  every string/array `.max()`, JSON/config fields capped via `.refine()` (rule 78).
- [`../rules/backend/tenant-permission-rules.md`](../rules/backend/tenant-permission-rules.md) +
  [`layering-rules.md`](../rules/backend/layering-rules.md).

**Invariants that govern every integration change (from [`../AGENTS.md`](../AGENTS.md) §6–§7):**

- **Connector mutations are privileged** — `apps/api` rule 55 mandates
  `TENANT_ADMIN` for create/update/toggle/delete: a `SOC_ANALYST_L2` must not be
  able to redirect a connector URL or swap an API key. The live controller gates
  these with `@RequirePermission(Permission.CONNECTORS_CREATE/UPDATE/DELETE)`
  (the connector permissions are granted to `TENANT_ADMIN`+). A connector mutation
  endpoint without that gate is a review blocker.
- **SSRF + encryption + per-type Zod are non-negotiable** at input time (rules
  39/59 above). **TLS-verification skips** (`rejectUnauthorized: false`) must
  `console.warn` with the connector type (rule 50). Errors must be sanitized — no
  internal paths/URLs leaked (rules 44/63/81).
- **Tenant isolation** — connectors are tenant-owned; every read/write is scoped
  by `tenantId`, mutations use compound `{ id, tenantId }` (rule 26). No
  cross-tenant connector access.
- **AI safety** — the cascade must try all providers before fallback (rule 88);
  never short-circuit to `rule-based` after one failure; never a mock mode (89).
- **No `any`, no `eslint-disable`, no secrets in env.example, pnpm only, Node 22.**

---

## What skills apply (recipes for the work)

- Add a connector type end-to-end (enum → per-type Zod → adapter → encrypt →
  SSRF → seed/permissions) →
  [`../skills/backend/add-connector.md`](../skills/backend/add-connector.md)
  (copy the existing `shuffle` flow; it wires the type in **five** places).
- A connector endpoint the UI calls also needs a frontend proxy
  ([`../skills/frontend/add-api-client.md`](../skills/frontend/add-api-client.md))
  and i18n keys ([`../skills/frontend/add-i18n-key.md`](../skills/frontend/add-i18n-key.md)).
- Background sync work → [`../skills/backend/add-background-job.md`](../skills/backend/add-background-job.md).

---

## What docs to read

- [`../docs/architecture/CONNECTORS.md`](../docs/architecture/CONNECTORS.md) — the
  connector subsystem deep dive (adapter contracts, config shapes, sync).
- [`../apps/api/CLAUDE.md`](../apps/api/CLAUDE.md) — **authoritative**; read rules
  39, 44, 50, 55, 59, 63, 66, 88, 89 before any non-trivial connector change.
- [`../docs/SECURITY.md`](../docs/SECURITY.md) (+ `docs/security/`) — SSRF,
  encryption at rest, audit redaction.
- [`./AI_CONTEXT.md`](./AI_CONTEXT.md) — the AI engine that consumes the
  `bedrock`/`llm_apis`/`openclaw_gateway` connectors;
  [`./BACKEND_CONTEXT.md`](./BACKEND_CONTEXT.md) — the BFF layering this module
  obeys.
- [`../memory/SECURITY_MEMORY.md`](../memory/SECURITY_MEMORY.md) and
  [`../memory/KNOWN_PITFALLS_MEMORY.md`](../memory/KNOWN_PITFALLS_MEMORY.md) —
  stable security/integration truths.

---

## Common mistakes

- **Calling an upstream tool from the web app** — the frontend never reaches
  Wazuh/OpenSearch/MISP directly; it proxies through `app/api/*`. The backend is
  the only integration point.
- **Skipping `validateConnectorConfig` / SSRF at input** — validating only at
  fetch time still persists a malicious URL. Validate + SSRF-check **before**
  encrypting (rules 39/59).
- **Storing or returning config in plaintext** — always `encrypt()` before write;
  never log `encryptedConfig` or echo decrypted config in a response (rule 66).
- **A connector mutation endpoint without the privileged permission gate** —
  create/update/toggle/delete must be `CONNECTORS_*`-gated (TENANT_ADMIN intent,
  rule 55), never analyst-reachable.
- **Hardcoding one AI provider / mock mode** — route through the
  `bedrock → llm_apis → openclaw_gateway` cascade; `rule-based` only as a labeled
  last resort; never `BEDROCK_MOCK` (rules 88/89).
- **Branching an existing adapter for a new system** — add a new adapter under
  `services/` + a new `ConnectorType` value + its own Zod schema instead.

---

## Validation commands

Run from **repo root** (pnpm only, Node 22). Full list:
[`../memory/COMMANDS_MEMORY.md`](../memory/COMMANDS_MEMORY.md).

```bash
pnpm typecheck          # blocking gate (tsc --noEmit)
pnpm build              # blocking gate (includes nest build)
pnpm lint               # advisory — enforces integration/layering rules
pnpm test               # advisory
pnpm prisma:migrate     # after a ConnectorType enum change (ships a migration)
```

> **Never claim a gate is green without running it.** A new `ConnectorType` value
> needs a Prisma migration (`tsc` does not create it). Report exactly what passed,
> what failed, and any blocker — per [`../AGENTS.md`](../AGENTS.md) §5 and §13.
