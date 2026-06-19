import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { BusinessException } from '../../../common/exceptions/business.exception'

@Injectable()
export class AiSimulationService {
  private readonly logger = new Logger(AiSimulationService.name)

  constructor(private readonly prisma: PrismaService) {}

  async listSimulations(tenantId: string) {
    return this.prisma.aiSimulation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createSimulation(
    tenantId: string,
    data: { name: string; description?: string; agentId: string; datasetJson: unknown },
    createdBy: string
  ) {
    const datasetArray = Array.isArray(data.datasetJson) ? data.datasetJson : []

    return this.prisma.aiSimulation.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description ?? null,
        agentId: data.agentId,
        datasetJson: data.datasetJson as object,
        totalCases: datasetArray.length,
        createdBy,
      },
    })
  }

  async getSimulation(tenantId: string, id: string) {
    const simulation = await this.prisma.aiSimulation.findFirst({
      where: { id, tenantId },
    })
    if (!simulation) {
      throw new BusinessException(404, 'Simulation not found', 'errors.aiSimulation.notFound')
    }
    return simulation
  }

  async deleteSimulation(tenantId: string, id: string) {
    const simulation = await this.prisma.aiSimulation.findFirst({
      where: { id, tenantId },
    })
    if (!simulation) {
      throw new BusinessException(404, 'Simulation not found', 'errors.aiSimulation.notFound')
    }
    await this.prisma.aiSimulation.delete({ where: { id } })
    return { success: true }
  }

  async getStats(tenantId: string) {
    const [total, statusCounts, avgScoreResult, avgLatencyResult] = await Promise.all([
      this.prisma.aiSimulation.count({ where: { tenantId } }),
      this.prisma.aiSimulation.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
      this.prisma.aiSimulation.aggregate({
        where: { tenantId, avgScore: { not: null } },
        _avg: { avgScore: true },
      }),
      this.prisma.aiSimulation.aggregate({
        where: { tenantId, avgLatencyMs: { not: null } },
        _avg: { avgLatencyMs: true },
      }),
    ])

    const statusMap: Record<string, number> = {}
    for (const entry of statusCounts) {
      statusMap[entry.status] = entry._count.id
    }

    return {
      total,
      pending: statusMap['pending'] ?? 0,
      running: statusMap['running'] ?? 0,
      completed: statusMap['completed'] ?? 0,
      failed: statusMap['failed'] ?? 0,
      avgScore: avgScoreResult._avg.avgScore ?? null,
      avgLatencyMs: avgLatencyResult._avg.avgLatencyMs ?? null,
    }
  }
}
