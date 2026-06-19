import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { CorrelationService } from '../../src/modules/correlation/correlation.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const RULE_ID = 'rule-001'
const USER_EMAIL = 'analyst@auraspear.com'
const USER_ID = 'user-001'

function buildMockJwtPayload(overrides: Record<string, unknown> = {}) {
  return {
    sub: USER_ID,
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'ADMIN',
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findMany: jest.fn(),
    findManyWithTenant: jest.fn(),
    count: jest.fn(),
    findFirstWithTenant: jest.fn(),
    findFirstSelect: jest.fn(),
    create: jest.fn(),
    createWithTenant: jest.fn(),
    update: jest.fn(),
    updateWithTenant: jest.fn(),
    deleteByIdAndTenantId: jest.fn(),
    aggregate: jest.fn(),
    findUsersByEmails: jest.fn(),
    findUserNameByEmail: jest.fn(),
    findLastRuleByPrefix: jest.fn(),
  }
}

function buildMockRule(overrides: Record<string, unknown> = {}) {
  return {
    id: RULE_ID,
    tenantId: TENANT_ID,
    ruleNumber: 'COR-0001',
    title: 'Brute Force Detection',
    description: 'Detects multiple failed login attempts',
    source: 'custom',
    severity: 'high',
    status: 'active',
    yamlContent: 'title: brute-force\ndetection: ...',
    mitreTactics: ['Credential Access'],
    mitreTechniques: ['T1110'],
    hitCount: 0,
    linkedIncidents: 0,
    lastFiredAt: null,
    createdBy: USER_EMAIL,
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    tenant: { name: 'Test Tenant' },
    ...overrides,
  }
}

describe('CorrelationService', () => {
  let service: CorrelationService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new CorrelationService(
      repository as never,
      mockAppLogger as never,
      {
        evaluateRule: jest
          .fn()
          .mockResolvedValue({ status: 'no_match', eventsCorrelated: 0, durationMs: 0 }),
      } as never
    )
  })

  // ---------------------------------------------------------------------------
  // listRules
  // ---------------------------------------------------------------------------
  describe('listRules', () => {
    it('should return paginated results with data and pagination meta', async () => {
      const rules = [buildMockRule(), buildMockRule({ id: 'rule-002', ruleNumber: 'COR-0002' })]
      repository.findManyWithTenant.mockResolvedValue(rules)
      repository.count.mockResolvedValue(2)
      repository.findUsersByEmails.mockResolvedValue([{ email: USER_EMAIL, name: 'Test Analyst' }])

      const result = await service.listRules(TENANT_ID, 1, 20, 'createdAt', 'desc')

      expect(result.data).toHaveLength(2)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
      expect(repository.findManyWithTenant).toHaveBeenCalledTimes(1)
      expect(repository.count).toHaveBeenCalledTimes(1)
    })

    it('should always include tenantId in where clause', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listRules(TENANT_ID, 1, 20, 'createdAt', 'desc')

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.tenantId).toBe(TENANT_ID)
    })

    it('should filter by comma-separated sources', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listRules(TENANT_ID, 1, 20, 'createdAt', 'desc', 'sigma,custom')

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.source).toEqual({ in: ['sigma', 'custom'] })
    })

    it('should filter by comma-separated severities', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listRules(TENANT_ID, 1, 20, 'createdAt', 'desc', undefined, 'critical,high')

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.severity).toEqual({ in: ['critical', 'high'] })
    })

    it('should filter by comma-separated statuses', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listRules(
        TENANT_ID,
        1,
        20,
        'createdAt',
        'desc',
        undefined,
        undefined,
        'active,review'
      )

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.status).toEqual({ in: ['active', 'review'] })
    })

    it('should apply free text search across title, description, ruleNumber', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listRules(
        TENANT_ID,
        1,
        20,
        'createdAt',
        'desc',
        undefined,
        undefined,
        undefined,
        'brute'
      )

      const callArguments = repository.findManyWithTenant.mock.calls[0][0]
      expect(callArguments.where.OR).toBeDefined()
      expect(callArguments.where.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            title: { contains: 'brute', mode: 'insensitive' },
          }),
          expect.objectContaining({
            description: { contains: 'brute', mode: 'insensitive' },
          }),
          expect.objectContaining({
            ruleNumber: { contains: 'brute', mode: 'insensitive' },
          }),
        ])
      )
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(100)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listRules(TENANT_ID, 3, 10, 'createdAt', 'desc')

      expect(repository.findManyWithTenant).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should handle empty results', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      const result = await service.listRules(TENANT_ID, 1, 20, 'createdAt', 'desc')

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('should resolve creator names from user IDs', async () => {
      const rules = [buildMockRule()]
      repository.findManyWithTenant.mockResolvedValue(rules)
      repository.count.mockResolvedValue(1)
      repository.findUsersByEmails.mockResolvedValue([{ email: USER_EMAIL, name: 'Test Analyst' }])

      const result = await service.listRules(TENANT_ID, 1, 20, 'createdAt', 'desc')

      expect(result.data[0].createdByName).toBe('Test Analyst')
      expect(result.data[0].tenantName).toBe('Test Tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getRuleById
  // ---------------------------------------------------------------------------
  describe('getRuleById', () => {
    it('should return rule with resolved creator name when found', async () => {
      const rule = buildMockRule()
      repository.findFirstWithTenant.mockResolvedValue(rule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const result = await service.getRuleById(RULE_ID, TENANT_ID)

      expect(result.id).toBe(RULE_ID)
      expect(result.createdByName).toBe('Test Analyst')
      expect(result.tenantName).toBe('Test Tenant')
      expect(repository.findFirstWithTenant).toHaveBeenCalledWith({
        id: RULE_ID,
        tenantId: TENANT_ID,
      })
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstWithTenant.mockResolvedValue(null)

      try {
        await service.getRuleById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should always include tenantId in query', async () => {
      repository.findFirstWithTenant.mockResolvedValue(null)

      try {
        await service.getRuleById(RULE_ID, TENANT_ID)
      } catch {
        // expected
      }

      expect(repository.findFirstWithTenant).toHaveBeenCalledWith({
        id: RULE_ID,
        tenantId: TENANT_ID,
      })
    })

    it('should handle null creator name gracefully', async () => {
      const rule = buildMockRule()
      repository.findFirstWithTenant.mockResolvedValue(rule)
      repository.findUserNameByEmail.mockResolvedValue(null)

      const result = await service.getRuleById(RULE_ID, TENANT_ID)

      expect(result.createdByName).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // createRule
  // ---------------------------------------------------------------------------
  describe('createRule', () => {
    const baseDto = {
      title: 'New Rule',
      description: 'Test rule description',
      source: 'custom' as const,
      severity: 'high' as const,
      yamlContent: 'title: test',
    }

    it('should create rule and return record with resolved creator name', async () => {
      repository.findLastRuleByPrefix.mockResolvedValue(null)
      const createdRule = buildMockRule({ title: 'New Rule', ruleNumber: 'COR-0001' })
      repository.createWithTenant.mockResolvedValue(createdRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const result = await service.createRule(baseDto, buildMockJwtPayload() as never)

      expect(result.title).toBe('New Rule')
      expect(result.tenantName).toBe('Test Tenant')
      expect(result.createdByName).toBe('Test Analyst')
      expect(repository.createWithTenant).toHaveBeenCalledTimes(1)
    })

    it('should generate COR- prefix for custom rules', async () => {
      repository.findLastRuleByPrefix.mockResolvedValue(null)
      const createdRule = buildMockRule({ ruleNumber: 'COR-0001' })
      repository.createWithTenant.mockResolvedValue(createdRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      await service.createRule(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      const year = nowDate().getFullYear()
      expect(callArguments.ruleNumber).toBe(`COR-${year}-0001`)
    })

    it('should generate SIG- prefix for sigma rules', async () => {
      repository.findLastRuleByPrefix.mockResolvedValue(null)
      const sigmaDto = { ...baseDto, source: 'sigma' as const }
      const createdRule = buildMockRule({ ruleNumber: 'SIG-0001', source: 'sigma' })
      repository.createWithTenant.mockResolvedValue(createdRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      await service.createRule(sigmaDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      const year = nowDate().getFullYear()
      expect(callArguments.ruleNumber).toBe(`SIG-${year}-0001`)
    })

    it('should increment rule number when previous rules exist', async () => {
      repository.findLastRuleByPrefix.mockResolvedValue({ ruleNumber: 'COR-0005' })
      const createdRule = buildMockRule({ ruleNumber: 'COR-0006' })
      repository.createWithTenant.mockResolvedValue(createdRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      await service.createRule(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      const year = nowDate().getFullYear()
      expect(callArguments.ruleNumber).toBe(`COR-${year}-0006`)
    })

    it('should use tenantId from JWT payload', async () => {
      repository.findLastRuleByPrefix.mockResolvedValue(null)
      const createdRule = buildMockRule()
      repository.createWithTenant.mockResolvedValue(createdRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      await service.createRule(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      expect(callArguments.tenantId).toBe(TENANT_ID)
    })

    it('should set status to active on creation', async () => {
      repository.findLastRuleByPrefix.mockResolvedValue(null)
      const createdRule = buildMockRule()
      repository.createWithTenant.mockResolvedValue(createdRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      await service.createRule(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      expect(callArguments.status).toBe('active')
    })

    it('should set createdBy to user sub', async () => {
      repository.findLastRuleByPrefix.mockResolvedValue(null)
      const createdRule = buildMockRule()
      repository.createWithTenant.mockResolvedValue(createdRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      await service.createRule(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      expect(callArguments.createdBy).toBe(USER_EMAIL)
    })

    it('should pass mitreTactics and mitreTechniques when provided', async () => {
      repository.findLastRuleByPrefix.mockResolvedValue(null)
      const createdRule = buildMockRule()
      repository.createWithTenant.mockResolvedValue(createdRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const dto = {
        ...baseDto,
        mitreTactics: ['Credential Access'],
        mitreTechniques: ['T1110'],
      }
      await service.createRule(dto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      expect(callArguments.mitreTactics).toEqual(['Credential Access'])
      expect(callArguments.mitreTechniques).toEqual(['T1110'])
    })

    it('should default mitreTactics and mitreTechniques to empty arrays', async () => {
      repository.findLastRuleByPrefix.mockResolvedValue(null)
      const createdRule = buildMockRule()
      repository.createWithTenant.mockResolvedValue(createdRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      await service.createRule(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      expect(callArguments.mitreTactics).toEqual([])
      expect(callArguments.mitreTechniques).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // updateRule
  // ---------------------------------------------------------------------------
  describe('updateRule', () => {
    it('should update rule and return record', async () => {
      repository.findFirstSelect.mockResolvedValue({ id: RULE_ID })
      const updatedRule = buildMockRule({ title: 'Updated Rule' })
      repository.updateWithTenant.mockResolvedValue(updatedRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const result = await service.updateRule(
        RULE_ID,
        { title: 'Updated Rule' },
        buildMockJwtPayload() as never
      )

      expect(result.title).toBe('Updated Rule')
      expect(result.tenantName).toBe('Test Tenant')
      expect(repository.updateWithTenant).toHaveBeenCalledTimes(1)
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstSelect.mockResolvedValue(null)

      try {
        await service.updateRule('nonexistent', { title: 'test' }, buildMockJwtPayload() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should always verify tenant ownership before update', async () => {
      repository.findFirstSelect.mockResolvedValue(null)

      try {
        await service.updateRule(RULE_ID, { title: 'test' }, buildMockJwtPayload() as never)
      } catch {
        // expected
      }

      expect(repository.findFirstSelect).toHaveBeenCalledWith(
        { id: RULE_ID, tenantId: TENANT_ID },
        { id: true }
      )
    })

    it('should pass update data to repository', async () => {
      repository.findFirstSelect.mockResolvedValue({ id: RULE_ID })
      const updatedRule = buildMockRule()
      repository.updateWithTenant.mockResolvedValue(updatedRule)
      repository.findUserNameByEmail.mockResolvedValue({ name: 'Test Analyst' })

      const updateDto = {
        title: 'Updated',
        severity: 'critical' as const,
        status: 'disabled' as const,
      }
      await service.updateRule(RULE_ID, updateDto, buildMockJwtPayload() as never)

      expect(repository.updateWithTenant).toHaveBeenCalledWith({
        where: { id: RULE_ID, tenantId: TENANT_ID },
        data: expect.objectContaining({
          title: 'Updated',
          severity: 'critical',
          status: 'disabled',
        }),
      })
    })
  })

  // ---------------------------------------------------------------------------
  // deleteRule
  // ---------------------------------------------------------------------------
  describe('deleteRule', () => {
    it('should delete rule and return { deleted: true }', async () => {
      repository.findFirstSelect.mockResolvedValue({ id: RULE_ID, ruleNumber: 'COR-0001' })
      repository.deleteByIdAndTenantId.mockResolvedValue(undefined)

      const result = await service.deleteRule(RULE_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteByIdAndTenantId).toHaveBeenCalledWith(RULE_ID, TENANT_ID)
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstSelect.mockResolvedValue(null)

      try {
        await service.deleteRule('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should always verify tenant ownership before deletion', async () => {
      repository.findFirstSelect.mockResolvedValue(null)

      try {
        await service.deleteRule(RULE_ID, TENANT_ID, USER_EMAIL)
      } catch {
        // expected
      }

      expect(repository.findFirstSelect).toHaveBeenCalledWith(
        { id: RULE_ID, tenantId: TENANT_ID },
        { id: true, ruleNumber: true }
      )
    })

    it('should log deletion with rule number', async () => {
      repository.findFirstSelect.mockResolvedValue({ id: RULE_ID, ruleNumber: 'COR-0001' })
      repository.deleteByIdAndTenantId.mockResolvedValue(undefined)

      await service.deleteRule(RULE_ID, TENANT_ID, USER_EMAIL)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'CorrelationService => deleteRule completed',
        expect.objectContaining({
          action: 'deleteRule',
          tenantId: TENANT_ID,
          outcome: 'success',
          metadata: expect.objectContaining({ ruleNumber: 'COR-0001' }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getCorrelationStats
  // ---------------------------------------------------------------------------
  describe('getCorrelationStats', () => {
    it('should return correct stats aggregation', async () => {
      repository.count
        .mockResolvedValueOnce(15) // correlation rules (not sigma)
        .mockResolvedValueOnce(8) // sigma rules
      repository.aggregate
        .mockResolvedValueOnce({ _sum: { hitCount: 42 } }) // fired24h
        .mockResolvedValueOnce({ _sum: { linkedIncidents: 7 } }) // linked

      const result = await service.getCorrelationStats(TENANT_ID)

      expect(result).toEqual({
        correlationRules: 15,
        sigmaRules: 8,
        fired24h: 42,
        linkedToIncidents: 7,
      })
    })

    it('should return 0 for fired24h when _sum is null', async () => {
      repository.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
      repository.aggregate
        .mockResolvedValueOnce({ _sum: { hitCount: null } })
        .mockResolvedValueOnce({ _sum: { linkedIncidents: null } })

      const result = await service.getCorrelationStats(TENANT_ID)

      expect(result.fired24h).toBe(0)
      expect(result.linkedToIncidents).toBe(0)
    })

    it('should always scope queries to tenantId', async () => {
      repository.count.mockResolvedValue(0)
      repository.aggregate.mockResolvedValue({ _sum: { hitCount: null, linkedIncidents: null } })

      await service.getCorrelationStats(TENANT_ID)

      // Verify count calls include tenantId
      for (const call of repository.count.mock.calls) {
        expect(call[0].tenantId).toBe(TENANT_ID)
      }

      // Verify aggregate calls include tenantId
      for (const call of repository.aggregate.mock.calls) {
        expect(call[0].where.tenantId).toBe(TENANT_ID)
      }
    })

    it('should filter fired24h by lastFiredAt within last 24 hours', async () => {
      repository.count.mockResolvedValue(0)
      repository.aggregate.mockResolvedValue({ _sum: { hitCount: null, linkedIncidents: null } })

      const before = nowDate()
      await service.getCorrelationStats(TENANT_ID)

      // The first aggregate call is for fired24h
      const fired24hCall = repository.aggregate.mock.calls[0][0]
      expect(fired24hCall.where.lastFiredAt).toBeDefined()
      expect(fired24hCall.where.lastFiredAt.gte).toBeInstanceOf(Date)

      const diffMs = before.getTime() - fired24hCall.where.lastFiredAt.gte.getTime()
      const twentyFourHoursMs = 24 * 60 * 60 * 1000
      expect(diffMs).toBeGreaterThan(twentyFourHoursMs - 5000)
      expect(diffMs).toBeLessThan(twentyFourHoursMs + 5000)
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database error')
      repository.count.mockRejectedValue(dbError)

      try {
        await service.getCorrelationStats(TENANT_ID)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })

    it('should handle _sum being undefined gracefully', async () => {
      repository.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
      repository.aggregate
        .mockResolvedValueOnce({ _sum: undefined })
        .mockResolvedValueOnce({ _sum: undefined })

      const result = await service.getCorrelationStats(TENANT_ID)

      expect(result.fired24h).toBe(0)
      expect(result.linkedToIncidents).toBe(0)
    })
  })
})
