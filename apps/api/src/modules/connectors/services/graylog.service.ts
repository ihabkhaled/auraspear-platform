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
import { extractRemoteErrorMessage, formatRemoteError } from '../connectors.utilities'
import type { TestResult } from '../connectors.types'

@Injectable()
export class GraylogService {
  private readonly logger = new Logger(GraylogService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  /**
   * Test Graylog connection.
   * GET /api/system/cluster/nodes with basic auth + X-Requested-By header.
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = config.baseUrl as string | undefined
    if (!baseUrl) {
      return { ok: false, details: 'Graylog base URL not configured' }
    }

    const username = config.username as string | undefined
    const password = config.password as string | undefined
    if (!username || !password) {
      return { ok: false, details: 'Graylog username/password not configured' }
    }

    try {
      return await this.executeClusterCheck(config, baseUrl, username, password)
    } catch (error) {
      return this.handleTestError(error)
    }
  }

  /**
   * Search events via Graylog Events API.
   */
  async searchEvents(
    config: Record<string, unknown>,
    filter: Record<string, unknown>
  ): Promise<{ events: unknown[]; total: number }> {
    const baseUrl = config.baseUrl as string
    const username = config.username as string
    const password = config.password as string

    const res = await this.httpClient.fetch(`${baseUrl}/api/events/search`, {
      method: HttpMethod.POST,
      headers: {
        Authorization: this.httpClient.basicAuth(username, password),
        'X-Requested-By': 'AuraSpear',
      },
      body: filter,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('searchEvents', res.status, res.data)
      throw new Error(formatRemoteError('Graylog', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const events = (body.events ?? []) as unknown[]
    const total = (body.total_results ?? 0) as number
    this.logActionSuccess('searchEvents', { resultCount: events.length, total })
    return { events, total }
  }

  /**
   * Get event definitions from Graylog.
   */
  async getEventDefinitions(config: Record<string, unknown>): Promise<unknown[]> {
    const baseUrl = config.baseUrl as string
    const username = config.username as string
    const password = config.password as string

    const res = await this.httpClient.fetch(`${baseUrl}/api/events/definitions`, {
      headers: {
        Authorization: this.httpClient.basicAuth(username, password),
        'X-Requested-By': 'AuraSpear',
      },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('getEventDefinitions', res.status, res.data)
      throw new Error(formatRemoteError('Graylog', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const definitions = (body.event_definitions ?? []) as unknown[]
    this.logActionSuccess('getEventDefinitions', { count: definitions.length })
    return definitions
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeClusterCheck(
    config: Record<string, unknown>,
    baseUrl: string,
    username: string,
    password: string
  ): Promise<TestResult> {
    const res = await this.httpClient.fetch(`${baseUrl}/api/system/cluster/nodes`, {
      headers: {
        Authorization: this.httpClient.basicAuth(username, password),
        'X-Requested-By': 'AuraSpear',
      },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('testConnection', res.status, res.data)
      return { ok: false, details: formatRemoteError('Graylog', res.status, res.data) }
    }

    const body = res.data as Record<string, unknown>
    const nodes = (body.nodes ?? body.total) as number | undefined
    this.logActionSuccess('testConnection', { nodes })

    return {
      ok: true,
      details: `Graylog reachable at ${baseUrl}. Nodes: ${nodes ?? 'unknown'}.`,
    }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`Graylog connection test failed: ${message}`)

    this.appLogger.error('Graylog connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'GraylogService',
      functionName: 'testConnection',
      metadata: { connectorType: ConnectorType.GRAYLOG, error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`Graylog ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'GraylogService',
      functionName: action,
      metadata: { connectorType: ConnectorType.GRAYLOG, ...metadata },
    })
  }

  private logRemoteFailure(action: string, status: number, data: unknown): void {
    this.appLogger.warn(`Graylog ${action} failed`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      className: 'GraylogService',
      sourceType: AppLogSourceType.SERVICE,
      outcome: AppLogOutcome.FAILURE,
      metadata: {
        connectorType: ConnectorType.GRAYLOG,
        status,
        remoteError: extractRemoteErrorMessage(data),
      },
    })
  }
}
