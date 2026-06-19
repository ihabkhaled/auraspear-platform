import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { AttackPathsService } from '../../src/modules/attack-paths/attack-paths.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    findMany: jest.fn(),
    findManyWithTenant: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    findFirstWithTenant: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    aggregateSum: jest.fn(),
    aggregateAvg: jest.fn(),
    createWithNumber: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'
const PATH_ID = 'path-001'
const USER_EMAIL = 'analyst@auraspear.com'
const USER_SUB = 'user-001'

function buildMockUser(overrides: Record<string, unknown> = {}) {
  return {
    sub: USER_SUB,
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'ADMIN',
    ...overrides,
  }
}

function buildMockPath(overrides: Record<string, unknown> = {}) {
  return {
    id: PATH_ID,
    tenantId: TENANT_ID,
    pathNumber: 'AP-0001',
    title: 'Lateral Movement via Compromised Credentials',
    description: 'Attacker uses stolen credentials to move laterally through the network',
    severity: 'critical',
    status: 'active',
    stages: [
      { name: 'Initial Access', technique: 'T1078' },
      { name: 'Lateral Movement', technique: 'T1021' },
    ],
    affectedAssets: 12,
    killChainCoverage: 75,
    mitreTactics: ['Initial Access', 'Lateral Movement'],
    mitreTechniques: ['T1078', 'T1021'],
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function buildMockPathWithTenant(overrides: Record<string, unknown> = {}) {
  return {
    ...buildMockPath(overrides),
    tenant: { name: 'AuraSpear Corp' },
  }
}

describe('AttackPathsService', () => {
  let service: AttackPathsService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new AttackPathsService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listPaths
  // ---------------------------------------------------------------------------
  describe('listPaths', () => {
    it('should return paginated results with tenantName', async () => {
      const paths = [
        buildMockPathWithTenant(),
        buildMockPathWithTenant({ id: 'path-002', pathNumber: 'AP-0002' }),
      ]
      repository.findManyWithTenant.mockResolvedValue(paths)
      repository.count.mockResolvedValue(2)

      const result = await service.listPaths(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(2)
      expect(result.data[0]).toHaveProperty('tenantName', 'AuraSpear Corp')
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
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listPaths(TENANT_ID, 1, 20)

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe(TENANT_ID)
    })

    it('should filter by severity', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listPaths(TENANT_ID, 1, 20, undefined, undefined, 'critical')

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0].where
      expect(whereArgument.severity).toBe('critical')
    })

    it('should filter by status', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listPaths(TENANT_ID, 1, 20, undefined, undefined, undefined, 'mitigated')

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0].where
      expect(whereArgument.status).toBe('mitigated')
    })

    it('should filter by query with case-insensitive search on title, pathNumber, description', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listPaths(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        'lateral'
      )

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0].where
      expect(whereArgument.OR).toEqual([
        { title: { contains: 'lateral', mode: 'insensitive' } },
        { pathNumber: { contains: 'lateral', mode: 'insensitive' } },
        { description: { contains: 'lateral', mode: 'insensitive' } },
      ])
    })

    it('should not apply query filter for whitespace-only string', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listPaths(TENANT_ID, 1, 20, undefined, undefined, undefined, undefined, '  ')

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0].where
      expect(whereArgument.OR).toBeUndefined()
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(100)

      await service.listPaths(TENANT_ID, 3, 10)

      expect(repository.findManyWithTenant).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should handle empty results', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      const result = await service.listPaths(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('should sort by severity ascending', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listPaths(TENANT_ID, 1, 20, 'severity', 'asc')

      const orderByArgument = repository.findManyWithTenant.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ severity: 'asc' })
    })

    it('should default sort to createdAt desc', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listPaths(TENANT_ID, 1, 20)

      const orderByArgument = repository.findManyWithTenant.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ createdAt: 'desc' })
    })

    it('should sort by killChainCoverage', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listPaths(TENANT_ID, 1, 20, 'killChainCoverage', 'desc')

      const orderByArgument = repository.findManyWithTenant.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ killChainCoverage: 'desc' })
    })

    it('should sort by pathNumber', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listPaths(TENANT_ID, 1, 20, 'pathNumber', 'asc')

      const orderByArgument = repository.findManyWithTenant.mock.calls[0][0].orderBy
      expect(orderByArgument).toEqual({ pathNumber: 'asc' })
    })

    it('should calculate hasNext and hasPrev correctly', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(50)

      const result = await service.listPaths(TENANT_ID, 2, 10)

      expect(result.pagination.hasNext).toBe(true)
      expect(result.pagination.hasPrev).toBe(true)
      expect(result.pagination.totalPages).toBe(5)
    })
  })

  // ---------------------------------------------------------------------------
  // getPathById
  // ---------------------------------------------------------------------------
  describe('getPathById', () => {
    it('should return attack path record with tenantName when found', async () => {
      repository.findFirstWithTenant.mockResolvedValue(buildMockPathWithTenant())

      const result = await service.getPathById(PATH_ID, TENANT_ID)

      expect(result).toHaveProperty('tenantName', 'AuraSpear Corp')
      expect(result.title).toBe('Lateral Movement via Compromised Credentials')
    })

    it('should query with both id and tenantId for tenant isolation', async () => {
      repository.findFirstWithTenant.mockResolvedValue(buildMockPathWithTenant())

      await service.getPathById(PATH_ID, TENANT_ID)

      expect(repository.findFirstWithTenant).toHaveBeenCalledWith({
        id: PATH_ID,
        tenantId: TENANT_ID,
      })
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstWithTenant.mockResolvedValue(null)

      try {
        await service.getPathById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should log warning when path not found', async () => {
      repository.findFirstWithTenant.mockResolvedValue(null)

      try {
        await service.getPathById('nonexistent', TENANT_ID)
      } catch {
        // expected
      }

      expect(mockAppLogger.warn).toHaveBeenCalledWith(
        'AttackPathsService => Attack path not found',
        expect.objectContaining({
          action: 'getPathById',
          className: 'AttackPathsService',
          metadata: expect.objectContaining({
            attackPathId: 'nonexistent',
          }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // createPath
  // ---------------------------------------------------------------------------
  describe('createPath', () => {
    const createDto = {
      title: 'New Attack Path',
      description: 'A newly discovered attack path',
      severity: 'high' as const,
      stages: [{ name: 'Reconnaissance', technique: 'T1595' }],
      affectedAssets: 5,
      killChainCoverage: 40,
      mitreTactics: ['Reconnaissance'],
      mitreTechniques: ['T1595'],
    }

    it('should create attack path and return record with tenantName', async () => {
      const createdPath = buildMockPathWithTenant({
        title: 'New Attack Path',
        severity: 'high',
        pathNumber: 'AP-0003',
      })
      repository.createWithNumber.mockResolvedValue(createdPath)

      const result = await service.createPath(createDto, buildMockUser() as never)

      expect(result.title).toBe('New Attack Path')
      expect(result).toHaveProperty('tenantName', 'AuraSpear Corp')
    })

    it('should pass correct data to repository', async () => {
      repository.createWithNumber.mockResolvedValue(buildMockPathWithTenant())

      await service.createPath(createDto, buildMockUser() as never)

      expect(repository.createWithNumber).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        data: expect.objectContaining({
          title: 'New Attack Path',
          description: 'A newly discovered attack path',
          severity: 'high',
          status: 'active',
          stages: createDto.stages,
          affectedAssets: 5,
          killChainCoverage: 40,
          mitreTactics: ['Reconnaissance'],
          mitreTechniques: ['T1595'],
        }),
      })
    })

    it('should set initial status to active', async () => {
      repository.createWithNumber.mockResolvedValue(buildMockPathWithTenant())

      await service.createPath(createDto, buildMockUser() as never)

      expect(repository.createWithNumber).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'active' }),
        })
      )
    })

    it('should set description to null when not provided', async () => {
      repository.createWithNumber.mockResolvedValue(buildMockPathWithTenant())

      const dtoWithoutDescription = {
        title: 'Path',
        severity: 'low' as const,
        stages: [],
        affectedAssets: 0,
        killChainCoverage: 0,
      }
      await service.createPath(dtoWithoutDescription, buildMockUser() as never)

      expect(repository.createWithNumber).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        })
      )
    })

    it('should default mitreTactics and mitreTechniques to empty arrays', async () => {
      repository.createWithNumber.mockResolvedValue(buildMockPathWithTenant())

      const dtoWithoutMitre = {
        title: 'Path',
        severity: 'low' as const,
        stages: [],
        affectedAssets: 0,
        killChainCoverage: 0,
      }
      await service.createPath(dtoWithoutMitre, buildMockUser() as never)

      expect(repository.createWithNumber).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            mitreTactics: [],
            mitreTechniques: [],
          }),
        })
      )
    })

    it('should log info on successful creation', async () => {
      const createdPath = buildMockPathWithTenant({ pathNumber: 'AP-0003' })
      repository.createWithNumber.mockResolvedValue(createdPath)

      await service.createPath(createDto, buildMockUser() as never)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'AttackPathsService => createPath completed',
        expect.objectContaining({
          action: 'createPath',
          tenantId: TENANT_ID,
          outcome: 'success',
          metadata: expect.objectContaining({ pathNumber: 'AP-0003' }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // updatePath
  // ---------------------------------------------------------------------------
  describe('updatePath', () => {
    it('should update attack path and return updated record', async () => {
      // getPathById called first, then updateMany, then getPathById again
      repository.findFirstWithTenant
        .mockResolvedValueOnce(buildMockPathWithTenant())
        .mockResolvedValueOnce(buildMockPathWithTenant({ title: 'Updated Title' }))
      repository.updateMany.mockResolvedValue({ count: 1 })

      const result = await service.updatePath(
        PATH_ID,
        { title: 'Updated Title' },
        buildMockUser() as never
      )

      expect(result.title).toBe('Updated Title')
    })

    it('should throw BusinessException 404 when path does not exist', async () => {
      repository.findFirstWithTenant.mockResolvedValue(null)

      try {
        await service.updatePath('nonexistent', { title: 'Updated' }, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 404 when updateMany returns count 0', async () => {
      repository.findFirstWithTenant.mockResolvedValue(buildMockPathWithTenant())
      repository.updateMany.mockResolvedValue({ count: 0 })

      try {
        await service.updatePath(PATH_ID, { title: 'Updated' }, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should only include provided fields in update data', async () => {
      repository.findFirstWithTenant
        .mockResolvedValueOnce(buildMockPathWithTenant())
        .mockResolvedValueOnce(buildMockPathWithTenant())
      repository.updateMany.mockResolvedValue({ count: 1 })

      await service.updatePath(PATH_ID, { severity: 'low' }, buildMockUser() as never)

      const updateCall = repository.updateMany.mock.calls[0][0]
      expect(updateCall.data).toEqual({ severity: 'low' })
      expect(updateCall.where).toEqual({ id: PATH_ID, tenantId: TENANT_ID })
    })

    it('should pass all update fields when provided', async () => {
      repository.findFirstWithTenant
        .mockResolvedValueOnce(buildMockPathWithTenant())
        .mockResolvedValueOnce(buildMockPathWithTenant())
      repository.updateMany.mockResolvedValue({ count: 1 })

      const dto = {
        title: 'New Title',
        description: 'New Desc',
        severity: 'medium' as const,
        status: 'mitigated' as const,
        stages: [{ name: 'Stage 1' }],
        affectedAssets: 20,
        killChainCoverage: 90,
        mitreTactics: ['Discovery'],
        mitreTechniques: ['T1046'],
      }

      await service.updatePath(PATH_ID, dto, buildMockUser() as never)

      const updateCall = repository.updateMany.mock.calls[0][0]
      expect(updateCall.data).toEqual({
        title: 'New Title',
        description: 'New Desc',
        severity: 'medium',
        status: 'mitigated',
        stages: [{ name: 'Stage 1' }],
        affectedAssets: 20,
        killChainCoverage: 90,
        mitreTactics: ['Discovery'],
        mitreTechniques: ['T1046'],
      })
    })

    it('should log info on successful update', async () => {
      repository.findFirstWithTenant
        .mockResolvedValueOnce(buildMockPathWithTenant())
        .mockResolvedValueOnce(buildMockPathWithTenant())
      repository.updateMany.mockResolvedValue({ count: 1 })

      await service.updatePath(PATH_ID, { title: 'Updated' }, buildMockUser() as never)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'AttackPathsService => updatePath completed',
        expect.objectContaining({
          action: 'updatePath',
          tenantId: TENANT_ID,
          outcome: 'success',
          metadata: expect.objectContaining({ attackPathId: PATH_ID }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // deletePath
  // ---------------------------------------------------------------------------
  describe('deletePath', () => {
    it('should delete path and return { deleted: true }', async () => {
      repository.findFirstWithTenant.mockResolvedValue(buildMockPathWithTenant())
      repository.deleteMany.mockResolvedValue({ count: 1 })

      const result = await service.deletePath(PATH_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteMany).toHaveBeenCalledWith({ id: PATH_ID, tenantId: TENANT_ID })
    })

    it('should throw BusinessException 404 when path does not exist', async () => {
      repository.findFirstWithTenant.mockResolvedValue(null)

      try {
        await service.deletePath('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should log info on successful deletion', async () => {
      repository.findFirstWithTenant.mockResolvedValue(
        buildMockPathWithTenant({ pathNumber: 'AP-0001' })
      )
      repository.deleteMany.mockResolvedValue({ count: 1 })

      await service.deletePath(PATH_ID, TENANT_ID, USER_EMAIL)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'AttackPathsService => deletePath completed',
        expect.objectContaining({
          action: 'deletePath',
          tenantId: TENANT_ID,
          outcome: 'success',
          metadata: expect.objectContaining({
            pathNumber: 'AP-0001',
            attackPathId: PATH_ID,
            actorEmail: USER_EMAIL,
          }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getAttackPathStats
  // ---------------------------------------------------------------------------
  describe('getAttackPathStats', () => {
    it('should return aggregated attack path stats', async () => {
      repository.count.mockResolvedValue(8)
      repository.aggregateSum.mockResolvedValue({ _sum: { affectedAssets: 45 } })
      repository.aggregateAvg.mockResolvedValue({ _avg: { killChainCoverage: 62.3456 } })

      const result = await service.getAttackPathStats(TENANT_ID)

      expect(result).toEqual({
        activePaths: 8,
        assetsAtRisk: 45,
        avgKillChainCoverage: 62.35,
      })
    })

    it('should filter active paths by tenantId and status active', async () => {
      repository.count.mockResolvedValue(0)
      repository.aggregateSum.mockResolvedValue({ _sum: {} })
      repository.aggregateAvg.mockResolvedValue({ _avg: {} })

      await service.getAttackPathStats(TENANT_ID)

      expect(repository.count).toHaveBeenCalledWith({
        tenantId: TENANT_ID,
        status: 'active',
      })
    })

    it('should aggregate sum of affectedAssets for active paths only', async () => {
      repository.count.mockResolvedValue(0)
      repository.aggregateSum.mockResolvedValue({ _sum: {} })
      repository.aggregateAvg.mockResolvedValue({ _avg: {} })

      await service.getAttackPathStats(TENANT_ID)

      expect(repository.aggregateSum).toHaveBeenCalledWith(
        { tenantId: TENANT_ID, status: 'active' },
        { affectedAssets: true }
      )
    })

    it('should aggregate avg of killChainCoverage for all paths', async () => {
      repository.count.mockResolvedValue(0)
      repository.aggregateSum.mockResolvedValue({ _sum: {} })
      repository.aggregateAvg.mockResolvedValue({ _avg: {} })

      await service.getAttackPathStats(TENANT_ID)

      expect(repository.aggregateAvg).toHaveBeenCalledWith(
        { tenantId: TENANT_ID },
        { killChainCoverage: true }
      )
    })

    it('should handle null aggregation sums', async () => {
      repository.count.mockResolvedValue(0)
      repository.aggregateSum.mockResolvedValue({ _sum: { affectedAssets: null } })
      repository.aggregateAvg.mockResolvedValue({ _avg: { killChainCoverage: null } })

      const result = await service.getAttackPathStats(TENANT_ID)

      expect(result.assetsAtRisk).toBe(0)
      expect(result.avgKillChainCoverage).toBe(0)
    })

    it('should handle empty _sum and _avg objects', async () => {
      repository.count.mockResolvedValue(0)
      repository.aggregateSum.mockResolvedValue({ _sum: {} })
      repository.aggregateAvg.mockResolvedValue({ _avg: {} })

      const result = await service.getAttackPathStats(TENANT_ID)

      expect(result.assetsAtRisk).toBe(0)
      expect(result.avgKillChainCoverage).toBe(0)
    })

    it('should round avgKillChainCoverage to 2 decimal places', async () => {
      repository.count.mockResolvedValue(0)
      repository.aggregateSum.mockResolvedValue({ _sum: { affectedAssets: 0 } })
      repository.aggregateAvg.mockResolvedValue({ _avg: { killChainCoverage: 33.3333333 } })

      const result = await service.getAttackPathStats(TENANT_ID)

      expect(result.avgKillChainCoverage).toBe(33.33)
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database connection lost')
      repository.count.mockRejectedValue(dbError)

      try {
        await service.getAttackPathStats(TENANT_ID)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })
  })
})
