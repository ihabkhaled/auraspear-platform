import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type {
  AiEvalCreateRunData,
  AiEvalCreateSuiteData,
  AiEvalRunStatusCount,
  AiEvalRunWithSuiteName,
  AiEvalSuiteWithRunCount,
} from './ai-eval.types'
import type { AiEvalRun, AiEvalSuite } from '@prisma/client'

@Injectable()
export class AiEvalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManySuites(tenantId: string): Promise<AiEvalSuiteWithRunCount[]> {
    return this.prisma.aiEvalSuite.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { runs: true } } },
    })
  }

  async createSuite(tenantId: string, data: AiEvalCreateSuiteData): Promise<AiEvalSuite> {
    return this.prisma.aiEvalSuite.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        datasetJson: data.datasetJson,
        createdBy: data.createdBy,
      },
    })
  }

  async findSuiteByIdAndTenant(tenantId: string, id: string): Promise<AiEvalSuite | null> {
    return this.prisma.aiEvalSuite.findFirst({
      where: { id, tenantId },
    })
  }

  async deleteSuiteById(tenantId: string, id: string): Promise<void> {
    await this.prisma.aiEvalSuite.deleteMany({ where: { id, tenantId } })
  }

  async findManyRuns(tenantId: string, suiteId?: string): Promise<AiEvalRunWithSuiteName[]> {
    return this.prisma.aiEvalRun.findMany({
      where: {
        tenantId,
        ...(suiteId !== undefined && { suiteId }),
      },
      orderBy: { createdAt: 'desc' },
      include: { suite: { select: { name: true } } },
    })
  }

  async findRunByIdAndTenant(tenantId: string, id: string): Promise<AiEvalRunWithSuiteName | null> {
    return this.prisma.aiEvalRun.findFirst({
      where: { id, tenantId },
      include: { suite: { select: { name: true } } },
    })
  }

  async createRun(tenantId: string, data: AiEvalCreateRunData): Promise<AiEvalRun> {
    return this.prisma.aiEvalRun.create({
      data: {
        tenantId,
        suiteId: data.suiteId,
        provider: data.provider,
        model: data.model,
        status: data.status,
        totalCases: data.totalCases,
        createdBy: data.createdBy,
      },
    })
  }

  async countSuites(tenantId: string): Promise<number> {
    return this.prisma.aiEvalSuite.count({ where: { tenantId } })
  }

  async countRuns(tenantId: string): Promise<number> {
    return this.prisma.aiEvalRun.count({ where: { tenantId } })
  }

  async aggregateAvgScore(tenantId: string): Promise<{ _avg: { avgScore: number | null } }> {
    return this.prisma.aiEvalRun.aggregate({
      where: { tenantId, avgScore: { not: null } },
      _avg: { avgScore: true },
    })
  }

  async groupRunsByStatus(tenantId: string): Promise<AiEvalRunStatusCount[]> {
    const result = await this.prisma.aiEvalRun.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { id: true },
    })
    return result as unknown as AiEvalRunStatusCount[]
  }
}
