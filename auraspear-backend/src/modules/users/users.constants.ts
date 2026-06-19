import { DashboardDensity, DashboardPanelKey } from '../../common/enums'

export const BCRYPT_SALT_ROUNDS = 12

export const DEFAULT_PREFERENCES = {
  theme: 'system',
  language: 'en',
  dashboardDensity: DashboardDensity.COMFORTABLE,
  collapsedDashboardPanels: [DashboardPanelKey.MITRE_TECHNIQUES, DashboardPanelKey.TARGETED_ASSETS],
  notificationsEmail: true,
  notificationsInApp: true,
  notifyCriticalAlerts: true,
  notifyHighAlerts: true,
  notifyCaseAssignments: true,
  notifyIncidentUpdates: true,
  notifyComplianceAlerts: true,
  notifyCaseUpdates: true,
  notifyCaseComments: true,
  notifyCaseActivity: true,
  notifyUserManagement: true,
  retentionAlerts: '90',
  retentionLogs: '90',
  retentionIncidents: '365',
  retentionAuditLogs: '365',
}

export const PREFERENCE_FIELD_KEYS: ReadonlyArray<keyof typeof DEFAULT_PREFERENCES> = [
  'theme',
  'language',
  'dashboardDensity',
  'collapsedDashboardPanels',
  'notificationsEmail',
  'notificationsInApp',
  'notifyCriticalAlerts',
  'notifyHighAlerts',
  'notifyCaseAssignments',
  'notifyIncidentUpdates',
  'notifyComplianceAlerts',
  'notifyCaseUpdates',
  'notifyCaseComments',
  'notifyCaseActivity',
  'notifyUserManagement',
  'retentionAlerts',
  'retentionLogs',
  'retentionIncidents',
  'retentionAuditLogs',
]
