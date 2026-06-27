import { UserMemoryService } from '../../src/modules/ai/memory/user-memory.service'
import type { UserMemoryRepository } from '../../src/modules/ai/memory/user-memory.repository'

/* ── Mock factories ─────────────────────────────────── */

function createMockRepository(): jest.Mocked<UserMemoryRepository> {
  return {
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
  } as unknown as jest.Mocked<UserMemoryRepository>
}

function createMockEmbeddingService() {
  return {
    generateEmbedding: jest.fn(),
  }
}

function buildMemoryRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'mem-001',
    tenantId: 'tenant-001',
    userId: 'user-001',
    content: 'User prefers dark mode',
    category: 'preference',
    embedding: [0.1, 0.2, 0.3],
    sourceType: 'extraction',
    sourceId: null,
    sourceLabel: null,
    isDeleted: false,
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-01-20'),
    ...overrides,
  }
}

function buildRetentionPolicy(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rp-001',
    tenantId: 'tenant-001',
    retentionDays: 90,
    autoCleanup: true,
    lastCleanupAt: null,
    lastCleanupCount: 0,
    createdBy: 'admin-001',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

/* ── Tests ───────────────────────────────────────────── */

describe('UserMemoryService — Governance methods', () => {
  const TENANT_ID = 'tenant-001'
  const USER_ID = 'user-001'

  let mockRepository: jest.Mocked<UserMemoryRepository>
  let embeddingService: ReturnType<typeof createMockEmbeddingService>
  let service: UserMemoryService

  beforeEach(() => {
    mockRepository = createMockRepository()
    embeddingService = createMockEmbeddingService()
    service = new UserMemoryService(mockRepository, embeddingService as never)
    jest.clearAllMocks()
  })

  /* ── listAllMemories ──────────────────────────────── */

  describe('listAllMemories', () => {
    it('returns paginated cross-user results', async () => {
      const memories = [
        buildMemoryRecord(),
        buildMemoryRecord({ id: 'mem-002', userId: 'user-002' }),
      ]
      mockRepository.findMemories.mockResolvedValue(memories)
      mockRepository.countMemories.mockResolvedValue(2)

      const result = await service.listAllMemories(TENANT_ID, { limit: 10, offset: 0 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(mockRepository.findMemories).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID, isDeleted: false }),
        10,
        0
      )
    })

    it('filters by userId, category, and search', async () => {
      mockRepository.findMemories.mockResolvedValue([])
      mockRepository.countMemories.mockResolvedValue(0)

      await service.listAllMemories(TENANT_ID, {
        userId: USER_ID,
        category: 'preference',
        search: 'dark',
      })

      expect(mockRepository.findMemories).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          isDeleted: false,
          userId: USER_ID,
          category: 'preference',
          content: { contains: 'dark', mode: 'insensitive' },
        }),
        50,
        0
      )
    })

    it('uses default limit=50 and offset=0 when not provided', async () => {
      mockRepository.findMemories.mockResolvedValue([])
      mockRepository.countMemories.mockResolvedValue(0)

      await service.listAllMemories(TENANT_ID)

      expect(mockRepository.findMemories).toHaveBeenCalledWith(expect.any(Object), 50, 0)
    })
  })

  /* ── getMemoryStats ───────────────────────────────── */

  describe('getMemoryStats', () => {
    it('returns correct stat aggregation', async () => {
      mockRepository.countActiveMemories.mockResolvedValue(100)
      mockRepository.countDeletedMemories.mockResolvedValue(25)
      mockRepository.fetchStatsByCategory.mockResolvedValue([
        { category: 'fact', count: BigInt(60) },
        { category: 'preference', count: BigInt(40) },
      ])
      mockRepository.fetchStatsByUser.mockResolvedValue([
        { user_id: 'user-001', count: BigInt(50) },
        { user_id: 'user-002', count: BigInt(50) },
      ])

      const result = await service.getMemoryStats(TENANT_ID)

      expect(result.totalActive).toBe(100)
      expect(result.totalDeleted).toBe(25)
      expect(result.byCategory).toEqual([
        { category: 'fact', count: 60 },
        { category: 'preference', count: 40 },
      ])
      expect(result.byUser).toEqual([
        { userId: 'user-001', count: 50 },
        { userId: 'user-002', count: 50 },
      ])
      expect(result.uniqueUsers).toBe(2)
    })

    it('returns zero counts when no data exists', async () => {
      mockRepository.countActiveMemories.mockResolvedValue(0)
      mockRepository.countDeletedMemories.mockResolvedValue(0)
      mockRepository.fetchStatsByCategory.mockResolvedValue([])
      mockRepository.fetchStatsByUser.mockResolvedValue([])

      const result = await service.getMemoryStats(TENANT_ID)

      expect(result.totalActive).toBe(0)
      expect(result.totalDeleted).toBe(0)
      expect(result.byCategory).toEqual([])
      expect(result.byUser).toEqual([])
      expect(result.uniqueUsers).toBe(0)
    })
  })

  /* ── exportMemories ───────────────────────────────── */

  describe('exportMemories', () => {
    it('returns all non-deleted memories', async () => {
      const memories = [buildMemoryRecord(), buildMemoryRecord({ id: 'mem-002' })]
      mockRepository.findManyForExport.mockResolvedValue(memories)

      const result = await service.exportMemories(TENANT_ID)

      expect(result).toHaveLength(2)
      expect(mockRepository.findManyForExport).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID, isDeleted: false })
      )
    })

    it('filters by userId when provided', async () => {
      mockRepository.findManyForExport.mockResolvedValue([buildMemoryRecord()])

      await service.exportMemories(TENANT_ID, USER_ID)

      expect(mockRepository.findManyForExport).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: TENANT_ID, isDeleted: false, userId: USER_ID })
      )
    })
  })

  /* ── getRetentionPolicy ───────────────────────────── */

  describe('getRetentionPolicy', () => {
    it('returns policy when it exists', async () => {
      const policy = buildRetentionPolicy()
      mockRepository.findRetentionPolicy.mockResolvedValue(policy)

      const result = await service.getRetentionPolicy(TENANT_ID)

      expect(result).toEqual(policy)
      expect(mockRepository.findRetentionPolicy).toHaveBeenCalledWith(TENANT_ID)
    })

    it('returns null when no policy exists', async () => {
      mockRepository.findRetentionPolicy.mockResolvedValue(null)

      const result = await service.getRetentionPolicy(TENANT_ID)

      expect(result).toBeNull()
    })
  })

  /* ── upsertRetentionPolicy ────────────────────────── */

  describe('upsertRetentionPolicy', () => {
    it('creates or updates policy', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 60 })
      mockRepository.upsertRetentionPolicy.mockResolvedValue(policy)

      const result = await service.upsertRetentionPolicy(
        TENANT_ID,
        { retentionDays: 60, autoCleanup: true },
        'admin-001'
      )

      expect(result).toEqual(policy)
      expect(mockRepository.upsertRetentionPolicy).toHaveBeenCalledWith(TENANT_ID, {
        retentionDays: 60,
        autoCleanup: true,
        createdBy: 'admin-001',
      })
    })
  })

  /* ── cleanupExpiredMemories ───────────────────────── */

  describe('cleanupExpiredMemories', () => {
    it('soft-deletes expired memories and updates policy lastCleanup', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 30, autoCleanup: true })
      mockRepository.findRetentionPolicy.mockResolvedValue(policy)
      mockRepository.softDeleteExpiredMemories.mockResolvedValue({ count: 5 })
      mockRepository.updateRetentionPolicyCleanupTimestamp.mockResolvedValue(policy)

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(5)
      expect(mockRepository.softDeleteExpiredMemories).toHaveBeenCalledWith(
        TENANT_ID,
        expect.any(Date)
      )
      expect(mockRepository.updateRetentionPolicyCleanupTimestamp).toHaveBeenCalledWith(
        TENANT_ID,
        5
      )
    })

    it('returns 0 when no policy exists', async () => {
      mockRepository.findRetentionPolicy.mockResolvedValue(null)

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(0)
      expect(mockRepository.softDeleteExpiredMemories).not.toHaveBeenCalled()
    })

    it('returns 0 when retentionDays is 0', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 0, autoCleanup: true })
      mockRepository.findRetentionPolicy.mockResolvedValue(policy)

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(0)
      expect(mockRepository.softDeleteExpiredMemories).not.toHaveBeenCalled()
    })

    it('returns 0 when autoCleanup is disabled', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 90, autoCleanup: false })
      mockRepository.findRetentionPolicy.mockResolvedValue(policy)

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(0)
      expect(mockRepository.softDeleteExpiredMemories).not.toHaveBeenCalled()
    })

    it('does not update policy when no memories were cleaned', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 30, autoCleanup: true })
      mockRepository.findRetentionPolicy.mockResolvedValue(policy)
      mockRepository.softDeleteExpiredMemories.mockResolvedValue({ count: 0 })

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(0)
      expect(mockRepository.updateRetentionPolicyCleanupTimestamp).not.toHaveBeenCalled()
    })
  })

  /* ── adminDeleteUserMemories ──────────────────────── */

  describe('adminDeleteUserMemories', () => {
    it('soft-deletes all user memories and returns count', async () => {
      mockRepository.softDeleteManyMemories.mockResolvedValue({ count: 12 })

      const result = await service.adminDeleteUserMemories(TENANT_ID, USER_ID)

      expect(result).toBe(12)
      expect(mockRepository.softDeleteManyMemories).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        userId: USER_ID,
        isDeleted: false,
      })
    })

    it('returns 0 when user has no active memories', async () => {
      mockRepository.softDeleteManyMemories.mockResolvedValue({ count: 0 })

      const result = await service.adminDeleteUserMemories(TENANT_ID, USER_ID)

      expect(result).toBe(0)
    })
  })
})
