import { Injectable } from '@nestjs/common'
import { DetectionRulesRepository } from './detection-rules.repository'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { AiService } from '../ai/ai.service'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'
import type { DetectionRule } from '@prisma/client'

@Injectable()
export class AiDetectionCopilotService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly detectionRulesRepository: DetectionRulesRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.DETECTION_RULES,
      'AiDetectionCopilotService'
    )
  }

  async analyzeRule(
    ruleId: string,
    tenantId: string,
    taskType: AiFeatureKey,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-analyze-rule', tenantId, {
      ruleId,
      taskType,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const rule = await this.detectionRulesRepository.findByIdAndTenant(ruleId, tenantId)
      if (!rule) {
        throw new BusinessException(
          404,
          'Detection rule not found',
          'errors.detectionRules.notFound'
        )
      }

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: taskType,
        context: this.buildRuleAnalysisContext(rule),
        connector,
      })

      this.log.success('ai-analyze-rule', tenantId, {
        ruleId,
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
      this.log.error('ai-analyze-rule', tenantId, error, {
        ruleId,
        taskType,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }

  private buildRuleAnalysisContext(rule: DetectionRule): Record<string, unknown> {
    return {
      ruleName: rule.name,
      ruleDescription: rule.description ?? '',
      ruleType: rule.ruleType,
      ruleStatus: rule.status,
      ruleSeverity: rule.severity,
      ruleConditions: JSON.stringify(rule.conditions ?? {}).slice(0, 3000),
      ruleActions: JSON.stringify(rule.actions ?? {}).slice(0, 2000),
      hitCount: rule.hitCount,
      falsePositiveCount: rule.falsePositiveCount,
    }
  }

  async draftRule(
    tenantId: string,
    description: string,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-draft-rule', tenantId, {
      descriptionLength: description.length,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: AiFeatureKey.DETECTION_RULE_DRAFT,
        context: { description },
        connector,
      })

      this.log.success('ai-draft-rule', tenantId, {
        model: result.model,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      return result
    } catch (error: unknown) {
      if (error instanceof BusinessException) {
        throw error
      }
      this.log.error('ai-draft-rule', tenantId, error, {
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }
}
