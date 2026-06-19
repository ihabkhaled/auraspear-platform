import { Injectable, Logger } from '@nestjs/common'
import { IntelRepository } from './intel.repository'
import {
  buildEventUpserts,
  buildIOCLookupMap,
  buildIOCOrderBy,
  buildIOCSearchWhere,
  buildIOCUpserts,
  buildMispOrderBy,
  collectAlertIPs,
  computeIOCStats,
  countFulfilled,
  countRejected,
  matchAlertsToIOCs,
} from './intel.utilities'
import { AppLogFeature } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { ConnectorsService } from '../connectors/connectors.service'
import { MispService } from '../connectors/services/misp.service'
import { EntityExtractionService } from '../entities/entity-extraction.service'
import type {
  PaginatedMispEvents,
  PaginatedIOCs,
  IOCMatchResult,
  IntelStatsResponse,
} from './intel.types'

@Injectable()
export class IntelService {
  private readonly logger = new Logger(IntelService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly intelRepository: IntelRepository,
    private readonly connectorsService: ConnectorsService,
    private readonly mispService: MispService,
    private readonly entityExtractionService: EntityExtractionService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.INTEL, 'IntelService')
  }

  /* ---------------------------------------------------------------- */
  /* GET STATS                                                         */
  /* ---------------------------------------------------------------- */

  async getStats(tenantId: string): Promise<IntelStatsResponse> {
    this.log.entry('getStats', tenantId)

    try {
      const [iocCounts, threatActorOrgs] = await Promise.all([
        this.intelRepository.groupActiveIOCsByType(tenantId),
        this.intelRepository.findDistinctOrganizations(tenantId),
      ])

      const stats = computeIOCStats(iocCounts, threatActorOrgs)
      this.log.success('getStats', tenantId, stats)
      return stats
    } catch (error: unknown) {
      this.log.error('getStats', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* GET RECENT EVENTS                                                 */
  /* ---------------------------------------------------------------- */

  async getRecentEvents(
    tenantId: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string
  ): Promise<PaginatedMispEvents> {
    this.log.entry('getRecentEvents', tenantId, { page, limit })

    try {
      const where = { tenantId }
      const [data, total] = await Promise.all([
        this.intelRepository.findManyMispEvents({
          where,
          orderBy: buildMispOrderBy(sortBy, sortOrder),
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.intelRepository.countMispEvents(where),
      ])

      this.log.success('getRecentEvents', tenantId, {
        page,
        limit,
        totalEvents: total,
      })
      return { data, pagination: buildPaginationMeta(page, limit, total) }
    } catch (error: unknown) {
      this.log.error('getRecentEvents', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* SEARCH IOCs                                                       */
  /* ---------------------------------------------------------------- */

  async searchIOCs(
    tenantId: string,
    query?: string,
    type?: string,
    page = 1,
    limit = 20,
    sortBy?: string,
    sortOrder?: string,
    source?: string
  ): Promise<PaginatedIOCs> {
    this.log.entry('searchIOCs', tenantId, { query, type, source, page, limit })

    try {
      const where = buildIOCSearchWhere(tenantId, query, type, source)
      const [data, total] = await Promise.all([
        this.intelRepository.findManyIOCs({
          where,
          orderBy: buildIOCOrderBy(sortBy, sortOrder),
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.intelRepository.countIOCs(where),
      ])

      this.log.success('searchIOCs', tenantId, {
        query,
        type,
        source,
        page,
        limit,
        totalResults: total,
      })
      return { data, pagination: buildPaginationMeta(page, limit, total) }
    } catch (error: unknown) {
      this.log.error('searchIOCs', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* MATCH IOCs AGAINST ALERTS                                         */
  /* ---------------------------------------------------------------- */

  async matchIOCsAgainstAlerts(tenantId: string, alertIds: string[]): Promise<IOCMatchResult[]> {
    this.log.entry('matchIOCsAgainstAlerts', tenantId, { alertCount: alertIds.length })

    try {
      const alerts = await this.intelRepository.findAlertsByIds(tenantId, alertIds)

      const ips = collectAlertIPs(alerts)
      const matchingIOCs =
        ips.length > 0 ? await this.intelRepository.findActiveIOCsByValues(tenantId, ips) : []

      const iocByValue = buildIOCLookupMap(matchingIOCs)
      this.log.success('matchIOCsAgainstAlerts', tenantId, {
        matchingIOCsFound: matchingIOCs.length,
        uniqueIPs: ips.length,
        alertCount: alertIds.length,
      })

      return matchAlertsToIOCs(alertIds, alerts, iocByValue)
    } catch (error: unknown) {
      this.log.error('matchIOCsAgainstAlerts', tenantId, error)
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* SYNC FROM MISP                                                    */
  /* ---------------------------------------------------------------- */

  async syncFromMisp(tenantId: string): Promise<{ eventsUpserted: number; iocsUpserted: number }> {
    this.log.entry('syncFromMisp', tenantId)

    const config = await this.getConfigOrThrow(tenantId)

    try {
      const eventsUpserted = await this.syncMispEvents(tenantId, config)
      const iocsUpserted = await this.syncMispAttributes(tenantId, config)

      this.logger.log(
        `MISP sync complete for tenant ${tenantId}: ${eventsUpserted} events, ${iocsUpserted} IOCs`
      )
      this.log.success('syncFromMisp', tenantId, { eventsUpserted, iocsUpserted })
      return { eventsUpserted, iocsUpserted }
    } catch (error) {
      this.handleSyncError(error, tenantId)
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Sync Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async getConfigOrThrow(tenantId: string): Promise<Record<string, unknown>> {
    const config = await this.connectorsService.getDecryptedConfig(tenantId, 'misp')
    if (!config) {
      this.log.warn('syncFromMisp', tenantId, 'MISP connector not configured', {
        reason: 'misp_connector_not_configured',
      })
      throw new BusinessException(
        400,
        'MISP connector not configured or disabled',
        'errors.intel.mispNotConfigured'
      )
    }
    return config
  }

  private async syncMispEvents(tenantId: string, config: Record<string, unknown>): Promise<number> {
    const rawEvents = await this.mispService.getEvents(config, 50)
    const eventUpserts = buildEventUpserts(tenantId, rawEvents)
    const results = await Promise.allSettled(
      eventUpserts.map(upsert => this.intelRepository.upsertMispEvent(upsert))
    )
    return countFulfilled(results)
  }

  private async syncMispAttributes(
    tenantId: string,
    config: Record<string, unknown>
  ): Promise<number> {
    const attributes = await this.mispService.searchAttributes(config, {
      limit: 500,
      page: 1,
      type: ['ip-src', 'ip-dst', 'domain', 'hostname', 'md5', 'sha1', 'sha256', 'url'],
    })
    const iocUpserts = buildIOCUpserts(tenantId, attributes)
    const results = await Promise.allSettled(
      iocUpserts.map(upsert => this.intelRepository.upsertIOC(upsert))
    )
    const upserted = countFulfilled(results)

    // Best-effort entity extraction from MISP IOCs
    await this.extractEntitiesFromMispIocs(tenantId, attributes)

    return upserted
  }

  /**
   * Extract entities from MISP IOC attributes (best-effort).
   * Bridges threat intel with the entity graph.
   */
  private async extractEntitiesFromMispIocs(
    tenantId: string,
    rawAttributes: unknown[]
  ): Promise<void> {
    const results = await Promise.allSettled(
      rawAttributes.map(rawAttribute => this.extractSingleMispIocEntity(tenantId, rawAttribute))
    )

    const failed = countRejected(results)
    if (failed > 0) {
      this.logger.warn(
        `MISP entity extraction: ${failed}/${rawAttributes.length} IOCs failed entity extraction`
      )
    }
  }

  private async extractSingleMispIocEntity(tenantId: string, rawAttribute: unknown): Promise<void> {
    const attribute = rawAttribute as Record<string, unknown>
    const iocType = String(attribute['type'] ?? 'unknown')
    const iocValue = String(attribute['value'] ?? '')
    const eventId = attribute['event_id'] as string | undefined
    const source = eventId ? `MISP-${eventId}` : 'MISP'

    if (!iocValue) return

    await this.entityExtractionService.extractFromMispIoc({
      tenantId,
      iocType,
      iocValue,
      source,
    })
  }

  private handleSyncError(error: unknown, tenantId: string): never {
    const message = error instanceof Error ? error.message : 'Unknown error'
    this.logger.error(`MISP sync failed for tenant ${tenantId}: ${message}`)
    this.log.error('syncFromMisp', tenantId, error)
    if (error instanceof BusinessException) throw error
    throw new BusinessException(502, `MISP sync failed: ${message}`, 'errors.intel.syncFailed')
  }
}
