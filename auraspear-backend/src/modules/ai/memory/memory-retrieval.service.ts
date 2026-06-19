import { Injectable, Logger } from '@nestjs/common'
import { EmbeddingService } from './embedding.service'
import { getUserMemoryDelegate } from './memory.types'
import { PrismaService } from '../../../prisma/prisma.service'
import type { RetrievedMemory } from './memory.types'

@Injectable()
export class MemoryRetrievalService {
  private readonly logger = new Logger(MemoryRetrievalService.name)
  private readonly topN = 10
  private readonly similarityThreshold = 0.3

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService
  ) {}

  async retrieveRelevant(
    tenantId: string,
    userId: string,
    query: string,
    limit: number = this.topN
  ): Promise<RetrievedMemory[]> {
    let queryEmbedding: number[] = []
    try {
      queryEmbedding = await this.embeddingService.generateEmbedding(tenantId, query)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.warn(`Embedding generation failed, falling back to recent: ${message}`)
    }

    if (queryEmbedding.length === 0) {
      // Fallback: return most recent memories if embeddings unavailable
      return this.fallbackRecentMemories(tenantId, userId, limit)
    }

    // Fetch all non-deleted memories for this user
    const memories = await getUserMemoryDelegate(this.prisma).findMany({
      where: { tenantId, userId, isDeleted: false },
    })

    if (memories.length === 0) return []

    // Compute cosine similarity in-memory
    const scored: RetrievedMemory[] = []
    for (const mem of memories) {
      const similarity =
        mem.embedding.length > 0 ? this.cosineSimilarity(queryEmbedding, mem.embedding) : 0
      if (similarity >= this.similarityThreshold) {
        scored.push({ id: mem.id, content: mem.content, category: mem.category, similarity })
      }
    }
    scored.sort((a, b) => b.similarity - a.similarity)
    const topResults = scored.slice(0, limit)

    this.logger.log(
      `Retrieved ${String(topResults.length)} relevant memories for user ${userId} (query: ${query.substring(0, 50)}...)`
    )

    return topResults
  }

  async formatForPrompt(
    tenantId: string,
    userId: string,
    query: string,
    maxTokens: number = 1000
  ): Promise<string | null> {
    const memories = await this.retrieveRelevant(tenantId, userId, query)
    if (memories.length === 0) return null

    const lines: string[] = []
    let estimatedTokens = 0

    for (const mem of memories) {
      const line = `- [${mem.category}] ${mem.content}`
      const lineTokens = Math.ceil(line.length / 4) // rough estimate
      if (estimatedTokens + lineTokens > maxTokens) break
      lines.push(line)
      estimatedTokens += lineTokens
    }

    if (lines.length === 0) return null

    return `The following are facts and preferences you remember about this user from previous conversations. Use them naturally to personalize your response, but do not explicitly mention that you are using stored memories unless asked:\n${lines.join('\n')}`
  }

  private async fallbackRecentMemories(
    tenantId: string,
    userId: string,
    limit: number
  ): Promise<RetrievedMemory[]> {
    const memories = await getUserMemoryDelegate(this.prisma).findMany({
      where: { tenantId, userId, isDeleted: false },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    })

    return memories.map(m => ({
      id: m.id,
      content: m.content,
      category: m.category,
      similarity: 1,
    }))
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0

    let dotProduct = 0
    let normA = 0
    let normB = 0

    for (let index = 0; index < a.length; index++) {
      const ai = a[index] ?? 0
      const bi = b[index] ?? 0
      dotProduct += ai * bi
      normA += ai * ai
      normB += bi * bi
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    if (denominator === 0) return 0

    return dotProduct / denominator
  }
}
