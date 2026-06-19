import { ReportFormat, ReportModule, ReportStatus, ReportTemplateKey, ReportType } from '@/enums'

export const REPORT_TYPE_LABEL_KEYS: Record<ReportType, string> = {
  [ReportType.EXECUTIVE]: 'typeExecutive',
  [ReportType.COMPLIANCE]: 'typeCompliance',
  [ReportType.INCIDENT]: 'typeIncident',
  [ReportType.THREAT]: 'typeThreat',
  [ReportType.CUSTOM]: 'typeCustom',
}

export const REPORT_TYPE_CLASSES: Record<ReportType, string> = {
  [ReportType.EXECUTIVE]: 'bg-primary text-white',
  [ReportType.COMPLIANCE]: 'bg-status-info text-white',
  [ReportType.INCIDENT]: 'bg-status-error text-white',
  [ReportType.THREAT]: 'bg-status-warning text-white',
  [ReportType.CUSTOM]: 'bg-muted text-muted-foreground',
}

export const REPORT_FORMAT_LABEL_KEYS: Record<ReportFormat, string> = {
  [ReportFormat.PDF]: 'formatPdf',
  [ReportFormat.CSV]: 'formatCsv',
  [ReportFormat.HTML]: 'formatHtml',
}

export const REPORT_FORMAT_CLASSES: Record<ReportFormat, string> = {
  [ReportFormat.PDF]: 'bg-status-error text-white',
  [ReportFormat.CSV]: 'bg-status-success text-white',
  [ReportFormat.HTML]: 'bg-status-info text-white',
}

export const REPORT_MODULE_LABEL_KEYS: Record<ReportModule, string> = {
  [ReportModule.DASHBOARD]: 'moduleDashboard',
  [ReportModule.ALERTS]: 'moduleAlerts',
  [ReportModule.INCIDENTS]: 'moduleIncidents',
  [ReportModule.CASES]: 'moduleCases',
  [ReportModule.VULNERABILITIES]: 'moduleVulnerabilities',
  [ReportModule.COMPLIANCE]: 'moduleCompliance',
  [ReportModule.AI_AGENTS]: 'moduleAiAgents',
  [ReportModule.SOAR]: 'moduleSoar',
  [ReportModule.CONNECTORS]: 'moduleConnectors',
  [ReportModule.SYSTEM_HEALTH]: 'moduleSystemHealth',
}

export const REPORT_TEMPLATE_LABEL_KEYS: Record<ReportTemplateKey, string> = {
  [ReportTemplateKey.EXECUTIVE_OVERVIEW]: 'templateExecutiveOverview',
  [ReportTemplateKey.INCIDENT_POSTURE]: 'templateIncidentPosture',
  [ReportTemplateKey.THREAT_EXPOSURE]: 'templateThreatExposure',
  [ReportTemplateKey.VULNERABILITY_EXPOSURE]: 'templateVulnerabilityExposure',
  [ReportTemplateKey.COMPLIANCE_POSTURE]: 'templateCompliancePosture',
  [ReportTemplateKey.AUTOMATION_HEALTH]: 'templateAutomationHealth',
  [ReportTemplateKey.CONNECTOR_HEALTH]: 'templateConnectorHealth',
}

export const REPORT_STATUS_LABEL_KEYS: Record<ReportStatus, string> = {
  [ReportStatus.GENERATING]: 'statusGenerating',
  [ReportStatus.COMPLETED]: 'statusCompleted',
  [ReportStatus.FAILED]: 'statusFailed',
}

export const REPORT_STATUS_CLASSES: Record<ReportStatus, string> = {
  [ReportStatus.GENERATING]: 'bg-primary text-white',
  [ReportStatus.COMPLETED]: 'bg-status-success text-white',
  [ReportStatus.FAILED]: 'bg-status-error text-white',
}

export const AI_TIME_RANGE_OPTIONS = ['7d', '14d', '30d', '90d'] as const

export const AI_TIME_RANGE_LABEL_KEYS: Record<string, string> = {
  '7d': 'aiLast7Days',
  '14d': 'aiLast14Days',
  '30d': 'aiLast30Days',
  '90d': 'aiLast90Days',
}
