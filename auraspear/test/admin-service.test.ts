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
import { adminService } from '@/services/admin.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('adminService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getTenants ────────────────────────────────────────────────

  describe('getTenants', () => {
    it('should call GET /admin/tenants without params', async () => {
      const tenants = [{ id: 't-1', name: 'Acme Corp' }]
      mockGet.mockResolvedValue({ data: { data: tenants } })

      const result = await adminService.getTenants()

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants', { params: undefined })
      expect(result).toEqual({ data: tenants })
    })

    it('should call GET /admin/tenants with params', async () => {
      const tenants = [{ id: 't-2', name: 'Beta Inc' }]
      mockGet.mockResolvedValue({ data: { data: tenants } })

      const params = { search: 'Beta', page: 1 }
      const result = await adminService.getTenants(params)

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants', { params })
      expect(result).toEqual({ data: tenants })
    })
  })

  // ─── createTenant ─────────────────────────────────────────────

  describe('createTenant', () => {
    it('should call POST /admin/tenants', async () => {
      const tenant = { id: 't-3', name: 'New Tenant' }
      mockPost.mockResolvedValue({ data: { data: tenant } })

      const input = { name: 'New Tenant', slug: 'new-tenant' }
      const result = await adminService.createTenant(input)

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants', input)
      expect(result).toEqual({ data: tenant })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(adminService.createTenant({ name: '', slug: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  // ─── getUsers ─────────────────────────────────────────────────

  describe('getUsers', () => {
    it('should call GET /admin/tenants/:tenantId/users', async () => {
      const users = [{ id: 'u-1', name: 'Alice', role: 'analyst' }]
      mockGet.mockResolvedValue({ data: { data: users } })

      const result = await adminService.getUsers('t-1')

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants/t-1/users', { params: undefined })
      expect(result).toEqual({ data: users })
    })

    it('should pass search params', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      const params = { search: 'alice', page: 1 }
      await adminService.getUsers('t-1', params)

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants/t-1/users', { params })
    })
  })

  // ─── addUser ──────────────────────────────────────────────────

  describe('addUser', () => {
    it('should call POST /admin/tenants/:tenantId/users', async () => {
      const user = { id: 'u-2', name: 'Bob', role: 'analyst' }
      mockPost.mockResolvedValue({ data: { data: user } })

      const input = { email: 'bob@example.com', name: 'Bob', role: 'analyst', password: 'pass' }
      const result = await adminService.addUser('t-1', input)

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants/t-1/users', input)
      expect(result).toEqual({ data: user })
    })
  })

  // ─── updateUser ───────────────────────────────────────────────

  describe('updateUser', () => {
    it('should call PATCH /admin/tenants/:tenantId/users/:userId', async () => {
      const user = { id: 'u-1', name: 'Alice Updated', role: 'admin' }
      mockPatch.mockResolvedValue({ data: { data: user } })

      const result = await adminService.updateUser('t-1', 'u-1', { role: 'admin' })

      expect(mockPatch).toHaveBeenCalledWith('/admin/tenants/t-1/users/u-1', { role: 'admin' })
      expect(result).toEqual({ data: user })
    })
  })

  // ─── removeUser ───────────────────────────────────────────────

  describe('removeUser', () => {
    it('should call DELETE /admin/tenants/:tenantId/users/:userId', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await adminService.removeUser('t-1', 'u-1')

      expect(mockDelete).toHaveBeenCalledWith('/admin/tenants/t-1/users/u-1')
      expect(result).toEqual({ data: { deleted: true } })
    })
  })

  // ─── blockUser / unblockUser ──────────────────────────────────

  describe('blockUser', () => {
    it('should call POST /admin/tenants/:tenantId/users/:userId/block', async () => {
      const user = { id: 'u-1', status: 'suspended' }
      mockPost.mockResolvedValue({ data: { data: user } })

      const result = await adminService.blockUser('t-1', 'u-1')

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants/t-1/users/u-1/block')
      expect(result).toEqual({ data: user })
    })
  })

  describe('unblockUser', () => {
    it('should call POST /admin/tenants/:tenantId/users/:userId/unblock', async () => {
      const user = { id: 'u-1', status: 'active' }
      mockPost.mockResolvedValue({ data: { data: user } })

      const result = await adminService.unblockUser('t-1', 'u-1')

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants/t-1/users/u-1/unblock')
      expect(result).toEqual({ data: user })
    })
  })

  // ─── getAuditLogs ─────────────────────────────────────────────

  describe('getAuditLogs', () => {
    it('should call GET /admin/audit-logs with params', async () => {
      const logs = [{ id: 'log-1', action: 'LOGIN', userId: 'u-1' }]
      mockGet.mockResolvedValue({ data: { data: logs } })

      const params = { page: 1, limit: 50 }
      const result = await adminService.getAuditLogs(params)

      expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs', { params })
      expect(result).toEqual({ data: logs })
    })
  })

  // ─── getServiceHealth ─────────────────────────────────────────

  describe('getServiceHealth', () => {
    it('should call GET /admin/health', async () => {
      const health = [{ name: 'database', status: 'healthy' }]
      mockGet.mockResolvedValue({ data: { data: health } })

      const result = await adminService.getServiceHealth()

      expect(mockGet).toHaveBeenCalledWith('/admin/health')
      expect(result).toEqual({ data: health })
    })
  })
})
