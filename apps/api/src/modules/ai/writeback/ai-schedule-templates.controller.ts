import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AiScheduleTemplatesService } from './ai-schedule-templates.service'
import { RequirePermission } from '../../../common/decorators/permission.decorator'
import { TenantId } from '../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../common/enums'
import { AuthGuard } from '../../../common/guards/auth.guard'
import { TenantGuard } from '../../../common/guards/tenant.guard'
import type { PaginatedResponse } from '../../../common/interfaces/pagination.interface'
import type { AiJobHealthSummary } from './ai-schedule-templates.types'
import type { AiJobRunSummary, AiScheduleTemplate } from '@prisma/client'

@Controller('ai')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AiScheduleTemplatesController {
  constructor(private readonly service: AiScheduleTemplatesService) {}

  /**
   * GET /ai/schedule-templates
   * List all 37 schedule templates (system-wide, not tenant-scoped).
   */
  @Get('schedule-templates')
  @RequirePermission(Permission.AI_CONFIG_VIEW)
  async listTemplates(): Promise<AiScheduleTemplate[]> {
    return this.service.listTemplates()
  }

  /**
   * GET /ai/job-runs
   * List AI job run summaries with filters, tenant-scoped, paginated.
   */
  @Get('job-runs')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async listJobRuns(
    @TenantId() tenantId: string,
    @Query('page') rawPage?: string,
    @Query('limit') rawLimit?: string,
    @Query('jobKey') jobKey?: string,
    @Query('agentId') agentId?: string,
    @Query('status') status?: string,
    @Query('sourceModule') sourceModule?: string
  ): Promise<PaginatedResponse<AiJobRunSummary>> {
    const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, Number.parseInt(rawLimit ?? '20', 10) || 20))
    return this.service.listJobRuns(
      tenantId,
      { jobKey, agentId, status, sourceModule },
      page,
      limit
    )
  }

  /**
   * GET /ai/job-health/summary
   * Aggregate job health metrics for the current tenant.
   */
  @Get('job-health/summary')
  @RequirePermission(Permission.AI_AGENTS_VIEW)
  async jobHealthSummary(@TenantId() tenantId: string): Promise<AiJobHealthSummary> {
    return this.service.getJobHealthSummary(tenantId)
  }
}
