import { Injectable, Logger } from '@nestjs/common'
import {
  AppLogFeature,
  AppLogOutcome,
  AppLogSourceType,
  ConnectorType,
  HttpMethod,
} from '../../../common/enums'
import { AxiosService } from '../../../common/modules/axios'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { nowMs } from '../../../common/utils/date-time.utility'
import {
  extractRemoteErrorMessage,
  extractSearchTotal,
  extractWazuhVersion,
  formatRemoteError,
} from '../connectors.utilities'
import type { ScrollCollectionParameters, TestResult, WazuhTokenCache } from '../connectors.types'

@Injectable()
export class WazuhService {
  private readonly logger = new Logger(WazuhService.name)
  private readonly tokenCache = new Map<string, WazuhTokenCache>()

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  /**
   * Test Wazuh Manager connection.
   * Authenticates via POST /security/user/authenticate (basic auth).
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const managerUrl = (config.managerUrl ?? config.baseUrl) as string | undefined
    if (!managerUrl) {
      return { ok: false, details: 'Wazuh Manager URL not configured' }
    }

    const username = config.username as string | undefined
    const password = config.password as string | undefined
    if (!username || !password) {
      return { ok: false, details: 'Wazuh Manager username/password not configured' }
    }

    try {
      return await this.executeManagerCheck(config, managerUrl, username, password)
    } catch (error) {
      return this.handleTestError(error)
    }
  }

  /**
   * Authenticate with Wazuh Manager and return JWT token.
   * Caches token for 10 minutes.
   */
  async authenticate(
    managerUrl: string,
    username: string,
    password: string,
    config: Record<string, unknown> = {}
  ): Promise<string> {
    const cacheKey = `${managerUrl}:${username}`
    const cached = this.tokenCache.get(cacheKey)
    if (cached && cached.expiresAt > nowMs()) {
      return cached.token
    }

    const token = await this.fetchAuthToken(managerUrl, username, password, config)
    this.cacheToken(cacheKey, token)
    this.logActionSuccess('authenticate', {})
    return token
  }

  /**
   * Get agents from Wazuh Manager.
   */
  async getAgents(config: Record<string, unknown>): Promise<unknown[]> {
    const managerUrl = (config.managerUrl ?? config.baseUrl) as string
    const token = await this.authenticate(
      managerUrl,
      config.username as string,
      config.password as string,
      config
    )

    const res = await this.httpClient.fetch(`${managerUrl}/agents?status=active&limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('getAgents', res.status, res.data)
      throw new Error(formatRemoteError('Wazuh Manager', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const data = body.data as Record<string, unknown> | undefined
    const agents = (data?.affected_items ?? []) as unknown[]
    this.logActionSuccess('getAgents', { count: agents.length })
    return agents
  }

  /**
   * Search alerts from Wazuh Indexer via Elasticsearch DSL.
   */
  async searchAlerts(
    config: Record<string, unknown>,
    query: Record<string, unknown>,
    index: string = 'wazuh-alerts-*'
  ): Promise<{ hits: unknown[]; total: number }> {
    const { indexerUrl, authHeader, tlsOption } = this.resolveIndexerConfig(config)
    this.validateIndexName(index)

    const res = await this.httpClient.fetch(`${indexerUrl}/${index}/_search`, {
      method: HttpMethod.POST,
      headers: { Authorization: authHeader },
      body: query,
      rejectUnauthorized: tlsOption,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('searchAlerts', res.status, res.data, { index })
      throw new Error(formatRemoteError('Wazuh Indexer', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const hits = body.hits as Record<string, unknown>
    const total = extractSearchTotal(hits.total as Record<string, unknown> | number)
    const hitItems = (hits.hits ?? []) as unknown[]

    this.logActionSuccess('searchAlerts', { index, resultCount: hitItems.length, total })
    return { hits: hitItems, total }
  }

  /**
   * Fetch ALL matching alerts using OpenSearch scroll API.
   * Max 10,000 events as a safety cap.
   */
  async searchAllAlerts(
    config: Record<string, unknown>,
    query: Record<string, unknown>,
    index: string = 'wazuh-alerts-*'
  ): Promise<{ hits: unknown[]; total: number }> {
    const { indexerUrl, authHeader, tlsOption } = this.resolveIndexerConfig(config)
    this.validateIndexName(index)

    const { allHits, total, scrollId } = await this.executeInitialScroll(
      indexerUrl,
      authHeader,
      tlsOption,
      index,
      query
    )

    const finalScrollId = await this.collectScrollResults({
      indexerUrl,
      authHeader,
      tlsOption,
      scrollId,
      allHits,
      total,
      maxEvents: 10_000,
    })

    this.cleanupScrollContext(indexerUrl, authHeader, tlsOption, finalScrollId)
    this.logActionSuccess('searchAllAlerts', { index, resultCount: allHits.length, total })
    return { hits: allHits, total }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeManagerCheck(
    config: Record<string, unknown>,
    managerUrl: string,
    username: string,
    password: string
  ): Promise<TestResult> {
    const token = await this.authenticate(managerUrl, username, password, config)

    const infoResponse = await this.httpClient.fetch(`${managerUrl}/manager/info`, {
      headers: { Authorization: `Bearer ${token}` },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (infoResponse.status !== 200) {
      this.logRemoteFailure('testConnection', infoResponse.status, infoResponse.data)
      return {
        ok: false,
        details: formatRemoteError('Wazuh Manager', infoResponse.status, infoResponse.data),
      }
    }

    const info = infoResponse.data as Record<string, unknown>
    const version = extractWazuhVersion(info)
    this.logActionSuccess('testConnection', { version })

    return {
      ok: true,
      details: `Wazuh Manager v${version} reachable at ${managerUrl}.`,
    }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`Wazuh connection test failed: ${message}`)

    this.appLogger.error('Wazuh connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'WazuhService',
      functionName: 'testConnection',
      metadata: { connectorType: ConnectorType.WAZUH, error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Authentication                                           */
  /* ---------------------------------------------------------------- */

  private async fetchAuthToken(
    managerUrl: string,
    username: string,
    password: string,
    config: Record<string, unknown>
  ): Promise<string> {
    const res = await this.httpClient.fetch(`${managerUrl}/security/user/authenticate`, {
      method: HttpMethod.POST,
      headers: { Authorization: this.httpClient.basicAuth(username, password) },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('authenticate', res.status, res.data)
      throw new Error(formatRemoteError('Wazuh Manager', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const data = body.data as Record<string, unknown> | undefined
    const token = (data?.token ?? body.token) as string

    if (!token) {
      this.logRemoteFailure('authenticate', 200, { message: 'No token in response' })
      throw new Error('Wazuh authentication returned no token')
    }

    return token
  }

  private cacheToken(cacheKey: string, token: string): void {
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: nowMs() + 10 * 60 * 1000,
    })
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Indexer Config & Validation                               */
  /* ---------------------------------------------------------------- */

  private resolveIndexerConfig(config: Record<string, unknown>): {
    indexerUrl: string
    authHeader: string
    tlsOption: boolean
  } {
    const indexerUrl = (config.indexerUrl ?? config.opensearchUrl) as string | undefined
    if (!indexerUrl) {
      this.logRemoteFailure('searchAlerts', 0, { message: 'Indexer URL not configured' })
      throw new Error('Wazuh Indexer URL not configured')
    }

    const username = (config.indexerUsername ?? config.username) as string
    const password = (config.indexerPassword ?? config.password) as string
    const authHeader = this.httpClient.basicAuth(username, password)
    const tlsOption = config.verifyTls !== false

    return { indexerUrl, authHeader, tlsOption }
  }

  private validateIndexName(index: string): void {
    if (!/^[\w*-]+$/.test(index)) {
      this.appLogger.warn('Invalid Wazuh index name provided', {
        feature: AppLogFeature.CONNECTORS,
        action: 'searchAlerts',
        className: 'WazuhService',
        sourceType: AppLogSourceType.SERVICE,
        outcome: AppLogOutcome.FAILURE,
        metadata: { index },
      })
      throw new Error('Invalid index name')
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Scroll API                                               */
  /* ---------------------------------------------------------------- */

  private async executeInitialScroll(
    indexerUrl: string,
    authHeader: string,
    tlsOption: boolean,
    index: string,
    query: Record<string, unknown>
  ): Promise<{ allHits: unknown[]; total: number; scrollId: string | undefined }> {
    const initialResponse = await this.fetchScrollPage(
      `${indexerUrl}/${index}/_search?scroll=1m`,
      authHeader,
      tlsOption,
      { ...query, size: 1000 }
    )

    if (initialResponse.status !== 200) {
      throw new Error(
        formatRemoteError('Wazuh Indexer', initialResponse.status, initialResponse.data)
      )
    }

    return this.parseScrollResponse(initialResponse.data)
  }

  private async fetchScrollPage(
    url: string,
    authHeader: string,
    tlsOption: boolean,
    body: Record<string, unknown>
  ): Promise<{ status: number; data: unknown }> {
    return this.httpClient.fetch(url, {
      method: HttpMethod.POST,
      headers: { Authorization: authHeader },
      body,
      rejectUnauthorized: tlsOption,
      allowPrivateNetwork: true,
      timeoutMs: 30_000,
    })
  }

  private parseScrollResponse(data: unknown): {
    allHits: unknown[]
    total: number
    scrollId: string | undefined
  } {
    const body = data as Record<string, unknown>
    const hitsWrapper = body.hits as Record<string, unknown>
    const total = extractSearchTotal(hitsWrapper.total as Record<string, unknown> | number)
    const scrollId = body._scroll_id as string | undefined
    const allHits: unknown[] = [...((hitsWrapper.hits ?? []) as unknown[])]

    return { allHits, total, scrollId }
  }

  /**
   * Recursively collect scroll results from OpenSearch.
   */
  private async collectScrollResults(
    parameters: ScrollCollectionParameters
  ): Promise<string | undefined> {
    const { indexerUrl, authHeader, tlsOption, scrollId, allHits, total, maxEvents } = parameters

    if (!scrollId || allHits.length >= total || allHits.length >= maxEvents) {
      return scrollId
    }

    const scrollResponse = await this.fetchScrollPage(
      `${indexerUrl}/_search/scroll`,
      authHeader,
      tlsOption,
      { scroll: '1m', scroll_id: scrollId }
    )

    if (scrollResponse.status !== 200) {
      return scrollId
    }

    const nextScrollId = this.appendScrollBatch(scrollResponse.data, allHits)

    return this.collectScrollResults({
      indexerUrl,
      authHeader,
      tlsOption,
      scrollId: nextScrollId,
      allHits,
      total,
      maxEvents,
    })
  }

  private appendScrollBatch(data: unknown, allHits: unknown[]): string | undefined {
    const scrollBody = data as Record<string, unknown>
    const scrollHits = scrollBody.hits as Record<string, unknown>
    const batch = (scrollHits.hits ?? []) as unknown[]

    if (batch.length > 0) {
      allHits.push(...batch)
    }

    return scrollBody._scroll_id as string | undefined
  }

  private cleanupScrollContext(
    indexerUrl: string,
    authHeader: string,
    tlsOption: boolean,
    scrollId: string | undefined
  ): void {
    if (!scrollId) return

    this.httpClient
      .fetch(`${indexerUrl}/_search/scroll`, {
        method: HttpMethod.DELETE,
        headers: { Authorization: authHeader },
        body: { scroll_id: [scrollId] },
        rejectUnauthorized: tlsOption,
        allowPrivateNetwork: true,
      })
      .catch(() => {
        // Scroll cleanup is best-effort
      })
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`Wazuh ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'WazuhService',
      functionName: action,
      metadata: { connectorType: ConnectorType.WAZUH, ...metadata },
    })
  }

  private logRemoteFailure(
    action: string,
    status: number,
    data: unknown,
    extra?: Record<string, unknown>
  ): void {
    this.appLogger.warn(`Wazuh ${action} failed`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      className: 'WazuhService',
      sourceType: AppLogSourceType.SERVICE,
      outcome: AppLogOutcome.FAILURE,
      metadata: {
        connectorType: ConnectorType.WAZUH,
        status,
        remoteError: extractRemoteErrorMessage(data),
        ...extra,
      },
    })
  }
}
