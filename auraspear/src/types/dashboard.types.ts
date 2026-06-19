import type { ReactNode } from 'react'
import type { ConnectorType, DashboardDensity, DashboardPanelKey, IncidentStatus } from '@/enums'
import type { ServiceHealth } from './admin.types'
import type { AiResponse } from './ai.types'

export interface DashboardKPI {
  label: string
  value: number
  trend: number
  trendLabel: string
  icon: string
}

export interface AlertTrendPoint {
  date: string
  critical: number
  high: number
  medium: number
  low: number
}

export interface MITRETechnique {
  id: string
  name: string
  count: number
  percentage: number
}

export interface AssetRisk {
  id: string
  name: string
  ip: string
  riskScore: number
  alertCount: number
}

export interface PipelineService {
  name: string
  status: string
  healthy: boolean
}

export interface BackendSummary {
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

export interface BackendTrendPoint {
  date: string
  critical: number
  high: number
  medium: number
  low: number
}

export interface BackendTrendResponse {
  tenantId: string
  days: number
  trend: BackendTrendPoint[]
}

export interface BackendTechnique {
  id: string
  name: string
  tactic: string
  count: number
}

export interface BackendMitreResponse {
  tenantId: string
  techniques: BackendTechnique[]
}

export interface BackendAsset {
  hostname: string
  alertCount: number
  criticalCount: number
  lastSeen: string
}

export interface BackendAssetsResponse {
  tenantId: string
  assets: BackendAsset[]
}

export interface BackendPipeline {
  name: string
  type: string
  status: string
  lastChecked: string | null
  lastError: string | null
}

export interface BackendPipelineResponse {
  tenantId: string
  pipelines: BackendPipeline[]
}

export interface DashboardCardProps {
  title: string
  action?: ReactNode | undefined
  children: ReactNode
  className?: string | undefined
}

export interface DashboardSectionCardProps {
  title: string
  action?: ReactNode | undefined
  children: ReactNode
  className?: string | undefined
  defaultOpen?: boolean | undefined
  open?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
}

export interface TopTargetedAssetsProps {
  assets: AssetRisk[]
}

export interface PipelineHealthBarProps {
  services: ServiceHealth[]
  onServiceClick?: ((connectorType: string) => void) | undefined
}

export interface MITRETopTechniquesProps {
  techniques: MITRETechnique[]
}

export interface ExtendedKPIStats {
  openIncidents?: number | null
  criticalVulnerabilities?: number | null
  highRiskEntities?: number | null
  activeAttackPaths?: number | null
  complianceScore?: number | null
  soarExecutions?: number | null
  systemHealthScore?: number | null
  jobBacklog?: number | null
  onlineAiAgents?: number | null
  failingConnectors?: number | null
}

export interface ExtendedKpiAccess {
  openIncidents: boolean
  criticalVulnerabilities: boolean
  highRiskEntities: boolean
  activeAttackPaths: boolean
  complianceScore: boolean
  soarExecutions: boolean
  systemHealthScore: boolean
  jobBacklog: boolean
  onlineAiAgents: boolean
  failingConnectors: boolean
}

export interface RecentActivityItem {
  id: string
  type: string
  actorName: string
  title: string
  message: string
  createdAt: string
  isRead: boolean
}

export interface RecentActivityFeedProps {
  items: RecentActivityItem[]
  onViewAll?: (() => void) | undefined
}

export interface ActivityItemProps {
  item: RecentActivityItem
  tNotifications: (key: string) => string
  resolveMessage: (message: string) => string
  locale: string
}

export interface ExtendedKPIItem {
  labelKey: string
  value: number | string
  route: string
}

export interface ExtendedKpiCandidate {
  labelKey: string
  value: number | string | null | undefined
  route: string
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

export interface DashboardIncidentStatusEntry {
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
  lastTriggeredAt: string | null
  createdAt: string
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
  incidentStatus: DashboardIncidentStatusEntry[]
  caseAging: DashboardCaseAgingMetrics
  rulePerformance: DashboardRulePerformanceSummary
  connectorSync: DashboardConnectorSyncSummary
  runtimeBacklog: DashboardRuntimeBacklog
  automationQuality: DashboardAutomationQuality
  exposureSummary: DashboardExposureSummary
}

export interface DashboardNarrativeItem {
  labelKey: string
  value: number | string
}

export interface DashboardNarrativeListProps {
  items: DashboardNarrativeItem[]
  t: (key: string) => string
}

export interface AiOperationsCanvasProps {
  automation: DashboardAutomationMetrics
  t: (key: string) => string
}

export interface DashboardMetricBarListItem {
  id: string
  label: string
  value: number | string
  progress: number
  hitCount?: number
  falsePositiveCount?: number
  falsePositiveRate?: string
  createdAt?: string | null
  lastTriggeredAt?: string | null
}

export interface DashboardMetricBarListProps {
  items: DashboardMetricBarListItem[]
  emptyTitle: string
  emptyDescription: string
  hitCountLabel?: string
  falsePositiveCountLabel?: string
  falsePositiveRateLabel?: string
  createdAtLabel?: string
  lastTriggeredAtLabel?: string
}

export interface DashboardPanelState {
  density: DashboardDensity
  collapsed: DashboardPanelKey[]
}

export interface BackendSeverityDistributionEntry {
  severity: string
  count: number
}

export interface BackendSeverityDistributionResponse {
  tenantId: string
  distribution: BackendSeverityDistributionEntry[]
}

export interface AiDashboardInsightProps {
  t: (key: string) => string
}

export interface AiReportPanelProps {
  t: (key: string) => string
}

export interface AiDashboardInsightComponentProps {
  t: (key: string) => string
  dailySummary: AiResponse | null
  isDailySummaryLoading: boolean
  onGenerateSummary: () => void
  tCommon: (key: string) => string
}

export interface AiReportPanelComponentProps {
  t: (key: string) => string
  report: AiResponse | null
  selectedTimeRange: string
  onTimeRangeChange: (value: string) => void
  onGenerate: () => void
  isLoading: boolean
  tCommon: (key: string) => string
}
