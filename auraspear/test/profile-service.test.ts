import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}))
import api from '@/lib/api'
import { profileService } from '@/services/profile.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock

describe('profileService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getProfile ────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should call GET /users/profile and unwrap data', async () => {
      const profile = { id: 'u-1', name: 'Alice', email: 'alice@example.com' }
      mockGet.mockResolvedValue({ data: { data: profile } })

      const result = await profileService.getProfile()

      expect(mockGet).toHaveBeenCalledWith('/users/profile')
      expect(result).toEqual(profile)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Unauthorized'))

      await expect(profileService.getProfile()).rejects.toThrow('Unauthorized')
    })
  })

  // ─── updateProfile ────────────────────────────────────────────

  describe('updateProfile', () => {
    it('should call PATCH /users/profile with data and unwrap', async () => {
      const updated = { id: 'u-1', name: 'Alice Updated', email: 'alice@example.com' }
      mockPatch.mockResolvedValue({ data: { data: updated } })

      const input = { name: 'Alice Updated', currentPassword: 'pass123' }
      const result = await profileService.updateProfile(input)

      expect(mockPatch).toHaveBeenCalledWith('/users/profile', input)
      expect(result).toEqual(updated)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Validation failed'))

      await expect(profileService.updateProfile({ name: '', currentPassword: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  // ─── changePassword ───────────────────────────────────────────

  describe('changePassword', () => {
    it('should call POST /users/change-password with data', async () => {
      mockPost.mockResolvedValue({ data: { data: { success: true } } })

      const input = { currentPassword: 'old123', newPassword: 'new456', confirmPassword: 'new456' }
      const result = await profileService.changePassword(input)

      expect(mockPost).toHaveBeenCalledWith('/users/change-password', input)
      expect(result).toEqual({ success: true })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Wrong password'))

      await expect(
        profileService.changePassword({
          currentPassword: 'bad',
          newPassword: 'new',
          confirmPassword: 'new',
        })
      ).rejects.toThrow('Wrong password')
    })
  })
})
