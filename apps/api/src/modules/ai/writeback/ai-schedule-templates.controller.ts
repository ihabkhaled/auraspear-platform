import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import { buildPaginationMeta } from '../../../common/interfaces/pagination.interface'
import { daysAgo } from '../../../common/utils/date-time.utility'
import { PrismaService } from '../../../prisma/prisma.service'
import type { PaginatedResponse } from '../../../common/interfaces/pagination.interface'
import type { AiJobRunSummary, AiScheduleTemplate } from '@prisma/client'

@Controller('ai')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AiScheduleTemplatesController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /ai/schedule-templates
   * List all 37 schedule templates (system-wide, not tenant-scoped).
   */
  @Get('schedule-templates')
  @RequirePermission(Permission.AI_CONFIG_VIEW)
  async listTemplates(): Promise<AiScheduleTemplate[]> {
    return this.prisma.aiScheduleTemplate.findMany({
      orderBy: [{ sourceModule: 'asc' }, { jobKey: 'asc' }],
    })
  }

  /**
   * GET /ai/job-runs
   * List AI job run summaries with filters, tenant-scoped, paginated.
   */
  @Get('job-runs')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async listJobRuns(
    @TenantId() tenantId: string,
    @Query('page') rawPage?: string,
    @Query('limit') rawLimit?: string,
    @Query('jobKey') jobKey?: string,
    @Query('agentId') agentId?: string,
    @Query('status') status?: string,
    @Query('sourceModule') sourceModule?: string
  ): Promise<PaginatedResponse<AiJobRunSummary>> {
    const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(rawLimit ?? '20', 10) || 20))

    const where: Record<string, unknown> = { tenantId }
    if (jobKey) {
      where['jobKey'] = jobKey
    }
    if (agentId) {
      where['agentId'] = agentId
    }
    if (status) {
      where['status'] = status
    }
    if (sourceModule) {
      where['sourceModule'] = sourceModule
    }

    const [data, total] = await Promise.all([
      this.prisma.aiJobRunSummary.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.aiJobRunSummary.count({ where }),
    ])

    return {
      data,
      pagination: buildPaginationMeta(page, limit, total),
    }
  }

  /**
   * GET /ai/job-health/summary
   * Aggregate job health metrics for the current tenant.
   */
  @Get('job-health/summary')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async jobHealthSummary(@TenantId() tenantId: string): Promise<{
    totalRuns: number
    completed: number
    failed: number
    avgDurationMs: number
    uniqueAgents: number
  }> {
    const since = daysAgo(1)

    const [totalRuns, completed, failed, avgResult, uniqueAgents] = await Promise.all([
      this.prisma.aiJobRunSummary.count({ where: { tenantId, createdAt: { gte: since } } }),
      this.prisma.aiJobRunSummary.count({
        where: { tenantId, status: 'completed', createdAt: { gte: since } },
      }),
      this.prisma.aiJobRunSummary.count({
        where: { tenantId, status: 'failed', createdAt: { gte: since } },
      }),
      this.prisma.aiJobRunSummary.aggregate({
        where: { tenantId, createdAt: { gte: since }, durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
      this.prisma.aiJobRunSummary
        .findMany({
          where: { tenantId, createdAt: { gte: since }, agentId: { not: null } },
          distinct: ['agentId'],
          select: { agentId: true },
        })
        .then(rows => rows.length),
    ])

    return {
      totalRuns,
      completed,
      failed,
      avgDurationMs: Math.round(avgResult._avg.durationMs ?? 0),
      uniqueAgents,
    }
  }
}
