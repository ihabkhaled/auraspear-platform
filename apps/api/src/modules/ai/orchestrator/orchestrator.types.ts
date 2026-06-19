import type { AgentActionType, AgentAutomationMode, AgentRiskLevel } from '../../../common/enums'

export interface DispatchAgentTaskInput {
  tenantId: string
  agentId: string
  actionType: AgentActionType
  payload: Record<string, unknown>
  triggeredBy: string
  connector?: string
}

export interface DispatchAgentTaskResult {
  dispatched: boolean
  jobId: string
  automationMode: AgentAutomationMode
  requiresApproval: boolean
}

export interface CanExecuteResult {
  allowed: boolean
  reason?: string
  messageKey?: string
}

export interface ResolvedAutomationMode {
  mode: AgentAutomationMode
  requiresApproval: boolean
}

export interface ApprovalCheckInput {
  mode: AgentAutomationMode
  riskLevel: AgentRiskLevel
}

export interface OrchestratorDispatchResult {
  jobId: string
  status: string
}

export interface OrchestratorHistoryEntry {
  id: string
  agentId: string
  status: string
  startedAt: string
  completedAt: string | null
  durationMs: number
  tokensUsed: number
  model: string | null
  provider: string | null
  error: string | null
}

export interface OrchestratorStatsResult {
  totalDispatches24h: number
  successCount24h: number
  failureCount24h: number
  pendingApprovals: number
  activeAgents: number
  totalAgents: number
}
