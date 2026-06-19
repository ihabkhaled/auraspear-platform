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
  extractRemoteErrorMessage,
  extractShuffleApiKey,
  extractShuffleBaseUrl,
  formatRemoteError,
} from '../connectors.utilities'
import type { TestResult } from '../connectors.types'

@Injectable()
export class ShuffleService {
  private readonly logger = new Logger(ShuffleService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  /**
   * Test Shuffle SOAR connection.
   * GET /api/v1/apps/authentication with bearer token.
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = extractShuffleBaseUrl(config)
    if (!baseUrl) {
      return { ok: false, details: 'Shuffle URL not configured' }
    }

    const apiKey = extractShuffleApiKey(config)
    if (!apiKey) {
      return { ok: false, details: 'Shuffle API key not configured' }
    }

    try {
      return await this.executeAuthCheck(config, baseUrl, apiKey)
    } catch (error) {
      return this.handleTestError(error)
    }
  }

  /**
   * Get available workflows from Shuffle.
   */
  async getWorkflows(config: Record<string, unknown>): Promise<unknown[]> {
    const baseUrl = extractShuffleBaseUrl(config) as string
    const apiKey = extractShuffleApiKey(config) as string

    const res = await this.httpClient.fetch(`${baseUrl}/api/v1/workflows`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('getWorkflows', res.status, res.data)
      throw new Error(formatRemoteError('Shuffle', res.status, res.data))
    }

    const workflows = (res.data ?? []) as unknown[]
    this.logActionSuccess('getWorkflows', { count: workflows.length })
    return workflows
  }

  /**
   * Execute a workflow in Shuffle.
   */
  async executeWorkflow(
    config: Record<string, unknown>,
    workflowId: string,
    data: Record<string, unknown> = {}
  ): Promise<{ executionId: string }> {
    this.validateWorkflowId(workflowId)

    const baseUrl = extractShuffleBaseUrl(config) as string
    const apiKey = extractShuffleApiKey(config) as string

    const res = await this.httpClient.fetch(`${baseUrl}/api/v1/workflows/${workflowId}/execute`, {
      method: HttpMethod.POST,
      headers: { Authorization: `Bearer ${apiKey}` },
      body: data,
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('executeWorkflow', res.status, res.data, { workflowId })
      throw new Error(formatRemoteError('Shuffle', res.status, res.data))
    }

    const body = res.data as Record<string, unknown>
    const executionId = (body.execution_id ?? body.id ?? 'unknown') as string
    this.logActionSuccess('executeWorkflow', { workflowId, executionId })
    return { executionId }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeAuthCheck(
    config: Record<string, unknown>,
    baseUrl: string,
    apiKey: string
  ): Promise<TestResult> {
    const res = await this.httpClient.fetch(`${baseUrl}/api/v1/apps/authentication`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      rejectUnauthorized: config.verifyTls !== false,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      this.logRemoteFailure('testConnection', res.status, res.data)
      return { ok: false, details: formatRemoteError('Shuffle', res.status, res.data) }
    }

    this.logActionSuccess('testConnection', {})
    return { ok: true, details: `Shuffle SOAR reachable at ${baseUrl}.` }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`Shuffle connection test failed: ${message}`)

    this.appLogger.error('Shuffle connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'ShuffleService',
      functionName: 'testConnection',
      metadata: { connectorType: ConnectorType.SHUFFLE, error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Validation & Logging                                     */
  /* ---------------------------------------------------------------- */

  private validateWorkflowId(workflowId: string): void {
    if (!/^[\da-f-]+$/i.test(workflowId)) {
      this.appLogger.warn('Invalid Shuffle workflow ID provided', {
        feature: AppLogFeature.CONNECTORS,
        action: 'executeWorkflow',
        className: 'ShuffleService',
        sourceType: AppLogSourceType.SERVICE,
        outcome: AppLogOutcome.FAILURE,
        metadata: { workflowId },
      })
      throw new Error('Invalid workflow ID')
    }
  }

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`Shuffle ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'ShuffleService',
      functionName: action,
      metadata: { connectorType: ConnectorType.SHUFFLE, ...metadata },
    })
  }

  private logRemoteFailure(
    action: string,
    status: number,
    data: unknown,
    extra?: Record<string, unknown>
  ): void {
    this.appLogger.warn(`Shuffle ${action} failed`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      className: 'ShuffleService',
      sourceType: AppLogSourceType.SERVICE,
      outcome: AppLogOutcome.FAILURE,
      metadata: {
        connectorType: ConnectorType.SHUFFLE,
        status,
        remoteError: extractRemoteErrorMessage(data),
        ...extra,
      },
    })
  }
}
