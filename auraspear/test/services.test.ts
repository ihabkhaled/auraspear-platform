import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { ConnectorAuthType, ConnectorType } from '@/enums'
// Mock the api module before importing any service
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    put: vi.fn(),
  },
}))
import api from '@/lib/api'
import { adminService } from '@/services/admin.service'
import { alertService } from '@/services/alert.service'
import { authService } from '@/services/auth.service'
import { caseCycleService } from '@/services/case-cycle.service'
import { caseService } from '@/services/case.service'
import { connectorWorkspaceService } from '@/services/connector-workspace.service'
import { connectorService } from '@/services/connector.service'
import { dashboardService } from '@/services/dashboard.service'
import { huntService } from '@/services/hunt.service'
import { intelService } from '@/services/intel.service'
import { profileService } from '@/services/profile.service'
import { settingsService } from '@/services/settings.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Auth Service
// ─────────────────────────────────────────────────────────────────────────────
describe('authService', () => {
  describe('login', () => {
    it('should call POST /auth/login with email and password', async () => {
      const mockResponse = { accessToken: 'at', refreshToken: 'rt', user: { id: 'u1' } }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await authService.login('user@test.com', 'password123')

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'user@test.com',
        password: 'password123',
      })
      expect(result).toEqual(mockResponse)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Invalid credentials'))

      await expect(authService.login('bad@test.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      )
    })
  })

  describe('refresh', () => {
    it('should call POST /auth/refresh with cookie-backed session payload', async () => {
      const mockResponse = { accessToken: 'new-at', csrfToken: 'csrf-token' }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await authService.refresh()

      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {})
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getMe', () => {
    it('should call GET /auth/me', async () => {
      const mockUser = { id: 'u1', email: 'user@test.com', name: 'Test User' }
      mockGet.mockResolvedValue({ data: mockUser })

      const result = await authService.getMe()

      expect(mockGet).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(mockUser)
    })
  })

  describe('getUserTenants', () => {
    it('should call GET /auth/tenants', async () => {
      const mockTenants = [{ tenantId: 't1', tenantName: 'Tenant 1', role: 'ADMIN' }]
      mockGet.mockResolvedValue({ data: mockTenants })

      const result = await authService.getUserTenants()

      expect(mockGet).toHaveBeenCalledWith('/auth/tenants')
      expect(result).toEqual(mockTenants)
    })
  })

  describe('logout', () => {
    it('should call POST /auth/logout', async () => {
      mockPost.mockResolvedValue({ data: { success: true } })

      const result = await authService.logout()

      expect(mockPost).toHaveBeenCalledWith('/auth/logout', {})
      expect(result).toEqual({ success: true })
    })
  })

  describe('endImpersonation', () => {
    it('should call POST /auth/end-impersonation', async () => {
      const mockResponse = { data: { accessToken: 'restored-at', refreshToken: 'restored-rt' } }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await authService.endImpersonation()

      expect(mockPost).toHaveBeenCalledWith('/auth/end-impersonation')
      expect(result).toEqual(mockResponse)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Alert Service
// ─────────────────────────────────────────────────────────────────────────────
describe('alertService', () => {
  describe('getAlerts', () => {
    it('should call GET /alerts with params', async () => {
      const mockResponse = { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
      mockGet.mockResolvedValue({ data: mockResponse })

      const params = { page: 1, limit: 20, severity: 'high' }
      const result = await alertService.getAlerts(params)

      expect(mockGet).toHaveBeenCalledWith('/alerts', { params })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /alerts without params', async () => {
      const mockResponse = { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
      mockGet.mockResolvedValue({ data: mockResponse })

      await alertService.getAlerts()

      expect(mockGet).toHaveBeenCalledWith('/alerts', { params: undefined })
    })
  })

  describe('getAlertById', () => {
    it('should call GET /alerts/:id', async () => {
      const mockAlert = { data: { id: 'alert-1', title: 'Suspicious login' } }
      mockGet.mockResolvedValue({ data: mockAlert })

      const result = await alertService.getAlertById('alert-1')

      expect(mockGet).toHaveBeenCalledWith('/alerts/alert-1')
      expect(result).toEqual(mockAlert)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(alertService.getAlertById('nonexistent')).rejects.toThrow('Not found')
    })
  })

  describe('investigateAlert', () => {
    it('should call POST /alerts/:id/investigate', async () => {
      const mockInvestigation = { data: { summary: 'Malicious activity detected', score: 85 } }
      mockPost.mockResolvedValue({ data: mockInvestigation })

      const result = await alertService.investigateAlert('alert-1')

      expect(mockPost).toHaveBeenCalledWith('/alerts/alert-1/investigate')
      expect(result).toEqual(mockInvestigation)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Case Service
// ─────────────────────────────────────────────────────────────────────────────
describe('caseService', () => {
  describe('getCases', () => {
    it('should call GET /cases with params', async () => {
      const mockResponse = { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
      mockGet.mockResolvedValue({ data: mockResponse })

      const params = { page: 1, limit: 20, status: 'open' }
      const result = await caseService.getCases(params)

      expect(mockGet).toHaveBeenCalledWith('/cases', { params })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /cases without params', async () => {
      const mockResponse = { data: [] }
      mockGet.mockResolvedValue({ data: mockResponse })

      await caseService.getCases()

      expect(mockGet).toHaveBeenCalledWith('/cases', { params: undefined })
    })
  })

  describe('getCase', () => {
    it('should call GET /cases/:id', async () => {
      const mockCase = { data: { id: 'case-1', title: 'Incident Report' } }
      mockGet.mockResolvedValue({ data: mockCase })

      const result = await caseService.getCase('case-1')

      expect(mockGet).toHaveBeenCalledWith('/cases/case-1')
      expect(result).toEqual(mockCase)
    })
  })

  describe('createCase', () => {
    it('should call POST /cases with data', async () => {
      const mockCase = { data: { id: 'case-new', title: 'New Case' } }
      mockPost.mockResolvedValue({ data: mockCase })

      const input = { title: 'New Case', severity: 'high', description: 'A new case' }
      const result = await caseService.createCase(
        input as Parameters<typeof caseService.createCase>[0]
      )

      expect(mockPost).toHaveBeenCalledWith('/cases', input)
      expect(result).toEqual(mockCase)
    })
  })

  describe('updateCase', () => {
    it('should call PATCH /cases/:id with data', async () => {
      const mockCase = { data: { id: 'case-1', title: 'Updated Case' } }
      mockPatch.mockResolvedValue({ data: mockCase })

      const input = { title: 'Updated Case' }
      const result = await caseService.updateCase(
        'case-1',
        input as Parameters<typeof caseService.updateCase>[1]
      )

      expect(mockPatch).toHaveBeenCalledWith('/cases/case-1', input)
      expect(result).toEqual(mockCase)
    })
  })

  describe('createTask', () => {
    it('should call POST /cases/:caseId/tasks and unwrap data', async () => {
      const taskData = { id: 'task-1', title: 'Investigate alert' }
      mockPost.mockResolvedValue({ data: { data: taskData } })

      const input = { title: 'Investigate alert' }
      const result = await caseService.createTask('case-1', input)

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/tasks', input)
      expect(result).toEqual(taskData)
    })

    it('should pass assignee when provided', async () => {
      const taskData = { id: 'task-2', title: 'Review logs', assignee: 'user-1' }
      mockPost.mockResolvedValue({ data: { data: taskData } })

      const input = { title: 'Review logs', assignee: 'user-1' }
      await caseService.createTask('case-2', input)

      expect(mockPost).toHaveBeenCalledWith('/cases/case-2/tasks', input)
    })
  })

  describe('updateTask', () => {
    it('should call PATCH /cases/:caseId/tasks/:taskId and unwrap data', async () => {
      const taskData = { id: 'task-1', title: 'Updated', status: 'completed' }
      mockPatch.mockResolvedValue({ data: { data: taskData } })

      const input = { title: 'Updated', status: 'completed' }
      const result = await caseService.updateTask('case-1', 'task-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/cases/case-1/tasks/task-1', input)
      expect(result).toEqual(taskData)
    })

    it('should support setting assignee to null', async () => {
      const taskData = { id: 'task-1', assignee: null }
      mockPatch.mockResolvedValue({ data: { data: taskData } })

      const input = { assignee: null }
      await caseService.updateTask('case-1', 'task-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/cases/case-1/tasks/task-1', input)
    })
  })

  describe('deleteTask', () => {
    it('should call DELETE /cases/:caseId/tasks/:taskId', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await caseService.deleteTask('case-1', 'task-1')

      expect(mockDelete).toHaveBeenCalledWith('/cases/case-1/tasks/task-1')
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('createArtifact', () => {
    it('should call POST /cases/:caseId/artifacts and unwrap data', async () => {
      const artifactData = { id: 'art-1', type: 'ip', value: '192.168.1.1' }
      mockPost.mockResolvedValue({ data: { data: artifactData } })

      const input = { type: 'ip', value: '192.168.1.1' }
      const result = await caseService.createArtifact('case-1', input)

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/artifacts', input)
      expect(result).toEqual(artifactData)
    })

    it('should pass source when provided', async () => {
      const artifactData = { id: 'art-2', type: 'hash', value: 'abc123', source: 'MISP' }
      mockPost.mockResolvedValue({ data: { data: artifactData } })

      const input = { type: 'hash', value: 'abc123', source: 'MISP' }
      await caseService.createArtifact('case-2', input)

      expect(mockPost).toHaveBeenCalledWith('/cases/case-2/artifacts', input)
    })
  })

  describe('deleteArtifact', () => {
    it('should call DELETE /cases/:caseId/artifacts/:artifactId', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await caseService.deleteArtifact('case-1', 'art-1')

      expect(mockDelete).toHaveBeenCalledWith('/cases/case-1/artifacts/art-1')
      expect(result).toEqual({ deleted: true })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Case Cycle Service
// ─────────────────────────────────────────────────────────────────────────────
describe('caseCycleService', () => {
  describe('getCycles', () => {
    it('should call GET /case-cycles with params', async () => {
      const mockResponse = { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
      mockGet.mockResolvedValue({ data: mockResponse })

      const params = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' as const }
      const result = await caseCycleService.getCycles(params)

      expect(mockGet).toHaveBeenCalledWith('/case-cycles', { params })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /case-cycles without params', async () => {
      const mockResponse = { data: [] }
      mockGet.mockResolvedValue({ data: mockResponse })

      await caseCycleService.getCycles()

      expect(mockGet).toHaveBeenCalledWith('/case-cycles', { params: undefined })
    })
  })

  describe('getActiveCycle', () => {
    it('should call GET /case-cycles/active', async () => {
      const mockResponse = { data: null }
      mockGet.mockResolvedValue({ data: mockResponse })

      const result = await caseCycleService.getActiveCycle()

      expect(mockGet).toHaveBeenCalledWith('/case-cycles/active')
      expect(result).toEqual(mockResponse)
    })

    it('should return cycle when active cycle exists', async () => {
      const activeCycle = { data: { id: 'cycle-1', name: 'Sprint 1', status: 'active' } }
      mockGet.mockResolvedValue({ data: activeCycle })

      const result = await caseCycleService.getActiveCycle()

      expect(result).toEqual(activeCycle)
    })
  })

  describe('getCycle', () => {
    it('should call GET /case-cycles/:id', async () => {
      const mockCycle = { data: { id: 'cycle-1', name: 'Sprint 1' } }
      mockGet.mockResolvedValue({ data: mockCycle })

      const result = await caseCycleService.getCycle('cycle-1')

      expect(mockGet).toHaveBeenCalledWith('/case-cycles/cycle-1')
      expect(result).toEqual(mockCycle)
    })
  })

  describe('createCycle', () => {
    it('should call POST /case-cycles with data', async () => {
      const mockCycle = { data: { id: 'cycle-new', name: 'New Sprint' } }
      mockPost.mockResolvedValue({ data: mockCycle })

      const input = { name: 'New Sprint', startDate: '2026-01-01' }
      const result = await caseCycleService.createCycle(
        input as Parameters<typeof caseCycleService.createCycle>[0]
      )

      expect(mockPost).toHaveBeenCalledWith('/case-cycles', input)
      expect(result).toEqual(mockCycle)
    })
  })

  describe('closeCycle', () => {
    it('should call PATCH /case-cycles/:id/close with data', async () => {
      const mockCycle = { data: { id: 'cycle-1', status: 'closed' } }
      mockPatch.mockResolvedValue({ data: mockCycle })

      const data = { endDate: '2026-03-15' }
      const result = await caseCycleService.closeCycle(
        'cycle-1',
        data as Parameters<typeof caseCycleService.closeCycle>[1]
      )

      expect(mockPatch).toHaveBeenCalledWith('/case-cycles/cycle-1/close', data)
      expect(result).toEqual(mockCycle)
    })

    it('should work with empty data object', async () => {
      const mockCycle = { data: { id: 'cycle-1', status: 'closed' } }
      mockPatch.mockResolvedValue({ data: mockCycle })

      await caseCycleService.closeCycle(
        'cycle-1',
        {} as Parameters<typeof caseCycleService.closeCycle>[1]
      )

      expect(mockPatch).toHaveBeenCalledWith('/case-cycles/cycle-1/close', {})
    })
  })

  describe('updateCycle', () => {
    it('should call PATCH /case-cycles/:id and unwrap data.data', async () => {
      const cycleData = { id: 'cycle-1', name: 'Updated Sprint' }
      mockPatch.mockResolvedValue({ data: { data: cycleData } })

      const input = { name: 'Updated Sprint' }
      const result = await caseCycleService.updateCycle('cycle-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/case-cycles/cycle-1', input)
      expect(result).toEqual(cycleData)
    })
  })

  describe('activateCycle', () => {
    it('should call PATCH /case-cycles/:id/activate and unwrap data.data', async () => {
      const cycleData = { id: 'cycle-1', status: 'active' }
      mockPatch.mockResolvedValue({ data: { data: cycleData } })

      const result = await caseCycleService.activateCycle('cycle-1')

      expect(mockPatch).toHaveBeenCalledWith('/case-cycles/cycle-1/activate')
      expect(result).toEqual(cycleData)
    })
  })

  describe('deleteCycle', () => {
    it('should call DELETE /case-cycles/:id', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await caseCycleService.deleteCycle('cycle-1')

      expect(mockDelete).toHaveBeenCalledWith('/case-cycles/cycle-1')
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('getOrphanedStats', () => {
    it('should call GET /case-cycles/orphaned-stats', async () => {
      const stats = { data: { caseCount: 5, openCount: 3, closedCount: 2 } }
      mockGet.mockResolvedValue({ data: stats })

      const result = await caseCycleService.getOrphanedStats()

      expect(mockGet).toHaveBeenCalledWith('/case-cycles/orphaned-stats')
      expect(result).toEqual(stats)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard Service
// ─────────────────────────────────────────────────────────────────────────────
describe('dashboardService', () => {
  describe('getKPIs', () => {
    it('should call GET /dashboard/kpis', async () => {
      const mockKPIs = { data: [{ label: 'Total Alerts', value: 42 }] }
      mockGet.mockResolvedValue({ data: mockKPIs })

      const result = await dashboardService.getKPIs()

      expect(mockGet).toHaveBeenCalledWith('/dashboard/kpis')
      expect(result).toEqual(mockKPIs)
    })
  })

  describe('getAlertTrends', () => {
    it('should call GET /dashboard/alert-trends', async () => {
      const mockTrends = { data: [{ date: '2026-03-01', count: 10 }] }
      mockGet.mockResolvedValue({ data: mockTrends })

      const result = await dashboardService.getAlertTrends()

      expect(mockGet).toHaveBeenCalledWith('/dashboard/alert-trends')
      expect(result).toEqual(mockTrends)
    })
  })

  describe('getMITREStats', () => {
    it('should call GET /dashboard/mitre-stats', async () => {
      const mockStats = { data: [{ techniqueId: 'T1059', name: 'Command Line', count: 5 }] }
      mockGet.mockResolvedValue({ data: mockStats })

      const result = await dashboardService.getMITREStats()

      expect(mockGet).toHaveBeenCalledWith('/dashboard/mitre-stats')
      expect(result).toEqual(mockStats)
    })
  })

  describe('getAssetRisks', () => {
    it('should call GET /dashboard/asset-risks', async () => {
      const mockRisks = { data: [{ asset: 'server-1', riskScore: 85 }] }
      mockGet.mockResolvedValue({ data: mockRisks })

      const result = await dashboardService.getAssetRisks()

      expect(mockGet).toHaveBeenCalledWith('/dashboard/asset-risks')
      expect(result).toEqual(mockRisks)
    })
  })

  describe('getPipelineHealth', () => {
    it('should call GET /dashboard/pipeline-health', async () => {
      const mockHealth = { data: [{ name: 'Wazuh', status: 'healthy' }] }
      mockGet.mockResolvedValue({ data: mockHealth })

      const result = await dashboardService.getPipelineHealth()

      expect(mockGet).toHaveBeenCalledWith('/dashboard/pipeline-health')
      expect(result).toEqual(mockHealth)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Admin Service
// ─────────────────────────────────────────────────────────────────────────────
describe('adminService', () => {
  describe('getTenants', () => {
    it('should call GET /admin/tenants with params', async () => {
      const mockResponse = { data: [{ id: 't1', name: 'Tenant 1' }] }
      mockGet.mockResolvedValue({ data: mockResponse })

      const params = { page: 1, limit: 10 }
      const result = await adminService.getTenants(params)

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants', { params })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /admin/tenants without params', async () => {
      const mockResponse = { data: [] }
      mockGet.mockResolvedValue({ data: mockResponse })

      await adminService.getTenants()

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants', { params: undefined })
    })
  })

  describe('getCurrentTenant', () => {
    it('should call GET /admin/tenants/current', async () => {
      const mockTenant = { data: { id: 't1', name: 'Current Tenant' } }
      mockGet.mockResolvedValue({ data: mockTenant })

      const result = await adminService.getCurrentTenant()

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants/current')
      expect(result).toEqual(mockTenant)
    })
  })

  describe('createTenant', () => {
    it('should call POST /admin/tenants with data', async () => {
      const mockTenant = { data: { id: 't-new', name: 'New Tenant' } }
      mockPost.mockResolvedValue({ data: mockTenant })

      const input = { name: 'New Tenant' }
      const result = await adminService.createTenant(
        input as Parameters<typeof adminService.createTenant>[0]
      )

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants', input)
      expect(result).toEqual(mockTenant)
    })
  })

  describe('updateTenant', () => {
    it('should call PATCH /admin/tenants/:tenantId with data', async () => {
      const mockTenant = { data: { id: 't1', name: 'Renamed Tenant' } }
      mockPatch.mockResolvedValue({ data: mockTenant })

      const result = await adminService.updateTenant('t1', { name: 'Renamed Tenant' })

      expect(mockPatch).toHaveBeenCalledWith('/admin/tenants/t1', { name: 'Renamed Tenant' })
      expect(result).toEqual(mockTenant)
    })
  })

  describe('deleteTenant', () => {
    it('should call DELETE /admin/tenants/:tenantId', async () => {
      const mockResponse = { data: { deleted: true } }
      mockDelete.mockResolvedValue({ data: mockResponse })

      const result = await adminService.deleteTenant('t1')

      expect(mockDelete).toHaveBeenCalledWith('/admin/tenants/t1')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getUsers', () => {
    it('should call GET /admin/tenants/:tenantId/users with params', async () => {
      const mockResponse = { data: [{ id: 'u1', name: 'User 1' }] }
      mockGet.mockResolvedValue({ data: mockResponse })

      const params = { page: 1, limit: 10, search: 'test' }
      const result = await adminService.getUsers('t1', params)

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants/t1/users', { params })
      expect(result).toEqual(mockResponse)
    })

    it('should call GET /admin/tenants/:tenantId/users without params', async () => {
      const mockResponse = { data: [] }
      mockGet.mockResolvedValue({ data: mockResponse })

      await adminService.getUsers('t1')

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants/t1/users', { params: undefined })
    })
  })

  describe('addUser', () => {
    it('should call POST /admin/tenants/:tenantId/users with data', async () => {
      const mockUser = { data: { id: 'u-new', name: 'New User' } }
      mockPost.mockResolvedValue({ data: mockUser })

      const input = { email: 'new@test.com', name: 'New User', role: 'ANALYST' }
      const result = await adminService.addUser(
        't1',
        input as Parameters<typeof adminService.addUser>[1]
      )

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants/t1/users', input)
      expect(result).toEqual(mockUser)
    })
  })

  describe('checkEmail', () => {
    it('should call GET /admin/tenants/:tenantId/users/check-email with email param', async () => {
      const mockResult = { data: { exists: true, userId: 'u1' } }
      mockGet.mockResolvedValue({ data: mockResult })

      const result = await adminService.checkEmail('t1', 'user@test.com')

      expect(mockGet).toHaveBeenCalledWith('/admin/tenants/t1/users/check-email', {
        params: { email: 'user@test.com' },
      })
      expect(result).toEqual(mockResult)
    })
  })

  describe('assignUser', () => {
    it('should call POST /admin/tenants/:tenantId/users/assign with data', async () => {
      const mockUser = { data: { id: 'u1', name: 'Assigned User' } }
      mockPost.mockResolvedValue({ data: mockUser })

      const input = { userId: 'u1', role: 'ANALYST', email: 'u1@test.com' }
      const result = await adminService.assignUser(
        't1',
        input as Parameters<typeof adminService.assignUser>[1]
      )

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants/t1/users/assign', input)
      expect(result).toEqual(mockUser)
    })
  })

  describe('updateUser', () => {
    it('should call PATCH /admin/tenants/:tenantId/users/:userId with data', async () => {
      const mockUser = { data: { id: 'u1', name: 'Updated User' } }
      mockPatch.mockResolvedValue({ data: mockUser })

      const input = { name: 'Updated User', role: 'ADMIN' }
      const result = await adminService.updateUser('t1', 'u1', input)

      expect(mockPatch).toHaveBeenCalledWith('/admin/tenants/t1/users/u1', input)
      expect(result).toEqual(mockUser)
    })

    it('should support password update', async () => {
      const mockUser = { data: { id: 'u1' } }
      mockPatch.mockResolvedValue({ data: mockUser })

      const input = { password: 'newPassword123' }
      await adminService.updateUser('t1', 'u1', input)

      expect(mockPatch).toHaveBeenCalledWith('/admin/tenants/t1/users/u1', input)
    })
  })

  describe('removeUser', () => {
    it('should call DELETE /admin/tenants/:tenantId/users/:userId', async () => {
      const mockResponse = { data: { deleted: true } }
      mockDelete.mockResolvedValue({ data: mockResponse })

      const result = await adminService.removeUser('t1', 'u1')

      expect(mockDelete).toHaveBeenCalledWith('/admin/tenants/t1/users/u1')
      expect(result).toEqual(mockResponse)
    })
  })

  describe('blockUser', () => {
    it('should call POST /admin/tenants/:tenantId/users/:userId/block', async () => {
      const mockUser = { data: { id: 'u1', status: 'suspended' } }
      mockPost.mockResolvedValue({ data: mockUser })

      const result = await adminService.blockUser('t1', 'u1')

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants/t1/users/u1/block')
      expect(result).toEqual(mockUser)
    })
  })

  describe('unblockUser', () => {
    it('should call POST /admin/tenants/:tenantId/users/:userId/unblock', async () => {
      const mockUser = { data: { id: 'u1', status: 'active' } }
      mockPost.mockResolvedValue({ data: mockUser })

      const result = await adminService.unblockUser('t1', 'u1')

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants/t1/users/u1/unblock')
      expect(result).toEqual(mockUser)
    })
  })

  describe('restoreUser', () => {
    it('should call POST /admin/tenants/:tenantId/users/:userId/restore', async () => {
      const mockUser = { data: { id: 'u1', status: 'active' } }
      mockPost.mockResolvedValue({ data: mockUser })

      const result = await adminService.restoreUser('t1', 'u1')

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants/t1/users/u1/restore')
      expect(result).toEqual(mockUser)
    })
  })

  describe('impersonateUser', () => {
    it('should call POST /admin/tenants/:tenantId/users/:userId/impersonate', async () => {
      const mockResponse = { data: { accessToken: 'imp-at', refreshToken: 'imp-rt' } }
      mockPost.mockResolvedValue({ data: mockResponse })

      const result = await adminService.impersonateUser('t1', 'u1')

      expect(mockPost).toHaveBeenCalledWith('/admin/tenants/t1/users/u1/impersonate', {})
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getServiceHealth', () => {
    it('should call GET /admin/health', async () => {
      const mockHealth = { data: [{ name: 'Database', status: 'healthy' }] }
      mockGet.mockResolvedValue({ data: mockHealth })

      const result = await adminService.getServiceHealth()

      expect(mockGet).toHaveBeenCalledWith('/admin/health')
      expect(result).toEqual(mockHealth)
    })
  })

  describe('getAuditLogs', () => {
    it('should call GET /admin/audit-logs with params', async () => {
      const mockLogs = { data: [{ id: 'log-1', action: 'LOGIN' }] }
      mockGet.mockResolvedValue({ data: mockLogs })

      const params = { page: 1, limit: 20 }
      const result = await adminService.getAuditLogs(params)

      expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs', { params })
      expect(result).toEqual(mockLogs)
    })

    it('should call GET /admin/audit-logs without params', async () => {
      const mockLogs = { data: [] }
      mockGet.mockResolvedValue({ data: mockLogs })

      await adminService.getAuditLogs()

      expect(mockGet).toHaveBeenCalledWith('/admin/audit-logs', { params: undefined })
    })
  })

  describe('getMembers', () => {
    it('should call GET /members', async () => {
      const mockMembers = { data: [{ id: 'm1', name: 'Member 1' }] }
      mockGet.mockResolvedValue({ data: mockMembers })

      const result = await adminService.getMembers()

      expect(mockGet).toHaveBeenCalledWith('/members')
      expect(result).toEqual(mockMembers)
    })
  })

  describe('getAppLogs', () => {
    it('should call GET /admin/app-logs with params', async () => {
      const mockLogs = { data: [{ id: 'applog-1', level: 'error', message: 'Something broke' }] }
      mockGet.mockResolvedValue({ data: mockLogs })

      const params = { page: 1, limit: 50, level: 'error' }
      const result = await adminService.getAppLogs(params)

      expect(mockGet).toHaveBeenCalledWith('/admin/app-logs', { params })
      expect(result).toEqual(mockLogs)
    })

    it('should call GET /admin/app-logs without params', async () => {
      const mockLogs = { data: [] }
      mockGet.mockResolvedValue({ data: mockLogs })

      await adminService.getAppLogs()

      expect(mockGet).toHaveBeenCalledWith('/admin/app-logs', { params: undefined })
    })
  })

  describe('getAppLogById', () => {
    it('should call GET /admin/app-logs/:id', async () => {
      const mockLog = { data: { id: 'applog-1', level: 'error', message: 'Detailed log' } }
      mockGet.mockResolvedValue({ data: mockLog })

      const result = await adminService.getAppLogById('applog-1')

      expect(mockGet).toHaveBeenCalledWith('/admin/app-logs/applog-1')
      expect(result).toEqual(mockLog)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Connector Service
// ─────────────────────────────────────────────────────────────────────────────
describe('connectorService', () => {
  describe('list', () => {
    it('should call GET /connectors and unwrap data.data', async () => {
      const connectors = [{ id: 'c1', type: 'wazuh', name: 'Wazuh Connector' }]
      mockGet.mockResolvedValue({ data: { data: connectors } })

      const result = await connectorService.list()

      expect(mockGet).toHaveBeenCalledWith('/connectors')
      expect(result).toEqual(connectors)
    })

    it('should return empty array when no connectors exist', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      const result = await connectorService.list()

      expect(result).toEqual([])
    })
  })

  describe('getByType', () => {
    it('should call GET /connectors/:type and unwrap data.data', async () => {
      const connector = { id: 'c1', type: 'wazuh', name: 'Wazuh' }
      mockGet.mockResolvedValue({ data: { data: connector } })

      const result = await connectorService.getByType('wazuh')

      expect(mockGet).toHaveBeenCalledWith('/connectors/wazuh')
      expect(result).toEqual(connector)
    })
  })

  describe('getStats', () => {
    it('should call GET /connectors/stats and unwrap data.data', async () => {
      const stats = {
        totalConnectors: 8,
        enabledConnectors: 6,
        healthyConnectors: 4,
        failingConnectors: 2,
        untestedConnectors: 2,
      }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await connectorService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/connectors/stats')
      expect(result).toEqual(stats)
    })
  })

  describe('create', () => {
    it('should call POST /connectors with data and unwrap data.data', async () => {
      const connector = { id: 'c-new', type: 'graylog', name: 'Graylog' }
      mockPost.mockResolvedValue({ data: { data: connector } })

      const input = {
        type: ConnectorType.GRAYLOG,
        name: 'Graylog',
        enabled: true,
        authType: ConnectorAuthType.API_KEY,
        config: { apiKey: 'key123', url: 'https://graylog.example.com' },
      }
      const result = await connectorService.create(input)

      expect(mockPost).toHaveBeenCalledWith('/connectors', input)
      expect(result).toEqual(connector)
    })
  })

  describe('update', () => {
    it('should call PATCH /connectors/:type with data and unwrap data.data', async () => {
      const connector = { id: 'c1', type: 'wazuh', name: 'Updated Wazuh' }
      mockPatch.mockResolvedValue({ data: { data: connector } })

      const input = { name: 'Updated Wazuh' }
      const result = await connectorService.update('wazuh', input)

      expect(mockPatch).toHaveBeenCalledWith('/connectors/wazuh', input)
      expect(result).toEqual(connector)
    })
  })

  describe('remove', () => {
    it('should call DELETE /connectors/:type', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await connectorService.remove('wazuh')

      expect(mockDelete).toHaveBeenCalledWith('/connectors/wazuh')
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('test', () => {
    it('should call POST /connectors/:type/test and unwrap data.data', async () => {
      const testResult = { success: true, latency: 42 }
      mockPost.mockResolvedValue({ data: { data: testResult } })

      const result = await connectorService.test('wazuh')

      expect(mockPost).toHaveBeenCalledWith('/connectors/wazuh/test')
      expect(result).toEqual(testResult)
    })
  })

  describe('toggle', () => {
    it('should call POST /connectors/:type/toggle with enabled flag and unwrap data.data', async () => {
      const connector = { id: 'c1', type: 'wazuh', enabled: false }
      mockPost.mockResolvedValue({ data: { data: connector } })

      const result = await connectorService.toggle({
        type: ConnectorType.WAZUH,
        enabled: false,
      })

      expect(mockPost).toHaveBeenCalledWith('/connectors/wazuh/toggle', { enabled: false })
      expect(result).toEqual(connector)
    })

    it('should enable connector', async () => {
      const connector = { id: 'c1', type: 'wazuh', enabled: true }
      mockPost.mockResolvedValue({ data: { data: connector } })

      const result = await connectorService.toggle({
        type: ConnectorType.WAZUH,
        enabled: true,
      })

      expect(mockPost).toHaveBeenCalledWith('/connectors/wazuh/toggle', { enabled: true })
      expect(result).toEqual(connector)
    })
  })

  describe('sync', () => {
    it('should call POST /connector-sync/:type/sync and unwrap data.data', async () => {
      const syncResult = { success: true, message: 'Synced 50 alerts', ingested: 50 }
      mockPost.mockResolvedValue({ data: { data: syncResult } })

      const result = await connectorService.sync('wazuh')

      expect(mockPost).toHaveBeenCalledWith('/connector-sync/wazuh/sync')
      expect(result).toEqual(syncResult)
    })
  })

  describe('getSyncStatus', () => {
    it('should call GET /connector-sync/status and unwrap data.data', async () => {
      const statusData = [
        { type: 'wazuh', lastSyncAt: '2026-03-14T10:00:00Z', syncEnabled: true, enabled: true },
      ]
      mockGet.mockResolvedValue({ data: { data: statusData } })

      const result = await connectorService.getSyncStatus()

      expect(mockGet).toHaveBeenCalledWith('/connector-sync/status')
      expect(result).toEqual(statusData)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Connector Workspace Service
// ─────────────────────────────────────────────────────────────────────────────
describe('connectorWorkspaceService', () => {
  describe('getOverview', () => {
    it('should call GET /connector-workspaces/:type/overview and unwrap data.data', async () => {
      const overview = { totalEntities: 100, activeAlerts: 25 }
      mockGet.mockResolvedValue({ data: { data: overview } })

      const result = await connectorWorkspaceService.getOverview('wazuh')

      expect(mockGet).toHaveBeenCalledWith('/connector-workspaces/wazuh/overview')
      expect(result).toEqual(overview)
    })
  })

  describe('getRecentActivity', () => {
    it('should call GET /connector-workspaces/:type/recent-activity with default params', async () => {
      const activity = { items: [], total: 0 }
      mockGet.mockResolvedValue({ data: { data: activity } })

      const result = await connectorWorkspaceService.getRecentActivity('wazuh')

      expect(mockGet).toHaveBeenCalledWith('/connector-workspaces/wazuh/recent-activity', {
        params: { page: 1, pageSize: 20 },
      })
      expect(result).toEqual(activity)
    })

    it('should call with custom page and pageSize', async () => {
      const activity = { items: [{ id: 'act-1' }], total: 1 }
      mockGet.mockResolvedValue({ data: { data: activity } })

      const result = await connectorWorkspaceService.getRecentActivity('graylog', 2, 50)

      expect(mockGet).toHaveBeenCalledWith('/connector-workspaces/graylog/recent-activity', {
        params: { page: 2, pageSize: 50 },
      })
      expect(result).toEqual(activity)
    })
  })

  describe('getEntities', () => {
    it('should call GET /connector-workspaces/:type/entities with default params', async () => {
      const entities = { items: [], total: 0 }
      mockGet.mockResolvedValue({ data: { data: entities } })

      const result = await connectorWorkspaceService.getEntities('wazuh')

      expect(mockGet).toHaveBeenCalledWith('/connector-workspaces/wazuh/entities', {
        params: { page: 1, pageSize: 20 },
      })
      expect(result).toEqual(entities)
    })

    it('should call with custom page and pageSize', async () => {
      const entities = { items: [{ id: 'ent-1' }], total: 1 }
      mockGet.mockResolvedValue({ data: { data: entities } })

      const result = await connectorWorkspaceService.getEntities('misp', 3, 10)

      expect(mockGet).toHaveBeenCalledWith('/connector-workspaces/misp/entities', {
        params: { page: 3, pageSize: 10 },
      })
      expect(result).toEqual(entities)
    })
  })

  describe('search', () => {
    it('should call POST /connector-workspaces/:type/search with request and unwrap data.data', async () => {
      const searchResult = { results: [{ id: 'r1', title: 'Found item' }], total: 1 }
      mockPost.mockResolvedValue({ data: { data: searchResult } })

      const request = { query: 'malware', filters: {} }
      const result = await connectorWorkspaceService.search(
        'wazuh',
        request as Parameters<typeof connectorWorkspaceService.search>[1]
      )

      expect(mockPost).toHaveBeenCalledWith('/connector-workspaces/wazuh/search', request)
      expect(result).toEqual(searchResult)
    })
  })

  describe('executeAction', () => {
    it('should call POST /connector-workspaces/:type/actions/:action with params', async () => {
      const actionResult = { success: true, message: 'Action completed' }
      mockPost.mockResolvedValue({ data: { data: actionResult } })

      const actionParams = { targetId: 'target-1' }
      const result = await connectorWorkspaceService.executeAction(
        'wazuh',
        'quarantine',
        actionParams
      )

      expect(mockPost).toHaveBeenCalledWith('/connector-workspaces/wazuh/actions/quarantine', {
        params: actionParams,
      })
      expect(result).toEqual(actionResult)
    })

    it('should send empty params when none provided', async () => {
      const actionResult = { success: true, message: 'Done' }
      mockPost.mockResolvedValue({ data: { data: actionResult } })

      const result = await connectorWorkspaceService.executeAction('wazuh', 'refresh')

      expect(mockPost).toHaveBeenCalledWith('/connector-workspaces/wazuh/actions/refresh', {
        params: {},
      })
      expect(result).toEqual(actionResult)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Hunt Service
// ─────────────────────────────────────────────────────────────────────────────
describe('huntService', () => {
  describe('createSession', () => {
    it('should call POST /hunt/sessions with query and timeRange', async () => {
      const session = { data: { id: 'session-1', query: 'find malware', status: 'active' } }
      mockPost.mockResolvedValue({ data: session })

      const input = { query: 'find malware', timeRange: '24h' }
      const result = await huntService.createSession(input)

      expect(mockPost).toHaveBeenCalledWith('/hunt/sessions', input)
      expect(result).toEqual(session)
    })
  })

  describe('sendMessage', () => {
    it('should call POST /hunt/messages with query and transform response', async () => {
      const aiResponse = {
        data: {
          result: 'Analysis complete',
          reasoning: ['Step 1', 'Step 2'],
          confidence: 0.9,
        },
      }
      mockPost.mockResolvedValue({ data: aiResponse })

      const result = await huntService.sendMessage('session-1', 'What processes are suspicious?')

      expect(mockPost).toHaveBeenCalledWith('/hunt/messages', {
        query: 'What processes are suspicious?',
      })
      expect(result.data.content).toBe('Analysis complete')
      expect(result.data.reasoningSteps).toHaveLength(2)
      expect(result.data.actions).toEqual(['complete'])
    })

    it('should return empty actions when confidence is below threshold', async () => {
      const aiResponse = {
        data: {
          result: 'Not sure',
          reasoning: [],
          confidence: 0.5,
        },
      }
      mockPost.mockResolvedValue({ data: aiResponse })

      const result = await huntService.sendMessage('session-1', 'test query')

      expect(result.data.actions).toEqual([])
    })

    it('should handle missing result gracefully', async () => {
      const aiResponse = {
        data: null,
      }
      mockPost.mockResolvedValue({ data: aiResponse })

      const result = await huntService.sendMessage('session-1', 'test')

      expect(result.data.content).toBe('')
      expect(result.data.reasoningSteps).toEqual([])
    })
  })

  describe('getEvents', () => {
    it('should call GET /hunt/sessions/:sessionId/events', async () => {
      const events = { data: [{ id: 'evt-1', type: 'process', name: 'cmd.exe' }] }
      mockGet.mockResolvedValue({ data: events })

      const result = await huntService.getEvents('session-1')

      expect(mockGet).toHaveBeenCalledWith('/hunt/sessions/session-1/events', {
        params: { page: 1, limit: 50 },
      })
      expect(result).toEqual(events)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Intel Service
// ─────────────────────────────────────────────────────────────────────────────
describe('intelService', () => {
  describe('getStats', () => {
    it('should call GET /intel/stats and unwrap data.data', async () => {
      const stats = { totalIOCs: 1000, activeSources: 5, lastUpdated: '2026-03-14' }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await intelService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/intel/stats')
      expect(result).toEqual(stats)
    })
  })

  describe('getMISPEvents', () => {
    it('should call GET /intel/misp-events with params', async () => {
      const events = { data: [{ id: 'evt-1', info: 'Phishing campaign' }] }
      mockGet.mockResolvedValue({ data: events })

      const params = { page: 1, limit: 20, threatLevel: 'high' }
      const result = await intelService.getMISPEvents(params)

      expect(mockGet).toHaveBeenCalledWith('/intel/misp-events', { params })
      expect(result).toEqual(events)
    })

    it('should call GET /intel/misp-events without params', async () => {
      const events = { data: [] }
      mockGet.mockResolvedValue({ data: events })

      await intelService.getMISPEvents()

      expect(mockGet).toHaveBeenCalledWith('/intel/misp-events', { params: undefined })
    })
  })

  describe('searchIOC', () => {
    it('should call GET /intel/ioc-search with all parameters', async () => {
      const correlations = { data: [{ id: 'ioc-1', value: '192.168.1.1', type: 'ip' }] }
      mockGet.mockResolvedValue({ data: correlations })

      const result = await intelService.searchIOC(
        '192.168.1.1',
        'ip',
        2,
        25,
        'createdAt',
        'desc',
        'misp'
      )

      expect(mockGet).toHaveBeenCalledWith('/intel/ioc-search', {
        params: {
          value: '192.168.1.1',
          type: 'ip',
          source: 'misp',
          page: 2,
          limit: 25,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      })
      expect(result).toEqual(correlations)
    })

    it('should use default page and limit values', async () => {
      const correlations = { data: [] }
      mockGet.mockResolvedValue({ data: correlations })

      await intelService.searchIOC('abc123', 'hash')

      expect(mockGet).toHaveBeenCalledWith('/intel/ioc-search', {
        params: {
          value: 'abc123',
          type: 'hash',
          source: undefined,
          page: 1,
          limit: 10,
          sortBy: undefined,
          sortOrder: undefined,
        },
      })
    })

    it('should pass optional sortBy and sortOrder', async () => {
      const correlations = { data: [] }
      mockGet.mockResolvedValue({ data: correlations })

      await intelService.searchIOC('example.com', 'domain', 1, 10, 'score', 'asc')

      expect(mockGet).toHaveBeenCalledWith('/intel/ioc-search', {
        params: {
          value: 'example.com',
          type: 'domain',
          source: undefined,
          page: 1,
          limit: 10,
          sortBy: 'score',
          sortOrder: 'asc',
        },
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Profile Service
// ─────────────────────────────────────────────────────────────────────────────
describe('profileService', () => {
  describe('getProfile', () => {
    it('should call GET /users/profile and unwrap data.data', async () => {
      const profile = { id: 'u1', name: 'Test User', email: 'user@test.com' }
      mockGet.mockResolvedValue({ data: { data: profile } })

      const result = await profileService.getProfile()

      expect(mockGet).toHaveBeenCalledWith('/users/profile')
      expect(result).toEqual(profile)
    })
  })

  describe('updateProfile', () => {
    it('should call PATCH /users/profile with data and unwrap data.data', async () => {
      const updatedProfile = { id: 'u1', name: 'Updated Name', email: 'user@test.com' }
      mockPatch.mockResolvedValue({ data: { data: updatedProfile } })

      const input = { name: 'Updated Name' }
      const result = await profileService.updateProfile(
        input as Parameters<typeof profileService.updateProfile>[0]
      )

      expect(mockPatch).toHaveBeenCalledWith('/users/profile', input)
      expect(result).toEqual(updatedProfile)
    })
  })

  describe('changePassword', () => {
    it('should call POST /users/change-password with data and unwrap data.data', async () => {
      const mockResponse = { success: true }
      mockPost.mockResolvedValue({ data: { data: mockResponse } })

      const input = { currentPassword: 'oldPass', newPassword: 'newPass123' }
      const result = await profileService.changePassword(
        input as Parameters<typeof profileService.changePassword>[0]
      )

      expect(mockPost).toHaveBeenCalledWith('/users/change-password', input)
      expect(result).toEqual(mockResponse)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Current password is incorrect'))

      const input = { currentPassword: 'wrong', newPassword: 'newPass123' }
      await expect(
        profileService.changePassword(input as Parameters<typeof profileService.changePassword>[0])
      ).rejects.toThrow('Current password is incorrect')
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Settings Service
// ─────────────────────────────────────────────────────────────────────────────
describe('settingsService', () => {
  describe('getPreferences', () => {
    it('should call GET /users/preferences and unwrap data.data', async () => {
      const preferences = { theme: 'dark', language: 'en', notifications: true }
      mockGet.mockResolvedValue({ data: { data: preferences } })

      const result = await settingsService.getPreferences()

      expect(mockGet).toHaveBeenCalledWith('/users/preferences')
      expect(result).toEqual(preferences)
    })
  })

  describe('updatePreferences', () => {
    it('should call PATCH /users/preferences with data and unwrap data.data', async () => {
      const updatedPrefs = { theme: 'light', language: 'en', notifications: false }
      mockPatch.mockResolvedValue({ data: { data: updatedPrefs } })

      const input = { theme: 'light', notifications: false }
      const result = await settingsService.updatePreferences(input)

      expect(mockPatch).toHaveBeenCalledWith('/users/preferences', input)
      expect(result).toEqual(updatedPrefs)
    })

    it('should support partial preference updates', async () => {
      const updatedPrefs = { language: 'fr' }
      mockPatch.mockResolvedValue({ data: { data: updatedPrefs } })

      const input = { language: 'fr' }
      await settingsService.updatePreferences(input)

      expect(mockPatch).toHaveBeenCalledWith('/users/preferences', input)
    })
  })
})
