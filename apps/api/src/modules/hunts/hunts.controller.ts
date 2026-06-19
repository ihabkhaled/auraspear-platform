import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ListHuntEventsQuerySchema, ListHuntsQuerySchema } from './dto/list-hunts-query.dto'
import { type RunHuntDto, RunHuntSchema } from './dto/run-hunt.dto'
import { HuntsService } from './hunts.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { HuntSessionRecord, PaginatedHuntSessions, PaginatedHuntEvents } from './hunts.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@Controller('hunts')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class HuntsController {
  constructor(private readonly huntsService: HuntsService) {}

  @Post('run')
  @RequirePermission(Permission.HUNT_EXECUTE)
  async runHunt(
    @Body(new ZodValidationPipe(RunHuntSchema)) dto: RunHuntDto,
    @CurrentUser() user: JwtPayload
  ): Promise<HuntSessionRecord> {
    return this.huntsService.runHunt(user.tenantId, dto, user.email)
  }

  @Get('runs')
  @RequirePermission(Permission.HUNT_VIEW)
  async listRuns(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedHuntSessions> {
    const { page, limit } = ListHuntsQuerySchema.parse(rawQuery)
    return this.huntsService.listRuns(tenantId, page, limit)
  }

  @Get('runs/:id')
  @RequirePermission(Permission.HUNT_VIEW)
  async getRunDetails(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<HuntSessionRecord> {
    return this.huntsService.getRun(tenantId, id)
  }

  @Get('runs/:id/events')
  @RequirePermission(Permission.HUNT_VIEW)
  async getRunEvents(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedHuntEvents> {
    const { page, limit } = ListHuntEventsQuerySchema.parse(rawQuery)
    return this.huntsService.getEvents(tenantId, id, page, limit)
  }

  @Delete('runs/:id')
  @RequirePermission(Permission.HUNT_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteRun(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.huntsService.deleteRun(tenantId, id, user.email)
  }
}
