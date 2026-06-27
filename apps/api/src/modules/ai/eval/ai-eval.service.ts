import { Injectable, Logger } from '@nestjs/common'
import { AiEvalRepository } from './ai-eval.repository'
import { BusinessException } from '../../../common/exceptions/business.exception'
import type {
  AiEvalRunWithSuiteName,
  AiEvalStatsResponse,
  AiEvalSuiteWithRunCount,
} from './ai-eval.types'
import type { AiEvalRun, AiEvalSuite } from '@prisma/client'

@Injectable()
export class AiEvalService {
  private readonly logger = new Logger(AiEvalService.name)

  constructor(private readonly aiEvalRepository: AiEvalRepository) {}

  async listSuites(tenantId: string): Promise<AiEvalSuiteWithRunCount[]> {
    return this.aiEvalRepository.findManySuites(tenantId)
  }

  async createSuite(
    tenantId: string,
    data: { name: string; description?: string; datasetJson: unknown },
    createdBy: string
  ): Promise<AiEvalSuite> {
    return this.aiEvalRepository.createSuite(tenantId, {
      name: data.name,
      description: data.description ?? null,
      datasetJson: data.datasetJson as object,
      createdBy,
    })
  }

  async deleteSuite(tenantId: string, id: string): Promise<{ success: boolean }> {
    const suite = await this.aiEvalRepository.findSuiteByIdAndTenant(tenantId, id)
    if (!suite) {
      throw new BusinessException(404, 'Suite not found', 'errors.aiEval.suiteNotFound')
    }
    await this.aiEvalRepository.deleteSuiteById(tenantId, id)
    return { success: true }
  }

  async listRuns(tenantId: string, suiteId?: string): Promise<AiEvalRunWithSuiteName[]> {
    return this.aiEvalRepository.findManyRuns(tenantId, suiteId)
  }

  async getRunDetail(tenantId: string, id: string): Promise<AiEvalRunWithSuiteName> {
    const run = await this.aiEvalRepository.findRunByIdAndTenant(tenantId, id)
    if (!run) {
      throw new BusinessException(404, 'Run not found', 'errors.aiEval.runNotFound')
    }
    return run
  }

  async startRun(
    tenantId: string,
    data: { suiteId: string; provider: string; model: string },
    createdBy: string
  ): Promise<AiEvalRun> {
    const suite = await this.aiEvalRepository.findSuiteByIdAndTenant(tenantId, data.suiteId)
    if (!suite) {
      throw new BusinessException(404, 'Suite not found', 'errors.aiEval.suiteNotFound')
    }
    const datasetArray = Array.isArray(suite.datasetJson) ? suite.datasetJson : []
    return this.aiEvalRepository.createRun(tenantId, {
      suiteId: data.suiteId,
      provider: data.provider,
      model: data.model,
      status: 'pending',
      totalCases: datasetArray.length,
      createdBy,
    })
  }

  async getStats(tenantId: string): Promise<AiEvalStatsResponse> {
    const [totalSuites, totalRuns, avgScoreResult, statusCounts] = await Promise.all([
      this.aiEvalRepository.countSuites(tenantId),
      this.aiEvalRepository.countRuns(tenantId),
      this.aiEvalRepository.aggregateAvgScore(tenantId),
      this.aiEvalRepository.groupRunsByStatus(tenantId),
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
