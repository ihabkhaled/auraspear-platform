import type { AiAuditStatus, AiFeatureKey, ConnectorType } from '../../common/enums'

export interface AiTokenUsage {
  input: number
  output: number
}

export interface AiResponse {
  result: string
  reasoning: string[]
  confidence: number
  model: string
  provider: string
  tokensUsed: AiTokenUsage
}

export interface ResolvedAiConnector {
  type: ConnectorType
  id?: string
  name?: string
  config: Record<string, unknown>
}

export interface AiToolSummary {
  name: string
  description: string
}

export interface AgentTaskPromptParameters {
  agentName: string
  prompt: string
  soulMd?: string | null
  tools: AiToolSummary[]
}

export interface AgentTaskResponseParameters {
  agentName: string
  prompt: string
  tools: AiToolSummary[]
}

export interface AgentTaskExecutionInput {
  tenantId: string
  actorUserId: string
  actorEmail: string
  agentId: string
  agentName: string
  model: string
  prompt: string
  soulMd?: string | null
  tools: AiToolSummary[]
  connector?: string
}

export interface AiAuditRecord {
  id: string
  tenantId: string
  userId: string
  action: string
  model: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
  status: AiAuditStatus
  createdAt: string
  prompt?: string
  response?: string
}

export interface ExecuteAiTaskInput {
  tenantId: string
  userId: string
  userEmail: string
  featureKey: AiFeatureKey
  context: Record<string, unknown>
  connector?: string
}

export interface CreateAiAuditLogData {
  tenantId: string
  actor: string
  action: string
  model: string
  inputTokens: number
  outputTokens: number
  durationMs: number
  prompt?: string
  response?: string
}

export interface QuotaCheckResult {
  allowed: boolean
  period?: string
  used?: number
  limit?: number
}

export interface ConnectorFilterInput {
  connector: string | undefined
  connectors: ResolvedAiConnector[]
}

export interface FilteredConnectorsResult {
  connectors: ResolvedAiConnector[]
  connectorRequested: boolean
}
