jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}))

import { MemoryRetrievalService } from '../memory-retrieval.service'
import type { PrismaService } from '../../../../prisma/prisma.service'
import type { EmbeddingService } from '../embedding.service'

const mockPrisma = {
  userMemory: {
    findMany: jest.fn(),
  },
} as unknown as PrismaService

const mockEmbeddingService = {
  generateEmbedding: jest.fn(),
} as unknown as EmbeddingService

const TENANT_ID = 'tenant-001'
const USER_ID = 'user-001'

// Helper to create a normalized embedding vector
function normalizedVector(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0))
  return norm > 0 ? values.map(v => v / norm) : values
}

describe('MemoryRetrievalService', () => {
  let service: MemoryRetrievalService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new MemoryRetrievalService(mockPrisma, mockEmbeddingService)
  })

  describe('retrieveRelevant', () => {
    it('should return empty array when no memories exist', async () => {
      const queryEmb = normalizedVector([1, 0, 0])
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(queryEmb)
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.retrieveRelevant(TENANT_ID, USER_ID, 'test query')

      expect(result).toEqual([])
    })

    it('should compute cosine similarity and return scored memories', async () => {
      const queryEmb = normalizedVector([1, 0, 0])
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(queryEmb)

      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mem-1',
          content: 'High similarity memory',
          category: 'fact',
          embedding: normalizedVector([1, 0.1, 0]),
        },
        {
          id: 'mem-2',
          content: 'Low similarity memory',
          category: 'fact',
          embedding: normalizedVector([0, 1, 0]),
        },
      ])

      const result = await service.retrieveRelevant(TENANT_ID, USER_ID, 'test query')

      // mem-1 should have high similarity (close to 1), mem-2 very low (close to 0)
      expect(result.length).toBeGreaterThanOrEqual(1)
      const first = result.at(0)
      expect(first).toBeDefined()
      expect(first?.id).toBe('mem-1')
      expect(first?.similarity).toBeGreaterThan(0.3)
    })

    it('should filter out memories below similarity threshold', async () => {
      const queryEmb = normalizedVector([1, 0, 0])
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(queryEmb)

      // Orthogonal vector has 0 similarity
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mem-low',
          content: 'Irrelevant memory',
          category: 'fact',
          embedding: normalizedVector([0, 1, 0]),
        },
      ])

      const result = await service.retrieveRelevant(TENANT_ID, USER_ID, 'test query')

      expect(result).toEqual([])
    })

    it('should sort by relevance descending', async () => {
      const queryEmb = normalizedVector([1, 0, 0])
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(queryEmb)

      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mem-medium',
          content: 'Medium similarity',
          category: 'fact',
          embedding: normalizedVector([0.7, 0.7, 0]),
        },
        {
          id: 'mem-high',
          content: 'High similarity',
          category: 'fact',
          embedding: normalizedVector([1, 0.1, 0]),
        },
      ])

      const result = await service.retrieveRelevant(TENANT_ID, USER_ID, 'test query')

      expect(result.length).toBe(2)
      const first = result.at(0)
      const second = result.at(1)
      expect(first?.id).toBe('mem-high')
      expect(second?.id).toBe('mem-medium')
      expect(first?.similarity).toBeGreaterThan(second?.similarity ?? 0)
    })

    it('should respect limit parameter', async () => {
      const queryEmb = normalizedVector([1, 0, 0])
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(queryEmb)

      const memories = Array.from({ length: 5 }, (_, index) => ({
        id: `mem-${String(index)}`,
        content: `Memory ${String(index)}`,
        category: 'fact',
        embedding: normalizedVector([1, 0.1 * (index + 1), 0]),
      }))
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue(memories)

      const result = await service.retrieveRelevant(TENANT_ID, USER_ID, 'test query', 2)

      expect(result.length).toBeLessThanOrEqual(2)
    })

    it('should fallback to recent memories when embedding is empty', async () => {
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue([])

      const recentMemories = [
        { id: 'recent-1', content: 'Recent fact', category: 'fact' },
        { id: 'recent-2', content: 'Recent pref', category: 'preference' },
      ]
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue(recentMemories)

      const result = await service.retrieveRelevant(TENANT_ID, USER_ID, 'test query')

      expect(mockPrisma.userMemory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, userId: USER_ID, isDeleted: false },
          orderBy: { updatedAt: 'desc' },
        })
      )
      expect(result.length).toBe(2)
      const first = result.at(0)
      expect(first?.similarity).toBe(1)
    })
  })

  describe('formatForPrompt', () => {
    it('should return null when no memories match', async () => {
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(
        normalizedVector([1, 0, 0])
      )
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue([])

      const result = await service.formatForPrompt(TENANT_ID, USER_ID, 'test query')

      expect(result).toBeNull()
    })

    it('should format memories as bullet list with categories', async () => {
      const queryEmb = normalizedVector([1, 0, 0])
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(queryEmb)

      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'mem-1',
          content: 'User likes Python',
          category: 'preference',
          embedding: normalizedVector([1, 0.05, 0]),
        },
      ])

      const result = await service.formatForPrompt(TENANT_ID, USER_ID, 'test query')

      expect(result).not.toBeNull()
      expect(result).toContain('- [preference] User likes Python')
      expect(result).toContain('facts and preferences you remember')
    })

    it('should respect maxTokens limit', async () => {
      const queryEmb = normalizedVector([1, 0, 0])
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(queryEmb)

      // Create memories with long content
      const memories = Array.from({ length: 20 }, (_, index) => ({
        id: `mem-${String(index)}`,
        content: 'A'.repeat(200),
        category: 'fact',
        embedding: normalizedVector([1, 0.01 * (index + 1), 0]),
      }))
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue(memories)

      // Very small token budget
      const result = await service.formatForPrompt(TENANT_ID, USER_ID, 'test query', 100)

      // Should not include all 20 memories due to token budget
      if (result) {
        const bulletCount = (result.match(/^- \[/gm) ?? []).length
        expect(bulletCount).toBeLessThan(20)
      }
    })
  })
})
