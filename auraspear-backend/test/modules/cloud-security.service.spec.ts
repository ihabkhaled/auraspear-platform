import {
  CloudAccountStatus,
  CloudFindingSeverity,
  CloudFindingStatus,
} from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { toDay } from '../../src/common/utils/date-time.utility'
import { CloudSecurityService } from '../../src/modules/cloud-security/cloud-security.service'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const TENANT_ID = 'tenant-001'
const ACCOUNT_ID = 'account-001'
const USER_EMAIL = 'analyst@auraspear.com'

function buildMockUser() {
  return {
    sub: 'user-001',
    email: USER_EMAIL,
    tenantId: TENANT_ID,
    role: 'SOC_ANALYST',
  }
}

function buildMockAccount(overrides: Record<string, unknown> = {}) {
  return {
    id: ACCOUNT_ID,
    tenantId: TENANT_ID,
    provider: 'aws',
    accountId: '123456789012',
    alias: 'Production AWS',
    region: 'us-east-1',
    status: CloudAccountStatus.CONNECTED,
    lastScanAt: toDay('2025-06-01T12:00:00Z').toDate(),
    findingsCount: 15,
    complianceScore: 85,
    createdAt: toDay('2025-05-01T00:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T12:00:00Z').toDate(),
    ...overrides,
  }
}

function buildMockFinding(overrides: Record<string, unknown> = {}) {
  return {
    id: 'finding-001',
    tenantId: TENANT_ID,
    cloudAccountId: ACCOUNT_ID,
    title: 'S3 Bucket Public Access',
    description: 'S3 bucket has public read access enabled',
    severity: CloudFindingSeverity.HIGH,
    status: CloudFindingStatus.OPEN,
    resourceId: 'arn:aws:s3:::my-bucket',
    resourceType: 's3_bucket',
    remediationSteps: 'Disable public access',
    detectedAt: toDay('2025-06-01T10:00:00Z').toDate(),
    resolvedAt: null,
    createdAt: toDay('2025-06-01T10:00:00Z').toDate(),
    updatedAt: toDay('2025-06-01T10:00:00Z').toDate(),
    ...overrides,
  }
}

function createMockRepository() {
  return {
    findManyAccounts: jest.fn(),
    countAccounts: jest.fn(),
    findFirstAccount: jest.fn(),
    createAccount: jest.fn(),
    updateManyAccounts: jest.fn(),
    deleteManyAccounts: jest.fn(),
    countAccountsByStatus: jest.fn(),
    findManyFindings: jest.fn(),
    countFindings: jest.fn(),
    countFindingsByStatus: jest.fn(),
    countFindingsBySeverity: jest.fn(),
  }
}

describe('CloudSecurityService', () => {
  let service: CloudSecurityService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    repository = createMockRepository()
    jest.clearAllMocks()

    service = new CloudSecurityService(repository as never, mockAppLogger as never)
  })

  // ---------------------------------------------------------------------------
  // listAccounts
  // ---------------------------------------------------------------------------
  describe('listAccounts', () => {
    it('should return paginated cloud accounts', async () => {
      const accounts = [buildMockAccount(), buildMockAccount({ id: 'account-002' })]
      repository.findManyAccounts.mockResolvedValue(accounts)
      repository.countAccounts.mockResolvedValue(2)

      const result = await service.listAccounts(TENANT_ID)

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

    it('should filter by provider', async () => {
      repository.findManyAccounts.mockResolvedValue([])
      repository.countAccounts.mockResolvedValue(0)

      await service.listAccounts(TENANT_ID, 1, 20, undefined, undefined, 'aws')

      const whereArgument = repository.findManyAccounts.mock.calls[0][0].where
      expect(whereArgument['provider']).toBe('aws')
    })

    it('should filter by status', async () => {
      repository.findManyAccounts.mockResolvedValue([])
      repository.countAccounts.mockResolvedValue(0)

      await service.listAccounts(TENANT_ID, 1, 20, undefined, undefined, undefined, 'connected')

      const whereArgument = repository.findManyAccounts.mock.calls[0][0].where
      expect(whereArgument['status']).toBe('connected')
    })

    it('should handle empty results', async () => {
      repository.findManyAccounts.mockResolvedValue([])
      repository.countAccounts.mockResolvedValue(0)

      const result = await service.listAccounts(TENANT_ID)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyAccounts.mockResolvedValue([])
      repository.countAccounts.mockResolvedValue(100)

      await service.listAccounts(TENANT_ID, 3, 10)

      expect(repository.findManyAccounts).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should enforce tenant isolation', async () => {
      repository.findManyAccounts.mockResolvedValue([])
      repository.countAccounts.mockResolvedValue(0)

      await service.listAccounts('other-tenant')

      const whereArgument = repository.findManyAccounts.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getAccountById
  // ---------------------------------------------------------------------------
  describe('getAccountById', () => {
    it('should return account when found', async () => {
      repository.findFirstAccount.mockResolvedValue(buildMockAccount())

      const result = await service.getAccountById(ACCOUNT_ID, TENANT_ID)

      expect(result.id).toBe(ACCOUNT_ID)
      expect(result.provider).toBe('aws')
      expect(result.complianceScore).toBe(85)
    })

    it('should throw BusinessException 404 when not found', async () => {
      repository.findFirstAccount.mockResolvedValue(null)

      try {
        await service.getAccountById('nonexistent', TENANT_ID)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should enforce tenant isolation', async () => {
      repository.findFirstAccount.mockResolvedValue(null)

      try {
        await service.getAccountById(ACCOUNT_ID, 'other-tenant')
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
      }

      expect(repository.findFirstAccount).toHaveBeenCalledWith({
        id: ACCOUNT_ID,
        tenantId: 'other-tenant',
      })
    })
  })

  // ---------------------------------------------------------------------------
  // createAccount
  // ---------------------------------------------------------------------------
  describe('createAccount', () => {
    it('should create an account with DISCONNECTED status', async () => {
      const created = buildMockAccount({ status: CloudAccountStatus.DISCONNECTED })
      repository.createAccount.mockResolvedValue(created)

      const dto = {
        provider: 'aws',
        accountId: '123456789012',
        alias: 'Production AWS',
        region: 'us-east-1',
      }

      const result = await service.createAccount(dto as never, buildMockUser() as never)

      expect(result.status).toBe(CloudAccountStatus.DISCONNECTED)
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should use user tenantId', async () => {
      repository.createAccount.mockResolvedValue(buildMockAccount())

      const dto = { provider: 'aws', accountId: '123456789012' }
      await service.createAccount(dto as never, buildMockUser() as never)

      const createArgument = repository.createAccount.mock.calls[0][0]
      expect(createArgument.tenantId).toBe(TENANT_ID)
    })

    it('should handle null alias and region', async () => {
      const created = buildMockAccount({ alias: null, region: null })
      repository.createAccount.mockResolvedValue(created)

      const dto = { provider: 'gcp', accountId: 'project-id' }
      await service.createAccount(dto as never, buildMockUser() as never)

      const createArgument = repository.createAccount.mock.calls[0][0]
      expect(createArgument.alias).toBeNull()
      expect(createArgument.region).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // updateAccount
  // ---------------------------------------------------------------------------
  describe('updateAccount', () => {
    it('should update account fields', async () => {
      const existing = buildMockAccount()
      repository.findFirstAccount.mockResolvedValue(existing)
      repository.updateManyAccounts.mockResolvedValue({ count: 1 })

      const dto = { alias: 'Updated Alias' }
      const result = await service.updateAccount(ACCOUNT_ID, dto as never, buildMockUser() as never)

      expect(result).toBeDefined()
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when account does not exist', async () => {
      repository.findFirstAccount.mockResolvedValue(null)

      try {
        await service.updateAccount('nonexistent', {} as never, buildMockUser() as never)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })

    it('should throw BusinessException 404 when updateMany returns count 0', async () => {
      const existing = buildMockAccount()
      repository.findFirstAccount.mockResolvedValueOnce(existing).mockResolvedValueOnce(null)
      repository.updateManyAccounts.mockResolvedValue({ count: 0 })

      try {
        await service.updateAccount(
          ACCOUNT_ID,
          { alias: 'Test' } as never,
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
  // deleteAccount
  // ---------------------------------------------------------------------------
  describe('deleteAccount', () => {
    it('should delete an account and return deleted: true', async () => {
      repository.findFirstAccount.mockResolvedValue(buildMockAccount())
      repository.deleteManyAccounts.mockResolvedValue({ count: 1 })

      const result = await service.deleteAccount(ACCOUNT_ID, TENANT_ID, USER_EMAIL)

      expect(result).toEqual({ deleted: true })
      expect(repository.deleteManyAccounts).toHaveBeenCalledWith({
        id: ACCOUNT_ID,
        tenantId: TENANT_ID,
      })
      expect(mockAppLogger.info).toHaveBeenCalled()
    })

    it('should throw BusinessException 404 when account does not exist', async () => {
      repository.findFirstAccount.mockResolvedValue(null)

      try {
        await service.deleteAccount('nonexistent', TENANT_ID, USER_EMAIL)
        fail('Expected BusinessException to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessException)
        expect((error as BusinessException).getStatus()).toBe(404)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // listFindings
  // ---------------------------------------------------------------------------
  describe('listFindings', () => {
    it('should return paginated findings', async () => {
      const findings = [buildMockFinding()]
      repository.findManyFindings.mockResolvedValue(findings)
      repository.countFindings.mockResolvedValue(1)

      const result = await service.listFindings(TENANT_ID)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.title).toBe('S3 Bucket Public Access')
    })

    it('should filter by severity', async () => {
      repository.findManyFindings.mockResolvedValue([])
      repository.countFindings.mockResolvedValue(0)

      await service.listFindings(TENANT_ID, 1, 20, undefined, undefined, 'critical')

      const whereArgument = repository.findManyFindings.mock.calls[0][0].where
      expect(whereArgument['severity']).toBe('critical')
    })

    it('should filter by status', async () => {
      repository.findManyFindings.mockResolvedValue([])
      repository.countFindings.mockResolvedValue(0)

      await service.listFindings(TENANT_ID, 1, 20, undefined, undefined, undefined, 'open')

      const whereArgument = repository.findManyFindings.mock.calls[0][0].where
      expect(whereArgument['status']).toBe('open')
    })

    it('should filter by cloudAccountId', async () => {
      repository.findManyFindings.mockResolvedValue([])
      repository.countFindings.mockResolvedValue(0)

      await service.listFindings(
        TENANT_ID,
        1,
        20,
        undefined,
        undefined,
        undefined,
        undefined,
        ACCOUNT_ID
      )

      const whereArgument = repository.findManyFindings.mock.calls[0][0].where
      expect(whereArgument['cloudAccountId']).toBe(ACCOUNT_ID)
    })

    it('should handle empty results', async () => {
      repository.findManyFindings.mockResolvedValue([])
      repository.countFindings.mockResolvedValue(0)

      const result = await service.listFindings(TENANT_ID)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
    })

    it('should apply correct pagination skip and take', async () => {
      repository.findManyFindings.mockResolvedValue([])
      repository.countFindings.mockResolvedValue(100)

      await service.listFindings(TENANT_ID, 3, 10)

      expect(repository.findManyFindings).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      )
    })

    it('should enforce tenant isolation', async () => {
      repository.findManyFindings.mockResolvedValue([])
      repository.countFindings.mockResolvedValue(0)

      await service.listFindings('other-tenant')

      const whereArgument = repository.findManyFindings.mock.calls[0][0].where
      expect(whereArgument.tenantId).toBe('other-tenant')
    })
  })

  // ---------------------------------------------------------------------------
  // getCloudSecurityStats
  // ---------------------------------------------------------------------------
  describe('getCloudSecurityStats', () => {
    it('should return aggregated cloud security stats', async () => {
      repository.countAccounts.mockResolvedValue(5)
      repository.countAccountsByStatus
        .mockResolvedValueOnce(3) // connected
        .mockResolvedValueOnce(1) // disconnected
        .mockResolvedValueOnce(1) // error
      repository.countFindings.mockResolvedValue(50)
      repository.countFindingsByStatus
        .mockResolvedValueOnce(30) // open
        .mockResolvedValueOnce(15) // resolved
        .mockResolvedValueOnce(5) // suppressed
      repository.countFindingsBySeverity
        .mockResolvedValueOnce(8) // critical
        .mockResolvedValueOnce(12) // high

      const result = await service.getCloudSecurityStats(TENANT_ID)

      expect(result.totalAccounts).toBe(5)
      expect(result.connectedAccounts).toBe(3)
      expect(result.disconnectedAccounts).toBe(1)
      expect(result.errorAccounts).toBe(1)
      expect(result.totalFindings).toBe(50)
      expect(result.openFindings).toBe(30)
      expect(result.resolvedFindings).toBe(15)
      expect(result.suppressedFindings).toBe(5)
      expect(result.criticalFindings).toBe(8)
      expect(result.highFindings).toBe(12)
    })

    it('should handle zero counts', async () => {
      repository.countAccounts.mockResolvedValue(0)
      repository.countAccountsByStatus.mockResolvedValue(0)
      repository.countFindings.mockResolvedValue(0)
      repository.countFindingsByStatus.mockResolvedValue(0)
      repository.countFindingsBySeverity.mockResolvedValue(0)

      const result = await service.getCloudSecurityStats(TENANT_ID)

      expect(result.totalAccounts).toBe(0)
      expect(result.totalFindings).toBe(0)
      expect(result.criticalFindings).toBe(0)
    })

    it('should enforce tenant isolation', async () => {
      repository.countAccounts.mockResolvedValue(0)
      repository.countAccountsByStatus.mockResolvedValue(0)
      repository.countFindings.mockResolvedValue(0)
      repository.countFindingsByStatus.mockResolvedValue(0)
      repository.countFindingsBySeverity.mockResolvedValue(0)

      await service.getCloudSecurityStats('other-tenant')

      expect(repository.countAccounts).toHaveBeenCalledWith({ tenantId: 'other-tenant' })
      expect(repository.countFindings).toHaveBeenCalledWith({ tenantId: 'other-tenant' })
    })

    it('should rethrow errors from repository', async () => {
      const dbError = new Error('Database error')
      repository.countAccounts.mockRejectedValue(dbError)

      try {
        await service.getCloudSecurityStats(TENANT_ID)
        fail('Expected error to be thrown')
      } catch (error) {
        expect(error).toBe(dbError)
      }
    })
  })
})
