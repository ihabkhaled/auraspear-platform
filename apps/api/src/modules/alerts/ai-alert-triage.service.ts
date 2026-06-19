import { Injectable } from '@nestjs/common'
import { AlertsRepository } from './alerts.repository'
import { AiFeatureKey, AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { toIso } from '../../common/utils/date-time.utility'
import { AiService } from '../ai/ai.service'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiAlertTriageService {
  private readonly log: ServiceLogger

  constructor(
    private readonly aiService: AiService,
    private readonly alertsRepository: AlertsRepository,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.ALERTS, 'AiAlertTriageService')
  }

  async triageAlert(
    alertId: string,
    tenantId: string,
    taskType: AiFeatureKey,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.log.entry('ai-triage-alert', tenantId, {
      alertId,
      taskType,
      actorUserId: user.sub,
      actorEmail: user.email,
    })

    try {
      const alert = await this.alertsRepository.findFirstByIdAndTenant(alertId, tenantId)
      if (!alert) {
        throw new BusinessException(404, 'Alert not found', 'errors.alerts.notFound')
      }

      const result = await this.aiService.executeAiTask({
        tenantId,
        userId: user.sub,
        userEmail: user.email,
        featureKey: taskType,
        context: this.buildAlertContext(alert),
        connector,
      })

      this.log.success('ai-triage-alert', tenantId, {
        alertId,
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
      this.log.error('ai-triage-alert', tenantId, error, {
        alertId,
        taskType,
        actorUserId: user.sub,
        actorEmail: user.email,
      })
      throw error
    }
  }

  private buildAlertContext(
    alert: NonNullable<Awaited<ReturnType<AlertsRepository['findFirstByIdAndTenant']>>>
  ): Record<string, unknown> {
    return {
      alertTitle: alert.title ?? '',
      alertDescription: alert.description ?? '',
      alertSeverity: alert.severity,
      alertSource: alert.source ?? '',
      alertRule: alert.ruleName ?? '',
      alertTimestamp: alert.timestamp ? toIso(alert.timestamp) : '',
      alertRawData: JSON.stringify(alert.rawEvent ?? {}).slice(0, 3000),
    }
  }
}
