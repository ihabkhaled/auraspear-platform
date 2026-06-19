import { Injectable, Logger } from '@nestjs/common'
import { BASE_EXISTENCE_SCORE, MAX_RISK_SCORE, RELATION_WEIGHT } from './entities.constants'
import { EntitiesRepository } from './entities.repository'
import {
  getEntityTypeWeight,
  computeRecencyScore,
  buildRiskBreakdownFactors,
  sumFactorScores,
} from './entities.utilities'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import type { EntityRecord, RiskBreakdownResponse } from './entities.types'

@Injectable()
export class RiskScoringService {
  private readonly logger = new Logger(RiskScoringService.name)

  constructor(
    private readonly entitiesRepository: EntitiesRepository,
    private readonly appLogger: AppLoggerService
  ) {}

  calculateRiskScore(entity: EntityRecord, relationCount: number): number {
    let score = BASE_EXISTENCE_SCORE
    score += Math.min(relationCount * RELATION_WEIGHT, 30)
    score += getEntityTypeWeight(entity.type)
    score += computeRecencyScore(entity.lastSeen)
    return Math.min(score, MAX_RISK_SCORE)
  }

  async getEntityRiskBreakdown(entityId: string, tenantId: string): Promise<RiskBreakdownResponse> {
    const entity = await this.entitiesRepository.findFirstByIdAndTenant(entityId, tenantId)

    if (!entity) {
      throw new BusinessException(404, 'Entity not found', 'errors.entities.notFound')
    }

    const relations = await this.entitiesRepository.findRelationsForEntity(entityId, tenantId)

    const factors = buildRiskBreakdownFactors(
      relations.length,
      entity.type,
      entity.lastSeen,
      BASE_EXISTENCE_SCORE,
      RELATION_WEIGHT
    )

    const totalScore = sumFactorScores(factors, MAX_RISK_SCORE)

    this.appLogger.info('Risk breakdown calculated', {
      feature: AppLogFeature.ENTITIES,
      action: 'riskBreakdown',
      outcome: AppLogOutcome.SUCCESS,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'RiskScoringService',
      functionName: 'getEntityRiskBreakdown',
      metadata: { entityId, totalScore },
    })

    return { entityId, totalScore, factors }
  }

  async recalculateForTenant(tenantId: string): Promise<number> {
    const entities = await this.entitiesRepository.findAllByTenant(tenantId)

    const updateResults = await Promise.all(
      entities.map(async entity => {
        const relations = await this.entitiesRepository.findRelationsForEntity(entity.id, tenantId)
        const newScore = this.calculateRiskScore(entity, relations.length)

        if (Math.abs(newScore - entity.riskScore) > 0.01) {
          await this.entitiesRepository.updateRiskScore(entity.id, tenantId, newScore)
          return true
        }
        return false
      })
    )

    const updatedCount = updateResults.filter(Boolean).length

    this.logger.log(
      `Recalculated risk scores for tenant ${tenantId}: ${String(updatedCount)} entities updated`
    )

    return updatedCount
  }
}
