import {
  NOTIFICATION_PREFERENCE_BY_TYPE,
  NOTIFICATION_SORT_FIELDS,
  NOTIFICATION_TITLE_BY_TYPE,
} from './notifications.constants'
import {
  NotificationPreferenceField,
  NotificationReadFilter,
  NotificationTitle,
} from './notifications.enums'
import { nowDate } from '../../common/utils/date-time.utility'
import { buildOrderBy } from '../../common/utils/query.utility'
import type {
  NotificationActorRecord,
  NotificationActorMap,
  NotificationListFilters,
  NotificationPreferenceSelect,
  NotificationResponse,
  NotificationRow,
} from './notifications.types'
import type { NotificationEntityType, NotificationType } from '../../common/enums'
import type { Prisma } from '@prisma/client'

export function getNotificationTitle(type: NotificationType): string {
  return NOTIFICATION_TITLE_BY_TYPE.get(type) ?? NotificationTitle.MENTION
}

export function mapNotificationToResponse(
  n: NotificationRow,
  actorMap: NotificationActorMap
): NotificationResponse {
  const actor = n.actorUserId ? actorMap.get(n.actorUserId) : undefined
  return {
    id: n.id,
    type: n.type as NotificationType,
    actorName: actor?.name ?? 'Unknown',
    actorEmail: actor?.email ?? '',
    title: n.title,
    message: n.message,
    entityType: n.entityType as NotificationEntityType,
    entityId: n.entityId,
    caseId: n.caseId,
    caseCommentId: n.caseCommentId,
    isRead: n.readAt !== null,
    createdAt: n.createdAt,
  }
}

export function buildActorMap(actors: NotificationActorRecord[]): NotificationActorMap {
  return new Map(actors.map(a => [a.id, { name: a.name, email: a.email }]))
}

/* ---------------------------------------------------------------- */
/* NOTIFICATION PAYLOAD                                              */
/* ---------------------------------------------------------------- */

export function buildNotificationPayload(
  id: string,
  type: NotificationType,
  actorName: string,
  actorEmail: string,
  title: string,
  message: string,
  entityType: NotificationEntityType,
  entityId: string,
  caseId: string | null,
  caseCommentId: string | null
): NotificationResponse {
  return {
    id,
    type,
    actorName,
    actorEmail,
    title,
    message,
    entityType,
    entityId,
    caseId,
    caseCommentId,
    isRead: false,
    createdAt: nowDate(),
  }
}

/* ---------------------------------------------------------------- */
/* NOTIFICATION LIST QUERY BUILDERS                                  */
/* ---------------------------------------------------------------- */

export function buildNotificationWhereClause(
  tenantId: string,
  recipientUserId: string,
  filters: NotificationListFilters
): Prisma.NotificationWhereInput {
  const where: Prisma.NotificationWhereInput = { tenantId, recipientUserId }

  if (filters.type) {
    where.type = filters.type as NotificationType
  }

  if (filters.isRead === NotificationReadFilter.READ) {
    where.readAt = { not: null }
  } else if (filters.isRead === NotificationReadFilter.UNREAD) {
    where.readAt = null
  }

  if (filters.query && filters.query.trim().length > 0) {
    where.OR = [
      { title: { contains: filters.query, mode: 'insensitive' } },
      { message: { contains: filters.query, mode: 'insensitive' } },
    ]
  }

  return where
}

export function buildNotificationOrderBy(
  sortBy?: string,
  sortOrder?: string
): Prisma.NotificationOrderByWithRelationInput {
  return buildOrderBy(NOTIFICATION_SORT_FIELDS, 'createdAt', sortBy, sortOrder)
}

/**
 * Checks whether a notification should be sent based on user preferences.
 * Returns `true` if the notification is allowed, `false` if suppressed.
 *
 * When no preferences exist (new user, no row yet), defaults to allowing notifications.
 */
export function isNotificationAllowedByPreference(
  preferences: NotificationPreferenceSelect | null,
  notificationType: NotificationType
): boolean {
  // No preference record means defaults apply (all enabled)
  if (preferences === null) return true

  // Global in-app toggle must be enabled
  if (!preferences.notificationsInApp) return false

  // Check category-specific preference
  const preferenceField = NOTIFICATION_PREFERENCE_BY_TYPE.get(notificationType)
  if (preferenceField === undefined) return true

  switch (preferenceField) {
    case NotificationPreferenceField.CASE_ASSIGNMENTS:
      return preferences.notifyCaseAssignments
    case NotificationPreferenceField.CASE_COMMENTS:
      return preferences.notifyCaseComments
    case NotificationPreferenceField.CASE_ACTIVITY:
      return preferences.notifyCaseActivity
    case NotificationPreferenceField.CASE_UPDATES:
      return preferences.notifyCaseUpdates
    case NotificationPreferenceField.USER_MANAGEMENT:
      return preferences.notifyUserManagement
    default:
      return true
  }
}
