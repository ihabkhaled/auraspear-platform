// Types for the AI Ops workspace summary. Extracted from the service to satisfy
// the no-inline-declarations rule (apps/api CLAUDE.md rule 13 / audit BE-05).

// Raw row shapes returned by $queryRaw calls in ai-ops-workspace.repository.ts
export interface AgentStatsRow {
  total: bigint
  online: bigint
}

export interface JobRunStatsRow {
  total: bigint
  success: bigint
  failure: bigint
}

export interface FindingsStatsRow {
  total: bigint
  proposed: bigint
  applied: bigint
  dismissed: bigint
  high_confidence: bigint
}

export interface ChatStatsRow {
  total_threads: bigint
  total_messages: bigint
  legal_hold: bigint
}

export interface UsageStatsRow {
  total_tokens: bigint
  estimated_cost: number
  requests: bigint
}

export interface AuditStatsRow {
  total: bigint
  actors: bigint
}

export interface AiOpsWorkspaceRawData {
  agentStats: AgentStatsRow[]
  sessions24h: number
  jobRuns24h: JobRunStatsRow[]
  approvalsPending: number
  findingsStats: FindingsStatsRow[]
  chatStats: ChatStatsRow[]
  usageStats: UsageStatsRow[]
  auditStats: AuditStatsRow[]
  recentFindings: Array<{
    id: string
    findingType: string
    title: string | null
    status: string
    agentId: string | null
    sourceModule: string | null
    createdAt: Date
  }>
  recentJobs: Array<{
    id: string
    jobKey: string
    status: string
    agentId: string | null
    sourceModule: string | null
    createdAt: Date
  }>
}

export interface AiOpsWorkspace {
  agents: {
    total: number
    online: number
    totalSessions24h: number
  }
  orchestration: {
    dispatches24h: number
    success24h: number
    failures24h: number
    pendingApprovals: number
  }
  findings: {
    total: number
    proposed: number
    applied: number
    dismissed: number
    highConfidence: number
  }
  chat: {
    totalThreads: number
    totalMessages: number
    legalHoldCount: number
  }
  usage24h: {
    totalTokens: number
    estimatedCost: number
    requests: number
  }
  audit: {
    totalLogs24h: number
    uniqueActors24h: number
  }
  recentActivity: AiOpsRecentItem[]
}

export interface AiOpsRecentItem {
  id: string
  type: string
  title: string
  status: string
  agentId: string | null
  sourceModule: string | null
  createdAt: Date
}
