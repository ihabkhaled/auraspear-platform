import { Injectable } from '@nestjs/common'
import { AttackPathsRepository } from './attack-paths.repository'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { toIso } from '../../common/utils/date-time.utility'
import { AiService } from '../ai/ai.service'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiAttackPathService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly attackPathsRepository: AttackPathsRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.ATTACK_PATHS, 'AiAttackPathService')
  }

  async summarize(
    pathId: string,
    tenantId: string,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-summarize-attack-path', tenantId, {
      pathId,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const attackPath = await this.attackPathsRepository.findFirst({ id: pathId, tenantId })
      if (!attackPath) {
        throw new BusinessException(404, 'Attack path not found', 'errors.attackPaths.notFound')
      }

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: AiFeatureKey.ATTACK_PATH_SUMMARIZE,
        context: this.buildAttackPathContext(attackPath),
        connector,
      })

      this.log.success('ai-summarize-attack-path', tenantId, {
        pathId,
        model: result.model,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      return result
    } catch (error: unknown) {
      if (error instanceof BusinessException) {
        throw error
      }
      this.log.error('ai-summarize-attack-path', tenantId, error, {
        pathId,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }

  private buildAttackPathContext(
    attackPath: NonNullable<Awaited<ReturnType<AttackPathsRepository['findFirst']>>>
  ): Record<string, unknown> {
    return {
      title: attackPath.title,
      description: attackPath.description ?? '',
      severity: attackPath.severity,
      status: attackPath.status,
      stages: JSON.stringify(attackPath.stages).slice(0, 3000),
      affectedAssets: attackPath.affectedAssets,
      killChainCoverage: attackPath.killChainCoverage,
      mitreTactics: attackPath.mitreTactics.join(', '),
      mitreTechniques: attackPath.mitreTechniques.join(', '),
      detectedAt: toIso(attackPath.detectedAt),
    }
  }
}
