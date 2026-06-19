# AuraSpear AI Provider Routing

## Overview

AuraSpear supports three AI provider paths plus dynamically configured LLM connectors. The routing system automatically selects the best available provider, cascades through fallbacks on failure, and produces rule-based responses when no AI provider is reachable.

---

## Provider Types

### 1. AWS Bedrock (`bedrock`)

| Property       | Value                                              |
| -------------- | -------------------------------------------------- |
| Connector Type | `ConnectorType.BEDROCK`                            |
| Service        | `BedrockService`                                   |
| Default Model  | `global.anthropic.claude-sonnet-4-5-20250929-v1:0` |
| Max Tokens     | 2048                                               |
| Authentication | AWS IAM (access key + secret key)                  |
| Configuration  | Region, model ID, AWS credentials                  |

Direct integration with Amazon Bedrock for Claude model invocation. Requires an AWS account with Bedrock access enabled for the target region and model.

**Configuration fields** (stored encrypted in `ConnectorConfig`):

- `awsRegion` -- AWS region (e.g., `us-east-1`)
- `awsAccessKeyId` -- IAM access key
- `awsSecretAccessKey` -- IAM secret access key
- `modelId` -- Bedrock model identifier (e.g., `global.anthropic.claude-sonnet-4-5-20250929-v1:0`)

### 2. LLM APIs (`llm_apis`)

| Property       | Value                             |
| -------------- | --------------------------------- |
| Connector Type | `ConnectorType.LLM_APIS`          |
| Service        | `LlmApisService`                  |
| Default Model  | `gpt-4`                           |
| Max Tokens     | 2048                              |
| Authentication | API key (Bearer or custom header) |
| Configuration  | Base URL, API key, model, org ID  |

OpenAI-compatible REST API connector. Works with any provider that implements the OpenAI chat completions API: OpenAI, Anthropic API, Azure OpenAI, local LLMs (Ollama, vLLM), or third-party gateways.

**Fixed connector**: One legacy LLM APIs connector per tenant (stored in `ConnectorConfig` table).

**Dynamic connectors**: Multiple named LLM connectors per tenant (stored in `LlmConnectorConfig` table), each with independent base URL, credentials, and model. Managed via the LLM Connectors API.

**Configuration fields**:

- `baseUrl` -- API endpoint (e.g., `https://api.openai.com/v1`)
- `apiKey` -- Authentication key
- `defaultModel` -- Model to use (e.g., `gpt-4`, `claude-3-sonnet`)
- `organizationId` -- Optional organization ID

### 3. OpenClaw Gateway (`openclaw_gateway`)

| Property       | Value                            |
| -------------- | -------------------------------- |
| Connector Type | `ConnectorType.OPENCLAW_GATEWAY` |
| Service        | `OpenClawGatewayService`         |
| Default Model  | `openclaw-gateway`               |
| Max Tokens     | 2048                             |
| Authentication | API key                          |
| Configuration  | Base URL, API key                |

AI gateway/orchestration layer that can route to multiple upstream providers based on its own configuration.

**Configuration fields**:

- `baseUrl` -- Gateway endpoint
- `apiKey` -- Authentication key

---

## Selection Logic

### Priority Order

```
AI_CONNECTOR_PRIORITY = [
  ConnectorType.BEDROCK,       // Priority 1
  ConnectorType.LLM_APIS,     // Priority 2 (fixed/legacy)
  ConnectorType.OPENCLAW_GATEWAY  // Priority 3
]
```

Defined in `src/modules/ai/ai.constants.ts`.

### Resolution Process

```
findAvailableAiConnectors(tenantId)
        |
        +-- Step 1: Resolve Fixed Connectors
        |     For each type in AI_CONNECTOR_PRIORITY:
        |       getDecryptedConfig(tenantId, connectorType)
        |       If config exists -> add to resolved[]
        |
        +-- Step 2: Append Dynamic Connectors
        |     LlmConnectorsService.getEnabledConfigs(tenantId)
        |     For each enabled dynamic LLM connector:
        |       Add to resolved[] as ConnectorType.LLM_APIS
        |       (with id and name for identification)
        |
        +-- Step 3: Log Resolution
        |     Log: "N of 3 fixed + M dynamic configured"
        |     Include available types and missing types
        |
        +-- Return: ResolvedAiConnector[]
```

### Cascade Execution

```
tryConnectorsInOrder(connectors, attemptFn, index = 0)
        |
        +-- If index >= connectors.length -> return undefined (all failed)
        +-- Try connectors[index]
        |     Success -> return response
        |     Failure -> log warning, try next
        |
        +-- Recurse with index + 1
```

The system uses recursion rather than a loop to avoid `await-in-loop` lint warnings. Each connector is attempted sequentially until one succeeds.

---

## Provider Override Mechanisms

### 1. Request-Level Override

The caller can pass a `connector` parameter to force a specific provider:

- UUID string -- routes to a specific dynamic LLM connector by ID
- Fixed keyword (`bedrock`, `llm_apis`, `openclaw_gateway`) -- routes to that provider type
- `default` or omitted -- uses the standard priority cascade

### 2. Agent-Level Override

Each agent's `TenantAgentConfig.providerMode` can be set to lock an agent to a specific provider.

### 3. Feature-Level Override

Each `AiFeatureConfig.preferredProvider` can specify a preference for a specific feature.

### Resolution Precedence

```
resolveSelectedConnector(requestConnector, agentProviderMode, defaultKey, featurePreference)

  1. requestConnector (if provided and not 'default')
  2. agentProviderMode (if set and not 'default')
  3. featurePreference (if set)
  4. 'default' -> use full priority cascade
```

Implemented in `src/modules/ai/ai.utilities.ts`.

---

## Capability Matrix

| Capability                      | Bedrock                                         | LLM APIs | OpenClaw Gateway | Rule-Based |
| ------------------------------- | ----------------------------------------------- | -------- | ---------------- | ---------- |
| Threat Hunting (`aiHunt`)       | Yes                                             | Yes      | Yes              | Fallback   |
| Investigation (`aiInvestigate`) | Yes                                             | Yes      | Yes              | Fallback   |
| Explain (`aiExplain`)           | Yes                                             | Yes      | Yes              | Fallback   |
| Agent Task (`runAgentTask`)     | Yes                                             | Yes      | Yes              | Fallback   |
| Generic Task (`executeAiTask`)  | Yes                                             | Yes      | Yes              | Fallback   |
| OSINT Enrichment                | N/A (executed directly by OsintExecutorService) |          |                  |            |
| Streaming                       | No                                              | No       | No               | N/A        |

All four execution paths (hunt, investigate, explain, agent task) work with all three providers. Each path has dedicated routing and response-building functions:

- `buildBedrockHuntResponse()` / `buildLlmApisHuntResponse()` / `buildOpenClawHuntResponse()`
- `buildBedrockInvestigateResponse()` / `buildLlmApisInvestigateResponse()` / `buildOpenClawInvestigateResponse()`
- `buildBedrockExplainResponse()` / `buildLlmApisExplainResponse()` / `buildOpenClawExplainResponse()`
- `buildBedrockAgentTaskResponse()` / `buildLlmApisAgentTaskResponse()` / `buildOpenClawAgentTaskResponse()`

---

## Fallback Strategy

When no AI connector is available or all connectors fail, the system returns a rule-based response:

```
Model: "rule-based"
Provider: "rule-based"
Confidence: varies (typically 0.3 - 0.5)
Tokens: { input: 0, output: 0 }
```

Fallback functions are defined in `src/modules/ai/ai.utilities.ts`:

| Function                             | Trigger                                        |
| ------------------------------------ | ---------------------------------------------- |
| `buildFallbackHuntResponse()`        | No provider available for hunt                 |
| `buildFallbackInvestigateResponse()` | No provider available for investigation        |
| `buildFallbackExplainResponse()`     | No provider available for explain              |
| `buildFallbackAgentTaskResponse()`   | No provider available for agent task           |
| `buildFallbackGenericResponse()`     | No provider available for generic feature task |

Rule-based responses are clearly labeled with `model: 'rule-based'` so the frontend can distinguish them from actual AI output.

---

## Error Handling

### Per-Connector Errors

When a connector fails, the error is logged as a warning and the next connector in the cascade is attempted:

```typescript
// Simplified flow
try {
  return await invokeConnector(connector, prompt, maxTokens)
} catch (error) {
  logger.warn(`Routing failed for ${connector.type}: ${error.message}`)
  return undefined // signal to try next connector
}
```

### Explicit Connector Request Failures

When a user explicitly requests a specific connector and it fails:

- If the connector is not configured: `BusinessException(400, 'errors.ai.connectorNotAvailable')`
- If the connector is configured but fails: `BusinessException(502, 'errors.ai.agentUnreachable')`

This prevents silent fallback when the user specifically chose a provider.

### Provider Health

The `provider-health` agent (scheduled) monitors AI provider availability. When no connectors are available, the system continues to function using rule-based fallbacks.

---

## Token Costs

Default pricing (Bedrock Claude 3 Sonnet):

| Metric                  | Cost (USD) |
| ----------------------- | ---------- |
| Per 1,000 input tokens  | $0.003     |
| Per 1,000 output tokens | $0.015     |

Defined in `src/modules/ai/ai.constants.ts`. Used for estimated cost tracking in session records.

---

## Configuration Files

| File                                                                | Purpose                                  |
| ------------------------------------------------------------------- | ---------------------------------------- |
| `src/modules/ai/ai.constants.ts`                                    | Connector priority, default model, costs |
| `src/modules/ai/ai.enums.ts`                                        | AiProvider, AiResponseModel enums        |
| `src/modules/ai/ai.utilities.ts`                                    | Routing helpers, response builders       |
| `src/modules/ai/ai.service.ts`                                      | Core routing and execution logic         |
| `src/modules/connectors/services/bedrock.service.ts`                | Bedrock invocation                       |
| `src/modules/connectors/services/llm-apis.service.ts`               | LLM API invocation                       |
| `src/modules/connectors/services/openclaw-gateway.service.ts`       | OpenClaw Gateway invocation              |
| `src/modules/connectors/llm-connectors/llm-connectors.service.ts`   | Dynamic LLM connector management         |
| `src/modules/connectors/llm-connectors/llm-connectors.constants.ts` | Fixed AI connector labels                |
| `src/common/enums/connector-type.enum.ts`                           | ConnectorType enum                       |

---

## Related Documentation

- [AI Automation System](./AI-AUTOMATION.md) -- Full agent catalog and execution flows
- [Adding Connectors](./adding-connectors.md) -- How to add new connector types
