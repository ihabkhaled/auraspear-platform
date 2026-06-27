import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type { AiAgentSchedule, AiFeatureConfig, TenantAgentConfig } from '@prisma/client'

@Injectable()
export class AgentGraphRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAgentConfigs(tenantId: string): Promise<TenantAgentConfig[]> {
    return this.prisma.tenantAgentConfig.findMany({
      where: { tenantId },
      orderBy: { agentId: 'asc' },
    })
  }

  async findAgentSchedules(tenantId: string): Promise<AiAgentSchedule[]> {
    return this.prisma.aiAgentSchedule.findMany({
      where: { tenantId },
      orderBy: { agentId: 'asc' },
    })
  }

  async findFeatureConfigs(tenantId: string): Promise<AiFeatureConfig[]> {
    return this.prisma.aiFeatureConfig.findMany({
      where: { tenantId },
    })
  }
}
