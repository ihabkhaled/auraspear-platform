jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}))

import { BusinessException } from '../../../../common/exceptions/business.exception'
import { toDay } from '../../../../common/utils/date-time.utility'
import { UserMemoryService } from '../user-memory.service'
import type { PrismaService } from '../../../../prisma/prisma.service'
import type { EmbeddingService } from '../embedding.service'

const mockPrisma = {
  userMemory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
} as unknown as PrismaService

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
    service = new UserMemoryService(mockPrisma, mockEmbeddingService)
  })

  describe('listMemories', () => {
    it('should return data and total', async () => {
      const memories = [baseMemory]
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue(memories)
      ;(mockPrisma.userMemory.count as jest.Mock).mockResolvedValue(1)

      const result = await service.listMemories(TENANT_ID, USER_ID)

      expect(result).toEqual({ data: memories, total: 1 })
      expect(mockPrisma.userMemory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, userId: USER_ID, isDeleted: false },
          take: 50,
          skip: 0,
        })
      )
    })

    it('should apply category filter', async () => {
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.userMemory.count as jest.Mock).mockResolvedValue(0)

      await service.listMemories(TENANT_ID, USER_ID, { category: 'preference' })

      expect(mockPrisma.userMemory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'preference' }),
        })
      )
    })

    it('should apply search filter', async () => {
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.userMemory.count as jest.Mock).mockResolvedValue(0)

      await service.listMemories(TENANT_ID, USER_ID, { search: 'dark' })

      expect(mockPrisma.userMemory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: { contains: 'dark', mode: 'insensitive' },
          }),
        })
      )
    })

    it('should apply limit and offset', async () => {
      ;(mockPrisma.userMemory.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.userMemory.count as jest.Mock).mockResolvedValue(0)

      await service.listMemories(TENANT_ID, USER_ID, { limit: 10, offset: 20 })

      expect(mockPrisma.userMemory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 20 })
      )
    })
  })

  describe('createMemory', () => {
    it('should generate embedding and create in DB', async () => {
      const embedding = [0.4, 0.5, 0.6]
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(embedding)
      ;(mockPrisma.userMemory.create as jest.Mock).mockResolvedValue({
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
      expect(mockPrisma.userMemory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          userId: USER_ID,
          content: 'User prefers dark mode',
          category: 'preference',
          embedding,
          sourceType: 'user_edit',
        }),
      })
      expect(result.embedding).toEqual(embedding)
    })

    it('should default category to fact when not provided', async () => {
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.userMemory.create as jest.Mock).mockResolvedValue(baseMemory)

      await service.createMemory(TENANT_ID, USER_ID, { content: 'Some fact' })

      expect(mockPrisma.userMemory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ category: 'fact' }),
      })
    })
  })

  describe('updateMemory', () => {
    it('should regenerate embedding when content changes', async () => {
      const newEmbedding = [0.7, 0.8, 0.9]
      ;(mockPrisma.userMemory.findUnique as jest.Mock).mockResolvedValue(baseMemory)
      ;(mockEmbeddingService.generateEmbedding as jest.Mock).mockResolvedValue(newEmbedding)
      ;(mockPrisma.userMemory.update as jest.Mock).mockResolvedValue({
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
      expect(mockPrisma.userMemory.update).toHaveBeenCalledWith({
        where: { id: MEMORY_ID },
        data: expect.objectContaining({ embedding: newEmbedding }),
      })
    })

    it('should skip embedding regeneration when content is the same', async () => {
      ;(mockPrisma.userMemory.findUnique as jest.Mock).mockResolvedValue(baseMemory)
      ;(mockPrisma.userMemory.update as jest.Mock).mockResolvedValue(baseMemory)

      await service.updateMemory(TENANT_ID, USER_ID, MEMORY_ID, {
        content: baseMemory.content,
        category: 'fact',
      })

      expect(mockEmbeddingService.generateEmbedding).not.toHaveBeenCalled()
      expect(mockPrisma.userMemory.update).toHaveBeenCalledWith({
        where: { id: MEMORY_ID },
        data: expect.objectContaining({ embedding: baseMemory.embedding }),
      })
    })
  })

  describe('deleteMemory', () => {
    it('should soft delete the memory', async () => {
      ;(mockPrisma.userMemory.findUnique as jest.Mock).mockResolvedValue(baseMemory)
      ;(mockPrisma.userMemory.update as jest.Mock).mockResolvedValue({
        ...baseMemory,
        isDeleted: true,
      })

      await service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)

      expect(mockPrisma.userMemory.update).toHaveBeenCalledWith({
        where: { id: MEMORY_ID },
        data: { isDeleted: true },
      })
    })

    it('should throw 404 when memory is not found', async () => {
      ;(mockPrisma.userMemory.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.deleteMemory(TENANT_ID, USER_ID, 'nonexistent-id')).rejects.toThrow(
        BusinessException
      )

      await expect(
        service.deleteMemory(TENANT_ID, USER_ID, 'nonexistent-id')
      ).rejects.toMatchObject({ status: 404 })
    })

    it('should throw 403 when tenant does not match', async () => {
      ;(mockPrisma.userMemory.findUnique as jest.Mock).mockResolvedValue({
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
      ;(mockPrisma.userMemory.findUnique as jest.Mock).mockResolvedValue({
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
      ;(mockPrisma.userMemory.updateMany as jest.Mock).mockResolvedValue({ count: 5 })

      const result = await service.deleteAllMemories(TENANT_ID, USER_ID)

      expect(result).toBe(5)
      expect(mockPrisma.userMemory.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: USER_ID, isDeleted: false },
        data: { isDeleted: true },
      })
    })

    it('should return 0 when no memories exist', async () => {
      ;(mockPrisma.userMemory.updateMany as jest.Mock).mockResolvedValue({ count: 0 })

      const result = await service.deleteAllMemories(TENANT_ID, USER_ID)

      expect(result).toBe(0)
    })
  })

  describe('verifyOwnership', () => {
    it('should throw 404 for deleted memory', async () => {
      ;(mockPrisma.userMemory.findUnique as jest.Mock).mockResolvedValue({
        ...baseMemory,
        isDeleted: true,
      })

      // verifyOwnership is private, test via deleteMemory
      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toMatchObject({
        status: 404,
      })
    })

    it('should throw 403 for wrong tenant', async () => {
      ;(mockPrisma.userMemory.findUnique as jest.Mock).mockResolvedValue({
        ...baseMemory,
        tenantId: 'wrong-tenant',
      })

      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toMatchObject({
        status: 403,
      })
    })

    it('should throw 403 for wrong user', async () => {
      ;(mockPrisma.userMemory.findUnique as jest.Mock).mockResolvedValue({
        ...baseMemory,
        userId: 'wrong-user',
      })

      await expect(service.deleteMemory(TENANT_ID, USER_ID, MEMORY_ID)).rejects.toMatchObject({
        status: 403,
      })
    })
  })
})
