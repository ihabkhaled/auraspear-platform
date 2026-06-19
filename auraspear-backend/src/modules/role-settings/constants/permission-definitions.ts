import { Permission } from '../../../common/enums/permission.enum'

/**
 * Seed data for the permission_definitions table.
 * Each entry defines a permission key, its module grouping,
 * the i18n label key, and display sort order.
 *
 * When adding a new module, add its permission definitions here
 * and run the seeder to populate the database.
 */
export interface PermissionDefinitionSeed {
  key: string
  module: string
  labelKey: string
  sortOrder: number
}

export const PERMISSION_DEFINITIONS: PermissionDefinitionSeed[] = [
  // ─── Alerts ───
  {
    key: Permission.ALERTS_VIEW,
    module: 'alerts',
    labelKey: 'roleSettings.permissions.alerts.view',
    sortOrder: 100,
  },
  {
    key: Permission.ALERTS_INVESTIGATE,
    module: 'alerts',
    labelKey: 'roleSettings.permissions.alerts.investigate',
    sortOrder: 101,
  },
  {
    key: Permission.ALERTS_ACKNOWLEDGE,
    module: 'alerts',
    labelKey: 'roleSettings.permissions.alerts.acknowledge',
    sortOrder: 102,
  },
  {
    key: Permission.ALERTS_CLOSE,
    module: 'alerts',
    labelKey: 'roleSettings.permissions.alerts.close',
    sortOrder: 103,
  },
  {
    key: Permission.ALERTS_ESCALATE,
    module: 'alerts',
    labelKey: 'roleSettings.permissions.alerts.escalate',
    sortOrder: 105,
  },

  // ─── Cases ───
  {
    key: Permission.CASES_VIEW,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.view',
    sortOrder: 200,
  },
  {
    key: Permission.CASES_CREATE,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.create',
    sortOrder: 201,
  },
  {
    key: Permission.CASES_UPDATE,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.update',
    sortOrder: 202,
  },
  {
    key: Permission.CASES_DELETE,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.delete',
    sortOrder: 203,
  },
  {
    key: Permission.CASES_ASSIGN,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.assign',
    sortOrder: 204,
  },
  {
    key: Permission.CASES_CHANGE_STATUS,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.changeStatus',
    sortOrder: 205,
  },
  {
    key: Permission.CASES_ADD_COMMENT,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.addComment',
    sortOrder: 206,
  },
  {
    key: Permission.CASES_DELETE_COMMENT,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.deleteComment',
    sortOrder: 207,
  },
  {
    key: Permission.CASES_ADD_TASK,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.addTask',
    sortOrder: 208,
  },
  {
    key: Permission.CASES_UPDATE_TASK,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.updateTask',
    sortOrder: 209,
  },
  {
    key: Permission.CASES_DELETE_TASK,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.deleteTask',
    sortOrder: 210,
  },
  {
    key: Permission.CASES_ADD_ARTIFACT,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.addArtifact',
    sortOrder: 211,
  },
  {
    key: Permission.CASES_DELETE_ARTIFACT,
    module: 'cases',
    labelKey: 'roleSettings.permissions.cases.deleteArtifact',
    sortOrder: 212,
  },

  // ─── Incidents ───
  {
    key: Permission.INCIDENTS_VIEW,
    module: 'incidents',
    labelKey: 'roleSettings.permissions.incidents.view',
    sortOrder: 300,
  },
  {
    key: Permission.INCIDENTS_CREATE,
    module: 'incidents',
    labelKey: 'roleSettings.permissions.incidents.create',
    sortOrder: 301,
  },
  {
    key: Permission.INCIDENTS_UPDATE,
    module: 'incidents',
    labelKey: 'roleSettings.permissions.incidents.update',
    sortOrder: 302,
  },
  {
    key: Permission.INCIDENTS_DELETE,
    module: 'incidents',
    labelKey: 'roleSettings.permissions.incidents.delete',
    sortOrder: 303,
  },
  {
    key: Permission.INCIDENTS_ADD_TIMELINE,
    module: 'incidents',
    labelKey: 'roleSettings.permissions.incidents.addTimeline',
    sortOrder: 304,
  },
  {
    key: Permission.INCIDENTS_CHANGE_STATUS,
    module: 'incidents',
    labelKey: 'roleSettings.permissions.incidents.changeStatus',
    sortOrder: 305,
  },

  // ─── Connectors ───
  {
    key: Permission.CONNECTORS_VIEW,
    module: 'connectors',
    labelKey: 'roleSettings.permissions.connectors.view',
    sortOrder: 400,
  },
  {
    key: Permission.CONNECTORS_CREATE,
    module: 'connectors',
    labelKey: 'roleSettings.permissions.connectors.create',
    sortOrder: 401,
  },
  {
    key: Permission.CONNECTORS_UPDATE,
    module: 'connectors',
    labelKey: 'roleSettings.permissions.connectors.update',
    sortOrder: 402,
  },
  {
    key: Permission.CONNECTORS_DELETE,
    module: 'connectors',
    labelKey: 'roleSettings.permissions.connectors.delete',
    sortOrder: 403,
  },
  {
    key: Permission.CONNECTORS_TEST,
    module: 'connectors',
    labelKey: 'roleSettings.permissions.connectors.test',
    sortOrder: 404,
  },
  {
    key: Permission.CONNECTORS_SYNC,
    module: 'connectors',
    labelKey: 'roleSettings.permissions.connectors.sync',
    sortOrder: 405,
  },
  {
    key: Permission.SYSTEM_HEALTH_VIEW,
    module: 'systemHealth',
    labelKey: 'roleSettings.permissions.systemHealth.view',
    sortOrder: 406,
  },

  // ─── LLM Connectors ───
  {
    key: Permission.LLM_CONNECTORS_VIEW,
    module: 'llmConnectors',
    labelKey: 'roleSettings.permissions.llmConnectors.view',
    sortOrder: 410,
  },
  {
    key: Permission.LLM_CONNECTORS_CREATE,
    module: 'llmConnectors',
    labelKey: 'roleSettings.permissions.llmConnectors.create',
    sortOrder: 411,
  },
  {
    key: Permission.LLM_CONNECTORS_UPDATE,
    module: 'llmConnectors',
    labelKey: 'roleSettings.permissions.llmConnectors.update',
    sortOrder: 412,
  },
  {
    key: Permission.LLM_CONNECTORS_DELETE,
    module: 'llmConnectors',
    labelKey: 'roleSettings.permissions.llmConnectors.delete',
    sortOrder: 413,
  },
  {
    key: Permission.LLM_CONNECTORS_TEST,
    module: 'llmConnectors',
    labelKey: 'roleSettings.permissions.llmConnectors.test',
    sortOrder: 414,
  },

  // ─── Entities ───
  {
    key: Permission.ENTITIES_VIEW,
    module: 'entities',
    labelKey: 'roleSettings.permissions.entities.view',
    sortOrder: 425,
  },
  {
    key: Permission.ENTITIES_CREATE,
    module: 'entities',
    labelKey: 'roleSettings.permissions.entities.create',
    sortOrder: 426,
  },
  {
    key: Permission.ENTITIES_UPDATE,
    module: 'entities',
    labelKey: 'roleSettings.permissions.entities.update',
    sortOrder: 427,
  },

  // ─── MSSP Dashboard ───
  {
    key: Permission.MSSP_DASHBOARD_VIEW,
    module: 'msspDashboard',
    labelKey: 'roleSettings.permissions.msspDashboard.view',
    sortOrder: 428,
  },

  // ─── Runbooks / Knowledge Base ───
  {
    key: Permission.RUNBOOKS_VIEW,
    module: 'runbooks',
    labelKey: 'roleSettings.permissions.runbooks.view',
    sortOrder: 420,
  },
  {
    key: Permission.RUNBOOKS_CREATE,
    module: 'runbooks',
    labelKey: 'roleSettings.permissions.runbooks.create',
    sortOrder: 421,
  },
  {
    key: Permission.RUNBOOKS_UPDATE,
    module: 'runbooks',
    labelKey: 'roleSettings.permissions.runbooks.update',
    sortOrder: 422,
  },
  {
    key: Permission.RUNBOOKS_DELETE,
    module: 'runbooks',
    labelKey: 'roleSettings.permissions.runbooks.delete',
    sortOrder: 423,
  },

  // ─── AI Alert Triage ───
  {
    key: Permission.AI_ALERT_TRIAGE,
    module: 'aiAlertTriage',
    labelKey: 'roleSettings.permissions.aiAlertTriage',
    sortOrder: 415,
  },

  // ─── AI Case Copilot ───
  {
    key: Permission.AI_CASE_COPILOT,
    module: 'aiCaseCopilot',
    labelKey: 'roleSettings.permissions.aiCaseCopilot',
    sortOrder: 416,
  },

  // ─── AI Detection Copilot ───
  {
    key: Permission.AI_DETECTION_COPILOT,
    module: 'aiDetectionCopilot',
    labelKey: 'roleSettings.permissions.aiDetectionCopilot',
    sortOrder: 417,
  },

  // ─── AI SOAR Copilot ───
  {
    key: Permission.AI_SOAR_COPILOT,
    module: 'aiSoarCopilot',
    labelKey: 'roleSettings.permissions.aiSoarCopilot',
    sortOrder: 418,
  },

  // ─── Correlation ───
  {
    key: Permission.CORRELATION_VIEW,
    module: 'correlation',
    labelKey: 'roleSettings.permissions.correlation.view',
    sortOrder: 500,
  },
  {
    key: Permission.CORRELATION_CREATE,
    module: 'correlation',
    labelKey: 'roleSettings.permissions.correlation.create',
    sortOrder: 501,
  },
  {
    key: Permission.CORRELATION_UPDATE,
    module: 'correlation',
    labelKey: 'roleSettings.permissions.correlation.update',
    sortOrder: 502,
  },
  {
    key: Permission.CORRELATION_DELETE,
    module: 'correlation',
    labelKey: 'roleSettings.permissions.correlation.delete',
    sortOrder: 503,
  },
  {
    key: Permission.CORRELATION_TOGGLE,
    module: 'correlation',
    labelKey: 'roleSettings.permissions.correlation.toggle',
    sortOrder: 504,
  },

  // ─── Detection Rules ───
  {
    key: Permission.DETECTION_RULES_VIEW,
    module: 'detectionRules',
    labelKey: 'roleSettings.permissions.detectionRules.view',
    sortOrder: 600,
  },
  {
    key: Permission.DETECTION_RULES_CREATE,
    module: 'detectionRules',
    labelKey: 'roleSettings.permissions.detectionRules.create',
    sortOrder: 601,
  },
  {
    key: Permission.DETECTION_RULES_UPDATE,
    module: 'detectionRules',
    labelKey: 'roleSettings.permissions.detectionRules.update',
    sortOrder: 602,
  },
  {
    key: Permission.DETECTION_RULES_DELETE,
    module: 'detectionRules',
    labelKey: 'roleSettings.permissions.detectionRules.delete',
    sortOrder: 603,
  },
  {
    key: Permission.DETECTION_RULES_TOGGLE,
    module: 'detectionRules',
    labelKey: 'roleSettings.permissions.detectionRules.toggle',
    sortOrder: 604,
  },

  // ─── Hunt ───
  {
    key: Permission.HUNT_VIEW,
    module: 'hunt',
    labelKey: 'roleSettings.permissions.hunt.view',
    sortOrder: 700,
  },
  {
    key: Permission.HUNT_CREATE,
    module: 'hunt',
    labelKey: 'roleSettings.permissions.hunt.create',
    sortOrder: 701,
  },
  {
    key: Permission.HUNT_UPDATE,
    module: 'hunt',
    labelKey: 'roleSettings.permissions.hunt.update',
    sortOrder: 702,
  },
  {
    key: Permission.HUNT_DELETE,
    module: 'hunt',
    labelKey: 'roleSettings.permissions.hunt.delete',
    sortOrder: 703,
  },
  {
    key: Permission.HUNT_EXECUTE,
    module: 'hunt',
    labelKey: 'roleSettings.permissions.hunt.execute',
    sortOrder: 704,
  },

  // ─── Reports ───
  {
    key: Permission.REPORTS_VIEW,
    module: 'reports',
    labelKey: 'roleSettings.permissions.reports.view',
    sortOrder: 800,
  },
  {
    key: Permission.REPORTS_CREATE,
    module: 'reports',
    labelKey: 'roleSettings.permissions.reports.create',
    sortOrder: 801,
  },
  {
    key: Permission.REPORTS_UPDATE,
    module: 'reports',
    labelKey: 'roleSettings.permissions.reports.update',
    sortOrder: 802,
  },
  {
    key: Permission.REPORTS_DELETE,
    module: 'reports',
    labelKey: 'roleSettings.permissions.reports.delete',
    sortOrder: 803,
  },
  {
    key: Permission.REPORTS_EXPORT,
    module: 'reports',
    labelKey: 'roleSettings.permissions.reports.export',
    sortOrder: 804,
  },

  // ─── Dashboard ───
  {
    key: Permission.DASHBOARD_VIEW,
    module: 'dashboard',
    labelKey: 'roleSettings.permissions.dashboard.view',
    sortOrder: 900,
  },

  // ─── Admin Users ───
  {
    key: Permission.ADMIN_USERS_VIEW,
    module: 'adminUsers',
    labelKey: 'roleSettings.permissions.admin.users.view',
    sortOrder: 1000,
  },
  {
    key: Permission.ADMIN_USERS_CREATE,
    module: 'adminUsers',
    labelKey: 'roleSettings.permissions.admin.users.create',
    sortOrder: 1001,
  },
  {
    key: Permission.ADMIN_USERS_UPDATE,
    module: 'adminUsers',
    labelKey: 'roleSettings.permissions.admin.users.update',
    sortOrder: 1002,
  },
  {
    key: Permission.ADMIN_USERS_DELETE,
    module: 'adminUsers',
    labelKey: 'roleSettings.permissions.admin.users.delete',
    sortOrder: 1003,
  },
  {
    key: Permission.ADMIN_USERS_BLOCK,
    module: 'adminUsers',
    labelKey: 'roleSettings.permissions.admin.users.block',
    sortOrder: 1004,
  },
  {
    key: Permission.ADMIN_USERS_RESTORE,
    module: 'adminUsers',
    labelKey: 'roleSettings.permissions.admin.users.restore',
    sortOrder: 1005,
  },

  // ─── Admin Tenants ───
  {
    key: Permission.ADMIN_TENANTS_VIEW,
    module: 'adminTenants',
    labelKey: 'roleSettings.permissions.admin.tenants.view',
    sortOrder: 1100,
  },
  {
    key: Permission.ADMIN_TENANTS_CREATE,
    module: 'adminTenants',
    labelKey: 'roleSettings.permissions.admin.tenants.create',
    sortOrder: 1101,
  },
  {
    key: Permission.ADMIN_TENANTS_UPDATE,
    module: 'adminTenants',
    labelKey: 'roleSettings.permissions.admin.tenants.update',
    sortOrder: 1102,
  },
  {
    key: Permission.ADMIN_TENANTS_DELETE,
    module: 'adminTenants',
    labelKey: 'roleSettings.permissions.admin.tenants.delete',
    sortOrder: 1103,
  },

  // ─── Intel ───
  {
    key: Permission.INTEL_VIEW,
    module: 'intel',
    labelKey: 'roleSettings.permissions.intel.view',
    sortOrder: 1200,
  },

  // ─── SOAR ───
  {
    key: Permission.SOAR_VIEW,
    module: 'soar',
    labelKey: 'roleSettings.permissions.soar.view',
    sortOrder: 1300,
  },
  {
    key: Permission.SOAR_CREATE,
    module: 'soar',
    labelKey: 'roleSettings.permissions.soar.create',
    sortOrder: 1301,
  },
  {
    key: Permission.SOAR_UPDATE,
    module: 'soar',
    labelKey: 'roleSettings.permissions.soar.update',
    sortOrder: 1302,
  },
  {
    key: Permission.SOAR_DELETE,
    module: 'soar',
    labelKey: 'roleSettings.permissions.soar.delete',
    sortOrder: 1303,
  },
  {
    key: Permission.SOAR_EXECUTE,
    module: 'soar',
    labelKey: 'roleSettings.permissions.soar.execute',
    sortOrder: 1304,
  },

  // ─── AI Agents ───
  {
    key: Permission.AI_AGENTS_VIEW,
    module: 'aiAgents',
    labelKey: 'roleSettings.permissions.aiAgents.view',
    sortOrder: 1400,
  },
  {
    key: Permission.AI_AGENTS_CREATE,
    module: 'aiAgents',
    labelKey: 'roleSettings.permissions.aiAgents.create',
    sortOrder: 1401,
  },
  {
    key: Permission.AI_AGENTS_UPDATE,
    module: 'aiAgents',
    labelKey: 'roleSettings.permissions.aiAgents.update',
    sortOrder: 1402,
  },
  {
    key: Permission.AI_AGENTS_DELETE,
    module: 'aiAgents',
    labelKey: 'roleSettings.permissions.aiAgents.delete',
    sortOrder: 1403,
  },
  {
    key: Permission.AI_AGENTS_EXECUTE,
    module: 'aiAgents',
    labelKey: 'roleSettings.permissions.aiAgents.execute',
    sortOrder: 1404,
  },
  {
    key: Permission.JOBS_VIEW,
    module: 'jobs',
    labelKey: 'roleSettings.permissions.jobs.view',
    sortOrder: 1450,
  },
  {
    key: Permission.JOBS_MANAGE,
    module: 'jobs',
    labelKey: 'roleSettings.permissions.jobs.manage',
    sortOrder: 1451,
  },
  {
    key: Permission.JOBS_CANCEL_ALL,
    module: 'jobs',
    labelKey: 'roleSettings.permissions.jobs.cancelAll',
    sortOrder: 1452,
  },

  // ─── Cloud Security ───
  {
    key: Permission.CLOUD_SECURITY_VIEW,
    module: 'cloudSecurity',
    labelKey: 'roleSettings.permissions.cloudSecurity.view',
    sortOrder: 1500,
  },
  {
    key: Permission.CLOUD_SECURITY_CREATE,
    module: 'cloudSecurity',
    labelKey: 'roleSettings.permissions.cloudSecurity.create',
    sortOrder: 1501,
  },
  {
    key: Permission.CLOUD_SECURITY_UPDATE,
    module: 'cloudSecurity',
    labelKey: 'roleSettings.permissions.cloudSecurity.update',
    sortOrder: 1502,
  },
  {
    key: Permission.CLOUD_SECURITY_DELETE,
    module: 'cloudSecurity',
    labelKey: 'roleSettings.permissions.cloudSecurity.delete',
    sortOrder: 1503,
  },

  // ─── Compliance ───
  {
    key: Permission.COMPLIANCE_VIEW,
    module: 'compliance',
    labelKey: 'roleSettings.permissions.compliance.view',
    sortOrder: 1600,
  },
  {
    key: Permission.COMPLIANCE_CREATE,
    module: 'compliance',
    labelKey: 'roleSettings.permissions.compliance.create',
    sortOrder: 1601,
  },
  {
    key: Permission.COMPLIANCE_UPDATE,
    module: 'compliance',
    labelKey: 'roleSettings.permissions.compliance.update',
    sortOrder: 1602,
  },
  {
    key: Permission.COMPLIANCE_DELETE,
    module: 'compliance',
    labelKey: 'roleSettings.permissions.compliance.delete',
    sortOrder: 1603,
  },

  // ─── Attack Paths ───
  {
    key: Permission.ATTACK_PATHS_VIEW,
    module: 'attackPaths',
    labelKey: 'roleSettings.permissions.attackPaths.view',
    sortOrder: 1700,
  },
  {
    key: Permission.ATTACK_PATHS_CREATE,
    module: 'attackPaths',
    labelKey: 'roleSettings.permissions.attackPaths.create',
    sortOrder: 1701,
  },
  {
    key: Permission.ATTACK_PATHS_UPDATE,
    module: 'attackPaths',
    labelKey: 'roleSettings.permissions.attackPaths.update',
    sortOrder: 1702,
  },
  {
    key: Permission.ATTACK_PATHS_DELETE,
    module: 'attackPaths',
    labelKey: 'roleSettings.permissions.attackPaths.delete',
    sortOrder: 1703,
  },

  // ─── UEBA ───
  {
    key: Permission.UEBA_VIEW,
    module: 'ueba',
    labelKey: 'roleSettings.permissions.ueba.view',
    sortOrder: 1800,
  },
  {
    key: Permission.UEBA_CREATE,
    module: 'ueba',
    labelKey: 'roleSettings.permissions.ueba.create',
    sortOrder: 1801,
  },
  {
    key: Permission.UEBA_UPDATE,
    module: 'ueba',
    labelKey: 'roleSettings.permissions.ueba.update',
    sortOrder: 1802,
  },
  {
    key: Permission.UEBA_DELETE,
    module: 'ueba',
    labelKey: 'roleSettings.permissions.ueba.delete',
    sortOrder: 1803,
  },

  // ─── Normalization ───
  {
    key: Permission.NORMALIZATION_VIEW,
    module: 'normalization',
    labelKey: 'roleSettings.permissions.normalization.view',
    sortOrder: 1900,
  },
  {
    key: Permission.NORMALIZATION_CREATE,
    module: 'normalization',
    labelKey: 'roleSettings.permissions.normalization.create',
    sortOrder: 1901,
  },
  {
    key: Permission.NORMALIZATION_UPDATE,
    module: 'normalization',
    labelKey: 'roleSettings.permissions.normalization.update',
    sortOrder: 1902,
  },
  {
    key: Permission.NORMALIZATION_DELETE,
    module: 'normalization',
    labelKey: 'roleSettings.permissions.normalization.delete',
    sortOrder: 1903,
  },

  // ─── Vulnerabilities ───
  {
    key: Permission.VULNERABILITIES_VIEW,
    module: 'vulnerabilities',
    labelKey: 'roleSettings.permissions.vulnerabilities.view',
    sortOrder: 2000,
  },
  {
    key: Permission.VULNERABILITIES_CREATE,
    module: 'vulnerabilities',
    labelKey: 'roleSettings.permissions.vulnerabilities.create',
    sortOrder: 2001,
  },
  {
    key: Permission.VULNERABILITIES_UPDATE,
    module: 'vulnerabilities',
    labelKey: 'roleSettings.permissions.vulnerabilities.update',
    sortOrder: 2002,
  },
  {
    key: Permission.VULNERABILITIES_DELETE,
    module: 'vulnerabilities',
    labelKey: 'roleSettings.permissions.vulnerabilities.delete',
    sortOrder: 2003,
  },

  // ─── Explorer ───
  {
    key: Permission.EXPLORER_VIEW,
    module: 'explorer',
    labelKey: 'roleSettings.permissions.explorer.view',
    sortOrder: 2100,
  },
  {
    key: Permission.EXPLORER_QUERY,
    module: 'explorer',
    labelKey: 'roleSettings.permissions.explorer.query',
    sortOrder: 2101,
  },

  // ─── Notifications ───
  {
    key: Permission.NOTIFICATIONS_VIEW,
    module: 'notifications',
    labelKey: 'roleSettings.permissions.notifications.view',
    sortOrder: 2200,
  },
  {
    key: Permission.NOTIFICATIONS_MANAGE,
    module: 'notifications',
    labelKey: 'roleSettings.permissions.notifications.manage',
    sortOrder: 2201,
  },

  // ─── Profile ───
  {
    key: Permission.PROFILE_VIEW,
    module: 'profile',
    labelKey: 'roleSettings.permissions.profile.view',
    sortOrder: 2300,
  },
  {
    key: Permission.PROFILE_UPDATE,
    module: 'profile',
    labelKey: 'roleSettings.permissions.profile.update',
    sortOrder: 2301,
  },

  // ─── Settings ───
  {
    key: Permission.SETTINGS_VIEW,
    module: 'settings',
    labelKey: 'roleSettings.permissions.settings.view',
    sortOrder: 2400,
  },
  {
    key: Permission.SETTINGS_UPDATE,
    module: 'settings',
    labelKey: 'roleSettings.permissions.settings.update',
    sortOrder: 2401,
  },

  // ─── Role Settings ───
  {
    key: Permission.ROLE_SETTINGS_VIEW,
    module: 'roleSettings',
    labelKey: 'roleSettings.permissions.roleSettings.view',
    sortOrder: 2500,
  },
  {
    key: Permission.ROLE_SETTINGS_UPDATE,
    module: 'roleSettings',
    labelKey: 'roleSettings.permissions.roleSettings.update',
    sortOrder: 2501,
  },
  {
    key: Permission.USERS_CONTROL_VIEW,
    module: 'usersControl',
    labelKey: 'roleSettings.permissions.usersControl.view',
    sortOrder: 2600,
  },
  {
    key: Permission.USERS_CONTROL_VIEW_SESSIONS,
    module: 'usersControl',
    labelKey: 'roleSettings.permissions.usersControl.viewSessions',
    sortOrder: 2601,
  },
  {
    key: Permission.USERS_CONTROL_FORCE_LOGOUT,
    module: 'usersControl',
    labelKey: 'roleSettings.permissions.usersControl.forceLogout',
    sortOrder: 2602,
  },
  {
    key: Permission.USERS_CONTROL_FORCE_LOGOUT_ALL,
    module: 'usersControl',
    labelKey: 'roleSettings.permissions.usersControl.forceLogoutAll',
    sortOrder: 2603,
  },

  // ─── AI Config ───
  {
    key: Permission.AI_CONFIG_VIEW,
    module: 'aiConfig',
    labelKey: 'roleSettings.permissions.aiConfig.view',
    sortOrder: 2700,
  },
  {
    key: Permission.AI_CONFIG_EDIT,
    module: 'aiConfig',
    labelKey: 'roleSettings.permissions.aiConfig.edit',
    sortOrder: 2701,
  },
  {
    key: Permission.AI_CONFIG_MANAGE_PROMPTS,
    module: 'aiConfig',
    labelKey: 'roleSettings.permissions.aiConfig.managePrompts',
    sortOrder: 2702,
  },
  {
    key: Permission.AI_CONFIG_MANAGE_TRIGGERS,
    module: 'aiConfig',
    labelKey: 'roleSettings.permissions.aiConfig.manageTriggers',
    sortOrder: 2703,
  },
  {
    key: Permission.AI_CONFIG_MANAGE_OSINT,
    module: 'aiConfig',
    labelKey: 'roleSettings.permissions.aiConfig.manageOsint',
    sortOrder: 2704,
  },
  {
    key: Permission.AI_APPROVALS_MANAGE,
    module: 'aiConfig',
    labelKey: 'roleSettings.permissions.aiConfig.manageApprovals',
    sortOrder: 2705,
  },
  {
    key: Permission.AI_USAGE_VIEW,
    module: 'aiConfig',
    labelKey: 'roleSettings.permissions.aiConfig.viewUsage',
    sortOrder: 2706,
  },
  {
    key: Permission.AI_VULNERABILITY_COPILOT,
    module: 'vulnerabilities',
    labelKey: 'roleSettings.permissions.vulnerabilities.aiCopilot',
    sortOrder: 2800,
  },
  {
    key: Permission.AI_CLOUD_TRIAGE,
    module: 'cloudSecurity',
    labelKey: 'roleSettings.permissions.cloudSecurity.aiTriage',
    sortOrder: 2810,
  },
  {
    key: Permission.AI_UEBA_NARRATIVE,
    module: 'ueba',
    labelKey: 'roleSettings.permissions.ueba.aiNarrative',
    sortOrder: 2820,
  },
  {
    key: Permission.AI_ATTACK_PATH_SUMMARY,
    module: 'attackPaths',
    labelKey: 'roleSettings.permissions.attackPaths.aiSummary',
    sortOrder: 2830,
  },
  // ─── AI Chat ───
  {
    key: Permission.AI_CHAT_ACCESS,
    module: 'aiChat',
    labelKey: 'roleSettings.permissions.aiChat.access',
    sortOrder: 2840,
  },
  // ─── AI Memory ───
  {
    key: Permission.AI_MEMORY_VIEW,
    module: 'aiMemory',
    labelKey: 'roleSettings.permissions.aiMemory.view',
    sortOrder: 2850,
  },
  {
    key: Permission.AI_MEMORY_EDIT,
    module: 'aiMemory',
    labelKey: 'roleSettings.permissions.aiMemory.edit',
    sortOrder: 2851,
  },

  {
    key: Permission.AI_MEMORY_ADMIN,
    module: 'aiMemory',
    labelKey: 'roleSettings.permissions.aiMemory.admin',
    sortOrder: 2852,
  },
  {
    key: Permission.AI_MEMORY_EXPORT,
    module: 'aiMemory',
    labelKey: 'roleSettings.permissions.aiMemory.export',
    sortOrder: 2853,
  },

  // ─── AI Handoff ───
  {
    key: Permission.AI_HANDOFF_PROMOTE,
    module: 'aiHandoff',
    labelKey: 'roleSettings.permissions.aiHandoff.promote',
    sortOrder: 2863,
  },

  // ─── AI Ops Workspace ───
  {
    key: Permission.AI_OPS_VIEW,
    module: 'aiOps',
    labelKey: 'roleSettings.permissions.aiOps.view',
    sortOrder: 2865,
  },

  // ─── AI Transcript & Compliance ───
  {
    key: Permission.AI_TRANSCRIPT_VIEW,
    module: 'aiTranscript',
    labelKey: 'roleSettings.permissions.aiTranscript.view',
    sortOrder: 2870,
  },
  {
    key: Permission.AI_TRANSCRIPT_MANAGE,
    module: 'aiTranscript',
    labelKey: 'roleSettings.permissions.aiTranscript.manage',
    sortOrder: 2871,
  },
  {
    key: Permission.AI_TRANSCRIPT_EXPORT,
    module: 'aiTranscript',
    labelKey: 'roleSettings.permissions.aiTranscript.export',
    sortOrder: 2872,
  },

  // ─── AI FinOps ───
  {
    key: Permission.AI_FINOPS_VIEW,
    module: 'aiFinops',
    labelKey: 'roleSettings.permissions.aiFinops.view',
    sortOrder: 2860,
  },
  {
    key: Permission.AI_FINOPS_MANAGE,
    module: 'aiFinops',
    labelKey: 'roleSettings.permissions.aiFinops.manage',
    sortOrder: 2861,
  },

  // ─── AI Eval Lab ───
  {
    key: Permission.AI_EVAL_VIEW,
    module: 'aiEval',
    labelKey: 'roleSettings.permissions.aiEval.view',
    sortOrder: 2880,
  },
  {
    key: Permission.AI_EVAL_MANAGE,
    module: 'aiEval',
    labelKey: 'roleSettings.permissions.aiEval.manage',
    sortOrder: 2881,
  },

  // ─── AI Simulation ───
  {
    key: Permission.AI_SIMULATION_VIEW,
    module: 'aiSimulation',
    labelKey: 'roleSettings.permissions.aiSimulation.view',
    sortOrder: 2900,
  },
  {
    key: Permission.AI_SIMULATION_MANAGE,
    module: 'aiSimulation',
    labelKey: 'roleSettings.permissions.aiSimulation.manage',
    sortOrder: 2901,
  },
]
