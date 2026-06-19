jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(),
}))

import { Test } from '@nestjs/testing'
import { AuthGuard } from '../../../../common/guards/auth.guard'
import { TenantGuard } from '../../../../common/guards/tenant.guard'
import { toDay } from '../../../../common/utils/date-time.utility'
import { UserMemoryController } from '../user-memory.controller'
import { UserMemoryService } from '../user-memory.service'

const mockMemoryService = {
  listMemories: jest.fn(),
  createMemory: jest.fn(),
  updateMemory: jest.fn(),
  deleteMemory: jest.fn(),
  deleteAllMemories: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const USER_ID = 'user-001'
const MEMORY_ID = 'memory-001'

const mockUser = { sub: USER_ID, tenantId: TENANT_ID, role: 'analyst' }

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

describe('UserMemoryController', () => {
  let controller: UserMemoryController

  beforeEach(async () => {
    jest.clearAllMocks()

    const module = await Test.createTestingModule({
      controllers: [UserMemoryController],
      providers: [{ provide: UserMemoryService, useValue: mockMemoryService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(TenantGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<UserMemoryController>(UserMemoryController)
  })

  describe('listMemories', () => {
    it('should parse query params and call service', async () => {
      const expected = { data: [baseMemory], total: 1 }
      mockMemoryService.listMemories.mockResolvedValue(expected)

      const result = await controller.listMemories(
        TENANT_ID,
        mockUser as never,
        'preference',
        'dark',
        '20',
        '5'
      )

      expect(result).toEqual(expected)
      expect(mockMemoryService.listMemories).toHaveBeenCalledWith(TENANT_ID, USER_ID, {
        category: 'preference',
        search: 'dark',
        limit: 20,
        offset: 5,
      })
    })

    it('should clamp limit to 100', async () => {
      mockMemoryService.listMemories.mockResolvedValue({ data: [], total: 0 })

      await controller.listMemories(TENANT_ID, mockUser as never, undefined, undefined, '999', '0')

      expect(mockMemoryService.listMemories).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        expect.objectContaining({ limit: 100 })
      )
    })

    it('should default limit to 50 and offset to 0', async () => {
      mockMemoryService.listMemories.mockResolvedValue({ data: [], total: 0 })

      await controller.listMemories(
        TENANT_ID,
        mockUser as never,
        undefined,
        undefined,
        undefined,
        undefined
      )

      expect(mockMemoryService.listMemories).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        expect.objectContaining({ limit: 50, offset: 0 })
      )
    })

    it('should clamp limit minimum to 1', async () => {
      mockMemoryService.listMemories.mockResolvedValue({ data: [], total: 0 })

      await controller.listMemories(TENANT_ID, mockUser as never, undefined, undefined, '-5', '0')

      expect(mockMemoryService.listMemories).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        expect.objectContaining({ limit: 1 })
      )
    })
  })

  describe('createMemory', () => {
    it('should pass body to service', async () => {
      mockMemoryService.createMemory.mockResolvedValue(baseMemory)

      const body = { content: 'User prefers dark mode', category: 'preference' }
      const result = await controller.createMemory(TENANT_ID, mockUser as never, body)

      expect(result).toEqual(baseMemory)
      expect(mockMemoryService.createMemory).toHaveBeenCalledWith(TENANT_ID, USER_ID, body)
    })
  })

  describe('updateMemory', () => {
    it('should pass id and body to service', async () => {
      const updated = { ...baseMemory, content: 'Updated content' }
      mockMemoryService.updateMemory.mockResolvedValue(updated)

      const body = { content: 'Updated content', category: 'fact' }
      const result = await controller.updateMemory(TENANT_ID, mockUser as never, MEMORY_ID, body)

      expect(result).toEqual(updated)
      expect(mockMemoryService.updateMemory).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        MEMORY_ID,
        body
      )
    })
  })

  describe('deleteMemory', () => {
    it('should call service to delete', async () => {
      mockMemoryService.deleteMemory.mockResolvedValue(undefined)

      await controller.deleteMemory(TENANT_ID, mockUser as never, MEMORY_ID)

      expect(mockMemoryService.deleteMemory).toHaveBeenCalledWith(TENANT_ID, USER_ID, MEMORY_ID)
    })
  })

  describe('deleteAllMemories', () => {
    it('should call service and return count', async () => {
      mockMemoryService.deleteAllMemories.mockResolvedValue(3)

      const result = await controller.deleteAllMemories(TENANT_ID, mockUser as never)

      expect(result).toEqual({ deleted: 3 })
      expect(mockMemoryService.deleteAllMemories).toHaveBeenCalledWith(TENANT_ID, USER_ID)
    })

    it('should return zero when no memories exist', async () => {
      mockMemoryService.deleteAllMemories.mockResolvedValue(0)

      const result = await controller.deleteAllMemories(TENANT_ID, mockUser as never)

      expect(result).toEqual({ deleted: 0 })
    })
  })
})
