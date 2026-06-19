import { Test } from '@nestjs/testing'
import { BusinessException } from '../../../common/exceptions/business.exception'
import { UserRole } from '../../../common/interfaces/authenticated-request.interface'
import { AppLoggerService } from '../../../common/services/app-logger.service'
import { toDay, nowDate } from '../../../common/utils/date-time.utility'
import { NotificationsGateway } from '../notifications.gateway'
import { NotificationsRepository } from '../notifications.repository'
import { NotificationsService } from '../notifications.service'
import type { JwtPayload } from '../../../common/interfaces/authenticated-request.interface'

describe('NotificationsService', () => {
  let service: NotificationsService
  let _repository: jest.Mocked<NotificationsRepository>

  const mockRepository = {
    findManyAndCount: jest.fn(),
    countUnread: jest.fn(),
    findFirstByIdAndRecipient: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    findUsersByIds: jest.fn(),
    findUserById: jest.fn(),
    createNotification: jest.fn(),
    findCaseById: jest.fn(),
    findUserPreference: jest.fn(),
  }

  const mockGateway = {
    emitToUser: jest.fn(),
    emitUnreadCount: jest.fn(),
  }

  const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: NotificationsRepository, useValue: mockRepository },
        { provide: NotificationsGateway, useValue: mockGateway },
        { provide: AppLoggerService, useValue: mockLogger },
      ],
    }).compile()

    service = module.get(NotificationsService)
    _repository = module.get(NotificationsRepository) as any
  })

  /* ---------------------------------------------------------------- */
  /* listNotifications                                                  */
  /* ---------------------------------------------------------------- */

  describe('listNotifications', () => {
    const tenantId = 't1'
    const userId = 'u1'

    it('returns paginated results with actor names', async () => {
      const notifications = [
        {
          id: 'n1',
          type: 'case_assigned',
          actorUserId: 'a1',
          recipientUserId: userId,
          tenantId,
          title: 'Assigned',
          message: 'You were assigned',
          entityType: 'case',
          entityId: 'e1',
          caseId: 'c1',
          caseCommentId: null,
          readAt: null,
          createdAt: toDay('2025-01-01T00:00:00.000Z').toDate(),
        },
      ]
      mockRepository.findManyAndCount.mockResolvedValue([notifications, 1])
      mockRepository.findUsersByIds.mockResolvedValue([
        { id: 'a1', name: 'Alice', email: 'alice@example.com' },
      ])

      const result = await service.listNotifications(tenantId, userId, 1, 20)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]?.actorName).toBe('Alice')
      expect(result.data[0]?.isRead).toBe(false)
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      })
    })

    it('handles empty results', async () => {
      mockRepository.findManyAndCount.mockResolvedValue([[], 0])

      const result = await service.listNotifications(tenantId, userId, 1, 20)

      expect(result.data).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(mockRepository.findUsersByIds).not.toHaveBeenCalled()
    })

    it('passes correct skip/take based on page and limit', async () => {
      mockRepository.findManyAndCount.mockResolvedValue([[], 0])

      await service.listNotifications(tenantId, userId, 3, 10)

      expect(mockRepository.findManyAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        })
      )
    })

    it('passes sorting and filtering params', async () => {
      mockRepository.findManyAndCount.mockResolvedValue([[], 0])

      await service.listNotifications(
        tenantId,
        userId,
        1,
        20,
        'title',
        'asc',
        'search',
        'mention',
        'true'
      )

      const call = mockRepository.findManyAndCount.mock.calls[0]?.[0] as any
      expect(call.orderBy).toEqual({ title: 'asc' })
      expect(call.where.type).toBe('mention')
      expect(call.where.readAt).toEqual({ not: null })
      expect(call.where.OR).toBeDefined()
    })

    it('deduplicates actor IDs before fetching users', async () => {
      const notifications = [
        {
          id: 'n1',
          type: 'case_assigned',
          actorUserId: 'a1',
          recipientUserId: userId,
          tenantId,
          title: 'T1',
          message: 'M1',
          entityType: 'case',
          entityId: 'e1',
          caseId: null,
          caseCommentId: null,
          readAt: null,
          createdAt: nowDate(),
        },
        {
          id: 'n2',
          type: 'case_assigned',
          actorUserId: 'a1',
          recipientUserId: userId,
          tenantId,
          title: 'T2',
          message: 'M2',
          entityType: 'case',
          entityId: 'e2',
          caseId: null,
          caseCommentId: null,
          readAt: null,
          createdAt: nowDate(),
        },
      ]
      mockRepository.findManyAndCount.mockResolvedValue([notifications, 2])
      mockRepository.findUsersByIds.mockResolvedValue([
        { id: 'a1', name: 'Alice', email: 'alice@example.com' },
      ])

      await service.listNotifications(tenantId, userId, 1, 20)

      expect(mockRepository.findUsersByIds).toHaveBeenCalledWith(['a1'])
    })
  })

  /* ---------------------------------------------------------------- */
  /* getUnreadCount                                                     */
  /* ---------------------------------------------------------------- */

  describe('getUnreadCount', () => {
    it('delegates to repository', async () => {
      mockRepository.countUnread.mockResolvedValue(5)

      const result = await service.getUnreadCount('t1', 'u1')

      expect(result).toBe(5)
      expect(mockRepository.countUnread).toHaveBeenCalledWith('t1', 'u1')
    })
  })

  /* ---------------------------------------------------------------- */
  /* markAsRead                                                         */
  /* ---------------------------------------------------------------- */

  describe('markAsRead', () => {
    const user: JwtPayload = {
      sub: 'u1',
      email: 'user@example.com',
      tenantId: 't1',
      tenantSlug: 'tenant-1',
      role: UserRole.SOC_ANALYST_L1,
    }

    it('marks a notification as read', async () => {
      mockRepository.findFirstByIdAndRecipient.mockResolvedValue({
        id: 'n1',
        readAt: null,
      })
      mockRepository.markAsRead.mockResolvedValue({ count: 1 })

      await service.markAsRead('n1', user)

      expect(mockRepository.findFirstByIdAndRecipient).toHaveBeenCalledWith('n1', 't1', 'u1')
      expect(mockRepository.markAsRead).toHaveBeenCalledWith('n1', 't1')
    })

    it('throws BusinessException if notification not found', async () => {
      mockRepository.findFirstByIdAndRecipient.mockResolvedValue(null)

      await expect(service.markAsRead('n-missing', user)).rejects.toThrow(BusinessException)
      await expect(service.markAsRead('n-missing', user)).rejects.toThrow('Notification not found')
    })

    it('skips update if already read', async () => {
      mockRepository.findFirstByIdAndRecipient.mockResolvedValue({
        id: 'n1',
        readAt: toDay('2025-01-01T00:00:00.000Z').toDate(),
      })

      await service.markAsRead('n1', user)

      expect(mockRepository.markAsRead).not.toHaveBeenCalled()
    })
  })

  /* ---------------------------------------------------------------- */
  /* markAllAsRead                                                      */
  /* ---------------------------------------------------------------- */

  describe('markAllAsRead', () => {
    it('delegates to repository', async () => {
      mockRepository.markAllAsRead.mockResolvedValue({ count: 3 })

      await service.markAllAsRead('t1', 'u1')

      expect(mockRepository.markAllAsRead).toHaveBeenCalledWith('t1', 'u1')
    })
  })
})
