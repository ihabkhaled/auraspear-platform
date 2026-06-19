import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { DataExplorerService } from './data-explorer.service'
import {
  GraylogSearchSchema,
  GrafanaDashboardQuerySchema,
  InfluxDBQuerySchema,
  MispEventQuerySchema,
  VelociraptorEndpointQuerySchema,
  VelociraptorHuntQuerySchema,
  VelociraptorVQLSchema,
  LogstashLogQuerySchema,
  ShuffleWorkflowQuerySchema,
  SyncJobQuerySchema,
  TriggerSyncSchema,
} from './dto/explorer-query.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequirePermission } from '../../common/decorators/permission.decorator'
import { TenantId } from '../../common/decorators/tenant-id.decorator'
import { Permission } from '../../common/enums'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import type {
  ExplorerOverview,
  InfluxDBQueryResult,
  PaginatedGrafanaDashboards,
  PaginatedLogstashLogs,
  PaginatedShuffleWorkflows,
  PaginatedSyncJobs,
  PaginatedUnknownResult,
  PaginatedVelociraptorEndpoints,
  PaginatedVelociraptorHunts,
  SyncResult,
  TriggerSyncResult,
  VelociraptorSyncResult,
  VQLResult,
} from './data-explorer.types'
import type {
  GraylogSearchDto,
  GrafanaDashboardQueryDto,
  InfluxDBQueryDto,
  MispEventQueryDto,
  VelociraptorEndpointQueryDto,
  VelociraptorHuntQueryDto,
  VelociraptorVQLDto,
  LogstashLogQueryDto,
  ShuffleWorkflowQueryDto,
  SyncJobQueryDto,
  TriggerSyncDto,
} from './dto/explorer-query.dto'

@ApiTags('data-explorer')
@ApiBearerAuth()
@Controller('data-explorer')
export class DataExplorerController {
  constructor(private readonly explorerService: DataExplorerService) {}

  // ── Overview ───────────────────────────────────────────────────────

  @Get('overview')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getOverview(@TenantId() tenantId: string): Promise<ExplorerOverview> {
    return this.explorerService.getOverview(tenantId)
  }

  // ── Graylog (Logs) ────────────────────────────────────────────────

  @Get('graylog/logs')
  @RequirePermission(Permission.EXPLORER_QUERY)
  async searchGraylogLogs(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(GraylogSearchSchema)) query: GraylogSearchDto
  ): Promise<PaginatedUnknownResult> {
    return this.explorerService.searchGraylogLogs(tenantId, query)
  }

  @Get('graylog/event-definitions')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getGraylogEventDefinitions(@TenantId() tenantId: string): Promise<unknown[]> {
    return this.explorerService.getGraylogEventDefinitions(tenantId)
  }

  // ── Grafana (Dashboards) ──────────────────────────────────────────

  @Get('grafana/dashboards')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getGrafanaDashboards(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(GrafanaDashboardQuerySchema)) query: GrafanaDashboardQueryDto
  ): Promise<PaginatedGrafanaDashboards> {
    return this.explorerService.getGrafanaDashboards(tenantId, query)
  }

  @Post('grafana/sync')
  @RequirePermission(Permission.CONNECTORS_SYNC)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async syncGrafanaDashboards(@TenantId() tenantId: string): Promise<SyncResult> {
    return this.explorerService.syncGrafanaDashboards(tenantId)
  }

  // ── InfluxDB (Metrics) ────────────────────────────────────────────

  @Get('influxdb/query')
  @RequirePermission(Permission.EXPLORER_QUERY)
  async queryInfluxDB(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(InfluxDBQuerySchema)) query: InfluxDBQueryDto
  ): Promise<InfluxDBQueryResult> {
    return this.explorerService.queryInfluxDB(tenantId, query)
  }

  @Get('influxdb/buckets')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getInfluxDBBuckets(@TenantId() tenantId: string): Promise<unknown[]> {
    return this.explorerService.getInfluxDBBuckets(tenantId)
  }

  // ── MISP (Threat Intel) ───────────────────────────────────────────

  @Get('misp/events')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async searchMispEvents(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(MispEventQuerySchema)) query: MispEventQueryDto
  ): Promise<PaginatedUnknownResult> {
    return this.explorerService.searchMispEvents(tenantId, query)
  }

  @Get('misp/events/:eventId')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getMispEventDetail(
    @TenantId() tenantId: string,
    @Param('eventId') eventId: string
  ): Promise<unknown> {
    return this.explorerService.getMispEventDetail(tenantId, eventId)
  }

  // ── Velociraptor (Endpoints & Hunts) ──────────────────────────────

  @Get('velociraptor/endpoints')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getVelociraptorEndpoints(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(VelociraptorEndpointQuerySchema))
    query: VelociraptorEndpointQueryDto
  ): Promise<PaginatedVelociraptorEndpoints> {
    return this.explorerService.getVelociraptorEndpoints(tenantId, query)
  }

  @Get('velociraptor/hunts')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getVelociraptorHunts(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(VelociraptorHuntQuerySchema)) query: VelociraptorHuntQueryDto
  ): Promise<PaginatedVelociraptorHunts> {
    return this.explorerService.getVelociraptorHunts(tenantId, query)
  }

  @Post('velociraptor/vql')
  @RequirePermission(Permission.EXPLORER_QUERY)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async runVelociraptorVQL(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(VelociraptorVQLSchema)) body: VelociraptorVQLDto
  ): Promise<VQLResult> {
    return this.explorerService.runVelociraptorVQL(tenantId, body.vql)
  }

  @Post('velociraptor/sync')
  @RequirePermission(Permission.CONNECTORS_SYNC)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async syncVelociraptorMetadata(@TenantId() tenantId: string): Promise<VelociraptorSyncResult> {
    return this.explorerService.syncVelociraptorMetadata(tenantId)
  }

  // ── Logstash (Pipeline Logs) ─────────────────────────────────────

  @Get('logstash/logs')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getLogstashLogs(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(LogstashLogQuerySchema)) query: LogstashLogQueryDto
  ): Promise<PaginatedLogstashLogs> {
    return this.explorerService.getLogstashLogs(tenantId, query)
  }

  @Post('logstash/sync')
  @RequirePermission(Permission.CONNECTORS_SYNC)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async syncLogstashLogs(@TenantId() tenantId: string): Promise<SyncResult> {
    return this.explorerService.syncLogstashLogs(tenantId)
  }

  // ── Shuffle (Automation) ──────────────────────────────────────────

  @Get('shuffle/workflows')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getShuffleWorkflows(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(ShuffleWorkflowQuerySchema)) query: ShuffleWorkflowQueryDto
  ): Promise<PaginatedShuffleWorkflows> {
    return this.explorerService.getShuffleWorkflows(tenantId, query)
  }

  @Post('shuffle/sync')
  @RequirePermission(Permission.CONNECTORS_SYNC)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async syncShuffleWorkflows(@TenantId() tenantId: string): Promise<SyncResult> {
    return this.explorerService.syncShuffleWorkflows(tenantId)
  }

  // ── Sync Jobs ─────────────────────────────────────────────────────

  @Get('sync-jobs')
  @RequirePermission(Permission.EXPLORER_VIEW)
  async getSyncJobs(
    @TenantId() tenantId: string,
    @Query(new ZodValidationPipe(SyncJobQuerySchema)) query: SyncJobQueryDto
  ): Promise<PaginatedSyncJobs> {
    return this.explorerService.getSyncJobs(tenantId, query)
  }

  @Post('sync-jobs/trigger')
  @RequirePermission(Permission.CONNECTORS_SYNC)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async triggerSync(
    @TenantId() tenantId: string,
    @Body(new ZodValidationPipe(TriggerSyncSchema)) body: TriggerSyncDto,
    @CurrentUser('email') email: string
  ): Promise<TriggerSyncResult> {
    return this.explorerService.triggerSync(tenantId, body.connectorType, email)
  }
}
