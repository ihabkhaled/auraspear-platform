import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { ListSchedulesQuerySchema } from './dto/list-schedules-query.dto'
import { PauseScheduleSchema, ToggleScheduleSchema } from './dto/toggle-schedule.dto'
import { UpdateScheduleSchema } from './dto/update-schedule.dto'
import { ScheduleService } from './schedule.service'
import { CurrentUser } from '../../../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../../../common/decorators/permission.decorator'
import { TenantId } from '../../../../common/decorators/tenant-id.decorator'
import { Permission } from '../../../../common/enums'
import { ZodValidationPipe } from '../../../../common/pipes/zod-validation.pipe'
import type { ListSchedulesQueryDto } from './dto/list-schedules-query.dto'
import type { PauseScheduleDto, ToggleScheduleDto } from './dto/toggle-schedule.dto'
import type { UpdateScheduleDto } from './dto/update-schedule.dto'
import type { ScheduleDetail, ScheduleListItem } from './schedule.types'
import type { JwtPayload } from '../../../../common/interfaces/authenticated-request.interface'

@ApiTags('ai-schedules')
@ApiBearerAuth()
@Controller('ai/schedules')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @RequirePermission(Permission.AI_CONFIG_VIEW)
  async listSchedules(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<ScheduleListItem[]> {
    const query: ListSchedulesQueryDto = ListSchedulesQuerySchema.parse(rawQuery)
    return this.scheduleService.listSchedules(tenantId, query)
  }

  @Get(':id')
  @RequirePermission(Permission.AI_CONFIG_VIEW)
  async getSchedule(
    @TenantId() tenantId: string,
    @Param('id') id: string
  ): Promise<ScheduleDetail> {
    return this.scheduleService.getSchedule(tenantId, id)
  }

  @Patch(':id')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  async updateSchedule(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateScheduleSchema)) dto: UpdateScheduleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ScheduleDetail> {
    return this.scheduleService.updateSchedule(tenantId, id, dto, user.email)
  }

  @Post(':id/toggle')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  async toggleEnabled(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ToggleScheduleSchema)) dto: ToggleScheduleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ScheduleDetail> {
    return this.scheduleService.toggleEnabled(tenantId, id, dto.enabled, user.email)
  }

  @Post(':id/pause')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  async togglePaused(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(PauseScheduleSchema)) dto: PauseScheduleDto,
    @CurrentUser() user: JwtPayload
  ): Promise<ScheduleDetail> {
    return this.scheduleService.togglePaused(tenantId, id, dto.paused, user.email)
  }

  @Post(':id/run-now')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async runNow(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ jobId: string }> {
    return this.scheduleService.runNow(tenantId, id, user.email)
  }

  @Post(':id/reset')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  async resetToDefault(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<ScheduleDetail> {
    return this.scheduleService.resetToDefault(tenantId, id, user.email)
  }

  @Post('bulk-toggle')
  @RequirePermission(Permission.AI_CONFIG_EDIT)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bulkToggle(
    @TenantId() tenantId: string,
    @Body('enabled') enabled: boolean,
    @CurrentUser() user: JwtPayload
  ): Promise<{ updated: number }> {
    return this.scheduleService.bulkToggle(tenantId, enabled, user.email)
  }
}
