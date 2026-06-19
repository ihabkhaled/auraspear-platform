import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { type AddTimelineEntryDto, AddTimelineEntrySchema } from './dto/add-timeline-entry.dto'
import {
  type ChangeIncidentStatusDto,
  ChangeIncidentStatusSchema,
} from './dto/change-incident-status.dto'
import { type CreateIncidentDto, CreateIncidentSchema } from './dto/create-incident.dto'
import { ListIncidentsQuerySchema } from './dto/list-incidents-query.dto'
import { type UpdateIncidentDto, UpdateIncidentSchema } from './dto/update-incident.dto'
import { IncidentsService } from './incidents.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { IncidentRecord, IncidentStats, PaginatedIncidents } from './incidents.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { IncidentTimeline } from '@prisma/client'

@Controller('incidents')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  @Get()
  @RequirePermission(Permission.INCIDENTS_VIEW)
  async listIncidents(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedIncidents> {
    const { page, limit, sortBy, sortOrder, status, severity, category, query } =
      ListIncidentsQuerySchema.parse(rawQuery)
    return this.incidentsService.listIncidents(
      tenantId,
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      severity,
      category,
      query
    )
  }

  @Get('stats')
  @RequirePermission(Permission.INCIDENTS_VIEW)
  async getIncidentStats(@TenantId() tenantId: string): Promise<IncidentStats> {
    return this.incidentsService.getIncidentStats(tenantId)
  }

  @Get(':id')
  @RequirePermission(Permission.INCIDENTS_VIEW)
  async getIncidentById(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<IncidentRecord> {
    return this.incidentsService.getIncidentById(id, tenantId)
  }

  @Post()
  @RequirePermission(Permission.INCIDENTS_CREATE)
  async createIncident(
    @Body(new ZodValidationPipe(CreateIncidentSchema)) dto: CreateIncidentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<IncidentRecord> {
    return this.incidentsService.createIncident(dto, user)
  }

  @Patch(':id')
  @RequirePermission(Permission.INCIDENTS_UPDATE)
  async updateIncident(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateIncidentSchema)) dto: UpdateIncidentDto,
    @CurrentUser() user: JwtPayload
  ): Promise<IncidentRecord> {
    return this.incidentsService.updateIncident(id, dto, user)
  }

  @Patch(':id/status')
  @RequirePermission(Permission.INCIDENTS_CHANGE_STATUS)
  async changeStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ChangeIncidentStatusSchema)) dto: ChangeIncidentStatusDto,
    @CurrentUser() user: JwtPayload
  ): Promise<IncidentRecord> {
    return this.incidentsService.changeStatus(id, dto.status, user)
  }

  @Delete(':id')
  @RequirePermission(Permission.INCIDENTS_DELETE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteIncident(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @CurrentUser() user: JwtPayload
  ): Promise<{ deleted: boolean }> {
    return this.incidentsService.deleteIncident(id, tenantId, user.email)
  }

  @Get(':id/timeline')
  @RequirePermission(Permission.INCIDENTS_VIEW)
  async getIncidentTimeline(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<IncidentTimeline[]> {
    return this.incidentsService.getIncidentTimeline(id, tenantId)
  }

  @Post(':id/timeline')
  @RequirePermission(Permission.INCIDENTS_ADD_TIMELINE)
  async addTimelineEntry(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddTimelineEntrySchema)) dto: AddTimelineEntryDto,
    @CurrentUser() user: JwtPayload
  ): Promise<IncidentTimeline> {
    return this.incidentsService.addTimelineEntry(id, dto, user)
  }
}
