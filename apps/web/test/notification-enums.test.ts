import { describe, it, expect } from 'vitest'
import { NotificationType, NotificationEntityType } from '@/enums'

describe('NotificationType', () => {
  it('should have all expected notification types', () => {
    expect(NotificationType.MENTION).toBe('mention')
    expect(NotificationType.CASE_ASSIGNED).toBe('case_assigned')
    expect(NotificationType.CASE_UNASSIGNED).toBe('case_unassigned')
    expect(NotificationType.CASE_COMMENT_ADDED).toBe('case_comment_added')
    expect(NotificationType.CASE_TASK_ADDED).toBe('case_task_added')
    expect(NotificationType.CASE_ARTIFACT_ADDED).toBe('case_artifact_added')
    expect(NotificationType.CASE_STATUS_CHANGED).toBe('case_status_changed')
    expect(NotificationType.CASE_UPDATED).toBe('case_updated')
    expect(NotificationType.TENANT_ASSIGNED).toBe('tenant_assigned')
    expect(NotificationType.ROLE_CHANGED).toBe('role_changed')
    expect(NotificationType.USER_BLOCKED).toBe('user_blocked')
    expect(NotificationType.USER_UNBLOCKED).toBe('user_unblocked')
    expect(NotificationType.USER_REMOVED).toBe('user_removed')
    expect(NotificationType.USER_RESTORED).toBe('user_restored')
  })

  it('should contain exactly 14 notification types', () => {
    const values = Object.values(NotificationType)
    expect(values).toHaveLength(14)
  })

  it('should have unique values', () => {
    const values = Object.values(NotificationType)
    const uniqueValues = new Set(values)
    expect(uniqueValues.size).toBe(values.length)
  })
})

describe('NotificationEntityType', () => {
  it('should have all expected entity types', () => {
    expect(NotificationEntityType.CASE_COMMENT).toBe('case_comment')
    expect(NotificationEntityType.CASE).toBe('case')
    expect(NotificationEntityType.TENANT).toBe('tenant')
    expect(NotificationEntityType.USER).toBe('user')
  })

  it('should contain exactly 4 entity types', () => {
    const values = Object.values(NotificationEntityType)
    expect(values).toHaveLength(4)
  })
})
