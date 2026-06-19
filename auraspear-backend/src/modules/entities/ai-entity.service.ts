import { Injectable } from '@nestjs/common'
import { EntitiesRepository } from './entities.repository'
import { RiskScoringService } from './risk-scoring.service'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { toIso } from '../../common/utils/date-time.utility'
import { AiService } from '../ai/ai.service'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiEntityService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly entitiesRepository: EntitiesRepository,
    private readonly riskScoringService: RiskScoringService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.ENTITIES, 'AiEntityService')
  }

  async explainRisk(entityId: string, tenantId: string, user: JwtPayload): Promise<AiResponse> {
    this.log.entry('ai-explain-risk', tenantId, {
      entityId,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const entity = await this.entitiesRepository.findFirstByIdAndTenant(entityId, tenantId)
      if (!entity) {
        throw new BusinessException(404, 'Entity not found', 'errors.entities.notFound')
      }

      const context = await this.buildRiskContext(entityId, tenantId, entity)

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: AiFeatureKey.ENTITY_RISK_EXPLAIN,
        context,
      })

      this.log.success('ai-explain-risk', tenantId, {
        entityId,
        entityType: entity.type,
        model: result.model,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      return result
    } catch (error: unknown) {
      if (error instanceof BusinessException) {
        throw error
      }
      this.log.error('ai-explain-risk', tenantId, error, {
        entityId,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }

  private async buildRiskContext(
    entityId: string,
    tenantId: string,
    entity: NonNullable<Awaited<ReturnType<EntitiesRepository['findFirstByIdAndTenant']>>>
  ): Promise<Record<string, unknown>> {
    const breakdown = await this.riskScoringService.getEntityRiskBreakdown(entityId, tenantId)
    const relations = await this.entitiesRepository.findRelationsForEntity(entityId, tenantId)

    return {
      entityType: entity.type,
      entityValue: entity.value,
      entityDisplayName: entity.displayName ?? '',
      riskScore: entity.riskScore,
      riskBreakdown: JSON.stringify(breakdown.factors),
      relationCount: relations.length,
      firstSeen: toIso(entity.firstSeen),
      lastSeen: toIso(entity.lastSeen),
      metadata: JSON.stringify(entity.metadata ?? {}).slice(0, 2000),
    }
  }
}
