import type {
  AiAgentSessionStatus,
  AlertSeverity,
  CloudFindingSeverity,
  ConnectorType,
  IncidentStatus,
  ServiceStatus,
  SyncJobStatus,
  SoarExecutionStatus,
} from '../../common/enums'

export interface DashboardSummary {
  tenantId: string
  totalAlerts: number
  criticalAlerts: number
  openCases: number
  alertsLast24h: number
  resolvedLast24h: number
  meanTimeToRespond: string
  connectedSources: number
  totalAlertsTrend: number
  criticalAlertsTrend: number
  openCasesTrend: number
  mttrTrend: number
}

export interface AlertTrendEntry {
  date: string
  critical: number
  high: number
  medium: number
  low: number
  info: number
}

export interface AlertTrend {
  tenantId: string
  days: number
  trend: AlertTrendEntry[]
}

export interface SeverityDistributionEntry {
  severity: AlertSeverity
  count: number
  percentage: number
}

export interface SeverityDistribution {
  tenantId: string
  distribution: SeverityDistributionEntry[]
}

export interface MitreTechniqueEntry {
  id: string
  count: number
}

export interface MitreTopTechniques {
  tenantId: string
  techniques: MitreTechniqueEntry[]
}

export interface TopTargetedAsset {
  hostname: string
  alertCount: number
  criticalCount: number
  lastSeen: Date
}

export interface TopTargetedAssets {
  tenantId: string
  assets: TopTargetedAsset[]
}

export interface PipelineEntry {
  name: string
  type: ConnectorType
  status: ServiceStatus
  lastChecked: Date | null
  lastError: string | null
}

export interface PipelineHealth {
  tenantId: string
  pipelines: PipelineEntry[]
}

export interface RecentActivityItem {
  id: string
  type: string
  actorName: string
  title: string
  message: string
  createdAt: Date
  isRead: boolean
}

export interface PaginationMetadata {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface RecentActivityResponse {
  data: RecentActivityItem[]
  pagination: PaginationMetadata
}

export interface DashboardOverviewMetrics {
  alertsLast24h: number
  resolvedLast24h: number
  openCases: number
  openIncidents: number
  criticalVulnerabilities: number
  connectedSources: number
  completedReports: number
}

export interface DashboardThreatOperationsMetrics {
  totalAlerts7d: number
  criticalAlerts7d: number
  openCases: number
  openIncidents: number
  criticalVulnerabilities: number
  highVulnerabilities: number
  activeAttackPaths: number
}

export interface DashboardAutomationMetrics {
  onlineAgents: number
  aiSessions24h: number
  pendingJobs: number
  runningJobs: number
  failedJobs: number
  healthyConnectors: number
  failingConnectors: number
}

export interface DashboardGovernanceMetrics {
  totalFrameworks: number
  passedControls: number
  failedControls: number
  notAssessedControls: number
  complianceScore: number
  availableTemplates: number
}

export interface DashboardInfrastructureMetrics {
  enabledConnectors: number
  healthyConnectors: number
  failingConnectors: number
  totalJobs: number
  delayedJobs: number
  generatedReports30d: number
}

export interface DashboardAnalyticsOverview {
  tenantId: string
  overview: DashboardOverviewMetrics
  threatOperations: DashboardThreatOperationsMetrics
  automation: DashboardAutomationMetrics
  governance: DashboardGovernanceMetrics
  infrastructure: DashboardInfrastructureMetrics
}

export interface DashboardIncidentStatusBreakdownEntry {
  status: IncidentStatus
  count: number
}

export interface DashboardCaseAgingMetrics {
  openCases: number
  unassignedCases: number
  agedOverSevenDays: number
  agedOverFourteenDays: number
  meanOpenAgeHours: number
}

export interface DashboardRulePerformanceEntry {
  id: string
  name: string
  hitCount: number
  falsePositiveCount: number
  falsePositiveRate: number
  lastTriggeredAt: Date | null
  createdAt: Date
}

export interface DashboardRulePerformanceSummary {
  activeRules: number
  topRules: DashboardRulePerformanceEntry[]
  noisyRules: DashboardRulePerformanceEntry[]
}

export interface DashboardConnectorFailureEntry {
  connectorType: ConnectorType
  failures: number
}

export interface DashboardConnectorSyncSummary {
  completedRuns7d: number
  failedRuns7d: number
  runningSyncs: number
  topFailingConnectors: DashboardConnectorFailureEntry[]
}

export interface DashboardRuntimeBacklog {
  pendingJobs: number
  retryingJobs: number
  failedJobs: number
  staleRunningJobs: number
  queuedConnectorSyncJobs: number
  queuedReportJobs: number
}

export interface DashboardAutomationQuality {
  aiSessions24h: number
  successfulAiSessions24h: number
  failedAiSessions24h: number
  averageAiDurationSeconds: number
  completedSoarRuns30d: number
  failedSoarRuns30d: number
  averageSoarCompletionRate: number
}

export interface DashboardExposureSummary {
  criticalVulnerabilities: number
  exploitAvailableVulnerabilities: number
  openCloudFindings: number
  criticalCloudFindings: number
  passedControls: number
  failedControls: number
}

export interface DashboardOperationsOverview {
  tenantId: string
  incidentStatus: DashboardIncidentStatusBreakdownEntry[]
  caseAging: DashboardCaseAgingMetrics
  rulePerformance: DashboardRulePerformanceSummary
  connectorSync: DashboardConnectorSyncSummary
  runtimeBacklog: DashboardRuntimeBacklog
  automationQuality: DashboardAutomationQuality
  exposureSummary: DashboardExposureSummary
}

export interface AvgMsRow {
  avg_ms: number | null
}

export interface AvgHoursRow {
  avg_hours: number | null
}

export interface AvgPercentageRow {
  avg_percentage: number | null
}

export interface AlertTrendRow {
  date: string
  severity: AlertSeverity
  count: bigint
}

export interface MitreTechniqueRow {
  technique: string
  count: bigint
}

export interface TopAssetRow {
  hostname: string
  alert_count: bigint
  critical_count: bigint
  last_seen: Date
}

export interface ConnectorRow {
  type: ConnectorType
  name: string
  lastTestAt: Date | null
  lastTestOk: boolean | null
  lastError: string | null
}

export interface RecentNotificationRow {
  id: string
  type: string
  actorUserId: string | null
  title: string
  message: string
  readAt: Date | null
  createdAt: Date
}

export interface DashboardSeverityCountRow {
  severity: AlertSeverity
  _count: number
}

export interface DashboardIncidentStatusCountRow {
  status: IncidentStatus
  _count: number
}

export interface DetectionRulePerformanceRow {
  id: string
  name: string
  hitCount: number
  falsePositiveCount: number
  lastTriggeredAt: Date | null
  createdAt: Date
}

export interface ConnectorFailureRow {
  connectorType: ConnectorType
  failures: number
}

export interface StatusCountRow<TStatus> {
  status: TStatus
  _count: number
}

export interface CloudFindingSeverityCountRow {
  severity: CloudFindingSeverity
  _count: number
}

export interface DashboardAiSessionStatusCounts {
  completed: number
  failed: number
  total: number
}

export interface DashboardSoarStatusCounts {
  completed: number
  failed: number
}

export interface DashboardConnectorSyncStatusCounts {
  completed: number
  failed: number
  running: number
}

export type DashboardAiSessionStatusRow = StatusCountRow<AiAgentSessionStatus>

export type DashboardSoarStatusRow = StatusCountRow<SoarExecutionStatus>

export type DashboardConnectorSyncStatusRow = StatusCountRow<SyncJobStatus>

export interface SummaryRawData {
  openCases: number
  alertsLast24h: number
  resolvedLast24h: number
  avgResolutionTime: AvgMsRow[]
  alertsCurrentWeek: number
  criticalCurrentWeek: number
  casesCurrentWeek: number
  mttrCurrentWeek: AvgMsRow[]
  alertsPreviousWeek: number
  criticalPreviousWeek: number
  casesPreviousWeek: number
  mttrPreviousWeek: AvgMsRow[]
  connectedSources: number
}

export interface AnalyticsRawData {
  tenantId: string
  alertsLast24h: number
  resolvedLast24h: number
  openCases: number
  openIncidents: number
  criticalVulnerabilities: number
  highVulnerabilities: number
  activeAttackPaths: number
  onlineAgents: number
  aiSessions24h: number
  pendingJobs: number
  runningJobs: number
  failedJobs: number
  totalJobs: number
  delayedJobs: number
  totalFrameworks: number
  passedControls: number
  failedControls: number
  notAssessedControls: number
  completedReports: number
  generatedReports30d: number
  availableTemplates: number
  totalAlerts7d: number
  criticalAlerts7d: number
  enabledConnectors: ConnectorRow[]
}

export interface OperationsRawData {
  tenantId: string
  incidentStatusRows: DashboardIncidentStatusCountRow[]
  openCases: number
  unassignedCases: number
  agedOverSevenDays: number
  agedOverFourteenDays: number
  averageOpenCaseAge: AvgHoursRow[]
  activeRules: number
  topRules: DetectionRulePerformanceRow[]
  noisyRules: DetectionRulePerformanceRow[]
  connectorSyncStatusRows: DashboardConnectorSyncStatusRow[]
  topFailingConnectors: ConnectorFailureRow[]
  pendingJobs: number
  retryingJobs: number
  failedJobs: number
  staleRunningJobs: number
  queuedConnectorSyncJobs: number
  queuedReportJobs: number
  aiSessionStatusRows: DashboardAiSessionStatusRow[]
  averageAiDuration: AvgMsRow[]
  soarStatusRows: DashboardSoarStatusRow[]
  averageSoarCompletionRate: AvgPercentageRow[]
  criticalVulnerabilities: number
  exploitAvailableVulnerabilities: number
  openCloudFindings: number
  criticalCloudFindings: number
  passedControls: number
  failedControls: number
}

export interface RecentActivityBuildInput {
  notifications: RecentNotificationRow[]
  actors: Array<{ id: string; name: string | null }>
  total: number
  limit: number
}

export interface TenantAlertCounts {
  tenantId: string
  tenantName: string
  alertCount: number
  criticalAlerts: number
}

export interface TenantCaseCounts {
  tenantId: string
  openCases: number
}

export interface TenantHuntCounts {
  tenantId: string
  activeHunts: number
}

export interface TenantAggregateInput {
  tenantId: string
  tenantName: string
  alertCount: number
  criticalAlerts: number
  openCases: number
  activeHunts: number
  connectorHealth: number
  aiUsage: number
}
