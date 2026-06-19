import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { VulnerabilitiesService } from '../../src/modules/vulnerabilities/vulnerabilities.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const VULN_ID = 'vuln-001'
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
    findManyWithTenant: jest.fn(),
    count: jest.fn(),
    findByIdAndTenant: jest.fn(),
    findByCveIdAndTenant: jest.fn(),
    findByCveIdAndTenantExcludingId: jest.fn(),
    findExistingByIdAndTenant: jest.fn(),
    createWithTenant: jest.fn(),
    updateByIdAndTenant: jest.fn(),
    deleteByIdAndTenant: jest.fn(),
  }
}

function buildMockVulnerability(overrides: Record<string, unknown> = {}) {
  return {
    id: VULN_ID,
    tenantId: TENANT_ID,
    cveId: 'CVE-2025-1234',
    cvssScore: 9.1,
    severity: 'critical',
    description: 'Remote code execution vulnerability in OpenSSL',
    affectedHosts: 15,
    exploitAvailable: true,
    patchStatus: 'patch_pending',
    affectedSoftware: 'OpenSSL 3.0.x',
    remediation: 'Upgrade to OpenSSL 3.0.14',
    patchedAt: null,
    discoveredAt: toDay('2025-06-01T12:00:00Z').toDate(),
    createdAt: toDay('2025-06-01T12:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    tenant: { name: 'Test Tenant' },
    ...overrides,
  }
}

describe('VulnerabilitiesService', () => {
  let service: VulnerabilitiesService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new VulnerabilitiesService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listVulnerabilities
  // ---------------------------------------------------------------------------
  describe('listVulnerabilities', () => {
    it('should return paginated results with data and pagination meta', async () => {
      const vulns = [
        buildMockVulnerability(),
        buildMockVulnerability({ id: 'vuln-002', cveId: 'CVE-2025-5678' }),
      ]
      repository.findManyWithTenant.mockResolvedValue(vulns)
      repository.count.mockResolvedValue(2)

      const result = await service.listVulnerabilities(TENANT_ID, 1, 20, 'cvssScore', 'desc')

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

      await service.listVulnerabilities(TENANT_ID, 1, 20, 'cvssScore', 'desc')

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.tenantId).toBe(TENANT_ID)
    })

    it('should filter by single severity', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(TENANT_ID, 1, 20, 'cvssScore', 'desc', 'critical')

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.severity).toBe('critical')
    })

    it('should filter by comma-separated multiple severities', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(TENANT_ID, 1, 20, 'cvssScore', 'desc', 'critical,high')

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.severity).toEqual({ in: ['critical', 'high'] })
    })

    it('should ignore invalid severities in comma-separated list', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(TENANT_ID, 1, 20, 'cvssScore', 'desc', 'critical,bogus')

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.severity).toBe('critical')
    })

    it('should filter by single patchStatus', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(
        TENANT_ID,
        1,
        20,
        'cvssScore',
        'desc',
        undefined,
        'mitigated'
      )

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.patchStatus).toBe('mitigated')
    })

    it('should filter by comma-separated multiple patchStatuses', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(
        TENANT_ID,
        1,
        20,
        'cvssScore',
        'desc',
        undefined,
        'patch_pending,patching'
      )

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.patchStatus).toEqual({ in: ['patch_pending', 'patching'] })
    })

    it('should ignore invalid patchStatuses in comma-separated list', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(
        TENANT_ID,
        1,
        20,
        'cvssScore',
        'desc',
        undefined,
        'mitigated,invalid_status'
      )

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.patchStatus).toBe('mitigated')
    })

    it('should filter by exploitAvailable true', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(
        TENANT_ID,
        1,
        20,
        'cvssScore',
        'desc',
        undefined,
        undefined,
        'true'
      )

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.exploitAvailable).toBe(true)
    })

    it('should filter by exploitAvailable false', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(
        TENANT_ID,
        1,
        20,
        'cvssScore',
        'desc',
        undefined,
        undefined,
        'false'
      )

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.exploitAvailable).toBe(false)
    })

    it('should not filter exploitAvailable for non-boolean strings', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(
        TENANT_ID,
        1,
        20,
        'cvssScore',
        'desc',
        undefined,
        undefined,
        'maybe'
      )

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.exploitAvailable).toBeUndefined()
    })

    it('should apply free text search across cveId, description, affectedSoftware, remediation', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(
        TENANT_ID,
        1,
        20,
        'cvssScore',
        'desc',
        undefined,
        undefined,
        undefined,
        'OpenSSL'
      )

      const whereArgument = repository.findManyWithTenant.mock.calls[0][0]
      expect(whereArgument.OR).toBeDefined()
      expect(whereArgument.OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            cveId: { contains: 'OpenSSL', mode: 'insensitive' },
          }),
          expect.objectContaining({
            description: { contains: 'OpenSSL', mode: 'insensitive' },
          }),
          expect.objectContaining({
            affectedSoftware: { contains: 'OpenSSL', mode: 'insensitive' },
          }),
          expect.objectContaining({
            remediation: { contains: 'OpenSSL', mode: 'insensitive' },
          }),
        ])
      )
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(100)

      await service.listVulnerabilities(TENANT_ID, 3, 10, 'cvssScore', 'desc')

      expect(repository.findManyWithTenant).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        20, // skip = (3-1) * 10
        10 // take
      )
    })

    it('should handle empty results', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      const result = await service.listVulnerabilities(TENANT_ID, 1, 20, 'cvssScore', 'desc')

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })

    it('should map tenantName from tenant relation', async () => {
      const vulns = [buildMockVulnerability()]
      repository.findManyWithTenant.mockResolvedValue(vulns)
      repository.count.mockResolvedValue(1)

      const result = await service.listVulnerabilities(TENANT_ID, 1, 20, 'cvssScore', 'desc')

      expect(result.data[0].tenantName).toBe('Test Tenant')
    })

    it('should use cvssScore desc as default sort', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(TENANT_ID, 1, 20, 'unknownField', 'desc')

      const orderByArgument = repository.findManyWithTenant.mock.calls[0][1]
      expect(orderByArgument).toEqual({ cvssScore: 'desc' })
    })

    it('should sort by specified sortBy field', async () => {
      repository.findManyWithTenant.mockResolvedValue([])
      repository.count.mockResolvedValue(0)

      await service.listVulnerabilities(TENANT_ID, 1, 20, 'severity', 'asc')

      const orderByArgument = repository.findManyWithTenant.mock.calls[0][1]
      expect(orderByArgument).toEqual({ severity: 'asc' })
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database connection lost')
      repository.findManyWithTenant.mockRejectedValue(dbError)

      try {
        await service.listVulnerabilities(TENANT_ID, 1, 20, 'cvssScore', 'desc')
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // getVulnerabilityById
  // ---------------------------------------------------------------------------
  describe('getVulnerabilityById', () => {
    it('should return vulnerability with tenantName when found', async () => {
      const vuln = buildMockVulnerability()
      repository.findByIdAndTenant.mockResolvedValue(vuln)

      const result = await service.getVulnerabilityById(VULN_ID, TENANT_ID)

      expect(result.id).toBe(VULN_ID)
      expect(result.tenantName).toBe('Test Tenant')
      expect(repository.findByIdAndTenant).toHaveBeenCalledWith(VULN_ID, TENANT_ID)
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findByIdAndTenant.mockResolvedValue(null)

      try {
        await service.getVulnerabilityById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should always include tenantId in query', async () => {
      repository.findByIdAndTenant.mockResolvedValue(null)

      try {
        await service.getVulnerabilityById(VULN_ID, TENANT_ID)
      } catch {
        // expected
      }

      expect(repository.findByIdAndTenant).toHaveBeenCalledWith(VULN_ID, TENANT_ID)
    })
  })

  // ---------------------------------------------------------------------------
  // createVulnerability
  // ---------------------------------------------------------------------------
  describe('createVulnerability', () => {
    const baseDto = {
      cveId: 'CVE-2025-9999',
      cvssScore: 8.5,
      severity: 'high' as const,
      description: 'Buffer overflow vulnerability',
      affectedHosts: 10,
      exploitAvailable: false,
      patchStatus: 'patch_pending' as const,
    }

    it('should create vulnerability and return record with tenantName', async () => {
      repository.findByCveIdAndTenant.mockResolvedValue(null)
      const created = buildMockVulnerability({
        cveId: 'CVE-2025-9999',
        severity: 'high',
        cvssScore: 8.5,
      })
      repository.createWithTenant.mockResolvedValue(created)

      const result = await service.createVulnerability(baseDto, buildMockJwtPayload() as never)

      expect(result.cveId).toBe('CVE-2025-9999')
      expect(result.tenantName).toBe('Test Tenant')
      expect(repository.createWithTenant).toHaveBeenCalledTimes(1)
    })

    it('should use tenantId from JWT payload', async () => {
      repository.findByCveIdAndTenant.mockResolvedValue(null)
      const created = buildMockVulnerability()
      repository.createWithTenant.mockResolvedValue(created)

      await service.createVulnerability(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      expect(callArguments.tenantId).toBe(TENANT_ID)
    })

    it('should throw BusinessException 409 when CVE ID already exists for tenant', async () => {
      repository.findByCveIdAndTenant.mockResolvedValue({
        id: 'existing-vuln',
        cveId: 'CVE-2025-9999',
      })

      try {
        await service.createVulnerability(baseDto, buildMockJwtPayload() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(409)
      }

      expect(repository.createWithTenant).not.toHaveBeenCalled()
    })

    it('should check duplicate within correct tenant', async () => {
      repository.findByCveIdAndTenant.mockResolvedValue(null)
      const created = buildMockVulnerability()
      repository.createWithTenant.mockResolvedValue(created)

      await service.createVulnerability(baseDto, buildMockJwtPayload() as never)

      expect(repository.findByCveIdAndTenant).toHaveBeenCalledWith(TENANT_ID, 'CVE-2025-9999')
    })

    it('should set discoveredAt to current date', async () => {
      repository.findByCveIdAndTenant.mockResolvedValue(null)
      const created = buildMockVulnerability()
      repository.createWithTenant.mockResolvedValue(created)

      const before = nowDate()
      await service.createVulnerability(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      expect(callArguments.discoveredAt).toBeInstanceOf(Date)
      expect(callArguments.discoveredAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
    })

    it('should pass optional fields as null when not provided', async () => {
      repository.findByCveIdAndTenant.mockResolvedValue(null)
      const created = buildMockVulnerability()
      repository.createWithTenant.mockResolvedValue(created)

      await service.createVulnerability(baseDto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      expect(callArguments.affectedSoftware).toBeNull()
      expect(callArguments.remediation).toBeNull()
    })

    it('should pass optional fields when provided', async () => {
      repository.findByCveIdAndTenant.mockResolvedValue(null)
      const created = buildMockVulnerability()
      repository.createWithTenant.mockResolvedValue(created)

      const dto = {
        ...baseDto,
        affectedSoftware: 'nginx 1.25',
        remediation: 'Upgrade to nginx 1.26',
      }
      await service.createVulnerability(dto, buildMockJwtPayload() as never)

      const callArguments = repository.createWithTenant.mock.calls[0][0]
      expect(callArguments.affectedSoftware).toBe('nginx 1.25')
      expect(callArguments.remediation).toBe('Upgrade to nginx 1.26')
    })
  })

  // ---------------------------------------------------------------------------
  // updateVulnerability
  // ---------------------------------------------------------------------------
  describe('updateVulnerability', () => {
    it('should update vulnerability and return record', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue({
        id: VULN_ID,
        cveId: 'CVE-2025-1234',
        patchStatus: 'patch_pending',
        severity: 'critical',
      })
      const updated = buildMockVulnerability({ description: 'Updated description' })
      repository.updateByIdAndTenant.mockResolvedValue(updated)

      const result = await service.updateVulnerability(
        VULN_ID,
        { description: 'Updated description' },
        buildMockJwtPayload() as never
      )

      expect(result).toBeDefined()
      expect(result.tenantName).toBe('Test Tenant')
      expect(repository.updateByIdAndTenant).toHaveBeenCalledTimes(1)
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue(null)

      try {
        await service.updateVulnerability(
          'nonexistent',
          { description: 'test' },
          buildMockJwtPayload() as never
        )
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 409 when changing CVE ID to duplicate', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue({
        id: VULN_ID,
        cveId: 'CVE-2025-1234',
        patchStatus: 'patch_pending',
        severity: 'critical',
      })
      repository.findByCveIdAndTenantExcludingId.mockResolvedValue({ id: 'other-vuln' })

      try {
        await service.updateVulnerability(
          VULN_ID,
          { cveId: 'CVE-2025-5678' },
          buildMockJwtPayload() as never
        )
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(409)
      }
    })

    it('should not check for duplicate when CVE ID is unchanged', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue({
        id: VULN_ID,
        cveId: 'CVE-2025-1234',
        patchStatus: 'patch_pending',
        severity: 'critical',
      })
      const updated = buildMockVulnerability()
      repository.updateByIdAndTenant.mockResolvedValue(updated)

      await service.updateVulnerability(
        VULN_ID,
        { cveId: 'CVE-2025-1234' }, // same CVE
        buildMockJwtPayload() as never
      )

      expect(repository.findByCveIdAndTenantExcludingId).not.toHaveBeenCalled()
    })

    it('should set patchedAt when transitioning to mitigated', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue({
        id: VULN_ID,
        cveId: 'CVE-2025-1234',
        patchStatus: 'patch_pending',
        severity: 'critical',
      })
      const updated = buildMockVulnerability({ patchStatus: 'mitigated' })
      repository.updateByIdAndTenant.mockResolvedValue(updated)

      await service.updateVulnerability(
        VULN_ID,
        { patchStatus: 'mitigated' },
        buildMockJwtPayload() as never
      )

      const callArguments = repository.updateByIdAndTenant.mock.calls[0]
      // Third arg is the data
      expect(callArguments[2].patchedAt).toBeInstanceOf(Date)
    })

    it('should not set patchedAt when already mitigated', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue({
        id: VULN_ID,
        cveId: 'CVE-2025-1234',
        patchStatus: 'mitigated',
        severity: 'critical',
      })
      const updated = buildMockVulnerability({ patchStatus: 'mitigated' })
      repository.updateByIdAndTenant.mockResolvedValue(updated)

      await service.updateVulnerability(
        VULN_ID,
        { patchStatus: 'mitigated' },
        buildMockJwtPayload() as never
      )

      const callArguments = repository.updateByIdAndTenant.mock.calls[0]
      expect(callArguments[2].patchedAt).toBeUndefined()
    })

    it('should only include provided fields in update data', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue({
        id: VULN_ID,
        cveId: 'CVE-2025-1234',
        patchStatus: 'patch_pending',
        severity: 'critical',
      })
      const updated = buildMockVulnerability()
      repository.updateByIdAndTenant.mockResolvedValue(updated)

      await service.updateVulnerability(VULN_ID, { cvssScore: 7.5 }, buildMockJwtPayload() as never)

      const callArguments = repository.updateByIdAndTenant.mock.calls[0]
      const updateData = callArguments[2]
      expect(updateData.cvssScore).toBe(7.5)
      expect(updateData.description).toBeUndefined()
      expect(updateData.severity).toBeUndefined()
    })

    it('should always scope update to tenantId', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue({
        id: VULN_ID,
        cveId: 'CVE-2025-1234',
        patchStatus: 'patch_pending',
        severity: 'critical',
      })
      const updated = buildMockVulnerability()
      repository.updateByIdAndTenant.mockResolvedValue(updated)

      await service.updateVulnerability(
        VULN_ID,
        { description: 'test' },
        buildMockJwtPayload() as never
      )

      expect(repository.updateByIdAndTenant).toHaveBeenCalledWith(
        VULN_ID,
        TENANT_ID,
        expect.anything()
      )
    })
  })

  // ---------------------------------------------------------------------------
  // deleteVulnerability
  // ---------------------------------------------------------------------------
  describe('deleteVulnerability', () => {
    it('should delete vulnerability and return { deleted: true }', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue({
        id: VULN_ID,
        cveId: 'CVE-2025-1234',
        patchStatus: 'patch_pending',
        severity: 'critical',
      })
      repository.deleteByIdAndTenant.mockResolvedValue(undefined)

      const result = await service.deleteVulnerability(VULN_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteByIdAndTenant).toHaveBeenCalledWith(VULN_ID, TENANT_ID)
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue(null)

      try {
        await service.deleteVulnerability('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should always verify tenant ownership before deletion', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue(null)

      try {
        await service.deleteVulnerability(VULN_ID, TENANT_ID, USER_EMAIL)
      } catch {
        // expected
      }

      expect(repository.findExistingByIdAndTenant).toHaveBeenCalledWith(VULN_ID, TENANT_ID)
    })

    it('should log deletion with CVE ID', async () => {
      repository.findExistingByIdAndTenant.mockResolvedValue({
        id: VULN_ID,
        cveId: 'CVE-2025-1234',
        patchStatus: 'patch_pending',
        severity: 'critical',
      })
      repository.deleteByIdAndTenant.mockResolvedValue(undefined)

      await service.deleteVulnerability(VULN_ID, TENANT_ID, USER_EMAIL)

      expect(mockAppLogger.info).toHaveBeenCalledWith(
        'VulnerabilitiesService => deleteVulnerability completed',
        expect.objectContaining({
          action: 'deleteVulnerability',
          tenantId: TENANT_ID,
          outcome: 'success',
          metadata: expect.objectContaining({ cveId: 'CVE-2025-1234' }),
        })
      )
    })
  })

  // ---------------------------------------------------------------------------
  // getVulnerabilityStats
  // ---------------------------------------------------------------------------
  describe('getVulnerabilityStats', () => {
    it('should return correct stats aggregation', async () => {
      repository.count
        .mockResolvedValueOnce(5) // critical
        .mockResolvedValueOnce(12) // high
        .mockResolvedValueOnce(30) // medium
        .mockResolvedValueOnce(8) // patched30d
        .mockResolvedValueOnce(3) // exploitAvailable

      const result = await service.getVulnerabilityStats(TENANT_ID)

      expect(result).toEqual({
        critical: 5,
        high: 12,
        medium: 30,
        patched30d: 8,
        exploitAvailable: 3,
      })
    })

    it('should always scope stats queries to tenantId', async () => {
      repository.count.mockResolvedValue(0)

      await service.getVulnerabilityStats(TENANT_ID)

      for (const call of repository.count.mock.calls) {
        expect(call[0].tenantId).toBe(TENANT_ID)
      }
    })

    it('should filter patched30d by patchedAt within last 30 days', async () => {
      repository.count.mockResolvedValue(0)

      const before = nowDate()
      await service.getVulnerabilityStats(TENANT_ID)

      // The 4th count call is for patched30d (index 3)
      const patched30dCall = repository.count.mock.calls[3][0]
      expect(patched30dCall.patchStatus).toBe('mitigated')
      expect(patched30dCall.patchedAt).toBeDefined()
      expect(patched30dCall.patchedAt.gte).toBeInstanceOf(Date)

      const diffMs = before.getTime() - patched30dCall.patchedAt.gte.getTime()
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
      expect(diffMs).toBeGreaterThan(thirtyDaysMs - 5000)
      expect(diffMs).toBeLessThan(thirtyDaysMs + 5000)
    })

    it('should query exploitAvailable count', async () => {
      repository.count.mockResolvedValue(0)

      await service.getVulnerabilityStats(TENANT_ID)

      // The 5th count call is for exploitAvailable (index 4)
      const exploitCall = repository.count.mock.calls[4][0]
      expect(exploitCall.exploitAvailable).toBe(true)
    })

    it('should handle all zeros gracefully', async () => {
      repository.count.mockResolvedValue(0)

      const result = await service.getVulnerabilityStats(TENANT_ID)

      expect(result).toEqual({
        critical: 0,
        high: 0,
        medium: 0,
        patched30d: 0,
        exploitAvailable: 0,
      })
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database error')
      repository.count.mockRejectedValue(dbError)

      try {
        await service.getVulnerabilityStats(TENANT_ID)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })
  })
})
