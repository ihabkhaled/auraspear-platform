jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}))

import { BusinessException } from '../../../../common/exceptions/business.exception'
import { toDay } from '../../../../common/utils/date-time.utility'
import { UserMemoryService } from '../user-memory.service'
import type { UserMemoryRepository } from '../user-memory.repository'
import type { EmbeddingService } from '../embedding.service'

const mockRepository = {
  findMemories: jest.fn(),
  countMemories: jest.fn(),
  createMemory: jest.fn(),
  findMemoryById: jest.fn(),
  updateMemory: jest.fn(),
  softDeleteMemory: jest.fn(),
  softDeleteManyMemories: jest.fn(),
  countActiveMemories: jest.fn(),
  countDeletedMemories: jest.fn(),
  fetchStatsByCategory: jest.fn(),
  fetchStatsByUser: jest.fn(),
  findManyForExport: jest.fn(),
  findRetentionPolicy: jest.fn(),
  upsertRetentionPolicy: jest.fn(),
  updateRetentionPolicyCleanupTimestamp: jest.fn(),
  softDeleteExpiredMemories: jest.fn(),
} as unknown as UserMemoryRepository

const mockEmbeddingService = {
  generateEmbedding: jest.fn(),
} as unknown as EmbeddingService

const TENANT_ID = 'tenant-001'
const USER_ID = 'user-001'
const MEMORY_ID = 'memory-001'

const baseMemory = {
  id: MEMORY_ID,
  tenantId: TENANT_ID,
  userId: USER_ID,
  content: 'User prefers dark mode',
  category: 'preference',
  embedding: [0.1, 0.2, 0.3],
  sourceType: 'user_edit',
  sourceId: null,
  sourceLabel: null,
  isDeleted: false,
  createdAt: toDay('2026-01-01T00:00:00.000Z').toDate(),
  updatedAt: toDay('2026-01-01T00:00:00.000Z').toDate(),
}

describe('UserMemoryService', () => {
  let service: UserMemoryService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new UserMemoryService(mockRepository, mockEmbeddingService)
  })

  describe('listMemories', () => {
    it('should return data and total', async () => {
      const memories = [baseMemory]
      ;(mockRepository.findMemories as jest.Mock).mockResolvedValue(memories)
      ;(mockRepository.countMemories as jest.Mock).mockResolvedValue(1)

      const result = await service.listMemories(TENANT_ID, USER_ID)

      expect(result).toEqual({ data: memories, total: 1 })
      expect(mockRepository.findMemories).toHaveBeenCalledWith(
        { tenantId: TENANT_ID, userId: USER_ID, isDeleted: false },
        50,
        0
      )
    })

    it('should apply category filter', async () => {
      ;(mockRepository.findMemories as jest.Mock).mockResolvedValue([])
      ;(mockRepository.countMemories as jest.Mock).mockResolvedValue(0)

      await service.listMemories(TENANT_ID, USER_ID, { category: 'preference' })

      expect(mockRepository.findMemories).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'preference' }),
        50,
        0
      )
    })

    it('should apply search filter', async () => {
      ;(mockRepository.findMemories as jest.Mock).mockResolvedValue([])
      ;(mockRepository.countMemories as jest.Mock).mockResolvedValue(0)

      await service.listMemories(TENANT_ID, USER_ID, { search: 'dark' })

      expect(mockRepository.findMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          content: { contains: 'dark', mode: 'insensitive' },
        }),
        50,
        0
      )
    })

    it('should apply limit and offset', async () => {
      ;(mockRepository.findMemories as jest.Mock).mockResolvedValue([])
      ;(mockRepository.countMemories as jest.Mock).mockResolvedValue(0)

      await service.listMemories(TENANT_ID, USER_ID, { limit: 10, offset: 20 })

      expect(mockRepository.findMemories).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID }),
        10,
        20
      )
    })
  })

  describe('createMemory', () => {
    it('should generate embedding and create in DB', async () => {
      const embedding = [0.4, 0.5, 0.6]
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(embedding)
      ;(mockRepository.createMemory as jest.Mock).mockResolvedValue({
        ...baseMemory,
        embedding,
      })

      const result = await service.createMemory(TENANT_ID, USER_ID, {
        content: 'User prefers dark mode',
        category: 'preference',
      })

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        TENANT_ID,
        'User prefers dark mode'
      )
      expect(mockRepository.createMemory).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({
          userId: USER_ID,
          content: 'User prefers dark mode',
          category: 'preference',
          embedding,
          sourceType: 'user_edit',
        })
      )
      expect(result.embedding).toEqual(embedding)
    })

    it('should default category to fact when not provided', async () => {
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue([])
      ;(mockRepository.createMemory as jest.Mock).mockResolvedValue(baseMemory)

      await service.createMemory(TENANT_ID, USER_ID, { content: 'Some fact' })

      expect(mockRepository.createMemory).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ category: 'fact' })
      )
    })
  })

  describe('updateMemory', () => {
    it('should regenerate embedding when content changes', async () => {
      const newEmbedding = [0.7, 0.8, 0.9]
      ;(mockRepository.findMemoryById as jest.Mock).mockResolvedValue(baseMemory)
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(newEmbedding)
      ;(mockRepository.updateMemory as jest.Mock).mockResolvedValue({
        ...baseMemory,
        content: 'User prefers light mode',
        embedding: newEmbedding,
      })

      await service.updateMemory(TENANT_ID, USER_ID, MEMORY_ID, {
        content: 'User prefers light mode',
      })

      expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
        TENANT_ID,
        'User prefers light mode'
      )
      expect(mockRepository.updateMemory).toHaveBeenCalledWith(
        MEMORY_ID,
        expect.objectContaining({ embedding: newEmbedding })
      )
    })

    it('should skip embedding regeneration when content is the same', async () => {
      ;(mockRepository.findMemoryById as jest.Mock).mockResolvedValue(baseMemory)
      ;(mockRepository.updateMemory as jest.Mock).mockResolvedValue(baseMemory)

      await service.updateMemory(TENANT_ID, USER_ID, MEMORY_ID, {
        content: baseMemory.content,
        category: 'fact',
      })

      expect(mockEmbeddingService.generateEmbedding).not.toHaveBeenCalled()
      expect(mockRepository.updateMemory).toHaveBeenCalledWith(
        MEMORY_ID,
        expect.objectContaining({ embedding: baseMemory.embedding })
      )
    })
  })

  describe('deleteMemory', () => {
    it('should soft delete the memory', async () => {
      ;(mockRepository.findMemoryById as jest.Mock).mockResolvedValue(baseMemory)
      ;(mockRepository.softDeleteMemory as jest.Mock).mockResolvedValue({
        ...baseMemory,
        isDeleted: true,
      })

      await service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)

      expect(mockRepository.softDeleteMemory).toHaveBeenCalledWith(MEMORY_ID)
    })

    it('should throw 404 when memory is not found', async () => {
      ;(mockRepository.findMemoryById as jest.Mock).mockResolvedValue(null)

      await expect(service.deleteMemory(TENANT_ID, USER_ID, 'nonexistent-id')).rejects.toThrow(
        BusinessException
      )

      await expect(
        service.deleteMemory(TENANT_ID, USER_ID, 'nonexistent-id')
      ).rejects.toMatchObject({ status: 404 })
    })

    it('should throw 403 when tenant does not match', async () => {
      ;(mockRepository.findMemoryById as jest.Mock).mockResolvedValue({
        ...baseMemory,
        tenantId: 'other-tenant',
      })

      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toThrow(
        BusinessException
      )

      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toMatchObject({
        status: 403,
      })
    })

    it('should throw 403 when user does not match', async () => {
      ;(mockRepository.findMemoryById as jest.Mock).mockResolvedValue({
        ...baseMemory,
        userId: 'other-user',
      })

      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toThrow(
        BusinessException
      )

      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toMatchObject({
        status: 403,
      })
    })
  })

  describe('deleteAllMemories', () => {
    it('should soft delete all memories and return count', async () => {
      ;(mockRepository.softDeleteManyMemories as jest.Mock).mockResolvedValue({ count: 5 })

      const result = await service.deleteAllMemories(TENANT_ID, USER_ID)

      expect(result).toBe(5)
      expect(mockRepository.softDeleteManyMemories).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        userId: USER_ID,
        isDeleted: false,
      })
    })

    it('should return 0 when no memories exist', async () => {
      ;(mockRepository.softDeleteManyMemories as jest.Mock).mockResolvedValue({ count: 0 })

      const result = await service.deleteAllMemories(TENANT_ID, USER_ID)

      expect(result).toBe(0)
    })
  })

  describe('verifyOwnership', () => {
    it('should throw 404 for deleted memory', async () => {
      ;(mockRepository.findMemoryById as jest.Mock).mockResolvedValue({
        ...baseMemory,
        isDeleted: true,
      })

      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toMatchObject({
        status: 404,
      })
    })

    it('should throw 403 for wrong tenant', async () => {
      ;(mockRepository.findMemoryById as jest.Mock).mockResolvedValue({
        ...baseMemory,
        tenantId: 'wrong-tenant',
      })

      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toMatchObject({
        status: 403,
      })
    })

    it('should throw 403 for wrong user', async () => {
      ;(mockRepository.findMemoryById as jest.Mock).mockResolvedValue({
        ...baseMemory,
        userId: 'wrong-user',
      })

      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toMatchObject({
        status: 403,
      })
    })
  })
})
