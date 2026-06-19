import { ComplianceControlStatus } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { ComplianceService } from '../../src/modules/compliance/compliance.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const FRAMEWORK_ID = 'framework-001'
const CONTROL_ID = 'control-001'
const USER_EMAIL = 'analyst@auraspear.com'

function buildMockUser() {
  return {
    sub: 'user-001',
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'SOC_ANALYST',
  }
}

function buildMockFramework(overrides: Record<string, unknown> = {}) {
  return {
    id: FRAMEWORK_ID,
    tenantId: TENANT_ID,
    name: 'ISO 27001',
    description: 'Information security management',
    standard: 'ISO_27001',
    version: '2022',
    tenant: { name: 'Test Tenant' },
    createdAt: toDay('2025-05-01T00:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T00:00:00Z').toDate(),
    ...overrides,
  }
}

function buildMockControl(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTROL_ID,
    frameworkId: FRAMEWORK_ID,
    controlNumber: 'A.5.1',
    title: 'Policies for information security',
    description: 'Control description',
    status: ComplianceControlStatus.PASSED,
    evidence: 'Policy document reviewed',
    assessedAt: toDay('2025-06-01T00:00:00Z').toDate(),
    assessedBy: USER_EMAIL,
    createdAt: toDay('2025-05-01T00:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T00:00:00Z').toDate(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findManyFrameworksWithTenant: jest.fn(),
    countFrameworks: jest.fn(),
    findFirstFramework: jest.fn(),
    findFirstFrameworkWithTenant: jest.fn(),
    createFramework: jest.fn(),
    updateManyFrameworks: jest.fn(),
    deleteFrameworkWithControls: jest.fn(),
    groupByControls: jest.fn(),
    findManyControls: jest.fn(),
    findFirstControl: jest.fn(),
    createControl: jest.fn(),
    updateManyControls: jest.fn(),
    findControlByIdAndTenant: jest.fn(),
    groupByControlStatus: jest.fn(),
    findUserByEmail: jest.fn(),
    findUsersByEmails: jest.fn(),
  }
}

describe('ComplianceService', () => {
  let service: ComplianceService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new ComplianceService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listFrameworks
  // ---------------------------------------------------------------------------
  describe('listFrameworks', () => {
    it('should return paginated frameworks with compliance scores', async () => {
      const frameworks = [buildMockFramework()]
      repository.findManyFrameworksWithTenant.mockResolvedValue(frameworks)
      repository.countFrameworks.mockResolvedValue(1)
      repository.groupByControls.mockResolvedValue([
        { frameworkId: FRAMEWORK_ID, status: ComplianceControlStatus.PASSED, _count: { id: 8 } },
        { frameworkId: FRAMEWORK_ID, status: ComplianceControlStatus.FAILED, _count: { id: 2 } },
      ])

      const result = await service.listFrameworks(TENANT_ID)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.totalControls).toBe(10)
      expect(result.data[0]?.passedControls).toBe(8)
      expect(result.data[0]?.failedControls).toBe(2)
      expect(result.data[0]?.complianceScore).toBe(80)
    })

    it('should filter by standard', async () => {
      repository.findManyFrameworksWithTenant.mockResolvedValue([])
      repository.countFrameworks.mockResolvedValue(0)
      repository.groupByControls.mockResolvedValue([])

      await service.listFrameworks(TENANT_ID, 1, 20, undefined, undefined, 'ISO_27001')

      const whereArgument = repository.findManyFrameworksWithTenant.mock.calls[0][0].where
      expect(whereArgument.standard).toBe('ISO_27001')
    })

    it('should filter by query', async () => {
      repository.findManyFrameworksWithTenant.mockResolvedValue([])
      repository.countFrameworks.mockResolvedValue(0)
      repository.groupByControls.mockResolvedValue([])

      await service.listFrameworks(TENANT_ID, 1, 20, undefined, undefined, undefined, 'security')

      const whereArgument = repository.findManyFrameworksWithTenant.mock.calls[0][0].where
      expect(whereArgument.OR).toEqual([
        { name: { contains: 'security', mode: 'insensitive' } },
        { description: { contains: 'security', mode: 'insensitive' } },
      ])
    })

    it('should handle empty results', async () => {
      repository.findManyFrameworksWithTenant.mockResolvedValue([])
      repository.countFrameworks.mockResolvedValue(0)
      repository.groupByControls.mockResolvedValue([])

      const result = await service.listFrameworks(TENANT_ID)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })

    it('should return 0 compliance score when no controls exist', async () => {
      repository.findManyFrameworksWithTenant.mockResolvedValue([buildMockFramework()])
      repository.countFrameworks.mockResolvedValue(1)
      repository.groupByControls.mockResolvedValue([])

      const result = await service.listFrameworks(TENANT_ID)

      expect(result.data[0]?.complianceScore).toBe(0)
      expect(result.data[0]?.totalControls).toBe(0)
    })

    it('should enforce tenant isolation', async () => {
      repository.findManyFrameworksWithTenant.mockResolvedValue([])
      repository.countFrameworks.mockResolvedValue(0)
      repository.groupByControls.mockResolvedValue([])

      await service.listFrameworks('other-tenant')

      const whereArgument = repository.findManyFrameworksWithTenant.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getFrameworkById
  // ---------------------------------------------------------------------------
  describe('getFrameworkById', () => {
    it('should return framework with compliance stats', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(buildMockFramework())
      repository.groupByControls.mockResolvedValue([
        { frameworkId: FRAMEWORK_ID, status: ComplianceControlStatus.PASSED, _count: { id: 5 } },
      ])

      const result = await service.getFrameworkById(FRAMEWORK_ID, TENANT_ID)

      expect(result.id).toBe(FRAMEWORK_ID)
      expect(result.complianceScore).toBe(100)
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(null)

      try {
        await service.getFrameworkById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should enforce tenant isolation', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(null)

      try {
        await service.getFrameworkById(FRAMEWORK_ID, 'other-tenant')
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
      }

      expect(repository.findFirstFrameworkWithTenant).toHaveBeenCalledWith({
        id: FRAMEWORK_ID,
        tenantId: 'other-tenant',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // createFramework
  // ---------------------------------------------------------------------------
  describe('createFramework', () => {
    it('should create a framework with zero controls', async () => {
      repository.findFirstFramework.mockResolvedValue(null)
      const created = buildMockFramework()
      repository.createFramework.mockResolvedValue(created)

      const dto = {
        name: 'ISO 27001',
        description: 'Information security',
        standard: 'ISO_27001',
        version: '2022',
      }

      const result = await service.createFramework(dto as never, buildMockUser() as never)

      expect(result.totalControls).toBe(0)
      expect(result.complianceScore).toBe(0)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should use user tenantId', async () => {
      repository.findFirstFramework.mockResolvedValue(null)
      repository.createFramework.mockResolvedValue(buildMockFramework())

      const dto = { name: 'Test', standard: 'NIST', version: '1.0' }
      await service.createFramework(dto as never, buildMockUser() as never)

      const createArgument = repository.createFramework.mock.calls[0][0]
      expect(createArgument.tenantId).toBe(TENANT_ID)
    })
  })

  // ---------------------------------------------------------------------------
  // updateFramework
  // ---------------------------------------------------------------------------
  describe('updateFramework', () => {
    it('should update framework fields', async () => {
      const existing = buildMockFramework()
      repository.findFirstFrameworkWithTenant.mockResolvedValue(existing)
      repository.updateManyFrameworks.mockResolvedValue({ count: 1 })
      repository.groupByControls.mockResolvedValue([])

      const dto = { name: 'Updated Framework' }
      const result = await service.updateFramework(
        FRAMEWORK_ID,
        dto as never,
        buildMockUser() as never
      )

      expect(result).toBeDefined()
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when framework does not exist', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(null)

      try {
        await service.updateFramework('nonexistent', {} as never, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 404 when updateMany returns count 0', async () => {
      const existing = buildMockFramework()
      repository.findFirstFrameworkWithTenant
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null)
      repository.groupByControls.mockResolvedValue([])
      repository.updateManyFrameworks.mockResolvedValue({ count: 0 })

      try {
        await service.updateFramework(
          FRAMEWORK_ID,
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
  // deleteFramework
  // ---------------------------------------------------------------------------
  describe('deleteFramework', () => {
    it('should delete framework and its controls', async () => {
      const existing = buildMockFramework()
      repository.findFirstFrameworkWithTenant.mockResolvedValue(existing)
      repository.groupByControls.mockResolvedValue([])
      repository.deleteFrameworkWithControls.mockResolvedValue(undefined)

      const result = await service.deleteFramework(FRAMEWORK_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteFrameworkWithControls).toHaveBeenCalledWith(FRAMEWORK_ID, TENANT_ID)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when framework does not exist', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(null)

      try {
        await service.deleteFramework('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // listControls
  // ---------------------------------------------------------------------------
  describe('listControls', () => {
    it('should return controls for a framework', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(buildMockFramework())
      repository.groupByControls.mockResolvedValue([])
      repository.findManyControls.mockResolvedValue([buildMockControl()])
      repository.findUsersByEmails.mockResolvedValue([{ email: USER_EMAIL, name: 'Analyst User' }])

      const result = await service.listControls(FRAMEWORK_ID, TENANT_ID)

      expect(result).toHaveLength(1)
      expect(result[0]?.controlNumber).toBe('A.5.1')
      expect(result[0]?.assessedByName).toBe('Analyst User')
    })

    it('should throw BusinessException 404 when framework does not exist', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(null)

      try {
        await service.listControls('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // createControl
  // ---------------------------------------------------------------------------
  describe('createControl', () => {
    it('should create a control for a framework', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(buildMockFramework())
      repository.groupByControls.mockResolvedValue([])
      repository.createControl.mockResolvedValue(buildMockControl())
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const dto = {
        controlNumber: 'A.5.1',
        title: 'Policies for information security',
        status: ComplianceControlStatus.PASSED,
      }

      const result = await service.createControl(
        FRAMEWORK_ID,
        dto as never,
        buildMockUser() as never
      )

      expect(result.controlNumber).toBe('A.5.1')
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when framework does not exist', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(null)

      try {
        await service.createControl('nonexistent', {} as never, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // updateControl
  // ---------------------------------------------------------------------------
  describe('updateControl', () => {
    it('should update a control', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(buildMockFramework())
      repository.groupByControls.mockResolvedValue([])
      repository.findFirstControl.mockResolvedValue(buildMockControl())
      repository.updateManyControls.mockResolvedValue({ count: 1 })
      repository.findControlByIdAndTenant.mockResolvedValue(
        buildMockControl({ status: ComplianceControlStatus.FAILED })
      )
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const dto = { status: ComplianceControlStatus.FAILED }
      const result = await service.updateControl(
        FRAMEWORK_ID,
        CONTROL_ID,
        dto as never,
        buildMockUser() as never
      )

      expect(result).toBeDefined()
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when control does not exist', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(buildMockFramework())
      repository.groupByControls.mockResolvedValue([])
      repository.findFirstControl.mockResolvedValue(null)

      try {
        await service.updateControl(
          FRAMEWORK_ID,
          'nonexistent',
          {} as never,
          buildMockUser() as never
        )
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 404 when control not found after update', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(buildMockFramework())
      repository.groupByControls.mockResolvedValue([])
      repository.findFirstControl.mockResolvedValue(buildMockControl())
      repository.updateManyControls.mockResolvedValue({ count: 1 })
      repository.findControlByIdAndTenant.mockResolvedValue(null)

      try {
        await service.updateControl(
          FRAMEWORK_ID,
          CONTROL_ID,
          { title: 'Updated' } as never,
          buildMockUser() as never
        )
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should set assessedAt and assessedBy when status changes', async () => {
      repository.findFirstFrameworkWithTenant.mockResolvedValue(buildMockFramework())
      repository.groupByControls.mockResolvedValue([])
      repository.findFirstControl.mockResolvedValue(buildMockControl())
      repository.updateManyControls.mockResolvedValue({ count: 1 })
      repository.findControlByIdAndTenant.mockResolvedValue(buildMockControl())
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const dto = { status: ComplianceControlStatus.FAILED }
      await service.updateControl(FRAMEWORK_ID, CONTROL_ID, dto as never, buildMockUser() as never)

      const updateArgument = repository.updateManyControls.mock.calls[0][0].data
      expect(updateArgument['assessedAt']).toBeInstanceOf(Date)
      expect(updateArgument['assessedBy']).toBe(USER_EMAIL)
    })
  })

  // ---------------------------------------------------------------------------
  // getComplianceStats
  // ---------------------------------------------------------------------------
  describe('getComplianceStats', () => {
    it('should return aggregated compliance stats', async () => {
      repository.countFrameworks.mockResolvedValue(5)
      repository.groupByControlStatus.mockResolvedValue([
        { status: ComplianceControlStatus.PASSED, _count: { id: 30 } },
        { status: ComplianceControlStatus.FAILED, _count: { id: 10 } },
        { status: ComplianceControlStatus.NOT_ASSESSED, _count: { id: 5 } },
        { status: ComplianceControlStatus.PARTIALLY_MET, _count: { id: 3 } },
      ])

      const result = await service.getComplianceStats(TENANT_ID)

      expect(result.totalFrameworks).toBe(5)
      expect(result.passedControls).toBe(30)
      expect(result.failedControls).toBe(10)
      expect(result.notAssessedControls).toBe(5)
      expect(result.partiallyMetControls).toBe(3)
      expect(result.overallComplianceScore).toBe(63) // 30/48 * 100 rounded
    })

    it('should return 0 compliance score when no controls', async () => {
      repository.countFrameworks.mockResolvedValue(0)
      repository.groupByControlStatus.mockResolvedValue([])

      const result = await service.getComplianceStats(TENANT_ID)

      expect(result.overallComplianceScore).toBe(0)
      expect(result.passedControls).toBe(0)
    })

    it('should enforce tenant isolation', async () => {
      repository.countFrameworks.mockResolvedValue(0)
      repository.groupByControlStatus.mockResolvedValue([])

      await service.getComplianceStats('other-tenant')

      expect(repository.countFrameworks).toHaveBeenCalledWith({ tenantId: 'other-tenant' })
      expect(repository.groupByControlStatus).toHaveBeenCalledWith({
        framework: { tenantId: 'other-tenant' },
      })
    })
  })
})
