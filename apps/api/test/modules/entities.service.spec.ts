jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { EntitiesService } from '../../src/modules/entities/entities.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-1'

function buildEntity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'entity-1',
    tenantId: TENANT_ID,
    type: 'ip',
    value: '192.168.1.100',
    displayName: 'Workstation-1',
    riskScore: 45,
    metadata: {},
    firstSeen: toDay('2026-01-01T00:00:00.000Z').toDate(),
    lastSeen: toDay('2026-03-15T00:00:00.000Z').toDate(),
    createdAt: toDay('2026-01-01T00:00:00.000Z').toDate(),
    updatedAt: toDay('2026-03-15T00:00:00.000Z').toDate(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findManyAndCount: jest.fn(),
    findFirstByIdAndTenant: jest.fn(),
    findByTypeAndValue: jest.fn(),
    create: jest.fn(),
    updateByIdAndTenant: jest.fn(),
    findRelationsForEntity: jest.fn(),
    findConnectedEntities: jest.fn(),
    findTopRisky: jest.fn(),
  }
}

function createService(repository: ReturnType<typeof createMockRepository>) {
  return new EntitiesService(repository as never, mockAppLogger as never)
}

describe('EntitiesService', () => {
  let repo: ReturnType<typeof createMockRepository>
  let service: EntitiesService

  beforeEach(() => {
    jest.clearAllMocks()
    repo = createMockRepository()
    service = createService(repo)
  })

  /* ------------------------------------------------------------------ */
  /* list                                                                 */
  /* ------------------------------------------------------------------ */

  describe('list', () => {
    it('should return paginated entities', async () => {
      const entities = [buildEntity(), buildEntity({ id: 'entity-2', value: '10.0.0.1' })]
      repo.findManyAndCount.mockResolvedValue([entities, 2])

      const query = { page: 1, limit: 20, sortBy: 'createdAt' as const, sortOrder: 'desc' as const }
      const result = await service.list(TENANT_ID, query as never)

      expect(repo.findManyAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        })
      )
      expect(result.data).toHaveLength(2)
      expect(result.pagination).toBeDefined()
      expect(result.pagination.total).toBe(2)
    })

    it('should apply correct skip for page 2', async () => {
      repo.findManyAndCount.mockResolvedValue([[], 0])

      const query = { page: 2, limit: 10, sortBy: 'createdAt' as const, sortOrder: 'desc' as const }
      await service.list(TENANT_ID, query as never)

      expect(repo.findManyAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* create                                                               */
  /* ------------------------------------------------------------------ */

  describe('create', () => {
    it('should create an entity when no duplicate exists', async () => {
      repo.findByTypeAndValue.mockResolvedValue(null)
      const newEntity = buildEntity({ id: 'entity-new' })
      repo.create.mockResolvedValue(newEntity)

      const dto = { type: 'ip', value: '192.168.1.100', displayName: 'New Entity' }
      const result = await service.create(TENANT_ID, dto as never)

      expect(repo.findByTypeAndValue).toHaveBeenCalledWith(TENANT_ID, 'ip', '192.168.1.100')
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ip',
          value: '192.168.1.100',
          displayName: 'New Entity',
        })
      )
      expect(result.id).toBe('entity-new')
    })

    it('should throw 409 when duplicate entity exists', async () => {
      repo.findByTypeAndValue.mockResolvedValue(buildEntity())

      const dto = { type: 'ip', value: '192.168.1.100', displayName: 'Dup' }

      await expect(service.create(TENANT_ID, dto as never)).rejects.toThrow(BusinessException)

      try {
        await service.create(TENANT_ID, dto as never)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(409)
        expect((error as BusinessException).messageKey).toBe('errors.entities.alreadyExists')
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* findById                                                             */
  /* ------------------------------------------------------------------ */

  describe('findById', () => {
    it('should return entity when found', async () => {
      repo.findFirstByIdAndTenant.mockResolvedValue(buildEntity())

      const result = await service.findById(TENANT_ID, 'entity-1')

      expect(result.id).toBe('entity-1')
    })

    it('should throw 404 when entity not found', async () => {
      repo.findFirstByIdAndTenant.mockResolvedValue(null)

      await expect(service.findById(TENANT_ID, 'nonexistent')).rejects.toThrow(BusinessException)

      try {
        await service.findById(TENANT_ID, 'nonexistent')
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
        expect((error as BusinessException).messageKey).toBe('errors.entities.notFound')
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* getGraph                                                             */
  /* ------------------------------------------------------------------ */

  describe('getGraph', () => {
    it('should return entity with relations (nodes and edges)', async () => {
      const rootEntity = buildEntity()
      const relatedEntity = buildEntity({ id: 'entity-2', value: '10.0.0.1' })

      repo.findFirstByIdAndTenant.mockResolvedValue(rootEntity)
      repo.findRelationsForEntity.mockResolvedValue([
        {
          id: 'rel-1',
          fromEntityId: 'entity-1',
          toEntityId: 'entity-2',
          relationType: 'communicates_with',
          confidence: 0.9,
          source: 'network',
        },
      ])
      repo.findConnectedEntities.mockResolvedValue([rootEntity, relatedEntity])

      const result = await service.getGraph(TENANT_ID, 'entity-1')

      expect(result.rootEntity.id).toBe('entity-1')
      expect(result.nodes).toHaveLength(2)
      expect(result.edges).toHaveLength(1)
      expect(result.edges[0]?.relationType).toBe('communicates_with')
    })

    it('should throw 404 when root entity not found', async () => {
      repo.findFirstByIdAndTenant.mockResolvedValue(null)

      await expect(service.getGraph(TENANT_ID, 'nonexistent')).rejects.toThrow(BusinessException)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getTopRisky                                                          */
  /* ------------------------------------------------------------------ */

  describe('getTopRisky', () => {
    it('should return top N entities by risk score', async () => {
      const risky = [
        buildEntity({ id: 'e-1', riskScore: 95 }),
        buildEntity({ id: 'e-2', riskScore: 88 }),
      ]
      repo.findTopRisky.mockResolvedValue(risky)

      const result = await service.getTopRisky(TENANT_ID, 10)

      expect(repo.findTopRisky).toHaveBeenCalledWith(TENANT_ID, 10)
      expect(result).toHaveLength(2)
    })

    it('should default to limit 10', async () => {
      repo.findTopRisky.mockResolvedValue([])

      await service.getTopRisky(TENANT_ID)

      expect(repo.findTopRisky).toHaveBeenCalledWith(TENANT_ID, 10)
    })
  })
})
