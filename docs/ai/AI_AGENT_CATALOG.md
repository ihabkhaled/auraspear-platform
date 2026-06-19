# AI Agent Catalog — AuraSpear

> Start at [`AGENTS.md`](../../AGENTS.md) (the universal AI + human entry point);
> it sets the loading order (memory → context → rules → skills → docs → code).
> This catalog is a focused reference for the **configurable AI agents** in the
> backend: who they are, how they trigger, and when a human must approve.

The source of truth is the code. This doc maps it; behavior lives in:

- Enums — [`apps/api/src/common/enums/ai-agent-config.enum.ts`](../../apps/api/src/common/enums/ai-agent-config.enum.ts)
  (`AiAgentId`, `AiTriggerMode`, `AiOutputFormat`, `ApprovalStatus`, …)
- Per-agent defaults + alias/feature maps —
  [`apps/api/src/modules/agent-config/agent-config.constants.ts`](../../apps/api/src/modules/agent-config/agent-config.constants.ts)
- Tenant config CRUD/toggle/approvals —
  [`agent-config.service.ts`](../../apps/api/src/modules/agent-config/agent-config.service.ts)
  · [`agent-config.controller.ts`](../../apps/api/src/modules/agent-config/agent-config.controller.ts)
- Dispatch + gating + approval pipeline —
  [`apps/api/src/modules/ai/orchestrator/orchestrator.service.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.service.ts)
  · [`orchestrator.controller.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.controller.ts)
  · [`orchestrator.constants.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.constants.ts)
- Event-driven triggers —
  [`agent-event-listener.service.ts`](../../apps/api/src/modules/ai/orchestrator/agent-event-listener.service.ts)
- Job execution —
  [`apps/api/src/modules/ai-agents/ai-agent-task.handler.ts`](../../apps/api/src/modules/ai-agents/ai-agent-task.handler.ts)

**Sibling docs (don't duplicate — read them):**
[`docs/AI.md`](../AI.md) is the AI-subsystem overview (providers, cascade, output
contracts, safety, redaction, eval). Hard rules:
[`rules/ai/ai-agent-rules.md`](../../rules/ai/ai-agent-rules.md),
[`rules/ai/ai-approval-rules.md`](../../rules/ai/ai-approval-rules.md),
[`rules/ai/ai-governance.md`](../../rules/ai/ai-governance.md). Recipe for adding
one: [`skills/ai/add-ai-agent.md`](../../skills/ai/add-ai-agent.md). Backend AI
rules: [`apps/api/CLAUDE.md`](../../apps/api/CLAUDE.md) §"AI Agent Configuration
Rules" (rules 92–100). Frontend mirror enums + UI rules:
[`apps/web/CLAUDE.md`](../../apps/web/CLAUDE.md) (rules 50–59).

---

## 1. What "an agent" means here

An agent is **not** a running service. It is a per-tenant **configuration row**
keyed by an `AiAgentId` that controls _whether_, _how_, and _with what limits_ an
AI task is dispatched. Each agent has:

- A built-in default profile in `AI_AGENT_DEFAULTS` (display name, description,
  `temperature`, `maxTokensPerCall`, default `triggerMode`, `outputFormat`,
  `presentationSkills`).
- A tenant override stored as `TenantAgentConfig` (enabled flag, provider/model,
  prompt, trigger config, token quotas, OSINT sources). When no row exists,
  `buildAgentConfigWithDefaults()` returns the defaults with `isEnabled: false`
  and `hasCustomConfig: false` — **agents are off until a tenant enables them.**

> Per `apps/api/CLAUDE.md` rule 92, every agent-config mutation is validated
> against the `AiAgentId` enum — only the IDs below are valid.

### Two execution agents per dispatch

`AiAgentId` has **27** values: **7 core agents** (which have an execution
profile) and **20 specialist agents** (which are UI/scheduling facades). Every
specialist maps to a core agent through `AGENT_ALIAS_MAP`; `dispatchAgentTask()`
calls `resolveExecutionAgent(agentId)` so the specialist's _config_ (enabled,
trigger mode, quota) gates the dispatch while a **core** agent actually runs the
LLM task. Toggling a specialist lets a tenant control a feature subset without a
separate handler.

---

## 2. Core agents (have an execution profile)

These 7 are the real execution agents. Defaults are from `AI_AGENT_DEFAULTS`.

| `AiAgentId`                               | Display name           | Does                                                           | Default trigger | Temp / max tokens | Output            |
| ----------------------------------------- | ---------------------- | -------------------------------------------------------------- | --------------- | ----------------- | ----------------- |
| `ORCHESTRATOR` (`orchestrator`)           | Orchestrator           | Coordinates multi-agent workflows; routes tasks to specialists | `manual_only`   | 0.3 / 4096        | `structured_json` |
| `L1_ANALYST` (`l1_analyst`)               | L1 SOC Analyst         | Initial alert triage, enrichment, classification               | `auto_on_alert` | 0.5 / 2048        | `rich_cards`      |
| `L2_ANALYST` (`l2_analyst`)               | L2 SOC Analyst         | Deep investigation, correlation, incident assessment           | `manual_only`   | 0.5 / 4096        | `rich_cards`      |
| `THREAT_HUNTER` (`threat_hunter`)         | Threat Hunter          | Hunt hypotheses + query creation                               | `manual_only`   | 0.7 / 4096        | `markdown`        |
| `RULES_ANALYST` (`rules_analyst`)         | Rules Analyst          | Detection-rule creation/tuning, Sigma/YARA                     | `manual_only`   | 0.4 / 4096        | `structured_json` |
| `NORM_VERIFIER` (`norm_verifier`)         | Normalization Verifier | Pipeline verification + field-mapping validation               | `manual_only`   | 0.3 / 2048        | `structured_json` |
| `DASHBOARD_BUILDER` (`dashboard_builder`) | Dashboard Builder      | KPI/visualization suggestions, layout optimization             | `manual_only`   | 0.6 / 2048        | `rich_cards`      |

`FEATURE_TO_AGENT_MAP` binds each `AiFeatureKey` (alert/case/hunt/intel/detection
features) to one of these core agents so `AiService` loads the right per-agent
config (temperature, max tokens, system prompt, quota) at execution time.

---

## 3. Specialist agents (facades → core agent)

Each specialist appears in agent cards / schedule configs and has its own enable
flag, trigger mode, and quota, but delegates execution to the mapped core agent
via `AGENT_ALIAS_MAP` / `resolveExecutionAgent`.

| `AiAgentId`                                         | Display name                       | Does                               | Default trigger | Executes as         |
| --------------------------------------------------- | ---------------------------------- | ---------------------------------- | --------------- | ------------------- |
| `ALERT_TRIAGE` (`alert-triage`)                     | Alert Triage Agent                 | Auto-triage and score alerts       | `auto_on_alert` | `L1_ANALYST`        |
| `CASE_CREATION` (`case-creation`)                   | Case Creation Agent                | Draft cases from grouped alerts    | `manual_only`   | `L2_ANALYST`        |
| `INCIDENT_ESCALATION` (`incident-escalation`)       | Incident Escalation Agent          | Escalate critical incidents        | `manual_only`   | `L2_ANALYST`        |
| `CORRELATION_SYNTHESIS` (`correlation-synthesis`)   | Correlation Synthesis Agent        | Cross-source correlation discovery | `manual_only`   | `L2_ANALYST`        |
| `SIGMA_DRAFTING` (`sigma-drafting`)                 | Sigma Drafting Agent               | Draft Sigma detection rules        | `manual_only`   | `RULES_ANALYST`     |
| `VULN_PRIORITIZATION` (`vuln-prioritization`)       | Vulnerability Prioritization Agent | Prioritize vulns by risk           | `manual_only`   | `L2_ANALYST`        |
| `UEBA_NARRATIVE` (`ueba-narrative`)                 | UEBA Narrative Agent               | Explain behavioral anomalies       | `manual_only`   | `L2_ANALYST`        |
| `ATTACK_PATH_SUMMARY` (`attack-path-summary`)       | Attack Path Summarization Agent    | Summarize attack chains            | `manual_only`   | `THREAT_HUNTER`     |
| `NORM_VERIFICATION` (`norm-verification`)           | Normalization Verification Agent   | Verify parser quality              | `manual_only`   | `NORM_VERIFIER`     |
| `RULES_HYGIENE` (`rules-hygiene`)                   | Rules Hygiene Agent                | Detect stale/conflicting rules     | `manual_only`   | `RULES_ANALYST`     |
| `REPORTING` (`reporting`)                           | Reporting Agent                    | Generate SOC reports               | `manual_only`   | `DASHBOARD_BUILDER` |
| `ENTITY_LINKING` (`entity-linking`)                 | Entity Graph Linking Agent         | Discover entity relationships      | `manual_only`   | `L2_ANALYST`        |
| `JOB_HEALTH` (`job-health`)                         | Job Health Agent                   | Monitor job-queue health           | `scheduled`     | `ORCHESTRATOR`      |
| `CLOUD_TRIAGE` (`cloud-triage`)                     | Cloud Triage Agent                 | Triage cloud security findings     | `manual_only`   | `L1_ANALYST`        |
| `SOAR_DRAFTING` (`soar-drafting`)                   | SOAR Drafting Agent                | Draft SOAR playbooks               | `manual_only`   | `ORCHESTRATOR`      |
| `THREAT_INTEL_SYNTHESIS` (`threat-intel-synthesis`) | Threat Intel Synthesis Agent       | Synthesize threat intel            | `manual_only`   | `L2_ANALYST`        |
| `IOC_ENRICHMENT` (`ioc-enrichment`)                 | IOC Enrichment Agent               | Enrich IOCs from OSINT sources     | `manual_only`   | `L2_ANALYST`        |
| `MISP_FEED_REVIEW` (`misp-feed-review`)             | MISP Feed Review Agent             | Review MISP event feeds            | `manual_only`   | `L2_ANALYST`        |
| `KNOWLEDGE_BASE` (`knowledge-base`)                 | Knowledge Base Agent               | Extract reusable knowledge         | `manual_only`   | `L1_ANALYST`        |
| `NOTIFICATION_DIGEST` (`notification-digest`)       | Notification Digest Agent          | Generate notification digests      | `scheduled`     | `ORCHESTRATOR`      |
| `PROVIDER_HEALTH` (`provider-health`)               | Provider Health Agent              | Monitor AI provider health         | `scheduled`     | `ORCHESTRATOR`      |
| `APPROVAL_ADVISOR` (`approval-advisor`)             | Approval Advisor Agent             | Advise on pending approvals        | `manual_only`   | `ORCHESTRATOR`      |

> The frontend mirrors these IDs in its own `AiAgentId` enum and must reference
> them by enum, never as string literals (see `apps/web/CLAUDE.md` rule 50).

---

## 4. Trigger modes

The per-agent `triggerMode` is an `AiTriggerMode`
(`ai-agent-config.enum.ts`). At dispatch, `OrchestratorService.mapTrigger­ModeToAutomationMode()`
translates it to an `AgentAutomationMode`
([`agent-automation-mode.enum.ts`](../../apps/api/src/common/enums/agent-automation-mode.enum.ts))
that drives gating and approval:

| `AiTriggerMode` | Meaning                  | → `AgentAutomationMode` | How it fires                                                              |
| --------------- | ------------------------ | ----------------------- | ------------------------------------------------------------------------- |
| `manual_only`   | Analyst-initiated only   | `MANUAL_ONLY`           | `POST /agent-config/agents/:agentId/dispatch` (orchestrator controller)   |
| `auto_on_alert` | Fire on domain events    | `EVENT_DRIVEN`          | `AgentEventListenerService` (alert created, incident status change, etc.) |
| `auto_by_agent` | Invoked by another agent | `ORCHESTRATOR_INVOKED`  | Orchestrator-internal dispatch as part of a workflow                      |
| `scheduled`     | Run on a schedule        | `SCHEDULED`             | Scheduled job (e.g. job-health, provider-health, notification-digest)     |

Trigger filters live in the agent's `triggerConfig` JSON (validated ≤ 64 KB by
[`update-agent-config.dto.ts`](../../apps/api/src/modules/agent-config/dto/update-agent-config.dto.ts);
mode-specific Zod schemas per `apps/api/CLAUDE.md` rule 94). Examples the event
listener honors:

- `onAlertCreated` dispatches `ALERT_TRIAGE` only when it is enabled **and**
  `triggerMode === auto_on_alert`; it then applies the `minSeverities` filter
  from `triggerConfig` (alerts below the threshold are skipped). A `manual_only`
  agent is never auto-dispatched.
- `onIncidentStatusChanged` dispatches `INCIDENT_ESCALATION` when enabled and not
  `manual_only`, gated by a `triggerConfig.onStatuses` allow-list.
- `onJobFailed` dispatches `JOB_HEALTH`; `onConnectorSyncCompleted` dispatches
  `ORCHESTRATOR`. The listener is **fire-and-forget** — it never throws or blocks
  the caller.

---

## 5. Dispatch pipeline & gating

`OrchestratorService.dispatchAgentTask()` is the single chokepoint. Order:

1. **Resolve alias** — `resolveExecutionAgent(input.agentId)` maps a specialist
   to its core execution agent.
2. **Load config** — `agentConfigService.getAgentConfig(tenantId, agentId)`
   (defaults merged with the tenant row).
3. **`canAgentExecute`** — must pass all three, else a `403 BusinessException`:
   - **Enabled** — `config.isEnabled` must be true, and the resolved automation
     mode must not be in `DISABLED_MODES`.
   - **Per-agent token quota** — `checkAgentQuota` rejects when
     `tokensUsedHour/Day/Month` has reached `tokensPerHour/Day/Month`
     (`apps/api/CLAUDE.md` rule 98; defaults 50K/h, 500K/day, 5M/month).
   - **Tenant budget** — `UsageBudgetService.checkBudget(tenantId, AGENT_TASK)`
     rejects when the monthly AI token budget is exhausted.
4. **Resolve automation mode** — `resolveAutomationMode` + `requiresApproval`
   decide whether a human must approve (see §6).
5. **Enqueue** — an `AI_AGENT_TASK` job is queued (`JobType.AI_AGENT_TASK`,
   `maxAttempts: 2`, unique `idempotencyKey`). The actual LLM call runs later in
   `AiAgentTaskHandler` (provider cascade + writeback), not synchronously.
6. **Approval record** — if approval is required, a persisted `ApprovalRequest`
   is created **before** the result can be acted on (24-hour expiry).

Every dispatch is logged (success or `DENIED`) with `agentId`, `actionType`,
`triggeredBy`, automation mode, and `requiresApproval` — satisfying the
"every trigger evaluation must be logged" rule (`apps/api/CLAUDE.md` rule 99).

`AgentActionType`
([`agent-action-type.enum.ts`](../../apps/api/src/common/enums/agent-action-type.enum.ts))
carries the requested action (`triage`, `escalate`, `investigate`, `enrich`,
`draft`, `correlate`, `report`, …).

---

## 6. Approval policy

AI may analyze and suggest, but **must not silently execute destructive
actions** ([`AGENTS.md`](../../AGENTS.md) §7; [`docs/AI.md`](../AI.md) safety
table). The orchestrator decides via `requiresApproval()`
([`orchestrator.constants.ts`](../../apps/api/src/modules/ai/orchestrator/orchestrator.constants.ts)):

| Resolved `AgentAutomationMode`                                                   | Approval required?        |
| -------------------------------------------------------------------------------- | ------------------------- |
| `APPROVAL_REQUIRED`, `AUTO_GOVERNED` (in `APPROVAL_REQUIRED_MODES`)              | **Yes — always**          |
| `AUTO_LOW_RISK` **and** risk ∈ {`MEDIUM`,`HIGH`,`CRITICAL`} (`HIGH_RISK_LEVELS`) | **Yes**                   |
| `DISABLED` (in `DISABLED_MODES`)                                                 | n/a — dispatch is blocked |
| All other modes (manual / event-driven / scheduled, low risk)                    | No                        |

When approval is required, `createApprovalRecord()` persists an `ApprovalRequest`
(agent, action type, `actionData` = jobId/payload/triggeredBy, `riskLevel`,
`requestedBy`, `expiresAt = now + 24h`) — never executes without a persisted
approval (`apps/api/CLAUDE.md` rule 97). Risk levels are
`AgentRiskLevel` (`none`/`low`/`medium`/`high`/`critical`); statuses are
`ApprovalStatus` (`pending`/`approved`/`rejected`/`expired`).

**Resolving approvals** — `AgentConfigService.resolveApproval()` validates the
request exists, is still `pending`, and has not expired before recording
`approved`/`rejected` with reviewer + comment.

---

## 7. API surface & permissions

Both controllers mount on `/agent-config` and are rate-limited (`@Throttle`).
Every endpoint carries `@RequirePermission(...)` (keys from
[`permission.enum.ts`](../../apps/api/src/common/enums/permission.enum.ts)).

| Endpoint                                                 | Purpose                                          | Permission               |
| -------------------------------------------------------- | ------------------------------------------------ | ------------------------ |
| `GET /agent-config/agents`                               | List all agent configs (defaults-merged)         | `AI_CONFIG_VIEW`         |
| `GET /agent-config/agents/:agentId`                      | Get one agent config                             | `AI_CONFIG_VIEW`         |
| `PATCH /agent-config/agents/:agentId`                    | Update config (provider, prompt, trigger, quota) | `AI_CONFIG_EDIT`         |
| `POST /agent-config/agents/:agentId/toggle`              | Enable/disable one agent                         | `AI_CONFIG_EDIT`         |
| `POST /agent-config/agents/bulk-toggle`                  | Enable/disable all agents                        | `AI_CONFIG_EDIT`         |
| `POST /agent-config/agents/:agentId/reset-usage/:period` | Reset token counters (hour/day/month)            | `AI_CONFIG_EDIT`         |
| `GET/POST/PATCH/DELETE /agent-config/osint-sources…`     | Manage OSINT enrichment sources                  | `AI_CONFIG_MANAGE_OSINT` |
| `GET /agent-config/approvals`                            | List approval requests                           | `AI_APPROVALS_MANAGE`    |
| `POST /agent-config/approvals/:id/resolve`               | Approve/reject a request                         | `AI_APPROVALS_MANAGE`    |
| `POST /agent-config/agents/:agentId/dispatch`            | Dispatch an agent task                           | `AI_AGENTS_EXECUTE`      |
| `GET /agent-config/agents/:agentId/history`              | Agent execution history                          | `AI_AGENTS_VIEW`         |
| `GET /agent-config/orchestrator/stats`                   | 24h dispatch stats + agent counts                | `AI_CONFIG_VIEW`         |

OSINT source URLs are SSRF-validated and API keys are encrypted at rest
(`apps/api/CLAUDE.md` rules 95–96).

---

## 8. Related but distinct: the `ai-agents` module

Do not confuse the catalog above (config-driven `AiAgentId` agents in
`agent-config` + `orchestrator`) with the
[`apps/api/src/modules/ai-agents/`](../../apps/api/src/modules/ai-agents/) module,
which manages **user-authored `AiAgent` records** (custom name, `soulMd`
persona, tool list). Both converge on the same job type: `AiAgentTaskHandler`
handles _system-triggered_ tasks (slug IDs from `TenantAgentConfig`, dispatched
by the orchestrator) and _user-triggered_ tasks (UUID IDs from the `AiAgent`
table) and runs them through the provider cascade described in
[`docs/AI.md`](../AI.md).

---

## 9. Adding or changing an agent

Follow [`skills/ai/add-ai-agent.md`](../../skills/ai/add-ai-agent.md) and the
backend AI-config rules. In short: add the `AiAgentId` value, give it a profile
in `AI_AGENT_DEFAULTS` (and, if it is a facade, an `AGENT_ALIAS_MAP` entry),
wire a `FEATURE_TO_AGENT_MAP` binding if it backs an `AiFeatureKey`, mirror the
enum on the frontend, and add any new trigger-config Zod schema. Validate against
the `AiAgentId` enum everywhere (rule 92) and never hardcode IDs/modes as strings
(frontend rules 50–52).
