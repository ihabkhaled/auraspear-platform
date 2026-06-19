import { Injectable, Logger } from '@nestjs/common'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../../common/enums'
import { AxiosService } from '../../../common/modules/axios'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import {
  buildOptionalBasicAuthHeaders,
  extractRemoteErrorMessage,
  formatRemoteError,
} from '../connectors.utilities'
import type { TestResult } from '../connectors.types'

@Injectable()
export class LogstashService {
  private readonly logger = new Logger(LogstashService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  /**
   * Test Logstash connection via the Monitoring API.
   * GET / on the Logstash API port (default 9600) returns node info.
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = config.baseUrl as string | undefined
    if (!baseUrl) {
      return { ok: false, details: 'Logstash base URL not configured' }
    }

    try {
      return await this.executeNodeInfoCheck(config, baseUrl)
    } catch (error) {
      return this.handleTestError(error)
    }
  }

  /**
   * Get pipeline stats from Logstash Monitoring API.
   * GET /_node/pipelines
   */
  async getPipelines(
    config: Record<string, unknown>
  ): Promise<{ pipelines: Record<string, unknown> }> {
    const pipelines = await this.fetchLogstashEndpoint(config, '/_node/pipelines', 'getPipelines')
    return { pipelines }
  }

  /**
   * Get pipeline stats (events in/out/filtered, queue info).
   * GET /_node/stats/pipelines
   */
  async getPipelineStats(
    config: Record<string, unknown>
  ): Promise<{ pipelines: Record<string, unknown> }> {
    const pipelines = await this.fetchLogstashEndpoint(
      config,
      '/_node/stats/pipelines',
      'getPipelineStats'
    )
    return { pipelines }
  }

  /**
   * Get hot threads from Logstash (useful for debugging performance).
   * GET /_node/hot_threads
   */
  async getHotThreads(config: Record<string, unknown>): Promise<unknown> {
    const baseUrl = config.baseUrl as string
    const headers = buildOptionalBasicAuthHeaders(config, (u, p) =>
      this.httpClient.basicAuth(u, p)
    )

    const res = await this.httpClient.fetch(`${baseUrl}/_node/hot_threads?human=true`, {
      headers,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('getHotThreads', res.status, res.data)
      throw new Error(formatRemoteError('Logstash', res.status, res.data))
    }

    this.logActionSuccess('getHotThreads', {})
    return res.data
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeNodeInfoCheck(
    config: Record<string, unknown>,
    baseUrl: string
  ): Promise<TestResult> {
    const headers = buildOptionalBasicAuthHeaders(config, (u, p) =>
      this.httpClient.basicAuth(u, p)
    )

    const res = await this.httpClient.fetch(`${baseUrl}/`, {
      headers,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('testConnection', res.status, res.data)
      return { ok: false, details: formatRemoteError('Logstash', res.status, res.data) }
    }

    const body = res.data as Record<string, unknown>
    const version = (body.version ?? 'unknown') as string
    const status = (body.status ?? 'unknown') as string
    this.logActionSuccess('testConnection', { version, status })

    return {
      ok: true,
      details: `Logstash reachable at ${baseUrl}. Version: ${version}. Status: ${status}.`,
    }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`Logstash connection test failed: ${message}`)

    this.appLogger.error('Logstash connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'LogstashService',
      functionName: 'testConnection',
      metadata: { connectorType: 'logstash', error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Shared Fetch                                             */
  /* ---------------------------------------------------------------- */

  private async fetchLogstashEndpoint(
    config: Record<string, unknown>,
    path: string,
    action: string
  ): Promise<Record<string, unknown>> {
    const baseUrl = config.baseUrl as string
    const headers = buildOptionalBasicAuthHeaders(config, (u, p) =>
      this.httpClient.basicAuth(u, p)
    )

    const res = await this.httpClient.fetch(`${baseUrl}${path}`, {
      headers,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure(action, res.status, res.data)
      throw new Error(formatRemoteError('Logstash', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const pipelines = (body.pipelines ?? {}) as Record<string, unknown>
    this.logActionSuccess(action, { count: Object.keys(pipelines).length })
    return pipelines
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`Logstash ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'LogstashService',
      functionName: action,
      metadata: { connectorType: 'logstash', ...metadata },
    })
  }

  private logRemoteFailure(action: string, status: number, data: unknown): void {
    this.appLogger.warn(`Logstash ${action} failed`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      className: 'LogstashService',
      sourceType: AppLogSourceType.SERVICE,
      outcome: AppLogOutcome.FAILURE,
      metadata: { status, remoteError: extractRemoteErrorMessage(data) },
    })
  }
}
