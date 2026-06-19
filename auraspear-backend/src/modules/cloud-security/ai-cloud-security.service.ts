import { Injectable } from '@nestjs/common'
import { CloudSecurityRepository } from './cloud-security.repository'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { toIso } from '../../common/utils/date-time.utility'
import { AiService } from '../ai/ai.service'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiCloudSecurityService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly cloudSecurityRepository: CloudSecurityRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(
      this.appLogger,
      AppLogFeature.CLOUD_SECURITY,
      'AiCloudSecurityService'
    )
  }

  async triageFinding(
    findingId: string,
    tenantId: string,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-triage-finding', tenantId, {
      findingId,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const finding = await this.cloudSecurityRepository.findFirstFinding({
        id: findingId,
        tenantId,
      })
      if (!finding) {
        throw new BusinessException(
          404,
          'Cloud finding not found',
          'errors.cloudSecurity.findingNotFound'
        )
      }

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: AiFeatureKey.CLOUD_FINDING_TRIAGE,
        context: this.buildFindingContext(finding),
        connector,
      })

      this.log.success('ai-triage-finding', tenantId, {
        findingId,
        model: result.model,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      return result
    } catch (error: unknown) {
      if (error instanceof BusinessException) {
        throw error
      }
      this.log.error('ai-triage-finding', tenantId, error, {
        findingId,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }

  private buildFindingContext(
    finding: NonNullable<Awaited<ReturnType<CloudSecurityRepository['findFirstFinding']>>>
  ): Record<string, unknown> {
    return {
      resourceType: finding.resourceType,
      resourceId: finding.resourceId,
      severity: finding.severity,
      title: finding.title,
      description: finding.description ?? '',
      status: finding.status,
      remediationSteps: finding.remediationSteps ?? '',
      detectedAt: toIso(finding.detectedAt),
    }
  }
}
