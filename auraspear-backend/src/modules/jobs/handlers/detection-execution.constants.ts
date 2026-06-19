import type { AlertSeverity as PrismaAlertSeverity } from '@prisma/client'

export const DETECTION_SEVERITY_TO_ALERT_SEVERITY: Record<string, PrismaAlertSeverity> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info',
}

export const DETECTION_ALERT_SOURCE = 'detection_engine'
