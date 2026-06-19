import { Injectable, Logger } from '@nestjs/common'
import { AiChatRepository } from './ai-chat.repository'
import { AiOutputFormat } from '../../../common/enums'
import { BusinessException } from '../../../common/exceptions/business.exception'
import { elapsedMs, nowDate, nowMs, toDay, toIso } from '../../../common/utils/date-time.utility'
import { ConnectorsService } from '../../connectors/connectors.service'
import { LlmConnectorsService } from '../../connectors/llm-connectors/llm-connectors.service'
import { LlmApisService } from '../../connectors/services/llm-apis.service'
import { MemoryRetrievalService } from '../memory/memory-retrieval.service'
import type { AiChatMessage, AiChatThread } from '@prisma/client'

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name)

  constructor(
    private readonly repository: AiChatRepository,
    private readonly connectorsService: ConnectorsService,
    private readonly llmConnectorsService: LlmConnectorsService,
    private readonly llmApisService: LlmApisService,
    private readonly memoryRetrievalService: MemoryRetrievalService
  ) {}

  async listThreads(
    tenantId: string,
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<{ data: AiChatThread[]; nextCursor: string | null; hasMore: boolean }> {
    const where: Record<string, unknown> = { tenantId, userId, isArchived: false }

    if (cursor) {
      where['lastActivityAt'] = { lt: toDay(cursor).toDate() }
    }

    const threads = await this.repository.findThreads({
      where,
      orderBy: { lastActivityAt: 'desc' },
      take: limit + 1,
    })

    const hasMore = threads.length > limit
    if (hasMore) {
      threads.pop()
    }

    const nextCursor =
      hasMore && threads.length > 0 ? (toIso(threads.at(-1)?.lastActivityAt) ?? null) : null

    return { data: threads, nextCursor, hasMore }
  }

  async createThread(
    tenantId: string,
    userId: string,
    options: { connectorId?: string; model?: string; systemPrompt?: string }
  ): Promise<AiChatThread> {
    const rawConnectorId = options.connectorId ?? null
    let connectorId: string | null = null
    let provider: string | null = null
    let model: string | null = options.model ?? null

    // Only treat as a specific connector if it looks like a UUID
    const isUuid = rawConnectorId
      ? /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(rawConnectorId)
      : false

    if (rawConnectorId && isUuid) {
      // Explicit custom LLM connector selected
      connectorId = rawConnectorId
      const connector = await this.llmConnectorsService.getById(connectorId, tenantId)
      provider = connector.name
      if (!model) {
        model = connector.defaultModel ?? null
      }
    }

    // Auto-select: check fixed connectors first, then custom LLM connectors
    if (!connectorId) {
      const fixedTypes = ['llm_apis', 'openclaw_gateway', 'bedrock']
      for (const fixedType of fixedTypes) {
        const cfg = await this.connectorsService.getDecryptedConfig(tenantId, fixedType)
        if (cfg) {
          // Fixed connectors have no UUID — store null connectorId, use provider field
          connectorId = null
          provider = fixedType
          if (!model) {
            model = (cfg.defaultModel as string) ?? null
          }
          break
        }
      }
    }

    if (!connectorId && !provider) {
      const enabledConfigs = await this.llmConnectorsService.getEnabledConfigs(tenantId)
      const first = enabledConfigs.at(0)
      if (first) {
        connectorId = first.id
        provider = first.name
        if (!model) {
          model = (first.config.defaultModel as string) ?? null
        }
      }
    }

    if (!connectorId && !provider) {
      throw new BusinessException(
        400,
        'No LLM connector available. Configure one in Connectors settings.',
        'errors.chat.noConnectorAvailable'
      )
    }

    return this.repository.createThread({
      tenantId,
      userId,
      connectorId,
      title: null,
      model,
      provider,
      outputFormat: AiOutputFormat.PLAIN_TEXT,
      systemPrompt: options.systemPrompt ?? null,
    })
  }

  async getMessages(
    tenantId: string,
    userId: string,
    threadId: string,
    limit: number,
    cursor?: string,
    direction: 'older' | 'newer' = 'older'
  ): Promise<{ data: AiChatMessage[]; nextCursor: string | null; hasMore: boolean }> {
    await this.verifyThreadAccess(tenantId, userId, threadId)

    const where: Record<string, unknown> = { threadId, tenantId }

    if (cursor) {
      where['createdAt'] =
        direction === 'older' ? { lt: toDay(cursor).toDate() } : { gt: toDay(cursor).toDate() }
    }

    const orderDir = direction === 'older' ? 'desc' : 'asc'

    const messages = await this.repository.findMessages({
      where,
      orderBy: { createdAt: orderDir as 'asc' | 'desc' },
      take: limit + 1,
    })

    const hasMore = messages.length > limit
    if (hasMore) {
      messages.pop()
    }

    // Always return in chronological order
    if (direction === 'older') {
      messages.reverse()
    }

    const nextCursor =
      hasMore && messages.length > 0
        ? ((direction === 'older'
            ? toIso(messages.at(0)?.createdAt)
            : toIso(messages.at(-1)?.createdAt)) ?? null)
        : null

    return { data: messages, nextCursor, hasMore }
  }

  async sendMessage(
    tenantId: string,
    userId: string,
    threadId: string,
    content: string,
    overrides?: { model?: string; connectorId?: string }
  ): Promise<AiChatMessage> {
    const thread = await this.verifyThreadAccess(tenantId, userId, threadId)

    if (!content || content.trim().length === 0) {
      throw new BusinessException(400, 'Message content is required', 'errors.chat.emptyMessage')
    }

    const nextSeq = thread.messageCount + 1

    // Determine requested model/connector (per-message override or thread default)
    const requestedModel = overrides?.model ?? thread.model ?? null
    // Use connectorId if UUID, otherwise use provider as the connector key (for fixed connectors)
    const requestedConnectorId = overrides?.connectorId ?? thread.connectorId ?? thread.provider
    const requestedProvider = thread.provider ?? null

    // If per-message connector override, update thread settings too
    if (overrides?.connectorId && overrides.connectorId !== thread.connectorId) {
      await this.updateThreadSettings(tenantId, userId, threadId, {
        connectorId: overrides.connectorId,
        model: overrides.model,
      })
    } else if (overrides?.model && overrides.model !== thread.model) {
      await this.repository.updateThread(threadId, { model: overrides.model })
    }

    // Persist user message
    await this.repository.createMessage({
      threadId,
      tenantId,
      role: 'user',
      content: content.trim(),
      sequenceNum: nextSeq,
      status: 'completed',
    })

    // Build conversation history (last 20 messages)
    const recentMessages = await this.repository.findMessages({
      where: { threadId },
      orderBy: { sequenceNum: 'desc' },
      take: 20,
      select: { role: true, content: true },
    })
    const conversationHistory = recentMessages.reverse().map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Retrieve relevant memories for context injection (non-blocking — never fail chat)
    let enhancedSystemPrompt: string | undefined = thread.systemPrompt ?? undefined
    try {
      const memoryContext = await this.memoryRetrievalService.formatForPrompt(
        tenantId,
        userId,
        content,
        500
      )
      if (memoryContext) {
        enhancedSystemPrompt = `${memoryContext}\n\n${thread.systemPrompt ?? ''}`
      }
    } catch (memError) {
      const message = memError instanceof Error ? memError.message : 'Unknown error'
      this.logger.warn(`Memory retrieval failed (non-blocking): ${message}`)
    }

    // Resolve connector chain (priority-ordered)
    const connectorChain = await this.resolveConnectorConfigs(tenantId, requestedConnectorId)

    const startTime = nowMs()
    let responseText = ''
    let actualModel = requestedModel ?? 'unknown'
    let actualProvider = requestedProvider ?? 'unknown'
    let fallbackModel: string | null = null
    let fallbackReason: string | null = null
    let messageStatus = 'completed'
    let inputTokens = 0
    let outputTokens = 0

    if (connectorChain.length === 0) {
      responseText = 'No LLM connector available. Please configure one in Connectors settings.'
      messageStatus = 'failed'
      fallbackReason = 'No connector available'
    } else {
      // Try each connector in priority order; stop on first success
      let lastError: string | null = null
      let succeeded = false

      for (const entry of connectorChain) {
        try {
          const modelForRequest = overrides?.model ?? entry.model ?? requestedModel ?? undefined

          const result = await this.llmApisService.invokeChat(
            entry.config,
            conversationHistory,
            thread.maxTokens,
            modelForRequest,
            thread.temperature,
            enhancedSystemPrompt
          )

          responseText = result.text
          actualModel = result.model ?? modelForRequest ?? 'unknown'
          actualProvider = entry.provider
          inputTokens = result.inputTokens
          outputTokens = result.outputTokens
          succeeded = true

          // Detect fallback: used a different connector than the first choice
          if (entry !== connectorChain.at(0)) {
            const firstProvider = connectorChain.at(0)?.provider ?? 'unknown'
            fallbackReason = `Primary connector (${firstProvider}) failed, used ${entry.provider}`
          }

          // Detect model fallback
          if (requestedModel && result.model && result.model !== requestedModel) {
            fallbackModel = result.model
            fallbackReason = `Provider returned different model (requested: ${requestedModel})`
          }

          this.logger.log(`Chat message sent via ${entry.provider} using model ${actualModel}`)
          break
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error'
          this.logger.warn(`Chat connector ${entry.provider} failed: ${lastError}, trying next...`)
        }
      }

      if (!succeeded) {
        responseText = `All connectors failed. Last error: ${lastError ?? 'unknown'}`
        messageStatus = 'failed'
        fallbackReason = lastError
      }
    }

    const durationMs = elapsedMs(startTime)

    // Persist assistant response with full model attribution
    const assistantMessage = await this.repository.createMessage({
      threadId,
      tenantId,
      role: 'assistant',
      content: responseText,
      requestedModel,
      requestedProvider,
      model: actualModel,
      provider: actualProvider,
      fallbackModel,
      fallbackReason,
      status: messageStatus,
      inputTokens,
      outputTokens,
      durationMs,
      sequenceNum: nextSeq + 1,
    })

    // Update thread metadata (do NOT overwrite model/provider — preserve user's connector choice)
    await this.repository.updateThread(threadId, {
      messageCount: nextSeq + 1,
      totalTokensUsed: { increment: inputTokens + outputTokens },
      lastActivityAt: nowDate(),
      title: thread.title ?? this.generateTitle(content),
    })

    // Trigger async memory extraction
    void this.dispatchMemoryExtraction(tenantId, userId, threadId)

    return assistantMessage
  }

  async updateThreadSettings(
    tenantId: string,
    userId: string,
    threadId: string,
    settings: { connectorId?: string; model?: string }
  ): Promise<AiChatThread> {
    await this.verifyThreadAccess(tenantId, userId, threadId)

    const data: {
      connectorId?: string | null
      provider?: string | null
      model?: string | null
    } = {}

    if (settings.connectorId) {
      if (settings.connectorId === 'default') {
        // Reset to auto-select
        data.connectorId = null
        data.provider = null
      } else if (
        /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(settings.connectorId)
      ) {
        // Custom LLM connector
        const connector = await this.llmConnectorsService.getById(settings.connectorId, tenantId)
        data.connectorId = settings.connectorId
        data.provider = connector.name
        if (!settings.model) {
          data.model = connector.defaultModel ?? null
        }
      } else {
        // Fixed connector type string (e.g. "llm_apis", "bedrock")
        // connectorId column is UUID — can't store type strings
        // Store null for connectorId, use provider field to track the fixed type
        data.connectorId = null
        data.provider = settings.connectorId
        const fixedConfig = await this.connectorsService.getDecryptedConfig(
          tenantId,
          settings.connectorId
        )
        if (fixedConfig && !settings.model) {
          data.model = (fixedConfig.defaultModel as string) ?? null
        }
      }
    }

    if (settings.model) {
      data.model = settings.model
    }

    return this.repository.updateThread(threadId, data, { includeUser: true })
  }

  async archiveThread(tenantId: string, userId: string, threadId: string): Promise<void> {
    await this.verifyThreadAccess(tenantId, userId, threadId)
    await this.repository.updateThread(threadId, { isArchived: true })
  }

  private async dispatchMemoryExtraction(
    tenantId: string,
    userId: string,
    threadId: string
  ): Promise<void> {
    try {
      await this.repository.createJob({
        tenantId,
        type: 'memory_extraction' as never,
        status: 'pending',
        payload: { tenantId, userId, threadId },
        maxAttempts: 2,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(`Failed to dispatch memory extraction job: ${message}`)
    }
  }

  /**
   * Resolves an ordered list of connector configs to try.
   * When a specific connector is selected, returns only that one.
   * When "default" (null), checks fixed connectors first (llm_apis, openclaw_gateway, bedrock),
   * then custom LLM connectors — so the first enabled one wins.
   */
  private async resolveConnectorConfigs(
    tenantId: string,
    connectorId: string | null
  ): Promise<Array<{ config: Record<string, unknown>; provider: string; model: string | null }>> {
    const isUuid = connectorId
      ? /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(connectorId)
      : false

    // Case 1: Explicit custom LLM connector (UUID)
    if (connectorId && isUuid) {
      const cfg = await this.llmConnectorsService.getDecryptedConfig(connectorId, tenantId)
      if (cfg) {
        return [{ config: cfg, provider: connectorId, model: (cfg.defaultModel as string) ?? null }]
      }
      return []
    }

    // Case 2: Fixed connector type string (e.g., "llm_apis", "bedrock")
    if (connectorId && !isUuid) {
      const cfg = await this.connectorsService.getDecryptedConfig(tenantId, connectorId)
      if (cfg) {
        return [{ config: cfg, provider: connectorId, model: (cfg.defaultModel as string) ?? null }]
      }
      return []
    }

    // Case 3: Default / auto — build priority list:
    //   1. Fixed connectors: llm_apis → openclaw_gateway → bedrock
    //   2. Custom LLM connectors (all enabled, in DB order)
    const results: Array<{
      config: Record<string, unknown>
      provider: string
      model: string | null
    }> = []

    const fixedTypes = ['llm_apis', 'openclaw_gateway', 'bedrock']
    for (const fixedType of fixedTypes) {
      const cfg = await this.connectorsService.getDecryptedConfig(tenantId, fixedType)
      if (cfg) {
        results.push({
          config: cfg,
          provider: fixedType,
          model: (cfg.defaultModel as string) ?? null,
        })
      }
    }

    const enabledCustom = await this.llmConnectorsService.getEnabledConfigs(tenantId)
    for (const custom of enabledCustom) {
      results.push({
        config: custom.config,
        provider: custom.name,
        model: (custom.config.defaultModel as string) ?? null,
      })
    }

    return results
  }

  private async verifyThreadAccess(
    tenantId: string,
    userId: string,
    threadId: string
  ): Promise<AiChatThread> {
    const thread = await this.repository.findThreadById(threadId)
    if (!thread) {
      throw new BusinessException(404, 'Chat thread not found', 'errors.chat.threadNotFound')
    }
    if (thread.tenantId !== tenantId || thread.userId !== userId) {
      throw new BusinessException(403, 'Access denied to this chat', 'errors.chat.accessDenied')
    }
    return thread
  }

  private generateTitle(firstMessage: string): string {
    const trimmed = firstMessage.trim().substring(0, 60)
    return trimmed.length < firstMessage.trim().length ? `${trimmed}...` : trimmed
  }
}
