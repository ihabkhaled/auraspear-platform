import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { AppLogsService } from '../../src/modules/app-logs/app-logs.service'

function createMockRepository() {
  return {
    findManyAndCount: jest.fn(),
    findById: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'

describe('AppLogsService', () => {
  let service: AppLogsService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    service = new AppLogsService(repository as never)
    jest.clearAllMocks()
  })

  /* ------------------------------------------------------------------ */
  /* search                                                              */
  /* ------------------------------------------------------------------ */

  describe('search', () => {
    const baseDto = { page: 1, limit: 20 }

    it('should return paginated logs', async () => {
      const logs = [
        { id: 'log-1', level: 'info', message: 'Test log', tenantId: TENANT_ID },
        { id: 'log-2', level: 'error', message: 'Error log', tenantId: TENANT_ID },
      ]
      repository.findManyAndCount.mockResolvedValueOnce([logs, 2])

      const result = await service.search(baseDto)

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

    it('should filter by level (comma-separated: "INFO,ERROR")', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search({ ...baseDto, level: 'INFO,ERROR' })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.level).toEqual({ in: ['INFO', 'ERROR'] })
    })

    it('should filter by single level', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search({ ...baseDto, level: 'INFO' })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.level).toBe('INFO')
    })

    it('should filter by feature', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search({ ...baseDto, feature: 'alerts' })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.feature).toEqual({ contains: 'alerts', mode: 'insensitive' })
    })

    it('should filter by action', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search({ ...baseDto, action: 'create' })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.action).toEqual({ contains: 'create', mode: 'insensitive' })
    })

    it('should filter by query (message contains)', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search({ ...baseDto, query: 'failed' })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.message).toEqual({ contains: 'failed', mode: 'insensitive' })
    })

    it('should filter by date range (from/to)', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      const from = '2025-01-01T00:00:00.000Z'
      const to = '2025-01-31T23:59:59.000Z'
      await service.search({ ...baseDto, from, to })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.createdAt).toEqual({
        gte: toDay(from).toDate(),
        lte: toDay(to).toDate(),
      })
    })

    it('should scope to tenant when scopedTenantId is provided', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search(baseDto, TENANT_ID)

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.tenantId).toBe(TENANT_ID)
    })

    it('should use dto.tenantId when scopedTenantId is not provided', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search({ ...baseDto, tenantId: 'dto-tenant' })

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.tenantId).toBe('dto-tenant')
    })

    it('should prioritize scopedTenantId over dto.tenantId', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      await service.search({ ...baseDto, tenantId: 'dto-tenant' }, TENANT_ID)

      const callArguments = repository.findManyAndCount.mock.calls[0][0]
      expect(callArguments.where.tenantId).toBe(TENANT_ID)
    })

    it('should handle empty results', async () => {
      repository.findManyAndCount.mockResolvedValueOnce([[], 0])

      const result = await service.search(baseDto)

      expect(result.data).toEqual([])
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })
  })

  /* ------------------------------------------------------------------ */
  /* findById                                                            */
  /* ------------------------------------------------------------------ */

  describe('findById', () => {
    it('should return log when found', async () => {
      const log = { id: 'log-1', level: 'info', message: 'Test', tenantId: TENANT_ID }
      repository.findById.mockResolvedValueOnce(log)

      const result = await service.findById('log-1')

      expect(result).toEqual(log)
      expect(repository.findById).toHaveBeenCalledWith('log-1')
    })

    it('should throw 404 when not found', async () => {
      repository.findById.mockResolvedValueOnce(null)

      await expect(service.findById('nonexistent')).rejects.toThrow(BusinessException)
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        messageKey: 'errors.appLogs.notFound',
      })
    })

    it('should throw 403 when log belongs to different tenant (scope violation)', async () => {
      const log = { id: 'log-1', level: 'info', message: 'Test', tenantId: 'other-tenant' }
      repository.findById.mockResolvedValue(log)

      await expect(service.findById('log-1', TENANT_ID)).rejects.toThrow(BusinessException)
      await expect(service.findById('log-1', TENANT_ID)).rejects.toMatchObject({
        messageKey: 'errors.forbidden',
      })
    })

    it('should return log when scopedTenantId matches log tenantId', async () => {
      const log = { id: 'log-1', level: 'info', message: 'Test', tenantId: TENANT_ID }
      repository.findById.mockResolvedValueOnce(log)

      const result = await service.findById('log-1', TENANT_ID)

      expect(result).toEqual(log)
    })
  })
})
