import type { NotificationCategory, RetentionPeriod } from '@/enums'

export interface NotificationPreference {
  category: NotificationCategory
  enabled: boolean
}

export interface DataRetentionConfig {
  alertRetention: RetentionPeriod
  logRetention: RetentionPeriod
  incidentRetention: RetentionPeriod
  auditLogRetention: RetentionPeriod
}

export interface ExportedSettingsRetention {
  alertRetention: string
  logRetention: string
  incidentRetention: string
  auditLogRetention: string
}

export interface ExportedSettings {
  notificationPreferences: Record<NotificationCategory, boolean>
  dataRetention: ExportedSettingsRetention
  theme: string
  language: string
  exportedAt: string
}
