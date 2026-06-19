import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common'
import { EmbeddingService } from './embedding.service'
import { getUserMemoryDelegate } from './memory.types'
import { PrismaService } from '../../../prisma/prisma.service'
import { AiChatRepository } from '../../ai/chat/ai-chat.repository'
import { ConnectorsService } from '../../connectors/connectors.service'
import { LlmConnectorsService } from '../../connectors/llm-connectors/llm-connectors.service'
import { LlmApisService } from '../../connectors/services/llm-apis.service'
import type { ExtractedMemory } from './memory.types'

@Injectable()
export class MemoryExtractionService {
  private readonly logger = new Logger(MemoryExtractionService.name)

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AiChatRepository))
    private readonly chatRepository: AiChatRepository,
    private readonly connectorsService: ConnectorsService,
    private readonly llmConnectorsService: LlmConnectorsService,
    private readonly llmApisService: LlmApisService,
    private readonly embeddingService: EmbeddingService
  ) {}

  async extractFromThread(tenantId: string, userId: string, threadId: string): Promise<void> {
    this.logger.log(`Extracting memories from thread ${threadId} for user ${userId}`)

    const messages = await this.chatRepository.findMessages({
      where: { threadId, tenantId, role: 'user' },
      orderBy: { sequenceNum: 'asc' },
      take: 50,
      select: { content: true, id: true },
    })

    if (messages.length === 0) {
      this.logger.log('No user messages found in thread, skipping extraction')
      return
    }

    const userText = messages.map(m => m.content).join('\n')

    // Fetch existing memories for context (to detect contradictions)
    const existingMemories = await getUserMemoryDelegate(this.prisma).findMany({
      where: { tenantId, userId, isDeleted: false },
      take: 100,
    })

    const existingContext =
      existingMemories.length > 0
        ? existingMemories.map(m => `[${m.id}] (${m.category}) ${m.content}`).join('\n')
        : 'No existing memories.'

    // Call LLM to extract memories
    const extractionPrompt = this.buildExtractionPrompt(userText, existingContext)
    const config = await this.resolveConfig(tenantId)
    if (!config) {
      this.logger.warn('No LLM connector available for memory extraction')
      return
    }

    try {
      const result = await this.llmApisService.invokeChat(
        config,
        [{ role: 'user', content: extractionPrompt }],
        2048,
        undefined,
        0.1
      )

      const extracted = this.parseExtractionResponse(result.text)
      await this.applyExtractedMemories(tenantId, userId, threadId, extracted)

      this.logger.log(`Extracted ${String(extracted.length)} memories from thread ${threadId}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Memory extraction failed for thread ${threadId}: ${message}`)
    }
  }

  private buildExtractionPrompt(userText: string, existingMemories: string): string {
    return `You are a memory extraction system. Analyze the user's messages and extract important facts, preferences, and context that should be remembered across conversations.

EXISTING MEMORIES:
${existingMemories}

USER MESSAGES:
${userText}

INSTRUCTIONS:
- Extract only permanent, important facts (preferences, personal info, work context, explicit instructions)
- Do NOT extract temporary conversational details or greetings
- If a new fact contradicts an existing memory, output an "update" action with the existing memory ID
- If an existing memory is no longer valid, output a "delete" action
- For new facts, output a "create" action
- Categorize each as: fact, preference, instruction, or context

OUTPUT FORMAT (JSON array, nothing else):
[
  {"action": "create", "content": "fact text here", "category": "fact"},
  {"action": "update", "existingMemoryId": "uuid-here", "content": "updated text", "category": "preference"},
  {"action": "delete", "existingMemoryId": "uuid-here", "content": "", "category": ""}
]

If no memories should be extracted, return: []`
  }

  private parseExtractionResponse(text: string): ExtractedMemory[] {
    try {
      // Find JSON array in response
      const jsonMatch = /\[[\s\S]*\]/.exec(text)
      if (!jsonMatch) return []

      const parsed = JSON.parse(jsonMatch[0]) as unknown[]
      const results: ExtractedMemory[] = []

      for (const item of parsed) {
        if (typeof item !== 'object' || item === null) continue
        const object = item as Record<string, unknown>
        const action = object['action'] as string | undefined
        const content = object['content'] as string | undefined
        const category = object['category'] as string | undefined

        if (!action || (action !== 'delete' && !content)) continue

        results.push({
          content: content ?? '',
          category: category ?? 'fact',
          action: action as 'create' | 'update' | 'delete',
          existingMemoryId: object['existingMemoryId'] as string | undefined,
        })
      }

      return results
    } catch {
      this.logger.warn('Failed to parse memory extraction response')
      return []
    }
  }

  private async applyExtractedMemories(
    tenantId: string,
    userId: string,
    threadId: string,
    memories: ExtractedMemory[]
  ): Promise<void> {
    for (const mem of memories) {
      if (mem.action === 'create') {
        const embedding = await this.embeddingService.generateEmbedding(tenantId, mem.content)
        await getUserMemoryDelegate(this.prisma).create({
          data: {
            tenantId,
            userId,
            content: mem.content,
            category: mem.category,
            embedding,
            sourceType: 'chat_thread',
            sourceId: threadId,
            sourceLabel: 'Chat Thread',
          },
        })
      } else if (mem.action === 'update' && mem.existingMemoryId) {
        const embedding = await this.embeddingService.generateEmbedding(tenantId, mem.content)
        await getUserMemoryDelegate(this.prisma).update({
          where: { id: mem.existingMemoryId },
          data: {
            content: mem.content,
            category: mem.category,
            embedding,
            sourceType: 'chat_thread',
            sourceId: threadId,
            sourceLabel: 'Chat Thread (updated)',
          },
        })
      } else if (mem.action === 'delete' && mem.existingMemoryId) {
        await getUserMemoryDelegate(this.prisma).update({
          where: { id: mem.existingMemoryId },
          data: { isDeleted: true },
        })
      }
    }
  }

  private async resolveConfig(tenantId: string): Promise<Record<string, unknown> | null> {
    const fixedConfig = await this.connectorsService.getDecryptedConfig(tenantId, 'llm_apis')
    if (fixedConfig) return fixedConfig

    const enabledConfigs = await this.llmConnectorsService.getEnabledConfigs(tenantId)
    const first = enabledConfigs.at(0)
    return first?.config ?? null
  }
}
