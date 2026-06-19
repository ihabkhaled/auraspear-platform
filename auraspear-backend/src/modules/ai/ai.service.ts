import { randomUUID } from 'node:crypto'
import { Injectable, Logger } from '@nestjs/common'
import {
  agentDisabledKey,
  agentDisplayName,
  agentQuotaExceededKey,
  agentUnreachableKey,
} from './ai-error.utilities'
import {
  AI_BEDROCK_MAX_TOKENS,
  AI_CONNECTOR_PRIORITY,
  AI_COST_PER_1K_INPUT_TOKENS,
  AI_COST_PER_1K_OUTPUT_TOKENS,
  AI_DEFAULT_MODEL,
  AI_LLM_APIS_MAX_TOKENS,
  AI_OPENCLAW_MAX_TOKENS,
} from './ai.constants'
import { AiRepository } from './ai.repository'
import {
  buildHuntPrompt,
  buildInvestigationPrompt,
  buildBedrockHuntResponse,
  buildBedrockInvestigateResponse,
  buildAgentTaskPrompt,
  buildBedrockAgentTaskResponse,
  buildFallbackAgentTaskResponse,
  buildBedrockExplainResponse,
  buildLlmApisHuntResponse,
  buildLlmApisInvestigateResponse,
  buildLlmApisAgentTaskResponse,
  buildLlmApisExplainResponse,
  buildOpenClawHuntResponse,
  buildOpenClawInvestigateResponse,
  buildOpenClawAgentTaskResponse,
  buildOpenClawExplainResponse,
  checkAgentQuota,
  filterConnectorsBySelection,
  buildFallbackGenericResponse,
  buildFeatureAwareResponse,
  assembleFinalPrompt,
  resolveSelectedConnector,
} from './ai.utilities'
import {
  AiAgentId,
  AiAuditAction,
  AiAuditStatus,
  AiFeatureKey,
  AppLogFeature,
  AppLogOutcome,
  AppLogSourceType,
  ConnectorType,
} from '../../common/enums'
import { AppLoggerService } from '../../common/services/app-logger.service'
import {
  AI_DEFAULT_PROVIDER_KEY,
  FEATURE_TO_AGENT_MAP,
} from '../agent-config/agent-config.constants'
import { AgentConfigService } from '../agent-config/agent-config.service'
import { OsintExecutorService } from '../osint-executor/osint-executor.service'
import { AiHuntDto } from './dto/ai-hunt.dto'
import { AiInvestigateDto } from './dto/ai-investigate.dto'
import { FeatureCatalogService } from './feature-catalog/feature-catalog.service'
import { PromptRegistryService } from './prompt-registry/prompt-registry.service'
import { UsageBudgetService } from './usage-budget/usage-budget.service'
import { BusinessException } from '../../common/exceptions/business.exception'
import { daysAgo, elapsedMs, nowMs, toIso } from '../../common/utils/date-time.utility'
import { ConnectorsService } from '../connectors/connectors.service'
import { FIXED_AI_CONNECTORS } from '../connectors/llm-connectors/llm-connectors.constants'
import { LlmConnectorsService } from '../connectors/llm-connectors/llm-connectors.service'
import { BedrockService } from '../connectors/services/bedrock.service'
import { LlmApisService } from '../connectors/services/llm-apis.service'
import { OpenClawGatewayService } from '../connectors/services/openclaw-gateway.service'
import type {
  AgentTaskExecutionInput,
  AiAuditRecord,
  AiResponse,
  ExecuteAiTaskInput,
  ResolvedAiConnector,
} from './ai.types'
import type { JwtPayload } from '../../common/interfaces/authenticated-request.interface'
import type { AgentConfigWithDefaults } from '../agent-config/agent-config.types'
import type { Alert, Prisma } from '@prisma/client'

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name)

  constructor(
    private readonly aiRepository: AiRepository,
    private readonly appLogger: AppLoggerService,
    private readonly connectorsService: ConnectorsService,
    private readonly llmConnectorsService: LlmConnectorsService,
    private readonly bedrockService: BedrockService,
    private readonly llmApisService: LlmApisService,
    private readonly openClawGatewayService: OpenClawGatewayService,
    private readonly promptRegistryService: PromptRegistryService,
    private readonly featureCatalogService: FeatureCatalogService,
    private readonly usageBudgetService: UsageBudgetService,
    private readonly agentConfigService: AgentConfigService,
    private readonly osintExecutorService: OsintExecutorService
  ) {}

  /* ---------------------------------------------------------------- */
  /* Connector Label Resolution                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Resolves a connector key (UUID or fixed keyword) to a human-readable label.
   * Used to populate session provider/model fields in all states.
   */
  async resolveConnectorLabel(
    tenantId: string,
    connectorKey: string | undefined
  ): Promise<{ providerLabel: string; modelLabel: string }> {
    if (!connectorKey || connectorKey === 'default') {
      return { providerLabel: 'default', modelLabel: '' }
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      connectorKey
    )
    if (isUuid) {
      try {
        const config = await this.llmConnectorsService.getById(connectorKey, tenantId)
        return {
          providerLabel: config.name,
          modelLabel: config.defaultModel ?? '',
        }
      } catch {
        return { providerLabel: connectorKey, modelLabel: '' }
      }
    }

    const match = FIXED_AI_CONNECTORS.find(c => c.type === connectorKey)
    return {
      providerLabel: match?.label ?? connectorKey,
      modelLabel: '',
    }
  }

  /* ---------------------------------------------------------------- */
  /* AI-Assisted Threat Hunting                                        */
  /* ---------------------------------------------------------------- */

  async aiHunt(dto: AiHuntDto, user: JwtPayload): Promise<AiResponse> {
    this.logAction('aiHunt', user, 'AiHunt', undefined, { queryLength: dto.query.length })

    return this.executeAiTask({
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      featureKey: AiFeatureKey.HUNT_HYPOTHESIS,
      context: {
        query: dto.query,
        additionalContext: dto.context?.slice(0, 500) ?? '',
      },
    })
  }

  /* ---------------------------------------------------------------- */
  /* AI Investigation of Alert                                         */
  /* ---------------------------------------------------------------- */

  async aiInvestigate(dto: AiInvestigateDto, user: JwtPayload): Promise<AiResponse> {
    this.logAction('aiInvestigate', user, 'Alert', dto.alertId)

    const fullAlert = await this.loadAndValidateAlert(dto.alertId, user)
    const relatedAlerts = await this.loadRelatedAlerts(fullAlert, user.tenantId)

    const relatedSummary = relatedAlerts
      .slice(0, 10)
      .map(ra => `[${ra.severity}] ${ra.title} at ${toIso(ra.timestamp)}`)
      .join('\n')

    return this.executeAiTask({
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      featureKey: AiFeatureKey.ALERT_SUMMARIZE,
      context: {
        alertTitle: fullAlert.title ?? '',
        alertDescription: fullAlert.description ?? '',
        alertSeverity: fullAlert.severity,
        alertSource: fullAlert.source ?? '',
        alertRule: fullAlert.ruleName ?? '',
        alertTimestamp: fullAlert.timestamp ? toIso(fullAlert.timestamp) : '',
        alertRawData: JSON.stringify(fullAlert.rawEvent ?? {}).slice(0, 2000),
        sourceIp: fullAlert.sourceIp ?? '',
        destinationIp: fullAlert.destinationIp ?? '',
        agentName: fullAlert.agentName ?? '',
        mitreTactics: fullAlert.mitreTactics.join(', ') || 'None',
        mitreTechniques: fullAlert.mitreTechniques.join(', ') || 'None',
        relatedAlerts: relatedSummary || 'None found',
        relatedAlertCount: String(relatedAlerts.length),
      },
    })
  }

  /* ---------------------------------------------------------------- */
  /* Explainable AI Output                                             */
  /* ---------------------------------------------------------------- */

  async aiExplain(body: { prompt: string }, user: JwtPayload): Promise<AiResponse> {
    this.logAction('aiExplain', user, 'AiExplain', undefined, { promptLength: body.prompt.length })

    return this.executeAiTask({
      tenantId: user.tenantId,
      userId: user.sub,
      userEmail: user.email,
      featureKey: AiFeatureKey.AGENT_TASK,
      context: {
        prompt: body.prompt,
      },
      connector: undefined,
    })
  }

  async runAgentTask(input: AgentTaskExecutionInput): Promise<AiResponse> {
    await this.ensureAiEnabled(input.tenantId)

    const startTime = nowMs()
    const connectors = await this.resolveAgentTaskConnectors(input)

    const aiResponse = await this.tryConnectorsInOrder(connectors, c =>
      this.routeAgentTask(c, input)
    )

    this.throwIfConnectorRequestedButFailed(aiResponse, input)

    const response =
      aiResponse ??
      buildFallbackAgentTaskResponse({
        agentName: input.agentName,
        prompt: input.prompt,
        tools: input.tools,
      })

    const latencyMs = elapsedMs(startTime)
    await this.logAgentTaskAudit(input, response, latencyMs)

    return response
  }

  private async resolveAgentTaskConnectors(
    input: AgentTaskExecutionInput
  ): Promise<ResolvedAiConnector[]> {
    const allConnectors = await this.findAvailableAiConnectors(input.tenantId)
    const { connectors, connectorRequested } = filterConnectorsBySelection({
      connector: input.connector,
      connectors: allConnectors,
    })

    this.assertRequestedConnectorAvailable(connectorRequested, connectors.length, input.connector)
    this.logAgentTaskConnectors(connectors, input)

    return connectors
  }

  private assertRequestedConnectorAvailable(
    connectorRequested: boolean,
    availableCount: number,
    connectorName: string | undefined
  ): void {
    if (connectorRequested && availableCount === 0) {
      throw new BusinessException(
        400,
        `Requested AI connector "${connectorName}" is not configured or available`,
        'errors.ai.connectorNotAvailable'
      )
    }
  }

  private logAgentTaskConnectors(
    connectors: ResolvedAiConnector[],
    input: AgentTaskExecutionInput
  ): void {
    this.appLogger.info(
      `AI agent task: ${String(connectors.length)} connector(s) available to try`,
      {
        feature: AppLogFeature.AI_AGENTS,
        action: 'runAgentTask',
        sourceType: AppLogSourceType.SERVICE,
        className: 'AiService',
        functionName: 'runAgentTask',
        tenantId: input.tenantId,
        metadata: {
          connectors: connectors.map(c => c.type),
          agentName: input.agentName,
        },
      }
    )
  }

  private throwIfConnectorRequestedButFailed(
    aiResponse: AiResponse | undefined,
    input: AgentTaskExecutionInput
  ): void {
    if (!aiResponse && input.connector && input.connector !== 'default') {
      throw new BusinessException(
        502,
        `${agentDisplayName(input.agentId)} AI agent connector failed to process the request`,
        agentUnreachableKey(input.agentId)
      )
    }
  }

  private async logAgentTaskAudit(
    input: AgentTaskExecutionInput,
    response: AiResponse,
    latencyMs: number
  ): Promise<void> {
    await this.logAudit(this.buildAgentTaskAuditRecord(input, response, latencyMs))
    this.logAgentTaskSuccess(input, response, latencyMs)
  }

  private buildAgentTaskAuditRecord(
    input: AgentTaskExecutionInput,
    response: AiResponse,
    latencyMs: number
  ): AiAuditRecord {
    return {
      id: randomUUID(),
      tenantId: input.tenantId,
      userId: input.actorUserId,
      action: AiAuditAction.EXPLAIN,
      model: response.model,
      inputTokens: response.tokensUsed.input,
      outputTokens: response.tokensUsed.output,
      latencyMs,
      status: AiAuditStatus.SUCCESS,
      createdAt: toIso(),
      prompt: input.prompt,
      response: response.result,
    }
  }

  private logAgentTaskSuccess(
    input: AgentTaskExecutionInput,
    response: AiResponse,
    latencyMs: number
  ): void {
    this.appLogger.info('AI agent task executed', {
      feature: AppLogFeature.AI_AGENTS,
      action: 'runAgentTask',
      outcome: AppLogOutcome.SUCCESS,
      tenantId: input.tenantId,
      actorEmail: input.actorEmail,
      actorUserId: input.actorUserId,
      targetResource: 'AiAgent',
      targetResourceId: input.agentId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AiService',
      functionName: 'runAgentTask',
      metadata: {
        agentName: input.agentName,
        model: response.model,
        latencyMs,
      },
    })
  }

  /* ---------------------------------------------------------------- */
  /* Generic AI Task Execution (via Feature Catalog + Prompt Registry)  */
  /* ---------------------------------------------------------------- */

  /**
   * Generic AI task execution that checks the feature catalog, loads the prompt
   * template from the registry, resolves the responsible agent config, and
   * routes to the best available provider.
   * This is the entry point for all AI features across the platform.
   */
  async executeAiTask(params: ExecuteAiTaskInput): Promise<AiResponse> {
    const featureConfig = await this.featureCatalogService.getConfig(
      params.tenantId,
      params.featureKey
    )
    this.validateFeatureEnabled(featureConfig.enabled, params.featureKey)

    const agentId = FEATURE_TO_AGENT_MAP[params.featureKey] ?? AiAgentId.ORCHESTRATOR
    const agentConfig = await this.agentConfigService.getAgentConfig(params.tenantId, agentId)
    this.validateAgentEnabled(agentConfig, agentId, params.featureKey)
    this.validateAgentQuota(agentConfig, agentId)
    await this.validateGlobalBudget(params.tenantId, params.featureKey)

    const finalPrompt = await this.buildExecuteAiTaskPrompt(params, agentConfig)
    const connectors = await this.resolveExecuteAiTaskConnectors(
      params,
      agentConfig,
      agentId,
      featureConfig.preferredProvider
    )
    const maxTokens = agentConfig.maxTokensPerCall ?? featureConfig.maxTokens
    const temperature = agentConfig.temperature ?? 0.7
    const modelOverride = agentConfig.model ?? undefined

    const startTime = nowMs()
    const aiResponse = await this.tryConnectorsInOrder(connectors, c =>
      this.routeGenericTask(
        c,
        finalPrompt,
        maxTokens,
        params.featureKey,
        params.context,
        temperature,
        modelOverride
      )
    )
    const response = aiResponse ?? buildFallbackGenericResponse(params.featureKey, finalPrompt)
    const latencyMs = elapsedMs(startTime)

    await this.recordUsageAndAudit(params, agentId, agentConfig, response, latencyMs, finalPrompt)

    return response
  }

  private validateFeatureEnabled(enabled: boolean, featureKey: string): void {
    if (!enabled) {
      throw new BusinessException(
        403,
        `AI feature "${featureKey}" is disabled for this tenant. Enable it in AI Feature Catalog.`,
        'errors.ai.featureDisabled'
      )
    }
  }

  private validateAgentEnabled(
    agentConfig: AgentConfigWithDefaults,
    agentId: string,
    featureKey: string
  ): void {
    if (!agentConfig.isEnabled) {
      throw new BusinessException(
        403,
        `${agentDisplayName(agentId)} AI agent is disabled for feature "${featureKey}". Enable it in AI Configuration.`,
        agentDisabledKey(agentId)
      )
    }
  }

  private validateAgentQuota(agentConfig: AgentConfigWithDefaults, agentId: string): void {
    const quotaCheck = checkAgentQuota(agentConfig)
    if (!quotaCheck.allowed) {
      throw new BusinessException(
        429,
        `${agentDisplayName(agentId)} AI agent token quota exceeded (${quotaCheck.period ?? 'unknown'}). Used: ${String(quotaCheck.used ?? 0)}/${String(quotaCheck.limit ?? 0)}`,
        agentQuotaExceededKey(agentId)
      )
    }
  }

  private async validateGlobalBudget(tenantId: string, featureKey: AiFeatureKey): Promise<void> {
    const budgetCheck = await this.usageBudgetService.checkBudget(tenantId, featureKey)
    if (!budgetCheck.allowed) {
      throw new BusinessException(
        429,
        `Monthly AI usage budget exceeded for feature "${featureKey}". Used: ${String(budgetCheck.used)}/${String(budgetCheck.budget)} tokens.`,
        'errors.ai.budgetExceeded'
      )
    }
  }

  private async buildExecuteAiTaskPrompt(
    params: ExecuteAiTaskInput,
    agentConfig: AgentConfigWithDefaults
  ): Promise<string> {
    const promptContent = await this.promptRegistryService.getActivePrompt(
      params.tenantId,
      params.featureKey
    )
    await this.enrichContextWithOsint(params, agentConfig)
    this.enrichContextWithIndexPatterns(params, agentConfig)
    return assembleFinalPrompt(
      promptContent,
      params.context,
      agentConfig.systemPrompt,
      agentConfig.promptSuffix,
      agentConfig.outputFormat,
      agentConfig.presentationSkills
    )
  }

  private async resolveExecuteAiTaskConnectors(
    params: ExecuteAiTaskInput,
    agentConfig: AgentConfigWithDefaults,
    agentId: string,
    preferredProvider: string | null
  ): Promise<ResolvedAiConnector[]> {
    const allConnectors = await this.findAvailableAiConnectors(params.tenantId)
    const selectedConnector = resolveSelectedConnector(
      params.connector,
      agentConfig.providerMode,
      AI_DEFAULT_PROVIDER_KEY,
      preferredProvider
    )

    if (!selectedConnector || selectedConnector === AI_DEFAULT_PROVIDER_KEY) {
      return allConnectors
    }

    const { connectors } = filterConnectorsBySelection({
      connector: selectedConnector,
      connectors: allConnectors,
    })

    if (connectors.length === 0) {
      throw new BusinessException(
        400,
        `${agentDisplayName(agentId)} AI agent connector is not available or not configured`,
        agentUnreachableKey(agentId)
      )
    }

    return connectors
  }

  private async recordUsageAndAudit(
    params: ExecuteAiTaskInput,
    agentId: string,
    agentConfig: AgentConfigWithDefaults,
    response: AiResponse,
    latencyMs: number,
    finalPrompt: string
  ): Promise<void> {
    await this.recordTokenUsage(params, agentId, response)
    await this.logFeatureAudit(params, response, latencyMs, finalPrompt)
    this.logFeatureTaskSuccess(params, agentId, agentConfig, response, latencyMs)
  }

  private async recordTokenUsage(
    params: ExecuteAiTaskInput,
    agentId: string,
    response: AiResponse
  ): Promise<void> {
    const totalTokens = response.tokensUsed.input + response.tokensUsed.output
    const estimatedCost =
      (response.tokensUsed.input / 1000) * AI_COST_PER_1K_INPUT_TOKENS +
      (response.tokensUsed.output / 1000) * AI_COST_PER_1K_OUTPUT_TOKENS
    await this.usageBudgetService.recordUsage({
      tenantId: params.tenantId,
      featureKey: params.featureKey,
      provider: response.provider,
      model: response.model,
      inputTokens: response.tokensUsed.input,
      outputTokens: response.tokensUsed.output,
      estimatedCost,
      userId: params.userId,
    })
    await this.agentConfigService.incrementUsage(params.tenantId, agentId, totalTokens)
  }

  private async logFeatureAudit(
    params: ExecuteAiTaskInput,
    response: AiResponse,
    latencyMs: number,
    finalPrompt: string
  ): Promise<void> {
    await this.logAudit({
      id: randomUUID(),
      tenantId: params.tenantId,
      userId: params.userId,
      action: `feature:${params.featureKey}`,
      model: response.model,
      inputTokens: response.tokensUsed.input,
      outputTokens: response.tokensUsed.output,
      latencyMs,
      status: AiAuditStatus.SUCCESS,
      createdAt: toIso(),
      prompt: finalPrompt,
      response: response.result,
    })
  }

  private logFeatureTaskSuccess(
    params: ExecuteAiTaskInput,
    agentId: string,
    agentConfig: AgentConfigWithDefaults,
    response: AiResponse,
    latencyMs: number
  ): void {
    this.appLogger.info(`AI task executed: ${params.featureKey}`, {
      feature: AppLogFeature.AI,
      action: 'executeAiTask',
      outcome: AppLogOutcome.SUCCESS,
      tenantId: params.tenantId,
      actorEmail: params.userEmail,
      actorUserId: params.userId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AiService',
      functionName: 'executeAiTask',
      metadata: {
        featureKey: params.featureKey,
        agentId,
        agentName: agentConfig.displayName,
        model: response.model,
        latencyMs,
      },
    })
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: OSINT Enrichment                                         */
  /* ---------------------------------------------------------------- */

  /**
   * If the agent config has OSINT sources and the context contains an IoC,
   * enrich the context with OSINT query results before building the prompt.
   */
  private async enrichContextWithOsint(
    params: ExecuteAiTaskInput,
    agentConfig: AgentConfigWithDefaults
  ): Promise<void> {
    const sourceIds = this.extractOsintSourceIds(agentConfig)
    if (sourceIds.length === 0) {
      return
    }

    const { iocValue, iocType } = params.context as Record<string, unknown>
    if (typeof iocValue !== 'string' || typeof iocType !== 'string') {
      return
    }

    await this.performOsintEnrichment(params, iocType, iocValue, sourceIds)
  }

  /**
   * If the agent has indexPatterns configured, inject them into the context
   * so the prompt and AI response are scoped to the correct data sources.
   */
  private enrichContextWithIndexPatterns(
    params: ExecuteAiTaskInput,
    agentConfig: AgentConfigWithDefaults
  ): void {
    const patterns = agentConfig.indexPatterns
    if (!Array.isArray(patterns) || patterns.length === 0) {
      return
    }

    params.context['indexPatterns'] = patterns.join(', ')
    params.context['dataSourceScope'] =
      `This analysis should focus on data from these indices/sources: ${patterns.join(', ')}. Reference these data sources in your findings.`
  }

  private extractOsintSourceIds(agentConfig: AgentConfigWithDefaults): string[] {
    const { osintSources } = agentConfig
    if (!Array.isArray(osintSources) || osintSources.length === 0) {
      return []
    }
    return osintSources.filter((id): id is string => typeof id === 'string')
  }

  private async performOsintEnrichment(
    params: ExecuteAiTaskInput,
    iocType: string,
    iocValue: string,
    sourceIds: string[]
  ): Promise<void> {
    try {
      const enrichment = await this.osintExecutorService.enrichIoc(
        params.tenantId,
        iocType,
        iocValue,
        sourceIds
      )

      const successfulResults = enrichment.results
        .filter(r => r.success)
        .map(r => ({ source: r.sourceName, data: r.data }))

      if (successfulResults.length > 0) {
        params.context['osintEnrichment'] = JSON.stringify(successfulResults)
      }
    } catch (error: unknown) {
      this.logger.warn(
        `OSINT enrichment failed: ${error instanceof Error ? error.message : 'unknown error'}`
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Generic Task Routing                                     */
  /* ---------------------------------------------------------------- */

  private async routeGenericTask(
    connector: ResolvedAiConnector,
    prompt: string,
    maxTokens: number,
    featureKey?: string,
    context?: Record<string, unknown>,
    temperature?: number,
    modelOverride?: string
  ): Promise<AiResponse | undefined> {
    try {
      return await this.invokeGenericConnector(
        connector,
        prompt,
        maxTokens,
        featureKey,
        context,
        temperature,
        modelOverride
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(`Generic AI task routing failed for ${connector.type}: ${errorMessage}`)
      return undefined
    }
  }

  private async invokeGenericConnector(
    connector: ResolvedAiConnector,
    prompt: string,
    maxTokens: number,
    featureKey?: string,
    context?: Record<string, unknown>,
    temperature?: number,
    modelOverride?: string
  ): Promise<AiResponse | undefined> {
    switch (connector.type) {
      case ConnectorType.BEDROCK:
        return this.invokeGenericBedrock(
          connector,
          prompt,
          maxTokens,
          featureKey,
          context,
          temperature
        )
      case ConnectorType.LLM_APIS:
        return this.invokeGenericLlmApis(
          connector,
          prompt,
          maxTokens,
          featureKey,
          context,
          temperature,
          modelOverride
        )
      case ConnectorType.OPENCLAW_GATEWAY:
        return this.invokeGenericOpenClaw(
          connector,
          prompt,
          maxTokens,
          featureKey,
          context,
          temperature
        )
      default:
        return undefined
    }
  }

  private async invokeGenericBedrock(
    connector: ResolvedAiConnector,
    prompt: string,
    maxTokens: number,
    featureKey?: string,
    context?: Record<string, unknown>,
    temperature?: number
  ): Promise<AiResponse> {
    const aiResult = await this.bedrockService.invoke(
      connector.config,
      prompt,
      maxTokens,
      undefined,
      temperature
    )
    const model = (connector.config.modelId as string) ?? AI_DEFAULT_MODEL
    return buildFeatureAwareResponse(
      aiResult.text,
      model,
      'bedrock',
      aiResult.inputTokens,
      aiResult.outputTokens,
      featureKey,
      context
    )
  }

  private async invokeGenericLlmApis(
    connector: ResolvedAiConnector,
    prompt: string,
    maxTokens: number,
    featureKey?: string,
    context?: Record<string, unknown>,
    temperature?: number,
    modelOverride?: string
  ): Promise<AiResponse> {
    const resolvedModel = modelOverride ?? (connector.config.defaultModel as string) ?? 'gpt-4'
    const aiResult = await this.llmApisService.invoke(
      connector.config,
      prompt,
      maxTokens,
      resolvedModel,
      temperature
    )
    const model = resolvedModel
    const provider = connector.name ? `llm_apis(${connector.name})` : 'llm_apis'
    return buildFeatureAwareResponse(
      aiResult.text,
      model,
      provider,
      aiResult.inputTokens,
      aiResult.outputTokens,
      featureKey,
      context
    )
  }

  private async invokeGenericOpenClaw(
    connector: ResolvedAiConnector,
    prompt: string,
    maxTokens: number,
    featureKey?: string,
    context?: Record<string, unknown>,
    _temperature?: number
  ): Promise<AiResponse> {
    const aiResult = await this.openClawGatewayService.invoke(
      connector.config,
      prompt,
      maxTokens,
      'generic'
    )
    return buildFeatureAwareResponse(
      aiResult.text,
      'openclaw-gateway',
      'openclaw_gateway',
      aiResult.inputTokens,
      aiResult.outputTokens,
      featureKey,
      context
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Multi-Provider Connector Resolution                      */
  /* ---------------------------------------------------------------- */

  /**
   * Returns ALL configured AI connectors in priority order.
   * The caller cascades through them until one succeeds.
   */
  private async findAvailableAiConnectors(tenantId: string): Promise<ResolvedAiConnector[]> {
    const resolved = await this.resolveFixedConnectors(tenantId)
    const dynamicCount = await this.appendDynamicConnectors(tenantId, resolved)

    this.logConnectorResolution(tenantId, resolved, dynamicCount)

    return resolved
  }

  private async resolveFixedConnectors(tenantId: string): Promise<ResolvedAiConnector[]> {
    const configs = await Promise.all(
      AI_CONNECTOR_PRIORITY.map(async connectorType => {
        const config = await this.connectorsService.getDecryptedConfig(tenantId, connectorType)
        return config ? { type: connectorType, config } : undefined
      })
    )
    return configs.filter((entry): entry is ResolvedAiConnector => entry !== undefined)
  }

  private async appendDynamicConnectors(
    tenantId: string,
    resolved: ResolvedAiConnector[]
  ): Promise<number> {
    const dynamicLlmConfigs = await this.llmConnectorsService.getEnabledConfigs(tenantId)
    for (const dynamic of dynamicLlmConfigs) {
      resolved.push({
        type: ConnectorType.LLM_APIS,
        id: dynamic.id,
        name: dynamic.name,
        config: dynamic.config,
      })
    }
    return dynamicLlmConfigs.length
  }

  private logConnectorResolution(
    tenantId: string,
    resolved: ResolvedAiConnector[],
    dynamicCount: number
  ): void {
    this.appLogger.info(
      `AI connector resolution: ${String(resolved.length)} of ${String(AI_CONNECTOR_PRIORITY.length)} fixed + ${String(dynamicCount)} dynamic configured`,
      {
        feature: AppLogFeature.AI,
        action: 'findAvailableAiConnectors',
        sourceType: AppLogSourceType.SERVICE,
        className: 'AiService',
        functionName: 'findAvailableAiConnectors',
        tenantId,
        metadata: {
          checked: AI_CONNECTOR_PRIORITY,
          available: resolved.map(c => c.id ?? c.type),
          missing: AI_CONNECTOR_PRIORITY.filter(t => !resolved.some(r => r.type === t && !r.id)),
          dynamicCount,
        },
      }
    )
  }

  /**
   * Try each connector sequentially until one returns a response.
   * Uses recursion to avoid await-in-loop lint warning.
   * Returns undefined if all connectors fail.
   */
  private async tryConnectorsInOrder(
    connectors: ResolvedAiConnector[],
    attempt: (connector: ResolvedAiConnector) => Promise<AiResponse | undefined>,
    index = 0
  ): Promise<AiResponse | undefined> {
    if (index >= connectors.length) {
      this.logAllConnectorsFailed(connectors)
      return undefined
    }

    const connector = connectors.at(index)
    if (!connector) return undefined

    this.logConnectorAttempt(connector)
    const response = await attempt(connector)

    if (response) {
      this.logConnectorSuccess(connector, response)
      return response
    }

    this.logConnectorFailure(connector)
    return this.tryConnectorsInOrder(connectors, attempt, index + 1)
  }

  private logAllConnectorsFailed(connectors: ResolvedAiConnector[]): void {
    this.appLogger.warn('AI: all connectors failed, using rule-based fallback', {
      feature: AppLogFeature.AI,
      action: 'tryConnectorsInOrder',
      outcome: AppLogOutcome.WARNING,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AiService',
      functionName: 'tryConnectorsInOrder',
      metadata: { triedConnectors: connectors.map(c => c.type) },
    })
  }

  private logConnectorAttempt(connector: ResolvedAiConnector): void {
    const providerLabel = connector.name ? `${connector.type}(${connector.name})` : connector.type
    this.appLogger.info(`AI: trying provider ${providerLabel}...`, {
      feature: AppLogFeature.AI,
      action: 'tryConnectorsInOrder',
      sourceType: AppLogSourceType.SERVICE,
      className: 'AiService',
      functionName: 'tryConnectorsInOrder',
      metadata: {
        provider: connector.type,
        connectorId: connector.id,
        connectorName: connector.name,
      },
    })
  }

  private logConnectorSuccess(connector: ResolvedAiConnector, response: AiResponse): void {
    this.appLogger.info(`AI: ${connector.type} succeeded`, {
      feature: AppLogFeature.AI,
      action: 'tryConnectorsInOrder',
      outcome: AppLogOutcome.SUCCESS,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AiService',
      functionName: 'tryConnectorsInOrder',
      metadata: { provider: connector.type, model: response.model },
    })
  }

  private logConnectorFailure(connector: ResolvedAiConnector): void {
    this.appLogger.warn(`AI: ${connector.type} failed, trying next...`, {
      feature: AppLogFeature.AI,
      action: 'tryConnectorsInOrder',
      outcome: AppLogOutcome.FAILURE,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AiService',
      functionName: 'tryConnectorsInOrder',
      metadata: { provider: connector.type },
    })
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Hunt Routing                                             */
  /* ---------------------------------------------------------------- */

  private async routeHunt(
    connector: ResolvedAiConnector,
    dto: AiHuntDto,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    switch (connector.type) {
      case ConnectorType.BEDROCK:
        return this.tryBedrockHunt(connector.config, dto, user)
      case ConnectorType.LLM_APIS:
        return this.tryLlmApisHunt(connector.config, dto, user)
      case ConnectorType.OPENCLAW_GATEWAY:
        return this.tryOpenClawHunt(connector.config, dto, user)
      default:
        return undefined
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Investigate Routing                                      */
  /* ---------------------------------------------------------------- */

  private async routeInvestigate(
    connector: ResolvedAiConnector,
    alert: Alert,
    relatedAlerts: Array<Pick<Alert, 'id' | 'title' | 'severity' | 'timestamp'>>,
    alertId: string,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    switch (connector.type) {
      case ConnectorType.BEDROCK:
        return this.tryBedrockInvestigate(connector.config, alert, relatedAlerts, alertId, user)
      case ConnectorType.LLM_APIS:
        return this.tryLlmApisInvestigate(connector.config, alert, relatedAlerts, alertId, user)
      case ConnectorType.OPENCLAW_GATEWAY:
        return this.tryOpenClawInvestigate(connector.config, alert, relatedAlerts, alertId, user)
      default:
        return undefined
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Explain Routing                                          */
  /* ---------------------------------------------------------------- */

  private async routeExplain(
    connector: ResolvedAiConnector,
    prompt: string,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    switch (connector.type) {
      case ConnectorType.BEDROCK:
        return this.tryBedrockExplain(connector.config, prompt, user)
      case ConnectorType.LLM_APIS:
        return this.tryLlmApisExplain(connector.config, prompt, user)
      case ConnectorType.OPENCLAW_GATEWAY:
        return this.tryOpenClawExplain(connector.config, prompt, user)
      default:
        return undefined
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Agent Task Routing                                       */
  /* ---------------------------------------------------------------- */

  private async routeAgentTask(
    connector: ResolvedAiConnector,
    input: AgentTaskExecutionInput
  ): Promise<AiResponse | undefined> {
    switch (connector.type) {
      case ConnectorType.BEDROCK:
        return this.tryBedrockAgentTask(connector.config, input)
      case ConnectorType.LLM_APIS:
        return this.tryLlmApisAgentTask(connector.config, input, connector.name)
      case ConnectorType.OPENCLAW_GATEWAY:
        return this.tryOpenClawAgentTask(connector.config, input)
      default:
        return undefined
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Bedrock Attempt Helpers                                   */
  /* ---------------------------------------------------------------- */

  private async tryBedrockHunt(
    config: Record<string, unknown>,
    dto: AiHuntDto,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    try {
      const prompt = buildHuntPrompt(dto.query, dto.context)
      const aiResult = await this.bedrockService.invoke(config, prompt, AI_BEDROCK_MAX_TOKENS)
      return buildBedrockHuntResponse(
        aiResult.text,
        dto.query,
        (config.modelId as string) ?? AI_DEFAULT_MODEL,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('Bedrock', 'aiHunt', error, user.tenantId, user.sub)
      return undefined
    }
  }

  private async tryBedrockInvestigate(
    config: Record<string, unknown>,
    alert: Alert,
    relatedAlerts: Array<Pick<Alert, 'id' | 'title' | 'severity' | 'timestamp'>>,
    alertId: string,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    try {
      const prompt = buildInvestigationPrompt(alert, relatedAlerts)
      const aiResult = await this.bedrockService.invoke(config, prompt, AI_BEDROCK_MAX_TOKENS)
      return buildBedrockInvestigateResponse(
        aiResult.text,
        alertId,
        relatedAlerts.length,
        alert,
        relatedAlerts,
        (config.modelId as string) ?? AI_DEFAULT_MODEL,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('Bedrock', 'aiInvestigate', error, user.tenantId, user.sub, {
        targetResource: 'Alert',
        targetResourceId: alertId,
      })
      return undefined
    }
  }

  private async tryBedrockAgentTask(
    config: Record<string, unknown>,
    input: AgentTaskExecutionInput
  ): Promise<AiResponse | undefined> {
    try {
      const prompt = buildAgentTaskPrompt({
        agentName: input.agentName,
        prompt: input.prompt,
        soulMd: input.soulMd,
        tools: input.tools,
      })
      const aiResult = await this.bedrockService.invoke(config, prompt, AI_BEDROCK_MAX_TOKENS)
      return buildBedrockAgentTaskResponse(
        aiResult.text,
        input.agentName,
        (config.modelId as string) ?? input.model,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('Bedrock', 'runAgentTask', error, input.tenantId, input.actorUserId, {
        targetResource: 'AiAgent',
        targetResourceId: input.agentId,
        feature: AppLogFeature.AI_AGENTS,
      })
      return undefined
    }
  }

  private async tryBedrockExplain(
    config: Record<string, unknown>,
    prompt: string,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    try {
      const aiResult = await this.bedrockService.invoke(config, prompt, AI_BEDROCK_MAX_TOKENS)
      return buildBedrockExplainResponse(
        aiResult.text,
        (config.modelId as string) ?? AI_DEFAULT_MODEL,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('Bedrock', 'aiExplain', error, user.tenantId, user.sub)
      return undefined
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: LLM APIs Attempt Helpers                                 */
  /* ---------------------------------------------------------------- */

  private async tryLlmApisHunt(
    config: Record<string, unknown>,
    dto: AiHuntDto,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    try {
      const prompt = buildHuntPrompt(dto.query, dto.context)
      const aiResult = await this.llmApisService.invoke(config, prompt, AI_LLM_APIS_MAX_TOKENS)
      const modelId = (config.defaultModel as string) ?? 'gpt-4'
      return buildLlmApisHuntResponse(
        aiResult.text,
        dto.query,
        modelId,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('LLM APIs', 'aiHunt', error, user.tenantId, user.sub)
      return undefined
    }
  }

  private async tryLlmApisInvestigate(
    config: Record<string, unknown>,
    alert: Alert,
    relatedAlerts: Array<Pick<Alert, 'id' | 'title' | 'severity' | 'timestamp'>>,
    alertId: string,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    try {
      const prompt = buildInvestigationPrompt(alert, relatedAlerts)
      const aiResult = await this.llmApisService.invoke(config, prompt, AI_LLM_APIS_MAX_TOKENS)
      const modelId = (config.defaultModel as string) ?? 'gpt-4'
      return buildLlmApisInvestigateResponse(
        aiResult.text,
        alertId,
        relatedAlerts.length,
        alert,
        relatedAlerts,
        modelId,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('LLM APIs', 'aiInvestigate', error, user.tenantId, user.sub, {
        targetResource: 'Alert',
        targetResourceId: alertId,
      })
      return undefined
    }
  }

  private async tryLlmApisAgentTask(
    config: Record<string, unknown>,
    input: AgentTaskExecutionInput,
    connectorName?: string
  ): Promise<AiResponse | undefined> {
    try {
      const prompt = this.buildAgentTaskPromptFromInput(input)
      const aiResult = await this.llmApisService.invoke(config, prompt, AI_LLM_APIS_MAX_TOKENS)
      const modelId = (config.defaultModel as string) ?? 'gpt-4'
      return buildLlmApisAgentTaskResponse(
        aiResult.text,
        input.agentName,
        modelId,
        aiResult.inputTokens,
        aiResult.outputTokens,
        connectorName
      )
    } catch (error) {
      this.logAgentTaskProviderFailure('LLM APIs', error, input)
      return undefined
    }
  }

  private async tryLlmApisExplain(
    config: Record<string, unknown>,
    prompt: string,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    try {
      const aiResult = await this.llmApisService.invoke(config, prompt, AI_LLM_APIS_MAX_TOKENS)
      const modelId = (config.defaultModel as string) ?? 'gpt-4'
      return buildLlmApisExplainResponse(
        aiResult.text,
        modelId,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('LLM APIs', 'aiExplain', error, user.tenantId, user.sub)
      return undefined
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: OpenClaw Gateway Attempt Helpers                         */
  /* ---------------------------------------------------------------- */

  private async tryOpenClawHunt(
    config: Record<string, unknown>,
    dto: AiHuntDto,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    try {
      const prompt = buildHuntPrompt(dto.query, dto.context)
      const aiResult = await this.openClawGatewayService.invoke(
        config,
        prompt,
        AI_OPENCLAW_MAX_TOKENS,
        'hunt'
      )
      return buildOpenClawHuntResponse(
        aiResult.text,
        dto.query,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('OpenClaw Gateway', 'aiHunt', error, user.tenantId, user.sub)
      return undefined
    }
  }

  private async tryOpenClawInvestigate(
    config: Record<string, unknown>,
    alert: Alert,
    relatedAlerts: Array<Pick<Alert, 'id' | 'title' | 'severity' | 'timestamp'>>,
    alertId: string,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    try {
      const prompt = buildInvestigationPrompt(alert, relatedAlerts)
      const aiResult = await this.openClawGatewayService.invoke(
        config,
        prompt,
        AI_OPENCLAW_MAX_TOKENS,
        'investigate'
      )
      return buildOpenClawInvestigateResponse(
        aiResult.text,
        alertId,
        relatedAlerts.length,
        alert,
        relatedAlerts,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('OpenClaw Gateway', 'aiInvestigate', error, user.tenantId, user.sub, {
        targetResource: 'Alert',
        targetResourceId: alertId,
      })
      return undefined
    }
  }

  private async tryOpenClawAgentTask(
    config: Record<string, unknown>,
    input: AgentTaskExecutionInput
  ): Promise<AiResponse | undefined> {
    try {
      const prompt = this.buildAgentTaskPromptFromInput(input)
      const aiResult = await this.openClawGatewayService.invoke(
        config,
        prompt,
        AI_OPENCLAW_MAX_TOKENS,
        'agent_task'
      )
      return buildOpenClawAgentTaskResponse(
        aiResult.text,
        input.agentName,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logAgentTaskProviderFailure('OpenClaw Gateway', error, input)
      return undefined
    }
  }

  private buildAgentTaskPromptFromInput(input: AgentTaskExecutionInput): string {
    return buildAgentTaskPrompt({
      agentName: input.agentName,
      prompt: input.prompt,
      soulMd: input.soulMd,
      tools: input.tools,
    })
  }

  private logAgentTaskProviderFailure(
    providerName: string,
    error: unknown,
    input: AgentTaskExecutionInput
  ): void {
    this.logProviderFailure(
      providerName,
      'runAgentTask',
      error,
      input.tenantId,
      input.actorUserId,
      {
        targetResource: 'AiAgent',
        targetResourceId: input.agentId,
        feature: AppLogFeature.AI_AGENTS,
      }
    )
  }

  private async tryOpenClawExplain(
    config: Record<string, unknown>,
    prompt: string,
    user: JwtPayload
  ): Promise<AiResponse | undefined> {
    try {
      const aiResult = await this.openClawGatewayService.invoke(
        config,
        prompt,
        AI_OPENCLAW_MAX_TOKENS,
        'explain'
      )
      return buildOpenClawExplainResponse(
        aiResult.text,
        aiResult.inputTokens,
        aiResult.outputTokens
      )
    } catch (error) {
      this.logProviderFailure('OpenClaw Gateway', 'aiExplain', error, user.tenantId, user.sub)
      return undefined
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Load & Validate                                          */
  /* ---------------------------------------------------------------- */

  private async loadAndValidateAlert(alertId: string, user: JwtPayload): Promise<Alert> {
    const fullAlert = await this.aiRepository.findAlertByIdAndTenant(alertId, user.tenantId)

    if (!fullAlert) {
      this.appLogger.warn('AI investigation failed — alert not found', {
        feature: AppLogFeature.AI,
        action: 'aiInvestigate',
        outcome: AppLogOutcome.FAILURE,
        tenantId: user.tenantId,
        actorEmail: user.email,
        actorUserId: user.sub,
        sourceType: AppLogSourceType.SERVICE,
        className: 'AiService',
        functionName: 'aiInvestigate',
        targetResource: 'Alert',
        targetResourceId: alertId,
      })
      throw new BusinessException(404, 'Alert not found', 'errors.alerts.notFound')
    }

    return fullAlert
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: AI Gate                                                   */
  /* ---------------------------------------------------------------- */

  private async ensureAiEnabled(tenantId: string): Promise<void> {
    try {
      const [enabledConnectors, hasDynamicLlm] = await this.checkAiConnectorAvailability(tenantId)
      this.assertAnyConnectorEnabled(enabledConnectors, hasDynamicLlm, tenantId)
    } catch (error) {
      if (error instanceof BusinessException) throw error
      this.logger.error('AI gate check failed', error)
      throw new BusinessException(
        503,
        'AI service temporarily unavailable',
        'errors.ai.serviceUnavailable'
      )
    }
  }

  private async checkAiConnectorAvailability(tenantId: string): Promise<[unknown[], boolean]> {
    return Promise.all([
      this.aiRepository.findEnabledConnectorByTypes(tenantId, [
        ConnectorType.BEDROCK,
        ConnectorType.LLM_APIS,
        ConnectorType.OPENCLAW_GATEWAY,
      ]),
      this.llmConnectorsService.hasEnabledConnectors(tenantId),
    ])
  }

  private assertAnyConnectorEnabled(
    enabledConnectors: unknown[],
    hasDynamicLlm: boolean,
    tenantId: string
  ): void {
    if (enabledConnectors.length === 0 && !hasDynamicLlm) {
      this.appLogger.warn('AI features not enabled for tenant', {
        feature: AppLogFeature.AI,
        action: 'ensureAiEnabled',
        className: 'AiService',
        sourceType: AppLogSourceType.SERVICE,
        outcome: AppLogOutcome.DENIED,
        tenantId,
      })
      throw new BusinessException(
        403,
        'No AI connectors are configured or enabled. Set up at least one connector in Connectors settings.',
        'errors.ai.notEnabled'
      )
    }
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Related Alerts Loader                                    */
  /* ---------------------------------------------------------------- */

  private async loadRelatedAlerts(
    alert: Alert,
    tenantId: string
  ): Promise<Array<Pick<Alert, 'id' | 'title' | 'severity' | 'timestamp'>>> {
    const orConditions: Prisma.AlertWhereInput[] = []

    if (alert.sourceIp) {
      orConditions.push({ sourceIp: alert.sourceIp })
    }
    if (alert.ruleId) {
      orConditions.push({ ruleId: alert.ruleId })
    }

    if (orConditions.length === 0) return []

    const sinceDate = daysAgo(2)
    return this.aiRepository.findRelatedAlerts(tenantId, alert.id, sinceDate, orConditions)
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Audit Logging                                            */
  /* ---------------------------------------------------------------- */

  private buildAuditRecord(
    user: JwtPayload,
    action: AiAuditAction,
    response: AiResponse,
    latencyMs: number,
    prompt: string
  ): AiAuditRecord {
    return {
      id: randomUUID(),
      tenantId: user.tenantId,
      userId: user.sub,
      action,
      model: response.model,
      inputTokens: response.tokensUsed.input,
      outputTokens: response.tokensUsed.output,
      latencyMs,
      status: AiAuditStatus.SUCCESS,
      createdAt: toIso(),
      prompt,
      response: response.result,
    }
  }

  private async logAudit(record: AiAuditRecord): Promise<void> {
    try {
      await this.aiRepository.createAuditLog({
        tenantId: record.tenantId,
        actor: record.userId,
        action: record.action,
        model: record.model,
        inputTokens: record.inputTokens,
        outputTokens: record.outputTokens,
        durationMs: record.latencyMs,
        prompt: record.prompt,
        response: record.response,
      })
    } catch {
      this.logger.warn('ai_audit_logs table not available; audit record stored in memory only')
    }

    this.logger.log(
      `AI Audit: ${record.action} by ${record.userId} | ${record.model} | ${record.inputTokens}+${record.outputTokens} tokens | ${record.latencyMs}ms | ${record.status}`
    )
  }

  /* ---------------------------------------------------------------- */
  /* PRIVATE: Structured Logging                                       */
  /* ---------------------------------------------------------------- */

  private logAction(
    action: string,
    user: JwtPayload,
    targetResource: string,
    targetResourceId?: string,
    metadata?: Record<string, unknown>
  ): void {
    this.appLogger.info(`AI action: ${action}`, {
      feature: AppLogFeature.AI,
      action,
      outcome: AppLogOutcome.SUCCESS,
      tenantId: user.tenantId,
      actorEmail: user.email,
      actorUserId: user.sub,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AiService',
      functionName: action,
      targetResource,
      targetResourceId,
      metadata,
    })
  }

  private logProviderFailure(
    providerName: string,
    action: string,
    error: unknown,
    tenantId: string,
    actorUserId: string,
    extra?: {
      targetResource?: string
      targetResourceId?: string
      feature?: AppLogFeature
    }
  ): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown'
    this.logger.warn(`${providerName} ${action} failed, falling back: ${errorMessage}`)
    this.appLogger.warn(`${providerName} ${action} invocation failed, using fallback`, {
      feature: extra?.feature ?? AppLogFeature.AI,
      action,
      outcome: AppLogOutcome.FAILURE,
      tenantId,
      actorUserId,
      sourceType: AppLogSourceType.SERVICE,
      className: 'AiService',
      functionName: action,
      targetResource: extra?.targetResource,
      targetResourceId: extra?.targetResourceId,
      metadata: { error: errorMessage, provider: providerName },
    })
  }
}
