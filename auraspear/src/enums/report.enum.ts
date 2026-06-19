export enum ReportType {
  EXECUTIVE = 'executive',
  COMPLIANCE = 'compliance',
  INCIDENT = 'incident',
  THREAT = 'threat',
  CUSTOM = 'custom',
}

export enum ReportModule {
  DASHBOARD = 'dashboard',
  ALERTS = 'alerts',
  INCIDENTS = 'incidents',
  CASES = 'cases',
  VULNERABILITIES = 'vulnerabilities',
  COMPLIANCE = 'compliance',
  AI_AGENTS = 'ai_agents',
  SOAR = 'soar',
  CONNECTORS = 'connectors',
  SYSTEM_HEALTH = 'system_health',
}

export enum ReportTemplateKey {
  EXECUTIVE_OVERVIEW = 'executive_overview',
  INCIDENT_POSTURE = 'incident_posture',
  THREAT_EXPOSURE = 'threat_exposure',
  VULNERABILITY_EXPOSURE = 'vulnerability_exposure',
  COMPLIANCE_POSTURE = 'compliance_posture',
  AUTOMATION_HEALTH = 'automation_health',
  CONNECTOR_HEALTH = 'connector_health',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  HTML = 'html',
}

export enum ReportStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
