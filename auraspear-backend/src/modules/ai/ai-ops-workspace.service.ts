import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

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

@Injectable()
export class AiOpsWorkspaceService {
  private readonly logger = new Logger(AiOpsWorkspaceService.name)

  constructor(private readonly prisma: PrismaService) {}

  async getWorkspace(tenantId: string): Promise<AiOpsWorkspace> {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
      agentStats,
      sessions24h,
      jobRuns24h,
      approvalsPending,
      findingsStats,
      chatStats,
      usageStats,
      auditStats,
      recentFindings,
      recentJobs,
    ] = await Promise.all([
      // Agent counts
      this.prisma.$queryRaw<Array<{ total: bigint; online: bigint }>>`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'online' THEN 1 END) AS online
        FROM ai_agents WHERE tenant_id = ${tenantId}::uuid
      `,
      // Sessions 24h
      this.prisma.aiAgentSession.count({
        where: { tenantId, startedAt: { gte: dayAgo } },
      }),
      // Job runs 24h
      this.prisma.$queryRaw<Array<{ total: bigint; success: bigint; failure: bigint }>>`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) AS success,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failure
        FROM ai_job_run_summaries
        WHERE tenant_id = ${tenantId}::uuid AND created_at >= ${dayAgo}
      `,
      // Pending approvals
      this.prisma.aiApprovalRequest.count({
        where: { tenantId, status: 'pending' },
      }),
      // Findings
      this.prisma.$queryRaw<Array<{
        total: bigint
        proposed: bigint
        applied: bigint
        dismissed: bigint
        high_confidence: bigint
      }>>`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'proposed' THEN 1 END) AS proposed,
          COUNT(CASE WHEN status = 'applied' THEN 1 END) AS applied,
          COUNT(CASE WHEN status = 'dismissed' THEN 1 END) AS dismissed,
          COUNT(CASE WHEN confidence_score >= 0.8 THEN 1 END) AS high_confidence
        FROM ai_execution_findings
        WHERE tenant_id = ${tenantId}::uuid
      `,
      // Chat
      this.prisma.$queryRaw<Array<{
        total_threads: bigint
        total_messages: bigint
        legal_hold: bigint
      }>>`
        SELECT
          COUNT(*) AS total_threads,
          COALESCE(SUM(message_count), 0) AS total_messages,
          COUNT(CASE WHEN legal_hold = true THEN 1 END) AS legal_hold
        FROM ai_chat_threads
        WHERE tenant_id = ${tenantId}::uuid
      `,
      // Usage 24h
      this.prisma.$queryRaw<Array<{
        total_tokens: bigint
        estimated_cost: number
        requests: bigint
      }>>`
        SELECT
          COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens,
          COALESCE(SUM(estimated_cost), 0) AS estimated_cost,
          COUNT(*) AS requests
        FROM ai_usage_ledger
        WHERE tenant_id = ${tenantId}::uuid AND created_at >= ${dayAgo}
      `,
      // Audit 24h
      this.prisma.$queryRaw<Array<{ total: bigint; actors: bigint }>>`
        SELECT
          COUNT(*) AS total,
          COUNT(DISTINCT actor) AS actors
        FROM ai_audit_logs
        WHERE tenant_id = ${tenantId}::uuid AND created_at >= ${dayAgo}
      `,
      // Recent findings (last 10)
      this.prisma.aiExecutionFinding.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          findingType: true,
          title: true,
          status: true,
          agentId: true,
          sourceModule: true,
          createdAt: true,
        },
      }),
      // Recent job runs (last 10)
      this.prisma.aiJobRunSummary.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          jobKey: true,
          status: true,
          agentId: true,
          sourceModule: true,
          createdAt: true,
        },
      }),
    ])

    const agentRow = agentStats.at(0)
    const jobRow = jobRuns24h.at(0)
    const findingRow = findingsStats.at(0)
    const chatRow = chatStats.at(0)
    const usageRow = usageStats.at(0)
    const auditRow = auditStats.at(0)

    const recentActivity: AiOpsRecentItem[] = [
      ...recentFindings.map(f => ({
        id: f.id,
        type: 'finding' as const,
        title: f.title,
        status: f.status,
        agentId: f.agentId,
        sourceModule: f.sourceModule,
        createdAt: f.createdAt,
      })),
      ...recentJobs.map(j => ({
        id: j.id,
        type: 'job_run' as const,
        title: j.jobKey,
        status: j.status,
        agentId: j.agentId,
        sourceModule: j.sourceModule,
        createdAt: j.createdAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 15)

    return {
      agents: {
        total: Number(agentRow?.total ?? 0),
        online: Number(agentRow?.online ?? 0),
        totalSessions24h: sessions24h,
      },
      orchestration: {
        dispatches24h: Number(jobRow?.total ?? 0),
        success24h: Number(jobRow?.success ?? 0),
        failures24h: Number(jobRow?.failure ?? 0),
        pendingApprovals: approvalsPending,
      },
      findings: {
        total: Number(findingRow?.total ?? 0),
        proposed: Number(findingRow?.proposed ?? 0),
        applied: Number(findingRow?.applied ?? 0),
        dismissed: Number(findingRow?.dismissed ?? 0),
        highConfidence: Number(findingRow?.high_confidence ?? 0),
      },
      chat: {
        totalThreads: Number(chatRow?.total_threads ?? 0),
        totalMessages: Number(chatRow?.total_messages ?? 0),
        legalHoldCount: Number(chatRow?.legal_hold ?? 0),
      },
      usage24h: {
        totalTokens: Number(usageRow?.total_tokens ?? 0),
        estimatedCost: Number(usageRow?.estimated_cost ?? 0),
        requests: Number(usageRow?.requests ?? 0),
      },
      audit: {
        totalLogs24h: Number(auditRow?.total ?? 0),
        uniqueActors24h: Number(auditRow?.actors ?? 0),
      },
      recentActivity,
    }
  }
}
