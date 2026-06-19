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
export class InfluxDBService {
  private readonly logger = new Logger(InfluxDBService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  /**
   * Test InfluxDB connection.
   * GET /ping with bearer token.
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = config.baseUrl as string | undefined
    if (!baseUrl) {
      return { ok: false, details: 'InfluxDB base URL not configured' }
    }

    const token = config.token as string | undefined
    if (!token) {
      return { ok: false, details: 'InfluxDB token not configured' }
    }

    try {
      return await this.executePingCheck(config, baseUrl, token)
    } catch (error) {
      return this.handleTestError(error)
    }
  }

  /**
   * Execute a Flux query against InfluxDB.
   */
  async query(config: Record<string, unknown>, flux: string): Promise<string> {
    const baseUrl = config.baseUrl as string
    const token = config.token as string
    const org = (config.org ?? config.organization ?? '') as string

    const res = await this.httpClient.fetch(
      `${baseUrl}/api/v2/query?org=${encodeURIComponent(org)}`,
      {
        method: HttpMethod.POST,
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/vnd.flux',
          Accept: 'application/csv',
        },
        body: flux,
        rejectUnauthorized: config.verifyTls !== false,
        allowPrivateNetwork: true,
      }
    )

    if (res.status !== 200) {
      this.logRemoteFailure('query', res.status, res.data)
      throw new Error(formatRemoteError('InfluxDB', res.status, res.data))
    }

    this.logActionSuccess('query', { org })
    return res.data as string
  }

  /**
   * Get buckets from InfluxDB.
   */
  async getBuckets(config: Record<string, unknown>): Promise<unknown[]> {
    const baseUrl = config.baseUrl as string
    const token = config.token as string

    const res = await this.httpClient.fetch(`${baseUrl}/api/v2/buckets`, {
      headers: { Authorization: `Token ${token}` },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('getBuckets', res.status, res.data)
      throw new Error(formatRemoteError('InfluxDB', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const buckets = (body.buckets ?? []) as unknown[]
    this.logActionSuccess('getBuckets', { count: buckets.length })
    return buckets
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executePingCheck(
    config: Record<string, unknown>,
    baseUrl: string,
    token: string
  ): Promise<TestResult> {
    const res = await this.httpClient.fetch(`${baseUrl}/ping`, {
      headers: { Authorization: `Token ${token}` },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 204 && res.status !== 200) {
      this.logRemoteFailure('testConnection', res.status, res.data)
      return { ok: false, details: formatRemoteError('InfluxDB', res.status, res.data) }
    }

    const version = res.headers['x-influxdb-version'] ?? 'unknown'
    this.logActionSuccess('testConnection', { version })

    return {
      ok: true,
      details: `InfluxDB v${version} reachable at ${baseUrl}.`,
    }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`InfluxDB connection test failed: ${message}`)

    this.appLogger.error('InfluxDB connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'InfluxDBService',
      functionName: 'testConnection',
      metadata: { connectorType: ConnectorType.INFLUXDB, error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`InfluxDB ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'InfluxDBService',
      functionName: action,
      metadata: { connectorType: ConnectorType.INFLUXDB, ...metadata },
    })
  }

  private logRemoteFailure(action: string, status: number, data: unknown): void {
    this.appLogger.warn(`InfluxDB ${action} failed`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      className: 'InfluxDBService',
      sourceType: AppLogSourceType.SERVICE,
      outcome: AppLogOutcome.FAILURE,
      metadata: {
        connectorType: ConnectorType.INFLUXDB,
        status,
        remoteError: extractRemoteErrorMessage(data),
      },
    })
  }
}
