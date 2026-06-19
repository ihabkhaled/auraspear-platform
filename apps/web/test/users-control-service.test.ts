import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))
import api from '@/lib/api'
import { usersControlService } from '@/services/users-control.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

describe('usersControlService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getSummary ────────────────────────────────────────────────

  describe('getSummary', () => {
    it('should call GET /admin/users-control/summary', async () => {
      const summary = { totalUsers: 50, activeUsers: 42, activeSessions: 18 }
      mockGet.mockResolvedValue({ data: { data: summary } })

      const result = await usersControlService.getSummary()

      expect(mockGet).toHaveBeenCalledWith('/admin/users-control/summary')
      expect(result).toEqual({ data: summary })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Forbidden'))

      await expect(usersControlService.getSummary()).rejects.toThrow('Forbidden')
    })
  })

  // ─── getUsers ──────────────────────────────────────────────────

  describe('getUsers', () => {
    it('should call GET /admin/users-control/users without params', async () => {
      const users = [{ id: 'u-1', name: 'Alice', status: 'active' }]
      mockGet.mockResolvedValue({ data: { data: users } })

      const result = await usersControlService.getUsers()

      expect(mockGet).toHaveBeenCalledWith('/admin/users-control/users', { params: undefined })
      expect(result).toEqual({ data: users })
    })

    it('should call GET /admin/users-control/users with params', async () => {
      const users = [{ id: 'u-2', name: 'Bob' }]
      mockGet.mockResolvedValue({ data: { data: users } })

      const params = { search: 'Bob', page: 1, limit: 20 }
      const result = await usersControlService.getUsers(params)

      expect(mockGet).toHaveBeenCalledWith('/admin/users-control/users', { params })
      expect(result).toEqual({ data: users })
    })
  })

  // ─── getUserSessions ──────────────────────────────────────────

  describe('getUserSessions', () => {
    it('should call GET /admin/users-control/users/:userId/sessions', async () => {
      const sessions = [{ id: 's-1', ip: '10.0.0.1', createdAt: '2024-01-01' }]
      mockGet.mockResolvedValue({ data: { data: sessions } })

      const result = await usersControlService.getUserSessions('u-1')

      expect(mockGet).toHaveBeenCalledWith('/admin/users-control/users/u-1/sessions', {
        params: undefined,
      })
      expect(result).toEqual({ data: sessions })
    })

    it('should pass pagination params', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      const params = { page: 2, limit: 10 }
      await usersControlService.getUserSessions('u-1', params)

      expect(mockGet).toHaveBeenCalledWith('/admin/users-control/users/u-1/sessions', { params })
    })
  })

  // ─── forceLogoutUser ──────────────────────────────────────────

  describe('forceLogoutUser', () => {
    it('should call POST /admin/users-control/users/:userId/force-logout', async () => {
      const logoutResult = { terminated: 3 }
      mockPost.mockResolvedValue({ data: { data: logoutResult } })

      const result = await usersControlService.forceLogoutUser('u-1')

      expect(mockPost).toHaveBeenCalledWith('/admin/users-control/users/u-1/force-logout', {})
      expect(result).toEqual({ data: logoutResult })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Forbidden'))

      await expect(usersControlService.forceLogoutUser('u-1')).rejects.toThrow('Forbidden')
    })
  })

  // ─── terminateSession ─────────────────────────────────────────

  describe('terminateSession', () => {
    it('should call POST with userId and sessionId', async () => {
      const logoutResult = { terminated: 1 }
      mockPost.mockResolvedValue({ data: { data: logoutResult } })

      const result = await usersControlService.terminateSession('u-1', 's-1')

      expect(mockPost).toHaveBeenCalledWith(
        '/admin/users-control/users/u-1/sessions/s-1/force-logout',
        {}
      )
      expect(result).toEqual({ data: logoutResult })
    })
  })

  // ─── forceLogoutAll ───────────────────────────────────────────

  describe('forceLogoutAll', () => {
    it('should call POST /admin/users-control/force-logout-all', async () => {
      const logoutResult = { terminated: 25 }
      mockPost.mockResolvedValue({ data: { data: logoutResult } })

      const result = await usersControlService.forceLogoutAll()

      expect(mockPost).toHaveBeenCalledWith('/admin/users-control/force-logout-all', {})
      expect(result).toEqual({ data: logoutResult })
    })
  })
})
