import { Test } from '@nestjs/testing'
import { UserRole } from '../../../common/interfaces/authenticated-request.interface'
import { NotificationsController } from '../notifications.controller'
import { NotificationsService } from '../notifications.service'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'

describe('NotificationsController', () => {
  let controller: NotificationsController
  let service: jest.Mocked<NotificationsService>

  const mockService = {
    listNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
  }

  const tenantId = 't1'
  const user: JwtPayload = {
    sub: 'u1',
    email: 'user@example.com',
    tenantId: 't1',
    tenantSlug: 'tenant-1',
    role: UserRole.SOC_ANALYST_L1,
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile()

    controller = module.get(NotificationsController)
    service = module.get(NotificationsService) as any
  })

  /* ---------------------------------------------------------------- */
  /* listNotifications                                                  */
  /* ---------------------------------------------------------------- */

  describe('listNotifications', () => {
    it('parses query and calls service with default values', async () => {
      const paginatedResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }
      service.listNotifications.mockResolvedValue(paginatedResult)

      const result = await controller.listNotifications(tenantId, user, {})

      expect(result).toEqual(paginatedResult)
      expect(service.listNotifications).toHaveBeenCalledWith(
        tenantId,
        user.sub,
        1,
        20,
        'createdAt',
        'desc',
        undefined,
        undefined,
        undefined
      )
    })

    it('passes custom query parameters', async () => {
      const paginatedResult = {
        data: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
      }
      service.listNotifications.mockResolvedValue(paginatedResult)

      await controller.listNotifications(tenantId, user, {
        page: '2',
        limit: '10',
        sortBy: 'title',
        sortOrder: 'asc',
        query: 'search',
        type: 'mention',
        isRead: 'true',
      })

      expect(service.listNotifications).toHaveBeenCalledWith(
        tenantId,
        user.sub,
        2,
        10,
        'title',
        'asc',
        'search',
        'mention',
        'true'
      )
    })
  })

  /* ---------------------------------------------------------------- */
  /* getUnreadCount                                                     */
  /* ---------------------------------------------------------------- */

  describe('getUnreadCount', () => {
    it('calls service and wraps result in { count }', async () => {
      service.getUnreadCount.mockResolvedValue(7)

      const result = await controller.getUnreadCount(tenantId, user)

      expect(result).toEqual({ count: 7 })
      expect(service.getUnreadCount).toHaveBeenCalledWith(tenantId, user.sub)
    })
  })

  /* ---------------------------------------------------------------- */
  /* markAsRead                                                         */
  /* ---------------------------------------------------------------- */

  describe('markAsRead', () => {
    it('calls service with notification ID and user', async () => {
      service.markAsRead.mockResolvedValue(undefined)

      const result = await controller.markAsRead('n1', user)

      expect(result).toEqual({ success: true })
      expect(service.markAsRead).toHaveBeenCalledWith('n1', user)
    })
  })

  /* ---------------------------------------------------------------- */
  /* markAllAsRead                                                      */
  /* ---------------------------------------------------------------- */

  describe('markAllAsRead', () => {
    it('calls service with tenant and user', async () => {
      service.markAllAsRead.mockResolvedValue(undefined)

      const result = await controller.markAllAsRead(tenantId, user)

      expect(result).toEqual({ success: true })
      expect(service.markAllAsRead).toHaveBeenCalledWith(tenantId, user.sub)
    })
  })
})
