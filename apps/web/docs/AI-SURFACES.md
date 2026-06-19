# AuraSpear SOC -- AI Copilot Surfaces

This document describes every AI-powered surface in the AuraSpear SOC frontend, the shared connector infrastructure, and the supporting UI components.

---

## Table of Contents

- [Connector Architecture](#connector-architecture)
- [Shared Infrastructure](#shared-infrastructure)
- [AI Copilot Surfaces](#ai-copilot-surfaces)
- [Supporting Components](#supporting-components)
- [AI Feature Catalog](#ai-feature-catalog)
- [Permissions](#permissions)

---

## Connector Architecture

AI requests are routed through the first available connector in priority order:

```
User Action
    |
    v
useAi*() hook
    |
    v
useAvailableAiConnectors()  -->  GET /api/connectors/ai-available
    |
    v
Service Method (connectorId param)
    |
    v
Next.js API Proxy Route
    |
    v
NestJS Backend: AiService.findAvailableAiConnector(tenantId)
    |
    +-- 1. AWS Bedrock (bedrock)
    +-- 2. LLM APIs (llm_apis)        <-- OpenAI-compatible endpoints
    +-- 3. OpenClaw Gateway (openclaw_gateway)
    +-- 4. Rule-based fallback (model: 'rule-based')
```

### Connector Types

| Connector        | Enum Value         | Config Fields                                 |
| ---------------- | ------------------ | --------------------------------------------- |
| AWS Bedrock      | `bedrock`          | region, model, AWS credentials                |
| LLM APIs         | `llm_apis`         | baseUrl, apiKey, defaultModel, organizationId |
| OpenClaw Gateway | `openclaw_gateway` | baseUrl, apiKey                               |

The backend checks all three in priority order and uses the first that is both enabled and healthy. If none is available, a rule-based fallback provides deterministic (non-AI) responses labeled `model: 'rule-based'`.

---

## Shared Infrastructure

### `useAvailableAiConnectors` Hook

**File**: `src/hooks/useAvailableAiConnectors.ts`

Every AI copilot surface uses this shared hook to fetch the list of available connectors and manage the user's selection. It is cached by TanStack Query with a 60-second stale time.

```
const {
  availableConnectors,    // Array of { id, label } -- includes "Default (Auto)"
  selectedConnector,      // Current selection (string)
  setSelectedConnector,   // Setter
  connectorValue,         // undefined = auto, or specific connector ID
} = useAvailableAiConnectors()
```

**Behavior**:

- Fetches from `GET /api/connectors/ai-available` on mount
- Falls back to `AI_CONNECTOR_FALLBACK` constant if the fetch has not resolved
- The `"default"` selection maps to `connectorValue = undefined`, which tells the backend to use auto-routing
- The `connectorValue` is passed to every AI service method call

### Connector Selection Dropdown

Every AI panel includes a connector selection dropdown. The dropdown:

1. Fetches options from `/api/connectors/ai-available` (never iterates a static enum)
2. Defaults to "Default (Auto)" which lets the backend pick the best connector
3. Allows explicit selection of any enabled connector
4. Persists the selection only in component state (not localStorage -- AI transcripts are sensitive)

---

## AI Copilot Surfaces

### 1. Alert Triage

**Hook**: `src/hooks/useAiAlertTriage.ts`
**Permission**: `AI_ALERT_TRIAGE`
**Module**: Alerts (alert detail drawer)

Provides four triage actions for a specific alert:

| Action               | Service Method                            | Description                       |
| -------------------- | ----------------------------------------- | --------------------------------- |
| Summarize            | `alertService.triageSummarize()`          | One-paragraph alert summary       |
| Explain Severity     | `alertService.triageExplainSeverity()`    | Why this severity was assigned    |
| False Positive Score | `alertService.triageFalsePositiveScore()` | Confidence it is a false positive |
| Next Action          | `alertService.triageNextAction()`         | Recommended analyst action        |

Each action is a separate `useMutation`. Results are stored in a `Record<string, AiTriageResult>` keyed by action name.

### 2. Case Copilot

**Hook**: `src/hooks/useAiCaseCopilot.ts`
**Permission**: `AI_CASE_COPILOT`
**Module**: Cases (case detail page)

Provides four copilot actions for a specific case:

| Action            | Service Method                     | Description                        |
| ----------------- | ---------------------------------- | ---------------------------------- |
| Summarize         | `caseService.aiSummarize()`        | Technical case summary             |
| Executive Summary | `caseService.aiExecutiveSummary()` | Non-technical executive briefing   |
| Timeline          | `caseService.aiTimeline()`         | Chronological event reconstruction |
| Next Tasks        | `caseService.aiNextTasks()`        | Suggested investigation next steps |

### 3. Dashboard AI

**Hook**: `src/hooks/useAiDashboard.ts`
**Module**: Dashboard

Two dashboard-level AI capabilities:

| Action          | Service Method                        | Description                        |
| --------------- | ------------------------------------- | ---------------------------------- |
| Daily Summary   | `dashboardService.aiDailySummary()`   | AI-generated daily SOC briefing    |
| Explain Anomaly | `dashboardService.aiExplainAnomaly()` | Explain a specific anomaly in data |

### 4. Detection Rule Copilot

**Hook**: `src/hooks/useAiDetectionCopilot.ts`
**Permission**: `AI_DETECTION_COPILOT`
**Module**: Detection Rules

Two AI capabilities for detection engineering:

| Action     | Service Method                       | Description                                |
| ---------- | ------------------------------------ | ------------------------------------------ |
| Draft Rule | `detectionRuleService.aiDraftRule()` | Generate a detection rule from description |
| Tuning     | `detectionRuleService.aiTuning()`    | Suggest tuning for an existing rule        |

The draft rule action takes a natural language description (`draftDescription` state) and generates a structured detection rule.

### 5. Intel AI

**Hook**: `src/hooks/useAiIntel.ts`
**Permission**: `INTEL_VIEW`
**Module**: Threat Intelligence

Two intelligence capabilities:

| Action         | Service Method                   | Description                          |
| -------------- | -------------------------------- | ------------------------------------ |
| Enrich IOC     | `intelService.aiEnrichIoc()`     | AI enrichment of an IOC              |
| Draft Advisory | `intelService.aiDraftAdvisory()` | Generate a threat advisory from IOCs |

### 6. SOAR Copilot

**Hook**: `src/hooks/useAiSoar.ts`
**Permission**: `AI_SOAR_COPILOT`
**Module**: SOAR (Shuffle playbooks)

| Action         | Service Method                  | Description                        |
| -------------- | ------------------------------- | ---------------------------------- |
| Draft Playbook | `soarService.aiDraftPlaybook()` | Generate playbook from description |

### 7. Report AI

**Hook**: `src/hooks/useAiReport.ts`
**Module**: Reports

| Action           | Service Method                      | Description                 |
| ---------------- | ----------------------------------- | --------------------------- |
| Executive Report | `reportService.aiExecutiveReport()` | Time-range executive report |

Supports configurable time range (7d, 30d, etc.) via `selectedTimeRange` state.

### 8. Normalization Verifier

**Hook**: `src/hooks/useAiNormVerifier.ts`
**Permission**: `NORMALIZATION_VIEW`
**Module**: Normalization Pipelines

| Action          | Service Method                            | Description                              |
| --------------- | ----------------------------------------- | ---------------------------------------- |
| Verify Pipeline | `normalizationService.aiVerifyPipeline()` | AI verification of pipeline with samples |

Takes a pipeline ID and an array of sample events, returns AI analysis of normalization quality.

### 9. Notification Digest

**Hook**: `src/hooks/useAiNotificationDigest.ts`
**Module**: Notifications

| Action          | Service Method                      | Description                        |
| --------------- | ----------------------------------- | ---------------------------------- |
| Generate Digest | `dashboardService.aiDailySummary()` | AI summary of recent notifications |

### 10. Knowledge Panel

**Hook**: `src/hooks/useAiKnowledgePanel.ts`
**Module**: AI Knowledge Base

Provides AI-powered knowledge base search, runbook generation, and incident summarization.

### Additional AI Hooks

| Hook                    | File                       | Purpose                                 |
| ----------------------- | -------------------------- | --------------------------------------- |
| `useAiApprovals`        | `useAiApprovals.ts`        | Approval queue for AI actions           |
| `useAiPrompts`          | `useAiPrompts.ts`          | Prompt template management              |
| `useAiFeatures`         | `useAiFeatures.ts`         | AI feature catalog (enable/disable)     |
| `useAiConfigPage`       | `useAiConfigPage.ts`       | AI configuration admin page             |
| `useAiAutomationBadge`  | `useAiAutomationBadge.ts`  | Automation status for an agent          |
| `useAiAgents`           | `useAiAgents.ts`           | AI agent list management                |
| `useAiAgentDetailPanel` | `useAiAgentDetailPanel.ts` | Agent detail panel (overview, sessions) |

---

## Supporting Components

### `OrchestratorStatsBar`

**File**: `src/components/common/OrchestratorStatsBar.tsx`

Displays real-time orchestrator statistics in a horizontal bar. Used on the AI Config page.

```
+------------------------------------------------------------------+
| Dispatches: 142 | Success: 138 | Failures: 4 | Pending: 2 | Agents: 8/12 |
+------------------------------------------------------------------+
```

Props:

- `stats` -- `OrchestratorStatsBarProps` with `totalDispatches24h`, `successCount24h`, `failureCount24h`, `pendingApprovals`, `activeAgents`, `totalAgents`
- `t` -- Translation function

Shows badges with semantic color variants: `success` for successes, `destructive` for failures, `warning` for pending approvals.

### `AiAutomationBadge`

**File**: `src/components/common/AiAutomationBadge.tsx`

Displays the automation mode and enabled state of an AI agent as a compact badge.

Props:

- `automationMode` -- The trigger mode string (manual_only, auto_on_alert, etc.)
- `isEnabled` -- Whether the agent is enabled
- `t` -- Translation function

Uses `resolveAutomationBadgeVariant()` and `resolveAutomationBadgeLabel()` from `src/lib/ai-config.utils.ts` to determine the badge variant and label.

### Connector Selection Pattern

Every AI panel follows this pattern for connector selection:

1. Import `useAvailableAiConnectors` (via the parent AI hook)
2. Render a `<Select>` dropdown with `availableConnectors` as options
3. On change, call `handleConnectorChange(value)`
4. The selected `connectorValue` is automatically passed to all AI service calls

---

## AI Feature Catalog

The `AiFeatureKey` enum (`src/enums/ai-config.enum.ts`) registers every AI capability. Features can be enabled/disabled per tenant via the AI Config admin page.

| Feature Key                    | Module        | Description                |
| ------------------------------ | ------------- | -------------------------- |
| `alert.summarize`              | Alerts        | Alert summarization        |
| `alert.explain_severity`       | Alerts        | Severity explanation       |
| `alert.false_positive_score`   | Alerts        | False positive scoring     |
| `alert.next_action`            | Alerts        | Next action recommendation |
| `case.summarize`               | Cases         | Case summarization         |
| `case.executive_summary`       | Cases         | Executive briefing         |
| `case.timeline`                | Cases         | Timeline reconstruction    |
| `case.next_tasks`              | Cases         | Next tasks suggestion      |
| `hunt.hypothesis`              | Hunt          | Hypothesis generation      |
| `hunt.nl_to_query`             | Hunt          | Natural language to query  |
| `hunt.result_interpret`        | Hunt          | Result interpretation      |
| `intel.ioc_enrich`             | Intel         | IOC AI enrichment          |
| `intel.advisory_draft`         | Intel         | Advisory drafting          |
| `detection.rule_draft`         | Detection     | Rule generation            |
| `detection.tuning`             | Detection     | Rule tuning suggestions    |
| `report.daily_summary`         | Dashboard     | Daily summary              |
| `report.executive`             | Reports       | Executive report           |
| `dashboard.anomaly`            | Dashboard     | Anomaly explanation        |
| `soar.playbook_draft`          | SOAR          | Playbook generation        |
| `agent.task`                   | AI Agents     | Generic agent task         |
| `knowledge.search`             | Knowledge     | Knowledge base search      |
| `knowledge.generate_runbook`   | Knowledge     | Runbook generation         |
| `knowledge.summarize_incident` | Knowledge     | Incident summarization     |
| `entity.risk_explain`          | Entities      | Entity risk explanation    |
| `normalization.verify`         | Normalization | Pipeline verification      |

---

## AI Agent IDs

The `AiAgentId` enum (`src/enums/ai-config.enum.ts`) defines all registered AI agents:

| Agent ID                 | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `orchestrator`           | Central orchestrator for multi-agent tasks |
| `l1_analyst`             | Level 1 SOC analyst assistant              |
| `l2_analyst`             | Level 2 SOC analyst assistant              |
| `threat_hunter`          | Threat hunting assistant                   |
| `rules_analyst`          | Detection/correlation rules assistant      |
| `norm_verifier`          | Normalization pipeline verifier            |
| `dashboard_builder`      | Dashboard insights builder                 |
| `alert-triage`           | Alert triage automation                    |
| `case-creation`          | Automated case creation                    |
| `incident-escalation`    | Incident escalation advisor                |
| `correlation-synthesis`  | Correlation rule synthesis                 |
| `sigma-drafting`         | Sigma rule drafting                        |
| `vuln-prioritization`    | Vulnerability prioritization               |
| `ueba-narrative`         | UEBA narrative generation                  |
| `attack-path-summary`    | Attack path summarization                  |
| `norm-verification`      | Normalization verification                 |
| `rules-hygiene`          | Rules hygiene analysis                     |
| `reporting`              | Report generation                          |
| `entity-linking`         | Entity linking and correlation             |
| `job-health`             | Job system health monitoring               |
| `cloud-triage`           | Cloud security triage                      |
| `soar-drafting`          | SOAR playbook drafting                     |
| `threat-intel-synthesis` | Threat intel synthesis                     |
| `ioc-enrichment`         | IOC enrichment                             |
| `misp-feed-review`       | MISP feed review                           |
| `knowledge-base`         | Knowledge base operations                  |
| `notification-digest`    | Notification digest generation             |
| `provider-health`        | AI provider health monitoring              |
| `approval-advisor`       | Approval decision advisor                  |

---

## Permissions

AI surfaces are gated by the following permissions:

| Permission             | Surfaces                                       |
| ---------------------- | ---------------------------------------------- |
| `AI_ALERT_TRIAGE`      | Alert triage (summarize, severity, FP, action) |
| `AI_CASE_COPILOT`      | Case copilot (summarize, timeline, tasks)      |
| `AI_DETECTION_COPILOT` | Detection rule drafting and tuning             |
| `AI_SOAR_COPILOT`      | SOAR playbook drafting                         |
| `INTEL_VIEW`           | Intel AI enrichment and advisory               |
| `NORMALIZATION_VIEW`   | Normalization pipeline verification            |

All AI permissions are managed through the Role Settings admin page (`/admin/role-settings`).
