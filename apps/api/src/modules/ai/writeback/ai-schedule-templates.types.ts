export interface AiJobHealthSummary {
  totalRuns: number
  completed: number
  failed: number
  avgDurationMs: number
  uniqueAgents: number
}

export interface AiJobRunFilters {
  jobKey?: string
  agentId?: string
  status?: string
  sourceModule?: string
}
