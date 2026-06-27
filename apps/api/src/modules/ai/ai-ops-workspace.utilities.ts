import type {
  AgentStatsRow,
  AiOpsRecentItem,
  AiOpsWorkspace,
  AiOpsWorkspaceRawData,
  AuditStatsRow,
  ChatStatsRow,
  FindingsStatsRow,
  JobRunStatsRow,
  UsageStatsRow,
} from './ai-ops-workspace.types'

function buildAgentSection(
  row: AgentStatsRow | undefined,
  sessions24h: number
): AiOpsWorkspace['agents'] {
  return {
    total: Number(row?.total ?? 0),
    online: Number(row?.online ?? 0),
    totalSessions24h: sessions24h,
  }
}

function buildOrchestrationSection(
  row: JobRunStatsRow | undefined,
  pendingApprovals: number
): AiOpsWorkspace['orchestration'] {
  return {
    dispatches24h: Number(row?.total ?? 0),
    success24h: Number(row?.success ?? 0),
    failures24h: Number(row?.failure ?? 0),
    pendingApprovals,
  }
}

function buildFindingsSection(row: FindingsStatsRow | undefined): AiOpsWorkspace['findings'] {
  return {
    total: Number(row?.total ?? 0),
    proposed: Number(row?.proposed ?? 0),
    applied: Number(row?.applied ?? 0),
    dismissed: Number(row?.dismissed ?? 0),
    highConfidence: Number(row?.high_confidence ?? 0),
  }
}

function buildChatSection(row: ChatStatsRow | undefined): AiOpsWorkspace['chat'] {
  return {
    totalThreads: Number(row?.total_threads ?? 0),
    totalMessages: Number(row?.total_messages ?? 0),
    legalHoldCount: Number(row?.legal_hold ?? 0),
  }
}

function buildUsageSection(row: UsageStatsRow | undefined): AiOpsWorkspace['usage24h'] {
  return {
    totalTokens: Number(row?.total_tokens ?? 0),
    estimatedCost: Number(row?.estimated_cost ?? 0),
    requests: Number(row?.requests ?? 0),
  }
}

function buildAuditSection(row: AuditStatsRow | undefined): AiOpsWorkspace['audit'] {
  return {
    totalLogs24h: Number(row?.total ?? 0),
    uniqueActors24h: Number(row?.actors ?? 0),
  }
}

function buildRecentActivity(rawData: AiOpsWorkspaceRawData): AiOpsRecentItem[] {
  const findingItems: AiOpsRecentItem[] = rawData.recentFindings.map(finding => ({
    id: finding.id,
    type: 'finding' as const,
    title: finding.title ?? 'Untitled Finding',
    status: finding.status,
    agentId: finding.agentId,
    sourceModule: finding.sourceModule,
    createdAt: finding.createdAt,
  }))
  const jobItems: AiOpsRecentItem[] = rawData.recentJobs.map(jobRun => ({
    id: jobRun.id,
    type: 'job_run' as const,
    title: jobRun.jobKey,
    status: jobRun.status,
    agentId: jobRun.agentId,
    sourceModule: jobRun.sourceModule,
    createdAt: jobRun.createdAt,
  }))
  return [...findingItems, ...jobItems]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 15)
}

export function buildAiOpsWorkspace(rawData: AiOpsWorkspaceRawData): AiOpsWorkspace {
  return {
    agents: buildAgentSection(rawData.agentStats.at(0), rawData.sessions24h),
    orchestration: buildOrchestrationSection(rawData.jobRuns24h.at(0), rawData.approvalsPending),
    findings: buildFindingsSection(rawData.findingsStats.at(0)),
    chat: buildChatSection(rawData.chatStats.at(0)),
    usage24h: buildUsageSection(rawData.usageStats.at(0)),
    audit: buildAuditSection(rawData.auditStats.at(0)),
    recentActivity: buildRecentActivity(rawData),
  }
}
