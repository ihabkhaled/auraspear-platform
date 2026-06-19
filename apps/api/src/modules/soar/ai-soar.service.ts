import { Injectable } from '@nestjs/common'
import { SoarRepository } from './soar.repository'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { AiService } from '../ai/ai.service'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiSoarService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly soarRepository: SoarRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.SOAR, 'AiSoarService')
  }

  async draftPlaybook(
    tenantId: string,
    user: JwtPayload,
    description: string,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-draft-playbook', tenantId, {
      descriptionLength: description.length,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const context = await this.buildDraftContext(tenantId, description)

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: AiFeatureKey.SOAR_PLAYBOOK_DRAFT,
        context,
        connector,
      })

      this.log.success('ai-draft-playbook', tenantId, {
        model: result.model,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      return result
    } catch (error: unknown) {
      this.log.error('ai-draft-playbook', tenantId, error, {
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }

  private async buildDraftContext(
    tenantId: string,
    description: string
  ): Promise<Record<string, unknown>> {
    const existingPlaybooks = await this.soarRepository.findManyPlaybooksWithTenant({
      where: { tenantId },
      skip: 0,
      take: 10,
      orderBy: { createdAt: 'desc' },
    })

    return {
      description,
      existingPlaybooks: existingPlaybooks.map(p => ({
        name: p.name,
        triggerType: p.triggerType,
        status: p.status,
      })),
    }
  }
}
