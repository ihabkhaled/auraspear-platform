import { Injectable } from '@nestjs/common'
import { CasesRepository } from './cases.repository'
import { buildCaseAiContext } from './cases.utilities'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { AiService } from '../ai/ai.service'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiCaseCopilotService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly casesRepository: CasesRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.CASES, 'AiCaseCopilotService')
  }

  async analyzeCase(
    caseId: string,
    tenantId: string,
    taskType: AiFeatureKey,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-analyze-case', tenantId, {
      caseId,
      taskType,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const caseItem = await this.casesRepository.findCaseByIdAndTenant(caseId, tenantId)
      if (!caseItem) {
        throw new BusinessException(404, 'Case not found', 'errors.cases.notFound')
      }

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: taskType,
        context: buildCaseAiContext(caseItem),
        connector,
      })

      this.log.success('ai-analyze-case', tenantId, {
        caseId,
        taskType,
        model: result.model,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      return result
    } catch (error: unknown) {
      if (error instanceof BusinessException) {
        throw error
      }
      this.log.error('ai-analyze-case', tenantId, error, {
        caseId,
        taskType,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }
}
