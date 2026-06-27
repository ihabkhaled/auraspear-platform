import { Injectable } from '@nestjs/common'
import { buildPaginationMeta } from '../../../common/interfaces/pagination.interface'
import { AiJobRunStatus } from '../../../common/enums'
import { PrismaService } from '../../../prisma/prisma.service'
import type { AiJobRunFilters, AiJobHealthSummary } from './ai-schedule-templates.types'
import type { PaginatedResponse } from '../../../common/interfaces/pagination.interface'
import type { AiJobRunSummary, AiScheduleTemplate } from '@prisma/client'

@Injectable()
export class AiScheduleTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listTemplates(): Promise<AiScheduleTemplate[]> {
    return this.prisma.aiScheduleTemplate.findMany({
      orderBy: [{ sourceModule: 'asc' }, { jobKey: 'asc' }],
    })
  }

  async listJobRuns(
    tenantId: string,
    filters: AiJobRunFilters,
    page: number,
    limit: number
  ): Promise<PaginatedResponse<AiJobRunSummary>> {
    const where: Record<string, unknown> = { tenantId }
    if (filters.jobKey) {
      where['jobKey'] = filters.jobKey
    }
    if (filters.agentId) {
      where['agentId'] = filters.agentId
    }
    if (filters.status) {
      where['status'] = filters.status
    }
    if (filters.sourceModule) {
      where['sourceModule'] = filters.sourceModule
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

  async getJobHealthSummary(tenantId: string, since: Date): Promise<AiJobHealthSummary> {
    const [totalRuns, completed, failed, avgResult, uniqueAgentRows] = await Promise.all([
      this.prisma.aiJobRunSummary.count({ where: { tenantId, createdAt: { gte: since } } }),
      this.prisma.aiJobRunSummary.count({
        where: { tenantId, status: AiJobRunStatus.COMPLETED, createdAt: { gte: since } },
      }),
      this.prisma.aiJobRunSummary.count({
        where: { tenantId, status: AiJobRunStatus.FAILED, createdAt: { gte: since } },
      }),
      this.prisma.aiJobRunSummary.aggregate({
        where: { tenantId, createdAt: { gte: since }, durationMs: { not: null } },
        _avg: { durationMs: true },
      }),
      this.prisma.aiJobRunSummary.findMany({
        where: { tenantId, createdAt: { gte: since }, agentId: { not: null } },
        distinct: ['agentId'],
        select: { agentId: true },
      }),
    ])

    return {
      totalRuns,
      completed,
      failed,
      avgDurationMs: Math.round(avgResult._avg.durationMs ?? 0),
      uniqueAgents: uniqueAgentRows.length,
    }
  }
}
