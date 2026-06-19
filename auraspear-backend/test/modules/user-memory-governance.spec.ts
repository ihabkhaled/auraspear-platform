import { UserMemoryService } from '../../src/modules/ai/memory/user-memory.service'

/* ── Mock factories ─────────────────────────────────── */

function createMockUserMemoryDelegate() {
  return {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  }
}

function createMockPrisma(userMemoryDelegate: ReturnType<typeof createMockUserMemoryDelegate>) {
  return {
    userMemory: userMemoryDelegate,
    memoryRetentionPolicy: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  }
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

  let userMemoryDelegate: ReturnType<typeof createMockUserMemoryDelegate>
  let prisma: ReturnType<typeof createMockPrisma>
  let embeddingService: ReturnType<typeof createMockEmbeddingService>
  let service: UserMemoryService

  beforeEach(() => {
    userMemoryDelegate = createMockUserMemoryDelegate()
    prisma = createMockPrisma(userMemoryDelegate)
    embeddingService = createMockEmbeddingService()
    service = new UserMemoryService(prisma as never, embeddingService as never)
    jest.clearAllMocks()
  })

  /* ── listAllMemories ──────────────────────────────── */

  describe('listAllMemories', () => {
    it('returns paginated cross-user results', async () => {
      const memories = [buildMemoryRecord(), buildMemoryRecord({ id: 'mem-002', userId: 'user-002' })]
      userMemoryDelegate.findMany.mockResolvedValue(memories)
      userMemoryDelegate.count.mockResolvedValue(2)

      const result = await service.listAllMemories(TENANT_ID, { limit: 10, offset: 0 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(userMemoryDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, isDeleted: false },
          take: 10,
          skip: 0,
        }),
      )
    })

    it('filters by userId, category, and search', async () => {
      userMemoryDelegate.findMany.mockResolvedValue([])
      userMemoryDelegate.count.mockResolvedValue(0)

      await service.listAllMemories(TENANT_ID, {
        userId: USER_ID,
        category: 'preference',
        search: 'dark',
      })

      expect(userMemoryDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            isDeleted: false,
            userId: USER_ID,
            category: 'preference',
            content: { contains: 'dark', mode: 'insensitive' },
          },
        }),
      )
    })

    it('uses default limit=50 and offset=0 when not provided', async () => {
      userMemoryDelegate.findMany.mockResolvedValue([])
      userMemoryDelegate.count.mockResolvedValue(0)

      await service.listAllMemories(TENANT_ID)

      expect(userMemoryDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50, skip: 0 }),
      )
    })
  })

  /* ── getMemoryStats ───────────────────────────────── */

  describe('getMemoryStats', () => {
    it('returns correct stat aggregation', async () => {
      userMemoryDelegate.count
        .mockResolvedValueOnce(100) // totalActive
        .mockResolvedValueOnce(25) // totalDeleted
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { category: 'fact', count: BigInt(60) },
          { category: 'preference', count: BigInt(40) },
        ])
        .mockResolvedValueOnce([
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
      userMemoryDelegate.count.mockResolvedValue(0)
      prisma.$queryRaw.mockResolvedValue([])

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
      userMemoryDelegate.findMany.mockResolvedValue(memories)

      const result = await service.exportMemories(TENANT_ID)

      expect(result).toHaveLength(2)
      expect(userMemoryDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, isDeleted: false },
          orderBy: { createdAt: 'asc' },
        }),
      )
    })

    it('filters by userId when provided', async () => {
      userMemoryDelegate.findMany.mockResolvedValue([buildMemoryRecord()])

      await service.exportMemories(TENANT_ID, USER_ID)

      expect(userMemoryDelegate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID, isDeleted: false, userId: USER_ID },
        }),
      )
    })
  })

  /* ── getRetentionPolicy ───────────────────────────── */

  describe('getRetentionPolicy', () => {
    it('returns policy when it exists', async () => {
      const policy = buildRetentionPolicy()
      prisma.memoryRetentionPolicy.findUnique.mockResolvedValue(policy)

      const result = await service.getRetentionPolicy(TENANT_ID)

      expect(result).toEqual(policy)
      expect(prisma.memoryRetentionPolicy.findUnique).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      })
    })

    it('returns null when no policy exists', async () => {
      prisma.memoryRetentionPolicy.findUnique.mockResolvedValue(null)

      const result = await service.getRetentionPolicy(TENANT_ID)

      expect(result).toBeNull()
    })
  })

  /* ── upsertRetentionPolicy ────────────────────────── */

  describe('upsertRetentionPolicy', () => {
    it('creates or updates policy', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 60 })
      prisma.memoryRetentionPolicy.upsert.mockResolvedValue(policy)

      const result = await service.upsertRetentionPolicy(
        TENANT_ID,
        { retentionDays: 60, autoCleanup: true },
        'admin-001',
      )

      expect(result).toEqual(policy)
      expect(prisma.memoryRetentionPolicy.upsert).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        update: { retentionDays: 60, autoCleanup: true },
        create: {
          tenantId: TENANT_ID,
          retentionDays: 60,
          autoCleanup: true,
          createdBy: 'admin-001',
        },
      })
    })
  })

  /* ── cleanupExpiredMemories ───────────────────────── */

  describe('cleanupExpiredMemories', () => {
    it('soft-deletes expired memories and updates policy lastCleanup', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 30, autoCleanup: true })
      prisma.memoryRetentionPolicy.findUnique.mockResolvedValue(policy)
      userMemoryDelegate.updateMany.mockResolvedValue({ count: 5 })
      prisma.memoryRetentionPolicy.update.mockResolvedValue(policy)

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(5)
      expect(userMemoryDelegate.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            isDeleted: false,
            updatedAt: expect.objectContaining({ lt: expect.any(Date) }),
          }),
          data: { isDeleted: true },
        }),
      )
      expect(prisma.memoryRetentionPolicy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          data: expect.objectContaining({
            lastCleanupAt: expect.any(Date),
            lastCleanupCount: 5,
          }),
        }),
      )
    })

    it('returns 0 when no policy exists', async () => {
      prisma.memoryRetentionPolicy.findUnique.mockResolvedValue(null)

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(0)
      expect(userMemoryDelegate.updateMany).not.toHaveBeenCalled()
    })

    it('returns 0 when retentionDays is 0', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 0, autoCleanup: true })
      prisma.memoryRetentionPolicy.findUnique.mockResolvedValue(policy)

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(0)
      expect(userMemoryDelegate.updateMany).not.toHaveBeenCalled()
    })

    it('returns 0 when autoCleanup is disabled', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 90, autoCleanup: false })
      prisma.memoryRetentionPolicy.findUnique.mockResolvedValue(policy)

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(0)
      expect(userMemoryDelegate.updateMany).not.toHaveBeenCalled()
    })

    it('does not update policy when no memories were cleaned', async () => {
      const policy = buildRetentionPolicy({ retentionDays: 30, autoCleanup: true })
      prisma.memoryRetentionPolicy.findUnique.mockResolvedValue(policy)
      userMemoryDelegate.updateMany.mockResolvedValue({ count: 0 })

      const result = await service.cleanupExpiredMemories(TENANT_ID)

      expect(result).toBe(0)
      expect(prisma.memoryRetentionPolicy.update).not.toHaveBeenCalled()
    })
  })

  /* ── adminDeleteUserMemories ──────────────────────── */

  describe('adminDeleteUserMemories', () => {
    it('soft-deletes all user memories and returns count', async () => {
      userMemoryDelegate.updateMany.mockResolvedValue({ count: 12 })

      const result = await service.adminDeleteUserMemories(TENANT_ID, USER_ID)

      expect(result).toBe(12)
      expect(userMemoryDelegate.updateMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, userId: USER_ID, isDeleted: false },
        data: { isDeleted: true },
      })
    })

    it('returns 0 when user has no active memories', async () => {
      userMemoryDelegate.updateMany.mockResolvedValue({ count: 0 })

      const result = await service.adminDeleteUserMemories(TENANT_ID, USER_ID)

      expect(result).toBe(0)
    })
  })
})
