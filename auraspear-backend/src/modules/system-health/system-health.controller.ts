import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ListHealthChecksQuerySchema } from './dto/list-health-checks-query.dto'
import { ListMetricsQuerySchema } from './dto/list-metrics-query.dto'
import { SystemHealthService } from './system-health.service'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import type {
  HealthCheckRecord,
  PaginatedHealthChecks,
  PaginatedMetrics,
  SystemHealthStats,
} from './system-health.types'

@Controller('system-health')
@UseGuards(AuthGuard, TenantGuard)
export class SystemHealthController {
  constructor(private readonly systemHealthService: SystemHealthService) {}

  @Get()
  @RequirePermission(Permission.SYSTEM_HEALTH_VIEW)
  async getSystemHealthOverview(@TenantId() tenantId: string): Promise<SystemHealthStats> {
    return this.systemHealthService.getSystemHealthStats(tenantId)
  }

  @Get('checks')
  @RequirePermission(Permission.SYSTEM_HEALTH_VIEW)
  async listHealthChecks(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedHealthChecks> {
    const { page, limit, sortBy, sortOrder, serviceType, status } =
      ListHealthChecksQuerySchema.parse(rawQuery)
    return this.systemHealthService.listHealthChecks(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      serviceType,
      status
    )
  }

  @Get('checks/latest')
  @RequirePermission(Permission.SYSTEM_HEALTH_VIEW)
  async getLatestHealthChecks(@TenantId() tenantId: string): Promise<HealthCheckRecord[]> {
    return this.systemHealthService.getLatestHealthChecks(tenantId)
  }

  @Get('metrics')
  @RequirePermission(Permission.SYSTEM_HEALTH_VIEW)
  async listMetrics(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedMetrics> {
    const { page, limit, sortBy, sortOrder, metricType, metricName } =
      ListMetricsQuerySchema.parse(rawQuery)
    return this.systemHealthService.listMetrics(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      metricType,
      metricName
    )
  }

  @Get('stats')
  @RequirePermission(Permission.SYSTEM_HEALTH_VIEW)
  async getSystemHealthStats(@TenantId() tenantId: string): Promise<SystemHealthStats> {
    return this.systemHealthService.getSystemHealthStats(tenantId)
  }
}
