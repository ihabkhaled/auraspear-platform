import { ServiceStatus } from '../../src/common/enums'
import { toDay } from '../../src/common/utils/date-time.utility'
import { SystemHealthService } from '../../src/modules/system-health/system-health.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'

function buildMockHealthCheck(overrides: Record<string, unknown> = {}) {
  return {
    id: 'hc-001',
    tenantId: TENANT_ID,
    serviceName: 'Wazuh Manager',
    serviceType: 'wazuh',
    status: ServiceStatus.HEALTHY,
    responseTimeMs: 45,
    errorMessage: null,
    metadata: { version: '4.7.0' },
    lastCheckedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function buildMockMetric(overrides: Record<string, unknown> = {}) {
  return {
    id: 'metric-001',
    tenantId: TENANT_ID,
    metricName: 'cpu_usage',
    metricType: 'gauge',
    value: 65.5,
    unit: 'percent',
    tags: { host: 'server-01' },
    recordedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findManyHealthChecks: jest.fn(),
    countHealthChecks: jest.fn(),
    findLatestHealthChecks: jest.fn(),
    findManyMetrics: jest.fn(),
    countMetrics: jest.fn(),
  }
}

describe('SystemHealthService', () => {
  let service: SystemHealthService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new SystemHealthService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listHealthChecks
  // ---------------------------------------------------------------------------
  describe('listHealthChecks', () => {
    it('should return paginated health checks', async () => {
      const checks = [buildMockHealthCheck(), buildMockHealthCheck({ id: 'hc-002' })]
      repository.findManyHealthChecks.mockResolvedValue(checks)
      repository.countHealthChecks.mockResolvedValue(2)

      const result = await service.listHealthChecks(TENANT_ID)

      expect(result.data).toHaveLength(2)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('should filter by serviceType', async () => {
      repository.findManyHealthChecks.mockResolvedValue([])
      repository.countHealthChecks.mockResolvedValue(0)

      await service.listHealthChecks(TENANT_ID, 1, 20, undefined, undefined, 'wazuh')

      const whereArgument = repository.findManyHealthChecks.mock.calls[0][0].where
      expect(whereArgument.serviceType).toBe('wazuh')
    })

    it('should filter by status', async () => {
      repository.findManyHealthChecks.mockResolvedValue([])
      repository.countHealthChecks.mockResolvedValue(0)

      await service.listHealthChecks(TENANT_ID, 1, 20, undefined, undefined, undefined, 'healthy')

      const whereArgument = repository.findManyHealthChecks.mock.calls[0][0].where
      expect(whereArgument.status).toBe('healthy')
    })

    it('should handle empty results', async () => {
      repository.findManyHealthChecks.mockResolvedValue([])
      repository.countHealthChecks.mockResolvedValue(0)

      const result = await service.listHealthChecks(TENANT_ID)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyHealthChecks.mockResolvedValue([])
      repository.countHealthChecks.mockResolvedValue(50)

      await service.listHealthChecks(TENANT_ID, 3, 10)

      expect(repository.findManyHealthChecks).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should map errorMessage to message field', async () => {
      repository.findManyHealthChecks.mockResolvedValue([
        buildMockHealthCheck({ errorMessage: 'Connection timed out' }),
      ])
      repository.countHealthChecks.mockResolvedValue(1)

      const result = await service.listHealthChecks(TENANT_ID)

      expect(result.data[0]?.message).toBe('Connection timed out')
    })

    it('should enforce tenant isolation', async () => {
      repository.findManyHealthChecks.mockResolvedValue([])
      repository.countHealthChecks.mockResolvedValue(0)

      await service.listHealthChecks('other-tenant')

      const whereArgument = repository.findManyHealthChecks.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getLatestHealthChecks
  // ---------------------------------------------------------------------------
  describe('getLatestHealthChecks', () => {
    it('should return latest health checks', async () => {
      const checks = [
        buildMockHealthCheck({ serviceName: 'Wazuh Manager' }),
        buildMockHealthCheck({ id: 'hc-002', serviceName: 'Graylog' }),
      ]
      repository.findLatestHealthChecks.mockResolvedValue(checks)

      const result = await service.getLatestHealthChecks(TENANT_ID)

      expect(result).toHaveLength(2)
      expect(result[0]?.serviceName).toBe('Wazuh Manager')
    })

    it('should handle empty results', async () => {
      repository.findLatestHealthChecks.mockResolvedValue([])

      const result = await service.getLatestHealthChecks(TENANT_ID)

      expect(result).toHaveLength(0)
    })

    it('should enforce tenant isolation', async () => {
      repository.findLatestHealthChecks.mockResolvedValue([])

      await service.getLatestHealthChecks('other-tenant')

      expect(repository.findLatestHealthChecks).toHaveBeenCalledWith('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // listMetrics
  // ---------------------------------------------------------------------------
  describe('listMetrics', () => {
    it('should return paginated metrics', async () => {
      const metrics = [buildMockMetric()]
      repository.findManyMetrics.mockResolvedValue(metrics)
      repository.countMetrics.mockResolvedValue(1)

      const result = await service.listMetrics(TENANT_ID)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.metricName).toBe('cpu_usage')
    })

    it('should filter by metricType', async () => {
      repository.findManyMetrics.mockResolvedValue([])
      repository.countMetrics.mockResolvedValue(0)

      await service.listMetrics(TENANT_ID, 1, 20, undefined, undefined, 'gauge')

      const whereArgument = repository.findManyMetrics.mock.calls[0][0].where
      expect(whereArgument.metricType).toBe('gauge')
    })

    it('should filter by metricName with case-insensitive contains', async () => {
      repository.findManyMetrics.mockResolvedValue([])
      repository.countMetrics.mockResolvedValue(0)

      await service.listMetrics(TENANT_ID, 1, 20, undefined, undefined, undefined, 'cpu')

      const whereArgument = repository.findManyMetrics.mock.calls[0][0].where
      expect(whereArgument.metricName).toEqual({ contains: 'cpu', mode: 'insensitive' })
    })

    it('should handle empty results', async () => {
      repository.findManyMetrics.mockResolvedValue([])
      repository.countMetrics.mockResolvedValue(0)

      const result = await service.listMetrics(TENANT_ID)

      expect(result.data).toHaveLength(0)
    })

    it('should enforce tenant isolation', async () => {
      repository.findManyMetrics.mockResolvedValue([])
      repository.countMetrics.mockResolvedValue(0)

      await service.listMetrics('other-tenant')

      const whereArgument = repository.findManyMetrics.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getSystemHealthStats
  // ---------------------------------------------------------------------------
  describe('getSystemHealthStats', () => {
    it('should return aggregated system health stats', async () => {
      repository.findLatestHealthChecks.mockResolvedValue([
        buildMockHealthCheck({ status: ServiceStatus.HEALTHY, responseTimeMs: 40 }),
        buildMockHealthCheck({ id: 'hc-002', status: ServiceStatus.HEALTHY, responseTimeMs: 60 }),
        buildMockHealthCheck({ id: 'hc-003', status: ServiceStatus.DEGRADED, responseTimeMs: 200 }),
        buildMockHealthCheck({ id: 'hc-004', status: ServiceStatus.DOWN, responseTimeMs: null }),
      ])

      const result = await service.getSystemHealthStats(TENANT_ID)

      expect(result.totalServices).toBe(4)
      expect(result.healthyServices).toBe(2)
      expect(result.degradedServices).toBe(1)
      expect(result.downServices).toBe(1)
      expect(result.avgResponseTimeMs).toBe(100) // (40+60+200)/3
    })

    it('should return null avgResponseTimeMs when no response times', async () => {
      repository.findLatestHealthChecks.mockResolvedValue([
        buildMockHealthCheck({ responseTimeMs: null }),
      ])

      const result = await service.getSystemHealthStats(TENANT_ID)

      expect(result.avgResponseTimeMs).toBeNull()
    })

    it('should return null lastCheckedAt when no health checks', async () => {
      repository.findLatestHealthChecks.mockResolvedValue([])

      const result = await service.getSystemHealthStats(TENANT_ID)

      expect(result.totalServices).toBe(0)
      expect(result.lastCheckedAt).toBeNull()
    })

    it('should return the latest checkedAt across all checks', async () => {
      const latestDate = toDay('2025-06-02T00:00:00Z').toDate()
      repository.findLatestHealthChecks.mockResolvedValue([
        buildMockHealthCheck({ lastCheckedAt: toDay('2025-06-01T00:00:00Z').toDate() }),
        buildMockHealthCheck({ id: 'hc-002', lastCheckedAt: latestDate }),
      ])

      const result = await service.getSystemHealthStats(TENANT_ID)

      expect(result.lastCheckedAt).toEqual(latestDate)
    })

    it('should enforce tenant isolation', async () => {
      repository.findLatestHealthChecks.mockResolvedValue([])

      await service.getSystemHealthStats('other-tenant')

      expect(repository.findLatestHealthChecks).toHaveBeenCalledWith('other-tenant')
    })

    it('should log stats retrieval', async () => {
      repository.findLatestHealthChecks.mockResolvedValue([])

      await service.getSystemHealthStats(TENANT_ID)

      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database error')
      repository.findLatestHealthChecks.mockRejectedValue(dbError)

      try {
        await service.getSystemHealthStats(TENANT_ID)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })
  })
})
