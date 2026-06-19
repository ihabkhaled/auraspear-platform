export enum Permission {
  // Alerts
  ALERTS_VIEW = 'alerts.view',
  ALERTS_INVESTIGATE = 'alerts.investigate',
  ALERTS_ACKNOWLEDGE = 'alerts.acknowledge',
  ALERTS_CLOSE = 'alerts.close',
  ALERTS_ESCALATE = 'alerts.escalate',

  // Cases
  CASES_VIEW = 'cases.view',
  CASES_CREATE = 'cases.create',
  CASES_UPDATE = 'cases.update',
  CASES_DELETE = 'cases.delete',
  CASES_ASSIGN = 'cases.assign',
  CASES_CHANGE_STATUS = 'cases.changeStatus',
  CASES_ADD_COMMENT = 'cases.addComment',
  CASES_DELETE_COMMENT = 'cases.deleteComment',
  CASES_ADD_TASK = 'cases.addTask',
  CASES_UPDATE_TASK = 'cases.updateTask',
  CASES_DELETE_TASK = 'cases.deleteTask',
  CASES_ADD_ARTIFACT = 'cases.addArtifact',
  CASES_DELETE_ARTIFACT = 'cases.deleteArtifact',

  // Incidents
  INCIDENTS_VIEW = 'incidents.view',
  INCIDENTS_CREATE = 'incidents.create',
  INCIDENTS_UPDATE = 'incidents.update',
  INCIDENTS_DELETE = 'incidents.delete',
  INCIDENTS_ADD_TIMELINE = 'incidents.addTimeline',
  INCIDENTS_CHANGE_STATUS = 'incidents.changeStatus',

  // Connectors
  CONNECTORS_VIEW = 'connectors.view',
  CONNECTORS_CREATE = 'connectors.create',
  CONNECTORS_UPDATE = 'connectors.update',
  CONNECTORS_DELETE = 'connectors.delete',
  CONNECTORS_TEST = 'connectors.test',
  CONNECTORS_SYNC = 'connectors.sync',

  // LLM Connectors
  LLM_CONNECTORS_VIEW = 'llmConnectors.view',
  LLM_CONNECTORS_CREATE = 'llmConnectors.create',
  LLM_CONNECTORS_UPDATE = 'llmConnectors.update',
  LLM_CONNECTORS_DELETE = 'llmConnectors.delete',
  LLM_CONNECTORS_TEST = 'llmConnectors.test',

  // Correlation Rules
  CORRELATION_VIEW = 'correlation.view',
  CORRELATION_CREATE = 'correlation.create',
  CORRELATION_UPDATE = 'correlation.update',
  CORRELATION_DELETE = 'correlation.delete',
  CORRELATION_TOGGLE = 'correlation.toggle',

  // Detection Rules
  DETECTION_RULES_VIEW = 'detectionRules.view',
  DETECTION_RULES_CREATE = 'detectionRules.create',
  DETECTION_RULES_UPDATE = 'detectionRules.update',
  DETECTION_RULES_DELETE = 'detectionRules.delete',
  DETECTION_RULES_TOGGLE = 'detectionRules.toggle',

  // Hunt
  HUNT_VIEW = 'hunt.view',
  HUNT_CREATE = 'hunt.create',
  HUNT_UPDATE = 'hunt.update',
  HUNT_DELETE = 'hunt.delete',
  HUNT_EXECUTE = 'hunt.execute',

  // Reports
  REPORTS_VIEW = 'reports.view',
  REPORTS_CREATE = 'reports.create',
  REPORTS_UPDATE = 'reports.update',
  REPORTS_DELETE = 'reports.delete',
  REPORTS_EXPORT = 'reports.export',

  // Dashboard
  DASHBOARD_VIEW = 'dashboard.view',

  // Admin - Users
  ADMIN_USERS_VIEW = 'admin.users.view',
  ADMIN_USERS_CREATE = 'admin.users.create',
  ADMIN_USERS_UPDATE = 'admin.users.update',
  ADMIN_USERS_DELETE = 'admin.users.delete',
  ADMIN_USERS_BLOCK = 'admin.users.block',
  ADMIN_USERS_RESTORE = 'admin.users.restore',

  // Admin - Tenants
  ADMIN_TENANTS_VIEW = 'admin.tenants.view',
  ADMIN_TENANTS_CREATE = 'admin.tenants.create',
  ADMIN_TENANTS_UPDATE = 'admin.tenants.update',
  ADMIN_TENANTS_DELETE = 'admin.tenants.delete',

  // Intel
  INTEL_VIEW = 'intel.view',

  // SOAR
  SOAR_VIEW = 'soar.view',
  SOAR_CREATE = 'soar.create',
  SOAR_UPDATE = 'soar.update',
  SOAR_DELETE = 'soar.delete',
  SOAR_EXECUTE = 'soar.execute',

  // AI Agents
  AI_AGENTS_VIEW = 'aiAgents.view',
  AI_AGENTS_EXECUTE = 'aiAgents.execute',
  AI_AGENTS_CREATE = 'aiAgents.create',
  AI_AGENTS_UPDATE = 'aiAgents.update',
  AI_AGENTS_DELETE = 'aiAgents.delete',

  // Jobs / Runtime
  JOBS_VIEW = 'jobs.view',
  JOBS_MANAGE = 'jobs.manage',
  JOBS_CANCEL_ALL = 'jobs.cancelAll',

  // System Health
  SYSTEM_HEALTH_VIEW = 'systemHealth.view',

  // Cloud Security
  CLOUD_SECURITY_VIEW = 'cloudSecurity.view',
  CLOUD_SECURITY_CREATE = 'cloudSecurity.create',
  CLOUD_SECURITY_UPDATE = 'cloudSecurity.update',
  CLOUD_SECURITY_DELETE = 'cloudSecurity.delete',

  // Compliance
  COMPLIANCE_VIEW = 'compliance.view',
  COMPLIANCE_CREATE = 'compliance.create',
  COMPLIANCE_UPDATE = 'compliance.update',
  COMPLIANCE_DELETE = 'compliance.delete',

  // Attack Paths
  ATTACK_PATHS_VIEW = 'attackPaths.view',
  ATTACK_PATHS_CREATE = 'attackPaths.create',
  ATTACK_PATHS_UPDATE = 'attackPaths.update',
  ATTACK_PATHS_DELETE = 'attackPaths.delete',

  // UEBA
  UEBA_VIEW = 'ueba.view',
  UEBA_CREATE = 'ueba.create',
  UEBA_UPDATE = 'ueba.update',
  UEBA_DELETE = 'ueba.delete',

  // Normalization
  NORMALIZATION_VIEW = 'normalization.view',
  NORMALIZATION_CREATE = 'normalization.create',
  NORMALIZATION_UPDATE = 'normalization.update',
  NORMALIZATION_DELETE = 'normalization.delete',

  // Vulnerabilities
  VULNERABILITIES_VIEW = 'vulnerabilities.view',
  VULNERABILITIES_CREATE = 'vulnerabilities.create',
  VULNERABILITIES_UPDATE = 'vulnerabilities.update',
  VULNERABILITIES_DELETE = 'vulnerabilities.delete',

  // Explorer / Log Search
  EXPLORER_VIEW = 'explorer.view',
  EXPLORER_QUERY = 'explorer.query',

  // Notifications
  NOTIFICATIONS_VIEW = 'notifications.view',
  NOTIFICATIONS_MANAGE = 'notifications.manage',

  // Profile
  PROFILE_VIEW = 'profile.view',
  PROFILE_UPDATE = 'profile.update',

  // Settings
  SETTINGS_VIEW = 'settings.view',
  SETTINGS_UPDATE = 'settings.update',

  // Role Settings (this module itself)
  ROLE_SETTINGS_VIEW = 'roleSettings.view',
  ROLE_SETTINGS_UPDATE = 'roleSettings.update',

  // AI Alert Triage
  AI_ALERT_TRIAGE = 'ai.alerts.triage',

  // AI Case Copilot
  AI_CASE_COPILOT = 'ai.cases.copilot',

  // AI Detection Copilot
  AI_DETECTION_COPILOT = 'ai.detection.copilot',

  // AI SOAR Copilot
  AI_SOAR_COPILOT = 'ai.soar.copilot',

  // Runbooks / Knowledge Base
  RUNBOOKS_VIEW = 'runbooks.view',
  RUNBOOKS_CREATE = 'runbooks.create',
  RUNBOOKS_UPDATE = 'runbooks.update',
  RUNBOOKS_DELETE = 'runbooks.delete',

  // Entities
  ENTITIES_VIEW = 'entities.view',
  ENTITIES_CREATE = 'entities.create',
  ENTITIES_UPDATE = 'entities.update',

  // MSSP Dashboard
  MSSP_DASHBOARD_VIEW = 'msspDashboard.view',

  // Users Control
  USERS_CONTROL_VIEW = 'usersControl.view',
  USERS_CONTROL_VIEW_SESSIONS = 'usersControl.viewSessions',
  USERS_CONTROL_FORCE_LOGOUT = 'usersControl.forceLogout',
  USERS_CONTROL_FORCE_LOGOUT_ALL = 'usersControl.forceLogoutAll',

  // AI Config
  AI_CONFIG_VIEW = 'ai.config.view',
  AI_CONFIG_EDIT = 'ai.config.edit',
  AI_CONFIG_MANAGE_PROMPTS = 'ai.config.manage_prompts',
  AI_CONFIG_MANAGE_TRIGGERS = 'ai.config.manage_triggers',
  AI_CONFIG_MANAGE_OSINT = 'ai.config.manage_osint',
  AI_APPROVALS_MANAGE = 'ai.approvals.manage',
  AI_USAGE_VIEW = 'ai.usage.view',

  // AI Module Copilots
  AI_VULNERABILITY_COPILOT = 'ai.vulnerabilities.copilot',
  AI_CLOUD_TRIAGE = 'ai.cloudSecurity.triage',
  AI_UEBA_NARRATIVE = 'ai.ueba.narrative',
  AI_ATTACK_PATH_SUMMARY = 'ai.attackPaths.summary',

  // AI Chat
  AI_CHAT_ACCESS = 'ai.chat.access',

  // AI Memory
  AI_MEMORY_VIEW = 'ai.memory.view',
  AI_MEMORY_EDIT = 'ai.memory.edit',

  // AI FinOps
  AI_FINOPS_VIEW = 'ai.finops.view',
  AI_FINOPS_MANAGE = 'ai.finops.manage',

  // AI Memory Governance
  AI_MEMORY_ADMIN = 'ai.memory.admin',
  AI_MEMORY_EXPORT = 'ai.memory.export',

  // AI Handoff
  AI_HANDOFF_PROMOTE = 'ai.handoff.promote',

  // AI Ops Workspace
  AI_OPS_VIEW = 'ai.ops.view',

  // AI Transcript & Compliance
  AI_TRANSCRIPT_VIEW = 'ai.transcript.view',
  AI_TRANSCRIPT_MANAGE = 'ai.transcript.manage',
  AI_TRANSCRIPT_EXPORT = 'ai.transcript.export',

  // AI Eval Lab
  AI_EVAL_VIEW = 'ai.eval.view',
  AI_EVAL_MANAGE = 'ai.eval.manage',

  // AI Simulation
  AI_SIMULATION_VIEW = 'ai.simulation.view',
  AI_SIMULATION_MANAGE = 'ai.simulation.manage',
}

/**
 * All permission keys as an array — useful for seeding and validation.
 */
export const ALL_PERMISSIONS: Permission[] = Object.values(Permission)
