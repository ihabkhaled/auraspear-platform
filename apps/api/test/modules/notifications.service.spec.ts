import { NotificationType, NotificationEntityType } from '../../src/common/enums'
import { BusinessException } from '../../src/common/exceptions/business.exception'
import { nowDate } from '../../src/common/utils/date-time.utility'
import { PermissionUpdateReason } from '../../src/modules/notifications/notifications.enums'
import { NotificationsService } from '../../src/modules/notifications/notifications.service'

const TENANT_ID = 'tenant-001'
const ACTOR_ID = 'actor-001'
const ACTOR_EMAIL = 'admin@auraspear.com'
const ACTOR_NAME = 'Admin User'
const RECIPIENT_ID = 'recipient-001'
const CASE_ID = 'case-001'
const CASE_NUMBER = 'SOC-2026-001'
const COMMENT_ID = 'comment-001'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

const mockGateway = {
  emitToUser: jest.fn(),
  emitUnreadCount: jest.fn(),
  emitPermissionsUpdated: jest.fn(),
}

function createMockRepository() {
  return {
    findManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    countUnread: jest.fn().mockResolvedValue(0),
    findFirstByIdAndRecipient: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    findUserById: jest.fn().mockResolvedValue({ name: ACTOR_NAME }),
    findUsersByIds: jest.fn().mockResolvedValue([]),
    createNotification: jest.fn().mockResolvedValue({ id: 'notif-001' }),
    findCaseById: jest.fn().mockResolvedValue({ caseNumber: CASE_NUMBER }),
    findUserPreference: jest.fn().mockResolvedValue(null),
  }
}

const mockUser = {
  sub: ACTOR_ID,
  email: ACTOR_EMAIL,
  tenantId: TENANT_ID,
  tenantSlug: 'auraspear',
  role: 'TENANT_ADMIN' as const,
}

describe('NotificationsService', () => {
  let service: NotificationsService
  let repository: ReturnType<typeof createMockRepository>

  beforeEach(() => {
    jest.clearAllMocks()
    repository = createMockRepository()
    service = new NotificationsService(
      repository as never,
      mockAppLogger as never,
      mockGateway as never
    )
  })

  /* ------------------------------------------------------------------ */
  /* listNotifications                                                     */
  /* ------------------------------------------------------------------ */

  describe('listNotifications', () => {
    it('should return paginated notifications with resolved actor names', async () => {
      const now = nowDate()
      repository.findManyAndCount.mockResolvedValue([
        [
          {
            id: 'notif-1',
            tenantId: TENANT_ID,
            type: 'mention',
            actorUserId: ACTOR_ID,
            recipientUserId: RECIPIENT_ID,
            title: 'mention_notification_title',
            message: 'Admin mentioned you',
            entityType: 'case_comment',
            entityId: COMMENT_ID,
            caseId: CASE_ID,
            caseCommentId: COMMENT_ID,
            readAt: null,
            createdAt: now,
          },
        ],
        1,
      ])
      repository.findUsersByIds.mockResolvedValue([
        { id: ACTOR_ID, name: ACTOR_NAME, email: ACTOR_EMAIL },
      ])

      const result = await service.listNotifications(TENANT_ID, RECIPIENT_ID, 1, 10)

      expect(result.data).toHaveLength(1)
      expect(result.data[0]).toMatchObject({
        id: 'notif-1',
        type: 'mention',
        actorName: ACTOR_NAME,
        actorEmail: ACTOR_EMAIL,
        isRead: false,
      })
      expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 1 })
    })

    it('should return "Unknown" for unresolvable actor', async () => {
      repository.findManyAndCount.mockResolvedValue([
        [
          {
            id: 'notif-1',
            actorUserId: 'deleted-user',
            recipientUserId: RECIPIENT_ID,
            type: 'mention',
            title: 'test',
            message: 'test',
            entityType: 'case_comment',
            entityId: 'e-1',
            caseId: null,
            caseCommentId: null,
            readAt: null,
            createdAt: nowDate(),
          },
        ],
        1,
      ])
      repository.findUsersByIds.mockResolvedValue([])

      const result = await service.listNotifications(TENANT_ID, RECIPIENT_ID, 1, 10)

      expect(result.data[0]?.actorName).toBe('Unknown')
      expect(result.data[0]?.actorEmail).toBe('')
    })

    it('should mark notification as read when readAt is set', async () => {
      repository.findManyAndCount.mockResolvedValue([
        [
          {
            id: 'notif-1',
            actorUserId: ACTOR_ID,
            recipientUserId: RECIPIENT_ID,
            type: 'mention',
            title: 'test',
            message: 'test',
            entityType: 'case_comment',
            entityId: 'e-1',
            caseId: null,
            caseCommentId: null,
            readAt: nowDate(),
            createdAt: nowDate(),
          },
        ],
        1,
      ])
      repository.findUsersByIds.mockResolvedValue([{ id: ACTOR_ID, name: 'A', email: 'a@b.com' }])

      const result = await service.listNotifications(TENANT_ID, RECIPIENT_ID, 1, 10)

      expect(result.data[0]?.isRead).toBe(true)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getUnreadCount                                                        */
  /* ------------------------------------------------------------------ */

  describe('getUnreadCount', () => {
    it('should return unread count from repository', async () => {
      repository.countUnread.mockResolvedValue(5)

      const count = await service.getUnreadCount(TENANT_ID, RECIPIENT_ID)

      expect(count).toBe(5)
      expect(repository.countUnread).toHaveBeenCalledWith(TENANT_ID, RECIPIENT_ID)
    })
  })

  /* ------------------------------------------------------------------ */
  /* markAsRead                                                            */
  /* ------------------------------------------------------------------ */

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      repository.findFirstByIdAndRecipient.mockResolvedValue({
        id: 'notif-1',
        readAt: null,
      })

      await service.markAsRead('notif-1', mockUser)

      expect(repository.markAsRead).toHaveBeenCalledWith('notif-1', TENANT_ID)
    })

    it('should throw 404 if notification not found', async () => {
      repository.findFirstByIdAndRecipient.mockResolvedValue(null)

      await expect(service.markAsRead('notif-999', mockUser)).rejects.toThrow(BusinessException)
      await expect(service.markAsRead('notif-999', mockUser)).rejects.toThrow(
        'Notification not found'
      )
    })

    it('should skip update if already read', async () => {
      repository.findFirstByIdAndRecipient.mockResolvedValue({
        id: 'notif-1',
        readAt: nowDate(),
      })

      await service.markAsRead('notif-1', mockUser)

      expect(repository.markAsRead).not.toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* markAllAsRead                                                         */
  /* ------------------------------------------------------------------ */

  describe('markAllAsRead', () => {
    it('should update all unread notifications', async () => {
      await service.markAllAsRead(TENANT_ID, RECIPIENT_ID)

      expect(repository.markAllAsRead).toHaveBeenCalledWith(TENANT_ID, RECIPIENT_ID)
    })
  })

  /* ------------------------------------------------------------------ */
  /* notifyCaseAssigned                                                    */
  /* ------------------------------------------------------------------ */

  describe('notifyCaseAssigned', () => {
    it('should create notification and emit WebSocket events', async () => {
      await service.notifyCaseAssigned(
        TENANT_ID,
        CASE_ID,
        CASE_NUMBER,
        RECIPIENT_ID,
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TENANT_ID,
          type: NotificationType.CASE_ASSIGNED,
          actorUserId: ACTOR_ID,
          recipientUserId: RECIPIENT_ID,
          caseId: CASE_ID,
        })
      )
      expect(mockGateway.emitToUser).toHaveBeenCalledWith(
        TENANT_ID,
        RECIPIENT_ID,
        expect.objectContaining({ type: NotificationType.CASE_ASSIGNED })
      )
      expect(mockGateway.emitUnreadCount).toHaveBeenCalledWith(TENANT_ID, RECIPIENT_ID, 0)
    })

    it('should skip notification if actor is the assignee (self-assign)', async () => {
      await service.notifyCaseAssigned(
        TENANT_ID,
        CASE_ID,
        CASE_NUMBER,
        ACTOR_ID,
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).not.toHaveBeenCalled()
      expect(mockGateway.emitToUser).not.toHaveBeenCalled()
    })

    it('should include actor name in message', async () => {
      repository.findUserById.mockResolvedValue({ name: 'Jane Admin' })

      await service.notifyCaseAssigned(
        TENANT_ID,
        CASE_ID,
        CASE_NUMBER,
        RECIPIENT_ID,
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: JSON.stringify({
            key: 'caseAssignedMessage',
            params: { actorName: 'Jane Admin', caseRef: CASE_NUMBER },
          }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* notifyCaseUnassigned                                                  */
  /* ------------------------------------------------------------------ */

  describe('notifyCaseUnassigned', () => {
    it('should create unassign notification', async () => {
      await service.notifyCaseUnassigned(
        TENANT_ID,
        CASE_ID,
        CASE_NUMBER,
        RECIPIENT_ID,
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CASE_UNASSIGNED,
          recipientUserId: RECIPIENT_ID,
        })
      )
      expect(mockGateway.emitToUser).toHaveBeenCalled()
    })

    it('should skip if actor is the previous owner', async () => {
      await service.notifyCaseUnassigned(
        TENANT_ID,
        CASE_ID,
        CASE_NUMBER,
        ACTOR_ID,
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).not.toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* notifyCaseActivity                                                    */
  /* ------------------------------------------------------------------ */

  describe('notifyCaseActivity', () => {
    it('should notify case owner about activity', async () => {
      await service.notifyCaseActivity(
        TENANT_ID,
        CASE_ID,
        CASE_NUMBER,
        RECIPIENT_ID,
        NotificationType.CASE_COMMENT_ADDED,
        'New comment on case SOC-2026-001',
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CASE_COMMENT_ADDED,
          recipientUserId: RECIPIENT_ID,
          entityType: NotificationEntityType.CASE,
          entityId: CASE_ID,
          caseId: CASE_ID,
        })
      )
      expect(mockGateway.emitToUser).toHaveBeenCalled()
    })

    it('should skip if ownerUserId is null (unassigned case)', async () => {
      await service.notifyCaseActivity(
        TENANT_ID,
        CASE_ID,
        CASE_NUMBER,
        null,
        NotificationType.CASE_TASK_ADDED,
        'New task added',
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).not.toHaveBeenCalled()
      expect(mockGateway.emitToUser).not.toHaveBeenCalled()
    })

    it('should skip if actor is the case owner', async () => {
      await service.notifyCaseActivity(
        TENANT_ID,
        CASE_ID,
        CASE_NUMBER,
        ACTOR_ID,
        NotificationType.CASE_ARTIFACT_ADDED,
        'Artifact added',
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).not.toHaveBeenCalled()
    })

    it('should handle all case activity types', async () => {
      const types = [
        NotificationType.CASE_COMMENT_ADDED,
        NotificationType.CASE_TASK_ADDED,
        NotificationType.CASE_ARTIFACT_ADDED,
        NotificationType.CASE_STATUS_CHANGED,
        NotificationType.CASE_UPDATED,
      ]

      for (const type of types) {
        jest.clearAllMocks()
        repository = createMockRepository()
        service = new NotificationsService(
          repository as never,
          mockAppLogger as never,
          mockGateway as never
        )

        await service.notifyCaseActivity(
          TENANT_ID,
          CASE_ID,
          CASE_NUMBER,
          RECIPIENT_ID,
          type,
          `Message for ${type}`,
          ACTOR_ID,
          ACTOR_EMAIL
        )

        expect(repository.createNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type })
        )
      }
    })
  })

  /* ------------------------------------------------------------------ */
  /* notifyTenantAssigned                                                  */
  /* ------------------------------------------------------------------ */

  describe('notifyTenantAssigned', () => {
    it('should create tenant assignment notification', async () => {
      await service.notifyTenantAssigned(
        TENANT_ID,
        RECIPIENT_ID,
        'AuraSpear',
        'SOC_ANALYST_L1',
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.TENANT_ASSIGNED,
          recipientUserId: RECIPIENT_ID,
          entityType: NotificationEntityType.TENANT,
          entityId: TENANT_ID,
          message: JSON.stringify({
            key: 'tenantAssignedMessage',
            params: { actorName: ACTOR_NAME },
          }),
        })
      )
      expect(mockGateway.emitToUser).toHaveBeenCalled()
    })

    it('should skip self-notification', async () => {
      await service.notifyTenantAssigned(
        TENANT_ID,
        ACTOR_ID,
        'AuraSpear',
        'TENANT_ADMIN',
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).not.toHaveBeenCalled()
    })
  })

  /* ------------------------------------------------------------------ */
  /* notifyRoleChanged                                                     */
  /* ------------------------------------------------------------------ */

  describe('notifyRoleChanged', () => {
    it('should create role change notification', async () => {
      await service.notifyRoleChanged(
        TENANT_ID,
        RECIPIENT_ID,
        'SOC_ANALYST_L1',
        'TENANT_ADMIN',
        ACTOR_ID,
        ACTOR_EMAIL
      )

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ROLE_CHANGED,
          recipientUserId: RECIPIENT_ID,
          entityType: NotificationEntityType.USER,
          message: JSON.stringify({
            key: 'roleChangedMessage',
            params: { actorName: ACTOR_NAME, role: 'TENANT_ADMIN' },
          }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* notifyUserBlocked                                                     */
  /* ------------------------------------------------------------------ */

  describe('notifyUserBlocked', () => {
    it('should create blocked notification', async () => {
      await service.notifyUserBlocked(TENANT_ID, RECIPIENT_ID, ACTOR_ID, ACTOR_EMAIL)

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.USER_BLOCKED,
          recipientUserId: RECIPIENT_ID,
          message: JSON.stringify({ key: 'userBlockedMessage', params: { actorName: ACTOR_NAME } }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* notifyUserUnblocked                                                   */
  /* ------------------------------------------------------------------ */

  describe('notifyUserUnblocked', () => {
    it('should create unblocked notification', async () => {
      await service.notifyUserUnblocked(TENANT_ID, RECIPIENT_ID, ACTOR_ID, ACTOR_EMAIL)

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.USER_UNBLOCKED,
          message: JSON.stringify({
            key: 'userUnblockedMessage',
            params: { actorName: ACTOR_NAME },
          }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* notifyUserRemoved                                                     */
  /* ------------------------------------------------------------------ */

  describe('notifyUserRemoved', () => {
    it('should create removed notification', async () => {
      await service.notifyUserRemoved(TENANT_ID, RECIPIENT_ID, ACTOR_ID, ACTOR_EMAIL)

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.USER_REMOVED,
          message: JSON.stringify({ key: 'userRemovedMessage', params: { actorName: ACTOR_NAME } }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* notifyUserRestored                                                    */
  /* ------------------------------------------------------------------ */

  describe('notifyUserRestored', () => {
    it('should create restored notification', async () => {
      await service.notifyUserRestored(TENANT_ID, RECIPIENT_ID, ACTOR_ID, ACTOR_EMAIL)

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.USER_RESTORED,
          message: JSON.stringify({
            key: 'userRestoredMessage',
            params: { actorName: ACTOR_NAME },
          }),
        })
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* emitPermissionsUpdated                                              */
  /* ------------------------------------------------------------------ */

  describe('emitPermissionsUpdated', () => {
    it('should emit a realtime permission refresh event to one user', () => {
      service.emitPermissionsUpdated(TENANT_ID, RECIPIENT_ID, PermissionUpdateReason.ROLE_UPDATED)

      expect(mockGateway.emitPermissionsUpdated).toHaveBeenCalledWith(
        TENANT_ID,
        RECIPIENT_ID,
        PermissionUpdateReason.ROLE_UPDATED
      )
    })

    it('should emit to each unique user when updating multiple sessions', () => {
      service.emitPermissionsUpdatedToUsers(
        TENANT_ID,
        [RECIPIENT_ID, RECIPIENT_ID, 'user-002'],
        PermissionUpdateReason.ROLE_MATRIX_UPDATED
      )

      expect(mockGateway.emitPermissionsUpdated).toHaveBeenCalledTimes(2)
      expect(mockGateway.emitPermissionsUpdated).toHaveBeenCalledWith(
        TENANT_ID,
        RECIPIENT_ID,
        PermissionUpdateReason.ROLE_MATRIX_UPDATED
      )
      expect(mockGateway.emitPermissionsUpdated).toHaveBeenCalledWith(
        TENANT_ID,
        'user-002',
        PermissionUpdateReason.ROLE_MATRIX_UPDATED
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* createMentionNotifications                                            */
  /* ------------------------------------------------------------------ */

  describe('createMentionNotifications', () => {
    it('should create notifications for each mentioned user via createAndEmitNotification', async () => {
      repository.countUnread.mockResolvedValue(3)

      await service.createMentionNotifications(
        TENANT_ID,
        CASE_ID,
        COMMENT_ID,
        [RECIPIENT_ID, 'user-002'],
        mockUser
      )

      expect(repository.createNotification).toHaveBeenCalledTimes(2)
      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: RECIPIENT_ID,
          type: NotificationType.MENTION,
          caseId: CASE_ID,
          caseCommentId: COMMENT_ID,
          entityType: NotificationEntityType.CASE_COMMENT,
        })
      )
      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientUserId: 'user-002',
          type: NotificationType.MENTION,
        })
      )
      expect(mockGateway.emitToUser).toHaveBeenCalledTimes(2)
      expect(mockGateway.emitUnreadCount).toHaveBeenCalledTimes(2)
    })

    it('should filter out self-mentions', async () => {
      await service.createMentionNotifications(TENANT_ID, CASE_ID, COMMENT_ID, [ACTOR_ID], mockUser)

      expect(repository.createNotification).not.toHaveBeenCalled()
      expect(mockGateway.emitToUser).not.toHaveBeenCalled()
    })

    it('should skip when no recipients after filtering', async () => {
      await service.createMentionNotifications(TENANT_ID, CASE_ID, COMMENT_ID, [], mockUser)

      expect(repository.createNotification).not.toHaveBeenCalled()
    })

    it('should use actor email as fallback name', async () => {
      repository.findUserById.mockResolvedValue(null)
      repository.countUnread.mockResolvedValue(1)

      await service.createMentionNotifications(
        TENANT_ID,
        CASE_ID,
        COMMENT_ID,
        [RECIPIENT_ID],
        mockUser
      )

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(ACTOR_EMAIL),
        })
      )
    })

    it('should use caseId as fallback when case not found', async () => {
      repository.findCaseById.mockResolvedValue(null)
      repository.countUnread.mockResolvedValue(0)

      await service.createMentionNotifications(
        TENANT_ID,
        CASE_ID,
        COMMENT_ID,
        [RECIPIENT_ID],
        mockUser
      )

      expect(repository.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(CASE_ID),
        })
      )
    })
  })
})
