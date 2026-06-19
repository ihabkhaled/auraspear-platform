import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../../prisma/prisma.service'
import type {
  BudgetAlertInput,
  BudgetAlertRecord,
  CostRateInput,
  CostRateRecord,
  DailyUsageRawRow,
  MonthlyUsageRawRow,
  RecordUsageInput,
  UsageByModelRawRow,
  UsageByUserRawRow,
  UsageSummaryRawRow,
} from './usage-budget.types'

@Injectable()
export class UsageBudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async insertUsage(input: RecordUsageInput): Promise<void> {
    await this.prisma.aiUsageLedger.create({
      data: {
        tenantId: input.tenantId,
        featureKey: input.featureKey,
        provider: input.provider,
        model: input.model,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        estimatedCost: input.estimatedCost,
        userId: input.userId,
      },
    })
  }

  async getUsageSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageSummaryRawRow[]> {
    return this.prisma.$queryRaw<UsageSummaryRawRow[]>`
      SELECT
        feature_key,
        provider,
        COALESCE(SUM(input_tokens), 0)  AS total_input,
        COALESCE(SUM(output_tokens), 0) AS total_output,
        COALESCE(SUM(estimated_cost), 0) AS total_cost,
        COUNT(*)                         AS request_count
      FROM ai_usage_ledger
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${startDate}
        AND created_at <= ${endDate}
      GROUP BY feature_key, provider
      ORDER BY total_cost DESC
    `
  }

  async getMonthlyUsage(
    tenantId: string,
    monthStart: Date,
    monthEnd: Date
  ): Promise<MonthlyUsageRawRow[]> {
    return this.prisma.$queryRaw<MonthlyUsageRawRow[]>`
      SELECT
        COALESCE(SUM(input_tokens), 0)  AS total_input,
        COALESCE(SUM(output_tokens), 0) AS total_output,
        COALESCE(SUM(estimated_cost), 0) AS total_cost,
        COUNT(*)                         AS request_count
      FROM ai_usage_ledger
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${monthStart}
        AND created_at < ${monthEnd}
    `
  }

  async getMonthlyTokenCount(
    tenantId: string,
    featureKey: string,
    monthStart: Date,
    monthEnd: Date
  ): Promise<number> {
    const result = await this.prisma.$queryRaw<Array<{ total: bigint | number }>>`
      SELECT COALESCE(SUM(input_tokens + output_tokens), 0) AS total
      FROM ai_usage_ledger
      WHERE tenant_id = ${tenantId}::uuid
        AND feature_key = ${featureKey}
        AND created_at >= ${monthStart}
        AND created_at < ${monthEnd}
    `
    const row = result.at(0)
    return row ? Number(row.total) : 0
  }

  /* ── FinOps: breakdown queries ─────────────────────────── */

  async getUsageByUser(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageByUserRawRow[]> {
    return this.prisma.$queryRaw<UsageByUserRawRow[]>`
      SELECT
        user_id,
        COALESCE(SUM(input_tokens), 0)  AS total_input,
        COALESCE(SUM(output_tokens), 0) AS total_output,
        COALESCE(SUM(estimated_cost), 0) AS total_cost,
        COUNT(*)                         AS request_count
      FROM ai_usage_ledger
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${startDate}
        AND created_at < ${endDate}
      GROUP BY user_id
      ORDER BY total_cost DESC
      LIMIT 50
    `
  }

  async getUsageByModel(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<UsageByModelRawRow[]> {
    return this.prisma.$queryRaw<UsageByModelRawRow[]>`
      SELECT
        provider,
        model,
        COALESCE(SUM(input_tokens), 0)  AS total_input,
        COALESCE(SUM(output_tokens), 0) AS total_output,
        COALESCE(SUM(estimated_cost), 0) AS total_cost,
        COUNT(*)                         AS request_count
      FROM ai_usage_ledger
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${startDate}
        AND created_at < ${endDate}
      GROUP BY provider, model
      ORDER BY total_cost DESC
    `
  }

  async getDailyUsage(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<DailyUsageRawRow[]> {
    return this.prisma.$queryRaw<DailyUsageRawRow[]>`
      SELECT
        DATE(created_at) AS day,
        COALESCE(SUM(input_tokens), 0)  AS total_input,
        COALESCE(SUM(output_tokens), 0) AS total_output,
        COALESCE(SUM(estimated_cost), 0) AS total_cost,
        COUNT(*)                         AS request_count
      FROM ai_usage_ledger
      WHERE tenant_id = ${tenantId}::uuid
        AND created_at >= ${startDate}
        AND created_at < ${endDate}
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `
  }

  /* ── FinOps: cost rate CRUD ────────────────────────────── */

  async listCostRates(tenantId: string): Promise<CostRateRecord[]> {
    return this.prisma.aiCostRate.findMany({
      where: { tenantId },
      orderBy: { provider: 'asc' },
    })
  }

  async upsertCostRate(input: CostRateInput): Promise<CostRateRecord> {
    return this.prisma.aiCostRate.upsert({
      where: {
        tenantId_provider_model: {
          tenantId: input.tenantId,
          provider: input.provider,
          model: input.model,
        },
      },
      update: {
        inputCostPer1k: input.inputCostPer1k,
        outputCostPer1k: input.outputCostPer1k,
      },
      create: {
        tenantId: input.tenantId,
        provider: input.provider,
        model: input.model,
        inputCostPer1k: input.inputCostPer1k,
        outputCostPer1k: input.outputCostPer1k,
        createdBy: input.createdBy,
      },
    })
  }

  async deleteCostRate(tenantId: string, id: string): Promise<void> {
    await this.prisma.aiCostRate.deleteMany({
      where: { id, tenantId },
    })
  }

  /* ── FinOps: budget alert CRUD ─────────────────────────── */

  async listBudgetAlerts(tenantId: string): Promise<BudgetAlertRecord[]> {
    return this.prisma.aiBudgetAlert.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async upsertBudgetAlert(input: BudgetAlertInput): Promise<BudgetAlertRecord> {
    return this.prisma.aiBudgetAlert.upsert({
      where: {
        tenantId_scope_scopeKey: {
          tenantId: input.tenantId,
          scope: input.scope,
          scopeKey: input.scopeKey ?? '',
        },
      },
      update: {
        monthlyBudget: input.monthlyBudget,
        alertThresholds: input.alertThresholds,
      },
      create: {
        tenantId: input.tenantId,
        scope: input.scope,
        scopeKey: input.scopeKey,
        monthlyBudget: input.monthlyBudget,
        alertThresholds: input.alertThresholds,
        createdBy: input.createdBy,
      },
    })
  }

  async updateBudgetAlert(
    tenantId: string,
    id: string,
    data: { monthlyBudget?: number; alertThresholds?: string; scope?: string; scopeKey?: string | null }
  ): Promise<BudgetAlertRecord | null> {
    const existing = await this.prisma.aiBudgetAlert.findFirst({ where: { id, tenantId } })
    if (!existing) return null
    return this.prisma.aiBudgetAlert.update({
      where: { id },
      data,
    })
  }

  async deleteBudgetAlert(tenantId: string, id: string): Promise<void> {
    await this.prisma.aiBudgetAlert.deleteMany({
      where: { id, tenantId },
    })
  }

  async toggleBudgetAlert(tenantId: string, id: string, enabled: boolean): Promise<void> {
    await this.prisma.aiBudgetAlert.updateMany({
      where: { id, tenantId },
      data: { enabled },
    })
  }
}
