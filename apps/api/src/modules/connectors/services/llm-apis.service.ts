import { Injectable, Logger } from '@nestjs/common'
import {
  AppLogFeature,
  AppLogOutcome,
  AppLogSourceType,
  ConnectorType,
  HttpMethod,
} from '../../../common/enums'
import { AxiosResponseData, AxiosService } from '../../../common/modules/axios'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { LlmMaxTokensParameter } from '../connectors.enums'
import {
  buildLlmApiHeaders,
  extractChatCompletionText,
  extractRemoteErrorMessage,
  formatRemoteError,
  normalizeTimeoutMs,
} from '../connectors.utilities'
import type { ChatCompletionResponse, ModelsListResponse, TestResult } from '../connectors.types'

@Injectable()
export class LlmApisService {
  private readonly logger = new Logger(LlmApisService.name)

  constructor(
    private readonly appLogger: AppLoggerService,
    private readonly httpClient: AxiosService
  ) {}

  /**
   * Test connection to an OpenAI-compatible LLM API.
   * Sends a minimal chat completion request to verify connectivity.
   */
  async testConnection(config: Record<string, unknown>): Promise<TestResult> {
    const baseUrl = config.baseUrl as string | undefined
    if (!baseUrl) {
      return { ok: false, details: 'LLM API base URL not configured' }
    }

    const apiKey = config.apiKey as string | undefined
    if (!apiKey) {
      return { ok: false, details: 'LLM API key not configured' }
    }

    try {
      return await this.executeTestCompletion(config, baseUrl, apiKey)
    } catch (error) {
      return this.handleTestError(error)
    }
  }

  /**
   * Invoke an OpenAI-compatible chat completions endpoint.
   */
  async invoke(
    config: Record<string, unknown>,
    prompt: string,
    maxTokens: number = 1024,
    model?: string,
    temperature?: number
  ): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
    const resolvedModel = model ?? ((config.defaultModel ?? 'gpt-4') as string)
    const res = await this.sendChatCompletion(config, prompt, maxTokens, resolvedModel, temperature)

    if (res.status !== 200) {
      throw new Error(formatRemoteError('LLM API', res.status, res.data))
    }

    return this.parseInvokeResponse(res.data, resolvedModel, maxTokens)
  }

  /**
   * Multi-turn chat invocation with conversation history.
   */
  async invokeChat(
    config: Record<string, unknown>,
    messages: Array<{ role: string; content: string }>,
    maxTokens: number = 16384,
    model?: string,
    temperature?: number,
    systemPrompt?: string
  ): Promise<{ text: string; model: string; inputTokens: number; outputTokens: number }> {
    const resolvedModel = model ?? ((config.defaultModel ?? 'gpt-4') as string)
    const baseUrl = config.baseUrl as string
    const apiKey = config.apiKey as string
    const maxTokensParameter = this.resolveMaxTokensParameter(config)
    const timeout = normalizeTimeoutMs((config.timeout as number | undefined) ?? 60_000)

    const headers = buildLlmApiHeaders({
      apiKey,
      organizationId: config.organizationId as string | undefined,
    })

    const chatMessages: Array<{ role: string; content: string }> = []
    if (systemPrompt) {
      chatMessages.push({ role: 'system', content: systemPrompt })
    }
    chatMessages.push(...messages)

    const requestBody: Record<string, unknown> = {
      model: resolvedModel,
      messages: chatMessages,
      [maxTokensParameter]: maxTokens,
    }
    if (temperature !== undefined) {
      requestBody.temperature = temperature
    }

    const body = JSON.stringify(requestBody)

    const res = await this.httpClient.fetch(`${baseUrl}/chat/completions`, {
      method: HttpMethod.POST,
      headers,
      body,
      timeoutMs: timeout,
    })

    if (res.status !== 200) {
      throw new Error(formatRemoteError('LLM API Chat', res.status, res.data))
    }

    const parsed = this.parseInvokeResponse(res.data, resolvedModel, maxTokens)
    return { ...parsed, model: resolvedModel }
  }

  private async sendChatCompletion(
    config: Record<string, unknown>,
    prompt: string,
    maxTokens: number,
    resolvedModel: string,
    temperature?: number
  ): Promise<{ status: number; data: unknown }> {
    const baseUrl = config.baseUrl as string
    const apiKey = config.apiKey as string
    const maxTokensParameter = this.resolveMaxTokensParameter(config)
    const timeout = normalizeTimeoutMs((config.timeout as number | undefined) ?? 60_000)

    const headers = buildLlmApiHeaders({
      apiKey,
      organizationId: config.organizationId as string | undefined,
    })

    const requestBody: Record<string, unknown> = {
      model: resolvedModel,
      messages: [{ role: 'user', content: prompt }],
      [maxTokensParameter]: maxTokens,
    }
    if (temperature !== undefined) {
      requestBody.temperature = temperature
    }

    const body = JSON.stringify(requestBody)

    return this.httpClient.fetch(`${baseUrl}/chat/completions`, {
      method: HttpMethod.POST,
      headers,
      body,
      timeoutMs: timeout,
      allowPrivateNetwork: true,
    })
  }

  /**
   * List available models from an OpenAI-compatible API.
   */
  async listModels(config: Record<string, unknown>): Promise<string[]> {
    const baseUrl = config.baseUrl as string
    const apiKey = config.apiKey as string
    const timeout = normalizeTimeoutMs((config.timeout as number | undefined) ?? 15_000)

    const headers = buildLlmApiHeaders({
      apiKey,
      organizationId: config.organizationId as string | undefined,
    })

    const res = await this.httpClient.fetch(`${baseUrl}/models`, {
      headers,
      timeoutMs: timeout,
      allowPrivateNetwork: true,
    })

    if (res.status !== 200) {
      throw new Error(formatRemoteError('LLM API', res.status, res.data))
    }

    const parsed = res.data as ModelsListResponse
    const models = Array.isArray(parsed.data) ? parsed.data.map(m => m.id) : []
    this.logActionSuccess('listModels', { modelCount: models.length })
    return models
  }

  /**
   * Generate an embedding vector for the given text.
   * Supports both OpenAI-compatible (/embeddings) and Gemini (:embedContent) endpoints.
   */
  async generateEmbedding(config: Record<string, unknown>, text: string): Promise<number[]> {
    const baseUrl = config.baseUrl as string
    const apiKey = config.apiKey as string
    const timeout = normalizeTimeoutMs((config.timeout as number | undefined) ?? 30_000)
    const isGemini =
      baseUrl.includes('generativelanguage.googleapis.com') || baseUrl.includes('gemini')

    const headers = buildLlmApiHeaders({
      apiKey,
      organizationId: config.organizationId as string | undefined,
    })

    if (isGemini) {
      return this.generateGeminiEmbedding(baseUrl, apiKey, text, timeout, config)
    }

    return this.generateOpenAiEmbedding(baseUrl, headers, text, timeout, config)
  }

  private async generateGeminiEmbedding(
    baseUrl: string,
    apiKey: string,
    text: string,
    timeout: number,
    config: Record<string, unknown>
  ): Promise<number[]> {
    const embeddingModel = (config.embeddingModel as string | undefined) ?? 'text-embedding-004'

    // Gemini uses: POST /models/{model}:embedContent?key={apiKey}
    // Strip trailing path segments like /v1beta, /v1main, /v1beta/openai, etc.
    const versionIndex = baseUrl.indexOf('/v1')
    const geminiBase = versionIndex > 0 ? baseUrl.substring(0, versionIndex) : baseUrl
    const url = `${geminiBase}/v1beta/models/${embeddingModel}:embedContent?key=${apiKey}`

    const requestBody = JSON.stringify({
      model: `models/${embeddingModel}`,
      content: { parts: [{ text }] },
    })

    const res = await this.httpClient.fetch(url, {
      method: HttpMethod.POST,
      headers: { 'Content-Type': 'application/json' },
      body: requestBody,
      timeoutMs: timeout,
    })

    if (res.status !== 200) {
      throw new Error(formatRemoteError('Gemini Embedding', res.status, res.data))
    }

    const parsed = res.data as { embedding?: { values?: number[] } }
    const embedding = parsed.embedding?.values
    if (!embedding) {
      throw new Error('Gemini embedding response missing embedding.values')
    }

    this.logActionSuccess('embedding', {
      model: embeddingModel,
      provider: 'gemini',
      inputLength: text.length,
      dimensions: embedding.length,
    })

    return embedding
  }

  private async generateOpenAiEmbedding(
    baseUrl: string,
    headers: Record<string, string>,
    text: string,
    timeout: number,
    config: Record<string, unknown>
  ): Promise<number[]> {
    const embeddingModel = (config.embeddingModel as string | undefined) ?? 'text-embedding-ada-002'

    const requestBody = JSON.stringify({
      model: embeddingModel,
      input: text,
    })

    const res = await this.httpClient.fetch(`${baseUrl}/embeddings`, {
      method: HttpMethod.POST,
      headers,
      body: requestBody,
      timeoutMs: timeout,
    })

    if (res.status !== 200) {
      throw new Error(formatRemoteError('LLM API Embedding', res.status, res.data))
    }

    const parsed = res.data as { data?: Array<{ embedding?: number[] }> }
    const embedding = parsed.data?.at(0)?.embedding
    if (!embedding) {
      throw new Error('Embedding response missing data[0].embedding')
    }

    this.logActionSuccess('embedding', {
      model: embeddingModel,
      provider: 'openai-compatible',
      inputLength: text.length,
      dimensions: embedding.length,
    })

    return embedding
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Test Helpers                                             */
  /* ---------------------------------------------------------------- */

  private async executeTestCompletion(
    config: Record<string, unknown>,
    baseUrl: string,
    apiKey: string
  ): Promise<TestResult> {
    const defaultModel = (config.defaultModel ?? 'gpt-4') as string
    const res = await this.sendTestRequest(config, baseUrl, apiKey, defaultModel)

    if (res.status !== 200) {
      this.logRemoteFailure('testConnection', res.status, res.data)
      return { ok: false, details: formatRemoteError('LLM API', res.status, res.data) }
    }

    return this.buildTestSuccessResult(res.data, baseUrl, defaultModel)
  }

  private async sendTestRequest(
    config: Record<string, unknown>,
    baseUrl: string,
    apiKey: string,
    model: string
  ): Promise<AxiosResponseData> {
    const maxTokensParameter = this.resolveMaxTokensParameter(config)
    const timeout = normalizeTimeoutMs((config.timeout as number | undefined) ?? 30_000)
    const headers = buildLlmApiHeaders({
      apiKey,
      organizationId: config.organizationId as string | undefined,
    })
    const body = JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Hi' }],
      [maxTokensParameter]: 5,
    })

    return this.httpClient.fetch(`${baseUrl}/chat/completions`, {
      method: HttpMethod.POST,
      headers,
      body,
      timeoutMs: timeout,
      allowPrivateNetwork: true,
    })
  }

  private buildTestSuccessResult(data: unknown, baseUrl: string, model: string): TestResult {
    const parsed = data as ChatCompletionResponse
    const hasChoices = Array.isArray(parsed.choices) && parsed.choices.length > 0
    this.logActionSuccess('testConnection', { model })

    return {
      ok: true,
      details: `LLM API reachable at ${baseUrl}. Model: ${model}. ${hasChoices ? 'Response received.' : 'No choices returned.'}`,
    }
  }

  private handleTestError(error: unknown): TestResult {
    const message = error instanceof Error ? error.message : 'Connection failed'
    this.logger.warn(`LLM APIs connection test failed: ${message}`)

    this.appLogger.error('LLM APIs connection test failed', {
      feature: AppLogFeature.CONNECTORS,
      action: 'testConnection',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'LlmApisService',
      functionName: 'testConnection',
      metadata: { connectorType: ConnectorType.LLM_APIS, error: message },
      stackTrace: error instanceof Error ? error.stack : undefined,
    })

    return { ok: false, details: message }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Response Parsing                                         */
  /* ---------------------------------------------------------------- */

  private parseInvokeResponse(
    data: unknown,
    resolvedModel: string,
    maxTokens: number
  ): { text: string; inputTokens: number; outputTokens: number } {
    const parsed = data as ChatCompletionResponse
    const firstChoice = parsed.choices.at(0)
    const text = extractChatCompletionText(firstChoice?.message?.content)
    const inputTokens = parsed.usage?.prompt_tokens ?? 0
    const outputTokens = parsed.usage?.completion_tokens ?? 0

    this.logActionSuccess('invoke', {
      model: resolvedModel,
      maxTokens,
      inputTokens,
      outputTokens,
    })

    return { text, inputTokens, outputTokens }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Helpers                                                  */
  /* ---------------------------------------------------------------- */

  private resolveMaxTokensParameter(config: Record<string, unknown>): string {
    return (config.maxTokensParameter as string | undefined) ?? LlmMaxTokensParameter.MAX_TOKENS
  }

  private logActionSuccess(action: string, metadata: Record<string, unknown>): void {
    this.appLogger.info(`LLM API ${action} succeeded`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'LlmApisService',
      functionName: action,
      metadata: { connectorType: ConnectorType.LLM_APIS, ...metadata },
    })
  }

  private logRemoteFailure(action: string, status: number, data: unknown): void {
    this.appLogger.warn(`LLM API ${action} returned non-success`, {
      feature: AppLogFeature.CONNECTORS,
      action,
      className: 'LlmApisService',
      sourceType: AppLogSourceType.SERVICE,
      outcome: AppLogOutcome.FAILURE,
      metadata: {
        connectorType: ConnectorType.LLM_APIS,
        status,
        remoteError: extractRemoteErrorMessage(data),
      },
    })
  }
}
