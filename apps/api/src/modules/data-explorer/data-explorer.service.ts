import { Injectable, Logger } from '@nestjs/common'
import { DataExplorerRepository } from './data-explorer.repository'
import {
  buildFluxQuery,
  buildGrafanaDashboardWhere,
  buildLogstashLogWhere,
  buildMispSearchParameters,
  buildShuffleWorkflowWhere,
  buildSyncJobWhere,
  buildSyncSummaryMap,
  buildVelociraptorEndpointWhere,
  buildVelociraptorHuntWhere,
  countBatchResults,
  isMispAttributeSearch,
  mapConnectorOverview,
  mapGrafanaDashboardUpsert,
  mapLogstashPipelineEntry,
  mapShuffleWorkflowUpsert,
  mapVelociraptorEndpointUpsert,
  mapVelociraptorHuntUpsert,
} from './data-explorer.utilities'
import { AppLogFeature, ConnectorType, LogLevel, SyncJobStatus } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { processInBatches } from '../../common/utils/batch.utility'
import { nowDate, diffMs } from '../../common/utils/date-time.utility'
import { sanitizeEsQueryString } from '../../common/utils/es-sanitize.utility'
import { ConnectorsService } from '../connectors/connectors.service'
import { GrafanaService } from '../connectors/services/grafana.service'
import { GraylogService } from '../connectors/services/graylog.service'
import { InfluxDBService } from '../connectors/services/influxdb.service'
import { LogstashService } from '../connectors/services/logstash.service'
import { MispService } from '../connectors/services/misp.service'
import { ShuffleService } from '../connectors/services/shuffle.service'
import { VelociraptorService } from '../connectors/services/velociraptor.service'
import type {
  ExplorerOverview,
  PaginatedGrafanaDashboards,
  PaginatedLogstashLogs,
  PaginatedShuffleWorkflows,
  PaginatedSyncJobs,
  PaginatedUnknownResult,
  PaginatedVelociraptorEndpoints,
  PaginatedVelociraptorHunts,
} from './data-explorer.types'
import type {
  GraylogSearchDto,
  GrafanaDashboardQueryDto,
  InfluxDBQueryDto,
  MispEventQueryDto,
  VelociraptorEndpointQueryDto,
  VelociraptorHuntQueryDto,
  ShuffleWorkflowQueryDto,
  LogstashLogQueryDto,
  SyncJobQueryDto,
} from './dto/explorer-query.dto'
import type { ConnectorSyncJob } from '@prisma/client'

@Injectable()
export class DataExplorerService {
  private readonly logger = new Logger(DataExplorerService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly repository: DataExplorerRepository,
    private readonly connectorsService: ConnectorsService,
    private readonly graylogService: GraylogService,
    private readonly grafanaService: GrafanaService,
    private readonly influxDBService: InfluxDBService,
    private readonly mispService: MispService,
    private readonly velociraptorService: VelociraptorService,
    private readonly shuffleService: ShuffleService,
    private readonly logstashService: LogstashService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.DATA_EXPLORER, 'DataExplorerService')
  }

  // ── Overview ───────────────────────────────────────────────────────

  async getOverview(tenantId: string): Promise<ExplorerOverview> {
    this.logger.log(`getOverview called for tenant ${tenantId}`)
    const [connectors, syncSummary] = await Promise.all([
      this.repository.findConnectorConfigs(tenantId),
      this.repository.groupBySyncJobStatus(tenantId),
    ])

    const summaryMap = buildSyncSummaryMap(syncSummary)
    this.logger.log(
      `getOverview completed for tenant ${tenantId}: ${String(connectors.length)} connectors`
    )
    this.log.success('getOverview', tenantId, {})

    return {
      connectors: mapConnectorOverview(connectors),
      syncJobsSummary: {
        running: summaryMap.get('running') ?? { count: 0, connectors: [] },
        completed: summaryMap.get('completed') ?? { count: 0, connectors: [] },
        failed: summaryMap.get('failed') ?? { count: 0, connectors: [] },
      },
    }
  }

  // ── Graylog ───────────────────────────────────────────────────────

  async searchGraylogLogs(
    tenantId: string,
    dto: GraylogSearchDto
  ): Promise<PaginatedUnknownResult> {
    this.logger.log(`searchGraylogLogs called for tenant ${tenantId}`)
    const config = await this.getConfig(tenantId, ConnectorType.GRAYLOG)
    const sanitizedQuery = dto.query === '*' ? '*' : sanitizeEsQueryString(dto.query)
    const result = await this.callExternalOrThrow('Graylog', () =>
      this.graylogService.searchEvents(config, {
        query: sanitizedQuery || '*',
        timerange: { type: 'relative', range: dto.timeRange },
        page: dto.page,
        per_page: dto.limit,
      })
    )
    this.log.success('searchGraylogLogs', tenantId, { query: dto.query, total: result.total })
    return {
      data: result.events,
      pagination: buildPaginationMeta(dto.page, dto.limit, result.total),
    }
  }

  async getGraylogEventDefinitions(tenantId: string): Promise<unknown[]> {
    this.logger.log(`getGraylogEventDefinitions called for tenant ${tenantId}`)
    const config = await this.getConfig(tenantId, ConnectorType.GRAYLOG)
    const definitions = await this.callExternalOrThrow('Graylog', () =>
      this.graylogService.getEventDefinitions(config)
    )
    this.log.success('getGraylogEventDefinitions', tenantId, { count: definitions.length })
    return definitions
  }

  // ── Grafana ───────────────────────────────────────────────────────

  async getGrafanaDashboards(
    tenantId: string,
    dto: GrafanaDashboardQueryDto
  ): Promise<PaginatedGrafanaDashboards> {
    this.logger.log(`getGrafanaDashboards called for tenant ${tenantId}`)
    const where = buildGrafanaDashboardWhere(tenantId, dto)
    const [data, total] = await Promise.all([
      this.repository.findManyGrafanaDashboards({
        where,
        orderBy: { [dto.sortBy ?? 'title']: dto.sortOrder },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.repository.countGrafanaDashboards(where),
    ])
    this.log.success('getGrafanaDashboards', tenantId, { total })
    return { data, pagination: buildPaginationMeta(dto.page, dto.limit, total) }
  }

  async syncGrafanaDashboards(tenantId: string): Promise<{ synced: number }> {
    this.logger.log(`syncGrafanaDashboards called for tenant ${tenantId}`)
    const config = await this.getConfig(tenantId, ConnectorType.GRAFANA)
    const dashboards = (await this.callExternalOrThrow('Grafana', () =>
      this.grafanaService.getDashboards(config)
    )) as Array<Record<string, unknown>>

    return this.runSyncJob(
      tenantId,
      ConnectorType.GRAFANA,
      dashboards,
      dashboard => {
        const { uid, create, update } = mapGrafanaDashboardUpsert(tenantId, dashboard)
        if (!uid) return Promise.reject(new Error('Missing uid'))
        return this.repository.upsertGrafanaDashboard({
          where: { tenantId_uid: { tenantId, uid } },
          create,
          update,
        })
      },
      'syncGrafanaDashboards'
    )
  }

  // ── InfluxDB ──────────────────────────────────────────────────────

  async queryInfluxDB(
    tenantId: string,
    dto: InfluxDBQueryDto
  ): Promise<{ data: string; bucket: string }> {
    this.logger.log(`queryInfluxDB called for tenant ${tenantId}, bucket=${dto.bucket}`)
    const config = await this.getConfig(tenantId, ConnectorType.INFLUXDB)
    const flux = buildFluxQuery(dto.bucket, dto.range, dto.measurement, dto.limit)
    const result = await this.callExternalOrThrow('InfluxDB', () =>
      this.influxDBService.query(config, flux)
    )
    this.log.success('queryInfluxDB', tenantId, { bucket: dto.bucket })
    return { data: result, bucket: dto.bucket }
  }

  async getInfluxDBBuckets(tenantId: string): Promise<unknown[]> {
    this.logger.log(`getInfluxDBBuckets called for tenant ${tenantId}`)
    const config = await this.getConfig(tenantId, ConnectorType.INFLUXDB)
    const buckets = await this.callExternalOrThrow('InfluxDB', () =>
      this.influxDBService.getBuckets(config)
    )
    this.log.success('getInfluxDBBuckets', tenantId, { count: buckets.length })
    return buckets
  }

  // ── MISP ──────────────────────────────────────────────────────────

  async searchMispEvents(
    tenantId: string,
    dto: MispEventQueryDto
  ): Promise<PaginatedUnknownResult> {
    this.logger.log(`searchMispEvents called for tenant ${tenantId}`)
    const config = await this.getConfig(tenantId, ConnectorType.MISP)
    const searchParameters = buildMispSearchParameters(dto)

    const data = await this.callExternalOrThrow('MISP', () =>
      isMispAttributeSearch(dto)
        ? this.mispService.searchAttributes(config, searchParameters)
        : this.mispService.getEvents(config, dto.limit)
    )
    this.log.success('searchMispEvents', tenantId, { resultCount: data.length })
    return { data, pagination: buildPaginationMeta(dto.page, dto.limit, data.length) }
  }

  async getMispEventDetail(tenantId: string, eventId: string): Promise<unknown> {
    this.logger.log(`getMispEventDetail called for tenant ${tenantId}, eventId=${eventId}`)
    const config = await this.getConfig(tenantId, ConnectorType.MISP)
    const event = await this.callExternalOrThrow('MISP', () =>
      this.mispService.getEvent(config, eventId)
    )
    this.log.success('getMispEventDetail', tenantId, { eventId })
    return event
  }

  // ── Velociraptor ──────────────────────────────────────────────────

  async getVelociraptorEndpoints(
    tenantId: string,
    dto: VelociraptorEndpointQueryDto
  ): Promise<PaginatedVelociraptorEndpoints> {
    this.logger.log(`getVelociraptorEndpoints called for tenant ${tenantId}`)
    const where = buildVelociraptorEndpointWhere(tenantId, dto)
    const [data, total] = await Promise.all([
      this.repository.findManyVelociraptorEndpoints({
        where,
        orderBy: { [dto.sortBy ?? 'hostname']: dto.sortOrder },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.repository.countVelociraptorEndpoints(where),
    ])
    this.log.success('getVelociraptorEndpoints', tenantId, { total })
    return { data, pagination: buildPaginationMeta(dto.page, dto.limit, total) }
  }

  async getVelociraptorHunts(
    tenantId: string,
    dto: VelociraptorHuntQueryDto
  ): Promise<PaginatedVelociraptorHunts> {
    this.logger.log(`getVelociraptorHunts called for tenant ${tenantId}`)
    const where = buildVelociraptorHuntWhere(tenantId, dto)
    const [data, total] = await Promise.all([
      this.repository.findManyVelociraptorHunts({
        where,
        orderBy: { [dto.sortBy ?? 'createdAt']: dto.sortOrder },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.repository.countVelociraptorHunts(where),
    ])
    this.log.success('getVelociraptorHunts', tenantId, { total })
    return { data, pagination: buildPaginationMeta(dto.page, dto.limit, total) }
  }

  async runVelociraptorVQL(
    tenantId: string,
    vql: string
  ): Promise<{ rows: unknown[]; columns: string[] }> {
    this.logger.log(`runVelociraptorVQL called for tenant ${tenantId}`)
    const config = await this.getConfig(tenantId, ConnectorType.VELOCIRAPTOR)
    const result = await this.callExternalOrThrow('Velociraptor', () =>
      this.velociraptorService.runVQL(config, vql)
    )
    this.log.success('runVelociraptorVQL', tenantId, {
      rowCount: result.rows.length,
      columnCount: result.columns.length,
    })
    return result
  }

  async syncVelociraptorMetadata(tenantId: string): Promise<{ endpoints: number; hunts: number }> {
    this.logger.log(`syncVelociraptorMetadata called for tenant ${tenantId}`)
    const config = await this.getConfig(tenantId, ConnectorType.VELOCIRAPTOR)
    const job = await this.createSyncJob(tenantId, ConnectorType.VELOCIRAPTOR)

    try {
      const [endpointResult, huntResult] = await Promise.all([
        this.syncVelociraptorEndpoints(tenantId, config),
        this.syncVelociraptorHunts(tenantId, config),
      ])

      await this.completeSyncJob(
        job.id,
        tenantId,
        endpointResult.synced + huntResult.synced,
        endpointResult.failed + huntResult.failed
      )
      this.log.success('syncVelociraptorMetadata', tenantId, {
        endpoints: endpointResult.synced,
        hunts: huntResult.synced,
      })
      return { endpoints: endpointResult.synced, hunts: huntResult.synced }
    } catch (error) {
      await this.failSyncJob(job.id, tenantId, 0, error)
      throw error
    }
  }

  // ── Logstash ──────────────────────────────────────────────────────

  async getLogstashLogs(
    tenantId: string,
    dto: LogstashLogQueryDto
  ): Promise<PaginatedLogstashLogs> {
    this.logger.log(`getLogstashLogs called for tenant ${tenantId}`)
    const where = buildLogstashLogWhere(tenantId, dto)
    const [data, total] = await Promise.all([
      this.repository.findManyLogstashLogs({
        where,
        orderBy: { [dto.sortBy ?? 'timestamp']: dto.sortOrder },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.repository.countLogstashLogs(where),
    ])
    this.log.success('getLogstashLogs', tenantId, { total })
    return { data, pagination: buildPaginationMeta(dto.page, dto.limit, total) }
  }

  async syncLogstashLogs(tenantId: string): Promise<{ synced: number }> {
    this.logger.log(`syncLogstashLogs called for tenant ${tenantId}`)
    const config = await this.getConfig(tenantId, ConnectorType.LOGSTASH)
    const pipelineStats = await this.callExternalOrThrow('Logstash', () =>
      this.logstashService.getPipelineStats(config)
    )

    const entries = Object.entries(pipelineStats.pipelines)
    return this.runSyncJob(
      tenantId,
      ConnectorType.LOGSTASH,
      entries,
      ([pipelineId, stats]) => {
        const data = mapLogstashPipelineEntry(tenantId, pipelineId, stats, LogLevel.INFO)
        return this.repository.createLogstashLog(data)
      },
      'syncLogstashLogs'
    )
  }

  // ── Shuffle ───────────────────────────────────────────────────────

  async getShuffleWorkflows(
    tenantId: string,
    dto: ShuffleWorkflowQueryDto
  ): Promise<PaginatedShuffleWorkflows> {
    this.logger.log(`getShuffleWorkflows called for tenant ${tenantId}`)
    const where = buildShuffleWorkflowWhere(tenantId, dto)
    const [data, total] = await Promise.all([
      this.repository.findManyShuffleWorkflows({
        where,
        orderBy: { [dto.sortBy ?? 'name']: dto.sortOrder },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.repository.countShuffleWorkflows(where),
    ])
    this.log.success('getShuffleWorkflows', tenantId, { total })
    return { data, pagination: buildPaginationMeta(dto.page, dto.limit, total) }
  }

  async syncShuffleWorkflows(tenantId: string): Promise<{ synced: number }> {
    this.logger.log(`syncShuffleWorkflows called for tenant ${tenantId}`)
    const config = await this.getConfig(tenantId, ConnectorType.SHUFFLE)
    const workflows = (await this.callExternalOrThrow('Shuffle', () =>
      this.shuffleService.getWorkflows(config)
    )) as Array<Record<string, unknown>>

    return this.runSyncJob(
      tenantId,
      ConnectorType.SHUFFLE,
      workflows,
      workflow => {
        const { workflowId, create, update } = mapShuffleWorkflowUpsert(tenantId, workflow)
        if (!workflowId) return Promise.reject(new Error('Missing workflow id'))
        return this.repository.upsertShuffleWorkflow({
          where: { tenantId_workflowId: { tenantId, workflowId } },
          create,
          update,
        })
      },
      'syncShuffleWorkflows'
    )
  }

  // ── Sync Jobs ─────────────────────────────────────────────────────

  async getSyncJobs(tenantId: string, dto: SyncJobQueryDto): Promise<PaginatedSyncJobs> {
    this.logger.log(`getSyncJobs called for tenant ${tenantId}`)
    const where = buildSyncJobWhere(tenantId, dto)
    const [data, total] = await Promise.all([
      this.repository.findManySyncJobs({
        where,
        orderBy: { startedAt: dto.sortOrder },
        skip: (dto.page - 1) * dto.limit,
        take: dto.limit,
      }),
      this.repository.countSyncJobs(where),
    ])
    return { data, pagination: buildPaginationMeta(dto.page, dto.limit, total) }
  }

  async triggerSync(
    tenantId: string,
    connectorType: ConnectorType,
    initiatedBy: string
  ): Promise<{ jobId: string }> {
    this.logger.log(`triggerSync called for tenant ${tenantId}, type=${connectorType}`)
    await this.getConfig(tenantId, connectorType)
    const job = await this.createSyncJob(tenantId, connectorType, initiatedBy)

    this.executeSyncInBackground(tenantId, connectorType, job.id).catch(error => {
      this.logger.error(
        `Background sync failed for ${connectorType}: ${error instanceof Error ? error.message : 'unknown'}`
      )
    })
    this.log.success('triggerSync', tenantId, { connectorType, jobId: job.id })
    return { jobId: job.id }
  }

  // ── Private: External Call Wrapper ────────────────────────────────

  private async callExternalOrThrow<T>(serviceName: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      throw new BusinessException(
        502,
        `Failed to connect to ${serviceName}: ${error instanceof Error ? error.message : 'unknown'}`,
        'errors.explorer.connectorUnavailable'
      )
    }
  }

  // ── Private: Sync Job Pipeline ────────────────────────────────────

  private async runSyncJob<T>(
    tenantId: string,
    connectorType: ConnectorType,
    items: T[],
    processFunction: (item: T) => Promise<unknown>,
    actionName: string
  ): Promise<{ synced: number }> {
    const job = await this.createSyncJob(tenantId, connectorType)
    try {
      const results = await processInBatches(items, 50, processFunction)
      const { synced, failed } = countBatchResults(results)
      await this.completeSyncJob(job.id, tenantId, synced, failed)
      this.log.success(actionName, tenantId, { synced, failed })
      return { synced }
    } catch (error) {
      await this.failSyncJob(job.id, tenantId, 0, error)
      throw error
    }
  }

  private async syncVelociraptorEndpoints(
    tenantId: string,
    config: Record<string, unknown>
  ): Promise<{ synced: number; failed: number }> {
    const clients = (await this.velociraptorService.getClients(config)) as Array<
      Record<string, unknown>
    >
    const results = await processInBatches(clients, 50, client => {
      const { clientId, create, update } = mapVelociraptorEndpointUpsert(tenantId, client)
      if (!clientId) return Promise.reject(new Error('Missing client_id'))
      return this.repository.upsertVelociraptorEndpoint({
        where: { tenantId_clientId: { tenantId, clientId } },
        create,
        update,
      })
    })
    return countBatchResults(results)
  }

  private async syncVelociraptorHunts(
    tenantId: string,
    config: Record<string, unknown>
  ): Promise<{ synced: number; failed: number }> {
    const huntResult = await this.velociraptorService.runVQL(
      config,
      'SELECT hunt_id, hunt_description, state, artifacts, stats, create_time FROM hunts()'
    )
    const results = await processInBatches(huntResult.rows, 50, row => {
      const { huntId, create, update } = mapVelociraptorHuntUpsert(tenantId, row)
      if (!huntId) return Promise.reject(new Error('Missing hunt_id'))
      return this.repository.upsertVelociraptorHunt({
        where: { tenantId_huntId: { tenantId, huntId } },
        create,
        update,
      })
    })
    return countBatchResults(results)
  }

  // ── Private: Config & Job Helpers ─────────────────────────────────

  private async getConfig(tenantId: string, type: ConnectorType): Promise<Record<string, unknown>> {
    const config = await this.connectorsService.getDecryptedConfig(tenantId, type)
    if (!config) {
      throw new BusinessException(
        404,
        `Connector ${type} not configured or disabled`,
        'errors.explorer.connectorNotConfigured'
      )
    }
    return config
  }

  private async createSyncJob(
    tenantId: string,
    connectorType: ConnectorType,
    initiatedBy = 'system'
  ): Promise<ConnectorSyncJob> {
    return this.repository.createSyncJob({
      tenantId,
      connectorType,
      status: SyncJobStatus.RUNNING,
      initiatedBy,
      startedAt: nowDate(),
    })
  }

  private async completeSyncJob(
    jobId: string,
    tenantId: string,
    recordsSynced: number,
    recordsFailed: number
  ): Promise<void> {
    const job = await this.repository.findSyncJobById(jobId)
    const durationMs = job ? diffMs(job.startedAt, nowDate()) : null
    await this.repository.updateSyncJob(jobId, tenantId, {
      status: SyncJobStatus.COMPLETED,
      recordsSynced,
      recordsFailed,
      durationMs,
      completedAt: nowDate(),
    })
  }

  private async failSyncJob(
    jobId: string,
    tenantId: string,
    recordsFailed: number,
    error: unknown
  ): Promise<void> {
    const job = await this.repository.findSyncJobById(jobId)
    const durationMs = job ? diffMs(job.startedAt, nowDate()) : null
    await this.repository.updateSyncJob(jobId, tenantId, {
      status: SyncJobStatus.FAILED,
      recordsFailed,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      durationMs,
      completedAt: nowDate(),
    })
  }

  private async executeSyncInBackground(
    tenantId: string,
    connectorType: ConnectorType,
    jobId: string
  ): Promise<void> {
    try {
      await this.dispatchSyncByType(tenantId, connectorType, jobId)
    } catch (error) {
      this.logger.error(
        `Sync job ${jobId} failed: ${error instanceof Error ? error.message : 'unknown'}`
      )
    }
  }

  private async dispatchSyncByType(
    tenantId: string,
    connectorType: ConnectorType,
    jobId: string
  ): Promise<void> {
    switch (connectorType) {
      case ConnectorType.GRAFANA: {
        await this.syncGrafanaDashboards(tenantId)
        break
      }
      case ConnectorType.VELOCIRAPTOR: {
        await this.syncVelociraptorMetadata(tenantId)
        break
      }
      case ConnectorType.SHUFFLE: {
        await this.syncShuffleWorkflows(tenantId)
        break
      }
      case ConnectorType.LOGSTASH: {
        await this.syncLogstashLogs(tenantId)
        break
      }
      default: {
        await this.failSyncJob(
          jobId,
          tenantId,
          0,
          new Error(`Sync not supported for ${connectorType}`)
        )
      }
    }
  }
}
