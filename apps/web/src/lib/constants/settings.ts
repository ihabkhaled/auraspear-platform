import { RetentionPeriod } from '@/enums'
import type { NotificationCategory } from '@/enums'
import type { DataRetentionConfig } from '@/types'

export const RETENTION_FIELDS: Array<{
  key: keyof DataRetentionConfig
  labelKey: string
  descriptionKey: string
}> = [
  {
    key: 'alertRetention',
    labelKey: 'alertRetention',
    descriptionKey: 'alertRetentionDescription',
  },
  {
    key: 'logRetention',
    labelKey: 'logRetention',
    descriptionKey: 'logRetentionDescription',
  },
  {
    key: 'incidentRetention',
    labelKey: 'incidentRetention',
    descriptionKey: 'incidentRetentionDescription',
  },
  {
    key: 'auditLogRetention',
    labelKey: 'auditLogRetention',
    descriptionKey: 'auditLogRetentionDescription',
  },
]

export const CATEGORY_LABEL_KEYS: Record<NotificationCategory, string> = {
  criticalAlerts: 'criticalAlerts',
  highAlerts: 'highAlerts',
  caseAssignments: 'caseAssignments',
  caseUpdates: 'caseUpdates',
  caseComments: 'caseComments',
  caseActivity: 'caseActivity',
  incidentUpdates: 'incidentUpdates',
  complianceAlerts: 'complianceAlerts',
  userManagement: 'userManagement',
}

export const CATEGORY_DESCRIPTION_KEYS: Record<NotificationCategory, string> = {
  criticalAlerts: 'criticalAlertsDescription',
  highAlerts: 'highAlertsDescription',
  caseAssignments: 'caseAssignmentsDescription',
  caseUpdates: 'caseUpdatesDescription',
  caseComments: 'caseCommentsDescription',
  caseActivity: 'caseActivityDescription',
  incidentUpdates: 'incidentUpdatesDescription',
  complianceAlerts: 'complianceAlertsDescription',
  userManagement: 'userManagementDescription',
}

export const PROFILE_KEY = ['profile'] as const

export const PREFERENCES_BASE_KEY = 'preferences'

export const RETENTION_OPTIONS = [
  RetentionPeriod.DAYS_30,
  RetentionPeriod.DAYS_90,
  RetentionPeriod.DAYS_180,
  RetentionPeriod.DAYS_365,
  RetentionPeriod.UNLIMITED,
] as const

export const DEFAULT_RETENTION: DataRetentionConfig = {
  alertRetention: RetentionPeriod.DAYS_90,
  logRetention: RetentionPeriod.DAYS_90,
  incidentRetention: RetentionPeriod.DAYS_365,
  auditLogRetention: RetentionPeriod.DAYS_365,
}

export const RETENTION_KEY_TO_PREF: Record<keyof DataRetentionConfig, string> = {
  alertRetention: 'retentionAlerts',
  logRetention: 'retentionLogs',
  incidentRetention: 'retentionIncidents',
  auditLogRetention: 'retentionAuditLogs',
}
