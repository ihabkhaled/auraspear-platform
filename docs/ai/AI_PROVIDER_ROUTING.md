# AI Provider Routing — AuraSpear

> **Entry point first.** This repo's single onboarding entry point is
> [`AGENTS.md`](../../AGENTS.md) (read §1 loading order and §7 AI-safety
> invariants). Then read [`docs/AI.md`](../AI.md) (architecture + governance
> overview) and [`docs/ai/AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) (the full
> code-level map of the AI subsystem). **This file zooms into one slice of that
> map: how a single AI request picks a provider, cascades through every
> configured connector, falls back, and stamps attribution.** Everything else
> (agents, orchestrator, memory, eval, FinOps) lives in
> [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) and is linked, not repeated here.

This is a map, not the source of truth. **Behavior is defined by the code.**
Every claim cites a real path. When the code and this doc disagree, the code
wins — fix the doc.

## Sibling docs, rules, and skills

- **Subsystem map (don't duplicate):** [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md)
  §2 "The provider cascade" and §3 "`executeAiTask`".
- **Overview / governance:** [`docs/AI.md`](../AI.md),
  [`AI_GOVERNANCE.md`](AI_GOVERNANCE.md), [`AI_AGENT_CATALOG.md`](AI_AGENT_CATALOG.md).
- **Backend rules that bind this code:** [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
  rules **88** (try ALL connectors before fallback), **89** (no mock mode),
  **92–100** (agent config), **33** (AI endpoints rate-limited); and the
  §"AI Connector Strategy" summary.
- **Frontend contract:** [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rules
  **30** (fallbacks labeled `rule-based`, only when no connector configured),
  **42** (provider attribution on every AI surface), **45** (connector list comes
  from `/api/connectors/ai-available`).
- **Hard rules:** [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md),
  [`rules/ai/ai-output-rules.md`](../../rules/ai/ai-output-rules.md).
- **Shared, provider-agnostic building blocks:**
  [`packages/ai/src/model-router.ts`](../../packages/ai/src/model-router.ts) and
  [`packages/ai/src/types.ts`](../../packages/ai/src/types.ts).
- **Stable truths:** [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md). Docs map:
  [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md).

---

## 1. The cascade in one picture

```
request ──► executeAiTask / runAgentTask
                │
                │  findAvailableAiConnectors(tenantId)  ── ALL configured, in priority order
                ▼
        [ bedrock ] [ llm_apis ] [ openclaw_gateway ] [ custom llm_apis #1 ] [ #2 ] …
                │
                ▼  tryConnectorsInOrder(...)  — sequential, first success wins
        attempt #0 ─fail─► attempt #1 ─fail─► … ─fail─►  ALL failed
                │ ok                                          │
                ▼                                             ▼
         AiResponse (provider/model stamped)        rule-based fallback
                                                     (provider='rule-based')
```

Two layers implement this:

| Layer                          | Where                                                                                  | Role                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Provider-agnostic contract** | [`packages/ai/src/model-router.ts`](../../packages/ai/src/model-router.ts)             | Pure decision logic: `AiProviderKind`, `DEFAULT_PROVIDER_ORDER`, `routeProviders`, `selectProvider`. **No SDKs.** |
| **Live engine**                | [`apps/api/src/modules/ai/ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts) | Resolves real connectors, runs the cascade against real SDK adapters, records usage + audit.                      |

The two **agree on the order** but are wired independently — see §6.

---

## 2. The fixed priority order

The cascade order is a single constant, `AI_CONNECTOR_PRIORITY` in
[`ai.constants.ts`](../../apps/api/src/modules/ai/ai.constants.ts):

```
bedrock → llm_apis → openclaw_gateway      (then dynamic custom LLM connectors)
                                            → rule-based (only if every provider fails)
```

The same order is mirrored in three places that must stay in lock-step:

- `AI_CONNECTOR_PRIORITY` — [`ai.constants.ts`](../../apps/api/src/modules/ai/ai.constants.ts)
  (the api's resolution order).
- `FIXED_AI_CONNECTORS` — [`llm-connectors.constants.ts`](../../apps/api/src/modules/connectors/llm-connectors/llm-connectors.constants.ts)
  (the human labels: `AWS Bedrock`, `LLM APIs (Legacy)`, `OpenClaw Gateway`).
- `DEFAULT_PROVIDER_ORDER` — [`model-router.ts`](../../packages/ai/src/model-router.ts)
  (the provider-agnostic reference order).

`rule-based` is **not** a connector — it is the synthetic last resort, modeled as
`AiProviderKind.RULE_BASED` / `AiResponseModel.RULE_BASED`
([`ai.enums.ts`](../../apps/api/src/modules/ai/ai.enums.ts)) and never appears in
the connector list.

> **Note — chat uses a different order.** `AiChatService` runs its own chain
> (`llm_apis → openclaw_gateway → bedrock`, then custom connectors), _not_
> `AI_CONNECTOR_PRIORITY`. That is intentional and documented in
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) §"AI Chat Page" and
> [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) §6. This doc covers the
> `AiService` cascade.

---

## 3. Resolving the connector list — `findAvailableAiConnectors`

`AiService.findAvailableAiConnectors(tenantId)`
([`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts)) returns **all**
usable connectors as `ResolvedAiConnector[]`
([`ai.types.ts`](../../apps/api/src/modules/ai/ai.types.ts):
`{ type, id?, name?, config }`) — never just the first. Two steps:

1. **`resolveFixedConnectors`** — for each type in `AI_CONNECTOR_PRIORITY`, calls
   `ConnectorsService.getDecryptedConfig(tenantId, type)`. Connector credentials
   are **AES-256-GCM at rest** (see [`docs/SECURITY.md`](../SECURITY.md)); only
   configured types survive the `filter`.
2. **`appendDynamicConnectors`** — appends every enabled custom LLM connector
   (`LlmConnectorsService.getEnabledConfigs`) as extra `llm_apis` entries, each
   carrying its own `id` and `name` (so attribution can name the specific
   connector — see §5).

`logConnectorResolution` then records `checked` / `available` / `missing` /
`dynamicCount` under `AppLogFeature.AI`, giving an audit trail of _why_ a given
provider was or was not in the running.

This is the literal realization of **rule 88** in
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md): _"AI provider cascade MUST try
ALL configured connectors before falling back."_

---

## 4. Trying providers in order — `tryConnectorsInOrder`

`tryConnectorsInOrder(connectors, attempt, index = 0)`
([`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts)) walks the list
**recursively** — deliberately, to satisfy the `no-await-in-loop` lint rule
(see [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 71). For each
connector it:

1. `logConnectorAttempt` — `"AI: trying provider <type>…"`.
2. runs the per-task `attempt(connector)` closure (§4.1);
3. on a truthy `AiResponse` → `logConnectorSuccess`, **return it** (cascade
   stops at the first success);
4. on `undefined` → `logConnectorFailure`, **recurse to `index + 1`**;
5. when the list is exhausted → `logAllConnectorsFailed`
   (`"all connectors failed, using rule-based fallback"`) and return `undefined`.

The caller substitutes the rule-based response only on that final `undefined`
(§5.3) — **never** after a single provider failure. That is the other half of
rule 88: _"Never short-circuit to fallback after a single provider failure."_

### 4.1 The `attempt` closure is per task family

`attempt` is a `routeXxx` method — a `switch` on `ConnectorType` that dispatches
to the matching adapter under
[`connectors/services`](../../apps/api/src/modules/connectors/services):

| Task family          | Router                                        | Adapter calls                                                                       | Max-tokens constant                                                           |
| -------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Generic feature call | `routeGenericTask` → `invokeGenericConnector` | `bedrockService.invoke` / `llmApisService.invoke` / `openClawGatewayService.invoke` | per-agent `maxTokensPerCall` → feature `maxTokens`                            |
| Hunt                 | `routeHunt`                                   | `tryBedrockHunt` / `tryLlmApisHunt` / `tryOpenClawHunt`                             | `AI_BEDROCK_MAX_TOKENS` / `AI_LLM_APIS_MAX_TOKENS` / `AI_OPENCLAW_MAX_TOKENS` |
| Investigate          | `routeInvestigate`                            | `tryBedrock…` / `tryLlmApis…` / `tryOpenClaw…Investigate`                           | same trio                                                                     |
| Explain              | `routeExplain`                                | `try…Explain`                                                                       | same trio                                                                     |
| Agent task           | `routeAgentTask`                              | `try…AgentTask`                                                                     | same trio                                                                     |

Each `tryXxx` helper wraps its SDK call in `try/catch`. On a thrown SDK error it
calls `logProviderFailure` (which emits a `warn` app-log with
`outcome: FAILURE`, provider, and tenant) and **returns `undefined`** — which
advances the cascade. A provider error therefore **never crashes the request**;
it just moves to the next connector.

The generic path (`routeGenericTask`) is the one all feature-keyed calls flow
through; it additionally honors per-agent `temperature` and `model` overrides
resolved in `executeAiTask`.

### 4.2 No mock mode

There is **no `BEDROCK_MOCK` / env-gated mock** path. Per
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 89, the adapters always call
the real provider SDK/API — e.g. `BedrockService` loads the AWS SDK lazily via
`loadAwsBedrockSdk()` and constructs a real `BedrockRuntimeClient`
([`bedrock.service.ts`](../../apps/api/src/modules/connectors/services/bedrock.service.ts)).
If the SDK is missing or credentials are invalid, the thrown error is caught and
the cascade advances. Mock modes are banned because they mask real integration
failures.

---

## 5. Pinning a connector and the fallback

### 5.1 Explicit connector selection

A caller may pin a connector instead of using the full cascade.
`filterConnectorsBySelection`
([`ai.utilities.ts`](../../apps/api/src/modules/ai/ai.utilities.ts)) narrows the
resolved list:

- a **UUID** matches a custom LLM connector by `id`;
- a **type string** (`bedrock` / `llm_apis` / `openclaw_gateway`) matches a fixed
  connector (`c.type === key && !c.id`);
- `'default'` / empty → no filter (`connectorRequested: false`), i.e. full
  cascade.

It returns `connectorRequested` so the service can tell "use cascade" from "use
_this_ one." If a connector **was** requested but resolves to zero available,
the service throws — it does **not** silently fall back:

- agent task: `400 errors.ai.connectorNotAvailable`
  (`assertRequestedConnectorAvailable`), and if a pinned connector was tried but
  failed, `502` with `agentUnreachableKey(agentId)`
  (`throwIfConnectorRequestedButFailed`);
- generic feature path: `400` with `agentUnreachableKey(agentId)` from
  `resolveExecuteAiTaskConnectors` when the pinned connector yields zero.

For the generic path, `resolveSelectedConnector`
([`ai.utilities.ts`](../../apps/api/src/modules/ai/ai.utilities.ts)) computes the
effective selection from, **in order**: the explicit request → the agent's
`providerMode` (unless it equals the `AI_DEFAULT_PROVIDER_KEY` sentinel
`'default'`) → the feature's `preferredProvider`. A `null` / `'default'` result
means "use the full priority cascade."

### 5.2 Frontend wiring

The UI never iterates a static provider enum. It reads the live connector list
from `/api/connectors/ai-available` and stores the selection in the
`ai-connector-storage` Zustand store; the self-contained `AiConnectorSelect`
component renders it (see [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rules
45, 61). That selection arrives here as the `connector` field on
`ExecuteAiTaskInput` / `AgentTaskExecutionInput`.

### 5.3 The rule-based fallback

When `tryConnectorsInOrder` returns `undefined` (every provider failed **or** the
list was empty), the caller substitutes a deterministic rule-based response:

| Task            | Builder ([`ai.utilities.ts`](../../apps/api/src/modules/ai/ai.utilities.ts)) | `provider` / `model` | `confidence`                          |
| --------------- | ---------------------------------------------------------------------------- | -------------------- | ------------------------------------- |
| Generic feature | `buildFallbackGenericResponse`                                               | `rule-based`         | `0.3`                                 |
| Hunt            | `buildFallbackHuntResponse` (template engine in same file)                   | `rule-based`         | `0.87`                                |
| Investigate     | `buildFallbackInvestigateResponse` (data-driven, from the alert)             | `rule-based`         | `computeInvestigationConfidence(...)` |
| Explain         | `buildFallbackExplainResponse`                                               | `rule-based`         | `0.85`                                |
| Agent task      | `buildFallbackAgentTaskResponse`                                             | `rule-based`         | `0.7`                                 |

Every fallback sets `tokensUsed: { input: 0, output: 0 }` and is **clearly
labeled** `model: 'rule-based'`, `provider: 'rule-based'`. This satisfies
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rule 30 (fallbacks acceptable
only when no provider is available, and must be visibly labeled). A separate
**gate** — `ensureAiEnabled(tenantId)` — throws `403 errors.ai.notEnabled` up
front when _no_ connector is configured/enabled at all, so agent tasks fail fast
rather than silently degrading.

---

## 6. Attribution & provenance

Every response is **attributable** so the UI can show provenance and the audit
log can trace it. The shape is `AiResponse`
([`ai.types.ts`](../../apps/api/src/modules/ai/ai.types.ts)):

```ts
interface AiResponse {
  result: string
  reasoning: string[]
  confidence: number // 0..1
  model: string // e.g. 'global.anthropic.claude-sonnet-4-5-...', 'llm-apis:gpt-4', 'openclaw-gateway', 'rule-based'
  provider: string // 'bedrock' | 'llm_apis' | 'openclaw_gateway' | 'llm_apis(<name>)' | 'rule-based'
  tokensUsed: { input: number; output: number }
}
```

Where each field is stamped:

- **`provider` / `model`** — set by the per-provider response builders in
  [`ai.utilities.ts`](../../apps/api/src/modules/ai/ai.utilities.ts) at the
  moment of success: `buildBedrock…` → `provider: AiProvider.BEDROCK`,
  `buildLlmApis…` → `provider: AiProvider.LLM_APIS` (or `llm_apis(<connector
name>)` for a named custom connector), `buildOpenClaw…` →
  `AiProvider.OPENCLAW_GATEWAY`. The generic path uses
  `buildFeatureAwareResponse`, which threads `model` + `provider` straight from
  the winning connector. `AI_DEFAULT_MODEL`
  ([`ai.constants.ts`](../../apps/api/src/modules/ai/ai.constants.ts)) is the
  Bedrock default when a config omits `modelId`.
- **`confidence`** — feature-/severity-aware (`computeFeatureConfidence`,
  `computeInvestigationConfidence`).
- **`tokensUsed`** — the adapter's reported `inputTokens` / `outputTokens`
  (`0/0` for rule-based).

This is the api's realization of the provider-agnostic provenance contract
`AiProvenance` in [`packages/ai/src/types.ts`](../../packages/ai/src/types.ts)
(`provider`, `model`, `confidence?`, `tokensIn?`, `tokensOut?`,
`generatedAtIso`) — where `provider` is typed as `AiProviderKind` from the
model-router.

### 6.1 Attribution is double-recorded

After a successful (or fallback) response, `recordUsageAndAudit`
([`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts)) persists the
attribution twice:

1. **Usage ledger** — `UsageBudgetService.recordUsage({ provider, model,
inputTokens, outputTokens, estimatedCost, … })`, with cost from
   `AI_COST_PER_1K_INPUT_TOKENS` / `AI_COST_PER_1K_OUTPUT_TOKENS`, plus
   `AgentConfigService.incrementUsage` for per-agent quota.
2. **Audit log** — `logAudit` writes an `ai_audit_logs` row (`action`, `model`,
   `inputTokens`, `outputTokens`, `durationMs`, prompt/response) and a structured
   app-log under `AppLogFeature.AI` / `AI_AGENTS` recording the winning `model`
   and latency.

So "which provider answered" is recoverable from the response, the FinOps ledger,
**and** the audit trail — the provenance invariant in
[`AGENTS.md`](../../AGENTS.md) §7 and [`AI_GOVERNANCE.md`](AI_GOVERNANCE.md).

---

## 7. The provider-agnostic router (`packages/ai`)

[`packages/ai/src/model-router.ts`](../../packages/ai/src/model-router.ts) is the
**dependency-free reference** for the same decision: given
`AiProvider[]` (each with `enabled` / `healthy` / optional `priority`),
`routeProviders` filters to usable providers, sorts by explicit `priority` then
`DEFAULT_PROVIDER_ORDER` rank, and returns `{ order, fallbackToRuleBased }`;
`selectProvider` is the "best one or `null`" convenience.

> **Important:** the api today **does not import** `routeProviders` /
> `selectProvider` — `AiService` reimplements the cascade against live connectors
> (§3–§4). The package is the **shared contract + provenance vocabulary**: its
> `AiProviderKind` enum is what
> [`packages/ai/src/types.ts`](../../packages/ai/src/types.ts) `AiProvenance`
> uses, and both ends keep the **same priority order**. Treat it as the
> authoritative statement of intent; the api is the live implementation. If you
> change one order, change the other.

---

## 8. Where this is reached from

- **Public endpoints** — `POST /ai/hunt`, `/ai/investigate`, `/ai/explain`
  ([`ai.controller.ts`](../../apps/api/src/modules/ai/ai.controller.ts)), gated by
  `@RequirePermission(Permission.AI_AGENTS_EXECUTE)` and throttled at the AI tier
  (`@Throttle({ default: { limit: 10, ttl: 60000 } })` — rule 33/80). `aiHunt` /
  `aiInvestigate` / `aiExplain` all funnel into `executeAiTask`.
- **Every feature-keyed call** — `executeAiTask` is the single front door for all
  `AiFeatureKey` work; it adds the feature gate, the responsible agent
  (`FEATURE_TO_AGENT_MAP`), agent/budget gates, prompt assembly, and the cascade.
  Full pipeline: [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) §3.
- **Agent/orchestrator work** — the `AI_AGENT_TASK` job handler calls
  `AiService.runAgentTask`, which runs the same cascade via `routeAgentTask`.
  Dispatch, gates, and approvals: [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md) §5.

---

## 9. Invariants checklist (don't violate)

- **Try ALL connectors before falling back** — only after every configured
  provider returns `undefined` does `rule-based` apply
  ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 88).
- **No mock providers** — real SDK/API calls only; failures cascade
  (rule 89).
- **Fallbacks are labeled** — `model`/`provider` = `'rule-based'`, and only when
  no provider succeeded ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rule 30).
- **Provenance on every response** — `provider`, `model`, `confidence`,
  `tokensUsed`, mirrored into the usage ledger and audit log
  ([`AGENTS.md`](../../AGENTS.md) §7).
- **Tenant-scoped** — connector resolution and alert validation are always scoped
  by `tenantId`; AI investigation validates alert ownership first
  (`loadAndValidateAlert`, rule 48).
- **Pinned-connector failures are loud** — a requested-but-unavailable connector
  throws (`400`/`502`), it does not silently degrade to the cascade or fallback.

For the surrounding subsystem (agents, orchestrator, memory, eval, FinOps,
writeback), continue in [`AI_ARCHITECTURE.md`](AI_ARCHITECTURE.md); for policy,
[`docs/AI.md`](../AI.md) and [`AI_GOVERNANCE.md`](AI_GOVERNANCE.md).
