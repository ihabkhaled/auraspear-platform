import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AlertsService } from './alerts.service'
import {
  BulkAcknowledgeSchema,
  type BulkAcknowledgeDto,
  BulkCloseSchema,
  type BulkCloseDto,
} from './dto/bulk-alert-action.dto'
import { CloseAlertSchema, type CloseAlertDto } from './dto/close-alert.dto'
import { EscalateAlertSchema, type EscalateAlertDto } from './dto/escalate-alert.dto'
import { InvestigateAlertSchema, type InvestigateAlertDto } from './dto/investigate-alert.dto'
import { SearchAlertsSchema } from './dto/search-alerts.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type { PaginatedAlerts, AlertRecord } from './alerts.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'

@ApiTags('alerts')
@ApiBearerAuth()
@Controller('alerts')
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @RequirePermission(Permission.ALERTS_VIEW)
  async search(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedAlerts> {
    const query = SearchAlertsSchema.parse(rawQuery)
    return this.alertsService.search(tenantId, query)
  }

  @Post('bulk/acknowledge')
  @RequirePermission(Permission.ALERTS_ACKNOWLEDGE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async bulkAcknowledge(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(BulkAcknowledgeSchema)) dto: BulkAcknowledgeDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ succeeded: number; failed: number }> {
    return this.alertsService.bulkAcknowledge(tenantId, dto.ids, user.email)
  }

  @Post('bulk/close')
  @RequirePermission(Permission.ALERTS_CLOSE)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async bulkClose(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(BulkCloseSchema)) dto: BulkCloseDto,
    @CurrentUser() user: JwtPayload
  ): Promise<{ succeeded: number; failed: number }> {
    return this.alertsService.bulkClose(tenantId, dto.ids, dto.resolution, user.email)
  }

  @Get(':id')
  @RequirePermission(Permission.ALERTS_VIEW)
  async getById(@TenantId() tenantId: string, @Param('id') id: string): Promise<AlertRecord> {
    return this.alertsService.findById(tenantId, id)
  }

  @Post(':id/acknowledge')
  @RequirePermission(Permission.ALERTS_ACKNOWLEDGE)
  async acknowledge(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload
  ): Promise<AlertRecord> {
    return this.alertsService.acknowledge(tenantId, id, user.email)
  }

  @Post(':id/investigate')
  @RequirePermission(Permission.ALERTS_INVESTIGATE)
  async investigate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(InvestigateAlertSchema)) dto: InvestigateAlertDto
  ): Promise<AlertRecord> {
    return this.alertsService.investigate(tenantId, id, dto.notes)
  }

  @Post(':id/escalate')
  @RequirePermission(Permission.ALERTS_ESCALATE)
  async escalate(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(EscalateAlertSchema)) dto: EscalateAlertDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AlertRecord> {
    return this.alertsService.escalate(tenantId, id, dto.reason, user.email)
  }

  @Post(':id/close')
  @RequirePermission(Permission.ALERTS_CLOSE)
  async close(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CloseAlertSchema)) dto: CloseAlertDto,
    @CurrentUser() user: JwtPayload
  ): Promise<AlertRecord> {
    return this.alertsService.close(tenantId, id, dto.resolution, user.email)
  }

  @Post('ingest/wazuh')
  @RequirePermission(Permission.CONNECTORS_SYNC)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async ingestFromWazuh(@TenantId() tenantId: string): Promise<{ ingested: number }> {
    return this.alertsService.ingestFromWazuh(tenantId)
  }
}
