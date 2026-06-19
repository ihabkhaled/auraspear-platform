import { describe, expect, it } from 'vitest'
import type { NotificationItem, RecentActivityItem } from '@/types'

/**
 * Tests for the dashboard Recent Activity transformation.
 *
 * The hook now reads from the live notifications feed and maps those records
 * into the smaller RecentActivityItem shape used by the dashboard card.
 */

const DASHBOARD_ACTIVITY_LIMIT = 5

function transformActivityData(rawItems: unknown): RecentActivityItem[] {
  if (!Array.isArray(rawItems)) {
    return []
  }

  return rawItems.slice(0, DASHBOARD_ACTIVITY_LIMIT).map(item => ({
    id: item.id,
    type: item.type,
    actorName: item.actorName,
    title: item.title,
    message: item.message,
    createdAt: item.createdAt,
    isRead: item.isRead,
  }))
}

function makeMockNotification(
  overrides: Partial<NotificationItem> & { id: string }
): NotificationItem {
  return {
    type: 'mention',
    actorName: 'John Doe',
    actorEmail: 'john@example.com',
    title: 'Test title',
    message: 'Test message',
    entityType: 'case',
    entityId: 'case-1',
    caseId: 'case-1',
    caseCommentId: null,
    isRead: false,
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('useRecentActivityFeed data transformation', () => {
  it('should return empty array when data is undefined', () => {
    const result = transformActivityData(undefined)
    expect(result).toEqual([])
  })

  it('should return empty array when data is null', () => {
    const result = transformActivityData(null)
    expect(result).toEqual([])
  })

  it('should return empty array when data is not an array', () => {
    const result = transformActivityData('not an array')
    expect(result).toEqual([])
  })

  it('should return empty array when data is an empty array', () => {
    const result = transformActivityData([])
    expect(result).toEqual([])
  })

  it('should map notifications into recent activity items', () => {
    const raw = [
      {
        id: '1',
        type: 'mention',
        actorName: 'Alice',
        actorEmail: 'alice@example.com',
        title: 'Title 1',
        message: 'Msg 1',
        entityType: 'case',
        entityId: 'case-1',
        caseId: 'case-1',
        caseCommentId: null,
        createdAt: '2025-01-01T00:00:00Z',
        isRead: false,
        extraField: 'should be excluded',
      },
    ]

    const result = transformActivityData(raw)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      id: '1',
      type: 'mention',
      actorName: 'Alice',
      title: 'Title 1',
      message: 'Msg 1',
      createdAt: '2025-01-01T00:00:00Z',
      isRead: false,
    })
  })

  it('should exclude notification-only fields from dashboard items', () => {
    const raw = [
      makeMockNotification({
        id: '1',
        actorEmail: 'alice@example.com',
        entityType: 'case',
        entityId: '123',
        caseId: 'case-123',
      }),
    ]

    const result = transformActivityData(raw)

    expect(result[0]).not.toHaveProperty('entityType')
    expect(result[0]).not.toHaveProperty('entityId')
    expect(result[0]).not.toHaveProperty('actorEmail')
    expect(result[0]).not.toHaveProperty('caseId')
  })

  it('should limit items to 5', () => {
    const raw = Array.from({ length: 10 }, (_, idx) =>
      makeMockNotification({ id: String(idx + 1) })
    )

    const result = transformActivityData(raw)

    expect(result).toHaveLength(5)
  })

  it('should return fewer than 5 items when data has fewer', () => {
    const raw = [
      makeMockNotification({ id: '1' }),
      makeMockNotification({ id: '2' }),
      makeMockNotification({ id: '3' }),
    ]

    const result = transformActivityData(raw)

    expect(result).toHaveLength(3)
  })

  it('should take first 5 items preserving order', () => {
    const raw = Array.from({ length: 8 }, (_, idx) =>
      makeMockNotification({ id: String(idx + 1), title: `Item ${idx + 1}` })
    )

    const result = transformActivityData(raw)

    expect(result.map(item => item.id)).toEqual(['1', '2', '3', '4', '5'])
  })

  it('should preserve isRead boolean value', () => {
    const raw = [
      makeMockNotification({ id: '1', isRead: true }),
      makeMockNotification({ id: '2', isRead: false }),
    ]

    const result = transformActivityData(raw)

    expect(result[0]?.isRead).toBe(true)
    expect(result[1]?.isRead).toBe(false)
  })
})
