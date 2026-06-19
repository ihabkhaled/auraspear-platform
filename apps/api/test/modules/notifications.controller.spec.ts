import { NotificationsController } from '../../src/modules/notifications/notifications.controller'

const TENANT_ID = 'tenant-001'
const USER_ID = 'user-001'

const mockUser = {
  sub: USER_ID,
  email: 'analyst@auraspear.com',
  tenantId: TENANT_ID,
  tenantSlug: 'auraspear',
  role: 'SOC_ANALYST_L1' as const,
}

const mockNotificationsService = {
  listNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAllAsRead: jest.fn(),
  markAsRead: jest.fn(),
}

describe('NotificationsController', () => {
  let controller: NotificationsController

  beforeEach(() => {
    jest.clearAllMocks()
    controller = new NotificationsController(mockNotificationsService as never)
  })

  describe('listNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockResult = {
        data: [{ id: 'n1', type: 'mention', message: 'Test', isRead: false }],
        total: 1,
        page: 1,
        limit: 15,
      }
      mockNotificationsService.listNotifications.mockResolvedValue(mockResult)

      const result = await controller.listNotifications(TENANT_ID, mockUser as never, {
        page: 1,
        limit: 15,
      })

      expect(result).toEqual(mockResult)
      expect(mockNotificationsService.listNotifications).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        1,
        15,
        'createdAt',
        'desc',
        undefined,
        undefined,
        undefined
      )
    })

    it('should pass custom page and limit', async () => {
      mockNotificationsService.listNotifications.mockResolvedValue({
        data: [],
        total: 0,
        page: 3,
        limit: 5,
      })

      await controller.listNotifications(TENANT_ID, mockUser as never, { page: 3, limit: 5 })

      expect(mockNotificationsService.listNotifications).toHaveBeenCalledWith(
        TENANT_ID,
        USER_ID,
        3,
        5,
        'createdAt',
        'desc',
        undefined,
        undefined,
        undefined
      )
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread count wrapped in object', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(7)

      const result = await controller.getUnreadCount(TENANT_ID, mockUser as never)

      expect(result).toEqual({ count: 7 })
      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith(TENANT_ID, USER_ID)
    })

    it('should return zero count', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(0)

      const result = await controller.getUnreadCount(TENANT_ID, mockUser as never)

      expect(result).toEqual({ count: 0 })
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all as read and return success', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue(undefined)

      const result = await controller.markAllAsRead(TENANT_ID, mockUser as never)

      expect(result).toEqual({ success: true })
      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(TENANT_ID, USER_ID)
    })
  })

  describe('markAsRead', () => {
    it('should mark single notification as read', async () => {
      mockNotificationsService.markAsRead.mockResolvedValue(undefined)

      const result = await controller.markAsRead('notif-123', mockUser as never)

      expect(result).toEqual({ success: true })
      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith('notif-123', mockUser)
    })

    it('should propagate service errors', async () => {
      mockNotificationsService.markAsRead.mockRejectedValue(new Error('Notification not found'))

      await expect(controller.markAsRead('bad-id', mockUser as never)).rejects.toThrow(
        'Notification not found'
      )
    })
  })
})
