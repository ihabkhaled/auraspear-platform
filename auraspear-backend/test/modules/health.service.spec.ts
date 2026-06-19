import { HealthStatus } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { HealthService } from '../../src/modules/health/health.service'

const mockRedis = {
  status: 'ready' as const,
  ping: jest.fn().mockResolvedValue('PONG'),
  set: jest.fn().mockResolvedValue('OK'),
  get: jest.fn().mockResolvedValue(null),
  del: jest.fn().mockResolvedValue(1),
  exists: jest.fn().mockResolvedValue(0),
  setex: jest.fn().mockResolvedValue('OK'),
  expire: jest.fn().mockResolvedValue(1),
  info: jest.fn().mockResolvedValue('redis_version:7.0.0'),
  quit: jest.fn().mockResolvedValue('OK'),
  on: jest.fn().mockReturnThis(),
}

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    pingDatabase: jest.fn().mockResolvedValue(undefined),
  }
}

function createMockConnectorsService() {
  return {
    getEnabledConnectors: jest.fn(),
    testConnection: jest.fn(),
  }
}

function createService(
  repository: ReturnType<typeof createMockRepository>,
  connectorsService: ReturnType<typeof createMockConnectorsService>
) {
  return new HealthService(
    repository as never,
    mockRedis as never,
    connectorsService as never,
    mockAppLogger as never
  )
}

describe('HealthService', () => {
  let repository: ReturnType<typeof createMockRepository>
  let connectorsService: ReturnType<typeof createMockConnectorsService>
  let service: HealthService

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    connectorsService = createMockConnectorsService()
    service = createService(repository, connectorsService)
  })

  /* ------------------------------------------------------------------ */
  /* getOverallHealth                                                    */
  /* ------------------------------------------------------------------ */

  describe('getOverallHealth', () => {
    it('should return HEALTHY when both DB and Redis are up', async () => {
      const result = await service.getOverallHealth()

      expect(result.status).toBe(HealthStatus.HEALTHY)
      expect(result.checks.database.status).toBe(HealthStatus.HEALTHY)
      expect(result.checks.redis.status).toBe(HealthStatus.HEALTHY)
      expect(result.timestamp).toBeDefined()
      expect(typeof result.checks.database.latencyMs).toBe('number')
      expect(typeof result.checks.redis.latencyMs).toBe('number')
      expect(result.checks.database.latencyMs).toBeGreaterThanOrEqual(0)
      expect(result.checks.redis.latencyMs).toBeGreaterThanOrEqual(0)
    })

    it('should return DEGRADED when DB is down but Redis is up', async () => {
      repository.pingDatabase.mockRejectedValue(new Error('Connection refused'))

      const result = await service.getOverallHealth()

      expect(result.status).toBe(HealthStatus.DEGRADED)
      expect(result.checks.database.status).toBe(HealthStatus.DOWN)
      expect(result.checks.redis.status).toBe(HealthStatus.HEALTHY)
    })

    it('should return DEGRADED when Redis is down but DB is up', async () => {
      const redisInstance = (service as Record<string, unknown>)['redis'] as {
        ping: jest.Mock
      }
      redisInstance.ping.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await service.getOverallHealth()

      expect(result.status).toBe(HealthStatus.DEGRADED)
      expect(result.checks.database.status).toBe(HealthStatus.HEALTHY)
      expect(result.checks.redis.status).toBe(HealthStatus.DOWN)
    })

    it('should return DOWN when both DB and Redis are down', async () => {
      repository.pingDatabase.mockRejectedValue(new Error('DB connection refused'))
      const redisInstance = (service as Record<string, unknown>)['redis'] as {
        ping: jest.Mock
      }
      redisInstance.ping.mockRejectedValue(new Error('Redis connection refused'))

      const result = await service.getOverallHealth()

      expect(result.status).toBe(HealthStatus.DOWN)
      expect(result.checks.database.status).toBe(HealthStatus.DOWN)
      expect(result.checks.redis.status).toBe(HealthStatus.DOWN)
    })

    it('should include timestamp in ISO format', async () => {
      const result = await service.getOverallHealth()

      expect(result.timestamp).toBeDefined()
      const parsed = toDay(result.timestamp).toDate()
      expect(parsed.toISOString()).toBe(result.timestamp)
    })

    it('should include latencyMs for each check', async () => {
      const result = await service.getOverallHealth()

      expect(result.checks.database.latencyMs).toBeGreaterThanOrEqual(0)
      expect(result.checks.redis.latencyMs).toBeGreaterThanOrEqual(0)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getAllServiceHealth                                                  */
  /* ------------------------------------------------------------------ */

  describe('getAllServiceHealth', () => {
    const tenantId = 'tenant-001'

    it('should return health status for each enabled connector', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([
        { type: 'wazuh', name: 'Wazuh' },
        { type: 'graylog', name: 'Graylog' },
        { type: 'misp', name: 'MISP' },
      ])
      connectorsService.testConnection
        .mockResolvedValueOnce({ ok: true, latencyMs: 120 })
        .mockResolvedValueOnce({ ok: true, latencyMs: 250 })
        .mockResolvedValueOnce({ ok: true, latencyMs: 500 })

      const result = await service.getAllServiceHealth(tenantId)

      expect(result).toHaveLength(3)
      expect(result[0]?.name).toBe('Wazuh')
      expect(result[0]?.type).toBe('wazuh')
      expect(result[0]?.status).toBe(HealthStatus.HEALTHY)
      expect(result[0]?.latencyMs).toBe(120)
      expect(result[1]?.status).toBe(HealthStatus.HEALTHY)
      expect(result[2]?.status).toBe(HealthStatus.HEALTHY)
    })

    it('should mark HEALTHY for ok=true and latencyMs <= 3000', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([{ type: 'wazuh', name: 'Wazuh' }])
      connectorsService.testConnection.mockResolvedValue({ ok: true, latencyMs: 2999 })

      const result = await service.getAllServiceHealth(tenantId)

      expect(result[0]?.status).toBe(HealthStatus.HEALTHY)
    })

    it('should mark DEGRADED for ok=true and latencyMs > 3000', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([
        { type: 'grafana', name: 'Grafana' },
      ])
      connectorsService.testConnection.mockResolvedValue({ ok: true, latencyMs: 5000 })

      const result = await service.getAllServiceHealth(tenantId)

      expect(result[0]?.status).toBe(HealthStatus.DEGRADED)
      expect(result[0]?.latencyMs).toBe(5000)
    })

    it('should mark DOWN for ok=false', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([
        { type: 'shuffle', name: 'Shuffle' },
      ])
      connectorsService.testConnection.mockResolvedValue({ ok: false, latencyMs: 0 })

      const result = await service.getAllServiceHealth(tenantId)

      expect(result[0]?.status).toBe(HealthStatus.DOWN)
    })

    it('should handle connector test throwing an error (catch block)', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([
        { type: 'velociraptor', name: 'Velociraptor' },
      ])
      connectorsService.testConnection.mockRejectedValue(
        new Error('self-signed certificate in certificate chain')
      )

      const result = await service.getAllServiceHealth(tenantId)

      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('Velociraptor')
      expect(result[0]?.type).toBe('velociraptor')
      expect(result[0]?.status).toBe(HealthStatus.DOWN)
      expect(result[0]?.latencyMs).toBe(-1)
    })

    it('should handle empty connectors list', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([])

      const result = await service.getAllServiceHealth(tenantId)

      expect(result).toHaveLength(0)
    })

    it('should handle mix of healthy, degraded, and down connectors', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([
        { type: 'wazuh', name: 'Wazuh' },
        { type: 'grafana', name: 'Grafana' },
        { type: 'misp', name: 'MISP' },
        { type: 'shuffle', name: 'Shuffle' },
      ])
      connectorsService.testConnection
        .mockResolvedValueOnce({ ok: true, latencyMs: 100 }) // HEALTHY
        .mockResolvedValueOnce({ ok: true, latencyMs: 4000 }) // DEGRADED
        .mockResolvedValueOnce({ ok: false, latencyMs: 0 }) // DOWN
        .mockRejectedValueOnce(new Error('timeout')) // DOWN (exception)

      const result = await service.getAllServiceHealth(tenantId)

      expect(result).toHaveLength(4)
      expect(result[0]?.status).toBe(HealthStatus.HEALTHY)
      expect(result[1]?.status).toBe(HealthStatus.DEGRADED)
      expect(result[2]?.status).toBe(HealthStatus.DOWN)
      expect(result[3]?.status).toBe(HealthStatus.DOWN)
      expect(result[3]?.latencyMs).toBe(-1)
    })

    it('should mark DEGRADED at exact boundary of latencyMs = 3001', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([
        { type: 'influxdb', name: 'InfluxDB' },
      ])
      connectorsService.testConnection.mockResolvedValue({ ok: true, latencyMs: 3001 })

      const result = await service.getAllServiceHealth(tenantId)

      expect(result[0]?.status).toBe(HealthStatus.DEGRADED)
    })

    it('should mark HEALTHY at exact boundary of latencyMs = 3000', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([
        { type: 'influxdb', name: 'InfluxDB' },
      ])
      connectorsService.testConnection.mockResolvedValue({ ok: true, latencyMs: 3000 })

      const result = await service.getAllServiceHealth(tenantId)

      expect(result[0]?.status).toBe(HealthStatus.HEALTHY)
    })

    it('should handle BusinessException thrown by testConnection', async () => {
      connectorsService.getEnabledConnectors.mockResolvedValue([
        { type: 'bedrock', name: 'Bedrock' },
      ])
      connectorsService.testConnection.mockRejectedValue(
        new BusinessException(404, 'Connector not found', 'errors.connectors.notFound')
      )

      const result = await service.getAllServiceHealth(tenantId)

      expect(result).toHaveLength(1)
      expect(result[0]?.status).toBe(HealthStatus.DOWN)
      expect(result[0]?.latencyMs).toBe(-1)
    })
  })
})
