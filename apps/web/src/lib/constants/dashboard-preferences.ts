import { DashboardDensity, DashboardPanelKey } from '@/enums'

export const DEFAULT_DASHBOARD_DENSITY = DashboardDensity.COMFORTABLE
export const DASHBOARD_DENSITY_STORAGE_KEY = 'auraspear.dashboardDensity'

export const DEFAULT_COLLAPSED_DASHBOARD_PANELS: DashboardPanelKey[] = [
  DashboardPanelKey.MITRE_TECHNIQUES,
  DashboardPanelKey.TARGETED_ASSETS,
]

export const DASHBOARD_ACTIVITY_LIMIT = 5

export const DASHBOARD_DENSITY_LABEL_KEYS: Record<DashboardDensity, string> = {
  [DashboardDensity.COMPACT]: 'densityCompact',
  [DashboardDensity.COMFORTABLE]: 'densityComfortable',
  [DashboardDensity.EXPANDED]: 'densityExpanded',
}

export const DASHBOARD_PANEL_LABEL_KEYS: Record<DashboardPanelKey, string> = {
  [DashboardPanelKey.OVERVIEW]: 'overviewSection',
  [DashboardPanelKey.THREAT_OPERATIONS]: 'threatOperationsSection',
  [DashboardPanelKey.OPERATIONS]: 'operationsSection',
  [DashboardPanelKey.AUTOMATION]: 'automationSection',
  [DashboardPanelKey.GOVERNANCE]: 'governanceSection',
  [DashboardPanelKey.INFRASTRUCTURE]: 'infrastructureSection',
  [DashboardPanelKey.ALERT_TRENDS]: 'alertTrends',
  [DashboardPanelKey.SEVERITY_DISTRIBUTION]: 'severityDistribution',
  [DashboardPanelKey.MITRE_TECHNIQUES]: 'mitreTopTechniques',
  [DashboardPanelKey.TARGETED_ASSETS]: 'topTargetedAssets',
  [DashboardPanelKey.INCIDENT_STATUS]: 'incidentStatusSection',
  [DashboardPanelKey.CASE_AGING]: 'caseAgingSection',
  [DashboardPanelKey.RULE_PERFORMANCE]: 'rulePerformanceSection',
  [DashboardPanelKey.CONNECTOR_SYNC]: 'connectorSyncSection',
  [DashboardPanelKey.RUNTIME_BACKLOG]: 'runtimeBacklogSection',
  [DashboardPanelKey.AUTOMATION_QUALITY]: 'automationQualitySection',
  [DashboardPanelKey.EXPOSURE_SUMMARY]: 'exposureSummarySection',
  [DashboardPanelKey.REPORT_TEMPLATES]: 'reportTemplatesSection',
  [DashboardPanelKey.AI_CANVAS]: 'aiOrchestrationCanvas',
  [DashboardPanelKey.RECENT_ACTIVITY]: 'recentActivity',
}
