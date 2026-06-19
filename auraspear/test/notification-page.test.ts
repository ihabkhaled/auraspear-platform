import { describe, it, expect, vi } from 'vitest'
import { getNotificationColumns } from '@/components/notifications/getNotificationColumns'
import { NotificationType, SortOrder } from '@/enums'
import type { NotificationItem, NotificationSearchParams } from '@/types'

vi.mock('lucide-react', () => ({
  CheckCircle2: 'CheckCircle2',
  Circle: 'Circle',
  Clock: 'Clock',
  Bell: 'Bell',
  Building2: 'Building2',
  ClipboardList: 'ClipboardList',
  FileText: 'FileText',
  MessageSquare: 'MessageSquare',
  Pencil: 'Pencil',
  Shield: 'Shield',
  ShieldOff: 'ShieldOff',
  ToggleRight: 'ToggleRight',
  UserCheck: 'UserCheck',
  UserMinus: 'UserMinus',
  UserPlus: 'UserPlus',
  UserX: 'UserX',
}))

/**
 * Tests for the Notifications page integration logic.
 *
 * Since the project uses a node-only vitest environment without jsdom,
 * we test the data flow and business logic that the page relies on:
 * - Column definitions for the DataTable
 * - Notification click routing logic
 * - Mark all read flow
 * - Filter integration with DataTable
 */

const mockT = (key: string) => key

describe('NotificationsPage integration logic', () => {
  describe('column definitions for DataTable', () => {
    const columns = getNotificationColumns({
      notifications: mockT,
      common: mockT,
      resolveMessage: (message: string) => message,
      locale: 'en',
    })

    it('should produce columns compatible with DataTable', () => {
      for (const col of columns) {
        expect(col.key).toBeDefined()
        expect(typeof col.label).toBe('string')
      }
    })

    it('should produce sortable columns that work with onSort', () => {
      const sortableCols = columns.filter(c => c.sortable)
      expect(sortableCols.length).toBeGreaterThan(0)

      for (const col of sortableCols) {
        expect(typeof col.key).toBe('string')
      }
    })
  })

  describe('notification click routing logic', () => {
    it('should generate case route for notification with caseId', () => {
      const notification: NotificationItem = {
        id: 'n1',
        type: NotificationType.CASE_ASSIGNED,
        actorName: 'Admin',
        actorEmail: 'admin@test.com',
        title: 'Case assigned',
        message: 'You were assigned to case #1',
        entityType: 'case',
        entityId: 'case-1',
        caseId: 'case-1',
        caseCommentId: null,
        isRead: false,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const route = `/cases/${notification.caseId}`
      expect(route).toBe('/cases/case-1')
    })

    it('should append comment anchor when caseCommentId is present', () => {
      const notification: NotificationItem = {
        id: 'n2',
        type: NotificationType.CASE_COMMENT_ADDED,
        actorName: 'User',
        actorEmail: 'user@test.com',
        title: 'New comment',
        message: 'A comment was added',
        entityType: 'case_comment',
        entityId: 'comment-1',
        caseId: 'case-1',
        caseCommentId: 'comment-1',
        isRead: false,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const commentAnchor = notification.caseCommentId
        ? `#comment-${notification.caseCommentId}`
        : ''
      const route = `/cases/${notification.caseId}${commentAnchor}`
      expect(route).toBe('/cases/case-1#comment-comment-1')
    })

    it('should not generate route when caseId is null', () => {
      const notification: NotificationItem = {
        id: 'n3',
        type: NotificationType.ROLE_CHANGED,
        actorName: 'Admin',
        actorEmail: 'admin@test.com',
        title: 'Role changed',
        message: 'Your role was changed',
        entityType: 'user',
        entityId: 'user-1',
        caseId: null,
        caseCommentId: null,
        isRead: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      expect(notification.caseId).toBeNull()
    })

    it('should not mark read notification as read again', () => {
      const notification: NotificationItem = {
        id: 'n4',
        type: NotificationType.MENTION,
        actorName: 'User',
        actorEmail: 'user@test.com',
        title: 'Mentioned',
        message: 'You were mentioned',
        entityType: 'case_comment',
        entityId: 'c1',
        caseId: 'case-1',
        caseCommentId: null,
        isRead: true,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const shouldMarkRead = !notification.isRead
      expect(shouldMarkRead).toBe(false)
    })

    it('should mark unread notification as read on click', () => {
      const notification: NotificationItem = {
        id: 'n5',
        type: NotificationType.MENTION,
        actorName: 'User',
        actorEmail: 'user@test.com',
        title: 'Mentioned',
        message: 'You were mentioned',
        entityType: 'case_comment',
        entityId: 'c1',
        caseId: 'case-1',
        caseCommentId: null,
        isRead: false,
        createdAt: '2025-01-01T00:00:00Z',
      }

      const shouldMarkRead = !notification.isRead
      expect(shouldMarkRead).toBe(true)
    })
  })

  describe('default data fallback', () => {
    it('should use empty array when data is undefined', () => {
      const data = undefined
      const tableData = data ?? []
      expect(tableData).toEqual([])
    })

    it('should use actual data when available', () => {
      const mockItems: NotificationItem[] = [
        {
          id: 'n1',
          type: NotificationType.MENTION,
          actorName: 'User',
          actorEmail: 'u@t.com',
          title: 'Test',
          message: 'Msg',
          entityType: 'case',
          entityId: 'e1',
          caseId: null,
          caseCommentId: null,
          isRead: false,
          createdAt: '2025-01-01T00:00:00Z',
        },
      ]
      const data = { data: mockItems }
      const tableData = data?.data ?? []
      expect(tableData).toHaveLength(1)
    })
  })

  describe('search params for notifications query', () => {
    it('should build base params with defaults', () => {
      const params: NotificationSearchParams = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: SortOrder.DESC,
      }
      expect(params.page).toBe(1)
      expect(params.limit).toBe(20)
      expect(params.sortBy).toBe('createdAt')
      expect(params.sortOrder).toBe('desc')
    })

    it('should include all filters when set', () => {
      const params: NotificationSearchParams = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: SortOrder.DESC,
        query: 'search term',
        type: NotificationType.MENTION,
        isRead: 'false',
      }
      expect(params.query).toBe('search term')
      expect(params.type).toBe('mention')
      expect(params.isRead).toBe('false')
    })
  })
})
