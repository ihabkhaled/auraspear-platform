# AI Architecture Deep-Dive — AuraSpear

> **Entry point first.** This repo's single onboarding entry point is
> [`AGENTS.md`](../../AGENTS.md) (§7 AI safety invariants, §1 loading order). Read
> it, then [`docs/AI.md`](../AI.md) (architecture + governance overview), then
> this file. This document is the **code-level** map of the live AI subsystem in
> `apps/api/src/modules/ai`; `docs/AI.md` is the higher-level architecture +
> governance overview and is **not** duplicated here — it is linked.

This is a map, not the source of truth. **Behavior is defined by the code.** Every
claim below cites a real path under
[`apps/api/src/modules/ai`](../../apps/api/src/modules/ai). When the code and this
doc disagree, the code wins — fix the doc.

## Sibling docs, rules, and skills

- **Overview / governance:** [`docs/AI.md`](../AI.md)
- **Backend rules that bind this code:** [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)
  §"AI Agent Configuration Rules" (rules 88–100) and §"AI Connector Strategy".
- **Frontend AI surfaces:** [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)
  §"AI Connector Strategy", §"AI Cross-Chat Memory System", §"AI Findings Page".
- **Hard rules:** [`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md),
  [`ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md),
  [`ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md),
  [`ai-output-rules.md`](../../rules/ai/ai-output-rules.md),
  [`ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md).
- **Recipes:** [`skills/ai/`](../../skills/ai/) — `add-ai-feature.md`,
  `add-ai-agent.md`, `add-ai-prompt.md`, `add-ai-memory.md`, `add-ai-evaluator.md`.
- **Stable truths:** [`memory/AI_MEMORY.md`](../../memory/AI_MEMORY.md).
- **Shared building blocks (provider-agnostic, no SDKs):**
  [`packages/ai/src`](../../packages/ai/src) — `safety.ts`, `redaction.ts`,
  `model-router.ts`, `evaluators.ts`, `prompts.ts`, `types.ts`
  ([`index.ts`](../../packages/ai/src/index.ts)). The api binds these contracts to
  real SDK calls; see `docs/AI.md` §"Output contracts".

---

## 1. Module map

`AiModule` ([`ai.module.ts`](../../apps/api/src/modules/ai/ai.module.ts)) is the
aggregate root. It imports the cross-cutting connector/agent modules and composes
the AI sub-modules below. It owns the public `AiController` +
`AiOpsWorkspaceController` and exports `AiService` plus every sub-module so the
rest of the platform can call AI through one surface.

| Area                      | Path                                                                                       | Responsibility                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Core service**          | [`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts)                             | The cascade engine. Resolves connectors, builds prompts, tries providers in order, records usage + audit.               |
| **Public endpoints**      | [`ai.controller.ts`](../../apps/api/src/modules/ai/ai.controller.ts)                       | `POST /ai/hunt`, `/ai/investigate`, `/ai/explain`.                                                                      |
| **Ops dashboard**         | [`ai-ops-workspace.service.ts`](../../apps/api/src/modules/ai/ai-ops-workspace.service.ts) | One aggregated `getWorkspace(tenantId)` snapshot: agents, orchestration, findings, chat, usage, audit, recent activity. |
| **Orchestrator**          | [`orchestrator/`](../../apps/api/src/modules/ai/orchestrator)                              | Agent dispatch, gate checks, approvals, schedules, event listeners, agent graph.                                        |
| **Memory (RAG)**          | [`memory/`](../../apps/api/src/modules/ai/memory)                                          | Cross-chat memory: extraction, embeddings, cosine retrieval, user controls, RAG observability.                          |
| **Chat**                  | [`chat/`](../../apps/api/src/modules/ai/chat)                                              | `/ai-chat` threads + messages + transcripts; its own connector chain.                                                   |
| **Feature catalog**       | [`feature-catalog/`](../../apps/api/src/modules/ai/feature-catalog)                        | Per-tenant per-feature enable/budget/provider config.                                                                   |
| **Prompt registry**       | [`prompt-registry/`](../../apps/api/src/modules/ai/prompt-registry)                        | Versioned prompt templates per `AiFeatureKey`, active-version selection.                                                |
| **Usage budget / FinOps** | [`usage-budget/`](../../apps/api/src/modules/ai/usage-budget)                              | Token/cost ledger, monthly budget checks, FinOps dashboard, cost rates, budget alerts.                                  |
| **Writeback / findings**  | [`writeback/`](../../apps/api/src/modules/ai/writeback)                                    | Persists `AiExecutionFinding` rows, writes back to source entities, the `/ai-findings` workspace.                       |
| **Eval**                  | [`eval/`](../../apps/api/src/modules/ai/eval)                                              | Golden-dataset suites + runs + stats.                                                                                   |
| **Simulation**            | [`simulation/`](../../apps/api/src/modules/ai/simulation)                                  | Dry-run / what-if execution.                                                                                            |
| **Semantic search**       | [`semantic-search/`](../../apps/api/src/modules/ai/semantic-search)                        | Cross-module text search over findings, chat, memories, alerts, cases, incidents.                                       |

Agent **configuration** lives in a sibling module,
[`agent-config/`](../../apps/api/src/modules/agent-config), not under `ai/`. It
holds the per-agent defaults, the `FEATURE_TO_AGENT_MAP`, the specialist→core
alias map, OSINT sources, and approval records. `AiService` and
`OrchestratorService` both depend on `AgentConfigService`.

Every sub-module follows the repository pattern mandated by
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (Controller → Service →
Repository → Prisma; utilities/types/enums/constants in dedicated files). The
public AI endpoints are throttled (`@Throttle({ default: { limit: 10, ttl: 60000 } })`,
the AI tier from rule 80) and gated by `@RequirePermission(Permission.AI_AGENTS_EXECUTE)`
in [`ai.controller.ts`](../../apps/api/src/modules/ai/ai.controller.ts).

---

## 2. The provider cascade

The platform is **provider-agnostic**. The priority order is fixed in
[`ai.constants.ts`](../../apps/api/src/modules/ai/ai.constants.ts) as
`AI_CONNECTOR_PRIORITY`:

```
bedrock → llm_apis → openclaw_gateway   (then dynamic custom LLM connectors)
                                         → rule-based fallback
```

### 2.1 Resolving the connector list

`AiService.findAvailableAiConnectors(tenantId)`
([`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts)) returns **all**
configured connectors, never just the first:

1. `resolveFixedConnectors` decrypts the three fixed connector types in priority
   order via `ConnectorsService.getDecryptedConfig` (credentials are AES-256-GCM
   at rest — see [`docs/SECURITY.md`](../SECURITY.md)).
2. `appendDynamicConnectors` appends every enabled custom LLM connector
   (`LlmConnectorsService.getEnabledConfigs`) as additional `llm_apis` entries,
   each carrying its own `id`/`name`.
3. `logConnectorResolution` records which were checked, available, and missing.

This realizes [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 88: _"AI
provider cascade MUST try ALL configured connectors before falling back."_

### 2.2 Trying providers in order

`tryConnectorsInOrder(connectors, attempt, index)` walks the list **recursively**
(deliberately, to avoid the `no-await-in-loop` lint rule). For each connector it
logs an attempt, runs the per-task `attempt` closure, and:

- returns the first truthy `AiResponse` (logs success), or
- on `undefined` logs the failure and recurses to the next connector, or
- when the list is exhausted, logs `all connectors failed` and returns
  `undefined` — the caller then substitutes a **rule-based fallback**.

Each provider attempt is wrapped so a thrown SDK error is caught, logged via
`logProviderFailure`, and converted to `undefined` (which advances the cascade) —
it never crashes the request. There is **no mock mode**: per
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 89, connectors always call
the real SDK/API and integration failures simply move to the next connector.

### 2.3 Per-provider routing

Routing is a `switch` on `ConnectorType` per task family
([`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts)): `routeGenericTask`,
`routeHunt`, `routeInvestigate`, `routeExplain`, `routeAgentTask`. Each branch
calls the matching adapter in
[`connectors/services`](../../apps/api/src/modules/connectors/services):
`BedrockService.invoke`, `LlmApisService.invoke`, or
`OpenClawGatewayService.invoke`, with per-provider max-token constants
(`AI_BEDROCK_MAX_TOKENS`, `AI_LLM_APIS_MAX_TOKENS`, `AI_OPENCLAW_MAX_TOKENS`). The
generic path additionally honors per-agent `temperature` and `model` overrides.

### 2.4 Connector selection & overrides

A caller may pin a connector. `filterConnectorsBySelection`
([`ai.utilities.ts`](../../apps/api/src/modules/ai/ai.utilities.ts)) narrows the
list — by UUID for a custom LLM connector, or by type string for a fixed one —
and reports whether a connector was explicitly requested. If a connector was
requested but resolves to zero available, the service throws a `400`
(`errors.ai.connectorNotAvailable`) instead of silently falling back. For the
generic feature path, `resolveSelectedConnector` picks the effective connector
from, in order: the explicit request → the agent's `providerMode` (unless it is
the `'default'` sentinel) → the feature's `preferredProvider`. The `'default'`
key means "use the full priority cascade."

### 2.5 The rule-based fallback

When every connector fails, `buildFallbackGenericResponse`
([`ai.utilities.ts`](../../apps/api/src/modules/ai/ai.utilities.ts)) returns a
clearly-labeled response with `model: 'rule-based'`, `provider: 'rule-based'`,
`confidence: 0.3`, and zero token usage. This satisfies the frontend rule
([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rule 30) that fallbacks are
acceptable only when no connector is configured and must be visibly labeled.

---

## 3. The generic execution pipeline: `executeAiTask`

`executeAiTask(params)` is the single entry point for _every_ feature-keyed AI
call (the public `aiHunt` / `aiInvestigate` / `aiExplain` methods all funnel
through it). It is the place where feature flags, agents, prompts, budgets, and
the cascade come together
([`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts)):

1. **Feature gate** — `FeatureCatalogService.getConfig(tenantId, featureKey)`;
   throw `403 errors.ai.featureDisabled` if the feature is off for the tenant.
2. **Resolve the responsible agent** — `FEATURE_TO_AGENT_MAP[featureKey]`
   (default `AiAgentId.ORCHESTRATOR`), then load its config
   (`AgentConfigService.getAgentConfig`).
3. **Agent gates** — `validateAgentEnabled` (403), `validateAgentQuota`
   (`checkAgentQuota` → 429 if the per-agent token quota is exhausted),
   `validateGlobalBudget` (`UsageBudgetService.checkBudget` → 429
   `errors.ai.budgetExceeded`).
4. **Build the prompt** — `buildExecuteAiTaskPrompt`: fetch the active template
   from the prompt registry, optionally enrich context with OSINT results and
   index-pattern scope, then `assembleFinalPrompt(...)` layers the agent's
   `systemPrompt`, `promptSuffix`, `outputFormat`, and `presentationSkills`.
5. **Resolve connectors** — full cascade or a pinned connector (§2.4).
   Effective `maxTokens` / `temperature` / `model` come from the agent config,
   falling back to feature config / sane defaults.
6. **Run the cascade** — `tryConnectorsInOrder(... routeGenericTask ...)`, else
   the rule-based fallback.
7. **Record** — `recordUsageAndAudit`: write the token ledger
   (`UsageBudgetService.recordUsage` with an estimated cost from
   `AI_COST_PER_1K_INPUT_TOKENS` / `..._OUTPUT_TOKENS`), increment the agent's
   monthly usage, write an `ai_audit_logs` row, and emit a structured app-log.

### 3.1 Context enrichment (OSINT + index patterns)

If the agent config lists OSINT source IDs **and** the call's context carries an
`iocValue`/`iocType`, `enrichContextWithOsint` calls
`OsintExecutorService.enrichIoc` and merges the successful results into the
prompt context (failures are swallowed and logged — enrichment is best-effort).
`enrichContextWithIndexPatterns` injects the agent's configured
`indexPatterns` so the model scopes its analysis to the right data sources. Both
mutate `params.context` before prompt assembly.

### 3.2 Output shape

Every `AiResponse`
([`ai.types.ts`](../../apps/api/src/modules/ai/ai.types.ts)) carries
`result`, `reasoning[]`, `confidence`, `model`, `provider`, and
`tokensUsed { input, output }`. `buildFeatureAwareResponse`
([`ai.utilities.ts`](../../apps/api/src/modules/ai/ai.utilities.ts)) computes
feature-aware reasoning + confidence. This is the api's realization of the
provider-agnostic provenance contracts in
[`packages/ai/src/types.ts`](../../packages/ai/src/types.ts); see `docs/AI.md`
§"Output contracts".

---

## 4. Agents

AuraSpear defines a large agent catalog in
[`agent-config.constants.ts`](../../apps/api/src/modules/agent-config/agent-config.constants.ts)
(`AI_AGENT_DEFAULTS`, keyed by the `AiAgentId` enum). Each agent has defaults for
`displayName`, `description`, `temperature`, `maxTokensPerCall`, `triggerMode`,
`outputFormat`, and `presentationSkills` (the rich-render hints used by the web
`ai-renderer/` components).

### 4.1 Core vs. specialist agents

Only a handful of agents are **core execution agents** — they are the values of
`FEATURE_TO_AGENT_MAP` (e.g. `ORCHESTRATOR`, `L1_ANALYST`, `L2_ANALYST`,
`THREAT_HUNTER`, `RULES_ANALYST`, `NORM_VERIFIER`, `DASHBOARD_BUILDER`). The many
**specialist** agents (alert-triage, incident-escalation, sigma-drafting,
ioc-enrichment, job-health, …) appear in the UI and in schedules but have **no
direct execution handler**: they delegate through `AGENT_ALIAS_MAP` /
`resolveExecutionAgent(agentId)`
([`agent-config.constants.ts`](../../apps/api/src/modules/agent-config/agent-config.constants.ts)),
which maps a specialist to its real core agent. Toggling a specialist therefore
controls a _subset_ of behavior while execution still runs on a core agent. The
`AgentGraphService`
([`orchestrator/agent-graph.service.ts`](../../apps/api/src/modules/ai/orchestrator/agent-graph.service.ts))
exposes this core/specialist topology, each agent's schedules, mapped features,
enabled state, and monthly token usage.

### 4.2 Feature → agent mapping

`FEATURE_TO_AGENT_MAP` binds each `AiFeatureKey` (alert summarize, case timeline,
hunt hypothesis, detection drafting, report summaries, etc.) to the agent that
runs it. This is the table `executeAiTask` consults in step 2 above to load
per-agent runtime parameters (temperature, max tokens, system prompt, quota).

### 4.3 Config & approvals

`AgentConfigService`
([`agent-config.service.ts`](../../apps/api/src/modules/agent-config/agent-config.service.ts))
handles per-tenant agent config (enable, trigger mode/config, OSINT sources,
quotas), token-usage increments, and approval records. Per
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rules 92–100: agent IDs are
validated against `AiAgentId`, provider modes against `AiProviderMode`, trigger
config against per-mode Zod schemas; OSINT source URLs pass SSRF validation
(`validateUrl`) and API keys are encrypted at rest; approval-required actions
persist an `ApprovalRequest` before execution; every execution checks token
quota.

---

## 5. The orchestrator

`OrchestratorService`
([`orchestrator/orchestrator.service.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.service.ts))
is the gatekeeper for **agent-driven** work (as opposed to the synchronous
feature calls in §3). It does not call providers directly — it validates, then
**enqueues an `AI_AGENT_TASK` job**.

### 5.1 `dispatchAgentTask` flow

1. `resolveExecutionAgent(input.agentId)` maps specialist → core agent.
2. `canAgentExecute` runs the gate chain:
   - `checkAgentEnabled` — agent enabled, and automation mode not in
     `DISABLED_MODES`;
   - `checkAgentQuotaLimit` — `checkAgentQuota` (shared with `AiService`);
   - `checkFeatureBudget` — monthly token budget for `AiFeatureKey.AGENT_TASK`.
     A blocked dispatch logs `DENIED` and throws `403` with a specific message key.
3. `resolveAutomationMode` maps the agent's `triggerMode` to an
   `AgentAutomationMode` and decides `requiresApproval`
   (`APPROVAL_REQUIRED_MODES`, plus high-risk under `AUTO_LOW_RISK`).
4. `enqueueAgentJob` enqueues `JobType.AI_AGENT_TASK` via `JobService` with an
   idempotency key and `maxAttempts: 2`.
5. If approval is required, `createApprovalRecord` persists an approval
   (24-hour expiry) through `AgentConfigService.createApproval` **before** the
   job runs — the AI-safety invariant from
   [`AGENTS.md`](../../AGENTS.md) §7 and
   [`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md).

`getOrchestratorStats` and `getAgentHistory` provide the 24h dispatch counts and
per-agent run history surfaced by the ops dashboard. HTTP entry is
[`orchestrator.controller.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.controller.ts)
(`POST /agent-config/agents/:agentId/dispatch`, gated by
`Permission.AI_AGENTS_EXECUTE`).

### 5.2 Triggers — what enqueues agent work

The orchestrator is fed from three sources, all routing through
`dispatchAgentTask` so the gate/approval logic is uniform:

- **Manual** — the HTTP `dispatch` endpoint.
- **Event-driven** —
  [`agent-event-listener.service.ts`](../../apps/api/src/modules/ai/orchestrator/agent-event-listener.service.ts):
  `onAlertCreated`, `onIncidentStatusChanged`, `onJobFailed`,
  `onConnectorSyncCompleted`. These are fire-and-forget (never throw, never block
  the caller) and honor each agent's `triggerMode` + `triggerConfig` filters
  (e.g. alert-severity allow-lists) before dispatching.
- **Scheduled** —
  [`agent-scheduler.service.ts`](../../apps/api/src/modules/ai/orchestrator/agent-scheduler.service.ts):
  a single `@Cron('*/30 * * * * *')` heartbeat (the _only_ `@Cron` here) reads due
  rows from the `ai_agent_schedules` table (`ScheduleService.findDueSchedules`),
  dispatches each, and marks run start/completion + next-run time. Schedules are
  managed via [`orchestrator/schedule/`](../../apps/api/src/modules/ai/orchestrator/schedule).

### 5.3 Execution + writeback (the job side)

The enqueued `AI_AGENT_TASK` job is handled by an `AiAgentTaskHandler` registered
in
[`jobs.module.ts`](../../apps/api/src/modules/jobs/jobs.module.ts)
(`onModuleInit` wires every `JobType` to a handler — the rule from
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) §"Job Types & Handlers"). The
handler calls back into `AiService.runAgentTask(input)`, which:

- `ensureAiEnabled(tenantId)` — 403 `errors.ai.notEnabled` if no connector is
  configured/enabled;
- resolves connectors (respecting any pinned connector), runs the cascade with
  `routeAgentTask`, falls back to `buildFallbackAgentTaskResponse`;
- writes an audit record + structured success log.

Results are persisted by `AiWritebackService.processSystemTriggeredResult`
([`writeback/ai-writeback.service.ts`](../../apps/api/src/modules/ai/writeback/ai-writeback.service.ts)):
it parses structured findings, applies a **quality gate** (`isMeaningfulFinding`
suppresses placeholder/heartbeat output), persists `AiExecutionFinding` rows
(status `proposed`), writes back to the source alert/case/incident, updates
session counts, creates a tenant-admin notification, and records a job-run
summary for the AI Job Runs dashboard. Writeback failures are logged but never
re-thrown — they must not crash the job handler. Findings then flow to the
`/ai-findings` workspace (status transitions validated by
`VALID_FINDING_TRANSITIONS`: `proposed → applied/dismissed`,
`failed → dismissed`; see [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)
§"AI Findings Page").

---

## 6. Memory (cross-chat RAG)

The [`memory/`](../../apps/api/src/modules/ai/memory) module gives the chat a
persistent, tenant- and user-scoped memory. Wiring is in
[`memory.module.ts`](../../apps/api/src/modules/ai/memory/memory.module.ts).
Behavior is governed by
[`rules/ai/ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md) and summarized
in [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) §"AI Cross-Chat Memory System".

**Extraction** —
[`memory-extraction.service.ts`](../../apps/api/src/modules/ai/memory/memory-extraction.service.ts):
after a chat turn, `AiChatService.sendMessage` enqueues a `MEMORY_EXTRACTION` job
(non-blocking). `extractFromThread` gathers the thread's user messages plus
existing memories (for contradiction detection), prompts an LLM to emit a JSON
array of `create` / `update` / `delete` actions categorized as
`fact | preference | instruction | context`, then `applyExtractedMemories`
persists them with freshly computed embeddings and `sourceType: 'chat_thread'`.

**Embeddings** —
[`embedding.service.ts`](../../apps/api/src/modules/ai/memory/embedding.service.ts):
`generateEmbedding` resolves an embedding-capable connector (fixed `llm_apis`
first, then custom LLM connectors) and delegates to
`LlmApisService.generateEmbedding`. If none is available it returns an empty
vector rather than failing.

**Retrieval** —
[`memory-retrieval.service.ts`](../../apps/api/src/modules/ai/memory/memory-retrieval.service.ts):
`retrieveRelevant` embeds the query, fetches the user's non-deleted memories, and
ranks them by **in-memory cosine similarity** (`topN = 10`,
`similarityThreshold = 0.3`). If embeddings are unavailable it falls back to the
most-recent memories. `formatForPrompt` turns the top results into a system-prompt
preamble within a token budget.

**Injection** — `AiChatService.sendMessage`
([`chat/ai-chat.service.ts`](../../apps/api/src/modules/ai/chat/ai-chat.service.ts))
calls `formatForPrompt` and prepends the result to the thread's system prompt.
This is wrapped in `try/catch` and explicitly **non-blocking** — a memory failure
logs a warning and chat proceeds.

**User control + observability** —
[`user-memory.service.ts`](../../apps/api/src/modules/ai/memory/user-memory.service.ts)
(view/search/edit/delete; permissions `AI_MEMORY_VIEW` / `AI_MEMORY_EDIT`) and
[`rag-observability.service.ts`](../../apps/api/src/modules/ai/memory/rag-observability.service.ts).

> Note: chat runs its **own** connector chain (`llm_apis → openclaw_gateway →
bedrock`, then custom connectors) in `AiChatService.resolveConnectorConfigs` —
> distinct from `AI_CONNECTOR_PRIORITY` used by `AiService`. See
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) §"AI Chat Page".

---

## 7. Configuration & governance plumbing

| Concern                     | Module                                                              | Notes                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Feature flags + budgets** | [`feature-catalog/`](../../apps/api/src/modules/ai/feature-catalog) | `getConfig` falls back to `DEFAULT_FEATURE_CONFIG`; `enabled`, `preferredProvider`, `maxTokens`, `approvalLevel`, `monthlyTokenBudget` per `AiFeatureKey`.                          |
| **Prompts (versioned)**     | [`prompt-registry/`](../../apps/api/src/modules/ai/prompt-registry) | `getActivePrompt` returns the tenant's active template for a task type, else a built-in `DEFAULT_PROMPTS` entry; `create` auto-increments version; `activate` deactivates siblings. |
| **Usage / FinOps**          | [`usage-budget/`](../../apps/api/src/modules/ai/usage-budget)       | `recordUsage` ledgers tokens+cost; `checkBudget` enforces monthly token caps; `getFinopsDashboard` projects month-end cost; cost rates + budget alerts are tenant-managed.          |
| **Audit**                   | `AiRepository.createAuditLog` + `AppLoggerService`                  | Every AI call writes an `ai_audit_logs` row (action, model, tokens, latency, prompt/response) and a structured app-log under `AppLogFeature.AI` / `AI_AGENTS`.                      |

These map to the governance checklist in [`docs/AI.md`](../AI.md) §"Governance
checklist" and the invariants in [`AGENTS.md`](../../AGENTS.md) §7.

---

## 8. Evaluation, simulation, semantic search

- **Eval** —
  [`eval/ai-eval.service.ts`](../../apps/api/src/modules/ai/eval/ai-eval.service.ts):
  golden-dataset suites (`aiEvalSuite`) and runs (`aiEvalRun`) with avg-score
  stats. This is the api-side persistence around the pure
  [`packages/ai/src/evaluators.ts`](../../packages/ai/src/evaluators.ts) harness
  (`runEval`, safety assertions). Recipe:
  [`skills/ai/add-ai-evaluator.md`](../../skills/ai/add-ai-evaluator.md).
- **Simulation** —
  [`simulation/`](../../apps/api/src/modules/ai/simulation): dry-run / what-if
  agent execution without side effects.
- **Semantic search** —
  [`semantic-search/semantic-search.service.ts`](../../apps/api/src/modules/ai/semantic-search/semantic-search.service.ts):
  tenant-scoped cross-module search over findings, chat threads, memories,
  alerts, cases, and incidents (today: case-insensitive `contains` with static
  per-module scores; semantic ranking is on the roadmap — see
  [`docs/AI.md`](../AI.md) §"Roadmap").

---

## 9. Tenancy & safety invariants (non-negotiable)

Anchored in [`AGENTS.md`](../../AGENTS.md) §6–7 and
[`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md):

- **Tenant isolation** — every AI query is scoped by `tenantId`. AI investigation
  validates alert ownership before analysis (`loadAndValidateAlert` → 404 if the
  alert is not in the caller's tenant; rule 48).
- **No silent destructive actions** — agent work that side-effects is gated by
  the orchestrator's approval logic and a persisted `ApprovalRequest`
  (`evaluateApproval` in [`packages/ai/src/safety.ts`](../../packages/ai/src/safety.ts)
  is the shared policy; the orchestrator enforces it).
- **Provenance everywhere** — provider/model/confidence/tokens on every response;
  recorded in the audit log and the usage ledger.
- **Redaction before model calls** — strip secrets/PII via `redact()`
  ([`packages/ai/src/redaction.ts`](../../packages/ai/src/redaction.ts)); memory
  must never store secrets ([`rules/ai/ai-memory-rules.md`](../../rules/ai/ai-memory-rules.md)).
- **Never render raw AI output as HTML** — a frontend rule
  ([`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) rule 43); markdown/plain text
  only.
- **No mock providers in production code** — real SDK calls only, cascade on
  failure ([`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) rule 89).

---

## 10. Where to go next

- Add a feature: [`skills/ai/add-ai-feature.md`](../../skills/ai/add-ai-feature.md)
  (+ frontend [`skills/frontend/add-ai-panel.md`](../../skills/frontend/add-ai-panel.md)).
- Add an agent: [`skills/ai/add-ai-agent.md`](../../skills/ai/add-ai-agent.md).
- Add a prompt: [`skills/ai/add-ai-prompt.md`](../../skills/ai/add-ai-prompt.md).
- Governance / overview: [`docs/AI.md`](../AI.md).
- The full docs map: [`docs/DOCS_INDEX.md`](../DOCS_INDEX.md).
