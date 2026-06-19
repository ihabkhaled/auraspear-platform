import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import api from '@/lib/api'
import { cloudSecurityService } from '@/services/cloud-security.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('cloudSecurityService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── Accounts ───────────────────────────────────────────────────

  describe('listAccounts', () => {
    it('should call GET /cloud-security/accounts without params', async () => {
      const accounts = [{ id: 'acc-1', provider: 'aws', name: 'Production' }]
      mockGet.mockResolvedValue({ data: { data: accounts } })

      const result = await cloudSecurityService.listAccounts()

      expect(mockGet).toHaveBeenCalledWith('/cloud-security/accounts', { params: undefined })
      expect(result).toEqual({ data: accounts })
    })

    it('should call GET /cloud-security/accounts with search params', async () => {
      const accounts = [{ id: 'acc-2', provider: 'azure', name: 'Staging' }]
      mockGet.mockResolvedValue({ data: { data: accounts } })

      const params = { provider: 'azure', page: 1 }
      const result = await cloudSecurityService.listAccounts(params)

      expect(mockGet).toHaveBeenCalledWith('/cloud-security/accounts', { params })
      expect(result).toEqual({ data: accounts })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(cloudSecurityService.listAccounts()).rejects.toThrow('Network error')
    })
  })

  describe('getAccountById', () => {
    it('should call GET /cloud-security/accounts/:id', async () => {
      const account = { id: 'acc-1', provider: 'aws', name: 'Production' }
      mockGet.mockResolvedValue({ data: { data: account } })

      const result = await cloudSecurityService.getAccountById('acc-1')

      expect(mockGet).toHaveBeenCalledWith('/cloud-security/accounts/acc-1')
      expect(result).toEqual({ data: account })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(cloudSecurityService.getAccountById('acc-999')).rejects.toThrow('Not found')
    })
  })

  describe('createAccount', () => {
    it('should call POST /cloud-security/accounts', async () => {
      const account = { id: 'acc-3', provider: 'gcp', name: 'New Account' }
      mockPost.mockResolvedValue({ data: { data: account } })

      const input = { provider: 'gcp', name: 'New Account', credentials: 'secret' }
      const result = await cloudSecurityService.createAccount(input)

      expect(mockPost).toHaveBeenCalledWith('/cloud-security/accounts', input)
      expect(result).toEqual({ data: account })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(cloudSecurityService.createAccount({ name: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  describe('updateAccount', () => {
    it('should call PATCH /cloud-security/accounts/:id', async () => {
      const account = { id: 'acc-1', provider: 'aws', name: 'Updated Account' }
      mockPatch.mockResolvedValue({ data: { data: account } })

      const input = { name: 'Updated Account' }
      const result = await cloudSecurityService.updateAccount('acc-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/cloud-security/accounts/acc-1', input)
      expect(result).toEqual({ data: account })
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(cloudSecurityService.updateAccount('acc-1', { name: 'x' })).rejects.toThrow(
        'Forbidden'
      )
    })
  })

  describe('deleteAccount', () => {
    it('should call DELETE /cloud-security/accounts/:id', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await cloudSecurityService.deleteAccount('acc-1')

      expect(mockDelete).toHaveBeenCalledWith('/cloud-security/accounts/acc-1')
      expect(result).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(cloudSecurityService.deleteAccount('acc-999')).rejects.toThrow('Not found')
    })
  })

  // ─── Findings ───────────────────────────────────────────────────

  describe('listFindings', () => {
    it('should call GET /cloud-security/findings without params', async () => {
      const findings = [{ id: 'find-1', title: 'Open S3 Bucket', severity: 'critical' }]
      mockGet.mockResolvedValue({ data: { data: findings } })

      const result = await cloudSecurityService.listFindings()

      expect(mockGet).toHaveBeenCalledWith('/cloud-security/findings', { params: undefined })
      expect(result).toEqual({ data: findings })
    })

    it('should call GET /cloud-security/findings with search params', async () => {
      const findings = [{ id: 'find-2', title: 'Unencrypted RDS', severity: 'high' }]
      mockGet.mockResolvedValue({ data: { data: findings } })

      const params = { severity: 'high', accountId: 'acc-1', page: 1 }
      const result = await cloudSecurityService.listFindings(params)

      expect(mockGet).toHaveBeenCalledWith('/cloud-security/findings', { params })
      expect(result).toEqual({ data: findings })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(cloudSecurityService.listFindings()).rejects.toThrow('Network error')
    })
  })

  // ─── Stats ──────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should call GET /cloud-security/stats', async () => {
      const stats = { totalAccounts: 5, totalFindings: 42, criticalFindings: 3 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await cloudSecurityService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/cloud-security/stats')
      expect(result).toEqual({ data: stats })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(cloudSecurityService.getStats()).rejects.toThrow('Server error')
    })
  })
})
