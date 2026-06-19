import { Injectable, Logger } from '@nestjs/common'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../../common/enums'
import { AxiosService } from '../../../common/modules/axios'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { extractRemoteErrorMessage, formatRemoteError } from '../connectors.utilities'
import type { TestResult } from '../connectors.types'

@Injectable()
export class GrafanaService {
  private readonly logger = new Logger(GrafanaService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  /**
   * Test Grafana connection.
   * GET /api/health (public) then GET /api/org (authenticated).
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = config.baseUrl as string | undefined
    if (!baseUrl) {
      return { ok: false, details: 'Grafana base URL not configured' }
    }

    try {
      return await this.executeHealthCheck(config, baseUrl)
    } catch (error) {
      return this.handleTestError(error)
    }
  }

  /**
   * Get dashboards from Grafana.
   */
  async getDashboards(config: Record<string, unknown>): Promise<unknown[]> {
    const baseUrl = config.baseUrl as string
    const headers = this.buildAuthHeaders(config)

    const res = await this.httpClient.fetch(`${baseUrl}/api/search?type=dash-db`, {
      headers,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('getDashboards', res.status, res.data)
      throw new Error(formatRemoteError('Grafana', res.status, res.data))
    }

    const dashboards = (res.data ?? []) as unknown[]
    this.logActionSuccess('getDashboards', { count: dashboards.length })
    return dashboards
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeHealthCheck(
    config: Record<string, unknown>,
    baseUrl: string
  ): Promise<TestResult> {
    const headers = this.buildAuthHeaders(config)

    const res = await this.httpClient.fetch(`${baseUrl}/api/health`, {
      headers,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('testConnection', res.status, res.data)
      return { ok: false, details: formatRemoteError('Grafana', res.status, res.data) }
    }

    const health = res.data as Record<string, unknown>
    const version = (health.version ?? 'unknown') as string
    this.logActionSuccess('testConnection', { version })

    return {
      ok: true,
      details: `Grafana v${version} reachable at ${baseUrl}. Database: ${health.database ?? 'ok'}.`,
    }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`Grafana connection test failed: ${message}`)

    this.appLogger.error('Grafana connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'GrafanaService',
      functionName: 'testConnection',
      metadata: { connectorType: 'grafana', error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Auth & Logging                                           */
  /* ---------------------------------------------------------------- */

  private buildAuthHeaders(config: Record<string, unknown>): Record<string, string> {
    const apiKey = config.apiKey as string | undefined
    if (apiKey) {
      return { Authorization: `Bearer ${apiKey}` }
    }

    const username = config.username as string | undefined
    const password = config.password as string | undefined
    if (username && password) {
      return { Authorization: this.httpClient.basicAuth(username, password) }
    }

    return {}
  }

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`Grafana ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'GrafanaService',
      functionName: action,
      metadata: { connectorType: 'grafana', ...metadata },
    })
  }

  private logRemoteFailure(
    action: string,
    status: number,
    data: unknown
  ): void {
    this.appLogger.warn(`Grafana ${action} returned non-success`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      className: 'GrafanaService',
      sourceType: AppLogSourceType.SERVICE,
      outcome: AppLogOutcome.FAILURE,
      metadata: {
        connectorType: 'grafana',
        status,
        remoteError: extractRemoteErrorMessage(data),
      },
    })
  }
}
