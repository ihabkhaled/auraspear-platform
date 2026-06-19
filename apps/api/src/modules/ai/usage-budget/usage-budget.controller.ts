import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { UsageBudgetService } from './usage-budget.service'
import { CurrentUser } from '../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import { nowDate, startOf, toDay } from '../../../common/utils/date-time.utility'
import type {
  BudgetAlertRecord,
  CostRateRecord,
  FinopsDashboardResponse,
  MonthlyUsageResponse,
  UsageSummaryResponse,
} from './usage-budget.types'

@ApiTags('ai-usage')
@ApiBearerAuth()
@Controller('ai-usage')
@UseGuards(AuthGuard, TenantGuard)
export class UsageBudgetController {
  constructor(private readonly usageBudgetService: UsageBudgetService) {}

  @Get()
  @RequirePermission(Permission.AI_FINOPS_VIEW)
  async getUsageSummary(
    @TenantId() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ): Promise<UsageSummaryResponse> {
    const now = nowDate()
    const monthStart = startOf('month')
    const start = startDate ? toDay(startDate).toDate() : monthStart
    const end = endDate ? toDay(endDate).toDate() : now
    return this.usageBudgetService.getUsageSummary(tenantId, start, end)
  }

  @Get('monthly')
  @RequirePermission(Permission.AI_FINOPS_VIEW)
  async getMonthlyUsage(@TenantId() tenantId: string): Promise<MonthlyUsageResponse> {
    return this.usageBudgetService.getMonthlyUsage(tenantId)
  }

  @Get('finops')
  @RequirePermission(Permission.AI_FINOPS_VIEW)
  async getFinopsDashboard(@TenantId() tenantId: string): Promise<FinopsDashboardResponse> {
    return this.usageBudgetService.getFinopsDashboard(tenantId)
  }

  /* ── Cost rate endpoints ───────────────────────────────── */

  @Get('cost-rates')
  @RequirePermission(Permission.AI_FINOPS_VIEW)
  async listCostRates(@TenantId() tenantId: string): Promise<CostRateRecord[]> {
    return this.usageBudgetService.listCostRates(tenantId)
  }

  @Put('cost-rates')
  @RequirePermission(Permission.AI_FINOPS_MANAGE)
  async upsertCostRate(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { provider: string; model: string; inputCostPer1k: number; outputCostPer1k: number }
  ): Promise<CostRateRecord> {
    return this.usageBudgetService.upsertCostRate({
      tenantId,
      provider: body.provider,
      model: body.model,
      inputCostPer1k: body.inputCostPer1k,
      outputCostPer1k: body.outputCostPer1k,
      createdBy: userId,
    })
  }

  @Delete('cost-rates/:id')
  @RequirePermission(Permission.AI_FINOPS_MANAGE)
  async deleteCostRate(
    @TenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<{ success: boolean }> {
    await this.usageBudgetService.deleteCostRate(tenantId, id)
    return { success: true }
  }

  /* ── Budget alert endpoints ────────────────────────────── */

  @Get('budget-alerts')
  @RequirePermission(Permission.AI_FINOPS_VIEW)
  async listBudgetAlerts(@TenantId() tenantId: string): Promise<BudgetAlertRecord[]> {
    return this.usageBudgetService.listBudgetAlerts(tenantId)
  }

  @Put('budget-alerts')
  @RequirePermission(Permission.AI_FINOPS_MANAGE)
  async upsertBudgetAlert(
    @TenantId() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { scope: string; scopeKey?: string; monthlyBudget: number; alertThresholds: string }
  ): Promise<BudgetAlertRecord> {
    return this.usageBudgetService.upsertBudgetAlert({
      tenantId,
      scope: body.scope,
      scopeKey: body.scopeKey ?? null,
      monthlyBudget: body.monthlyBudget,
      alertThresholds: body.alertThresholds,
      createdBy: userId,
    })
  }

  @Patch('budget-alerts/:id')
  @RequirePermission(Permission.AI_FINOPS_MANAGE)
  async updateBudgetAlert(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { scope?: string; scopeKey?: string | null; monthlyBudget?: number; alertThresholds?: string }
  ): Promise<BudgetAlertRecord | null> {
    return this.usageBudgetService.updateBudgetAlert(tenantId, id, body)
  }

  @Delete('budget-alerts/:id')
  @RequirePermission(Permission.AI_FINOPS_MANAGE)
  async deleteBudgetAlert(
    @TenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<{ success: boolean }> {
    await this.usageBudgetService.deleteBudgetAlert(tenantId, id)
    return { success: true }
  }

  @Post('budget-alerts/:id/toggle')
  @RequirePermission(Permission.AI_FINOPS_MANAGE)
  async toggleBudgetAlert(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { enabled: boolean }
  ): Promise<{ success: boolean }> {
    await this.usageBudgetService.toggleBudgetAlert(tenantId, id, body.enabled)
    return { success: true }
  }
}
