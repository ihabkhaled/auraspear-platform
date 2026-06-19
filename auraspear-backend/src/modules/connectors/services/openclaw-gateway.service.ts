import { Injectable, Logger } from '@nestjs/common'
import {
  AppLogFeature,
  AppLogOutcome,
  AppLogSourceType,
  ConnectorType,
} from '../../../common/enums'
import { AxiosService } from '../../../common/modules/axios'
import { WebSocketService } from '../../../common/modules/websocket'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { normalizeTimeoutMs } from '../connectors.utilities'
import {
  authenticateOpenClawConnection,
  safeCloseWebSocket,
  sendOpenClawChatAndCollect,
  sendOpenClawRequest,
} from '../openclaw-ws.utility'
import type { WebSocket } from '../../../common/modules/websocket'
import type { TestResult } from '../connectors.types'

@Injectable()
export class OpenClawGatewayService {
  private readonly logger = new Logger(OpenClawGatewayService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService,
    private readonly webSocketService: WebSocketService
  ) {}

  /**
   * Test connection to OpenClaw Gateway via WebSocket handshake + health check.
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = config.baseUrl as string | undefined
    if (!baseUrl) {
      return { ok: false, details: 'OpenClaw Gateway base URL not configured' }
    }

    const apiKey = config.apiKey as string | undefined
    if (!apiKey) {
      return { ok: false, details: 'OpenClaw Gateway API key not configured' }
    }

    const timeout = normalizeTimeoutMs((config.timeout as number | undefined) ?? 30_000)
    let socket: WebSocket | undefined

    try {
      socket = this.webSocketService.createConnection(baseUrl)
      await authenticateOpenClawConnection(socket, apiKey, timeout)
      return await this.executeHealthCheck(socket, timeout)
    } catch (error: unknown) {
      return this.handleTestError(error)
    } finally {
      safeCloseWebSocket(socket)
    }
  }

  /**
   * Invoke an OpenClaw Gateway task via WebSocket.
   */
  async invoke(
    config: Record<string, unknown>,
    prompt: string,
    maxTokens: number = 1024,
    taskType?: string
  ): Promise<{ text: string; inputTokens: number; outputTokens: number; taskId?: string }> {
    const baseUrl = config.baseUrl as string
    const apiKey = config.apiKey as string
    const timeout = normalizeTimeoutMs((config.timeout as number | undefined) ?? 60_000)
    const resolvedTaskType = taskType ?? 'agent_task'

    let socket: WebSocket | undefined
    try {
      socket = this.webSocketService.createConnection(baseUrl)
      await authenticateOpenClawConnection(socket, apiKey, timeout)
      const { text, runId } = await sendOpenClawChatAndCollect(
        socket,
        'agent:main:main',
        prompt,
        timeout
      )

      this.logInvokeSuccess(resolvedTaskType, maxTokens, runId)
      return { text, inputTokens: 0, outputTokens: 0, taskId: runId }
    } finally {
      safeCloseWebSocket(socket)
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeHealthCheck(socket: WebSocket, timeout: number): Promise<TestResult> {
    const healthPayload = await sendOpenClawRequest(socket, 'health', undefined, timeout)
    const version =
      healthPayload && typeof healthPayload.version === 'string' ? healthPayload.version : 'unknown'

    this.logActionSuccess('testConnection', { version })

    return {
      ok: true,
      details: `OpenClaw Gateway connected. Version: ${version}.`,
    }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`OpenClaw Gateway connection test failed: ${message}`)

    this.appLogger.error('OpenClaw Gateway connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'OpenClawGatewayService',
      functionName: 'testConnection',
      metadata: { connectorType: ConnectorType.OPENCLAW_GATEWAY, error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`OpenClaw Gateway ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'OpenClawGatewayService',
      functionName: action,
      metadata: { connectorType: ConnectorType.OPENCLAW_GATEWAY, ...metadata },
    })
  }

  private logInvokeSuccess(taskType: string, maxTokens: number, taskId?: string): void {
    this.appLogger.info('OpenClaw Gateway task invoked via WebSocket', {
      feature: AppLogFeature.CONNECTORS,
      action: 'invoke',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'OpenClawGatewayService',
      functionName: 'invoke',
      metadata: {
        connectorType: ConnectorType.OPENCLAW_GATEWAY,
        taskType,
        maxTokens,
        inputTokens: 0,
        outputTokens: 0,
        taskId,
      },
    })
  }
}
