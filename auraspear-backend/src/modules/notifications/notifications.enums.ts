export enum PermissionUpdateReason {
  ROLE_UPDATED = 'role-updated',
  ROLE_MATRIX_UPDATED = 'role-matrix-updated',
  MEMBERSHIP_STATUS_UPDATED = 'membership-status-updated',
}

export enum NotificationSortField {
  TYPE = 'type',
  TITLE = 'title',
  IS_READ = 'isRead',
}

export enum NotificationReadFilter {
  READ = 'true',
  UNREAD = 'false',
}

export enum NotificationPreferenceField {
  CASE_ASSIGNMENTS = 'notifyCaseAssignments',
  CASE_COMMENTS = 'notifyCaseComments',
  CASE_ACTIVITY = 'notifyCaseActivity',
  CASE_UPDATES = 'notifyCaseUpdates',
  USER_MANAGEMENT = 'notifyUserManagement',
}

export enum NotificationTitle {
  CASE_ASSIGNED = 'Case Assigned',
  CASE_UNASSIGNED = 'Case Unassigned',
  CASE_COMMENT_ADDED = 'Comment Added',
  CASE_TASK_ADDED = 'Task Added',
  CASE_ARTIFACT_ADDED = 'Artifact Added',
  CASE_STATUS_CHANGED = 'Status Changed',
  CASE_UPDATED = 'Case Updated',
  MENTION = 'Mentioned in Comment',
  TENANT_ASSIGNED = 'Added to Tenant',
  ROLE_CHANGED = 'Role Changed',
  USER_BLOCKED = 'Account Suspended',
  USER_UNBLOCKED = 'Account Reactivated',
  USER_REMOVED = 'Removed from Tenant',
  USER_RESTORED = 'Account Restored',
}

export enum NotificationSocketAuthField {
  TOKEN = 'token',
  TENANT_ID = 'tenantId',
}

export enum NotificationSocketDataKey {
  USER = 'user',
  TENANT_ID = 'tenantId',
}

export enum NotificationGatewayEvent {
  NOTIFICATION = 'notification',
  UNREAD_COUNT = 'unread-count',
  PERMISSIONS_UPDATED = 'permissions-updated',
}

export enum NotificationGatewayNamespace {
  NOTIFICATIONS = '/notifications',
}

export enum NotificationAuthorizationPrefix {
  BEARER = 'Bearer ',
}
