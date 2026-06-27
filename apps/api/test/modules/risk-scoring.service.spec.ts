jest.mock('@prisma/client', () => ({
  PrismaClient: class PrismaClient {},
}))

import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay, nowDate, nowMs } from '../../src/common/utils/date-time.utility'
import { RiskScoringService } from '../../src/modules/entities/risk-scoring.service'

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
    riskScore: 0,
    metadata: {},
    firstSeen: toDay('2026-01-01T00:00:00.000Z').toDate(),
    lastSeen: nowDate(), // recent — within 1 day
    createdAt: toDay('2026-01-01T00:00:00.000Z').toDate(),
    updatedAt: nowDate(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findFirstByIdAndTenant: jest.fn(),
    findRelationsForEntity: jest.fn(),
    findAllByTenant: jest.fn(),
    findAllForRiskScoring: jest.fn(),
    countRelationsPerEntity: jest.fn(),
    updateRiskScore: jest.fn(),
  }
}

function createService(repository: ReturnType<typeof createMockRepository>) {
  return new RiskScoringService(repository as never, mockAppLogger as never)
}

describe('RiskScoringService', () => {
  let repo: ReturnType<typeof createMockRepository>
  let service: RiskScoringService

  beforeEach(() => {
    jest.clearAllMocks()
    repo = createMockRepository()
    service = createService(repo)
  })

  /* ------------------------------------------------------------------ */
  /* calculateRiskScore                                                   */
  /* ------------------------------------------------------------------ */

  describe('calculateRiskScore', () => {
    it('should return base score + type weight + recency for a recent IP entity with no relations', () => {
      const entity = buildEntity({ type: 'ip', lastSeen: nowDate() })

      const score = service.calculateRiskScore(entity as never, 0)

      // base(10) + ip(15) + recency<1day(15) = 40
      expect(score).toBe(40)
    })

    it('should add relation weight (capped at 30)', () => {
      const entity = buildEntity({ type: 'ip', lastSeen: nowDate() })

      const score = service.calculateRiskScore(entity as never, 10)

      // base(10) + relations(min(10*5, 30)=30) + ip(15) + recency(15) = 70
      expect(score).toBe(70)
    })

    it('should cap relation score at 30 even with many relations', () => {
      const entity = buildEntity({ type: 'asset', lastSeen: nowDate() })

      const scoreWith7 = service.calculateRiskScore(entity as never, 7)
      const scoreWith20 = service.calculateRiskScore(entity as never, 20)

      // Relations capped at 30 — so 7*5=30 (capped) and 20*5=100 (capped at 30)
      // Both should have same relation contribution
      // base(10) + rel(30) + asset(5) + recency(15) = 60
      expect(scoreWith7).toBe(60)
      expect(scoreWith20).toBe(60)
    })

    it('should apply higher type weight for hash entities', () => {
      const entity = buildEntity({ type: 'hash', lastSeen: nowDate() })

      const score = service.calculateRiskScore(entity as never, 0)

      // base(10) + hash(20) + recency(15) = 45
      expect(score).toBe(45)
    })

    it('should apply lower recency for entities seen 3 days ago', () => {
      const threeDaysAgo = toDay(nowMs() - 3 * 24 * 60 * 60 * 1000).toDate()
      const entity = buildEntity({ type: 'ip', lastSeen: threeDaysAgo })

      const score = service.calculateRiskScore(entity as never, 0)

      // base(10) + ip(15) + recency<7days(10) = 35
      expect(score).toBe(35)
    })

    it('should apply lower recency for entities seen 15 days ago', () => {
      const fifteenDaysAgo = toDay(nowMs() - 15 * 24 * 60 * 60 * 1000).toDate()
      const entity = buildEntity({ type: 'ip', lastSeen: fifteenDaysAgo })

      const score = service.calculateRiskScore(entity as never, 0)

      // base(10) + ip(15) + recency<30days(5) = 30
      expect(score).toBe(30)
    })

    it('should not add recency score for entities seen 60 days ago', () => {
      const sixtyDaysAgo = toDay(nowMs() - 60 * 24 * 60 * 60 * 1000).toDate()
      const entity = buildEntity({ type: 'ip', lastSeen: sixtyDaysAgo })

      const score = service.calculateRiskScore(entity as never, 0)

      // base(10) + ip(15) + recency(0) = 25
      expect(score).toBe(25)
    })

    it('should cap total score at 100', () => {
      const entity = buildEntity({ type: 'hash', lastSeen: nowDate() })

      const score = service.calculateRiskScore(entity as never, 100)

      // base(10) + rel(30) + hash(20) + recency(15) = 75, capped at 100
      expect(score).toBeLessThanOrEqual(100)
    })

    it('should use fallback weight for unknown entity types', () => {
      const entity = buildEntity({ type: 'custom_unknown', lastSeen: nowDate() })

      const score = service.calculateRiskScore(entity as never, 0)

      // base(10) + unknown(5) + recency(15) = 30
      expect(score).toBe(30)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getEntityRiskBreakdown                                               */
  /* ------------------------------------------------------------------ */

  describe('getEntityRiskBreakdown', () => {
    it('should return factor breakdown for an entity', async () => {
      repo.findFirstByIdAndTenant.mockResolvedValue(
        buildEntity({ type: 'ip', lastSeen: nowDate() })
      )
      repo.findRelationsForEntity.mockResolvedValue([
        { id: 'rel-1', fromEntityId: 'entity-1', toEntityId: 'entity-2' },
        { id: 'rel-2', fromEntityId: 'entity-3', toEntityId: 'entity-1' },
      ])

      const result = await service.getEntityRiskBreakdown('entity-1', TENANT_ID)

      expect(result.entityId).toBe('entity-1')
      expect(result.factors.length).toBeGreaterThanOrEqual(3) // base + type + relations + recency
      expect(result.factors.some(f => f.factor === 'base_existence')).toBe(true)
      expect(result.factors.some(f => f.factor === 'entity_type')).toBe(true)
      expect(result.factors.some(f => f.factor === 'relation_count')).toBe(true)
      expect(result.totalScore).toBeGreaterThan(0)
    })

    it('should throw 404 when entity not found', async () => {
      repo.findFirstByIdAndTenant.mockResolvedValue(null)

      await expect(service.getEntityRiskBreakdown('nonexistent', TENANT_ID)).rejects.toThrow(
        BusinessException
      )

      try {
        await service.getEntityRiskBreakdown('nonexistent', TENANT_ID)
      } catch (error) {
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should not include relation factor when no relations exist', async () => {
      repo.findFirstByIdAndTenant.mockResolvedValue(
        buildEntity({ type: 'ip', lastSeen: nowDate() })
      )
      repo.findRelationsForEntity.mockResolvedValue([])

      const result = await service.getEntityRiskBreakdown('entity-1', TENANT_ID)

      expect(result.factors.some(f => f.factor === 'relation_count')).toBe(false)
    })
  })

  /* ------------------------------------------------------------------ */
  /* recalculateForTenant                                                 */
  /* ------------------------------------------------------------------ */

  describe('recalculateForTenant', () => {
    it('should update entities whose risk score changed using a single grouped relation query', async () => {
      // findAllForRiskScoring returns only the fields the scorer needs
      const entity1 = { id: 'e-1', type: 'ip', lastSeen: nowDate(), riskScore: 10 }
      const entity2 = { id: 'e-2', type: 'ip', lastSeen: nowDate(), riskScore: 40 }

      repo.findAllForRiskScoring.mockResolvedValue([entity1, entity2])
      // countRelationsPerEntity returns zero rows — no relations for either entity
      repo.countRelationsPerEntity.mockResolvedValue([])
      repo.updateRiskScore.mockResolvedValue(undefined)

      const updatedCount = await service.recalculateForTenant(TENANT_ID)

      // entity1: base(10)+ip(15)+recency<1day(15)=40, old=10 → changed → update
      // entity2: same formula → 40, old=40 → unchanged → no update
      expect(updatedCount).toBe(1)
      expect(repo.updateRiskScore).toHaveBeenCalledTimes(1)
      expect(repo.updateRiskScore).toHaveBeenCalledWith('e-1', TENANT_ID, 40)
      // Confirm the old N+1 methods are NOT used
      expect(repo.findAllByTenant).not.toHaveBeenCalled()
      expect(repo.findRelationsForEntity).not.toHaveBeenCalled()
    })

    it('should account for relation counts from the grouped query', async () => {
      const entity = { id: 'e-1', type: 'ip', lastSeen: nowDate(), riskScore: 0 }

      repo.findAllForRiskScoring.mockResolvedValue([entity])
      // Simulate 6 relations — 6*5=30 (capped)
      repo.countRelationsPerEntity.mockResolvedValue([
        { entity_id: 'e-1', relation_count: BigInt(6) },
      ])
      repo.updateRiskScore.mockResolvedValue(undefined)

      const updatedCount = await service.recalculateForTenant(TENANT_ID)

      // base(10)+rel(30)+ip(15)+recency(15)=70
      expect(updatedCount).toBe(1)
      expect(repo.updateRiskScore).toHaveBeenCalledWith('e-1', TENANT_ID, 70)
    })
  })
})
