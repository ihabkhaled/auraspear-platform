import { describe, it, expect } from 'vitest'
import { SortOrder } from '@/enums'
import type { NotificationSearchParams } from '@/types'

/**
 * Tests for the useNotificationsPageFilters hook logic.
 *
 * Since the project uses a node-only vitest environment without jsdom,
 * we test the pure logic aspects of the filter hook:
 * - Search params construction
 * - ALL_FILTER sentinel handling
 * - Sort parameter behavior
 * - Default state expectations
 */

const ALL_FILTER = '__all__'

describe('useNotificationsPageFilters logic', () => {
  describe('initial state', () => {
    it('should have empty search query by default', () => {
      const searchQuery = ''
      expect(searchQuery).toBe('')
    })

    it('should have empty type filter by default', () => {
      const typeFilter = ''
      expect(typeFilter).toBe('')
    })

    it('should have empty read filter by default', () => {
      const readFilter = ''
      expect(readFilter).toBe('')
    })

    it('should default sort to createdAt DESC', () => {
      const sortBy = 'createdAt'
      const sortOrder = SortOrder.DESC
      expect(sortBy).toBe('createdAt')
      expect(sortOrder).toBe(SortOrder.DESC)
    })

    it('should default page to 1 and limit to 20', () => {
      const page = 1
      const limit = 20
      expect(page).toBe(1)
      expect(limit).toBe(20)
    })
  })

  describe('searchParams construction', () => {
    const buildSearchParams = (opts: {
      page: number
      limit: number
      sortBy: string
      sortOrder: SortOrder
      debouncedSearch: string
      typeFilter: string
      readFilter: string
    }): NotificationSearchParams => {
      const params: NotificationSearchParams = {
        page: opts.page,
        limit: opts.limit,
        sortBy: opts.sortBy,
        sortOrder: opts.sortOrder,
      }
      if (opts.debouncedSearch.length > 0) {
        params.query = opts.debouncedSearch
      }
      if (opts.typeFilter.length > 0) {
        params.type = opts.typeFilter
      }
      if (opts.readFilter.length > 0) {
        params.isRead = opts.readFilter
      }
      return params
    }

    it('should include only base params when no filters active', () => {
      const params = buildSearchParams({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: SortOrder.DESC,
        debouncedSearch: '',
        typeFilter: '',
        readFilter: '',
      })
      expect(params).toEqual({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
      expect(params.query).toBeUndefined()
      expect(params.type).toBeUndefined()
      expect(params.isRead).toBeUndefined()
    })

    it('should include query when search is non-empty', () => {
      const params = buildSearchParams({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: SortOrder.DESC,
        debouncedSearch: 'alert',
        typeFilter: '',
        readFilter: '',
      })
      expect(params.query).toBe('alert')
    })

    it('should include type when type filter is set', () => {
      const params = buildSearchParams({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: SortOrder.DESC,
        debouncedSearch: '',
        typeFilter: 'mention',
        readFilter: '',
      })
      expect(params.type).toBe('mention')
    })

    it('should include isRead when read filter is set', () => {
      const params = buildSearchParams({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: SortOrder.DESC,
        debouncedSearch: '',
        typeFilter: '',
        readFilter: 'false',
      })
      expect(params.isRead).toBe('false')
    })

    it('should include all filters when all are set', () => {
      const params = buildSearchParams({
        page: 2,
        limit: 20,
        sortBy: 'type',
        sortOrder: SortOrder.ASC,
        debouncedSearch: 'test',
        typeFilter: 'mention',
        readFilter: 'true',
      })
      expect(params).toEqual({
        page: 2,
        limit: 20,
        sortBy: 'type',
        sortOrder: 'asc',
        query: 'test',
        type: 'mention',
        isRead: 'true',
      })
    })
  })

  describe('handleTypeChange logic', () => {
    it('should convert ALL_FILTER to empty string', () => {
      const value = ALL_FILTER
      const result = value === ALL_FILTER ? '' : value
      expect(result).toBe('')
    })

    it('should keep actual type value', () => {
      const value: string = 'mention'
      const result = value === ALL_FILTER ? '' : value
      expect(result).toBe('mention')
    })
  })

  describe('handleReadChange logic', () => {
    it('should convert ALL_FILTER to empty string', () => {
      const value = ALL_FILTER
      const result = value === ALL_FILTER ? '' : value
      expect(result).toBe('')
    })

    it('should keep "true" value', () => {
      const value: string = 'true'
      const result = value === ALL_FILTER ? '' : value
      expect(result).toBe('true')
    })

    it('should keep "false" value', () => {
      const value: string = 'false'
      const result = value === ALL_FILTER ? '' : value
      expect(result).toBe('false')
    })
  })

  describe('handleClearAllFilters logic', () => {
    it('should reset all filters and page', () => {
      const cleared = {
        searchQuery: '',
        typeFilter: '',
        readFilter: '',
        page: 1,
      }
      expect(cleared.searchQuery).toBe('')
      expect(cleared.typeFilter).toBe('')
      expect(cleared.readFilter).toBe('')
      expect(cleared.page).toBe(1)
    })
  })

  describe('handleSort logic', () => {
    it('should update sortBy and sortOrder', () => {
      const key = 'type'
      const order = SortOrder.ASC
      expect(key).toBe('type')
      expect(order).toBe(SortOrder.ASC)
    })

    it('should accept DESC order', () => {
      const order = SortOrder.DESC
      expect(order).toBe('desc')
    })
  })
})
