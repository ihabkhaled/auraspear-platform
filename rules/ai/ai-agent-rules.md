# Rules — AI Agent Dispatch & Orchestration

> Read `../../AGENTS.md` first (loading order + the one rule: understand before
> you edit). Then `../../apps/api/CLAUDE.md` (this file distills the backend's
> "AI Agent Configuration Rules" #92–#100 plus #88, #89 and AI safety invariants
> #97–#99). These are **hard constraints**, not guidance. The orchestrator is the
> single chokepoint where an AI agent is allowed to act on tenant data — bypass
> it and you bypass enabled/quota/budget/approval enforcement at once.

AuraSpear runs **28 AI agents** (`AiAgentId`, `apps/api/src/common/enums/ai-agent-config.enum.ts`).
Every agent invocation — whether from an HTTP request, a domain event, or a
schedule — flows through **one path**:

```
caller → OrchestratorService.dispatchAgentTask()  ──validates──▶  JobService.enqueue(AI_AGENT_TASK)
                                                                          │ (async worker)
                                                                          ▼
                                          AiAgentTaskHandler (apps/api/src/modules/ai-agents/ai-agent-task.handler.ts)
                                          → AI provider cascade (bedrock → llm_apis → openclaw_gateway)
```

No caller talks to an AI provider directly. No caller enqueues `AI_AGENT_TASK`
on its own. The orchestrator is the only door.

## 1. All agent work goes through `OrchestratorService.dispatchAgentTask()`

`apps/api/src/modules/ai/orchestrator/orchestrator.service.ts`. Before anything
is enqueued, `dispatchAgentTask()` runs the full gate chain — do **not**
re-implement, short-circuit, or skip any of it:

1. **Resolve the execution agent** — `resolveExecutionAgent(input.agentId)`
   (`agent-config.constants.ts:349`) maps a specialist alias (e.g.
   `alert-triage`) to its core execution agent (e.g. `l1_analyst`) via
   `AGENT_ALIAS_MAP`. Always pass the agent through this; never assume the id you
   were given is the executor.
2. **Load tenant config** — `agentConfigService.getAgentConfig(tenantId, agentId)`.
   Config is **per tenant** — the same agent can be enabled in one tenant and off
   in another.
3. **`canAgentExecute()`** checks, in order, and returns `403` +
   `messageKey` on the first failure:
   - **Enabled** — `config.isEnabled` (`errors.orchestrator.agentDisabled`).
   - **Mode not disabled** — automation mode ∉ `DISABLED_MODES`
     (`errors.orchestrator.automationDisabled`).
   - **Per-agent token quota** — `checkAgentQuota(config)` (`ai.utilities.ts`),
     CLAUDE.md #98 (`errors.orchestrator.quotaExceeded`).
   - **Tenant monthly budget** — `usageBudgetService.checkBudget(tenantId,
AiFeatureKey.AGENT_TASK)` (`errors.orchestrator.budgetExceeded`).
4. **Resolve automation mode & approval** — `resolveAutomationMode()` maps the
   tenant's `triggerMode` to an `AgentAutomationMode` and computes
   `requiresApproval` (§4).
5. **Enqueue** `AI_AGENT_TASK` (§3).
6. **Persist approval record** if required (§4), **before** the work can run.
7. **Log** the dispatch via `AppLoggerService` — success (`AppLogOutcome.SUCCESS`)
   or blocked (`AppLogOutcome.DENIED`). Every dispatch and every block is audited
   (CLAUDE.md #99).

HTTP callers use `dispatchFromHttp(agentId, dto, user)` (controller-facing);
event/schedule callers build a `DispatchAgentTaskInput` directly. Both end in
`dispatchAgentTask()`. There is no other supported entry point.

## 2. Agent ids come from the `AiAgentId` enum — never string literals

(CLAUDE.md #92; web CLAUDE.md #50.) Import `AiAgentId` from
`@/common/enums` (backend) / `@/enums` (web). Write `AiAgentId.ALERT_TRIAGE`,
never `'alert-triage'`. **The enum values are not uniform** — some use
underscores (`l1_analyst`, `threat_hunter`) and some use hyphens
(`alert-triage`, `incident-escalation`), so a hand-typed string _will_ drift
from the real value and silently mis-route.

- **Only the 28 defined agents are valid.** Any agent-config mutation must
  validate against `AiAgentId` (CLAUDE.md #92). Adding an agent means adding it
  to the enum **and** to `AI_AGENT_DEFAULTS` (`agent-config.constants.ts`) —
  `AI_AGENT_DEFAULTS` is typed `Record<AiAgentId, AgentDefaultConfig>`, so a
  missing entry fails `tsc` (the blocking gate). Wire its alias in
  `AGENT_ALIAS_MAP` if it delegates to a core agent.
- `provider_mode` is `AiProviderMode` (`direct_api | bedrock | openclaw |
inherit`) — enum only, never strings (CLAUDE.md #93). `triggerMode` is
  `AiTriggerMode`, `actionType` is `AgentActionType` — same rule.

## 3. Schedulers and listeners NEVER call AI directly — they enqueue

The agent task is **always asynchronous**. `dispatchAgentTask()` only validates
and enqueues; the provider call happens later in the worker
(`AiAgentTaskHandler`, registered in `jobs.module.ts:99` against
`JobType.AI_AGENT_TASK`).

- **The only `@Cron` in the agent system is the scheduler heartbeat.**
  `AgentSchedulerService.processDueSchedules()`
  (`apps/api/src/modules/ai/orchestrator/agent-scheduler.service.ts`) runs one
  `*/30 * * * * *` tick, reads due rows from `ai_agent_schedules` via
  `ScheduleService`, and calls `orchestratorService.dispatchAgentTask(...)` for
  each. It does **not** call any AI provider, model SDK, or `AiService` method.
  Do not add a second `@Cron` that touches AI, and do not call a provider from
  inside a cron tick — schedule it through the orchestrator.
- **Enqueue, don't `await` AI.** The enqueue uses an `idempotencyKey`
  (`orchestrator:${agentId}:${actionType}:${randomUUID()}`) and `maxAttempts: 2`
  (`orchestrator.service.ts:295`). Respect those — retries and dedupe live in the
  job layer, not the caller.

## 4. Event listeners are fire-and-forget — never throw, never block

`AgentEventListenerService`
(`apps/api/src/modules/ai/orchestrator/agent-event-listener.service.ts`) is the
bridge from domain events to agents. Every method (`onAlertCreated`,
`onIncidentStatusChanged`, `onJobFailed`, `onConnectorSyncCompleted`) **wraps its
body in `try/catch` and swallows the error** through `this.log.error(...)`. An AI
trigger must never break the business flow that fired it (ingesting an alert,
escalating an incident, finishing a sync).

Two halves of the contract — keep both:

- **Inside the listener** — load config, check `config.isEnabled` and
  `config.triggerMode` (and any `triggerConfig` filter, e.g. `minSeverities`,
  `onStatuses`) **before** dispatching, then `await
orchestratorService.dispatchAgentTask(...)`. Catch everything; return on a
  miss. New listener methods follow this exact shape.
- **At the call site** — invoke with `void` and never `await` it, and treat the
  listener as optional (it is injected via `forwardRef` and may be `null`):

  ```ts
  // alerts.service.ts:335-340 — fire-and-forget AI triage on ingest
  if (!this.agentEventListener) return
  for (const alert of alerts) {
    void this.agentEventListener.onAlertCreated(tenantId, alert.id)
  }
  ```

  Same pattern at `incidents.service.ts:505`, `job-processor.service.ts:252`,
  `connector-sync.handler.ts:49`. **Never `await` a listener in a business
  path**, never let it propagate, never gate the user's response on it.

## 5. Destructive agent actions are approval-required (never auto-executed)

(AGENTS.md §7; CLAUDE.md #97.) AI may **analyze and suggest**; it must not
silently execute destructive security/infra actions.

- `requiresApproval()` (`orchestrator.service.ts:179`) returns `true` when the
  automation mode is in `APPROVAL_REQUIRED_MODES` (`approval_required`,
  `auto_governed` — `orchestrator.constants.ts`), or when mode is `auto_low_risk`
  and the risk is `medium`/`high`/`critical` (`HIGH_RISK_LEVELS`).
- When approval is required, `dispatchAgentTask()` calls `createApprovalRecord()`
  → `agentConfigService.createApproval(...)`, persisting an **`ApprovalRequest`
  before execution** (CLAUDE.md #97). No persisted approval ⇒ no execution. Do
  not add a code path that runs a destructive action without that record.
- Approvals carry a 24h expiry and `ApprovalStatus` (`pending` → `approved` /
  `rejected` / `expired`). The handler must honor approval state before acting.

## 6. Provider, secrets, tenancy, output — the surrounding invariants

- **Provider cascade, no single hardcoded provider** (CLAUDE.md #88, #89). The
  handler tries **all** configured AI connectors in order
  (`bedrock → llm_apis → openclaw_gateway`) and only falls back to rule-based when
  none are configured or all fail. Never short-circuit to one provider, and never
  add a `BEDROCK_MOCK`/env-gated mock path.
- **Tenant isolation** (AGENTS.md §6; CLAUDE.md #8, #26). `tenantId` is part of
  every `DispatchAgentTaskInput`, every job payload, every approval, and every
  log line; agent config and quota are per-tenant. The scheduler maps a null
  tenant to `'system'` explicitly — never default or drop `tenantId` elsewhere.
- **RBAC on the HTTP surface** (CLAUDE.md #25). The dispatch endpoint
  (`orchestrator.controller.ts`) is guarded by
  `@RequirePermission(Permission.AI_AGENTS_EXECUTE)` + `@Throttle({ limit: 10,
ttl: 60000 })` (AI rate-limit tier, CLAUDE.md #33). History/stats use
  `AI_AGENTS_VIEW` / `AI_CONFIG_VIEW`. New agent endpoints keep an explicit
  permission and the AI throttle tier.
- **No committed/fallback secrets; OSINT keys encrypted** (CLAUDE.md #24, #96).
  Custom OSINT source API keys are AES-256-GCM encrypted at rest
  (`EncryptionUtility.encrypt`); their URLs pass `SsrfUtility.validateUrl()`
  before storage (CLAUDE.md #95). AI memory/agent state must not store secrets.
- **Never render raw AI output as HTML** (AGENTS.md §7; web CLAUDE.md #43). Agent
  output is markdown/plain text or a typed `presentationSkill` block — no
  `dangerouslySetInnerHTML`.

## Checklist before you ship an agent change

- [ ] Every dispatch goes through `OrchestratorService.dispatchAgentTask()` —
      no caller enqueues `AI_AGENT_TASK` or calls a provider directly.
- [ ] Agent ids, provider modes, trigger modes, action types are `AiAgentId` /
      `AiProviderMode` / `AiTriggerMode` / `AgentActionType` enum members, never
      strings. New agent added to the enum **and** `AI_AGENT_DEFAULTS`.
- [ ] No new `@Cron` touching AI; scheduled work runs via
      `AgentSchedulerService` → orchestrator only.
- [ ] New event triggers live in `AgentEventListenerService`, are `try/catch`
      no-throw, and are called `void`-ed (never `await`-ed) from the business
      path; the listener dependency is treated as optional.
- [ ] Destructive/governed actions resolve `requiresApproval` and persist an
      `ApprovalRequest` before any execution.
- [ ] `canAgentExecute` chain intact (enabled → mode → per-agent quota → tenant
      budget); every dispatch and block is logged with `tenantId`, `agentId`,
      `actionType`.
- [ ] Provider cascade preserved (no single hardcoded provider, no mock mode);
      `tenantId` present on input, payload, approval, and logs.
- [ ] `pnpm typecheck` passes (blocking gate; `tsgo`/`typecheck:fast` advisory).
      No `any`, no `eslint-disable`. pnpm only, Node 22. Branch first — never
      work on `main`. Prove before deleting an agent/enum value/handler.

## Related

- `../../apps/api/CLAUDE.md` — "AI Agent Configuration Rules" #92–#100, provider
  cascade #88–#89, AI rate limiting #33, the full backend rule list.
- `../../apps/web/CLAUDE.md` — agent/provider/trigger enums #50–#52, AI output
  safety #43, AI action categories #44.
- `../backend/tenant-permission-rules.md` — tenant scoping + `@RequirePermission`
  that every agent endpoint inherits.
- `../security/secret-handling.md` — AES-256-GCM connector/OSINT secrets, no
  fallback secrets.
- `../frontend/ai-ui-rules.md` — how agent output is rendered on the web side.
- `../../docs/ai/` + `docs/AI.md` + `memory/AI_MEMORY.md` — AI subsystem
  architecture and stable truths.
