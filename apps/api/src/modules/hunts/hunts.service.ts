import { Injectable, Logger } from '@nestjs/common'
import { HuntSessionStatus } from '@prisma/client'
import { RunHuntDto } from './dto/run-hunt.dto'
import { VALID_HUNT_TRANSITIONS } from './hunts.constants'
import { HuntsRepository } from './hunts.repository'
import {
  buildHuntEsQuery,
  mapHitsToEventData,
  extractMitreFromHits,
  countUniqueIps,
  computeThreatScore,
  buildHuntReasoning,
  generateHuntAnalysis,
  sanitizeEsQuery,
} from './hunts.utilities'
import { AppLogFeature, ConnectorType } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { buildPaginationMeta } from '../../common/interfaces/pagination.interface'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { ServiceLogger } from '../../common/services/service-logger'
import { processChunked } from '../../common/utils/batch.utility'
import { nowDate } from '../../common/utils/date-time.utility'
import { ConnectorsService } from '../connectors/connectors.service'
import { WazuhService } from '../connectors/services/wazuh.service'
import type { HuntSessionRecord, PaginatedHuntSessions, PaginatedHuntEvents } from './hunts.types'
import type { Prisma } from '@prisma/client'

@Injectable()
export class HuntsService {
  private readonly logger = new Logger(HuntsService.name)
  private readonly log: ServiceLogger

  constructor(
    private readonly huntsRepository: HuntsRepository,
    private readonly connectorsService: ConnectorsService,
    private readonly wazuhService: WazuhService,
    private readonly appLogger: AppLoggerService
  ) {
    this.log = new ServiceLogger(this.appLogger, AppLogFeature.HUNTS, 'HuntsService')
  }

  async runHunt(tenantId: string, dto: RunHuntDto, email: string): Promise<HuntSessionRecord> {
    this.log.entry('runHunt', tenantId, {
      query: dto.query,
      timeRange: dto.timeRange,
      actorEmail: email,
    })

    const session = await this.huntsRepository.createSession({
      tenantId,
      query: dto.query,
      status: HuntSessionStatus.running,
      startedBy: email,
      timeRange: dto.timeRange,
      reasoning: ['Querying Wazuh Indexer for matching events'],
    })

    const wazuhConfig = await this.connectorsService.getDecryptedConfig(
      tenantId,
      ConnectorType.WAZUH
    )
    if (!wazuhConfig) {
      return this.handleMissingConnector(session, tenantId, email)
    }

    const sanitized = this.validateAndSanitizeQuery(dto.query)
    const esQuery = buildHuntEsQuery(sanitized, dto.timeRange)

    try {
      return await this.executeHuntQuery(session, esQuery, dto, tenantId, email, wazuhConfig)
    } catch (error) {
      return this.handleHuntError(error, session, tenantId, email, dto.query)
    }
  }

  async listRuns(tenantId: string, page: number, limit: number): Promise<PaginatedHuntSessions> {
    this.log.entry('listRuns', tenantId, { page, limit })

    try {
      const skip = (page - 1) * limit
      const [data, total] = await Promise.all([
        this.huntsRepository.findSessionsPaginated(tenantId, skip, limit),
        this.huntsRepository.countSessions(tenantId),
      ])

      this.log.success('listRuns', tenantId, { page, limit, total, returnedCount: data.length })

      return { data, pagination: buildPaginationMeta(page, limit, total) }
    } catch (error: unknown) {
      this.log.error('listRuns', tenantId, error)
      throw error
    }
  }

  async getRun(tenantId: string, id: string): Promise<HuntSessionRecord> {
    this.log.debug('getRun', tenantId, 'starting', { sessionId: id })

    const session = await this.huntsRepository.findSessionByIdAndTenant(id, tenantId)
    if (!session) {
      this.log.warn('getRun', tenantId, 'session not found', { sessionId: id })
      throw new BusinessException(404, `Hunt session ${id} not found`, 'errors.hunts.notFound')
    }

    this.log.debug('getRun', tenantId, 'completed', { sessionId: id })

    return session
  }

  async getEvents(
    tenantId: string,
    sessionId: string,
    page: number,
    limit: number
  ): Promise<PaginatedHuntEvents> {
    this.log.debug('getEvents', tenantId, 'starting', { sessionId, page, limit })

    const session = await this.huntsRepository.findSessionExistsByIdAndTenant(sessionId, tenantId)
    if (!session) {
      this.log.warn('getEvents', tenantId, 'session not found', { sessionId })
      throw new BusinessException(
        404,
        `Hunt session ${sessionId} not found`,
        'errors.hunts.notFound'
      )
    }

    const skip = (page - 1) * limit
    const [data, total] = await Promise.all([
      this.huntsRepository.findEventsPaginated(sessionId, skip, limit),
      this.huntsRepository.countEvents(sessionId),
    ])

    this.log.debug('getEvents', tenantId, 'completed', {
      sessionId,
      page,
      limit,
      total,
      returnedCount: data.length,
    })

    return { data, pagination: buildPaginationMeta(page, limit, total) }
  }

  /* ---------------------------------------------------------------- */
  /* DELETE                                                            */
  /* ---------------------------------------------------------------- */

  async deleteRun(tenantId: string, id: string, email: string): Promise<{ deleted: boolean }> {
    this.log.entry('deleteRun', tenantId, { sessionId: id, actorEmail: email })

    try {
      const session = await this.huntsRepository.findSessionByIdAndTenant(id, tenantId)
      if (!session) {
        this.log.warn('deleteRun', tenantId, 'session not found', { sessionId: id })
        throw new BusinessException(404, `Hunt session ${id} not found`, 'errors.hunts.notFound')
      }

      await this.huntsRepository.deleteSessionAndEvents(id, tenantId)

      this.log.success('deleteRun', tenantId, {
        sessionId: id,
        actorEmail: email,
        query: session.query,
      })

      return { deleted: true }
    } catch (error: unknown) {
      if (error instanceof BusinessException) throw error
      this.log.error('deleteRun', tenantId, error, { sessionId: id })
      throw error
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Hunt Execution Pipeline                                  */
  /* ---------------------------------------------------------------- */

  private async executeHuntQuery(
    session: { id: string; status: HuntSessionStatus },
    esQuery: Record<string, unknown>,
    dto: RunHuntDto,
    tenantId: string,
    email: string,
    wazuhConfig: Record<string, unknown>
  ): Promise<HuntSessionRecord> {
    const result = await this.wazuhService.searchAllAlerts(wazuhConfig, esQuery)
    const eventData = await this.processHuntEvents(result.hits, session.id)

    const updated = await this.completeHuntSession(
      session,
      eventData,
      result,
      dto,
      tenantId,
      esQuery
    )

    this.log.success('runHunt', tenantId, {
      sessionId: session.id,
      actorEmail: email,
      eventsFound: result.total,
      query: dto.query,
      timeRange: dto.timeRange,
    })
    return updated
  }

  private async processHuntEvents(
    hits: unknown[],
    sessionId: string
  ): Promise<ReturnType<typeof mapHitsToEventData>> {
    const eventData = mapHitsToEventData(hits, sessionId)
    if (eventData.length > 0) {
      await processChunked(eventData, 50, chunk => this.huntsRepository.createManyEvents(chunk))
    }
    return eventData
  }

  private async completeHuntSession(
    session: { id: string; status: HuntSessionStatus },
    eventData: ReturnType<typeof mapHitsToEventData>,
    result: { hits: unknown[]; total: number },
    dto: RunHuntDto,
    tenantId: string,
    esQuery: Record<string, unknown>
  ): Promise<HuntSessionRecord> {
    const analysisData = this.buildHuntAnalysisData(eventData, result, dto)

    this.assertValidTransition(session.status, HuntSessionStatus.completed)
    return this.huntsRepository.updateSessionCompletedWithEvents({
      id: session.id,
      tenantId,
      status: HuntSessionStatus.completed,
      completedAt: nowDate(),
      eventsFound: result.total,
      uniqueIps: analysisData.uniqueIpCount,
      threatScore: analysisData.threatScoreValue,
      mitreTactics: analysisData.mitreTactics,
      mitreTechniques: analysisData.mitreTechniques,
      timeRange: dto.timeRange,
      executedQuery: esQuery as Prisma.InputJsonValue,
      reasoning: analysisData.reasoning,
      aiAnalysis: analysisData.aiAnalysis,
    })
  }

  private buildHuntAnalysisData(
    eventData: ReturnType<typeof mapHitsToEventData>,
    result: { hits: unknown[]; total: number },
    dto: RunHuntDto
  ): {
    uniqueIpCount: number
    threatScoreValue: number
    mitreTactics: string[]
    mitreTechniques: string[]
    reasoning: string[]
    aiAnalysis: string
  } {
    const uniqueIpCount = countUniqueIps(eventData)
    const { mitreTactics, mitreTechniques } = extractMitreFromHits(result.hits)
    const threatScoreValue = computeThreatScore(eventData, uniqueIpCount, mitreTechniques.length)

    const reasoning = buildHuntReasoning(
      dto.timeRange,
      result.total,
      uniqueIpCount,
      mitreTechniques,
      threatScoreValue
    )
    const aiAnalysis = generateHuntAnalysis(
      dto.query,
      result.total,
      uniqueIpCount,
      mitreTechniques,
      eventData
    )

    return { uniqueIpCount, threatScoreValue, mitreTactics, mitreTechniques, reasoning, aiAnalysis }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Error Handlers                                           */
  /* ---------------------------------------------------------------- */

  private async handleMissingConnector(
    session: { id: string; status: HuntSessionStatus },
    tenantId: string,
    email: string
  ): Promise<never> {
    this.assertValidTransition(session.status, HuntSessionStatus.error)
    await this.huntsRepository.updateSessionStatus({
      id: session.id,
      tenantId,
      status: HuntSessionStatus.error,
      completedAt: nowDate(),
      reasoning: [
        'Querying Wazuh Indexer for matching events',
        'Wazuh/OpenSearch connector is not configured or not enabled for this tenant',
      ],
    })

    this.log.warn('runHunt', tenantId, 'missing connector', { sessionId: session.id, email })
    throw new BusinessException(
      422,
      'Wazuh/OpenSearch connector is not configured for this tenant',
      'errors.hunts.searchConnectorNotConfigured'
    )
  }

  private async handleHuntError(
    error: unknown,
    session: { id: string; status: HuntSessionStatus },
    tenantId: string,
    email: string,
    _query: string
  ): Promise<never> {
    if (error instanceof BusinessException) throw error

    const errorMessage =
      error instanceof Error
        ? error.message || 'Could not connect to Wazuh Indexer — verify the service is running'
        : 'Unknown error during hunt query'

    this.logger.error(`Hunt query failed for session ${session.id}: ${errorMessage}`, { email })

    this.assertValidTransition(session.status, HuntSessionStatus.error)
    await this.huntsRepository.updateSessionStatus({
      id: session.id,
      tenantId,
      status: HuntSessionStatus.error,
      completedAt: nowDate(),
      reasoning: ['Querying Wazuh Indexer for matching events', `Query failed: ${errorMessage}`],
    })

    throw new BusinessException(
      502,
      `Hunt query failed: ${errorMessage}`,
      'errors.hunts.queryFailed'
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Validation                                               */
  /* ---------------------------------------------------------------- */

  private validateAndSanitizeQuery(query: string): string {
    const sanitized = sanitizeEsQuery(query)

    if (sanitized.length === 0) {
      this.log.warn('sanitizeEsQuery', '', 'Hunt query is invalid or empty after sanitization', {
        originalQueryLength: query.length,
      })
      throw new BusinessException(400, 'Invalid or empty hunt query', 'errors.hunts.invalidQuery')
    }

    return sanitized
  }

  private assertValidTransition(from: HuntSessionStatus, to: HuntSessionStatus): void {
    const allowed = VALID_HUNT_TRANSITIONS.get(from)
    if (!allowed?.has(to)) {
      throw new BusinessException(
        400,
        `Invalid hunt session transition from ${from} to ${to}`,
        'errors.hunts.invalidTransition'
      )
    }
  }
}
