import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  BASE_BACKOFF_MS,
  DEFAULT_RATE_LIMIT_PER_MINUTE,
  MAX_RETRIES,
  OSINT_CONCURRENCY_LIMIT,
  OSINT_TEST_IOC_VALUES,
  RATE_LIMIT_WINDOW_MS,
} from './osint-executor.constants'
import {
  appendQueryParameters,
  attachVtAnalysisUrl,
  buildExecutionConfig,
  buildErrorQueryResult,
  buildFailedQueryResult,
  buildOsintRequest,
  buildSuccessQueryResult,
  extractResponseData,
  extractSourceErrorDetail,
  extractVtAnalysisUrl,
  extractVtPollStatus,
  redactSensitiveHeaders,
  resolveHttpErrorMessageKey,
  resolveTestIocType,
} from './osint-executor.utilities'
import { AppLogFeature, AppLogOutcome, AppLogSourceType, HttpMethod } from '../../common/enums'
import { BusinessException } from '../../common/exceptions/business.exception'
import { AxiosService } from '../../common/modules/axios/axios.service'
import { AppLoggerService } from '../../common/services/app-logger.service'
import { nowMs, elapsedMs, toIso } from '../../common/utils/date-time.utility'
import { decrypt } from '../../common/utils/encryption.utility'
import { AgentConfigRepository } from '../agent-config/agent-config.repository'
import type {
  OsintEnrichmentResult,
  OsintQueryResult,
  OsintRequestConfig,
  OsintSourceExecutionConfig,
} from './osint-executor.types'
import type { OsintTestResult } from '../agent-config/agent-config.types'

@Injectable()
export class OsintExecutorService {
  private readonly logger = new Logger(OsintExecutorService.name)
  private readonly rateLimitMap = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private readonly axiosService: AxiosService,
    private readonly agentConfigRepository: AgentConfigRepository,
    private readonly configService: ConfigService,
    private readonly appLogger: AppLoggerService
  ) {}

  /**
   * Query a single OSINT source with an IoC value.
   */
  async querySource(
    tenantId: string,
    sourceId: string,
    iocType: string,
    iocValue: string
  ): Promise<OsintQueryResult> {
    const startTime = nowMs()

    const sourceOrFailure = await this.resolveAndValidateSource(sourceId, tenantId, startTime)
    if ('success' in sourceOrFailure) return sourceOrFailure

    const source = sourceOrFailure
    const decryptedApiKey = this.decryptSourceApiKey(source.encryptedApiKey)
    const executionConfig = buildExecutionConfig(source, decryptedApiKey)
    const requestConfig = buildOsintRequest(executionConfig, iocType, iocValue)
    const finalUrl = appendQueryParameters(requestConfig.url, requestConfig.queryParameters)

    this.logOsintRequest(requestConfig, finalUrl, source, iocType, iocValue, executionConfig)

    return this.executeQueryWithErrorHandling(
      finalUrl,
      requestConfig,
      executionConfig,
      source,
      sourceId,
      tenantId,
      iocType,
      startTime
    )
  }

  private async resolveAndValidateSource(
    sourceId: string,
    tenantId: string,
    startTime: number
  ): Promise<
    | OsintQueryResult
    | NonNullable<Awaited<ReturnType<typeof this.agentConfigRepository.findOsintSource>>>
  > {
    const source = await this.agentConfigRepository.findOsintSource(sourceId, tenantId)

    if (!source?.isEnabled) {
      return buildFailedQueryResult(
        sourceId,
        source?.name ?? 'Unknown',
        source?.sourceType ?? 'unknown',
        'Source not found or disabled',
        elapsedMs(startTime)
      )
    }

    if (!this.checkRateLimit(sourceId)) {
      return buildFailedQueryResult(
        sourceId,
        source.name,
        source.sourceType,
        'Rate limit exceeded',
        elapsedMs(startTime)
      )
    }

    return source
  }

  private async executeQueryWithErrorHandling(
    finalUrl: string,
    requestConfig: OsintRequestConfig,
    executionConfig: OsintSourceExecutionConfig,
    source: { name: string; sourceType: string },
    sourceId: string,
    tenantId: string,
    iocType: string,
    startTime: number
  ): Promise<OsintQueryResult> {
    try {
      return await this.executeQueryAndBuildResult(
        finalUrl,
        requestConfig,
        executionConfig,
        source,
        sourceId,
        tenantId,
        iocType,
        startTime
      )
    } catch (error: unknown) {
      return this.handleQueryError(error, source, sourceId, tenantId, iocType, finalUrl, startTime)
    }
  }

  /**
   * Enrich an IoC by querying multiple OSINT sources in parallel.
   */
  async enrichIoc(
    tenantId: string,
    iocType: string,
    iocValue: string,
    sourceIds: string[]
  ): Promise<OsintEnrichmentResult> {
    const results = await this.executeBatchedQueries(tenantId, iocType, iocValue, sourceIds)
    const successCount = results.filter(r => r.success).length

    this.logEnrichmentComplete(tenantId, iocType, iocValue, sourceIds.length, successCount)

    return {
      iocType,
      iocValue,
      results,
      totalSources: sourceIds.length,
      successCount,
      failureCount: results.length - successCount,
      enrichedAt: toIso(),
    }
  }

  /**
   * Test an OSINT source by executing a real query with a safe test IoC.
   */
  async testSource(sourceId: string, tenantId: string, actor: string): Promise<OsintTestResult> {
    const source = await this.agentConfigRepository.findOsintSource(sourceId, tenantId)
    if (!source) {
      throw new BusinessException(
        404,
        'OSINT source not found',
        'errors.agentConfig.osintSourceNotFound'
      )
    }

    const testIocType = resolveTestIocType(source.sourceType)
    const testIocValue = Reflect.get(OSINT_TEST_IOC_VALUES, testIocType) as string

    const startTime = nowMs()
    const queryResult = await this.querySource(tenantId, sourceId, testIocType, testIocValue)
    const responseTime = elapsedMs(startTime)

    this.logTestResult(source.name, queryResult.success, tenantId, actor, sourceId)

    return {
      success: queryResult.success,
      statusCode: queryResult.statusCode ?? null,
      responseTime,
      error: queryResult.error,
      messageKey: queryResult.messageKey ?? null,
    }
  }

  /**
   * Fetch VT analysis results from a given analysis URL.
   */
  async fetchAnalysisResults(tenantId: string, analysisUrl: string): Promise<unknown> {
    this.validateAnalysisUrl(analysisUrl)

    const vtSource = await this.findEnabledVtSource(tenantId)
    const apiKey = this.decryptSourceApiKey(vtSource.encryptedApiKey)
    if (!apiKey) {
      throw new BusinessException(500, 'Failed to decrypt API key', 'errors.osint.authFailed')
    }

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (vtSource.headerName) {
      headers[vtSource.headerName] = apiKey
    }

    const response = await this.axiosService.fetch(analysisUrl, {
      method: HttpMethod.GET,
      headers,
      timeoutMs: vtSource.timeout,
    })

    if (response.status >= 400) {
      throw new BusinessException(
        response.status,
        `VT analysis fetch failed: ${String(response.status)}`,
        resolveHttpErrorMessageKey(response.status)
      )
    }

    return response.data
  }

  /**
   * Upload a file to a VirusTotal-compatible OSINT source for scanning.
   */
  async uploadFileForScan(
    tenantId: string,
    sourceId: string,
    file: Express.Multer.File
  ): Promise<OsintQueryResult> {
    this.validateFileUploadInput(file, sourceId)

    const startTime = nowMs()
    const source = await this.findEnabledOsintSource(sourceId, tenantId)
    const apiKey = this.decryptSourceApiKey(source.encryptedApiKey)
    const baseUrl = (source.baseUrl ?? '').replace(/\/+$/, '')

    const { form, headers } = await this.buildFileUploadRequest(file, source, apiKey)

    try {
      return await this.executeFileUpload(
        baseUrl,
        headers,
        form,
        source,
        sourceId,
        tenantId,
        file.originalname,
        startTime
      )
    } catch (error: unknown) {
      return this.handleFileUploadError(
        error,
        source,
        sourceId,
        tenantId,
        file.originalname,
        startTime
      )
    }
  }

  /**
   * Polls the VT analysis endpoint until the analysis is complete or timeout.
   * Uses recursion instead of a loop to avoid await-in-loop lint warning.
   */
  private async pollVtAnalysis(
    analysisUrl: string,
    headers: Record<string, string>,
    timeoutMs: number,
    attempt = 0
  ): Promise<unknown> {
    const maxPolls = 5
    const pollDelayMs = 3_000

    if (attempt >= maxPolls) {
      this.logger.warn('VT analysis polling timed out — returning last known state')
      return {
        status: 'queued',
        message: 'Analysis still in progress. Check VT dashboard for results.',
      }
    }

    const getHeaders = { ...headers }
    delete getHeaders['Content-Type']

    await new Promise<void>(resolve => {
      setTimeout(resolve, pollDelayMs)
    })

    try {
      return await this.executePollAttempt(analysisUrl, getHeaders, headers, timeoutMs, attempt)
    } catch (error: unknown) {
      this.logger.warn(
        `VT analysis poll error: ${error instanceof Error ? error.message : 'unknown'}`
      )
      return this.pollVtAnalysis(analysisUrl, headers, timeoutMs, attempt + 1)
    }
  }

  // ─── Private: Query Execution Pipeline ─────────────────────────

  private async executeQueryAndBuildResult(
    finalUrl: string,
    requestConfig: OsintRequestConfig,
    executionConfig: OsintSourceExecutionConfig,
    source: { name: string; sourceType: string },
    sourceId: string,
    tenantId: string,
    iocType: string,
    startTime: number
  ): Promise<OsintQueryResult> {
    const response = await this.executeWithRetry(() =>
      this.executeSourceRequest(
        finalUrl,
        requestConfig.method,
        requestConfig.headers,
        requestConfig.body,
        executionConfig.timeout
      )
    )

    const finalData = response.data
    const vtAnalysisUrl = extractVtAnalysisUrl(response.data)
    attachVtAnalysisUrl(finalData, source.sourceType, vtAnalysisUrl)

    const data = extractResponseData(finalData, executionConfig.responsePath)
    const responseTimeMs = elapsedMs(startTime)

    this.logger.log(
      `OSINT response: ${String(response.status)} | source=${source.name} | ${String(responseTimeMs)}ms | dataExtracted=${String(data !== null && data !== undefined)}`
    )

    await this.agentConfigRepository.updateOsintSourceHealth(sourceId, tenantId, true, null)
    this.logQuerySuccess(tenantId, sourceId, source.name, iocType, responseTimeMs)

    return buildSuccessQueryResult(
      sourceId,
      source.name,
      source.sourceType,
      data,
      finalData,
      response.status,
      responseTimeMs
    )
  }

  private async handleQueryError(
    error: unknown,
    source: { name: string; sourceType: string },
    sourceId: string,
    tenantId: string,
    iocType: string,
    finalUrl: string,
    startTime: number
  ): Promise<OsintQueryResult> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const statusCode = (error as { statusCode?: number }).statusCode ?? null
    const responseTimeMs = elapsedMs(startTime)

    this.logger.warn(
      `OSINT error: source=${source.name} (${source.sourceType}) | url=${finalUrl} | status=${String(statusCode)} | ${String(responseTimeMs)}ms | error=${errorMessage}`
    )

    await this.agentConfigRepository.updateOsintSourceHealth(
      sourceId,
      tenantId,
      false,
      errorMessage
    )
    this.logQueryFailure(tenantId, sourceId, source.name, iocType, errorMessage)

    return buildErrorQueryResult(sourceId, source.name, source.sourceType, error, responseTimeMs)
  }

  // ─── Private: File Upload Pipeline ─────────────────────────────

  private async executeFileUpload(
    baseUrl: string,
    headers: Record<string, string>,
    form: unknown,
    source: { name: string; sourceType: string; responsePath: string | null; timeout: number },
    sourceId: string,
    tenantId: string,
    fileName: string,
    startTime: number
  ): Promise<OsintQueryResult> {
    const response = await this.axiosService.fetch(`${baseUrl}/files`, {
      method: HttpMethod.POST,
      headers,
      body: form,
      timeoutMs: source.timeout,
    })
    const responseTimeMs = elapsedMs(startTime)

    if (response.status >= 400) {
      return buildFailedQueryResult(
        sourceId,
        source.name,
        source.sourceType,
        `HTTP ${String(response.status)} from file upload`,
        responseTimeMs
      )
    }

    return this.buildFileUploadSuccess(
      response.data,
      source,
      sourceId,
      tenantId,
      fileName,
      responseTimeMs,
      response.status
    )
  }

  private buildFileUploadSuccess(
    rawData: unknown,
    source: { name: string; sourceType: string; responsePath: string | null },
    sourceId: string,
    tenantId: string,
    fileName: string,
    responseTimeMs: number,
    status: number
  ): OsintQueryResult {
    const finalData = rawData
    attachVtAnalysisUrl(finalData, source.sourceType, extractVtAnalysisUrl(rawData))
    const data = extractResponseData(finalData, source.responsePath)
    this.logFileUpload(true, source.name, tenantId, sourceId, fileName, responseTimeMs)

    return buildSuccessQueryResult(
      sourceId,
      source.name,
      source.sourceType,
      data,
      finalData,
      status,
      responseTimeMs
    )
  }

  private handleFileUploadError(
    error: unknown,
    source: { name: string; sourceType: string },
    sourceId: string,
    tenantId: string,
    fileName: string,
    startTime: number
  ): OsintQueryResult {
    const responseTimeMs = elapsedMs(startTime)
    const errorMessage = error instanceof Error ? error.message : 'File upload failed'

    this.logFileUpload(
      false,
      source.name,
      tenantId,
      sourceId,
      fileName,
      responseTimeMs,
      errorMessage
    )

    return buildFailedQueryResult(
      sourceId,
      source.name,
      source.sourceType,
      errorMessage,
      responseTimeMs
    )
  }

  // ─── Private: Batch Execution ──────────────────────────────────

  private async executeBatchedQueries(
    tenantId: string,
    iocType: string,
    iocValue: string,
    sourceIds: string[]
  ): Promise<OsintQueryResult[]> {
    if (sourceIds.length === 0) return []

    const batch = sourceIds.slice(0, OSINT_CONCURRENCY_LIMIT)
    const remaining = sourceIds.slice(OSINT_CONCURRENCY_LIMIT)

    const batchResults = await Promise.allSettled(
      batch.map(id => this.querySource(tenantId, id, iocType, iocValue))
    )

    const results: OsintQueryResult[] = []
    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        results.push(
          buildFailedQueryResult('unknown', 'Unknown', 'unknown', 'Query promise rejected', 0)
        )
      }
    }

    if (remaining.length === 0) return results

    const remainingResults = await this.executeBatchedQueries(
      tenantId,
      iocType,
      iocValue,
      remaining
    )
    return [...results, ...remainingResults]
  }

  // ─── Private: Request Execution ────────────────────────────────

  private async executeWithRetry(
    requestFunction: () => Promise<{ status: number; data: unknown }>,
    attempt = 0
  ): Promise<{ status: number; data: unknown }> {
    try {
      return await requestFunction()
    } catch (error: unknown) {
      const statusMatch = error instanceof Error ? error.message.match(/HTTP (\d+)/) : null
      const status = statusMatch ? Number.parseInt(statusMatch.at(1) ?? '0', 10) : 0
      if (attempt < MAX_RETRIES && (status === 429 || status >= 500)) {
        const delay = BASE_BACKOFF_MS * Math.pow(2, attempt)
        await new Promise<void>(resolve => {
          setTimeout(resolve, delay)
        })
        return this.executeWithRetry(requestFunction, attempt + 1)
      }
      throw error
    }
  }

  private async executeSourceRequest(
    url: string,
    method: string,
    headers: Record<string, string>,
    body: Record<string, unknown> | string | null,
    timeoutMs: number
  ): Promise<{ status: number; data: unknown }> {
    const response = await this.axiosService.fetch(url, {
      method: method === HttpMethod.POST ? HttpMethod.POST : HttpMethod.GET,
      headers,
      body: body ?? undefined,
      timeoutMs,
    })

    if (response.status >= 400) {
      this.logHttpError(method, url, response)
      const sourceError = extractSourceErrorDetail(response.data)
      const messageKey = sourceError.messageKey ?? resolveHttpErrorMessageKey(response.status)
      const errorText = sourceError.detail
        ? `${sourceError.detail} (HTTP ${String(response.status)})`
        : `HTTP ${String(response.status)} response from OSINT source`
      const error = new Error(errorText)
      Object.assign(error, { statusCode: response.status, messageKey })
      throw error
    }

    return { status: response.status, data: response.data }
  }

  private async executePollAttempt(
    analysisUrl: string,
    getHeaders: Record<string, string>,
    originalHeaders: Record<string, string>,
    timeoutMs: number,
    attempt: number
  ): Promise<unknown> {
    const maxPolls = 5
    const response = await this.axiosService.fetch(analysisUrl, {
      method: HttpMethod.GET,
      headers: getHeaders,
      timeoutMs,
    })

    if (response.status >= 400) {
      this.logger.warn(`VT analysis poll failed: ${String(response.status)}`)
      return this.pollVtAnalysis(analysisUrl, originalHeaders, timeoutMs, attempt + 1)
    }

    const status = extractVtPollStatus(response.data)

    if (status === 'completed') {
      return response.data
    }

    this.logger.log(
      `VT analysis poll ${String(attempt + 1)}/${String(maxPolls)}: status=${status ?? 'unknown'}`
    )
    return this.pollVtAnalysis(analysisUrl, originalHeaders, timeoutMs, attempt + 1)
  }

  // ─── Private: Validation ───────────────────────────────────────

  private validateAnalysisUrl(analysisUrl: string): void {
    if (!analysisUrl || typeof analysisUrl !== 'string') {
      throw new BusinessException(
        400,
        'analysisUrl is required',
        'errors.osint.analysisUrlRequired'
      )
    }
    if (!analysisUrl.startsWith('https://www.virustotal.com/api/v3/analyses/')) {
      throw new BusinessException(400, 'Invalid analysis URL', 'errors.osint.badRequest')
    }
  }

  private validateFileUploadInput(file: Express.Multer.File, sourceId: string): void {
    if (!file) {
      throw new BusinessException(400, 'File is required', 'errors.osint.fileRequired')
    }
    if (!sourceId) {
      throw new BusinessException(400, 'sourceId is required', 'errors.osint.sourceIdRequired')
    }
  }

  private async findEnabledVtSource(
    tenantId: string
  ): Promise<{ encryptedApiKey: string | null; headerName: string | null; timeout: number }> {
    const sources = await this.agentConfigRepository.findAllOsintSources(tenantId)
    const vtSource = sources.find(s => s.sourceType === 'virustotal' && s.isEnabled)

    if (!vtSource) {
      throw new BusinessException(
        404,
        'No enabled VirusTotal source',
        'errors.osint.sourceNotFound'
      )
    }

    return vtSource
  }

  private async findEnabledOsintSource(
    sourceId: string,
    tenantId: string
  ): Promise<{
    name: string
    sourceType: string
    baseUrl: string | null
    encryptedApiKey: string | null
    headerName: string | null
    responsePath: string | null
    timeout: number
  }> {
    const source = await this.agentConfigRepository.findOsintSource(sourceId, tenantId)

    if (!source) {
      throw new BusinessException(404, 'OSINT source not found', 'errors.osint.sourceNotFound')
    }
    if (!source.isEnabled) {
      throw new BusinessException(403, 'OSINT source is disabled', 'errors.osint.sourceDisabled')
    }

    return source
  }

  // ─── Private: Helpers ──────────────────────────────────────────

  private decryptSourceApiKey(encryptedApiKey: string | null): string | null {
    if (!encryptedApiKey) {
      return null
    }

    const encryptionKey = this.configService.get<string>('CONFIG_ENCRYPTION_KEY')
    if (!encryptionKey) {
      this.logger.warn('CONFIG_ENCRYPTION_KEY not configured, cannot decrypt OSINT API key')
      return null
    }

    try {
      return decrypt(encryptedApiKey, encryptionKey)
    } catch (error: unknown) {
      this.logger.warn(
        `Failed to decrypt API key: ${error instanceof Error ? error.message : 'unknown error'}`
      )
      return null
    }
  }

  private checkRateLimit(sourceId: string): boolean {
    const now = nowMs()
    const entry = this.rateLimitMap.get(sourceId)
    if (!entry || now > entry.resetAt) {
      this.rateLimitMap.set(sourceId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
      return true
    }
    if (entry.count >= DEFAULT_RATE_LIMIT_PER_MINUTE) {
      return false
    }
    entry.count++
    return true
  }

  private async buildFileUploadRequest(
    file: Express.Multer.File,
    source: { headerName: string | null },
    apiKey: string | null
  ): Promise<{ form: unknown; headers: Record<string, string> }> {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('file', file.buffer, { filename: file.originalname, contentType: file.mimetype })

    const headers: Record<string, string> = { ...form.getHeaders() }
    if (source.headerName && apiKey) {
      headers[source.headerName] = apiKey
    }

    return { form, headers }
  }

  // ─── Private: Logging ──────────────────────────────────────────

  private logOsintRequest(
    requestConfig: OsintRequestConfig,
    finalUrl: string,
    source: { name: string; sourceType: string; authType: string },
    iocType: string,
    iocValue: string,
    executionConfig: OsintSourceExecutionConfig
  ): void {
    const safeHeaders = redactSensitiveHeaders(requestConfig.headers)
    this.logger.log(
      `OSINT request: ${requestConfig.method} ${finalUrl} | source=${source.name} (${source.sourceType}) | ioc=${iocType}:${iocValue} | authType=${source.authType} | headers=${JSON.stringify(safeHeaders)} | hasBody=${String(requestConfig.body !== null)} | timeout=${String(executionConfig.timeout)}ms`
    )
  }

  private logHttpError(
    method: string,
    url: string,
    response: { status: number; data: unknown }
  ): void {
    const responseBody =
      typeof response.data === 'string'
        ? response.data.slice(0, 500)
        : JSON.stringify(response.data).slice(0, 500)
    this.logger.warn(
      `OSINT HTTP error: ${method} ${url} → ${String(response.status)} | body=${responseBody}`
    )
  }

  private logQuerySuccess(
    tenantId: string,
    sourceId: string,
    sourceName: string,
    iocType: string,
    responseTimeMs: number
  ): void {
    this.appLogger.info(`OSINT query succeeded: ${sourceName}`, {
      feature: AppLogFeature.AI_CONFIG,
      action: 'osintQuery',
      outcome: AppLogOutcome.SUCCESS,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'OsintExecutorService',
      functionName: 'querySource',
      metadata: { sourceId, sourceName, iocType, responseTimeMs },
    })
  }

  private logQueryFailure(
    tenantId: string,
    sourceId: string,
    sourceName: string,
    iocType: string,
    errorMessage: string
  ): void {
    this.appLogger.info(`OSINT query failed: ${sourceName}`, {
      feature: AppLogFeature.AI_CONFIG,
      action: 'osintQuery',
      outcome: AppLogOutcome.FAILURE,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'OsintExecutorService',
      functionName: 'querySource',
      metadata: { sourceId, sourceName, iocType, error: errorMessage },
    })
  }

  private logEnrichmentComplete(
    tenantId: string,
    iocType: string,
    iocValue: string,
    totalSources: number,
    successCount: number
  ): void {
    this.appLogger.info(
      `OSINT enrichment complete: ${String(successCount)}/${String(totalSources)} sources`,
      {
        feature: AppLogFeature.AI_CONFIG,
        action: 'osintEnrich',
        outcome: AppLogOutcome.SUCCESS,
        tenantId,
        sourceType: AppLogSourceType.SERVICE,
        className: 'OsintExecutorService',
        functionName: 'enrichIoc',
        metadata: { iocType, iocValue, totalSources, successCount },
      }
    )
  }

  private logTestResult(
    sourceName: string,
    success: boolean,
    tenantId: string,
    actor: string,
    sourceId: string
  ): void {
    this.appLogger.info(`OSINT source tested: ${sourceName}`, {
      feature: AppLogFeature.AI_CONFIG,
      action: 'testOsintSource',
      outcome: success ? AppLogOutcome.SUCCESS : AppLogOutcome.FAILURE,
      tenantId,
      actorEmail: actor,
      sourceType: AppLogSourceType.SERVICE,
      className: 'OsintExecutorService',
      functionName: 'testSource',
      metadata: { sourceId, sourceName, success },
    })
  }

  private logFileUpload(
    success: boolean,
    sourceName: string,
    tenantId: string,
    sourceId: string,
    fileName: string,
    responseTimeMs: number,
    errorMessage?: string
  ): void {
    this.appLogger.info(`OSINT file upload ${success ? 'succeeded' : 'failed'}: ${sourceName}`, {
      feature: AppLogFeature.AI_CONFIG,
      action: 'osintFileUpload',
      outcome: success ? AppLogOutcome.SUCCESS : AppLogOutcome.FAILURE,
      tenantId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'OsintExecutorService',
      functionName: 'uploadFileForScan',
      metadata: {
        sourceId,
        sourceName,
        fileName,
        responseTimeMs,
        ...(errorMessage ? { error: errorMessage } : {}),
      },
    })
  }
}
