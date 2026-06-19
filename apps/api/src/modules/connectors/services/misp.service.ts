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
import {
  extractMispAuthKey,
  extractMispBaseUrl,
  extractRemoteErrorMessage,
  formatRemoteError,
} from '../connectors.utilities'
import type { TestResult } from '../connectors.types'

@Injectable()
export class MispService {
  private readonly logger = new Logger(MispService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  /**
   * Test MISP connection.
   * GET /servers/getPyMISPVersion.json with Authorization header.
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = extractMispBaseUrl(config)
    if (!baseUrl) {
      return { ok: false, details: 'MISP URL not configured' }
    }

    const authKey = extractMispAuthKey(config)
    if (!authKey) {
      return { ok: false, details: 'MISP auth key not configured' }
    }

    try {
      return await this.executeVersionCheck(config, baseUrl, authKey)
    } catch (error) {
      return this.handleTestError(error)
    }
  }

  /**
   * Get recent events from MISP.
   */
  async getEvents(config: Record<string, unknown>, limit: number = 20): Promise<unknown[]> {
    const baseUrl = extractMispBaseUrl(config) as string
    const authKey = extractMispAuthKey(config) as string

    const res = await this.httpClient.fetch(
      `${baseUrl}/events/index?limit=${limit}&sort=date&direction=desc`,
      {
        headers: { Authorization: authKey, Accept: 'application/json' },
        rejectUnauthorized: config.verifyTls !== false,
        allowPrivateNetwork: true,
      }
    )

    if (res.status !== 200) {
      this.logRemoteFailure('getEvents', res.status, res.data, { limit })
      throw new Error(formatRemoteError('MISP', res.status, res.data))
    }

    const events = (res.data ?? []) as unknown[]
    this.logActionSuccess('getEvents', { limit, count: events.length })
    return events
  }

  /**
   * Search attributes (IOCs) in MISP.
   */
  async searchAttributes(
    config: Record<string, unknown>,
    searchParameters: Record<string, unknown>
  ): Promise<unknown[]> {
    const baseUrl = extractMispBaseUrl(config) as string
    const authKey = extractMispAuthKey(config) as string

    const res = await this.httpClient.fetch(`${baseUrl}/attributes/restSearch`, {
      method: HttpMethod.POST,
      headers: { Authorization: authKey, Accept: 'application/json' },
      body: searchParameters,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('searchAttributes', res.status, res.data)
      throw new Error(formatRemoteError('MISP', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const response = body.response as Record<string, unknown> | undefined
    const results = (response?.Attribute as unknown[]) ?? []
    this.logActionSuccess('searchAttributes', { resultCount: results.length })
    return results
  }

  /**
   * Get a single MISP event by ID.
   */
  async getEvent(config: Record<string, unknown>, eventId: string): Promise<unknown> {
    this.validateEventId(eventId)

    const baseUrl = extractMispBaseUrl(config) as string
    const authKey = extractMispAuthKey(config) as string

    const res = await this.httpClient.fetch(`${baseUrl}/events/view/${eventId}`, {
      headers: { Authorization: authKey, Accept: 'application/json' },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('getEvent', res.status, res.data, { eventId })
      throw new Error(formatRemoteError('MISP', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    this.logActionSuccess('getEvent', { eventId })
    return body.Event ?? body
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeVersionCheck(
    config: Record<string, unknown>,
    baseUrl: string,
    authKey: string
  ): Promise<TestResult> {
    const res = await this.httpClient.fetch(`${baseUrl}/servers/getPyMISPVersion.json`, {
      headers: { Authorization: authKey, Accept: 'application/json' },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('testConnection', res.status, res.data)
      return { ok: false, details: formatRemoteError('MISP', res.status, res.data) }
    }

    const body = res.data as Record<string, unknown>
    const version = (body.version as string) ?? 'unknown'
    this.logActionSuccess('testConnection', { version })

    return {
      ok: true,
      details: `MISP reachable at ${baseUrl}. PyMISP version: ${version}.`,
    }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`MISP connection test failed: ${message}`)

    this.appLogger.error('MISP connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'MispService',
      functionName: 'testConnection',
      metadata: { connectorType: ConnectorType.MISP, error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Validation & Logging                                     */
  /* ---------------------------------------------------------------- */

  private validateEventId(eventId: string): void {
    if (!/^\d+$/.test(eventId)) {
      this.appLogger.warn('Invalid MISP event ID provided', {
        feature: AppLogFeature.CONNECTORS,
        action: 'getEvent',
        className: 'MispService',
        sourceType: AppLogSourceType.SERVICE,
        outcome: AppLogOutcome.FAILURE,
        metadata: { eventId },
      })
      throw new Error('Invalid MISP event ID')
    }
  }

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`MISP ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'MispService',
      functionName: action,
      metadata: { connectorType: ConnectorType.MISP, ...metadata },
    })
  }

  private logRemoteFailure(
    action: string,
    status: number,
    data: unknown,
    extra?: Record<string, unknown>
  ): void {
    this.appLogger.warn(`MISP ${action} failed`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      className: 'MispService',
      sourceType: AppLogSourceType.SERVICE,
      outcome: AppLogOutcome.FAILURE,
      metadata: {
        connectorType: ConnectorType.MISP,
        status,
        remoteError: extractRemoteErrorMessage(data),
        ...extra,
      },
    })
  }
}
