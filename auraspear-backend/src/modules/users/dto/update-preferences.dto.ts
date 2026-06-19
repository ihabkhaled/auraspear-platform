import { z } from 'zod'
import {
  DashboardDensity,
  DashboardPanelKey,
  SupportedLanguage,
  Theme,
} from '../../../common/enums'

const VALID_RETENTION_VALUES = ['30', '90', '180', '365', 'unlimited'] as const

export const UpdatePreferencesSchema = z.object({
  theme: z.nativeEnum(Theme).optional(),
  language: z.nativeEnum(SupportedLanguage).optional(),
  dashboardDensity: z.nativeEnum(DashboardDensity).optional(),
  collapsedDashboardPanels: z.array(z.nativeEnum(DashboardPanelKey)).max(32).optional(),
  notificationsEmail: z.boolean().optional(),
  notificationsInApp: z.boolean().optional(),
  // Notification category preferences
  notifyCriticalAlerts: z.boolean().optional(),
  notifyHighAlerts: z.boolean().optional(),
  notifyCaseAssignments: z.boolean().optional(),
  notifyIncidentUpdates: z.boolean().optional(),
  notifyComplianceAlerts: z.boolean().optional(),
  notifyCaseUpdates: z.boolean().optional(),
  notifyCaseComments: z.boolean().optional(),
  notifyCaseActivity: z.boolean().optional(),
  notifyUserManagement: z.boolean().optional(),
  // Data retention preferences
  retentionAlerts: z.enum(VALID_RETENTION_VALUES).optional(),
  retentionLogs: z.enum(VALID_RETENTION_VALUES).optional(),
  retentionIncidents: z.enum(VALID_RETENTION_VALUES).optional(),
  retentionAuditLogs: z.enum(VALID_RETENTION_VALUES).optional(),
})

export type UpdatePreferencesDto = z.infer<typeof UpdatePreferencesSchema>
