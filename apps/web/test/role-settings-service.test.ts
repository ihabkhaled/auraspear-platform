import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}))
import api from '@/lib/api'
import { roleSettingsService } from '@/services/role-settings.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPut = api.put as Mock

describe('roleSettingsService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getPermissionDefinitions ─────────────────────────────────

  describe('getPermissionDefinitions', () => {
    it('should call GET /role-settings/definitions', async () => {
      const definitions = [{ key: 'ALERTS_VIEW', labelKey: 'alerts.view', sortOrder: 1 }]
      mockGet.mockResolvedValue({ data: { data: definitions } })

      const result = await roleSettingsService.getPermissionDefinitions()

      expect(mockGet).toHaveBeenCalledWith('/role-settings/definitions')
      expect(result).toEqual({ data: definitions })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Forbidden'))

      await expect(roleSettingsService.getPermissionDefinitions()).rejects.toThrow('Forbidden')
    })
  })

  // ─── getPermissionMatrix ──────────────────────────────────────

  describe('getPermissionMatrix', () => {
    it('should call GET /role-settings', async () => {
      const matrix = { roles: ['admin', 'analyst'], permissions: {} }
      mockGet.mockResolvedValue({ data: { data: matrix } })

      const result = await roleSettingsService.getPermissionMatrix()

      expect(mockGet).toHaveBeenCalledWith('/role-settings')
      expect(result).toEqual({ data: matrix })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(roleSettingsService.getPermissionMatrix()).rejects.toThrow('Server error')
    })
  })

  // ─── updatePermissionMatrix ───────────────────────────────────

  describe('updatePermissionMatrix', () => {
    it('should call PUT /role-settings with matrix', async () => {
      const updated = { roles: ['admin'], permissions: { admin: ['ALERTS_VIEW'] } }
      mockPut.mockResolvedValue({ data: { data: updated } })

      const matrix = { admin: ['ALERTS_VIEW'] }
      const result = await roleSettingsService.updatePermissionMatrix(matrix)

      expect(mockPut).toHaveBeenCalledWith('/role-settings', { matrix })
      expect(result).toEqual({ data: updated })
    })

    it('should propagate API errors', async () => {
      mockPut.mockRejectedValue(new Error('Forbidden'))

      await expect(roleSettingsService.updatePermissionMatrix({})).rejects.toThrow('Forbidden')
    })
  })

  // ─── resetToDefaults ──────────────────────────────────────────

  describe('resetToDefaults', () => {
    it('should call POST /role-settings/reset', async () => {
      const defaults = { roles: ['admin', 'analyst'], permissions: {} }
      mockPost.mockResolvedValue({ data: { data: defaults } })

      const result = await roleSettingsService.resetToDefaults()

      expect(mockPost).toHaveBeenCalledWith('/role-settings/reset')
      expect(result).toEqual({ data: defaults })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Forbidden'))

      await expect(roleSettingsService.resetToDefaults()).rejects.toThrow('Forbidden')
    })
  })
})
