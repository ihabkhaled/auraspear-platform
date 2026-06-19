import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type { Job, Prisma } from '@prisma/client'

@Injectable()
export class OrchestratorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async countJobsSince(tenantId: string, since: Date, status?: string): Promise<number> {
    const where: Prisma.JobWhereInput = {
      tenantId,
      type: 'ai_agent_task',
      createdAt: { gte: since },
    }
    if (status) {
      where.status = status as Prisma.EnumJobStatusFilter
    }
    return this.prisma.job.count({ where })
  }

  async countActiveAgentConfigs(tenantId: string): Promise<number> {
    return this.prisma.tenantAgentConfig.count({
      where: { tenantId, isEnabled: true },
    })
  }

  async countTotalAgentConfigs(tenantId: string): Promise<number> {
    return this.prisma.tenantAgentConfig.count({
      where: { tenantId },
    })
  }

  async countPendingApprovals(tenantId: string): Promise<number> {
    return this.prisma.aiApprovalRequest.count({
      where: { tenantId, status: 'pending' },
    })
  }

  async findJobsByAgent(
    tenantId: string,
    agentId: string,
    params: {
      skip: number
      take: number
      orderBy: Prisma.JobOrderByWithRelationInput
      status?: string
    }
  ): Promise<Job[]> {
    const where: Prisma.JobWhereInput = {
      tenantId,
      type: 'ai_agent_task',
      payload: { path: ['agentId'], equals: agentId },
    }
    if (params.status) {
      where.status = params.status as Prisma.EnumJobStatusFilter
    }
    return this.prisma.job.findMany({
      where,
      skip: params.skip,
      take: params.take,
      orderBy: params.orderBy,
    })
  }

  async countJobsByAgent(tenantId: string, agentId: string, status?: string): Promise<number> {
    const where: Prisma.JobWhereInput = {
      tenantId,
      type: 'ai_agent_task',
      payload: { path: ['agentId'], equals: agentId },
    }
    if (status) {
      where.status = status as Prisma.EnumJobStatusFilter
    }
    return this.prisma.job.count({ where })
  }
}
