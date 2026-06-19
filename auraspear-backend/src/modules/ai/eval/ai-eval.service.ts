import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import { BusinessException } from '../../../common/exceptions/business.exception'

@Injectable()
export class AiEvalService {
  private readonly logger = new Logger(AiEvalService.name)

  constructor(private readonly prisma: PrismaService) {}

  async listSuites(tenantId: string) {
    return this.prisma.aiEvalSuite.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    })
  }

  async createSuite(
    tenantId: string,
    data: { name: string; description?: string; datasetJson: unknown },
    createdBy: string
  ) {
    return this.prisma.aiEvalSuite.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description ?? null,
        datasetJson: data.datasetJson as object,
        createdBy,
      },
    })
  }

  async deleteSuite(tenantId: string, id: string) {
    const suite = await this.prisma.aiEvalSuite.findFirst({
      where: { id, tenantId },
    })
    if (!suite) {
      throw new BusinessException(404, 'Suite not found', 'errors.aiEval.suiteNotFound')
    }
    await this.prisma.aiEvalSuite.delete({ where: { id } })
    return { success: true }
  }

  async listRuns(tenantId: string, suiteId?: string) {
    return this.prisma.aiEvalRun.findMany({
      where: {
        tenantId,
        ...(suiteId ? { suiteId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { suite: { select: { name: true } } },
    })
  }

  async getRunDetail(tenantId: string, id: string) {
    const run = await this.prisma.aiEvalRun.findFirst({
      where: { id, tenantId },
      include: { suite: { select: { name: true } } },
    })
    if (!run) {
      throw new BusinessException(404, 'Run not found', 'errors.aiEval.runNotFound')
    }
    return run
  }

  async startRun(
    tenantId: string,
    data: { suiteId: string; provider: string; model: string },
    createdBy: string
  ) {
    const suite = await this.prisma.aiEvalSuite.findFirst({
      where: { id: data.suiteId, tenantId },
    })
    if (!suite) {
      throw new BusinessException(404, 'Suite not found', 'errors.aiEval.suiteNotFound')
    }

    const datasetArray = Array.isArray(suite.datasetJson) ? suite.datasetJson : []

    return this.prisma.aiEvalRun.create({
      data: {
        tenantId,
        suiteId: data.suiteId,
        provider: data.provider,
        model: data.model,
        status: 'pending',
        totalCases: datasetArray.length,
        createdBy,
      },
    })
  }

  async getStats(tenantId: string) {
    const [totalSuites, totalRuns, avgScoreResult, statusCounts] = await Promise.all([
      this.prisma.aiEvalSuite.count({ where: { tenantId } }),
      this.prisma.aiEvalRun.count({ where: { tenantId } }),
      this.prisma.aiEvalRun.aggregate({
        where: { tenantId, avgScore: { not: null } },
        _avg: { avgScore: true },
      }),
      this.prisma.aiEvalRun.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { id: true },
      }),
    ])

    const statusMap: Record<string, number> = {}
    for (const entry of statusCounts) {
      statusMap[entry.status] = entry._count.id
    }

    return {
      totalSuites,
      totalRuns,
      avgScore: avgScoreResult._avg.avgScore ?? null,
      pendingRuns: statusMap['pending'] ?? 0,
      completedRuns: statusMap['completed'] ?? 0,
      failedRuns: statusMap['failed'] ?? 0,
    }
  }
}
