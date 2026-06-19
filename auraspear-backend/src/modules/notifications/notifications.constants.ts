import {
  NotificationPreferenceField,
  NotificationSortField,
  NotificationTitle,
} from './notifications.enums'
import { NotificationType } from '../../common/enums'

export const NOTIFICATION_SORT_FIELDS: Record<string, string> = {
  [NotificationSortField.TYPE]: 'type',
  [NotificationSortField.TITLE]: 'title',
  [NotificationSortField.IS_READ]: 'readAt',
  createdAt: 'createdAt',
}

export const NOTIFICATION_TITLE_BY_TYPE = new Map<NotificationType, NotificationTitle>([
  [NotificationType.CASE_ASSIGNED, NotificationTitle.CASE_ASSIGNED],
  [NotificationType.CASE_UNASSIGNED, NotificationTitle.CASE_UNASSIGNED],
  [NotificationType.CASE_COMMENT_ADDED, NotificationTitle.CASE_COMMENT_ADDED],
  [NotificationType.CASE_TASK_ADDED, NotificationTitle.CASE_TASK_ADDED],
  [NotificationType.CASE_ARTIFACT_ADDED, NotificationTitle.CASE_ARTIFACT_ADDED],
  [NotificationType.CASE_STATUS_CHANGED, NotificationTitle.CASE_STATUS_CHANGED],
  [NotificationType.CASE_UPDATED, NotificationTitle.CASE_UPDATED],
  [NotificationType.MENTION, NotificationTitle.MENTION],
  [NotificationType.TENANT_ASSIGNED, NotificationTitle.TENANT_ASSIGNED],
  [NotificationType.ROLE_CHANGED, NotificationTitle.ROLE_CHANGED],
  [NotificationType.USER_BLOCKED, NotificationTitle.USER_BLOCKED],
  [NotificationType.USER_UNBLOCKED, NotificationTitle.USER_UNBLOCKED],
  [NotificationType.USER_REMOVED, NotificationTitle.USER_REMOVED],
  [NotificationType.USER_RESTORED, NotificationTitle.USER_RESTORED],
])

export const NOTIFICATION_PREFERENCE_BY_TYPE = new Map<
  NotificationType,
  NotificationPreferenceField
>([
  [NotificationType.CASE_ASSIGNED, NotificationPreferenceField.CASE_ASSIGNMENTS],
  [NotificationType.CASE_UNASSIGNED, NotificationPreferenceField.CASE_ASSIGNMENTS],
  [NotificationType.CASE_COMMENT_ADDED, NotificationPreferenceField.CASE_COMMENTS],
  [NotificationType.CASE_TASK_ADDED, NotificationPreferenceField.CASE_ACTIVITY],
  [NotificationType.CASE_ARTIFACT_ADDED, NotificationPreferenceField.CASE_ACTIVITY],
  [NotificationType.CASE_STATUS_CHANGED, NotificationPreferenceField.CASE_ACTIVITY],
  [NotificationType.CASE_UPDATED, NotificationPreferenceField.CASE_UPDATES],
  [NotificationType.MENTION, NotificationPreferenceField.CASE_COMMENTS],
  [NotificationType.TENANT_ASSIGNED, NotificationPreferenceField.USER_MANAGEMENT],
  [NotificationType.ROLE_CHANGED, NotificationPreferenceField.USER_MANAGEMENT],
  [NotificationType.USER_BLOCKED, NotificationPreferenceField.USER_MANAGEMENT],
  [NotificationType.USER_UNBLOCKED, NotificationPreferenceField.USER_MANAGEMENT],
  [NotificationType.USER_REMOVED, NotificationPreferenceField.USER_MANAGEMENT],
  [NotificationType.USER_RESTORED, NotificationPreferenceField.USER_MANAGEMENT],
])
