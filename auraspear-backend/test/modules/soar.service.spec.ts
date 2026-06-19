import { SoarPlaybookStatus, SoarExecutionStatus } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { SoarService } from '../../src/modules/soar/soar.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const PLAYBOOK_ID = 'playbook-001'
const EXECUTION_ID = 'exec-001'
const USER_EMAIL = 'analyst@auraspear.com'

function buildMockUser() {
  return {
    sub: 'user-001',
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'SOC_ANALYST',
  }
}

function buildMockPlaybook(overrides: Record<string, unknown> = {}) {
  return {
    id: PLAYBOOK_ID,
    tenantId: TENANT_ID,
    name: 'Block IP Playbook',
    description: 'Blocks malicious IPs automatically',
    status: SoarPlaybookStatus.ACTIVE,
    triggerType: 'manual',
    triggerConditions: { severity: 'critical' },
    steps: [{ action: 'block_ip', target: 'firewall' }],
    executionCount: 5,
    lastExecutedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    createdBy: USER_EMAIL,
    tenant: { name: 'Test Tenant' },
    createdAt: toDay('2025-05-01T00:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function buildMockExecution(overrides: Record<string, unknown> = {}) {
  return {
    id: EXECUTION_ID,
    playbookId: PLAYBOOK_ID,
    tenantId: TENANT_ID,
    status: SoarExecutionStatus.RUNNING,
    triggeredBy: USER_EMAIL,
    startedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    completedAt: null,
    output: null,
    error: null,
    playbook: { name: 'Block IP Playbook' },
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findManyPlaybooksWithTenant: jest.fn(),
    countPlaybooks: jest.fn(),
    findFirstPlaybookWithTenant: jest.fn(),
    createPlaybookWithTenant: jest.fn(),
    updateManyPlaybooks: jest.fn(),
    deleteManyPlaybooks: jest.fn(),
    findManyExecutionsWithPlaybook: jest.fn(),
    countExecutions: jest.fn(),
    getAvgExecutionTimeMs: jest.fn(),
    executePlaybookTransaction: jest.fn(),
    findUserByEmail: jest.fn(),
    findUsersByEmails: jest.fn(),
  }
}

describe('SoarService', () => {
  let service: SoarService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new SoarService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listPlaybooks
  // ---------------------------------------------------------------------------
  describe('listPlaybooks', () => {
    it('should return paginated playbooks', async () => {
      const playbooks = [buildMockPlaybook(), buildMockPlaybook({ id: 'playbook-002' })]
      repository.findManyPlaybooksWithTenant.mockResolvedValue(playbooks)
      repository.countPlaybooks.mockResolvedValue(2)
      repository.findUsersByEmails.mockResolvedValue([{ email: USER_EMAIL, name: 'Analyst User' }])

      const result = await service.listPlaybooks(TENANT_ID, 1, 20)

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

    it('should filter by status', async () => {
      repository.findManyPlaybooksWithTenant.mockResolvedValue([])
      repository.countPlaybooks.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listPlaybooks(TENANT_ID, 1, 20, undefined, undefined, 'active')

      const whereArgument = repository.findManyPlaybooksWithTenant.mock.calls[0][0].where
      expect(whereArgument.status).toBe('active')
    })

    it('should filter by triggerType', async () => {
      repository.findManyPlaybooksWithTenant.mockResolvedValue([])
      repository.countPlaybooks.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listPlaybooks(TENANT_ID, 1, 20, undefined, undefined, undefined, 'manual')

      const whereArgument = repository.findManyPlaybooksWithTenant.mock.calls[0][0].where
      expect(whereArgument.triggerType).toBe('manual')
    })

    it('should filter by query with OR on name and description', async () => {
      repository.findManyPlaybooksWithTenant.mockResolvedValue([])
      repository.countPlaybooks.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listPlaybooks(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        'block'
      )

      const whereArgument = repository.findManyPlaybooksWithTenant.mock.calls[0][0].where
      expect(whereArgument.OR).toEqual([
        { name: { contains: 'block', mode: 'insensitive' } },
        { description: { contains: 'block', mode: 'insensitive' } },
      ])
    })

    it('should handle empty results', async () => {
      repository.findManyPlaybooksWithTenant.mockResolvedValue([])
      repository.countPlaybooks.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      const result = await service.listPlaybooks(TENANT_ID, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyPlaybooksWithTenant.mockResolvedValue([])
      repository.countPlaybooks.mockResolvedValue(100)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listPlaybooks(TENANT_ID, 3, 10)

      expect(repository.findManyPlaybooksWithTenant).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should resolve creator names from batch', async () => {
      const playbooks = [buildMockPlaybook()]
      repository.findManyPlaybooksWithTenant.mockResolvedValue(playbooks)
      repository.countPlaybooks.mockResolvedValue(1)
      repository.findUsersByEmails.mockResolvedValue([{ email: USER_EMAIL, name: 'Analyst User' }])

      const result = await service.listPlaybooks(TENANT_ID)

      expect(result.data[0]?.createdByName).toBe('Analyst User')
    })

    it('should enforce tenant isolation', async () => {
      repository.findManyPlaybooksWithTenant.mockResolvedValue([])
      repository.countPlaybooks.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listPlaybooks('other-tenant')

      const whereArgument = repository.findManyPlaybooksWithTenant.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getPlaybookById
  // ---------------------------------------------------------------------------
  describe('getPlaybookById', () => {
    it('should return playbook when found', async () => {
      const playbook = buildMockPlaybook()
      repository.findFirstPlaybookWithTenant.mockResolvedValue(playbook)
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const result = await service.getPlaybookById(PLAYBOOK_ID, TENANT_ID)

      expect(result.id).toBe(PLAYBOOK_ID)
      expect(result.tenantName).toBe('Test Tenant')
      expect(result.createdByName).toBe('Analyst User')
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstPlaybookWithTenant.mockResolvedValue(null)

      try {
        await service.getPlaybookById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should enforce tenant isolation', async () => {
      repository.findFirstPlaybookWithTenant.mockResolvedValue(null)

      try {
        await service.getPlaybookById(PLAYBOOK_ID, 'other-tenant')
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
      }

      expect(repository.findFirstPlaybookWithTenant).toHaveBeenCalledWith({
        id: PLAYBOOK_ID,
        tenantId: 'other-tenant',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // createPlaybook
  // ---------------------------------------------------------------------------
  describe('createPlaybook', () => {
    it('should create a playbook with DRAFT status', async () => {
      const created = buildMockPlaybook({ status: SoarPlaybookStatus.DRAFT, executionCount: 0 })
      repository.createPlaybookWithTenant.mockResolvedValue(created)
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const dto = {
        name: 'Block IP Playbook',
        description: 'Blocks malicious IPs automatically',
        triggerType: 'manual',
        steps: [{ action: 'block_ip' }],
      }

      const result = await service.createPlaybook(dto as never, buildMockUser() as never)

      expect(result.status).toBe(SoarPlaybookStatus.DRAFT)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should use the user tenantId and email', async () => {
      const created = buildMockPlaybook({ status: SoarPlaybookStatus.DRAFT })
      repository.createPlaybookWithTenant.mockResolvedValue(created)
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const dto = {
        name: 'Test',
        triggerType: 'manual',
        steps: [],
      }

      await service.createPlaybook(dto as never, buildMockUser() as never)

      const createArgument = repository.createPlaybookWithTenant.mock.calls[0][0]
      expect(createArgument.tenantId).toBe(TENANT_ID)
      expect(createArgument.createdBy).toBe(USER_EMAIL)
    })
  })

  // ---------------------------------------------------------------------------
  // updatePlaybook
  // ---------------------------------------------------------------------------
  describe('updatePlaybook', () => {
    it('should update playbook fields', async () => {
      const existing = buildMockPlaybook()
      repository.findFirstPlaybookWithTenant.mockResolvedValue(existing)
      repository.updateManyPlaybooks.mockResolvedValue({ count: 1 })
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const dto = { name: 'Updated Name' }
      const result = await service.updatePlaybook(
        PLAYBOOK_ID,
        dto as never,
        buildMockUser() as never
      )

      expect(result).toBeDefined()
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when playbook does not exist', async () => {
      repository.findFirstPlaybookWithTenant.mockResolvedValue(null)

      try {
        await service.updatePlaybook('nonexistent', {} as never, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 404 when updateMany returns count 0', async () => {
      const existing = buildMockPlaybook()
      repository.findFirstPlaybookWithTenant
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null)
      repository.updateManyPlaybooks.mockResolvedValue({ count: 0 })

      try {
        await service.updatePlaybook(
          PLAYBOOK_ID,
          { name: 'Test' } as never,
          buildMockUser() as never
        )
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // deletePlaybook
  // ---------------------------------------------------------------------------
  describe('deletePlaybook', () => {
    it('should delete a playbook and return deleted: true', async () => {
      const existing = buildMockPlaybook()
      repository.findFirstPlaybookWithTenant.mockResolvedValue(existing)
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })
      repository.deleteManyPlaybooks.mockResolvedValue({ count: 1 })

      const result = await service.deletePlaybook(PLAYBOOK_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteManyPlaybooks).toHaveBeenCalledWith({
        id: PLAYBOOK_ID,
        tenantId: TENANT_ID,
      })
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when playbook does not exist', async () => {
      repository.findFirstPlaybookWithTenant.mockResolvedValue(null)

      try {
        await service.deletePlaybook('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // listExecutions
  // ---------------------------------------------------------------------------
  describe('listExecutions', () => {
    it('should return paginated executions', async () => {
      const executions = [buildMockExecution()]
      repository.findManyExecutionsWithPlaybook.mockResolvedValue(executions)
      repository.countExecutions.mockResolvedValue(1)
      repository.findUsersByEmails.mockResolvedValue([{ email: USER_EMAIL, name: 'Analyst User' }])

      const result = await service.listExecutions(TENANT_ID)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.playbookName).toBe('Block IP Playbook')
    })

    it('should filter by playbookId when provided', async () => {
      repository.findManyExecutionsWithPlaybook.mockResolvedValue([])
      repository.countExecutions.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listExecutions(TENANT_ID, PLAYBOOK_ID)

      const whereArgument = repository.findManyExecutionsWithPlaybook.mock.calls[0][0].where
      expect(whereArgument.playbookId).toBe(PLAYBOOK_ID)
    })

    it('should enforce tenant isolation', async () => {
      repository.findManyExecutionsWithPlaybook.mockResolvedValue([])
      repository.countExecutions.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listExecutions('other-tenant')

      const whereArgument = repository.findManyExecutionsWithPlaybook.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })

    it('should handle empty results', async () => {
      repository.findManyExecutionsWithPlaybook.mockResolvedValue([])
      repository.countExecutions.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      const result = await service.listExecutions(TENANT_ID)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // executePlaybook
  // ---------------------------------------------------------------------------
  describe('executePlaybook', () => {
    it('should execute an active playbook', async () => {
      const playbook = buildMockPlaybook({ status: SoarPlaybookStatus.ACTIVE })
      repository.findFirstPlaybookWithTenant.mockResolvedValue(playbook)
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })
      repository.executePlaybookTransaction.mockResolvedValue(buildMockExecution())

      const result = await service.executePlaybook(PLAYBOOK_ID, buildMockUser() as never)

      expect(result.status).toBe(SoarExecutionStatus.RUNNING)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 400 when playbook is not active', async () => {
      const playbook = buildMockPlaybook({ status: SoarPlaybookStatus.DRAFT })
      repository.findFirstPlaybookWithTenant.mockResolvedValue(playbook)
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      try {
        await service.executePlaybook(PLAYBOOK_ID, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should throw BusinessException 400 when playbook is inactive', async () => {
      const playbook = buildMockPlaybook({ status: SoarPlaybookStatus.INACTIVE })
      repository.findFirstPlaybookWithTenant.mockResolvedValue(playbook)
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      try {
        await service.executePlaybook(PLAYBOOK_ID, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(400)
      }
    })

    it('should throw BusinessException 404 when playbook does not exist', async () => {
      repository.findFirstPlaybookWithTenant.mockResolvedValue(null)

      try {
        await service.executePlaybook('nonexistent', buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // getSoarStats
  // ---------------------------------------------------------------------------
  describe('getSoarStats', () => {
    it('should return aggregated stats', async () => {
      repository.countPlaybooks
        .mockResolvedValueOnce(10) // totalPlaybooks
        .mockResolvedValueOnce(6) // activePlaybooks
      repository.countExecutions
        .mockResolvedValueOnce(50) // totalExecutions
        .mockResolvedValueOnce(40) // successfulExecutions
        .mockResolvedValueOnce(5) // failedExecutions
      repository.getAvgExecutionTimeMs.mockResolvedValue(7500)

      const result = await service.getSoarStats(TENANT_ID)

      expect(result.totalPlaybooks).toBe(10)
      expect(result.activePlaybooks).toBe(6)
      expect(result.totalExecutions).toBe(50)
      expect(result.successfulExecutions).toBe(40)
      expect(result.failedExecutions).toBe(5)
      expect(result.avgExecutionTimeMs).toBe(7500)
    })

    it('should return null avgExecutionTimeMs when no completed executions', async () => {
      repository.countPlaybooks.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
      repository.countExecutions
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
      repository.getAvgExecutionTimeMs.mockResolvedValue(null)

      const result = await service.getSoarStats(TENANT_ID)

      expect(result.avgExecutionTimeMs).toBeNull()
    })

    it('should enforce tenant isolation in stats queries', async () => {
      repository.countPlaybooks.mockResolvedValue(0)
      repository.countExecutions.mockResolvedValue(0)
      repository.getAvgExecutionTimeMs.mockResolvedValue(null)

      await service.getSoarStats('other-tenant')

      expect(repository.countPlaybooks).toHaveBeenCalledWith({ tenantId: 'other-tenant' })
      expect(repository.getAvgExecutionTimeMs).toHaveBeenCalledWith('other-tenant')
    })
  })
})
