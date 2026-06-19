import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common'
import { AppLogFeature, AppLogOutcome, AppLogSourceType } from '../../../common/enums'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import {
  buildBedrockRequestBody,
  extractBedrockConfig,
  isMissingSdkError,
  loadAwsBedrockSdk,
  parseBedrockResponse,
} from '../connectors.utilities'
import type { BedrockClient, BedrockInvokeResult, TestResult } from '../connectors.types'

@Injectable()
export class BedrockService implements OnModuleDestroy {
  private readonly logger = new Logger(BedrockService.name)
  private readonly clientCache = new Map<string, BedrockClient>()

  constructor(private readonly appLogger: AppLoggerService) {}

  onModuleDestroy(): void {
    this.clientCache.clear()
  }

  private async getOrCreateClient(
    region: string,
    accessKeyId: string | undefined,
    secretAccessKey: string | undefined,
    endpoint?: string
  ): Promise<BedrockClient> {
    const cacheKey = `${region}:${accessKeyId ?? ''}:${endpoint ?? ''}`
    const cached = this.clientCache.get(cacheKey)
    if (cached) {
      return cached
    }

    const { BedrockRuntimeClient } = await loadAwsBedrockSdk()
    const client = new BedrockRuntimeClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
      requestHandler: { requestTimeout: 30_000 },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    })

    this.clientCache.set(cacheKey, client)
    return client
  }

  /**
   * Test AWS Bedrock connection.
   * Uses AWS SDK to list foundation models and verify access.
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const { region, accessKeyId, secretAccessKey, modelId, endpoint } = extractBedrockConfig(config)

    if (!accessKeyId || !secretAccessKey) {
      return { ok: false, details: 'AWS access key ID and secret access key are required' }
    }

    try {
      return await this.executeTestInvocation(
        region,
        accessKeyId,
        secretAccessKey,
        modelId,
        endpoint
      )
    } catch (error) {
      return this.handleTestError(error, region)
    }
  }

  /**
   * Invoke a Bedrock model with a prompt.
   * Calls the real AWS Bedrock Runtime API via the AWS SDK.
   */
  async invoke(
    config: Record<string, unknown>,
    prompt: string,
    maxTokens: number = 1024,
    _model?: string,
    temperature?: number
  ): Promise<BedrockInvokeResult> {
    const { region, accessKeyId, secretAccessKey, modelId, endpoint } = extractBedrockConfig(config)

    const response = await this.sendBedrockCommand(
      region,
      accessKeyId,
      secretAccessKey,
      modelId,
      endpoint,
      prompt,
      maxTokens,
      temperature
    )

    const result = parseBedrockResponse(response.body, modelId)
    this.logInvokeSuccess(region, modelId, maxTokens, result.inputTokens, result.outputTokens)

    return {
      text: result.text,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    }
  }

  private async sendBedrockCommand(
    region: string,
    accessKeyId: string | undefined,
    secretAccessKey: string | undefined,
    modelId: string,
    endpoint: string | undefined,
    prompt: string,
    maxTokens: number,
    temperature?: number
  ): Promise<{ body: Uint8Array }> {
    const { InvokeModelCommand } = await loadAwsBedrockSdk()
    const client = await this.getOrCreateClient(region, accessKeyId, secretAccessKey, endpoint)

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: buildBedrockRequestBody(prompt, maxTokens, modelId, temperature),
    })

    return Promise.race([
      client.send(command),
      new Promise<never>((_resolve, reject) => {
        setTimeout(() => reject(new Error('Bedrock invoke timed out after 30 seconds')), 30_000)
      }),
    ])
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeTestInvocation(
    region: string,
    accessKeyId: string,
    secretAccessKey: string,
    modelId: string,
    endpoint: string | undefined
  ): Promise<TestResult> {
    const { InvokeModelCommand } = await loadAwsBedrockSdk()
    const client = await this.getOrCreateClient(region, accessKeyId, secretAccessKey, endpoint)

    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: buildBedrockRequestBody('Hi', 10, modelId),
    })

    const response = await client.send(command)
    const { stopReason } = parseBedrockResponse(response.body, modelId)
    this.logTestSuccess(region, modelId)

    return {
      ok: true,
      details: `AWS Bedrock accessible in ${region}. Model: ${modelId}. Stop reason: ${stopReason}.`,
    }
  }

  private handleTestError(error: unknown, region: string): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`Bedrock connection test failed: ${message}`)

    this.appLogger.error('Bedrock connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'BedrockService',
      functionName: 'testConnection',
      metadata: { connectorType: 'bedrock', region, error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    if (isMissingSdkError(message)) {
      return {
        ok: false,
        details: 'AWS SDK not installed. Run: npm install @aws-sdk/client-bedrock-runtime',
      }
    }

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Logging                                                  */
  /* ---------------------------------------------------------------- */

  private logTestSuccess(region: string, modelId: string): void {
    this.appLogger.info('Bedrock connection test succeeded', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'BedrockService',
      functionName: 'testConnection',
      metadata: { connectorType: 'bedrock', region, modelId },
    })
  }

  private logInvokeSuccess(
    region: string,
    modelId: string,
    maxTokens: number,
    inputTokens: number,
    outputTokens: number
  ): void {
    this.appLogger.info('Bedrock model invoked', {
      feature: AppLogFeature.CONNECTORS,
      action: 'invoke',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'BedrockService',
      functionName: 'invoke',
      metadata: {
        connectorType: 'bedrock',
        region,
        modelId,
        maxTokens,
        inputTokens,
        outputTokens,
      },
    })
  }
}
