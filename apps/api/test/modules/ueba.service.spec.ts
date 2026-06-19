import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { UebaService } from '../../src/modules/ueba/ueba.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    findManyEntitiesWithCount: jest.fn(),
    countEntities: jest.fn(),
    findFirstEntityWithCount: jest.fn(),
    findManyAnomaliesWithEntity: jest.fn(),
    countAnomalies: jest.fn(),
    findManyModels: jest.fn(),
    countModels: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'
const ENTITY_ID = 'entity-001'

function buildMockEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: ENTITY_ID,
    tenantId: TENANT_ID,
    entityName: 'jdoe@company.com',
    entityType: 'user',
    riskScore: 85,
    riskLevel: 'high',
    topAnomaly: 'Unusual login hours',
    lastSeenAt: toDay('2025-06-01T18:00:00Z').toDate(),
    createdAt: toDay('2025-01-01T00:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T18:00:00Z').toDate(),
    ...overrides,
  }
}

function buildMockEntityWithCount(overrides: Record<string, unknown> = {}) {
  return {
    ...buildMockEntity(overrides),
    _count: { anomalies: 12 },
  }
}

function buildMockAnomaly(overrides: Record<string, unknown> = {}) {
  return {
    id: 'anomaly-001',
    tenantId: TENANT_ID,
    entityId: ENTITY_ID,
    severity: 'high',
    score: 92.5,
    description: 'Login from unusual geolocation',
    resolved: false,
    detectedAt: toDay('2025-06-01T14:00:00Z').toDate(),
    createdAt: toDay('2025-06-01T14:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T14:00:00Z').toDate(),
    entity: {
      entityName: 'jdoe@company.com',
      entityType: 'user',
    },
    ...overrides,
  }
}

function buildMockModel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'model-001',
    tenantId: TENANT_ID,
    name: 'Login Anomaly Detector',
    modelType: 'anomaly_detection',
    status: 'active',
    accuracy: 0.95,
    lastTrained: toDay('2025-05-15T00:00:00Z').toDate(),
    createdAt: toDay('2025-01-01T00:00:00Z').toDate(),
    updatedAt: toDay('2025-05-15T00:00:00Z').toDate(),
    ...overrides,
  }
}

describe('UebaService', () => {
  let service: UebaService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new UebaService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listEntities
  // ---------------------------------------------------------------------------
  describe('listEntities', () => {
    it('should return paginated entities with anomalyCount', async () => {
      const entities = [
        buildMockEntityWithCount(),
        { ...buildMockEntity({ id: 'entity-002' }), _count: { anomalies: 5 } },
      ]
      repository.findManyEntitiesWithCount.mockResolvedValue(entities)
      repository.countEntities.mockResolvedValue(2)

      const result = await service.listEntities(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toHaveProperty('anomalyCount', 12)
      expect(result.data[1]).toHaveProperty('anomalyCount', 5)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('should always include tenantId in where clause', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(0)

      await service.listEntities(TENANT_ID, 1, 20)

      const whereArgument = repository.findManyEntitiesWithCount.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe(TENANT_ID)
    })

    it('should filter by entityType', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(0)

      await service.listEntities(TENANT_ID, 1, 20, undefined, undefined, 'host')

      const whereArgument = repository.findManyEntitiesWithCount.mock.calls[0][0].where
      expect(whereArgument.entityType).toBe('host')
    })

    it('should filter by riskLevel', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(0)

      await service.listEntities(TENANT_ID, 1, 20, undefined, undefined, undefined, 'critical')

      const whereArgument = repository.findManyEntitiesWithCount.mock.calls[0][0].where
      expect(whereArgument.riskLevel).toBe('critical')
    })

    it('should filter by query with case-insensitive search on entityName and topAnomaly', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(0)

      await service.listEntities(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        'jdoe'
      )

      const whereArgument = repository.findManyEntitiesWithCount.mock.calls[0][0].where
      expect(whereArgument.OR).toEqual([
        { entityName: { contains: 'jdoe', mode: 'insensitive' } },
        { topAnomaly: { contains: 'jdoe', mode: 'insensitive' } },
      ])
    })

    it('should not apply query filter for whitespace-only string', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(0)

      await service.listEntities(TENANT_ID, 1, 20, undefined, undefined, undefined, undefined, '  ')

      const whereArgument = repository.findManyEntitiesWithCount.mock.calls[0][0].where
      expect(whereArgument.OR).toBeUndefined()
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(100)

      await service.listEntities(TENANT_ID, 3, 10)

      expect(repository.findManyEntitiesWithCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should handle empty results', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(0)

      const result = await service.listEntities(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('should sort by riskScore ascending', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(0)

      await service.listEntities(TENANT_ID, 1, 20, 'riskScore', 'asc')

      const orderByArgument = repository.findManyEntitiesWithCount.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ riskScore: 'asc' })
    })

    it('should default sort to riskScore desc', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(0)

      await service.listEntities(TENANT_ID, 1, 20)

      const orderByArgument = repository.findManyEntitiesWithCount.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ riskScore: 'desc' })
    })

    it('should sort by lastSeenAt', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(0)

      await service.listEntities(TENANT_ID, 1, 20, 'lastSeenAt', 'desc')

      const orderByArgument = repository.findManyEntitiesWithCount.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ lastSeenAt: 'desc' })
    })

    it('should calculate hasNext and hasPrev correctly', async () => {
      repository.findManyEntitiesWithCount.mockResolvedValue([])
      repository.countEntities.mockResolvedValue(50)

      const result = await service.listEntities(TENANT_ID, 2, 10)

      expect(result.pagination.hasNext).toBe(true)
      expect(result.pagination.hasPrev).toBe(true)
      expect(result.pagination.totalPages).toBe(5)
    })
  })

  // ---------------------------------------------------------------------------
  // getEntityById
  // ---------------------------------------------------------------------------
  describe('getEntityById', () => {
    it('should return entity record with anomalyCount when found', async () => {
      repository.findFirstEntityWithCount.mockResolvedValue(buildMockEntityWithCount())

      const result = await service.getEntityById(ENTITY_ID, TENANT_ID)

      expect(result).toHaveProperty('anomalyCount', 12)
      expect(result.entityName).toBe('jdoe@company.com')
    })

    it('should query with both id and tenantId for tenant isolation', async () => {
      repository.findFirstEntityWithCount.mockResolvedValue(buildMockEntityWithCount())

      await service.getEntityById(ENTITY_ID, TENANT_ID)

      expect(repository.findFirstEntityWithCount).toHaveBeenCalledWith({
        where: { id: ENTITY_ID, tenantId: TENANT_ID },
      })
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstEntityWithCount.mockResolvedValue(null)

      try {
        await service.getEntityById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should log warning when entity not found', async () => {
      repository.findFirstEntityWithCount.mockResolvedValue(null)

      try {
        await service.getEntityById('nonexistent', TENANT_ID)
      } catch {
        // expected
      }

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'UebaService => UEBA entity not found',
        expect.objectContaining({
          metadata: expect.objectContaining({ entityId: 'nonexistent' }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // listAnomalies
  // ---------------------------------------------------------------------------
  describe('listAnomalies', () => {
    it('should return paginated anomalies with entity info', async () => {
      const anomalies = [buildMockAnomaly(), buildMockAnomaly({ id: 'anomaly-002', score: 75 })]
      repository.findManyAnomaliesWithEntity.mockResolvedValue(anomalies)
      repository.countAnomalies.mockResolvedValue(2)

      const result = await service.listAnomalies(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toHaveProperty('entityName', 'jdoe@company.com')
      expect(result.data[0]).toHaveProperty('entityType', 'user')
      expect(result.pagination.total).toBe(2)
    })

    it('should always include tenantId in where clause', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(0)

      await service.listAnomalies(TENANT_ID, 1, 20)

      const whereArgument = repository.findManyAnomaliesWithEntity.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe(TENANT_ID)
    })

    it('should filter by severity', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(0)

      await service.listAnomalies(TENANT_ID, 1, 20, undefined, undefined, 'critical')

      const whereArgument = repository.findManyAnomaliesWithEntity.mock.calls[0][0].where
      expect(whereArgument.severity).toBe('critical')
    })

    it('should filter by entityId', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(0)

      await service.listAnomalies(TENANT_ID, 1, 20, undefined, undefined, undefined, ENTITY_ID)

      const whereArgument = repository.findManyAnomaliesWithEntity.mock.calls[0][0].where
      expect(whereArgument.entityId).toBe(ENTITY_ID)
    })

    it('should filter by resolved = true', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(0)

      await service.listAnomalies(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        true
      )

      const whereArgument = repository.findManyAnomaliesWithEntity.mock.calls[0][0].where
      expect(whereArgument.resolved).toBe(true)
    })

    it('should filter by resolved = false', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(0)

      await service.listAnomalies(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        false
      )

      const whereArgument = repository.findManyAnomaliesWithEntity.mock.calls[0][0].where
      expect(whereArgument.resolved).toBe(false)
    })

    it('should not include resolved filter when undefined', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(0)

      await service.listAnomalies(TENANT_ID, 1, 20)

      const whereArgument = repository.findManyAnomaliesWithEntity.mock.calls[0][0].where
      expect(whereArgument.resolved).toBeUndefined()
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(100)

      await service.listAnomalies(TENANT_ID, 4, 15)

      expect(repository.findManyAnomaliesWithEntity).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 45, take: 15 })
      )
    })

    it('should default sort to detectedAt desc', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(0)

      await service.listAnomalies(TENANT_ID, 1, 20)

      const orderByArgument = repository.findManyAnomaliesWithEntity.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ detectedAt: 'desc' })
    })

    it('should sort by score ascending', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(0)

      await service.listAnomalies(TENANT_ID, 1, 20, 'score', 'asc')

      const orderByArgument = repository.findManyAnomaliesWithEntity.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ score: 'asc' })
    })

    it('should handle empty results', async () => {
      repository.findManyAnomaliesWithEntity.mockResolvedValue([])
      repository.countAnomalies.mockResolvedValue(0)

      const result = await service.listAnomalies(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // listModels
  // ---------------------------------------------------------------------------
  describe('listModels', () => {
    it('should return paginated ML models', async () => {
      const models = [
        buildMockModel(),
        buildMockModel({ id: 'model-002', name: 'Lateral Movement Detector' }),
      ]
      repository.findManyModels.mockResolvedValue(models)
      repository.countModels.mockResolvedValue(2)

      const result = await service.listModels(TENANT_ID, 1, 20)

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

    it('should always include tenantId in where clause', async () => {
      repository.findManyModels.mockResolvedValue([])
      repository.countModels.mockResolvedValue(0)

      await service.listModels(TENANT_ID, 1, 20)

      const whereArgument = repository.findManyModels.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe(TENANT_ID)
    })

    it('should filter by status', async () => {
      repository.findManyModels.mockResolvedValue([])
      repository.countModels.mockResolvedValue(0)

      await service.listModels(TENANT_ID, 1, 20, undefined, undefined, 'active')

      const whereArgument = repository.findManyModels.mock.calls[0][0].where
      expect(whereArgument.status).toBe('active')
    })

    it('should filter by modelType', async () => {
      repository.findManyModels.mockResolvedValue([])
      repository.countModels.mockResolvedValue(0)

      await service.listModels(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        'anomaly_detection'
      )

      const whereArgument = repository.findManyModels.mock.calls[0][0].where
      expect(whereArgument.modelType).toBe('anomaly_detection')
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyModels.mockResolvedValue([])
      repository.countModels.mockResolvedValue(60)

      await service.listModels(TENANT_ID, 2, 25)

      expect(repository.findManyModels).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 25, take: 25 })
      )
    })

    it('should default sort to updatedAt desc', async () => {
      repository.findManyModels.mockResolvedValue([])
      repository.countModels.mockResolvedValue(0)

      await service.listModels(TENANT_ID, 1, 20)

      const orderByArgument = repository.findManyModels.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ updatedAt: 'desc' })
    })

    it('should sort by accuracy ascending', async () => {
      repository.findManyModels.mockResolvedValue([])
      repository.countModels.mockResolvedValue(0)

      await service.listModels(TENANT_ID, 1, 20, 'accuracy', 'asc')

      const orderByArgument = repository.findManyModels.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ accuracy: 'asc' })
    })

    it('should sort by lastTrained', async () => {
      repository.findManyModels.mockResolvedValue([])
      repository.countModels.mockResolvedValue(0)

      await service.listModels(TENANT_ID, 1, 20, 'lastTrained', 'desc')

      const orderByArgument = repository.findManyModels.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ lastTrained: 'desc' })
    })

    it('should handle empty results', async () => {
      repository.findManyModels.mockResolvedValue([])
      repository.countModels.mockResolvedValue(0)

      const result = await service.listModels(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // getUebaStats
  // ---------------------------------------------------------------------------
  describe('getUebaStats', () => {
    it('should return aggregated UEBA stats', async () => {
      repository.countEntities
        .mockResolvedValueOnce(100) // totalEntities
        .mockResolvedValueOnce(5) // criticalRiskEntities
        .mockResolvedValueOnce(15) // highRiskEntities
      repository.countAnomalies.mockResolvedValue(42)
      repository.countModels.mockResolvedValue(3)

      const result = await service.getUebaStats(TENANT_ID)

      expect(result).toEqual({
        totalEntities: 100,
        criticalRiskEntities: 5,
        highRiskEntities: 15,
        anomalies24h: 42,
        activeModels: 3,
      })
    })

    it('should filter entities by tenantId', async () => {
      repository.countEntities.mockResolvedValue(0)
      repository.countAnomalies.mockResolvedValue(0)
      repository.countModels.mockResolvedValue(0)

      await service.getUebaStats(TENANT_ID)

      expect(repository.countEntities).toHaveBeenCalledWith({ tenantId: TENANT_ID })
    })

    it('should filter critical entities by riskLevel critical', async () => {
      repository.countEntities.mockResolvedValue(0)
      repository.countAnomalies.mockResolvedValue(0)
      repository.countModels.mockResolvedValue(0)

      await service.getUebaStats(TENANT_ID)

      expect(repository.countEntities).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        riskLevel: 'critical',
      })
    })

    it('should filter high risk entities by riskLevel high', async () => {
      repository.countEntities.mockResolvedValue(0)
      repository.countAnomalies.mockResolvedValue(0)
      repository.countModels.mockResolvedValue(0)

      await service.getUebaStats(TENANT_ID)

      expect(repository.countEntities).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        riskLevel: 'high',
      })
    })

    it('should filter anomalies by last 24 hours', async () => {
      repository.countEntities.mockResolvedValue(0)
      repository.countAnomalies.mockResolvedValue(0)
      repository.countModels.mockResolvedValue(0)

      const before = nowDate()
      await service.getUebaStats(TENANT_ID)

      const anomalyCall = repository.countAnomalies.mock.calls[0][0]
      expect(anomalyCall.tenantId).toBe(TENANT_ID)
      expect(anomalyCall.detectedAt).toBeDefined()
      expect(anomalyCall.detectedAt.gte).toBeInstanceOf(Date)
      const diffMs = before.getTime() - anomalyCall.detectedAt.gte.getTime()
      const twentyFourHoursMs = 24 * 60 * 60 * 1000
      expect(diffMs).toBeGreaterThan(twentyFourHoursMs - 5000)
      expect(diffMs).toBeLessThan(twentyFourHoursMs + 5000)
    })

    it('should filter active models by status active', async () => {
      repository.countEntities.mockResolvedValue(0)
      repository.countAnomalies.mockResolvedValue(0)
      repository.countModels.mockResolvedValue(0)

      await service.getUebaStats(TENANT_ID)

      expect(repository.countModels).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        status: 'active',
      })
    })

    it('should handle all-zero stats', async () => {
      repository.countEntities.mockResolvedValue(0)
      repository.countAnomalies.mockResolvedValue(0)
      repository.countModels.mockResolvedValue(0)

      const result = await service.getUebaStats(TENANT_ID)

      expect(result).toEqual({
        totalEntities: 0,
        criticalRiskEntities: 0,
        highRiskEntities: 0,
        anomalies24h: 0,
        activeModels: 0,
      })
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database connection lost')
      repository.countEntities.mockRejectedValue(dbError)

      try {
        await service.getUebaStats(TENANT_ID)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })
  })
})
