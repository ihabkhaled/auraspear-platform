import { Injectable, Logger } from '@nestjs/common'
import {
  BASE_EXISTENCE_SCORE,
  MAX_RISK_SCORE,
  RELATION_WEIGHT,
  RISK_SCORE_BATCH_SIZE,
  RISK_SCORE_MAX_ENTITIES,
} from './entities.constants'
import { EntitiesRepository } from './entities.repository'
import {
  getEntityTypeWeight,
  computeRecencyScore,
  buildRiskBreakdownFactors,
  sumFactorScores,
  buildRelationCountMap,
  buildEntitiesToUpdate,
} from './entities.utilities'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { processInBatches } from '../../common/utils/batch.utility'
import type {
  EntityRiskScoringRecord,
  EntityScoreUpdate,
  RiskBreakdownResponse,
} from './entities.types'

@Injectable()
export class RiskScoringService {
  private readonly logger = new Logger(RiskScoringService.name)

  constructor(
    private readonly entitiesRepository: EntitiesRepository,
    private readonly appLogger: AppLoggerService
  ) {}

  calculateRiskScore(entity: EntityRiskScoringRecord, relationCount: number): number {
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
    // Single query for all entity fields the scorer needs — bounded by RISK_SCORE_MAX_ENTITIES.
    const entities = await this.entitiesRepository.findAllForRiskScoring(
      tenantId,
      RISK_SCORE_MAX_ENTITIES
    )

    // Single grouped query for relation counts — replaces N per-entity round trips (PERF-01).
    const countRows = await this.entitiesRepository.countRelationsPerEntity(tenantId)
    const relationCountMap = buildRelationCountMap(countRows)

    // Collect only the entities whose score actually changed.
    const toUpdate = buildEntitiesToUpdate(
      entities,
      relationCountMap,
      this.calculateRiskScore.bind(this)
    )

    // Batch updates in chunks of 50 using Promise.allSettled (rule 36).
    const settled = await processInBatches(
      toUpdate,
      RISK_SCORE_BATCH_SIZE,
      (update: EntityScoreUpdate) =>
        this.entitiesRepository.updateRiskScore(update.id, tenantId, update.score)
    )

    const updatedCount = settled.filter(r => r.status === 'fulfilled').length

    this.logger.log(
      `Recalculated risk scores for tenant ${tenantId}: ${String(updatedCount)} entities updated`
    )

    return updatedCount
  }
}
