import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ListJobsQuerySchema } from './dto/list-jobs-query.dto'
import { JobService } from './jobs.service'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import type { JobRuntimeStats } from './jobs.types'
import type { Job } from '@prisma/client'

@Controller('jobs')
@UseGuards(AuthGuard, TenantGuard)
export class JobsController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  @RequirePermission(Permission.JOBS_VIEW)
  async listJobs(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<{ data: Job[]; total: number; page: number; limit: number }> {
    const query = ListJobsQuerySchema.parse(rawQuery)

    return this.jobService.listJobs(tenantId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
      type: query.type,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    })
  }

  @Get('stats')
  @RequirePermission(Permission.JOBS_VIEW)
  async getStats(@TenantId() tenantId: string): Promise<JobRuntimeStats> {
    return this.jobService.getStats(tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.JOBS_VIEW)
  async getJob(@Param('id', ParseUUIDPipe) id: string, @TenantId() tenantId: string): Promise<Job> {
    return this.jobService.getJobOrThrow(id, tenantId)
  }

  @Post('cancel-all')
  @RequirePermission(Permission.JOBS_CANCEL_ALL)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async cancelAllJobs(@TenantId() tenantId: string): Promise<{ cancelled: number }> {
    const cancelled = await this.jobService.cancelAllJobs(tenantId)
    return { cancelled }
  }

  @Post(':id/cancel')
  @RequirePermission(Permission.JOBS_MANAGE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async cancelJob(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ): Promise<{ cancelled: boolean }> {
    const cancelled = await this.jobService.cancelJob(id, tenantId)
    return { cancelled }
  }

  @Post(':id/retry')
  @RequirePermission(Permission.JOBS_MANAGE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async retryJob(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() tenantId: string
  ): Promise<Job> {
    return this.jobService.retryJob(id, tenantId)
  }
}
