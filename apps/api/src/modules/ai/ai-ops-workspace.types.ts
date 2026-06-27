// Types for the AI Ops workspace summary. Extracted from the service to satisfy
// the no-inline-declarations rule (apps/api CLAUDE.md rule 13 / audit BE-05).

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
