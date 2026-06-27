// Types for the agent graph service. Extracted from the service to satisfy
// the no-inline-declarations rule (apps/api CLAUDE.md rule 13 / audit BE-05).

export interface AgentGraphNode {
  agentId: string
  displayName: string
  isEnabled: boolean
  isCore: boolean
  executionAgent: string | null
  schedules: Array<{ id: string; cronExpression: string; isEnabled: boolean }>
  features: string[]
  lastStatus: string | null
  tokenUsage: number
}

export interface ScheduleHealthSummary {
  totalSchedules: number
  enabledSchedules: number
  disabledSchedules: number
  totalAgents: number
  enabledAgents: number
  coreAgents: number
  specialistAgents: number
}
