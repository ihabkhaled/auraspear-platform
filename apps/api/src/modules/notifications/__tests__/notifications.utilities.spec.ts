import { NotificationEntityType, NotificationType } from '../../../common/enums'
import { toDay, nowMs } from '../../../common/utils/date-time.utility'
import {
  buildActorMap,
  buildNotificationOrderBy,
  buildNotificationPayload,
  buildNotificationWhereClause,
  isNotificationAllowedByPreference,
  mapNotificationToResponse,
} from '../notifications.utilities'

/* ---------------------------------------------------------------- */
/* mapNotificationToResponse                                         */
/* ---------------------------------------------------------------- */

describe('mapNotificationToResponse', () => {
  const baseRow = {
    id: 'n1',
    type: 'case_assigned',
    actorUserId: 'u1',
    title: 'Case Assigned',
    message: 'You were assigned',
    entityType: 'case',
    entityId: 'e1',
    caseId: 'c1',
    caseCommentId: null,
    readAt: null as Date | null,
    createdAt: toDay('2025-01-01T00:00:00.000Z').toDate(),
  }

  it('maps a notification row with a known actor', () => {
    const actorMap = new Map([['u1', { name: 'Alice', email: 'alice@example.com' }]])
    const result = mapNotificationToResponse(baseRow, actorMap)

    expect(result).toEqual({
      id: 'n1',
      type: 'case_assigned',
      actorName: 'Alice',
      actorEmail: 'alice@example.com',
      title: 'Case Assigned',
      message: 'You were assigned',
      entityType: 'case',
      entityId: 'e1',
      caseId: 'c1',
      caseCommentId: null,
      isRead: false,
      createdAt: baseRow.createdAt,
    })
  })

  it('returns "Unknown" actor name and empty email when actor is not in the map', () => {
    const actorMap = new Map<string, { name: string; email: string }>()
    const result = mapNotificationToResponse(baseRow, actorMap)

    expect(result.actorName).toBe('Unknown')
    expect(result.actorEmail).toBe('')
  })

  it('maps readAt non-null to isRead true', () => {
    const row = { ...baseRow, readAt: toDay('2025-01-02T00:00:00.000Z').toDate() }
    const actorMap = new Map([['u1', { name: 'Alice', email: 'alice@example.com' }]])
    const result = mapNotificationToResponse(row, actorMap)

    expect(result.isRead).toBe(true)
  })

  it('maps readAt null to isRead false', () => {
    const actorMap = new Map([['u1', { name: 'Alice', email: 'alice@example.com' }]])
    const result = mapNotificationToResponse(baseRow, actorMap)

    expect(result.isRead).toBe(false)
  })

  it('preserves caseCommentId when present', () => {
    const row = { ...baseRow, caseCommentId: 'cc1' }
    const actorMap = new Map([['u1', { name: 'Alice', email: 'a@b.com' }]])
    const result = mapNotificationToResponse(row, actorMap)

    expect(result.caseCommentId).toBe('cc1')
  })
})

/* ---------------------------------------------------------------- */
/* buildActorMap                                                      */
/* ---------------------------------------------------------------- */

describe('buildActorMap', () => {
  it('creates a Map from an actor array', () => {
    const actors = [
      { id: 'u1', name: 'Alice', email: 'alice@example.com' },
      { id: 'u2', name: 'Bob', email: 'bob@example.com' },
    ]
    const map = buildActorMap(actors)

    expect(map.size).toBe(2)
    expect(map.get('u1')).toEqual({ name: 'Alice', email: 'alice@example.com' })
    expect(map.get('u2')).toEqual({ name: 'Bob', email: 'bob@example.com' })
  })

  it('handles an empty array', () => {
    const map = buildActorMap([])

    expect(map.size).toBe(0)
  })

  it('overwrites duplicate actor IDs with the last entry', () => {
    const actors = [
      { id: 'u1', name: 'Alice', email: 'alice@example.com' },
      { id: 'u1', name: 'Alice Updated', email: 'alice2@example.com' },
    ]
    const map = buildActorMap(actors)

    expect(map.size).toBe(1)
    expect(map.get('u1')).toEqual({ name: 'Alice Updated', email: 'alice2@example.com' })
  })
})

/* ---------------------------------------------------------------- */
/* buildNotificationPayload                                          */
/* ---------------------------------------------------------------- */

describe('buildNotificationPayload', () => {
  it('returns the correct shape with isRead=false', () => {
    const before = nowMs()
    const result = buildNotificationPayload(
      'id1',
      NotificationType.CASE_ASSIGNED,
      'Alice',
      'alice@example.com',
      'Case Assigned',
      'You were assigned',
      NotificationEntityType.CASE,
      'e1',
      'c1',
      null
    )
    const after = nowMs()

    expect(result.id).toBe('id1')
    expect(result.type).toBe(NotificationType.CASE_ASSIGNED)
    expect(result.actorName).toBe('Alice')
    expect(result.actorEmail).toBe('alice@example.com')
    expect(result.title).toBe('Case Assigned')
    expect(result.message).toBe('You were assigned')
    expect(result.entityType).toBe(NotificationEntityType.CASE)
    expect(result.entityId).toBe('e1')
    expect(result.caseId).toBe('c1')
    expect(result.caseCommentId).toBeNull()
    expect(result.isRead).toBe(false)
    expect(result.createdAt.getTime()).toBeGreaterThanOrEqual(before)
    expect(result.createdAt.getTime()).toBeLessThanOrEqual(after)
  })

  it('passes through caseCommentId when provided', () => {
    const result = buildNotificationPayload(
      'id2',
      NotificationType.MENTION,
      'Bob',
      'bob@b.com',
      'Mention',
      'Mentioned you',
      NotificationEntityType.CASE_COMMENT,
      'e2',
      'c2',
      'cc2'
    )

    expect(result.caseCommentId).toBe('cc2')
    expect(result.caseId).toBe('c2')
  })
})

/* ---------------------------------------------------------------- */
/* buildNotificationWhereClause                                      */
/* ---------------------------------------------------------------- */

describe('buildNotificationWhereClause', () => {
  const tenantId = 't1'
  const recipientUserId = 'u1'

  it('returns base clause with only tenantId and recipientUserId', () => {
    const where = buildNotificationWhereClause(tenantId, recipientUserId, {})

    expect(where).toEqual({ tenantId, recipientUserId })
  })

  it('adds type filter when type is provided', () => {
    const where = buildNotificationWhereClause(tenantId, recipientUserId, {
      type: 'case_assigned',
    })

    expect(where.type).toBe('case_assigned')
  })

  it('sets readAt not null when isRead is "true"', () => {
    const where = buildNotificationWhereClause(tenantId, recipientUserId, { isRead: 'true' })

    expect(where.readAt).toEqual({ not: null })
  })

  it('sets readAt null when isRead is "false"', () => {
    const where = buildNotificationWhereClause(tenantId, recipientUserId, { isRead: 'false' })

    expect(where.readAt).toBeNull()
  })

  it('adds OR clause for title and message when query is provided', () => {
    const where = buildNotificationWhereClause(tenantId, recipientUserId, {
      query: 'search term',
    })

    expect(where.OR).toEqual([
      { title: { contains: 'search term', mode: 'insensitive' } },
      { message: { contains: 'search term', mode: 'insensitive' } },
    ])
  })

  it('does not add OR clause when query is empty string', () => {
    const where = buildNotificationWhereClause(tenantId, recipientUserId, { query: '' })

    expect(where.OR).toBeUndefined()
  })

  it('does not add OR clause when query is whitespace only', () => {
    const where = buildNotificationWhereClause(tenantId, recipientUserId, { query: '   ' })

    expect(where.OR).toBeUndefined()
  })

  it('combines all filters together', () => {
    const where = buildNotificationWhereClause(tenantId, recipientUserId, {
      query: 'test',
      type: 'mention',
      isRead: 'true',
    })

    expect(where.tenantId).toBe(tenantId)
    expect(where.recipientUserId).toBe(recipientUserId)
    expect(where.type).toBe('mention')
    expect(where.readAt).toEqual({ not: null })
    expect(where.OR).toBeDefined()
  })
})

/* ---------------------------------------------------------------- */
/* buildNotificationOrderBy                                          */
/* ---------------------------------------------------------------- */

describe('buildNotificationOrderBy', () => {
  it('defaults to createdAt DESC when no args provided', () => {
    const orderBy = buildNotificationOrderBy()

    expect(orderBy).toEqual({ createdAt: 'desc' })
  })

  it('defaults to createdAt DESC for unknown sortBy', () => {
    const orderBy = buildNotificationOrderBy('unknown')

    expect(orderBy).toEqual({ createdAt: 'desc' })
  })

  it('sorts by type', () => {
    const orderBy = buildNotificationOrderBy('type', 'asc')

    expect(orderBy).toEqual({ type: 'asc' })
  })

  it('sorts by title', () => {
    const orderBy = buildNotificationOrderBy('title', 'desc')

    expect(orderBy).toEqual({ title: 'desc' })
  })

  it('maps isRead to readAt', () => {
    const orderBy = buildNotificationOrderBy('isRead', 'asc')

    expect(orderBy).toEqual({ readAt: 'asc' })
  })

  it('uses ASC when sortOrder is "asc"', () => {
    const orderBy = buildNotificationOrderBy('createdAt', 'asc')

    expect(orderBy).toEqual({ createdAt: 'asc' })
  })

  it('uses DESC when sortOrder is not "asc"', () => {
    const orderBy = buildNotificationOrderBy('createdAt', 'invalid')

    expect(orderBy).toEqual({ createdAt: 'desc' })
  })
})

/* ---------------------------------------------------------------- */
/* isNotificationAllowedByPreference                                 */
/* ---------------------------------------------------------------- */

describe('isNotificationAllowedByPreference', () => {
  const allEnabledPrefs = {
    notificationsInApp: true,
    notifyCaseAssignments: true,
    notifyCaseComments: true,
    notifyCaseActivity: true,
    notifyCaseUpdates: true,
    notifyUserManagement: true,
  }

  it('returns true when preferences are null (defaults apply)', () => {
    expect(isNotificationAllowedByPreference(null, NotificationType.CASE_ASSIGNED)).toBe(true)
  })

  it('returns false when global in-app toggle is disabled', () => {
    const prefs = { ...allEnabledPrefs, notificationsInApp: false }
    expect(isNotificationAllowedByPreference(prefs, NotificationType.CASE_ASSIGNED)).toBe(false)
  })

  it('returns false when category-specific preference is disabled', () => {
    const prefs = { ...allEnabledPrefs, notifyCaseAssignments: false }
    expect(isNotificationAllowedByPreference(prefs, NotificationType.CASE_ASSIGNED)).toBe(false)
  })

  it('returns true when all preferences are enabled', () => {
    expect(isNotificationAllowedByPreference(allEnabledPrefs, NotificationType.CASE_ASSIGNED)).toBe(
      true
    )
  })

  it('maps MENTION to notifyCaseComments', () => {
    const prefs = { ...allEnabledPrefs, notifyCaseComments: false }
    expect(isNotificationAllowedByPreference(prefs, NotificationType.MENTION)).toBe(false)
  })

  it('maps CASE_TASK_ADDED to notifyCaseActivity', () => {
    const prefs = { ...allEnabledPrefs, notifyCaseActivity: false }
    expect(isNotificationAllowedByPreference(prefs, NotificationType.CASE_TASK_ADDED)).toBe(false)
  })

  it('maps CASE_UPDATED to notifyCaseUpdates', () => {
    const prefs = { ...allEnabledPrefs, notifyCaseUpdates: false }
    expect(isNotificationAllowedByPreference(prefs, NotificationType.CASE_UPDATED)).toBe(false)
  })

  it('maps TENANT_ASSIGNED to notifyUserManagement', () => {
    const prefs = { ...allEnabledPrefs, notifyUserManagement: false }
    expect(isNotificationAllowedByPreference(prefs, NotificationType.TENANT_ASSIGNED)).toBe(false)
  })
})
