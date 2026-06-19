import { Injectable, Logger } from '@nestjs/common'
import { AI_DASHBOARD_SERVICE_CLASS_NAME } from './dashboards.constants'
import { DashboardsRepository } from './dashboards.repository'
import { AiFeatureKey, AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { daysAgo, toIso } from '../../common/utils/date-time.utility'
import { AiService } from '../ai/ai.service'
import type { ExplainAnomalyInput } from './ai-dashboard.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AiResponse } from '../ai/ai.types'

@Injectable()
export class AiDashboardService {
  private readonly logger = new Logger(AiDashboardService.name)

  constructor(
    private readonly aiService: AiService,
    private readonly dashboardsRepository: DashboardsRepository,
    private readonly appLogger: AppLoggerService
  ) {}

  async explainAnomaly(
    tenantId: string,
    input: ExplainAnomalyInput,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.logAiDashboardAction('explainAnomaly', tenantId, user, { metric: input.metric })

    const changePercent =
      input.previousValue > 0
        ? Math.round(((input.value - input.previousValue) / input.previousValue) * 100)
        : 0

    return this.aiService.executeAiTask({
      tenantId,
      userId: user.sub,
      userEmail: user.email,
      featureKey: AiFeatureKey.DASHBOARD_ANOMALY,
      context: {
        metric: input.metric,
        currentValue: input.value,
        previousValue: input.previousValue,
        changePercent,
        timeRange: input.timeRange,
      },
      connector,
    })
  }

  async generateDailySummary(
    tenantId: string,
    user: JwtPayload,
    connector?: string
  ): Promise<AiResponse> {
    this.logAiDashboardAction('generateDailySummary', tenantId, user)

    const twentyFourHoursAgo = daysAgo(1)

    const [alertsCount, resolvedCount, openCases] = await Promise.all([
      this.dashboardsRepository.countAlertsSince(tenantId, twentyFourHoursAgo),
      this.dashboardsRepository.countResolvedAlertsSince(tenantId, twentyFourHoursAgo),
      this.dashboardsRepository.countOpenCases(tenantId),
    ])

    return this.aiService.executeAiTask({
      tenantId,
      userId: user.sub,
      userEmail: user.email,
      featureKey: AiFeatureKey.REPORT_DAILY_SUMMARY,
      context: {
        alertsLast24h: alertsCount,
        resolvedLast24h: resolvedCount,
        openCases,
        date: toIso().split('T').at(0) ?? '',
      },
      connector,
    })
  }

  private logAiDashboardAction(
    action: string,
    tenantId: string,
    user: JwtPayload,
    metadata?: Record<string, string>
  ): void {
    this.appLogger.info(`AI ${action} requested`, {
      feature: AppLogFeature.DASHBOARD,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: AI_DASHBOARD_SERVICE_CLASS_NAME,
      functionName: action,
      tenantId,
      actorEmail: user.email,
      actorUserId: user.sub,
      metadata,
    })
  }
}
