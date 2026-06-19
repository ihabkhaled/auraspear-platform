import { Injectable } from '@nestjs/common'
import { NormalizationService } from './normalization.service'
import { extractPipelineSteps } from './normalization.utilities'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { AiService } from '../ai/ai.service'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiNormalizationService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly normalizationService: NormalizationService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.NORMALIZATION,
      'AiNormalizationService'
    )
  }

  async verifyPipeline(
    tenantId: string,
    userId: string,
    userEmail: string,
    pipelineId: string,
    sampleEvents: Record<string, unknown>[],
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-verify-pipeline', tenantId, {
      pipelineId,
      sampleEventCount: sampleEvents.length,
      actorUserId: userId,
      actorEmail: userEmail,
    })

    try {
      const pipeline = await this.normalizationService.getPipelineById(pipelineId, tenantId)
      const { normalizedEvents } = await this.normalizationService.dryRunPipeline(
        pipelineId,
        tenantId,
        sampleEvents,
        userEmail
      )

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId,
        userEmail,
        featureKey: AiFeatureKey.NORMALIZATION_VERIFY,
        context: this.buildVerifyContext(pipeline, sampleEvents, normalizedEvents),
        connector,
      })

      this.log.success('ai-verify-pipeline', tenantId, {
        pipelineId,
        normalizedCount: normalizedEvents.length,
        model: result.model,
        actorUserId: userId,
        actorEmail: userEmail,
      })
      return result
    } catch (error: unknown) {
      this.log.error('ai-verify-pipeline', tenantId, error, {
        pipelineId,
        actorUserId: userId,
        actorEmail: userEmail,
      })
      throw error
    }
  }

  private buildVerifyContext(
    pipeline: { name: string; parserConfig: unknown; fieldMappings: unknown },
    sampleEvents: Record<string, unknown>[],
    normalizedEvents: Record<string, unknown>[]
  ): Record<string, unknown> {
    const steps = extractPipelineSteps(
      pipeline.parserConfig as Record<string, unknown>,
      pipeline.fieldMappings as Record<string, unknown>
    )
    return {
      pipelineName: pipeline.name,
      pipelineConfig: JSON.stringify(steps),
      sampleEvents: JSON.stringify(sampleEvents.slice(0, 5)),
      normalizedOutput: JSON.stringify(normalizedEvents.slice(0, 5)),
    }
  }
}
