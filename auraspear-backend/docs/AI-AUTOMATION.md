# AuraSpear AI Autonomous Agent System

## Overview

The AI automation system enables 28 specialized agents to operate across the AuraSpear SOC platform. Each agent handles a distinct security operations domain -- from alert triage and case investigation to detection rule drafting and OSINT enrichment. Agents are configured per-tenant, support multiple AI providers, enforce token quotas, and produce fully audited execution trails.

## Architecture

```
                          +--------------------------+
                          |    Frontend (Next.js)    |
                          +------------+-------------+
                                       |
                                       v
                          +------------+-------------+
                          |  Agent Config Controller  |
                          |  AI Controller            |
                          |  AI Agents Controller     |
                          +------------+-------------+
                                       |
            +--------------------------+-----------------------------+
            |                          |                             |
            v                          v                             v
  +---------+---------+    +-----------+----------+    +-------------+-----------+
  | AgentConfigService |    |     AiService         |    |    AiAgentsService      |
  | (per-tenant config)|    | (routing + execution) |    | (CRUD + session mgmt)  |
  +---------+---------+    +-----------+----------+    +-------------+-----------+
            |                          |                             |
            v                          v                             v
  +---------+---------+    +-----------+----------+    +-------------+-----------+
  | TenantAgentConfig  |    | findAvailableAi       |    |     JobService          |
  | (Prisma model)     |    | Connectors()          |    |   enqueue(AI_AGENT_TASK)|
  +--------------------+    +-----------+----------+    +-------------+-----------+
                                       |                             |
                        +--------------+-------------+               v
                        |              |             |    +----------+-----------+
                        v              v             v    | AiAgentTaskHandler   |
                   +--------+    +---------+   +------+  | (job handler)        |
                   |Bedrock |    |LLM APIs |   |Open  |  +----------+-----------+
                   |Service |    |Service  |   |Claw  |              |
                   +--------+    +---------+   |Gate  |              v
                                               |way   |    AiService.runAgentTask()
                                               +------+
```

### Core Components

| Component                  | File Path                                                     | Responsibility                                                       |
| -------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| **AiService**              | `src/modules/ai/ai.service.ts`                                | Central AI execution engine, provider routing, audit logging         |
| **AiAgentsService**        | `src/modules/ai-agents/ai-agents.service.ts`                  | Agent CRUD, session management, tool management, job dispatch        |
| **AgentConfigService**     | `src/modules/agent-config/agent-config.service.ts`            | Per-tenant agent configuration, quotas, OSINT sources, approvals     |
| **AiAgentTaskHandler**     | `src/modules/ai-agents/ai-agent-task.handler.ts`              | Job handler that bridges the job queue to `AiService.runAgentTask()` |
| **FeatureCatalogService**  | `src/modules/ai/feature-catalog/feature-catalog.service.ts`   | Feature-level enable/disable, approval levels, budget configuration  |
| **PromptRegistryService**  | `src/modules/ai/prompt-registry/prompt-registry.service.ts`   | Per-feature, per-tenant prompt template management                   |
| **UsageBudgetService**     | `src/modules/ai/usage-budget/usage-budget.service.ts`         | Monthly token budget tracking and enforcement                        |
| **OsintExecutorService**   | `src/modules/osint-executor/osint-executor.service.ts`        | OSINT source execution for IOC enrichment                            |
| **JobService**             | `src/modules/jobs/jobs.service.ts`                            | General-purpose job queue with idempotency and retry                 |
| **BedrockService**         | `src/modules/connectors/services/bedrock.service.ts`          | AWS Bedrock Claude model invocation                                  |
| **LlmApisService**         | `src/modules/connectors/services/llm-apis.service.ts`         | OpenAI-compatible API invocation                                     |
| **OpenClawGatewayService** | `src/modules/connectors/services/openclaw-gateway.service.ts` | OpenClaw Gateway invocation                                          |

---

## Agent Catalog (28 Agents)

Each agent is identified by its `AiAgentId` enum value defined in `src/common/enums/ai-agent-config.enum.ts`.

| #   | Agent ID                 | Display Name                       | Description                                                       | Default Trigger | Default Output Format |
| --- | ------------------------ | ---------------------------------- | ----------------------------------------------------------------- | --------------- | --------------------- |
| 1   | `orchestrator`           | Orchestrator                       | Coordinates multi-agent workflows and routes tasks to specialists | `manual_only`   | `structured_json`     |
| 2   | `l1_analyst`             | L1 SOC Analyst                     | Initial alert triage, enrichment, and classification              | `auto_on_alert` | `rich_cards`          |
| 3   | `l2_analyst`             | L2 SOC Analyst                     | Deep investigation, correlation analysis, incident assessment     | `manual_only`   | `rich_cards`          |
| 4   | `threat_hunter`          | Threat Hunter                      | Proactive hunting, hypothesis generation, hunt query creation     | `manual_only`   | `markdown`            |
| 5   | `rules_analyst`          | Rules Analyst                      | Detection rule creation, tuning, Sigma/YARA analysis              | `manual_only`   | `structured_json`     |
| 6   | `norm_verifier`          | Normalization Verifier             | Log normalization pipeline verification and field mapping         | `manual_only`   | `structured_json`     |
| 7   | `dashboard_builder`      | Dashboard Builder                  | KPI suggestions, visualization recommendations                    | `manual_only`   | `rich_cards`          |
| 8   | `alert-triage`           | Alert Triage Agent                 | Auto-triage and score alerts                                      | `auto_on_alert` | `rich_cards`          |
| 9   | `case-creation`          | Case Creation Agent                | Create case drafts from grouped alerts                            | `manual_only`   | `structured_json`     |
| 10  | `incident-escalation`    | Incident Escalation Agent          | Escalate critical incidents                                       | `manual_only`   | `rich_cards`          |
| 11  | `correlation-synthesis`  | Correlation Synthesis Agent        | Discover cross-source correlations                                | `manual_only`   | `rich_cards`          |
| 12  | `sigma-drafting`         | Sigma Drafting Agent               | Draft Sigma detection rules                                       | `manual_only`   | `structured_json`     |
| 13  | `vuln-prioritization`    | Vulnerability Prioritization Agent | Prioritize vulnerabilities by risk                                | `manual_only`   | `rich_cards`          |
| 14  | `ueba-narrative`         | UEBA Narrative Agent               | Explain behavioral anomalies                                      | `manual_only`   | `markdown`            |
| 15  | `attack-path-summary`    | Attack Path Summarization Agent    | Summarize attack chains                                           | `manual_only`   | `rich_cards`          |
| 16  | `norm-verification`      | Normalization Verification Agent   | Verify parser quality                                             | `manual_only`   | `structured_json`     |
| 17  | `rules-hygiene`          | Rules Hygiene Agent                | Detect stale/conflicting rules                                    | `manual_only`   | `rich_cards`          |
| 18  | `reporting`              | Reporting Agent                    | Generate SOC reports                                              | `manual_only`   | `markdown`            |
| 19  | `entity-linking`         | Entity Graph Linking Agent         | Discover entity relationships                                     | `manual_only`   | `rich_cards`          |
| 20  | `job-health`             | Job Health Agent                   | Monitor job queue health                                          | `scheduled`     | `rich_cards`          |
| 21  | `cloud-triage`           | Cloud Triage Agent                 | Triage cloud security findings                                    | `manual_only`   | `rich_cards`          |
| 22  | `soar-drafting`          | SOAR Drafting Agent                | Draft SOAR playbooks                                              | `manual_only`   | `structured_json`     |
| 23  | `threat-intel-synthesis` | Threat Intel Synthesis Agent       | Synthesize threat intelligence                                    | `manual_only`   | `rich_cards`          |
| 24  | `ioc-enrichment`         | IOC Enrichment Agent               | Enrich IOCs from OSINT sources                                    | `manual_only`   | `rich_cards`          |
| 25  | `misp-feed-review`       | MISP Feed Review Agent             | Review MISP event feeds                                           | `manual_only`   | `rich_cards`          |
| 26  | `knowledge-base`         | Knowledge Base Agent               | Extract reusable knowledge                                        | `manual_only`   | `markdown`            |
| 27  | `notification-digest`    | Notification Digest Agent          | Generate notification digests                                     | `scheduled`     | `markdown`            |
| 28  | `provider-health`        | Provider Health Agent              | Monitor AI provider health                                        | `scheduled`     | `rich_cards`          |
| --  | `approval-advisor`       | Approval Advisor Agent             | Advise on pending approvals                                       | `manual_only`   | `rich_cards`          |

### Presentation Skills

Each agent declares which rich output blocks it can produce. These map to frontend renderer components in `src/components/ai-renderer/`.

| Skill                 | Used By                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `risk_gauge`          | L1 Analyst, Alert Triage, Vuln Prioritization, UEBA, Cloud Triage, IOC Enrichment, Approval Advisor                          |
| `ioc_table`           | L1 Analyst, L2 Analyst, Threat Hunter, Correlation Synthesis, Entity Linking, Threat Intel, IOC Enrichment, MISP Feed Review |
| `severity_badge`      | L1 Analyst, Alert Triage, Incident Escalation, Vuln Prioritization, Cloud Triage, Approval Advisor                           |
| `timeline`            | L2 Analyst, Incident Escalation, Correlation Synthesis, UEBA, Attack Path Summary                                            |
| `mitre_map`           | L2 Analyst, Threat Hunter, Rules Analyst, Correlation Synthesis, Attack Path Summary, Threat Intel Synthesis                 |
| `hunt_query`          | Threat Hunter                                                                                                                |
| `rule_preview`        | Rules Analyst, Sigma Drafting, Rules Hygiene                                                                                 |
| `field_mapping_table` | Normalization Verifier, Normalization Verification                                                                           |
| `validation_report`   | Normalization Verifier, Normalization Verification                                                                           |
| `chart_preview`       | Dashboard Builder, Reporting                                                                                                 |
| `kpi_card`            | Dashboard Builder, Reporting, Job Health, Notification Digest, Provider Health                                               |
| `case_preview`        | Case Creation                                                                                                                |
| `task_routing`        | Orchestrator                                                                                                                 |
| `workflow_summary`    | Orchestrator, SOAR Drafting, Knowledge Base                                                                                  |

---

## Feature-to-Agent Mapping

The `FEATURE_TO_AGENT_MAP` in `src/modules/agent-config/agent-config.constants.ts` routes each `AiFeatureKey` to the responsible agent:

| Feature Key                    | Responsible Agent      |
| ------------------------------ | ---------------------- |
| `alert.summarize`              | L1 Analyst             |
| `alert.explain_severity`       | L1 Analyst             |
| `alert.false_positive_score`   | L1 Analyst             |
| `alert.next_action`            | L1 Analyst             |
| `case.summarize`               | L2 Analyst             |
| `case.executive_summary`       | L2 Analyst             |
| `case.timeline`                | L2 Analyst             |
| `case.next_tasks`              | L2 Analyst             |
| `hunt.hypothesis`              | Threat Hunter          |
| `hunt.nl_to_query`             | Threat Hunter          |
| `hunt.result_interpret`        | Threat Hunter          |
| `intel.ioc_enrich`             | L2 Analyst             |
| `intel.advisory_draft`         | L2 Analyst             |
| `detection.rule_draft`         | Rules Analyst          |
| `detection.tuning`             | Rules Analyst          |
| `report.daily_summary`         | Dashboard Builder      |
| `report.executive`             | Dashboard Builder      |
| `dashboard.anomaly`            | Dashboard Builder      |
| `soar.playbook_draft`          | Orchestrator           |
| `agent.task`                   | Orchestrator           |
| `knowledge.search`             | L1 Analyst             |
| `knowledge.generate_runbook`   | L2 Analyst             |
| `knowledge.summarize_incident` | L2 Analyst             |
| `entity.risk_explain`          | L2 Analyst             |
| `normalization.verify`         | Normalization Verifier |

---

## Trigger Modes

Defined in `AiTriggerMode` enum (`src/common/enums/ai-agent-config.enum.ts`):

| Mode              | Value           | Description                                                                      |
| ----------------- | --------------- | -------------------------------------------------------------------------------- |
| **Manual Only**   | `manual_only`   | Agent runs only when explicitly invoked by a user through the UI or API          |
| **Auto on Alert** | `auto_on_alert` | Agent fires automatically when a new alert is created or ingested                |
| **Auto by Agent** | `auto_by_agent` | Agent is triggered by another agent (e.g., Orchestrator delegates to specialist) |
| **Scheduled**     | `scheduled`     | Agent runs on a cron schedule (e.g., every 15 minutes, daily at 6 AM)            |

---

## Output Formats

Defined in `AiOutputFormat` enum (`src/common/enums/ai-agent-config.enum.ts`):

| Format              | Value             | Description                                            |
| ------------------- | ----------------- | ------------------------------------------------------ |
| **Structured JSON** | `structured_json` | Machine-parseable JSON for downstream processing       |
| **Markdown**        | `markdown`        | Human-readable markdown for reports and narratives     |
| **Rich Cards**      | `rich_cards`      | Structured blocks rendered by `ai-renderer` components |

---

## Action Categories

Defined in `AiActionCategory` enum (`src/common/enums/ai-feature.enum.ts`):

| Category              | Value               | Description                                                        |
| --------------------- | ------------------- | ------------------------------------------------------------------ |
| **Analysis Only**     | `analysis_only`     | Read-only insight; no side effects                                 |
| **Suggested**         | `suggested`         | AI proposes an action; analyst decides whether to execute          |
| **Approval Required** | `approval_required` | Action requires explicit approval from a reviewer before executing |
| **Auto Allowed**      | `auto_allowed`      | Action is safe to execute automatically without human review       |

---

## Approval Levels

Defined in `AiApprovalLevel` enum (`src/common/enums/ai-feature.enum.ts`):

| Level                 | Value               | Description                                                   |
| --------------------- | ------------------- | ------------------------------------------------------------- |
| **None**              | `none`              | Feature can run without any approval gate                     |
| **Analyst Review**    | `analyst_review`    | Results shown to analyst for review before acting             |
| **Approval Required** | `approval_required` | A separate approver must approve/reject via the Approvals API |

---

## Approval Risk Levels

Defined in `ApprovalRiskLevel` enum (`src/common/enums/ai-agent-config.enum.ts`):

| Level        | Value      | When Used                                                       |
| ------------ | ---------- | --------------------------------------------------------------- |
| **Low**      | `low`      | Read-only operations with no side effects                       |
| **Medium**   | `medium`   | Operations that modify non-critical data                        |
| **High**     | `high`     | Operations that modify critical data (alerts, cases, incidents) |
| **Critical** | `critical` | Operations that affect system configuration or security posture |

---

## Execution Flow

### Direct Agent Execution (via `runAgent`)

```
User clicks "Run Agent" in UI
        |
        v
AiAgentsService.runAgent()
        |
        +-- Validate agent exists and is ONLINE
        +-- Create AiAgentSession (status: RUNNING)
        +-- Enqueue job via JobService
        |     type: AI_AGENT_TASK
        |     payload: { agentId, sessionId, prompt, actorUserId, actorEmail, connector }
        |     idempotencyKey: "ai-agent:{agentId}:{sessionId}"
        |     maxAttempts: 2
        v
   Return { queued: true, jobId, sessionId }
        |
        v  (async, via job poller)
AiAgentTaskHandler.handle(job)
        |
        +-- Load agent with tools from DB
        +-- Resolve connector label for session tracking
        +-- Update session with provider info
        +-- Call AiService.runAgentTask()
        |     |
        |     +-- ensureAiEnabled(tenantId)
        |     +-- findAvailableAiConnectors(tenantId)
        |     +-- filterConnectorsBySelection() (if specific connector requested)
        |     +-- tryConnectorsInOrder() (cascade through providers)
        |     |     |
        |     |     +-- BedrockService.invoke()    -- OR --
        |     |     +-- LlmApisService.invoke()    -- OR --
        |     |     +-- OpenClawGatewayService.invoke()
        |     |     |
        |     |     +-- If all fail: buildFallbackAgentTaskResponse()
        |     |
        |     +-- logAudit() to AiAuditLog
        |     +-- Return AiResponse
        |
        +-- Mark session COMPLETED with output, model, tokens, cost, duration
        +-- Update agent cumulative stats (totalTokens, totalCost)
        |
        v
   Job status: COMPLETED
```

### Feature-Based Execution (via `executeAiTask`)

```
Frontend calls POST /api/ai/task
        |
        v
AiService.executeAiTask(params)
        |
        +-- FeatureCatalogService.getConfig() -- is feature enabled?
        +-- Resolve agent via FEATURE_TO_AGENT_MAP
        +-- AgentConfigService.getAgentConfig() -- is agent enabled?
        +-- checkAgentQuota() -- hourly/daily/monthly limits
        +-- UsageBudgetService.checkBudget() -- global monthly budget
        +-- PromptRegistryService.getActivePrompt() -- load prompt template
        +-- enrichContextWithOsint() -- OSINT enrichment if configured
        +-- assembleFinalPrompt() -- system prompt + template + context + suffix
        +-- findAvailableAiConnectors() -- resolve providers
        +-- resolveSelectedConnector() -- honor agent/feature/request preferences
        +-- tryConnectorsInOrder() -- cascade execution
        +-- recordUsage() -- update budget counters
        +-- logAudit() -- write AI audit log
        v
   Return AiResponse { result, reasoning, confidence, model, provider, tokensUsed }
```

---

## Provider Routing

See [`docs/AI-ROUTING.md`](./AI-ROUTING.md) for complete provider routing documentation.

Priority order: **Bedrock** --> **LLM APIs (fixed)** --> **OpenClaw Gateway** --> **Dynamic LLM Connectors** --> **Rule-based fallback**

The `findAvailableAiConnectors()` method in `AiService` resolves all configured providers and returns them in priority order. The `tryConnectorsInOrder()` method cascades through them sequentially until one succeeds.

---

## Safety and Governance

### Audit Trail

- Every AI invocation is logged to the `AiAuditLog` table with: tenant, user, action, model, tokens, latency, status, prompt, and response
- Application logs capture all agent lifecycle events via `AppLoggerService`
- Session-level tracking records input, output, provider, model, tokens, cost, and duration

### Tenant Isolation

- Every agent, config, session, and feature is scoped to a `tenantId`
- The `TenantGuard` validates tenant context on every request
- Agent configs are per-tenant via the `TenantAgentConfig` model
- Connector credentials are encrypted with AES-256-GCM per tenant

### Budget and Quota Enforcement

- **Per-agent quotas**: hourly, daily, and monthly token limits via `TenantAgentConfig`
- **Per-feature budgets**: monthly token budget via `AiFeatureConfig.monthlyTokenBudget`
- **Quota check before execution**: `checkAgentQuota()` validates usage against limits
- **Budget check before execution**: `UsageBudgetService.checkBudget()` validates global spend
- Usage counters are incremented after successful execution via `AgentConfigService.incrementUsage()`
- Counter resets are managed per period (hour/day/month) via `resetUsage()`

### Approval Gates

- Features can require approval via `AiApprovalLevel` (none / analyst_review / approval_required)
- Approval requests are stored in `AiApprovalRequest` with risk level, action data, and expiration
- Approvals must be resolved (approved/rejected) before the action proceeds
- Expired approvals cannot be resolved

### Concurrency Guards

- Job idempotency keys prevent duplicate dispatches: `ai-agent:{agentId}:{sessionId}`
- Agent must be ONLINE to accept execution requests
- `maxConcurrentRuns` config limits parallel executions per agent

### Fire-and-Forget Pattern

- AI execution never blocks core SOC operations
- Agent tasks are enqueued as jobs and processed asynchronously
- Failed executions mark the session as FAILED with the error message
- Job retries (maxAttempts: 2) handle transient provider failures

---

## Configuration

### Per-Tenant Agent Config (`TenantAgentConfig`)

Each agent can be individually configured per tenant via the Agent Config API:

| Field                | Type     | Default   | Description                                          |
| -------------------- | -------- | --------- | ---------------------------------------------------- |
| `isEnabled`          | Boolean  | `true`    | Whether the agent is active for this tenant          |
| `providerMode`       | String   | `default` | Which AI provider to use (`default` = auto-select)   |
| `model`              | String   | null      | Override model (e.g., `claude-3-opus`)               |
| `temperature`        | Float    | varies    | Model temperature (0.0 - 1.0)                        |
| `maxTokensPerCall`   | Int      | varies    | Maximum tokens per invocation                        |
| `systemPrompt`       | String   | null      | Custom system prompt prepended to all prompts        |
| `promptSuffix`       | String   | null      | Custom suffix appended to all prompts                |
| `indexPatterns`      | String[] | `[]`      | Data source index patterns for context               |
| `tokensPerHour`      | Int      | `50000`   | Hourly token quota                                   |
| `tokensPerDay`       | Int      | `500000`  | Daily token quota                                    |
| `tokensPerMonth`     | Int      | `5000000` | Monthly token quota                                  |
| `maxConcurrentRuns`  | Int      | 1         | Max parallel executions                              |
| `triggerMode`        | String   | varies    | How the agent is triggered                           |
| `triggerConfig`      | JSON     | null      | Trigger-specific configuration (cron, filters, etc.) |
| `osintSources`       | JSON     | null      | OSINT source IDs to use for enrichment               |
| `outputFormat`       | String   | varies    | Preferred output format                              |
| `presentationSkills` | String[] | varies    | Rich output block types the agent can produce        |

When no tenant-specific config exists, the agent uses defaults from `AI_AGENT_DEFAULTS` in `src/modules/agent-config/agent-config.constants.ts`.

### Per-Feature Config (`AiFeatureConfig`)

Each AI feature can be independently configured:

| Field                | Type    | Default | Description                               |
| -------------------- | ------- | ------- | ----------------------------------------- |
| `enabled`            | Boolean | `true`  | Whether the feature is available          |
| `preferredProvider`  | String  | null    | Override provider for this feature        |
| `maxTokens`          | Int     | `2048`  | Maximum tokens for this feature           |
| `approvalLevel`      | String  | `none`  | Approval gate (none / analyst / approval) |
| `monthlyTokenBudget` | Int     | null    | Monthly token budget for this feature     |

---

## OSINT Enrichment

Agents can be configured to automatically enrich IOCs (Indicators of Compromise) from external OSINT sources before processing. The enrichment happens inside `AiService.enrichContextWithOsint()` and prepends OSINT data to the AI prompt context.

### Builtin OSINT Sources

| Source         | Type             | Description                   |
| -------------- | ---------------- | ----------------------------- |
| VirusTotal     | `virustotal`     | File/URL/IP reputation        |
| Shodan         | `shodan`         | Internet-facing device search |
| AbuseIPDB      | `abuseipdb`      | IP abuse reports              |
| NVD NIST       | `nvd_nist`       | Vulnerability database        |
| AlienVault OTX | `alienvault_otx` | Open threat exchange          |
| GreyNoise      | `greynoise`      | Internet background noise     |
| URLScan        | `urlscan`        | URL analysis                  |
| Censys         | `censys`         | Internet-wide scanning        |
| Malware Bazaar | `malware_bazaar` | Malware sample database       |
| ThreatFox      | `threatfox`      | IOC sharing platform          |
| Pulsedive      | `pulsedive`      | Threat intelligence           |
| Web Search     | `web_search`     | General web search            |
| Custom         | `custom`         | User-defined OSINT endpoint   |

OSINT source API keys are encrypted with AES-256-GCM before storage.

---

## Job System Integration

Agent tasks flow through the general-purpose job system:

| Property        | Value                                                          |
| --------------- | -------------------------------------------------------------- |
| Job Type        | `AI_AGENT_TASK`                                                |
| Handler         | `AiAgentTaskHandler`                                           |
| Max Attempts    | 2                                                              |
| Idempotency Key | `ai-agent:{agentId}:{sessionId}`                               |
| Payload Fields  | agentId, sessionId, prompt, actorUserId, actorEmail, connector |

### Other Job Types

| JobType                      | Handler                   | Description                 |
| ---------------------------- | ------------------------- | --------------------------- |
| `CONNECTOR_SYNC`             | ConnectorSyncHandler      | Data source synchronization |
| `DETECTION_RULE_EXECUTION`   | DetectionExecutionHandler | Run detection rules         |
| `CORRELATION_RULE_EXECUTION` | CorrelationHandler        | Run correlation rules       |
| `NORMALIZATION_PIPELINE`     | NormalizationHandler      | Run normalization pipelines |
| `SOAR_PLAYBOOK`              | SoarPlaybookHandler       | Execute SOAR playbooks      |
| `HUNT_EXECUTION`             | HuntExecutionHandler      | Execute hunt sessions       |
| `AI_AGENT_TASK`              | AiAgentTaskHandler        | Execute AI agent tasks      |
| `REPORT_GENERATION`          | ReportGenerationHandler   | Generate reports            |

---

## Database Models

### `AiAgent` (Custom Agent Definitions)

User-created agents with custom tools and SOUL.md personality files. Managed via `AiAgentsService`.

### `AiAgentSession`

Execution history for each agent run. Tracks input, output, model, provider, tokens, cost, duration, and errors.

### `TenantAgentConfig`

Per-tenant configuration overrides for each of the 28 built-in agents. Managed via `AgentConfigService`.

### `AiFeatureConfig`

Per-tenant, per-feature configuration (enable/disable, budget, approval level). Managed via `FeatureCatalogService`.

### `AiApprovalRequest`

Pending/resolved approval requests for approval-gated AI actions.

### `AiAuditLog`

Immutable audit trail for all AI invocations.

---

## API Endpoints

### AI Agent Management (`/ai-agents`)

| Method | Endpoint                       | Permission         | Description                 |
| ------ | ------------------------------ | ------------------ | --------------------------- |
| GET    | `/ai-agents`                   | `aiAgents.view`    | List agents (paginated)     |
| GET    | `/ai-agents/stats`             | `aiAgents.view`    | Aggregate agent statistics  |
| GET    | `/ai-agents/:id`               | `aiAgents.view`    | Get agent details           |
| POST   | `/ai-agents`                   | `aiAgents.create`  | Create a new agent          |
| PATCH  | `/ai-agents/:id`               | `aiAgents.update`  | Update agent fields         |
| DELETE | `/ai-agents/:id`               | `aiAgents.delete`  | Delete an agent             |
| POST   | `/ai-agents/:id/start`         | `aiAgents.execute` | Set agent status to ONLINE  |
| POST   | `/ai-agents/:id/stop`          | `aiAgents.execute` | Set agent status to OFFLINE |
| POST   | `/ai-agents/:id/run`           | `aiAgents.execute` | Execute agent (enqueue job) |
| GET    | `/ai-agents/:id/sessions`      | `aiAgents.view`    | List agent sessions         |
| POST   | `/ai-agents/:id/tools`         | `aiAgents.update`  | Add a tool to an agent      |
| PATCH  | `/ai-agents/:id/tools/:toolId` | `aiAgents.update`  | Update a tool               |
| DELETE | `/ai-agents/:id/tools/:toolId` | `aiAgents.update`  | Delete a tool               |

### AI Configuration (`/agent-config`)

| Method | Endpoint                               | Permission               | Description                          |
| ------ | -------------------------------------- | ------------------------ | ------------------------------------ |
| GET    | `/agent-config/agents`                 | `ai.config.view`         | List all agent configs with defaults |
| GET    | `/agent-config/agents/:agentId`        | `ai.config.view`         | Get specific agent config            |
| PATCH  | `/agent-config/agents/:agentId`        | `ai.config.edit`         | Update agent config                  |
| POST   | `/agent-config/agents/:agentId/toggle` | `ai.config.edit`         | Enable/disable agent                 |
| POST   | `/agent-config/agents/:agentId/reset`  | `ai.config.edit`         | Reset token usage counters           |
| GET    | `/agent-config/osint-sources`          | `ai.config.manage_osint` | List OSINT sources                   |
| POST   | `/agent-config/osint-sources`          | `ai.config.manage_osint` | Create OSINT source                  |
| PATCH  | `/agent-config/osint-sources/:id`      | `ai.config.manage_osint` | Update OSINT source                  |
| DELETE | `/agent-config/osint-sources/:id`      | `ai.config.manage_osint` | Delete OSINT source                  |
| POST   | `/agent-config/osint-sources/:id/test` | `ai.config.manage_osint` | Test OSINT source connectivity       |
| GET    | `/agent-config/approvals`              | `ai.approvals.manage`    | List approval requests               |
| POST   | `/agent-config/approvals/:id/resolve`  | `ai.approvals.manage`    | Approve or reject a request          |

### AI Execution (`/ai`)

| Method | Endpoint          | Description                             |
| ------ | ----------------- | --------------------------------------- |
| POST   | `/ai/hunt`        | AI-assisted threat hunting              |
| POST   | `/ai/investigate` | AI investigation of a specific alert    |
| POST   | `/ai/explain`     | Explainable AI output for any prompt    |
| POST   | `/ai/task`        | Generic feature-based AI task execution |

---

## AI Writeback & Findings Persistence

### Overview

When an AI agent completes execution, the writeback system persists structured findings and updates the source entity. The flow is:

```
AI Agent Task completes
        |
        v
AiWritebackService.processSystemTriggeredResult()
        |
        +-- 1. Parse findings from AI response text
        |       Extracts finding type, title, summary, confidence, severity
        |       Falls back to a single summary finding when structured data cannot be parsed
        |
        +-- 2. Persist findings to ai_execution_findings table
        |       Each finding gets: tenantId, sessionId, agentId, sourceModule,
        |       sourceEntityId, findingType, title, summary, confidenceScore,
        |       severity, recommendedAction, status (initially "proposed")
        |
        +-- 3. Write back to source entity
        |       |
        |       +-- Alert: Updates aiSummary, aiConfidence, aiSeveritySuggestion,
        |       |          aiLastRunAt, aiLastExecutionId, aiStatus fields
        |       |
        |       +-- Incident: Creates an IncidentTimeline entry with AI analysis
        |       |
        |       +-- Case: Creates a CaseNote with formatted AI analysis
        |
        +-- 4. Update session counts (findingsCount, writebacksCount)
        |
        +-- 5. Log completion via AppLoggerService
```

Writeback failures are logged but never re-thrown -- they must not crash the job handler.

### AiExecutionFinding Fields

| Field               | Type      | Description                                                  |
| ------------------- | --------- | ------------------------------------------------------------ |
| `id`                | UUID      | Primary key                                                  |
| `tenantId`          | UUID      | Tenant scope                                                 |
| `sessionId`         | UUID      | Reference to the AiAgentSession that produced the finding    |
| `agentId`           | String    | Agent identifier (from AiAgentId enum)                       |
| `sourceModule`      | String    | Source module (`alert`, `incident`, `case`, etc.)            |
| `sourceEntityId`    | String?   | ID of the source entity (nullable)                           |
| `findingType`       | String    | Type of finding (from AiFindingType enum)                    |
| `title`             | String    | Short title describing the finding                           |
| `summary`           | Text      | Full AI-generated summary (max 10,000 chars)                 |
| `confidenceScore`   | Float?    | AI confidence score (0.0 - 1.0)                              |
| `severity`          | String?   | Suggested severity (`critical`, `high`, `medium`, etc.)      |
| `evidenceJson`      | JSON?     | Structured evidence data                                     |
| `recommendedAction` | Text?     | Suggested next action                                        |
| `status`            | String    | Finding status: `proposed`, `applied`, `dismissed`, `failed` |
| `appliedAt`         | DateTime? | When the finding was applied                                 |
| `createdAt`         | DateTime  | Creation timestamp                                           |

### Finding Types (AiFindingType)

| Type                        | Description                    |
| --------------------------- | ------------------------------ |
| `triage`                    | Alert triage result            |
| `summary`                   | General summary                |
| `severity_recommendation`   | Severity level recommendation  |
| `escalation_recommendation` | Escalation recommendation      |
| `investigation_step`        | Investigation step suggestion  |
| `entity_risk_signal`        | Entity risk signal             |
| `correlation_candidate`     | Correlation candidate          |
| `vulnerability_priority`    | Vulnerability prioritization   |
| `cloud_posture_finding`     | Cloud security posture finding |
| `rule_recommendation`       | Detection rule recommendation  |
| `report_insight`            | Report insight                 |
| `other`                     | Uncategorized finding          |

### Finding Statuses (AiFindingStatus)

| Status      | Description                                    |
| ----------- | ---------------------------------------------- |
| `proposed`  | Initial state -- finding awaits analyst review |
| `applied`   | Analyst accepted and applied the finding       |
| `dismissed` | Analyst dismissed the finding                  |
| `failed`    | Finding could not be applied                   |

### API Endpoints (`/ai/findings`)

| Method | Endpoint                                       | Permission      | Description                                   |
| ------ | ---------------------------------------------- | --------------- | --------------------------------------------- |
| GET    | `/ai/findings`                                 | `aiAgents.view` | List findings (paginated, filterable)         |
| GET    | `/ai/findings/:id`                             | `aiAgents.view` | Get a single finding by ID                    |
| GET    | `/ai/findings/by-entity/:entityType/:entityId` | `aiAgents.view` | Get all findings for a specific source entity |

#### Query Parameters for `GET /ai/findings`

| Parameter        | Type   | Default     | Description                                                                                |
| ---------------- | ------ | ----------- | ------------------------------------------------------------------------------------------ |
| `page`           | number | `1`         | Page number (1-10000)                                                                      |
| `limit`          | number | `20`        | Items per page (1-100)                                                                     |
| `sortBy`         | string | `createdAt` | Sort field: `createdAt`, `findingType`, `severity`, `confidenceScore`, `status`, `agentId` |
| `sortOrder`      | string | `desc`      | Sort direction: `asc` or `desc`                                                            |
| `sourceModule`   | string | --          | Filter by source module (e.g., `alert`)                                                    |
| `agentId`        | string | --          | Filter by agent ID                                                                         |
| `status`         | string | --          | Filter by finding status                                                                   |
| `findingType`    | string | --          | Filter by finding type                                                                     |
| `sourceEntityId` | string | --          | Filter by source entity ID                                                                 |
| `query`          | string | --          | Full-text search on title and summary                                                      |

---

## Related Documentation

- [AI Provider Routing](./AI-ROUTING.md) -- Detailed provider selection and fallback strategy
- [Permissions Reference](./PERMISSIONS.md) -- Complete permission matrix
- [AI Agent Safety](./ai-agent-safety.md) -- Safety guardrails and guidelines
