import { describe, it, expect, vi } from 'vitest'
import { NotificationType } from '@/enums'
import { getNotificationIcon, getNotificationIconColor } from '@/lib/notification.utils'

vi.mock('lucide-react', () => ({
  Bell: 'Bell',
  Building2: 'Building2',
  ClipboardList: 'ClipboardList',
  FileText: 'FileText',
  MessageSquare: 'MessageSquare',
  Pencil: 'Pencil',
  Shield: 'Shield',
  ShieldOff: 'ShieldOff',
  ArrowRightLeft: 'ArrowRightLeft',
  UserCheck: 'UserCheck',
  UserMinus: 'UserMinus',
  UserPlus: 'UserPlus',
  UserX: 'UserX',
}))

describe('getNotificationIcon', () => {
  it('should return a defined value for each NotificationType', () => {
    for (const type of Object.values(NotificationType)) {
      const icon = getNotificationIcon(type)
      expect(icon).toBeDefined()
    }
  })

  it('should return a default icon for unknown type', () => {
    const icon = getNotificationIcon('unknown_type')
    expect(icon).toBeDefined()
  })

  it('should return an icon for MENTION type', () => {
    const icon = getNotificationIcon(NotificationType.MENTION)
    expect(icon).toBeDefined()
  })

  it('should return an icon for CASE_ASSIGNED type', () => {
    const icon = getNotificationIcon(NotificationType.CASE_ASSIGNED)
    expect(icon).toBeDefined()
  })
})

describe('getNotificationIconColor', () => {
  it('should return destructive classes for USER_BLOCKED', () => {
    const color = getNotificationIconColor(NotificationType.USER_BLOCKED)
    expect(color).toContain('destructive')
  })

  it('should return destructive classes for USER_REMOVED', () => {
    const color = getNotificationIconColor(NotificationType.USER_REMOVED)
    expect(color).toContain('destructive')
  })

  it('should return success classes for USER_UNBLOCKED', () => {
    const color = getNotificationIconColor(NotificationType.USER_UNBLOCKED)
    expect(color).toContain('status-success')
  })

  it('should return success classes for USER_RESTORED', () => {
    const color = getNotificationIconColor(NotificationType.USER_RESTORED)
    expect(color).toContain('status-success')
  })

  it('should return success classes for CASE_ASSIGNED', () => {
    const color = getNotificationIconColor(NotificationType.CASE_ASSIGNED)
    expect(color).toContain('status-success')
  })

  it('should return warning classes for CASE_STATUS_CHANGED', () => {
    const color = getNotificationIconColor(NotificationType.CASE_STATUS_CHANGED)
    expect(color).toContain('status-warning')
  })

  it('should return warning classes for CASE_UNASSIGNED', () => {
    const color = getNotificationIconColor(NotificationType.CASE_UNASSIGNED)
    expect(color).toContain('status-warning')
  })

  it('should return warning classes for ROLE_CHANGED', () => {
    const color = getNotificationIconColor(NotificationType.ROLE_CHANGED)
    expect(color).toContain('status-warning')
  })

  it('should return info classes for TENANT_ASSIGNED', () => {
    const color = getNotificationIconColor(NotificationType.TENANT_ASSIGNED)
    expect(color).toContain('status-info')
  })

  it('should return info classes for CASE_COMMENT_ADDED', () => {
    const color = getNotificationIconColor(NotificationType.CASE_COMMENT_ADDED)
    expect(color).toContain('status-info')
  })

  it('should return info classes for CASE_TASK_ADDED', () => {
    const color = getNotificationIconColor(NotificationType.CASE_TASK_ADDED)
    expect(color).toContain('status-info')
  })

  it('should return info classes for CASE_ARTIFACT_ADDED', () => {
    const color = getNotificationIconColor(NotificationType.CASE_ARTIFACT_ADDED)
    expect(color).toContain('status-info')
  })

  it('should return info classes for CASE_UPDATED', () => {
    const color = getNotificationIconColor(NotificationType.CASE_UPDATED)
    expect(color).toContain('status-info')
  })

  it('should return primary classes for MENTION', () => {
    const color = getNotificationIconColor(NotificationType.MENTION)
    expect(color).toContain('primary')
  })

  it('should return primary classes for unknown type', () => {
    const color = getNotificationIconColor('unknown_type')
    expect(color).toContain('primary')
  })

  it('should return string value for every NotificationType', () => {
    for (const type of Object.values(NotificationType)) {
      const color = getNotificationIconColor(type)
      expect(typeof color).toBe('string')
      expect(color.length).toBeGreaterThan(0)
    }
  })
})
