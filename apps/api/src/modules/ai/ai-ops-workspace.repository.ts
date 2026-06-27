import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import type {
  AgentStatsRow,
  AiOpsWorkspaceRawData,
  AuditStatsRow,
  ChatStatsRow,
  FindingsStatsRow,
  JobRunStatsRow,
  UsageStatsRow,
} from './ai-ops-workspace.types'

@Injectable()
export class AiOpsWorkspaceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async fetchWorkspaceData(tenantId: string, dayAgo: Date): Promise<AiOpsWorkspaceRawData> {
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
      this.prisma.$queryRaw<AgentStatsRow[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'online' THEN 1 END) AS online
        FROM ai_agents WHERE tenant_id = ${tenantId}::uuid
      `,
      this.prisma.aiAgentSession.count({
        where: { tenantId, startedAt: { gte: dayAgo } },
      }),
      this.prisma.$queryRaw<JobRunStatsRow[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) AS success,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) AS failure
        FROM ai_job_run_summaries
        WHERE tenant_id = ${tenantId}::uuid AND created_at >= ${dayAgo}
      `,
      this.prisma.aiApprovalRequest.count({
        where: { tenantId, status: 'pending' },
      }),
      this.prisma.$queryRaw<FindingsStatsRow[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN status = 'proposed' THEN 1 END) AS proposed,
          COUNT(CASE WHEN status = 'applied' THEN 1 END) AS applied,
          COUNT(CASE WHEN status = 'dismissed' THEN 1 END) AS dismissed,
          COUNT(CASE WHEN confidence_score >= 0.8 THEN 1 END) AS high_confidence
        FROM ai_execution_findings
        WHERE tenant_id = ${tenantId}::uuid
      `,
      this.prisma.$queryRaw<ChatStatsRow[]>`
        SELECT
          COUNT(*) AS total_threads,
          COALESCE(SUM(message_count), 0) AS total_messages,
          COUNT(CASE WHEN legal_hold = true THEN 1 END) AS legal_hold
        FROM ai_chat_threads
        WHERE tenant_id = ${tenantId}::uuid
      `,
      this.prisma.$queryRaw<UsageStatsRow[]>`
        SELECT
          COALESCE(SUM(input_tokens + output_tokens), 0) AS total_tokens,
          COALESCE(SUM(estimated_cost), 0) AS estimated_cost,
          COUNT(*) AS requests
        FROM ai_usage_ledger
        WHERE tenant_id = ${tenantId}::uuid AND created_at >= ${dayAgo}
      `,
      this.prisma.$queryRaw<AuditStatsRow[]>`
        SELECT
          COUNT(*) AS total,
          COUNT(DISTINCT actor) AS actors
        FROM ai_audit_logs
        WHERE tenant_id = ${tenantId}::uuid AND created_at >= ${dayAgo}
      `,
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

    return {
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
    }
  }
}
