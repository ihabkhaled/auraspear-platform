import type { NotificationEntityType, NotificationType } from '../../common/enums'
import type { PaginatedResponse } from '../../common/interfaces/pagination.interface'
import type { Case, Notification, Prisma, User, UserPreference } from '@prisma/client'

export interface NotificationResponse {
  id: string
  type: NotificationType
  actorName: string
  actorEmail: string
  title: string
  message: string
  entityType: NotificationEntityType
  entityId: string
  caseId: string | null
  caseCommentId: string | null
  isRead: boolean
  createdAt: Date
}

export type PaginatedNotifications = PaginatedResponse<NotificationResponse>

export type UserNameSelect = Pick<User, 'name'>
export type UserIdNameEmailSelect = Pick<User, 'id' | 'name' | 'email'>
export type CaseNumberSelect = Pick<Case, 'caseNumber'>

export type NotificationPreferenceSelect = Pick<
  UserPreference,
  | 'notificationsInApp'
  | 'notifyCaseAssignments'
  | 'notifyCaseComments'
  | 'notifyCaseActivity'
  | 'notifyCaseUpdates'
  | 'notifyUserManagement'
>

export type NotificationActorMap = Map<string, { name: string; email: string }>
export type NotificationActorRecord = UserIdNameEmailSelect
export type NotificationHandshakeAuth = Record<string, string>

export interface NotificationRow {
  id: string
  type: string
  actorUserId: string | null
  title: string
  message: string
  entityType: string
  entityId: string
  caseId: string | null
  caseCommentId: string | null
  readAt: Date | null
  createdAt: Date
}

export interface CreateNotificationParameters {
  tenantId: string
  type: NotificationType
  actorUserId: string
  actorEmail: string
  recipientUserId: string
  title: string
  message: string
  entityType: NotificationEntityType
  entityId: string
  caseId?: string | null
  caseCommentId?: string | null
}

export interface NotificationListFilters {
  query?: string
  type?: string
  isRead?: string
}

export interface NotificationFindManyParameters {
  where: Prisma.NotificationWhereInput
  orderBy: Prisma.NotificationOrderByWithRelationInput
  skip: number
  take: number
}

export type NotificationRecord = Notification
