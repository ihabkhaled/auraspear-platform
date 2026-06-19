import { Injectable, Logger } from '@nestjs/common'
import { USAGE_BUDGET_SERVICE_CLASS_NAME } from './usage-budget.constants'
import { UsageBudgetRepository } from './usage-budget.repository'
import {
  buildDailyUsage,
  buildMonthlyUsageResponse,
  buildUsageByModel,
  buildUsageByUser,
  buildUsageSummaryResponse,
  projectMonthEndCost,
} from './usage-budget.utilities'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../../common/enums'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import {
  addDuration,
  dayOfMonth,
  daysInMonth,
  getYearMonth,
  startOf,
} from '../../../common/utils/date-time.utility'
import { FeatureCatalogService } from '../feature-catalog/feature-catalog.service'
import type {
  BudgetAlertInput,
  BudgetAlertRecord,
  BudgetCheckResult,
  CostRateInput,
  CostRateRecord,
  FinopsDashboardResponse,
  MonthlyUsageResponse,
  RecordUsageInput,
  UsageSummaryResponse,
} from './usage-budget.types'
import type { AiFeatureKey } from '../../../common/enums'

@Injectable()
export class UsageBudgetService {
  private readonly logger = new Logger(UsageBudgetService.name)

  constructor(
    private readonly repository: UsageBudgetRepository,
    private readonly featureCatalogService: FeatureCatalogService,
    private readonly appLogger: AppLoggerService
  ) {}

  async recordUsage(input: RecordUsageInput): Promise<void> {
    await this.repository.insertUsage(input)
    this.appLogger.debug('AI usage recorded', {
      feature: AppLogFeature.AI,
      action: 'recordUsage',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: USAGE_BUDGET_SERVICE_CLASS_NAME,
      functionName: 'recordUsage',
      tenantId: input.tenantId,
      metadata: {
        featureKey: input.featureKey,
        provider: input.provider,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
      },
    })
  }

  async getUsageSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageSummaryResponse> {
    const rows = await this.repository.getUsageSummary(tenantId, startDate, endDate)
    return buildUsageSummaryResponse(tenantId, startDate, endDate, rows)
  }

  async getMonthlyUsage(tenantId: string): Promise<MonthlyUsageResponse> {
    const monthStart = startOf('month')
    const monthEnd = addDuration(monthStart, 1, 'month')
    const { year, month } = getYearMonth()
    const monthLabel = `${String(year)}-${String(month + 1).padStart(2, '0')}`

    const rows = await this.repository.getMonthlyUsage(tenantId, monthStart, monthEnd)
    return buildMonthlyUsageResponse(tenantId, monthLabel, rows.at(0))
  }

  async checkBudget(tenantId: string, featureKey: AiFeatureKey): Promise<BudgetCheckResult> {
    const config = await this.featureCatalogService.getConfig(tenantId, featureKey)

    if (config.monthlyTokenBudget === null) {
      return { allowed: true, used: 0, budget: null }
    }

    const monthStart = startOf('month')
    const monthEnd = addDuration(monthStart, 1, 'month')

    const used = await this.repository.getMonthlyTokenCount(
      tenantId,
      featureKey,
      monthStart,
      monthEnd
    )

    return {
      allowed: used < config.monthlyTokenBudget,
      used,
      budget: config.monthlyTokenBudget,
    }
  }

  /* ── FinOps dashboard ──────────────────────────────────── */

  async getFinopsDashboard(tenantId: string): Promise<FinopsDashboardResponse> {
    const monthStart = startOf('month')
    const monthEnd = addDuration(monthStart, 1, 'month')
    const { year, month } = getYearMonth()
    const monthLabel = `${String(year)}-${String(month + 1).padStart(2, '0')}`

    const [summaryRows, userRows, modelRows, dailyRows, budgetAlerts] = await Promise.all([
      this.repository.getUsageSummary(tenantId, monthStart, monthEnd),
      this.repository.getUsageByUser(tenantId, monthStart, monthEnd),
      this.repository.getUsageByModel(tenantId, monthStart, monthEnd),
      this.repository.getDailyUsage(tenantId, monthStart, monthEnd),
      this.repository.listBudgetAlerts(tenantId),
    ])

    const summary = buildUsageSummaryResponse(tenantId, monthStart, monthEnd, summaryRows)
    const byUser = buildUsageByUser(userRows)
    const byModel = buildUsageByModel(modelRows)
    const dailyTrend = buildDailyUsage(dailyRows)

    const tenantBudget = budgetAlerts.find(a => a.scope === 'tenant' && a.enabled)
    const budgetTotal = tenantBudget?.monthlyBudget ?? null
    const budgetUsedPct =
      budgetTotal !== null && budgetTotal > 0
        ? Math.round((summary.totals.cost / budgetTotal) * 100)
        : null

    const currentDay = dayOfMonth()
    const totalDays = daysInMonth()
    const projectedMonthEnd = projectMonthEndCost(summary.totals.cost, currentDay, totalDays)

    return {
      tenantId,
      month: monthLabel,
      totalCost: summary.totals.cost,
      totalTokens: summary.totals.inputTokens + summary.totals.outputTokens,
      totalRequests: summary.totals.requests,
      budgetTotal,
      budgetUsedPct,
      projectedMonthEnd,
      byFeature: summary.entries,
      byUser,
      byModel,
      dailyTrend,
    }
  }

  /* ── Cost rate management ──────────────────────────────── */

  async listCostRates(tenantId: string): Promise<CostRateRecord[]> {
    return this.repository.listCostRates(tenantId)
  }

  async upsertCostRate(input: CostRateInput): Promise<CostRateRecord> {
    return this.repository.upsertCostRate(input)
  }

  async deleteCostRate(tenantId: string, id: string): Promise<void> {
    await this.repository.deleteCostRate(tenantId, id)
  }

  /* ── Budget alert management ───────────────────────────── */

  async listBudgetAlerts(tenantId: string): Promise<BudgetAlertRecord[]> {
    return this.repository.listBudgetAlerts(tenantId)
  }

  async upsertBudgetAlert(input: BudgetAlertInput): Promise<BudgetAlertRecord> {
    return this.repository.upsertBudgetAlert(input)
  }

  async updateBudgetAlert(
    tenantId: string,
    id: string,
    data: { monthlyBudget?: number; alertThresholds?: string; scope?: string; scopeKey?: string | null }
  ): Promise<BudgetAlertRecord | null> {
    return this.repository.updateBudgetAlert(tenantId, id, data)
  }

  async deleteBudgetAlert(tenantId: string, id: string): Promise<void> {
    await this.repository.deleteBudgetAlert(tenantId, id)
  }

  async toggleBudgetAlert(tenantId: string, id: string, enabled: boolean): Promise<void> {
    await this.repository.toggleBudgetAlert(tenantId, id, enabled)
  }
}
