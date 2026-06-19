import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))
import api from '@/lib/api'
import { authService } from '@/services/auth.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

describe('authService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── login ─────────────────────────────────────────────────────

  describe('login', () => {
    it('should call POST /auth/login with email and password', async () => {
      const loginResponse = { accessToken: 'jwt-token', refreshToken: 'rt-token' }
      mockPost.mockResolvedValue({ data: loginResponse })

      const result = await authService.login('admin@example.com', 'password123')

      expect(mockPost).toHaveBeenCalledWith('/auth/login', {
        email: 'admin@example.com',
        password: 'password123',
      })
      expect(result).toEqual(loginResponse)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Invalid credentials'))

      await expect(authService.login('bad@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      )
    })
  })

  // ─── refresh ──────────────────────────────────────────────────

  describe('refresh', () => {
    it('should call POST /auth/refresh', async () => {
      const refreshResponse = { accessToken: 'new-jwt' }
      mockPost.mockResolvedValue({ data: refreshResponse })

      const result = await authService.refresh()

      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', {})
      expect(result).toEqual(refreshResponse)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Token expired'))

      await expect(authService.refresh()).rejects.toThrow('Token expired')
    })
  })

  // ─── getMe ────────────────────────────────────────────────────

  describe('getMe', () => {
    it('should call GET /auth/me', async () => {
      const me = { id: 'u-1', name: 'Admin', role: 'admin', permissions: [] }
      mockGet.mockResolvedValue({ data: me })

      const result = await authService.getMe()

      expect(mockGet).toHaveBeenCalledWith('/auth/me')
      expect(result).toEqual(me)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Unauthorized'))

      await expect(authService.getMe()).rejects.toThrow('Unauthorized')
    })
  })

  // ─── logout ───────────────────────────────────────────────────

  describe('logout', () => {
    it('should call POST /auth/logout', async () => {
      mockPost.mockResolvedValue({ data: { success: true } })

      const result = await authService.logout()

      expect(mockPost).toHaveBeenCalledWith('/auth/logout', {})
      expect(result).toEqual({ success: true })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Server error'))

      await expect(authService.logout()).rejects.toThrow('Server error')
    })
  })

  // ─── getUserTenants ───────────────────────────────────────────

  describe('getUserTenants', () => {
    it('should call GET /auth/tenants', async () => {
      const tenants = [{ tenantId: 't-1', tenantName: 'Acme Corp', role: 'admin' }]
      mockGet.mockResolvedValue({ data: tenants })

      const result = await authService.getUserTenants()

      expect(mockGet).toHaveBeenCalledWith('/auth/tenants')
      expect(result).toEqual(tenants)
    })
  })

  // ─── endImpersonation ─────────────────────────────────────────

  describe('endImpersonation', () => {
    it('should call POST /auth/end-impersonation', async () => {
      const response = { data: { accessToken: 'original-token' } }
      mockPost.mockResolvedValue({ data: response })

      const result = await authService.endImpersonation()

      expect(mockPost).toHaveBeenCalledWith('/auth/end-impersonation')
      expect(result).toEqual(response)
    })
  })
})
