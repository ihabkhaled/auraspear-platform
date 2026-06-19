import {
  ReportFormat,
  ReportModule,
  ReportStatus,
  ReportTemplateKey,
  ReportType,
} from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { ReportsService } from '../../src/modules/reports/reports.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const REPORT_ID = 'report-001'
const USER_EMAIL = 'analyst@auraspear.com'

function buildMockUser() {
  return {
    sub: 'user-001',
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'SOC_ANALYST',
  }
}

function buildMockReport(overrides: Record<string, unknown> = {}) {
  return {
    id: REPORT_ID,
    tenantId: TENANT_ID,
    templateId: 'template-001',
    name: 'Weekly Incident Report',
    description: 'Summary of weekly incidents',
    type: ReportType.INCIDENT,
    module: ReportModule.INCIDENTS,
    templateKey: ReportTemplateKey.INCIDENT_POSTURE,
    format: ReportFormat.PDF,
    status: ReportStatus.COMPLETED,
    parameters: { dateRange: '7d' },
    filterSnapshot: { scope: 'weekly' },
    fileUrl: 'https://storage.example.com/reports/report-001.pdf',
    fileSize: BigInt(102400),
    generatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    generatedBy: USER_EMAIL,
    tenant: { name: 'Test Tenant' },
    template: {
      id: 'template-001',
      key: ReportTemplateKey.INCIDENT_POSTURE,
      module: ReportModule.INCIDENTS,
      name: 'Incident Posture',
    },
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function buildMockTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'template-001',
    tenantId: null,
    key: ReportTemplateKey.EXECUTIVE_OVERVIEW,
    module: ReportModule.DASHBOARD,
    name: 'Executive Overview',
    description: 'Executive summary template',
    type: ReportType.EXECUTIVE,
    defaultFormat: ReportFormat.PDF,
    parameters: { range: '30d' },
    isSystem: true,
    tenant: null,
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findManyReports: jest.fn(),
    countReports: jest.fn(),
    findFirstReport: jest.fn(),
    createReport: jest.fn(),
    updateManyReports: jest.fn(),
    deleteManyReports: jest.fn(),
    findUserByEmail: jest.fn(),
    findUsersByEmails: jest.fn(),
    findManyReportTemplates: jest.fn(),
    countReportTemplates: jest.fn(),
  }
}

function createMockJobService() {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
  }
}

describe('ReportsService', () => {
  let service: ReportsService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new ReportsService(
      repository as never,
      mockAppLogger as never,
      createMockJobService() as never
    )
  })

  // ---------------------------------------------------------------------------
  // listReports
  // ---------------------------------------------------------------------------
  describe('listReports', () => {
    it('should return paginated reports', async () => {
      const reports = [buildMockReport(), buildMockReport({ id: 'report-002' })]
      repository.findManyReports.mockResolvedValue(reports)
      repository.countReports.mockResolvedValue(2)
      repository.findUsersByEmails.mockResolvedValue([{ email: USER_EMAIL, name: 'Analyst User' }])

      const result = await service.listReports(TENANT_ID)

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

    it('should filter by type', async () => {
      repository.findManyReports.mockResolvedValue([])
      repository.countReports.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listReports(TENANT_ID, 1, 20, undefined, undefined, ReportType.INCIDENT)

      const whereArgument = repository.findManyReports.mock.calls[0][0].where
      expect(whereArgument.type).toBe(ReportType.INCIDENT)
    })

    it('should filter by module', async () => {
      repository.findManyReports.mockResolvedValue([])
      repository.countReports.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listReports(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        ReportModule.CONNECTORS
      )

      const whereArgument = repository.findManyReports.mock.calls[0][0].where
      expect(whereArgument.module).toBe(ReportModule.CONNECTORS)
    })

    it('should filter by status', async () => {
      repository.findManyReports.mockResolvedValue([])
      repository.countReports.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listReports(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        ReportStatus.COMPLETED
      )

      const whereArgument = repository.findManyReports.mock.calls[0][0].where
      expect(whereArgument.status).toBe(ReportStatus.COMPLETED)
    })

    it('should filter by query', async () => {
      repository.findManyReports.mockResolvedValue([])
      repository.countReports.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listReports(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        'weekly'
      )

      const whereArgument = repository.findManyReports.mock.calls[0][0].where
      expect(whereArgument.OR).toEqual([
        { name: { contains: 'weekly', mode: 'insensitive' } },
        { description: { contains: 'weekly', mode: 'insensitive' } },
      ])
    })

    it('should handle empty results', async () => {
      repository.findManyReports.mockResolvedValue([])
      repository.countReports.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      const result = await service.listReports(TENANT_ID)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyReports.mockResolvedValue([])
      repository.countReports.mockResolvedValue(100)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listReports(TENANT_ID, 3, 10)

      expect(repository.findManyReports).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should convert BigInt fileSize to number', async () => {
      repository.findManyReports.mockResolvedValue([buildMockReport()])
      repository.countReports.mockResolvedValue(1)
      repository.findUsersByEmails.mockResolvedValue([])

      const result = await service.listReports(TENANT_ID)

      expect(result.data[0]?.fileSize).toBe('102400')
    })

    it('should handle null fileSize', async () => {
      repository.findManyReports.mockResolvedValue([buildMockReport({ fileSize: null })])
      repository.countReports.mockResolvedValue(1)
      repository.findUsersByEmails.mockResolvedValue([])

      const result = await service.listReports(TENANT_ID)

      expect(result.data[0]?.fileSize).toBeNull()
    })

    it('should enforce tenant isolation', async () => {
      repository.findManyReports.mockResolvedValue([])
      repository.countReports.mockResolvedValue(0)
      repository.findUsersByEmails.mockResolvedValue([])

      await service.listReports('other-tenant')

      const whereArgument = repository.findManyReports.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getReportById
  // ---------------------------------------------------------------------------
  describe('getReportById', () => {
    it('should return report when found', async () => {
      repository.findFirstReport.mockResolvedValue(buildMockReport())
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const result = await service.getReportById(REPORT_ID, TENANT_ID)

      expect(result.id).toBe(REPORT_ID)
      expect(result.generatedByName).toBe('Analyst User')
      expect(result.tenantName).toBe('Test Tenant')
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstReport.mockResolvedValue(null)

      try {
        await service.getReportById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should enforce tenant isolation', async () => {
      repository.findFirstReport.mockResolvedValue(null)

      try {
        await service.getReportById(REPORT_ID, 'other-tenant')
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
      }

      expect(repository.findFirstReport).toHaveBeenCalledWith({
        where: { id: REPORT_ID, tenantId: 'other-tenant' },
        include: {
          tenant: { select: { name: true } },
          template: { select: { id: true, key: true, module: true, name: true } },
        },
      })
    })
  })

  // ---------------------------------------------------------------------------
  // createReport
  // ---------------------------------------------------------------------------
  describe('createReport', () => {
    it('should create a report with GENERATING status', async () => {
      const created = buildMockReport({ status: ReportStatus.GENERATING })
      repository.createReport.mockResolvedValue(created)
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const dto = {
        name: 'Weekly Incident Report',
        type: ReportType.INCIDENT,
        format: ReportFormat.PDF,
      }

      const result = await service.createReport(dto as never, buildMockUser() as never)

      expect(result.status).toBe(ReportStatus.GENERATING)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should use user tenantId and email', async () => {
      repository.createReport.mockResolvedValue(buildMockReport())
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const dto = {
        name: 'Test',
        type: ReportType.EXECUTIVE,
        format: ReportFormat.PDF,
      }
      await service.createReport(dto as never, buildMockUser() as never)

      const createArgument = repository.createReport.mock.calls[0][0].data
      expect(createArgument.tenantId).toBe(TENANT_ID)
      expect(createArgument.generatedBy).toBe(USER_EMAIL)
    })
  })

  describe('listReportTemplates', () => {
    it('should return tenant and system templates', async () => {
      repository.findManyReportTemplates.mockResolvedValue([
        buildMockTemplate(),
        buildMockTemplate({
          id: 'template-002',
          key: ReportTemplateKey.CONNECTOR_HEALTH,
          module: ReportModule.CONNECTORS,
          name: 'Connector Health',
        }),
      ])

      const result = await service.listReportTemplates(TENANT_ID)

      expect(result).toHaveLength(2)
      expect(repository.findManyReportTemplates).toHaveBeenCalledWith({
        where: {
          OR: [{ tenantId: TENANT_ID }, { tenantId: null, isSystem: true }],
        },
        orderBy: [{ tenantId: 'desc' }, { createdAt: 'asc' }],
        include: {
          tenant: { select: { name: true } },
        },
      })
    })
  })

  describe('createReportFromTemplate', () => {
    it('should create a report from a resolved template', async () => {
      const template = buildMockTemplate()
      repository.findManyReportTemplates.mockResolvedValueOnce([]).mockResolvedValueOnce([template])
      repository.createReport.mockResolvedValue(
        buildMockReport({
          name: 'Executive Overview - 2025-06-01',
          type: ReportType.EXECUTIVE,
          module: ReportModule.DASHBOARD,
          templateKey: ReportTemplateKey.EXECUTIVE_OVERVIEW,
          template: {
            id: template.id,
            key: template.key,
            module: template.module,
            name: template.name,
          },
        })
      )
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })

      const result = await service.createReportFromTemplate(
        {
          templateKey: ReportTemplateKey.EXECUTIVE_OVERVIEW,
          module: ReportModule.DASHBOARD,
        } as never,
        buildMockUser() as never
      )

      expect(result.templateKey).toBe(ReportTemplateKey.EXECUTIVE_OVERVIEW)
      expect(repository.createReport).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            templateId: template.id,
            module: ReportModule.DASHBOARD,
            templateKey: ReportTemplateKey.EXECUTIVE_OVERVIEW,
            generatedBy: USER_EMAIL,
          }),
        })
      )
    })

    it('should throw a localized error when the template is missing', async () => {
      repository.findManyReportTemplates.mockResolvedValue([])

      await expect(
        service.createReportFromTemplate(
          {
            templateKey: ReportTemplateKey.CONNECTOR_HEALTH,
            module: ReportModule.CONNECTORS,
          } as never,
          buildMockUser() as never
        )
      ).rejects.toMatchObject({
        messageKey: 'errors.reports.templateNotFound',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // deleteReport
  // ---------------------------------------------------------------------------
  describe('deleteReport', () => {
    it('should delete a report and return deleted: true', async () => {
      repository.findFirstReport.mockResolvedValue(buildMockReport())
      repository.findUserByEmail.mockResolvedValue({ name: 'Analyst User' })
      repository.deleteManyReports.mockResolvedValue({ count: 1 })

      const result = await service.deleteReport(REPORT_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteManyReports).toHaveBeenCalledWith({
        where: { id: REPORT_ID, tenantId: TENANT_ID },
      })
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when report does not exist', async () => {
      repository.findFirstReport.mockResolvedValue(null)

      try {
        await service.deleteReport('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // getReportStats
  // ---------------------------------------------------------------------------
  describe('getReportStats', () => {
    it('should return aggregated report stats', async () => {
      repository.countReports
        .mockResolvedValueOnce(20) // totalReports
        .mockResolvedValueOnce(15) // completedReports
        .mockResolvedValueOnce(3) // failedReports
        .mockResolvedValueOnce(2) // generatingReports
      repository.countReportTemplates.mockResolvedValueOnce(7)

      const result = await service.getReportStats(TENANT_ID)

      expect(result.totalReports).toBe(20)
      expect(result.completedReports).toBe(15)
      expect(result.failedReports).toBe(3)
      expect(result.generatingReports).toBe(2)
      expect(result.availableTemplates).toBe(7)
    })

    it('should handle zero counts', async () => {
      repository.countReports.mockResolvedValue(0)
      repository.countReportTemplates.mockResolvedValue(0)

      const result = await service.getReportStats(TENANT_ID)

      expect(result.totalReports).toBe(0)
      expect(result.completedReports).toBe(0)
      expect(result.availableTemplates).toBe(0)
    })

    it('should enforce tenant isolation', async () => {
      repository.countReports.mockResolvedValue(0)
      repository.countReportTemplates.mockResolvedValue(0)

      await service.getReportStats('other-tenant')

      expect(repository.countReports).toHaveBeenCalledWith({ tenantId: 'other-tenant' })
      expect(repository.countReportTemplates).toHaveBeenCalledWith({
        OR: [{ tenantId: 'other-tenant' }, { tenantId: null, isSystem: true }],
      })
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database error')
      repository.countReports.mockRejectedValue(dbError)
      repository.countReportTemplates.mockResolvedValue(0)

      await expect(service.getReportStats(TENANT_ID)).rejects.toBe(dbError)
    })
  })
})
