import { AiTranscriptService } from '../../src/modules/ai/chat/ai-transcript.service'

/* ── Mock factories ─────────────────────────────────── */

function createMockPrisma() {
  return {
    aiChatThread: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
    aiChatMessage: {
      count: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    aiAuditLog: {
      count: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    aiTranscriptPolicy: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  }
}

function buildThread(overrides: Record<string, unknown> = {}) {
  return {
    id: 'thread-001',
    tenantId: 'tenant-001',
    userId: 'user-001',
    title: 'Test thread',
    legalHold: false,
    redactedAt: null,
    complianceStatus: null,
    isArchived: false,
    lastActivityAt: new Date('2025-03-01'),
    createdAt: new Date('2025-01-15'),
    updatedAt: new Date('2025-03-01'),
    ...overrides,
  }
}

function buildMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 'msg-001',
    tenantId: 'tenant-001',
    threadId: 'thread-001',
    role: 'user',
    content: 'Hello AI',
    sequenceNum: 1,
    createdAt: new Date('2025-01-15'),
    ...overrides,
  }
}

function buildAuditLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'audit-001',
    tenantId: 'tenant-001',
    actor: 'user-001',
    action: 'chat_message',
    metadata: {},
    createdAt: new Date('2025-02-01'),
    ...overrides,
  }
}

function buildPolicy(overrides: Record<string, unknown> = {}) {
  return {
    id: 'policy-001',
    tenantId: 'tenant-001',
    chatRetentionDays: 90,
    auditRetentionDays: 365,
    autoRedactPii: false,
    requireLegalHold: false,
    lastCleanupAt: null,
    lastCleanupCount: 0,
    createdBy: 'admin-001',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

/* ── Tests ───────────────────────────────────────────── */

describe('AiTranscriptService', () => {
  const TENANT_ID = 'tenant-001'
  const THREAD_ID = 'thread-001'

  let prisma: ReturnType<typeof createMockPrisma>
  let service: AiTranscriptService

  beforeEach(() => {
    prisma = createMockPrisma()
    service = new AiTranscriptService(prisma as never)
    jest.clearAllMocks()
  })

  /* ── getStats ─────────────────────────────────────── */

  describe('getStats', () => {
    it('returns correct counts', async () => {
      prisma.aiChatThread.count
        .mockResolvedValueOnce(50) // totalThreads
        .mockResolvedValueOnce(3) // threadsOnHold
        .mockResolvedValueOnce(2) // threadsRedacted
      prisma.aiChatMessage.count.mockResolvedValue(200)
      prisma.aiAuditLog.count.mockResolvedValue(150)

      const result = await service.getStats(TENANT_ID)

      expect(result).toEqual({
        totalThreads: 50,
        totalMessages: 200,
        totalAuditLogs: 150,
        threadsOnHold: 3,
        threadsRedacted: 2,
      })
    })

    it('returns zero counts when no data exists', async () => {
      prisma.aiChatThread.count.mockResolvedValue(0)
      prisma.aiChatMessage.count.mockResolvedValue(0)
      prisma.aiAuditLog.count.mockResolvedValue(0)

      const result = await service.getStats(TENANT_ID)

      expect(result.totalThreads).toBe(0)
      expect(result.totalMessages).toBe(0)
      expect(result.totalAuditLogs).toBe(0)
    })
  })

  /* ── listThreads ──────────────────────────────────── */

  describe('listThreads', () => {
    it('returns paginated results', async () => {
      const threads = [buildThread(), buildThread({ id: 'thread-002' })]
      prisma.aiChatThread.findMany.mockResolvedValue(threads)
      prisma.aiChatThread.count.mockResolvedValue(2)

      const result = await service.listThreads(TENANT_ID, { limit: 10, offset: 0 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('filters by userId, legalHold, and search', async () => {
      prisma.aiChatThread.findMany.mockResolvedValue([])
      prisma.aiChatThread.count.mockResolvedValue(0)

      await service.listThreads(TENANT_ID, {
        userId: 'user-001',
        legalHold: true,
        search: 'security',
      })

      expect(prisma.aiChatThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            userId: 'user-001',
            legalHold: true,
            title: { contains: 'security', mode: 'insensitive' },
          },
        }),
      )
    })

    it('uses default limit=25 and offset=0 when not provided', async () => {
      prisma.aiChatThread.findMany.mockResolvedValue([])
      prisma.aiChatThread.count.mockResolvedValue(0)

      await service.listThreads(TENANT_ID)

      expect(prisma.aiChatThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 25, skip: 0 }),
      )
    })
  })

  /* ── getThreadMessages ────────────────────────────── */

  describe('getThreadMessages', () => {
    it('returns messages ordered by sequenceNum', async () => {
      const messages = [
        buildMessage({ sequenceNum: 1 }),
        buildMessage({ id: 'msg-002', sequenceNum: 2, role: 'assistant', content: 'Hi!' }),
      ]
      prisma.aiChatMessage.findMany.mockResolvedValue(messages)

      const result = await service.getThreadMessages(TENANT_ID, THREAD_ID)

      expect(result).toHaveLength(2)
      expect(prisma.aiChatMessage.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID, threadId: THREAD_ID },
        orderBy: { sequenceNum: 'asc' },
      })
    })
  })

  /* ── listAuditLogs ────────────────────────────────── */

  describe('listAuditLogs', () => {
    it('returns paginated audit logs', async () => {
      const logs = [buildAuditLog()]
      prisma.aiAuditLog.findMany.mockResolvedValue(logs)
      prisma.aiAuditLog.count.mockResolvedValue(1)

      const result = await service.listAuditLogs(TENANT_ID, { limit: 25 })

      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('applies actor, action, and date range filters', async () => {
      prisma.aiAuditLog.findMany.mockResolvedValue([])
      prisma.aiAuditLog.count.mockResolvedValue(0)

      await service.listAuditLogs(TENANT_ID, {
        actor: 'admin',
        action: 'redact',
        from: '2025-01-01',
        to: '2025-12-31',
      })

      expect(prisma.aiAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            actor: { contains: 'admin', mode: 'insensitive' },
            action: 'redact',
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        }),
      )
    })
  })

  /* ── toggleLegalHold ──────────────────────────────── */

  describe('toggleLegalHold', () => {
    it('updates thread legalHold flag', async () => {
      const thread = buildThread()
      prisma.aiChatThread.findFirst.mockResolvedValue(thread)
      prisma.aiChatThread.update.mockResolvedValue({ ...thread, legalHold: true })

      const result = await service.toggleLegalHold(TENANT_ID, THREAD_ID, true)

      expect(result.legalHold).toBe(true)
      expect(prisma.aiChatThread.update).toHaveBeenCalledWith({
        where: { id: THREAD_ID },
        data: { legalHold: true },
      })
    })

    it('throws when thread not found', async () => {
      prisma.aiChatThread.findFirst.mockResolvedValue(null)

      await expect(service.toggleLegalHold(TENANT_ID, 'nonexistent', true)).rejects.toThrow(
        'Thread not found',
      )
    })
  })

  /* ── redactThread ─────────────────────────────────── */

  describe('redactThread', () => {
    it('replaces message content with [REDACTED]', async () => {
      const thread = buildThread()
      prisma.aiChatThread.findFirst.mockResolvedValue(thread)
      prisma.aiChatMessage.updateMany.mockResolvedValue({ count: 5 })
      prisma.aiChatThread.update.mockResolvedValue({
        ...thread,
        redactedAt: new Date(),
        complianceStatus: 'redacted',
      })

      const result = await service.redactThread(TENANT_ID, THREAD_ID)

      expect(result).toBe(5)
      expect(prisma.aiChatMessage.updateMany).toHaveBeenCalledWith({
        where: { threadId: THREAD_ID, tenantId: TENANT_ID },
        data: { content: '[REDACTED]' },
      })
      expect(prisma.aiChatThread.update).toHaveBeenCalledWith({
        where: { id: THREAD_ID },
        data: expect.objectContaining({ complianceStatus: 'redacted' }),
      })
    })

    it('throws when thread is on legal hold', async () => {
      const thread = buildThread({ legalHold: true })
      prisma.aiChatThread.findFirst.mockResolvedValue(thread)

      await expect(service.redactThread(TENANT_ID, THREAD_ID)).rejects.toThrow(
        'Cannot redact a thread under legal hold',
      )
      expect(prisma.aiChatMessage.updateMany).not.toHaveBeenCalled()
    })

    it('throws when thread not found', async () => {
      prisma.aiChatThread.findFirst.mockResolvedValue(null)

      await expect(service.redactThread(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Thread not found',
      )
    })
  })

  /* ── exportThreadTranscript ───────────────────────── */

  describe('exportThreadTranscript', () => {
    it('returns thread and messages', async () => {
      const thread = buildThread()
      const messages = [buildMessage(), buildMessage({ id: 'msg-002', sequenceNum: 2 })]
      prisma.aiChatThread.findFirst.mockResolvedValue(thread)
      prisma.aiChatMessage.findMany.mockResolvedValue(messages)

      const result = await service.exportThreadTranscript(TENANT_ID, THREAD_ID)

      expect(result.thread).toEqual(thread)
      expect(result.messages).toHaveLength(2)
    })

    it('throws when thread not found', async () => {
      prisma.aiChatThread.findFirst.mockResolvedValue(null)

      await expect(service.exportThreadTranscript(TENANT_ID, 'nonexistent')).rejects.toThrow(
        'Thread not found',
      )
    })
  })

  /* ── exportAuditLogs ──────────────────────────────── */

  describe('exportAuditLogs', () => {
    it('returns filtered audit logs', async () => {
      const logs = [buildAuditLog()]
      prisma.aiAuditLog.findMany.mockResolvedValue(logs)

      const result = await service.exportAuditLogs(TENANT_ID, '2025-01-01', '2025-12-31')

      expect(result).toHaveLength(1)
      expect(prisma.aiAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TENANT_ID,
            createdAt: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          },
        }),
      )
    })

    it('returns all logs when no date range provided', async () => {
      prisma.aiAuditLog.findMany.mockResolvedValue([])

      await service.exportAuditLogs(TENANT_ID)

      expect(prisma.aiAuditLog.findMany).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        orderBy: { createdAt: 'asc' },
      })
    })
  })

  /* ── getPolicy ────────────────────────────────────── */

  describe('getPolicy', () => {
    it('returns policy when it exists', async () => {
      const policy = buildPolicy()
      prisma.aiTranscriptPolicy.findUnique.mockResolvedValue(policy)

      const result = await service.getPolicy(TENANT_ID)

      expect(result).toEqual(policy)
      expect(prisma.aiTranscriptPolicy.findUnique).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
      })
    })

    it('returns null when no policy exists', async () => {
      prisma.aiTranscriptPolicy.findUnique.mockResolvedValue(null)

      const result = await service.getPolicy(TENANT_ID)

      expect(result).toBeNull()
    })
  })

  /* ── upsertPolicy ─────────────────────────────────── */

  describe('upsertPolicy', () => {
    it('creates or updates policy', async () => {
      const policy = buildPolicy()
      prisma.aiTranscriptPolicy.upsert.mockResolvedValue(policy)

      const data = {
        chatRetentionDays: 90,
        auditRetentionDays: 365,
        autoRedactPii: false,
        requireLegalHold: false,
      }

      const result = await service.upsertPolicy(TENANT_ID, data, 'admin-001')

      expect(result).toEqual(policy)
      expect(prisma.aiTranscriptPolicy.upsert).toHaveBeenCalledWith({
        where: { tenantId: TENANT_ID },
        update: data,
        create: { tenantId: TENANT_ID, ...data, createdBy: 'admin-001' },
      })
    })
  })

  /* ── cleanupExpiredTranscripts ─────────────────────── */

  describe('cleanupExpiredTranscripts', () => {
    it('deletes expired chats (not on legal hold) and audit logs', async () => {
      const policy = buildPolicy({ chatRetentionDays: 30, auditRetentionDays: 60 })
      prisma.aiTranscriptPolicy.findUnique.mockResolvedValue(policy)

      const expiredThreads = [{ id: 'thread-old-1' }, { id: 'thread-old-2' }]
      prisma.aiChatThread.findMany.mockResolvedValue(expiredThreads)
      prisma.aiChatMessage.deleteMany.mockResolvedValue({ count: 10 })
      prisma.aiChatThread.deleteMany.mockResolvedValue({ count: 2 })
      prisma.aiAuditLog.deleteMany.mockResolvedValue({ count: 5 })
      prisma.aiTranscriptPolicy.update.mockResolvedValue(policy)

      const result = await service.cleanupExpiredTranscripts(TENANT_ID)

      expect(result).toEqual({ chats: 2, audits: 5 })
      expect(prisma.aiChatThread.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            legalHold: false,
            isArchived: false,
          }),
        }),
      )
      expect(prisma.aiChatMessage.deleteMany).toHaveBeenCalledWith({
        where: { threadId: { in: ['thread-old-1', 'thread-old-2'] } },
      })
      expect(prisma.aiTranscriptPolicy.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
          data: expect.objectContaining({
            lastCleanupAt: expect.any(Date),
            lastCleanupCount: 7,
          }),
        }),
      )
    })

    it('returns {chats:0, audits:0} when no policy exists', async () => {
      prisma.aiTranscriptPolicy.findUnique.mockResolvedValue(null)

      const result = await service.cleanupExpiredTranscripts(TENANT_ID)

      expect(result).toEqual({ chats: 0, audits: 0 })
      expect(prisma.aiChatThread.findMany).not.toHaveBeenCalled()
    })

    it('skips chat cleanup when chatRetentionDays is 0', async () => {
      const policy = buildPolicy({ chatRetentionDays: 0, auditRetentionDays: 60 })
      prisma.aiTranscriptPolicy.findUnique.mockResolvedValue(policy)
      prisma.aiAuditLog.deleteMany.mockResolvedValue({ count: 3 })
      prisma.aiTranscriptPolicy.update.mockResolvedValue(policy)

      const result = await service.cleanupExpiredTranscripts(TENANT_ID)

      expect(result.chats).toBe(0)
      expect(result.audits).toBe(3)
      expect(prisma.aiChatThread.findMany).not.toHaveBeenCalled()
    })

    it('skips audit cleanup when auditRetentionDays is 0', async () => {
      const policy = buildPolicy({ chatRetentionDays: 30, auditRetentionDays: 0 })
      prisma.aiTranscriptPolicy.findUnique.mockResolvedValue(policy)
      prisma.aiChatThread.findMany.mockResolvedValue([])

      const result = await service.cleanupExpiredTranscripts(TENANT_ID)

      expect(result.audits).toBe(0)
      expect(prisma.aiAuditLog.deleteMany).not.toHaveBeenCalled()
    })

    it('does not update policy when nothing was cleaned', async () => {
      const policy = buildPolicy({ chatRetentionDays: 30, auditRetentionDays: 60 })
      prisma.aiTranscriptPolicy.findUnique.mockResolvedValue(policy)
      prisma.aiChatThread.findMany.mockResolvedValue([])
      prisma.aiAuditLog.deleteMany.mockResolvedValue({ count: 0 })

      await service.cleanupExpiredTranscripts(TENANT_ID)

      expect(prisma.aiTranscriptPolicy.update).not.toHaveBeenCalled()
    })
  })
})
