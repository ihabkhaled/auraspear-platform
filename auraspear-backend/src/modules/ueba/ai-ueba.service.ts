import { Injectable } from '@nestjs/common'
import { UebaRepository } from './ueba.repository'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { toIso } from '../../common/utils/date-time.utility'
import { AiService } from '../ai/ai.service'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiUebaService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly uebaRepository: UebaRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.UEBA, 'AiUebaService')
  }

  async explainAnomaly(
    anomalyId: string,
    tenantId: string,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-explain-anomaly', tenantId, {
      anomalyId,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const anomaly = await this.uebaRepository.findFirstAnomaly({
        where: { id: anomalyId, tenantId },
      })
      if (!anomaly) {
        throw new BusinessException(404, 'UEBA anomaly not found', 'errors.ueba.anomalyNotFound')
      }

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: AiFeatureKey.UEBA_ANOMALY_EXPLAIN,
        context: this.buildAnomalyContext(anomaly),
        connector,
      })

      this.log.success('ai-explain-anomaly', tenantId, {
        anomalyId,
        anomalyType: anomaly.anomalyType,
        model: result.model,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      return result
    } catch (error: unknown) {
      if (error instanceof BusinessException) {
        throw error
      }
      this.log.error('ai-explain-anomaly', tenantId, error, {
        anomalyId,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }

  private buildAnomalyContext(
    anomaly: NonNullable<Awaited<ReturnType<UebaRepository['findFirstAnomaly']>>>
  ): Record<string, unknown> {
    return {
      anomalyType: anomaly.anomalyType,
      description: anomaly.description,
      severity: anomaly.severity,
      score: anomaly.score,
      resolved: anomaly.resolved,
      detectedAt: toIso(anomaly.detectedAt),
      entityName: anomaly.entity.entityName,
      entityType: anomaly.entity.entityType,
    }
  }
}
