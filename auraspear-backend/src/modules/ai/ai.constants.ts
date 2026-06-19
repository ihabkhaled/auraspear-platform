import { AiAgentId, ConnectorType } from '../../common/enums'

export const AI_DEFAULT_MODEL = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0'
export const AI_FALLBACK_MODEL = 'rule-based'
export const AI_BEDROCK_MAX_TOKENS = 2048
export const AI_LLM_APIS_MAX_TOKENS = 2048
export const AI_OPENCLAW_MAX_TOKENS = 2048
export const AI_EXPLAIN_LATENCY_OFFSET_MS = 900
/** Cost per 1 000 input tokens (USD) — Bedrock Claude 3 Sonnet pricing. */
export const AI_COST_PER_1K_INPUT_TOKENS = 0.003
/** Cost per 1 000 output tokens (USD) — Bedrock Claude 3 Sonnet pricing. */
export const AI_COST_PER_1K_OUTPUT_TOKENS = 0.015

/** Priority order for AI connector resolution. */
export const AI_CONNECTOR_PRIORITY: ConnectorType[] = [
  ConnectorType.BEDROCK,
  ConnectorType.LLM_APIS,
  ConnectorType.OPENCLAW_GATEWAY,
]

/** Display names for English error messages (logs/devtools only) */
export const AGENT_DISPLAY_NAMES: Record<string, string> = {
  [AiAgentId.ORCHESTRATOR]: 'Orchestrator',
  [AiAgentId.L1_ANALYST]: 'L1 SOC Analyst',
  [AiAgentId.L2_ANALYST]: 'L2 SOC Analyst',
  [AiAgentId.THREAT_HUNTER]: 'Threat Hunter',
  [AiAgentId.RULES_ANALYST]: 'Rules Analyst',
  [AiAgentId.NORM_VERIFIER]: 'Normalization Verifier',
  [AiAgentId.DASHBOARD_BUILDER]: 'Dashboard Builder',
}

export const AI_EXPLAIN_REASONING = [
  'Parsing the security concept or finding to explain',
  'Breaking down technical details into analyst-friendly language',
  'Mapping to MITRE ATT&CK tactics, techniques, and procedures',
  'Providing contextual examples relevant to the environment',
  'Including remediation guidance and best practices',
] as const
