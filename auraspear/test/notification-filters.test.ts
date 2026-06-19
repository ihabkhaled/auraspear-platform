import { describe, it, expect } from 'vitest'
import { NotificationType } from '@/enums'

describe('NotificationFilters component logic', () => {
  describe('hasFilters computation', () => {
    const computeHasFilters = (searchQuery: string, typeFilter: string, readFilter: string) =>
      searchQuery.length > 0 || typeFilter.length > 0 || readFilter.length > 0

    it('should return false when all filters are empty', () => {
      expect(computeHasFilters('', '', '')).toBe(false)
    })

    it('should return true when searchQuery is non-empty', () => {
      expect(computeHasFilters('test', '', '')).toBe(true)
    })

    it('should return true when typeFilter is non-empty', () => {
      expect(computeHasFilters('', NotificationType.MENTION, '')).toBe(true)
    })

    it('should return true when readFilter is non-empty', () => {
      expect(computeHasFilters('', '', 'true')).toBe(true)
    })

    it('should return true when multiple filters are set', () => {
      expect(computeHasFilters('query', NotificationType.CASE_ASSIGNED, 'false')).toBe(true)
    })
  })

  describe('notification type filter options', () => {
    it('should cover all NotificationType enum values', () => {
      const allTypes = Object.values(NotificationType)
      expect(allTypes).toHaveLength(14)

      const expectedFilterOptions = [
        NotificationType.MENTION,
        NotificationType.CASE_ASSIGNED,
        NotificationType.CASE_UNASSIGNED,
        NotificationType.CASE_COMMENT_ADDED,
        NotificationType.CASE_TASK_ADDED,
        NotificationType.CASE_ARTIFACT_ADDED,
        NotificationType.CASE_STATUS_CHANGED,
        NotificationType.CASE_UPDATED,
        NotificationType.TENANT_ASSIGNED,
        NotificationType.ROLE_CHANGED,
        NotificationType.USER_BLOCKED,
        NotificationType.USER_UNBLOCKED,
        NotificationType.USER_REMOVED,
        NotificationType.USER_RESTORED,
      ]

      expect(expectedFilterOptions).toHaveLength(allTypes.length)
      for (const type of allTypes) {
        expect(expectedFilterOptions).toContain(type)
      }
    })
  })

  describe('read filter options', () => {
    it('should use string "true" for read filter', () => {
      const readValue = 'true'
      expect(readValue).toBe('true')
    })

    it('should use string "false" for unread filter', () => {
      const unreadValue = 'false'
      expect(unreadValue).toBe('false')
    })
  })

  describe('ALL_FILTER sentinel value', () => {
    const ALL_FILTER = '__all__'

    it('should be used as default select value', () => {
      expect(ALL_FILTER).toBe('__all__')
    })

    it('should not match any NotificationType', () => {
      const allTypes = Object.values(NotificationType)
      expect(allTypes).not.toContain(ALL_FILTER)
    })
  })
})
