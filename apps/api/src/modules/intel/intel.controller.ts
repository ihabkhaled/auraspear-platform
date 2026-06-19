import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { ListEventsQuerySchema, SearchIOCsQuerySchema } from './dto/list-intel-query.dto'
import { MatchIocsSchema, type MatchIocsDto } from './dto/match-iocs.dto'
import { IntelService } from './intel.service'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { AuthGuard } from '../../common/guards/auth.guard'
import { TenantGuard } from '../../common/guards/tenant.guard'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  PaginatedMispEvents,
  PaginatedIOCs,
  IOCMatchResult,
  IntelStatsResponse,
} from './intel.types'

@Controller('ti')
@UseGuards(AuthGuard, TenantGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
export class IntelController {
  constructor(private readonly intelService: IntelService) {}

  /**
   * GET /ti/stats
   * Returns aggregated IOC and threat actor counts for the tenant.
   */
  @Get('stats')
  @RequirePermission(Permission.INTEL_VIEW)
  async getStats(@TenantId() tenantId: string): Promise<IntelStatsResponse> {
    return this.intelService.getStats(tenantId)
  }

  /**
   * GET /ti/events/recent?page=1&limit=20&sortBy=date&sortOrder=desc
   * Returns recent MISP threat intelligence events, paginated and sorted.
   */
  @Get('events/recent')
  @RequirePermission(Permission.INTEL_VIEW)
  async getRecentEvents(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedMispEvents> {
    const query = ListEventsQuerySchema.parse(rawQuery)
    return this.intelService.getRecentEvents(
      tenantId,
      query.page,
      query.limit,
      query.sortBy,
      query.sortOrder
    )
  }

  /**
   * GET /ti/iocs/search?value=<query>&type=<iocType>&source=<source>&page=1&limit=20&sortBy=lastSeen&sortOrder=desc
   * Search IOCs by value, with optional type and source filters, and sorting.
   */
  @Get('iocs/search')
  @RequirePermission(Permission.INTEL_VIEW)
  async searchIOCs(
    @TenantId() tenantId: string,
    @Query() rawQuery: Record<string, string>
  ): Promise<PaginatedIOCs> {
    const query = SearchIOCsQuerySchema.parse(rawQuery)
    return this.intelService.searchIOCs(
      tenantId,
      query.value,
      query.type,
      query.page,
      query.limit,
      query.sortBy,
      query.sortOrder,
      query.source
    )
  }

  /**
   * POST /ti/iocs/match-alerts
   * Match IOCs from MISP against a set of alert IDs.
   * Body: { alertIds: string[] }
   */
  @Post('iocs/match-alerts')
  @RequirePermission(Permission.INTEL_VIEW)
  async matchIOCsAgainstAlerts(
    @Body(new ZodValidationPipe(MatchIocsSchema)) dto: MatchIocsDto,
    @TenantId() tenantId: string
  ): Promise<IOCMatchResult[]> {
    return this.intelService.matchIOCsAgainstAlerts(tenantId, dto.alertIds)
  }

  /**
   * POST /ti/sync/misp
   * Trigger a sync from the tenant's MISP instance into the local database.
   */
  @Post('sync/misp')
  @RequirePermission(Permission.CONNECTORS_SYNC)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async syncFromMisp(
    @TenantId() tenantId: string
  ): Promise<{ eventsUpserted: number; iocsUpserted: number }> {
    return this.intelService.syncFromMisp(tenantId)
  }
}
