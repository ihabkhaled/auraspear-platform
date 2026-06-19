import { Injectable, Logger } from '@nestjs/common'
import { AppLogFeature, AppLogOutcome, AppLogSourceType, HttpMethod } from '../../../common/enums'
import { AxiosService } from '../../../common/modules/axios'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { ConnectorServiceName } from '../connectors.enums'
import {
  extractRemoteErrorMessage,
  extractSearchTotal,
  formatRemoteError,
} from '../connectors.utilities'
import type { TestResult } from '../connectors.types'

/**
 * Generic OpenSearch / Elasticsearch service.
 * Used by WazuhService for Wazuh Indexer queries and as a fallback.
 */
@Injectable()
export class OpenSearchService {
  private readonly logger = new Logger(OpenSearchService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  /**
   * Test OpenSearch cluster health.
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = config.baseUrl as string | undefined
    if (!baseUrl) {
      return { ok: false, details: 'OpenSearch base URL not configured' }
    }

    try {
      return await this.executeClusterHealthCheck(config, baseUrl)
    } catch (error) {
      return this.handleTestError(error)
    }
  }

  /**
   * Execute an Elasticsearch DSL search query.
   */
  async search(
    config: Record<string, unknown>,
    index: string,
    query: Record<string, unknown>
  ): Promise<{ hits: unknown[]; total: number }> {
    const baseUrl = config.baseUrl as string
    const headers = this.buildAuthHeaders(config)

    const res = await this.httpClient.fetch(`${baseUrl}/${index}/_search`, {
      method: HttpMethod.POST,
      headers,
      body: query,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('search', res.status, res.data, { index })
      throw new Error(formatRemoteError('OpenSearch', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const hits = body.hits as Record<string, unknown>
    const total = extractSearchTotal(hits.total as Record<string, unknown> | number)
    const hitItems = (hits.hits ?? []) as unknown[]

    this.logActionSuccess('search', { index, resultCount: hitItems.length, total })
    return { hits: hitItems, total }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeClusterHealthCheck(
    config: Record<string, unknown>,
    baseUrl: string
  ): Promise<TestResult> {
    const headers = this.buildAuthHeaders(config)

    const res = await this.httpClient.fetch(`${baseUrl}/_cluster/health`, {
      headers,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('testConnection', res.status, res.data)
      return { ok: false, details: formatRemoteError('OpenSearch', res.status, res.data) }
    }

    const health = res.data as Record<string, unknown>
    this.logActionSuccess('testConnection', {
      clusterName: health.cluster_name,
      clusterStatus: health.status,
    })

    return {
      ok: true,
      details: `OpenSearch cluster "${health.cluster_name}" status: ${health.status}. Nodes: ${health.number_of_nodes}.`,
    }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`OpenSearch connection test failed: ${message}`)

    this.appLogger.error('OpenSearch connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'OpenSearchService',
      functionName: 'testConnection',
      metadata: { connectorType: ConnectorServiceName.OPENSEARCH, error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Auth & Logging                                           */
  /* ---------------------------------------------------------------- */

  private buildAuthHeaders(config: Record<string, unknown>): Record<string, string> {
    const username = config.username as string | undefined
    const password = config.password as string | undefined
    const headers: Record<string, string> = {}
    if (username && password) {
      headers.Authorization = this.httpClient.basicAuth(username, password)
    }
    return headers
  }

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`OpenSearch ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'OpenSearchService',
      functionName: action,
      metadata: { connectorType: ConnectorServiceName.OPENSEARCH, ...metadata },
    })
  }

  private logRemoteFailure(
    action: string,
    status: number,
    data: unknown,
    extra?: Record<string, unknown>
  ): void {
    this.appLogger.warn(`OpenSearch ${action} failed`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      className: 'OpenSearchService',
      sourceType: AppLogSourceType.SERVICE,
      outcome: AppLogOutcome.FAILURE,
      metadata: {
        connectorType: ConnectorServiceName.OPENSEARCH,
        status,
        remoteError: extractRemoteErrorMessage(data),
        ...extra,
      },
    })
  }
}
