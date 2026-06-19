import { DetectionRuleStatus } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { DetectionRulesService } from '../../src/modules/detection-rules/detection-rules.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const RULE_ID = 'rule-001'
const USER_EMAIL = 'analyst@auraspear.com'

function buildMockUser() {
  return {
    sub: 'user-001',
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'SOC_ANALYST',
  }
}

function buildMockRule(overrides: Record<string, unknown> = {}) {
  return {
    id: RULE_ID,
    tenantId: TENANT_ID,
    ruleNumber: 'DR-0001',
    name: 'Brute Force Detection',
    description: 'Detects brute force login attempts',
    ruleType: 'threshold',
    severity: 'high',
    status: DetectionRuleStatus.ACTIVE,
    conditions: { threshold: 5, timeWindowMinutes: 10 },
    actions: { notify: true, blockIp: false },
    hitCount: 42,
    falsePositiveCount: 3,
    lastTriggeredAt: toDay('2025-06-01T12:00:00Z').toDate(),
    createdBy: USER_EMAIL,
    createdAt: toDay('2025-05-01T00:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    count: jest.fn(),
    countByStatus: jest.fn(),
    aggregateHitCount: jest.fn(),
    createInTransaction: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  }
}

describe('DetectionRulesService', () => {
  let service: DetectionRulesService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new DetectionRulesService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listRules
  // ---------------------------------------------------------------------------
  describe('listRules', () => {
    it('should return paginated detection rules', async () => {
      const rules = [buildMockRule(), buildMockRule({ id: 'rule-002', ruleNumber: 'DR-0002' })]
      repository.findMany.mockResolvedValue(rules)
      repository.count.mockResolvedValue(2)

      const result = await service.listRules(TENANT_ID)

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

    it('should filter by ruleType', async () => {
      repository.findMany.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listRules(TENANT_ID, 1, 20, undefined, undefined, 'threshold')

      const whereArgument = repository.findMany.mock.calls[0][0].where
      expect(whereArgument.ruleType).toBe('threshold')
    })

    it('should filter by severity', async () => {
      repository.findMany.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listRules(TENANT_ID, 1, 20, undefined, undefined, undefined, 'critical')

      const whereArgument = repository.findMany.mock.calls[0][0].where
      expect(whereArgument.severity).toBe('critical')
    })

    it('should filter by status', async () => {
      repository.findMany.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listRules(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        'active'
      )

      const whereArgument = repository.findMany.mock.calls[0][0].where
      expect(whereArgument.status).toBe('active')
    })

    it('should filter by query across name, ruleNumber, description', async () => {
      repository.findMany.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listRules(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'brute'
      )

      const whereArgument = repository.findMany.mock.calls[0][0].where
      expect(whereArgument.OR).toEqual([
        { name: { contains: 'brute', mode: 'insensitive' } },
        { ruleNumber: { contains: 'brute', mode: 'insensitive' } },
        { description: { contains: 'brute', mode: 'insensitive' } },
      ])
    })

    it('should handle empty results', async () => {
      repository.findMany.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      const result = await service.listRules(TENANT_ID)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findMany.mockResolvedValue([])
      repository.count.mockResolvedValue(100)

      await service.listRules(TENANT_ID, 3, 10)

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should enforce tenant isolation', async () => {
      repository.findMany.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listRules('other-tenant')

      const whereArgument = repository.findMany.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getRuleById
  // ---------------------------------------------------------------------------
  describe('getRuleById', () => {
    it('should return rule when found', async () => {
      repository.findFirst.mockResolvedValue(buildMockRule())

      const result = await service.getRuleById(RULE_ID, TENANT_ID)

      expect(result.id).toBe(RULE_ID)
      expect(result.ruleNumber).toBe('DR-0001')
      expect(result.hitCount).toBe(42)
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirst.mockResolvedValue(null)

      try {
        await service.getRuleById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should enforce tenant isolation', async () => {
      repository.findFirst.mockResolvedValue(null)

      try {
        await service.getRuleById(RULE_ID, 'other-tenant')
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
      }

      expect(repository.findFirst).toHaveBeenCalledWith({
        where: { id: RULE_ID, tenantId: 'other-tenant' },
      })
    })
  })

  // ---------------------------------------------------------------------------
  // createRule
  // ---------------------------------------------------------------------------
  describe('createRule', () => {
    it('should create a rule with TESTING status', async () => {
      const created = buildMockRule({ status: DetectionRuleStatus.TESTING })
      repository.createInTransaction.mockResolvedValue(created)

      const dto = {
        name: 'Brute Force Detection',
        ruleType: 'threshold',
        severity: 'high',
        conditions: { threshold: 5 },
        actions: { notify: true },
      }

      const result = await service.createRule(dto as never, buildMockUser() as never)

      expect(result.status).toBe(DetectionRuleStatus.TESTING)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should use user tenantId and email', async () => {
      repository.createInTransaction.mockResolvedValue(buildMockRule())

      const dto = {
        name: 'Test Rule',
        ruleType: 'threshold',
        severity: 'medium',
        conditions: {},
        actions: {},
      }

      await service.createRule(dto as never, buildMockUser() as never)

      const createArgument = repository.createInTransaction.mock.calls[0][0]
      expect(createArgument.tenantId).toBe(TENANT_ID)
      expect(createArgument.createdBy).toBe(USER_EMAIL)
    })

    it('should set status to TESTING by default', async () => {
      repository.createInTransaction.mockResolvedValue(buildMockRule())

      const dto = {
        name: 'Test',
        ruleType: 'threshold',
        severity: 'low',
        conditions: {},
        actions: {},
      }

      await service.createRule(dto as never, buildMockUser() as never)

      const createArgument = repository.createInTransaction.mock.calls[0][0]
      expect(createArgument.status).toBe(DetectionRuleStatus.TESTING)
    })
  })

  // ---------------------------------------------------------------------------
  // updateRule
  // ---------------------------------------------------------------------------
  describe('updateRule', () => {
    it('should update rule fields', async () => {
      const existing = buildMockRule()
      repository.findFirst.mockResolvedValue(existing)
      repository.updateMany.mockResolvedValue({ count: 1 })

      const dto = { name: 'Updated Rule Name' }
      const result = await service.updateRule(RULE_ID, dto as never, buildMockUser() as never)

      expect(result).toBeDefined()
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when rule does not exist', async () => {
      repository.findFirst.mockResolvedValue(null)

      try {
        await service.updateRule('nonexistent', {} as never, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 404 when updateMany returns count 0', async () => {
      const existing = buildMockRule()
      repository.findFirst.mockResolvedValueOnce(existing).mockResolvedValueOnce(null)
      repository.updateMany.mockResolvedValue({ count: 0 })

      try {
        await service.updateRule(RULE_ID, { name: 'Test' } as never, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // deleteRule
  // ---------------------------------------------------------------------------
  describe('deleteRule', () => {
    it('should delete a rule and return deleted: true', async () => {
      repository.findFirst.mockResolvedValue(buildMockRule())
      repository.deleteMany.mockResolvedValue({ count: 1 })

      const result = await service.deleteRule(RULE_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteMany).toHaveBeenCalledWith({ id: RULE_ID, tenantId: TENANT_ID })
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when rule does not exist', async () => {
      repository.findFirst.mockResolvedValue(null)

      try {
        await service.deleteRule('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // getDetectionRuleStats
  // ---------------------------------------------------------------------------
  describe('getDetectionRuleStats', () => {
    it('should return aggregated stats', async () => {
      repository.count.mockResolvedValue(25)
      repository.countByStatus
        .mockResolvedValueOnce(15) // active
        .mockResolvedValueOnce(7) // testing
        .mockResolvedValueOnce(3) // disabled
      repository.aggregateHitCount.mockResolvedValue({
        _sum: { hitCount: 1200 },
      })

      const result = await service.getDetectionRuleStats(TENANT_ID)

      expect(result.totalRules).toBe(25)
      expect(result.activeRules).toBe(15)
      expect(result.testingRules).toBe(7)
      expect(result.disabledRules).toBe(3)
      expect(result.totalMatches).toBe(1200)
    })

    it('should handle null hitCount sum', async () => {
      repository.count.mockResolvedValue(0)
      repository.countByStatus.mockResolvedValue(0)
      repository.aggregateHitCount.mockResolvedValue({
        _sum: { hitCount: null },
      })

      const result = await service.getDetectionRuleStats(TENANT_ID)

      expect(result.totalMatches).toBe(0)
    })

    it('should enforce tenant isolation', async () => {
      repository.count.mockResolvedValue(0)
      repository.countByStatus.mockResolvedValue(0)
      repository.aggregateHitCount.mockResolvedValue({
        _sum: { hitCount: null },
      })

      await service.getDetectionRuleStats('other-tenant')

      expect(repository.count).toHaveBeenCalledWith({ tenantId: 'other-tenant' })
      expect(repository.aggregateHitCount).toHaveBeenCalledWith('other-tenant')
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database error')
      repository.count.mockRejectedValue(dbError)

      try {
        await service.getDetectionRuleStats(TENANT_ID)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })
  })
})
