import { Injectable } from '@nestjs/common'
import { KnowledgeRepository } from './knowledge.repository'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { AiService } from '../ai/ai.service'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiKnowledgeService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly knowledgeRepository: KnowledgeRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.KNOWLEDGE, 'AiKnowledgeService')
  }

  async generateRunbook(
    tenantId: string,
    userId: string,
    userEmail: string,
    description: string,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-generate-runbook', tenantId, {
      descriptionLength: description.length,
      actorUserId: userId,
      actorEmail: userEmail,
    })

    try {
      const result = await this.aiService.executeAiTask({
        tenantId,
        userId,
        userEmail,
        featureKey: AiFeatureKey.KNOWLEDGE_GENERATE_RUNBOOK,
        context: { description },
        connector,
      })

      this.log.success('ai-generate-runbook', tenantId, {
        model: result.model,
        actorUserId: userId,
        actorEmail: userEmail,
      })
      return result
    } catch (error: unknown) {
      this.log.error('ai-generate-runbook', tenantId, error, {
        actorUserId: userId,
        actorEmail: userEmail,
      })
      throw error
    }
  }

  async searchWithAi(
    tenantId: string,
    userId: string,
    userEmail: string,
    query: string,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-search', tenantId, {
      queryLength: query.length,
      actorUserId: userId,
      actorEmail: userEmail,
    })

    try {
      const existingRunbooks = await this.knowledgeRepository.search(tenantId, query, 20)
      const runbookTitles = existingRunbooks.map(r => r.title)

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId,
        userEmail,
        featureKey: AiFeatureKey.KNOWLEDGE_SEARCH,
        context: { query, existingRunbooks: JSON.stringify(runbookTitles) },
        connector,
      })

      this.log.success('ai-search', tenantId, {
        matchedRunbooks: existingRunbooks.length,
        model: result.model,
        actorUserId: userId,
        actorEmail: userEmail,
      })
      return result
    } catch (error: unknown) {
      this.log.error('ai-search', tenantId, error, {
        actorUserId: userId,
        actorEmail: userEmail,
      })
      throw error
    }
  }
}
