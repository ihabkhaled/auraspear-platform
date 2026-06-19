import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import api from '@/lib/api'
import { notificationService } from '@/services/notification.service'

const mockGet = api.get as Mock
const mockPatch = api.patch as Mock

beforeEach(() => {
  vi.clearAllMocks()
})

describe('notificationService', () => {
  describe('getNotifications', () => {
    it('should call GET /notifications with params', async () => {
      const mockData = {
        data: [{ id: 'n1', type: 'mention', message: 'Hello', isRead: false }],
        total: 1,
        page: 1,
        limit: 15,
      }
      mockGet.mockResolvedValue({ data: mockData })

      const result = await notificationService.getNotifications({ page: 1, limit: 15 })

      expect(mockGet).toHaveBeenCalledWith('/notifications', {
        params: { page: 1, limit: 15 },
      })
      expect(result).toEqual(mockData)
    })

    it('should call GET /notifications without params', async () => {
      const mockData = { data: [], total: 0, page: 1, limit: 15 }
      mockGet.mockResolvedValue({ data: mockData })

      const result = await notificationService.getNotifications()

      expect(mockGet).toHaveBeenCalledWith('/notifications', { params: undefined })
      expect(result).toEqual(mockData)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(notificationService.getNotifications()).rejects.toThrow('Network error')
    })
  })

  describe('getUnreadCount', () => {
    it('should call GET /notifications/unread-count and unwrap data', async () => {
      mockGet.mockResolvedValue({ data: { data: { count: 5 } } })

      const result = await notificationService.getUnreadCount()

      expect(mockGet).toHaveBeenCalledWith('/notifications/unread-count')
      expect(result).toEqual({ count: 5 })
    })

    it('should return zero count', async () => {
      mockGet.mockResolvedValue({ data: { data: { count: 0 } } })

      const result = await notificationService.getUnreadCount()

      expect(result).toEqual({ count: 0 })
    })
  })

  describe('markAsRead', () => {
    it('should call PATCH /notifications/:id/read', async () => {
      mockPatch.mockResolvedValue({ data: { data: { success: true } } })

      const result = await notificationService.markAsRead('notif-123')

      expect(mockPatch).toHaveBeenCalledWith('/notifications/notif-123/read')
      expect(result).toEqual({ success: true })
    })

    it('should propagate errors', async () => {
      mockPatch.mockRejectedValue(new Error('Not found'))

      await expect(notificationService.markAsRead('bad-id')).rejects.toThrow('Not found')
    })
  })

  describe('markAllAsRead', () => {
    it('should call PATCH /notifications/read-all', async () => {
      mockPatch.mockResolvedValue({ data: { data: { success: true } } })

      const result = await notificationService.markAllAsRead()

      expect(mockPatch).toHaveBeenCalledWith('/notifications/read-all')
      expect(result).toEqual({ success: true })
    })
  })
})
