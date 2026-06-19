import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { AuditLogsService } from '../../src/modules/audit-logs/audit-logs.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    findManyAndCount: jest.fn(),
    create: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'

describe('AuditLogsService', () => {
  let service: AuditLogsService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    service = new AuditLogsService(repository as never, mockAppLogger as never)
    jest.clearAllMocks()
  })

  /* ------------------------------------------------------------------ */
  /* search                                                              */
  /* ------------------------------------------------------------------ */

  describe('search', () => {
    const baseQuery = { page: 1, limit: 20 }

    it('should return paginated results', async () => {
      const logs = [
        {
          id: 'audit-1',
          tenantId: TENANT_ID,
          actor: 'admin@test.com',
          action: 'CREATE',
          resource: 'User',
        },
        {
          id: 'audit-2',
          tenantId: TENANT_ID,
          actor: 'admin@test.com',
          action: 'DELETE',
          resource: 'Case',
        },
      ]
      repository.findManyAndCount.mockResolvedValueOnce([logs, 2])

      const result = await service.search(TENANT_ID, baseQuery)

      expect(result.data).toEqual(logs)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
      expect(repository.findManyAndCount).toHaveBeenCalledTimes(1)
    })

    it('should always scope to provided tenantId', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search(TENANT_ID, baseQuery)

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.tenantId).toBe(TENANT_ID)
    })

    it('should filter by actor (contains, case-insensitive)', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search(TENANT_ID, { ...baseQuery, actor: 'admin' })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.actor).toEqual({ contains: 'admin', mode: 'insensitive' })
    })

    it('should filter by action', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search(TENANT_ID, { ...baseQuery, action: 'CREATE' })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.action).toBe('CREATE')
    })

    it('should filter by resource', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search(TENANT_ID, { ...baseQuery, resource: 'User' })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.resource).toBe('User')
    })

    it('should filter by date range', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      const from = '2025-01-01T00:00:00.000Z'
      const to = '2025-01-31T23:59:59.000Z'
      await service.search(TENANT_ID, { ...baseQuery, from, to })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.createdAt).toEqual({
        gte: toDay(from).toDate(),
        lte: toDay(to).toDate(),
      })
    })

    it('should handle empty results', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      const result = await service.search(TENANT_ID, baseQuery)

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('should log success via appLogger', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search(TENANT_ID, baseQuery)

      expect(mockAppLogger.info).toHaveBeenCalledTimes(1)
    })

    it('should log failure and re-throw when repository throws', async () => {
      const dbError = new Error('DB connection failed')
      repository.findManyAndCount.mockRejectedValueOnce(dbError)

      await expect(service.search(TENANT_ID, baseQuery)).rejects.toThrow('DB connection failed')
      expect(mockAppLogger.error).toHaveBeenCalledTimes(1)
    })
  })

  /* ------------------------------------------------------------------ */
  /* create                                                              */
  /* ------------------------------------------------------------------ */

  describe('create', () => {
    it('should create audit log record with all fields', async () => {
      const data = {
        tenantId: TENANT_ID,
        actor: 'admin@test.com',
        role: 'TENANT_ADMIN' as const,
        action: 'CREATE',
        resource: 'User',
        resourceId: 'user-123',
        details: 'Created new user',
        ipAddress: '192.168.1.1',
      }
      const createdEntry = { id: 'audit-1', ...data, createdAt: nowDate() }
      repository.create.mockResolvedValueOnce(createdEntry)

      const result = await service.create(data)

      expect(result).toEqual(createdEntry)
      expect(repository.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        actor: 'admin@test.com',
        role: 'TENANT_ADMIN',
        action: 'CREATE',
        resource: 'User',
        resourceId: 'user-123',
        details: 'Created new user',
        ipAddress: '192.168.1.1',
      })
    })

    it('should handle optional fields (resourceId, details, ipAddress)', async () => {
      const data = {
        tenantId: TENANT_ID,
        actor: 'admin@test.com',
        role: 'TENANT_ADMIN' as const,
        action: 'LOGIN',
        resource: 'Auth',
      }
      const createdEntry = {
        id: 'audit-2',
        ...data,
        resourceId: null,
        details: null,
        ipAddress: null,
        createdAt: nowDate(),
      }
      repository.create.mockResolvedValueOnce(createdEntry)

      const result = await service.create(data)

      expect(result).toEqual(createdEntry)
      expect(repository.create).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        actor: 'admin@test.com',
        role: 'TENANT_ADMIN',
        action: 'LOGIN',
        resource: 'Auth',
        resourceId: null,
        details: null,
        ipAddress: null,
      })
    })

    it('should log success via appLogger after creation', async () => {
      const data = {
        tenantId: TENANT_ID,
        actor: 'admin@test.com',
        role: 'TENANT_ADMIN' as const,
        action: 'DELETE',
        resource: 'Case',
        resourceId: 'case-1',
      }
      repository.create.mockResolvedValueOnce({ id: 'audit-3', ...data })

      await service.create(data)

      expect(mockAppLogger.info).toHaveBeenCalledTimes(1)
    })

    it('should log failure and re-throw when repository throws', async () => {
      const data = {
        tenantId: TENANT_ID,
        actor: 'admin@test.com',
        role: 'TENANT_ADMIN' as const,
        action: 'CREATE',
        resource: 'Alert',
      }
      const dbError = new Error('Unique constraint violation')
      repository.create.mockRejectedValueOnce(dbError)

      await expect(service.create(data)).rejects.toThrow('Unique constraint violation')
      expect(mockAppLogger.error).toHaveBeenCalledTimes(1)
    })
  })
})
