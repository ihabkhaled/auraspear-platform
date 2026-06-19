import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardsService } from './dashboards.service'
import { AlertTrendQuerySchema, RecentActivityQuerySchema } from './dto/dashboard-query.dto'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import type {
  AlertTrend,
  DashboardAnalyticsOverview,
  DashboardOperationsOverview,
  DashboardSummary,
  MitreTopTechniques,
  PipelineHealth,
  RecentActivityResponse,
  SeverityDistribution,
  TopTargetedAssets,
} from './dashboards.types'

@ApiTags('dashboards')
@ApiBearerAuth()
@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('summary')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async getSummary(@TenantId() tenantId: string): Promise<DashboardSummary> {
    return this.dashboardsService.getSummary(tenantId)
  }

  @Get('analytics-overview')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async getAnalyticsOverview(@TenantId() tenantId: string): Promise<DashboardAnalyticsOverview> {
    return this.dashboardsService.getAnalyticsOverview(tenantId)
  }

  @Get('operations-overview')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async getOperationsOverview(@TenantId() tenantId: string): Promise<DashboardOperationsOverview> {
    return this.dashboardsService.getOperationsOverview(tenantId)
  }

  @Get('alert-trend')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async getAlertTrend(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, unknown>
  ): Promise<AlertTrend> {
    const query = AlertTrendQuerySchema.parse(rawQuery)
    return this.dashboardsService.getAlertTrend(tenantId, query.days)
  }

  @Get('severity-distribution')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async getSeverityDistribution(@TenantId() tenantId: string): Promise<SeverityDistribution> {
    return this.dashboardsService.getSeverityDistribution(tenantId)
  }

  @Get('mitre-top-techniques')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async getMitreTopTechniques(@TenantId() tenantId: string): Promise<MitreTopTechniques> {
    return this.dashboardsService.getMitreTopTechniques(tenantId)
  }

  @Get('top-targeted-assets')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async getTopTargetedAssets(@TenantId() tenantId: string): Promise<TopTargetedAssets> {
    return this.dashboardsService.getTopTargetedAssets(tenantId)
  }

  @Get('pipeline-health')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async getPipelineHealth(@TenantId() tenantId: string): Promise<PipelineHealth> {
    return this.dashboardsService.getPipelineHealth(tenantId)
  }

  @Get('recent-activity')
  @RequirePermission(Permission.DASHBOARD_VIEW)
  async getRecentActivity(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, unknown>
  ): Promise<RecentActivityResponse> {
    const { limit } = RecentActivityQuerySchema.parse(rawQuery)
    return this.dashboardsService.getRecentActivity(tenantId, limit)
  }
}
