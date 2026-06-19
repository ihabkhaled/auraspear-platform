import { NormalizationPipelineStatus } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { NormalizationService } from '../../src/modules/normalization/normalization.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const PIPELINE_ID = 'pipeline-001'
const USER_EMAIL = 'analyst@auraspear.com'

function buildMockUser() {
  return {
    sub: 'user-001',
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'SOC_ANALYST',
  }
}

function buildMockPipeline(overrides: Record<string, unknown> = {}) {
  return {
    id: PIPELINE_ID,
    tenantId: TENANT_ID,
    name: 'Syslog Parser',
    description: 'Parses syslog format events',
    sourceType: 'syslog',
    status: NormalizationPipelineStatus.ACTIVE,
    parserConfig: { format: 'rfc5424' },
    fieldMappings: { source_ip: 'srcIp', dest_ip: 'dstIp' },
    processedCount: BigInt(15000),
    errorCount: 12,
    lastProcessedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    createdAt: toDay('2025-05-01T00:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findManyPipelines: jest.fn(),
    countPipelines: jest.fn(),
    findFirstPipelineByIdAndTenant: jest.fn(),
    createPipeline: jest.fn(),
    updateManyPipelinesByIdAndTenant: jest.fn(),
    deleteManyPipelinesByIdAndTenant: jest.fn(),
    countPipelinesByStatus: jest.fn(),
    aggregatePipelinesSums: jest.fn(),
  }
}

describe('NormalizationService', () => {
  let service: NormalizationService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new NormalizationService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listPipelines
  // ---------------------------------------------------------------------------
  describe('listPipelines', () => {
    it('should return paginated pipelines', async () => {
      const pipelines = [buildMockPipeline(), buildMockPipeline({ id: 'pipeline-002' })]
      repository.findManyPipelines.mockResolvedValue(pipelines)
      repository.countPipelines.mockResolvedValue(2)

      const result = await service.listPipelines(TENANT_ID)

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

    it('should filter by sourceType', async () => {
      repository.findManyPipelines.mockResolvedValue([])
      repository.countPipelines.mockResolvedValue(0)

      await service.listPipelines(TENANT_ID, 1, 20, undefined, undefined, 'syslog')

      const whereArgument = repository.findManyPipelines.mock.calls[0][0].where
      expect(whereArgument['sourceType']).toBe('syslog')
    })

    it('should filter by status', async () => {
      repository.findManyPipelines.mockResolvedValue([])
      repository.countPipelines.mockResolvedValue(0)

      await service.listPipelines(TENANT_ID, 1, 20, undefined, undefined, undefined, 'active')

      const whereArgument = repository.findManyPipelines.mock.calls[0][0].where
      expect(whereArgument['status']).toBe('active')
    })

    it('should filter by query', async () => {
      repository.findManyPipelines.mockResolvedValue([])
      repository.countPipelines.mockResolvedValue(0)

      await service.listPipelines(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        'syslog'
      )

      const whereArgument = repository.findManyPipelines.mock.calls[0][0].where
      expect(whereArgument['OR']).toEqual([
        { name: { contains: 'syslog', mode: 'insensitive' } },
        { description: { contains: 'syslog', mode: 'insensitive' } },
      ])
    })

    it('should convert BigInt processedCount to number', async () => {
      repository.findManyPipelines.mockResolvedValue([buildMockPipeline()])
      repository.countPipelines.mockResolvedValue(1)

      const result = await service.listPipelines(TENANT_ID)

      expect(result.data[0]?.processedCount).toBe('15000')
    })

    it('should handle empty results', async () => {
      repository.findManyPipelines.mockResolvedValue([])
      repository.countPipelines.mockResolvedValue(0)

      const result = await service.listPipelines(TENANT_ID)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyPipelines.mockResolvedValue([])
      repository.countPipelines.mockResolvedValue(100)

      await service.listPipelines(TENANT_ID, 3, 10)

      expect(repository.findManyPipelines).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should enforce tenant isolation', async () => {
      repository.findManyPipelines.mockResolvedValue([])
      repository.countPipelines.mockResolvedValue(0)

      await service.listPipelines('other-tenant')

      const whereArgument = repository.findManyPipelines.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getPipelineById
  // ---------------------------------------------------------------------------
  describe('getPipelineById', () => {
    it('should return pipeline when found', async () => {
      repository.findFirstPipelineByIdAndTenant.mockResolvedValue(buildMockPipeline())

      const result = await service.getPipelineById(PIPELINE_ID, TENANT_ID)

      expect(result.id).toBe(PIPELINE_ID)
      expect(result.name).toBe('Syslog Parser')
      expect(result.processedCount).toBe('15000')
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstPipelineByIdAndTenant.mockResolvedValue(null)

      try {
        await service.getPipelineById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should enforce tenant isolation', async () => {
      repository.findFirstPipelineByIdAndTenant.mockResolvedValue(null)

      try {
        await service.getPipelineById(PIPELINE_ID, 'other-tenant')
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
      }

      expect(repository.findFirstPipelineByIdAndTenant).toHaveBeenCalledWith(
        PIPELINE_ID,
        'other-tenant'
      )
    })
  })

  // ---------------------------------------------------------------------------
  // createPipeline
  // ---------------------------------------------------------------------------
  describe('createPipeline', () => {
    it('should create a pipeline with INACTIVE status', async () => {
      repository.findManyPipelines.mockResolvedValue([])
      const created = buildMockPipeline({ status: NormalizationPipelineStatus.INACTIVE })
      repository.createPipeline.mockResolvedValue(created)

      const dto = {
        name: 'Syslog Parser',
        sourceType: 'syslog',
        parserConfig: { format: 'rfc5424' },
        fieldMappings: { source_ip: 'srcIp' },
      }

      const result = await service.createPipeline(dto as never, buildMockUser() as never)

      expect(result.status).toBe(NormalizationPipelineStatus.INACTIVE)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should use user tenantId', async () => {
      repository.findManyPipelines.mockResolvedValue([])
      repository.createPipeline.mockResolvedValue(buildMockPipeline())

      const dto = {
        name: 'Test',
        sourceType: 'syslog',
        parserConfig: {},
        fieldMappings: {},
      }

      await service.createPipeline(dto as never, buildMockUser() as never)

      const createArgument = repository.createPipeline.mock.calls[0][0]
      expect(createArgument.tenantId).toBe(TENANT_ID)
    })
  })

  // ---------------------------------------------------------------------------
  // updatePipeline
  // ---------------------------------------------------------------------------
  describe('updatePipeline', () => {
    it('should update pipeline fields', async () => {
      const existing = buildMockPipeline()
      repository.findFirstPipelineByIdAndTenant.mockResolvedValue(existing)
      repository.updateManyPipelinesByIdAndTenant.mockResolvedValue({ count: 1 })

      const dto = { name: 'Updated Name' }
      const result = await service.updatePipeline(
        PIPELINE_ID,
        dto as never,
        buildMockUser() as never
      )

      expect(result).toBeDefined()
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when pipeline does not exist', async () => {
      repository.findFirstPipelineByIdAndTenant.mockResolvedValue(null)

      try {
        await service.updatePipeline('nonexistent', {} as never, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 404 when updateMany returns count 0', async () => {
      const existing = buildMockPipeline()
      repository.findFirstPipelineByIdAndTenant
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(null)
      repository.updateManyPipelinesByIdAndTenant.mockResolvedValue({ count: 0 })

      try {
        await service.updatePipeline(
          PIPELINE_ID,
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
  // deletePipeline
  // ---------------------------------------------------------------------------
  describe('deletePipeline', () => {
    it('should delete a pipeline and return deleted: true', async () => {
      repository.findFirstPipelineByIdAndTenant.mockResolvedValue(buildMockPipeline())
      repository.deleteManyPipelinesByIdAndTenant.mockResolvedValue({ count: 1 })

      const result = await service.deletePipeline(PIPELINE_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteManyPipelinesByIdAndTenant).toHaveBeenCalledWith(
        PIPELINE_ID,
        TENANT_ID
      )
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when pipeline does not exist', async () => {
      repository.findFirstPipelineByIdAndTenant.mockResolvedValue(null)

      try {
        await service.deletePipeline('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // getNormalizationStats
  // ---------------------------------------------------------------------------
  describe('getNormalizationStats', () => {
    it('should return aggregated stats', async () => {
      repository.countPipelines.mockResolvedValue(10)
      repository.countPipelinesByStatus
        .mockResolvedValueOnce(6) // active
        .mockResolvedValueOnce(3) // inactive
        .mockResolvedValueOnce(1) // error
      repository.aggregatePipelinesSums.mockResolvedValue({
        _sum: { processedCount: BigInt(50000), errorCount: 150 },
      })

      const result = await service.getNormalizationStats(TENANT_ID)

      expect(result.totalPipelines).toBe(10)
      expect(result.activePipelines).toBe(6)
      expect(result.inactivePipelines).toBe(3)
      expect(result.errorPipelines).toBe(1)
      expect(result.totalEventsProcessed).toBe('50000')
      expect(result.totalErrors).toBe(150)
    })

    it('should handle null aggregate sums', async () => {
      repository.countPipelines.mockResolvedValue(0)
      repository.countPipelinesByStatus.mockResolvedValue(0)
      repository.aggregatePipelinesSums.mockResolvedValue({
        _sum: { processedCount: null, errorCount: null },
      })

      const result = await service.getNormalizationStats(TENANT_ID)

      expect(result.totalEventsProcessed).toBe('0')
      expect(result.totalErrors).toBe(0)
    })

    it('should enforce tenant isolation', async () => {
      repository.countPipelines.mockResolvedValue(0)
      repository.countPipelinesByStatus.mockResolvedValue(0)
      repository.aggregatePipelinesSums.mockResolvedValue({
        _sum: { processedCount: null, errorCount: null },
      })

      await service.getNormalizationStats('other-tenant')

      expect(repository.countPipelines).toHaveBeenCalledWith({ tenantId: 'other-tenant' })
      expect(repository.aggregatePipelinesSums).toHaveBeenCalledWith('other-tenant')
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database error')
      repository.countPipelines.mockRejectedValue(dbError)

      try {
        await service.getNormalizationStats(TENANT_ID)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })
  })
})
