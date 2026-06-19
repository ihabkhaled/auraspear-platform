# AI Architecture — `apps/api/src/modules/ai` + `packages/ai`

> **Entry point first.** Start your loading order at
> [`AGENTS.md`](../../AGENTS.md) (§1) — it defines the AI loading order plus the
> AI-safety invariants (§7) every change must respect — then read
> [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (the AI rules: 88–100) and
> [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (the AI-surface rules). **No AI
> agent may edit first and understand later.**

This document explains **how the AI subsystem is wired in code**: the live NestJS
modules under [`apps/api/src/modules/ai/`](../../apps/api/src/modules/ai/), the
provider cascade implemented in
[`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts), and the
provider-agnostic building blocks in
[`packages/ai`](../../packages/ai/). It is the _map of the machinery_.

For the **product/governance view** — what AI ships, the safety/approval policy,
the redaction contract, the governance checklist and roadmap — read
[`docs/AI.md`](../AI.md). This doc does **not** restate those; it links them and
focuses on structure and control flow.

## Where this doc sits

| You want…                                     | Go to                                                                                                                                           |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Product + governance view of AI               | [`docs/AI.md`](../AI.md)                                                                                                                        |
| AI-safety invariants (the one rule)           | [`AGENTS.md`](../../AGENTS.md) §7 · [`rules/ai/`](../../rules/ai/)                                                                              |
| Hard backend AI rules (88–100)                | [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md)                                                                                                |
| Hard web AI-surface rules (30–63)             | [`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md)                                                                                                |
| How AI providers are configured as connectors | [`docs/architecture/CONNECTORS.md`](CONNECTORS.md) (the 3 AI connector types)                                                                   |
| Backend layering this module obeys            | [`docs/architecture/BACKEND.md`](BACKEND.md) · [`rules/backend/layering-rules.md`](../../rules/backend/layering-rules.md)                       |
| Add an AI feature / panel (recipes)           | [`skills/ai/add-ai-feature.md`](../../skills/ai/add-ai-feature.md) · [`skills/frontend/add-ai-panel.md`](../../skills/frontend/add-ai-panel.md) |
| AI-related Prisma tables                      | [`docs/architecture/DATABASE.md`](DATABASE.md) (§"AI subsystem")                                                                                |

---

## 1. Two halves: shared contracts vs. live subsystem

The AI system is split deliberately:

```
packages/ai/        @auraspear/ai — pure, dependency-free contracts + decision logic
   ↑ consumed by both
apps/web/           AI panels, renderers, hooks (see apps/web/CLAUDE.md)
apps/api/src/modules/ai/   the live subsystem: real SDK calls, jobs, persistence
```

- **`packages/ai`** holds _no SDKs and no infrastructure_ — by design (see its
  [`package.json`](../../packages/ai/package.json) description: "Dependency-free
  so both web and api can consume it"). It owns output contracts, redaction,
  provider-routing decision logic, the safety/approval policy, the prompt-version
  shape, and an eval harness.
- **`apps/api/src/modules/ai`** binds those contracts to real provider SDKs
  (Bedrock / OpenAI-compatible / OpenClaw), the job queue, Prisma persistence,
  audit logging, quota/budget enforcement, and OSINT enrichment.

The decision logic in `packages/ai` ([`model-router.ts`](../../packages/ai/src/model-router.ts))
**mirrors** the runtime cascade in the api — it is not imported by the cascade
hot path (the api uses its own `ConnectorType`-keyed implementation), but it is
the canonical, testable statement of the routing rule.

---

## 2. `packages/ai` — the shared building blocks

Barrel: [`packages/ai/src/index.ts`](../../packages/ai/src/index.ts). Six modules,
all pure:

| Module                                                     | Key exports                                                                                              | Purpose                                                                                                                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`model-router.ts`](../../packages/ai/src/model-router.ts) | `AiProviderKind`, `DEFAULT_PROVIDER_ORDER`, `routeProviders()`, `selectProvider()`                       | Order usable providers best-first; signal `fallbackToRuleBased` when none are enabled+healthy.                                                                                                 |
| [`safety.ts`](../../packages/ai/src/safety.ts)             | `AiActionCategory`, `RiskLevel`, `evaluateApproval()`                                                    | Classify every AI action and decide if a human must approve it before it runs.                                                                                                                 |
| [`redaction.ts`](../../packages/ai/src/redaction.ts)       | `RedactionKind`, `redact()`                                                                              | Strip secrets/PII (private keys, JWTs, AWS keys, bearer tokens, `secret=`/`password=` pairs, emails, IPv4) before a model call or transcript write; `keep` preserves IOCs under investigation. |
| [`types.ts`](../../packages/ai/src/types.ts)               | `AiProvenance`, `AiCitation`, `AiFinding`, `RiskScore`, `IocEnrichment`, `IocType`, `isHighConfidence()` | The attributable, confidence-scored, source-cited output contracts.                                                                                                                            |
| [`prompts.ts`](../../packages/ai/src/prompts.ts)           | `PromptTemplate`, `renderPrompt()`, `PROMPTS`                                                            | Versioned prompt text + `{{var}}` interpolation; version is recorded in `AiProvenance.promptVersion`.                                                                                          |
| [`evaluators.ts`](../../packages/ai/src/evaluators.ts)     | `EvalCase`, `EvalAssertion`, `runEval()`                                                                 | Golden-case harness; a failing `safety` assertion fails the whole run regardless of pass rate. Provider calls are injected so evals run offline.                                               |

The semantics of `evaluateApproval()`, `redact()`, and the provenance contract
are documented (not duplicated) in [`docs/AI.md`](../AI.md) §"Safety", §"Redaction",
and §"Output contracts".

---

## 3. The AI module tree (`apps/api/src/modules/ai`)

`AiModule` ([`ai.module.ts`](../../apps/api/src/modules/ai/ai.module.ts)) is the
composition root. It wires `AiController` (the `/ai/hunt|investigate|explain`
surface), `AiService` (the cascade), and a fleet of sub-modules, re-exporting most
so other feature modules can consume them:

| Sub-module         | Path                                                                                                                                                                                                                                                           | Role                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **(root)**         | [`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts), [`ai.controller.ts`](../../apps/api/src/modules/ai/ai.controller.ts)                                                                                                                           | The provider cascade + generic `executeAiTask()` entry point.                                                                                                                  |
| `orchestrator/`    | [`orchestrator.service.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.service.ts)                                                                                                                                                                | Dispatches agent tasks: enabled → automation-mode → quota → budget → approval, then enqueues an `AI_AGENT_TASK` job. Includes `schedule/` (cron triggers) and the agent graph. |
| `feature-catalog/` | [`feature-catalog.service.ts`](../../apps/api/src/modules/ai/feature-catalog/feature-catalog.service.ts)                                                                                                                                                       | Per-tenant per-feature enable flag, preferred provider, and `maxTokens`. Gate #1 in `executeAiTask`.                                                                           |
| `prompt-registry/` | [`prompt-registry.service.ts`](../../apps/api/src/modules/ai/prompt-registry/prompt-registry.service.ts)                                                                                                                                                       | The active prompt template per feature (the runtime analogue of `packages/ai/prompts.ts`).                                                                                     |
| `usage-budget/`    | [`usage-budget.service.ts`](../../apps/api/src/modules/ai/usage-budget/usage-budget.service.ts)                                                                                                                                                                | Monthly token/cost budget per tenant+feature; `checkBudget()` / `recordUsage()`. AI FinOps.                                                                                    |
| `memory/`          | [`memory-retrieval.service.ts`](../../apps/api/src/modules/ai/memory/memory-retrieval.service.ts), [`embedding.service.ts`](../../apps/api/src/modules/ai/memory/embedding.service.ts), `memory-extraction.service.ts`, `user-memory.*`, `rag-observability.*` | Cross-chat memory: extract → embed → retrieve by cosine similarity → inject into the system prompt. Non-blocking.                                                              |
| `chat/`            | [`ai-chat.service.ts`](../../apps/api/src/modules/ai/chat/ai-chat.service.ts), `ai-transcript.*`                                                                                                                                                               | Threaded LLM chat with per-user attribution; transcripts persisted server-side (never localStorage).                                                                           |
| `writeback/`       | [`ai-writeback.service.ts`](../../apps/api/src/modules/ai/writeback/ai-writeback.service.ts), `ai-handoff.*`, `ai-schedule-templates.*`                                                                                                                        | The AI Findings store (Postgres full-text search) + apply/dismiss + hand-off to cases/incidents.                                                                               |
| `eval/`            | [`ai-eval.service.ts`](../../apps/api/src/modules/ai/eval/ai-eval.service.ts)                                                                                                                                                                                  | Runtime eval lab (consumes `packages/ai/evaluators.ts`).                                                                                                                       |
| `simulation/`      | [`ai-simulation.service.ts`](../../apps/api/src/modules/ai/simulation/ai-simulation.service.ts)                                                                                                                                                                | Dry-run / what-if AI behavior.                                                                                                                                                 |
| `semantic-search/` | [`semantic-search.service.ts`](../../apps/api/src/modules/ai/semantic-search/semantic-search.service.ts)                                                                                                                                                       | Embedding-backed search across SOC entities.                                                                                                                                   |
| **(workspace)**    | [`ai-ops-workspace.service.ts`](../../apps/api/src/modules/ai/ai-ops-workspace.service.ts)                                                                                                                                                                     | Aggregated AI-ops dashboard surface.                                                                                                                                           |

Each sub-module follows the standard backend layering
(controller → service → repository → utilities; see
[`BACKEND.md`](BACKEND.md) §2). Agent definitions, provider modes, trigger modes,
quotas and OSINT sources live in the sibling
[`agent-config`](../../apps/api/src/modules/agent-config/) module; the actual
agent-task **execution handler** lives in
[`ai-agents/ai-agent-task.handler.ts`](../../apps/api/src/modules/ai-agents/ai-agent-task.handler.ts),
wired into the job system.

---

## 4. The provider cascade (the load-bearing rule)

CLAUDE.md rule **88**: _"AI provider cascade MUST try ALL configured connectors
before falling back."_ The implementation lives in
[`ai.service.ts`](../../apps/api/src/modules/ai/ai.service.ts).

### 4.1 Resolving the connector list — `findAvailableAiConnectors()`

Returns **all** configured AI connectors in priority order, not just the first:

1. **Fixed connectors** — `resolveFixedConnectors()` walks `AI_CONNECTOR_PRIORITY`
   (`[BEDROCK, LLM_APIS, OPENCLAW_GATEWAY]` in
   [`ai.constants.ts`](../../apps/api/src/modules/ai/ai.constants.ts)) and pulls
   each tenant's decrypted config via `ConnectorsService.getDecryptedConfig`.
   Missing connectors are dropped.
2. **Dynamic connectors** — `appendDynamicConnectors()` appends every enabled
   tenant-defined LLM connector (`LlmConnectorsService.getEnabledConfigs`) as
   additional `LLM_APIS` entries.

The resolved list (with `id`/`name` for dynamic ones) and what was missing is
logged via `AppLoggerService`.

### 4.2 Iterating — `tryConnectorsInOrder()`

Walks the list **sequentially** (recursion, to satisfy `no-await-in-loop`),
calling the supplied `attempt(connector)`:

```
for each connector in priority order:
    response = attempt(connector)       // provider SDK call, errors swallowed → undefined
    if response: return it (log success)
    else: log failure, try the next
all failed → log "using rule-based fallback" → return undefined
```

A single provider failure **never** short-circuits to the fallback — every
configured connector is tried first (rule 88). The fallback is only reached when
all fail or none are configured; the caller then builds a rule-based response
(`buildFallback*Response`) labeled `model: 'rule-based'` (`AI_FALLBACK_MODEL`),
satisfying web rule 30.

### 4.3 Per-provider routing

For each AI operation there is a `route*` dispatcher that switches on
`connector.type` (`ConnectorType.BEDROCK` / `LLM_APIS` / `OPENCLAW_GATEWAY`) and
calls the matching `try*` helper, which invokes the real adapter service:

| Operation         | Dispatcher                                        | Bedrock / LLM APIs / OpenClaw helpers                                     |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------------------------- |
| Hunt              | `routeHunt()`                                     | `tryBedrockHunt` / `tryLlmApisHunt` / `tryOpenClawHunt`                   |
| Investigate       | `routeInvestigate()`                              | `tryBedrockInvestigate` / …                                               |
| Explain           | `routeExplain()`                                  | `tryBedrockExplain` / …                                                   |
| Agent task        | `routeAgentTask()`                                | `tryBedrockAgentTask` / …                                                 |
| Generic (feature) | `routeGenericTask()` → `invokeGenericConnector()` | `invokeGenericBedrock` / `invokeGenericLlmApis` / `invokeGenericOpenClaw` |

The adapter services themselves (`BedrockService`, `LlmApisService`,
`OpenClawGatewayService`) live in the `connectors` module — see
[`CONNECTORS.md`](CONNECTORS.md). Per rule **89**, there is **no `BEDROCK_MOCK` /
env-gated mock mode**: helpers always call the real SDK and, on failure, return
`undefined` so the cascade advances.

> **Default model:** `AI_DEFAULT_MODEL` in `ai.constants.ts` is a Claude Sonnet
> Bedrock model id. The exact model is dynamic — it is read from connector
> config (`config.modelId` / `config.defaultModel`) or an agent override at call
> time, and recorded in the response and audit log.

---

## 5. `executeAiTask()` — the unified feature pipeline

Most AI features (alert summarize, case copilot, IOC enrich, detection draft, …)
do **not** call the cascade directly. They route through the generic
`executeAiTask()` entry point, which layers governance on top of the cascade. The
gate order, all backed by `BusinessException` + `messageKey`:

```
executeAiTask(params)
 1. FeatureCatalog.getConfig → feature enabled?         (403 errors.ai.featureDisabled)
 2. FEATURE_TO_AGENT_MAP[featureKey] → agentId          (agent-config.constants.ts)
 3. AgentConfig.getAgentConfig → agent enabled?         (403 agent-specific key)
 4. checkAgentQuota → per-agent token quota OK?         (429 agent-specific key)
 5. UsageBudget.checkBudget → tenant monthly budget OK? (429 errors.ai.budgetExceeded)
 6. build prompt: PromptRegistry.getActivePrompt
       + OSINT enrichment (if agent has sources + an IOC in context)
       + index-pattern scoping
       + assembleFinalPrompt(systemPrompt, suffix, outputFormat, presentationSkills)
 7. resolve connectors (feature.preferredProvider / agent.providerMode / selection)
 8. tryConnectorsInOrder(...)  → rule-based fallback if all fail
 9. recordUsage + incrementUsage + audit log + structured log
```

The feature→agent mapping (`FEATURE_TO_AGENT_MAP`) and the agent defaults
(temperature, `maxTokensPerCall`, trigger mode, output format,
`presentationSkills`) are declared in
[`agent-config.constants.ts`](../../apps/api/src/modules/agent-config/agent-config.constants.ts).
Specialist agent IDs that have no direct handler are resolved to a core
execution agent via `AGENT_ALIAS_MAP` / `resolveExecutionAgent()`.

---

## 6. Orchestrator + jobs (asynchronous agents)

The `/ai/*` controller paths are **synchronous** request/response. Autonomous
agent work is **asynchronous** and goes through the orchestrator:

1. `OrchestratorService.dispatchAgentTask()` resolves the execution agent, runs
   `canAgentExecute()` (enabled → automation-mode → quota → budget), then
   `resolveAutomationMode()` → `requiresApproval()`.
2. It enqueues a `JobType.AI_AGENT_TASK` job (`maxAttempts: 2`, idempotency key).
3. **If approval is required**, it persists an approval record _before_ execution
   (AGENTS.md §7; CLAUDE.md rule 97) — AI never silently executes.
4. The job is later picked up by
   [`ai-agents/ai-agent-task.handler.ts`](../../apps/api/src/modules/ai-agents/ai-agent-task.handler.ts),
   which calls `AiService.runAgentTask()` → the same cascade.

`requiresApproval()` is conservative (approval-required and high-risk modes
always need a human; only low-risk auto modes pass) — the runtime counterpart of
`packages/ai`'s `evaluateApproval()`. Every job type must have a registered
handler; stale RUNNING jobs are auto-recovered (CLAUDE.md rules 90–91). The job
system itself is documented in the `jobs` module.

---

## 7. Endpoints, RBAC, and rate limiting

`AiController` ([`ai.controller.ts`](../../apps/api/src/modules/ai/ai.controller.ts)):

- Mounted at `/ai`, guarded by `AuthGuard` + `TenantGuard`.
- **Controller-level `@Throttle({ default: { limit: 10, ttl: 60000 } })`** — the
  mandated AI tier (CLAUDE.md rules 33 & 80).
- Every endpoint carries `@RequirePermission(Permission.AI_AGENTS_EXECUTE)`
  (CLAUDE.md rule 25); DTOs are Zod-validated via `ZodValidationPipe`.

`aiInvestigate()` loads the alert with `findAlertByIdAndTenant(alertId, tenantId)`
and 404s if it is not the caller's — enforcing tenant ownership before
investigation (CLAUDE.md rule 48). Each sub-module (chat, writeback, memory,
orchestrator, …) has its own controller with its own permissions and throttle
tiers.

---

## 8. Provenance, audit, and tenancy (where this connects out)

- **Provenance** — every `AiResponse` carries `provider`, `model`, `confidence`,
  and `tokensUsed`; the shared contract is `AiProvenance` in
  [`packages/ai/types.ts`](../../packages/ai/src/types.ts).
- **Audit** — `AiService.logAudit()` writes an `ai_audit_logs` row (actor, action,
  model, in/out tokens, latency) and `UsageBudgetService.recordUsage()` records
  cost. Which provider/model served the request is always captured.
- **Tenancy** — connector resolution, alert loading, memory, budgets and audit are
  all `tenantId`-scoped; AI memory must not store secrets. See
  [`TENANCY.md`](TENANCY.md) §AI and [`docs/AI.md`](../AI.md) §"Governance checklist".

---

## 9. Invariants checklist (when touching AI code)

Enforced by [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) (88–100),
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (30–63), and [`rules/ai/`](../../rules/ai/):

- [ ] Cascade tries **all** configured connectors before the rule-based fallback;
      a single failure does not short-circuit (rule 88).
- [ ] No env-gated mock provider mode; helpers call the real SDK (rule 89).
- [ ] Rule-based output is labeled `model: 'rule-based'`.
- [ ] Side-effecting / approval-required actions persist an `ApprovalRequest`
      before execution (rule 97); AI never silently executes.
- [ ] Token quota **and** monthly budget checked before the provider call
      (rules 98 / budget gate).
- [ ] Secrets/PII redacted before model calls and transcript storage
      (`@auraspear/ai` `redact()`).
- [ ] Tenant ownership validated before investigating an alert/resource (rule 48).
- [ ] AI endpoints carry `@RequirePermission` + the 10/min `@Throttle` tier.
- [ ] Output is attributable (provider/model/confidence) and never rendered as raw
      HTML on the web (web rule 43).

To **add** an AI feature end-to-end, follow
[`skills/ai/add-ai-feature.md`](../../skills/ai/add-ai-feature.md) and
[`skills/frontend/add-ai-panel.md`](../../skills/frontend/add-ai-panel.md); for
the hard constraints, read [`rules/ai/`](../../rules/ai/) and the governance
reference [`docs/AI.md`](../AI.md).
