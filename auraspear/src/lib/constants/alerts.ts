import {
  AlertSeverity,
  AlertStatus,
  AlertTimelineEventType,
  LucideIconName,
  StatusTextClass,
  TimeRange,
} from '@/enums'

export const ALERT_TIME_RANGES = [TimeRange.H24, TimeRange.D7, TimeRange.D30] as const

export const ALERT_STATUS_CLASSES: Record<AlertStatus, string> = {
  [AlertStatus.NEW_ALERT]: 'border-status-info text-status-info',
  [AlertStatus.ACKNOWLEDGED]: 'border-status-warning text-status-warning',
  [AlertStatus.IN_PROGRESS]: 'border-status-warning text-status-warning',
  [AlertStatus.RESOLVED]: 'border-status-success text-status-success',
  [AlertStatus.CLOSED]: 'border-muted-foreground text-muted-foreground',
  [AlertStatus.FALSE_POSITIVE]: 'border-muted-foreground text-muted-foreground',
}

export const ALERT_STATUS_LABEL_KEYS: Record<AlertStatus, string> = {
  [AlertStatus.NEW_ALERT]: 'statusNewAlert',
  [AlertStatus.ACKNOWLEDGED]: 'statusAcknowledged',
  [AlertStatus.IN_PROGRESS]: 'statusInProgress',
  [AlertStatus.RESOLVED]: 'statusResolved',
  [AlertStatus.CLOSED]: 'statusClosed',
  [AlertStatus.FALSE_POSITIVE]: 'statusFalsePositive',
}

export const VALID_TIME_RANGES = Object.values(TimeRange) as string[]
export const VALID_SEVERITIES = Object.values(AlertSeverity) as string[]

export const TIMELINE_EVENT_ICON_MAP: Record<AlertTimelineEventType, string> = {
  [AlertTimelineEventType.CREATED]: LucideIconName.PLUS_CIRCLE,
  [AlertTimelineEventType.ACKNOWLEDGED]: LucideIconName.CHECK_CIRCLE,
  [AlertTimelineEventType.IN_PROGRESS]: LucideIconName.LOADER,
  [AlertTimelineEventType.RESOLVED]: LucideIconName.CHECK_CIRCLE_2,
  [AlertTimelineEventType.CLOSED]: LucideIconName.X_CIRCLE,
  [AlertTimelineEventType.ESCALATED]: LucideIconName.ALERT_TRIANGLE,
  [AlertTimelineEventType.INVESTIGATED]: LucideIconName.SEARCH,
}

export const TIMELINE_EVENT_COLOR_MAP: Record<AlertTimelineEventType, string> = {
  [AlertTimelineEventType.CREATED]: StatusTextClass.INFO,
  [AlertTimelineEventType.ACKNOWLEDGED]: StatusTextClass.WARNING,
  [AlertTimelineEventType.IN_PROGRESS]: StatusTextClass.WARNING,
  [AlertTimelineEventType.RESOLVED]: StatusTextClass.SUCCESS,
  [AlertTimelineEventType.CLOSED]: StatusTextClass.SUCCESS,
  [AlertTimelineEventType.ESCALATED]: StatusTextClass.ERROR,
  [AlertTimelineEventType.INVESTIGATED]: StatusTextClass.INFO,
}

export const DEFAULT_TIMELINE_ICON = LucideIconName.CIRCLE
export const DEFAULT_TIMELINE_COLOR = StatusTextClass.MUTED
