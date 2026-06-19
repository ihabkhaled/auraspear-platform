import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { DashboardDensity, DashboardRulePerformanceMetric, Permission } from '@/enums'
import type { DashboardPanelKey } from '@/enums'
import { isConnectorType } from '@/lib/constants/connectors.constants'
import { EXTENDED_KPI_ROUTES } from '@/lib/constants/dashboard'
import { DASHBOARD_DENSITY_LABEL_KEYS } from '@/lib/constants/dashboard-preferences'
import { INCIDENT_STATUS_LABEL_KEYS } from '@/lib/constants/incidents'
import {
  buildDashboardAutomationQualityItems,
  buildDashboardCaseAgingItems,
  buildDashboardConnectorFailureItems,
  buildDashboardConnectorSyncItems,
  buildDashboardExposureSummaryItems,
  buildDashboardIncidentStatusItems,
  buildDashboardRulePerformanceItems,
  buildDashboardRuntimeBacklogItems,
} from '@/lib/dashboard-operations.utils'
import {
  buildDashboardPanelState,
  formatDashboardPercentage,
  getDashboardGapClass,
  getDashboardStackClass,
  isDashboardPanelOpen,
  persistDashboardDensity,
  readStoredDashboardDensity,
  toggleDashboardPanelPreference,
} from '@/lib/dashboard.utils'
import { computeHealthPercent } from '@/lib/health-utils'
import { canAccessRouteByPermission } from '@/lib/permissions'
import { lookup } from '@/lib/utils'
import { useAuthStore } from '@/stores'
import type { ExtendedKpiCandidate, ExtendedKPIItem, ExtendedKPIStats } from '@/types'
import { useServiceHealth } from './useAdmin'
import { useAiDashboard } from './useAiDashboard'
import {
  useDashboardOperationsOverview,
  useKPIs,
  useAlertTrends,
  useSeverityDistribution,
  useMITREStats,
  useAssetRisks,
  useDashboardAnalyticsOverview,
  useExtendedKPIs,
} from './useDashboard'
import { usePreferences, useUpdatePreferences } from './useSettings'

export function useDashboardPage() {
  const t = useTranslations('dashboard')
  const tIncidents = useTranslations('incidents')
  const router = useRouter()
  const permissions = useAuthStore(s => s.permissions)
  const canViewAlertAnalytics = canAccessRouteByPermission(permissions, '/alerts')
  const canViewPipelineHealth = canAccessRouteByPermission(permissions, '/system-health')
  const { data: kpis, isLoading: kpisLoading } = useKPIs()
  const { data: trends, isLoading: trendsLoading } = useAlertTrends(canViewAlertAnalytics)
  const { data: severityDistribution, isLoading: severityLoading } =
    useSeverityDistribution(canViewAlertAnalytics)
  const { data: mitre, isLoading: mitreLoading } = useMITREStats(canViewAlertAnalytics)
  const { data: assets, isLoading: assetsLoading } = useAssetRisks(canViewAlertAnalytics)
  const { data: health, isLoading: healthLoading } = useServiceHealth(canViewPipelineHealth)
  const { data: extendedKPIs, isLoading: extendedKPIsLoading } = useExtendedKPIs()
  const { data: analyticsOverview, isLoading: analyticsOverviewLoading } =
    useDashboardAnalyticsOverview()
  const { data: operationsOverview, isLoading: operationsOverviewLoading } =
    useDashboardOperationsOverview()
  const {
    dailySummary,
    isDailySummaryLoading,
    generateDailySummary,
    tCommon: aiTCommon,
  } = useAiDashboard()
  const { data: preferences } = usePreferences()
  const updatePreferences = useUpdatePreferences()
  const healthServices = health?.data ?? []
  const healthPercent = computeHealthPercent(healthServices)
  const panelState = useMemo(() => buildDashboardPanelState(preferences), [preferences])
  const canUpdateSettings = permissions.includes(Permission.SETTINGS_UPDATE)
  const densityOptions = useMemo(() => Object.values(DashboardDensity), [])
  const storedDensity = useMemo(() => readStoredDashboardDensity(), [])
  const [userSelectedDensity, setUserSelectedDensity] = useState<DashboardDensity | null>(null)
  const panelDensity =
    userSelectedDensity ?? preferences?.dashboardDensity ?? storedDensity ?? panelState.density

  const panelGapClass = useMemo(() => getDashboardGapClass(panelDensity), [panelDensity])
  const panelStackClass = useMemo(() => getDashboardStackClass(panelDensity), [panelDensity])

  const canAccessRoute = useCallback(
    (route: string) => canAccessRouteByPermission(permissions, route),
    [permissions]
  )

  const navigateToRoute = useCallback(
    (route: string) => {
      if (!canAccessRoute(route)) {
        return
      }
      router.push(route)
    },
    [canAccessRoute, router]
  )

  const handleDensityChange = useCallback(
    (density: DashboardDensity) => {
      setUserSelectedDensity(density)
      persistDashboardDensity(density)

      if (canUpdateSettings) {
        updatePreferences.mutate({ dashboardDensity: density })
      }
    },
    [canUpdateSettings, updatePreferences]
  )

  const isPanelOpen = useCallback(
    (panelKey: DashboardPanelKey): boolean => isDashboardPanelOpen(panelState.collapsed, panelKey),
    [panelState.collapsed]
  )

  const handlePanelOpenChange = useCallback(
    (panelKey: DashboardPanelKey, open: boolean) => {
      const collapsedDashboardPanels = toggleDashboardPanelPreference(
        panelState.collapsed,
        panelKey,
        open
      )
      updatePreferences.mutate({ collapsedDashboardPanels })
    },
    [panelState.collapsed, updatePreferences]
  )

  const handleServiceClick = useCallback(
    (connectorType: string) => {
      const route = `/connectors/${connectorType}`
      if (isConnectorType(connectorType) && canAccessRoute(route)) {
        router.push(route)
      }
    },
    [canAccessRoute, router]
  )

  const extendedKPIItems: ExtendedKPIItem[] = useMemo(() => {
    const stats = extendedKPIs?.data as ExtendedKPIStats | null | undefined
    if (!stats) {
      return []
    }
    const items: ExtendedKpiCandidate[] = [
      {
        labelKey: 'openIncidents',
        value: stats.openIncidents,
        route: EXTENDED_KPI_ROUTES.openIncidents,
      },
      {
        labelKey: 'criticalVulnerabilities',
        value: stats.criticalVulnerabilities,
        route: EXTENDED_KPI_ROUTES.criticalVulnerabilities,
      },
      {
        labelKey: 'highRiskEntities',
        value: stats.highRiskEntities,
        route: EXTENDED_KPI_ROUTES.highRiskEntities,
      },
      {
        labelKey: 'activeAttackPaths',
        value: stats.activeAttackPaths,
        route: EXTENDED_KPI_ROUTES.activeAttackPaths,
      },
      {
        labelKey: 'complianceScore',
        value:
          stats.complianceScore === undefined
            ? undefined
            : formatDashboardPercentage(stats.complianceScore),
        route: EXTENDED_KPI_ROUTES.complianceScore,
      },
      {
        labelKey: 'soarExecutions',
        value: stats.soarExecutions,
        route: EXTENDED_KPI_ROUTES.soarExecutions,
      },
      {
        labelKey: 'systemHealthScore',
        value:
          stats.systemHealthScore === undefined
            ? undefined
            : formatDashboardPercentage(stats.systemHealthScore),
        route: EXTENDED_KPI_ROUTES.systemHealthScore,
      },
      {
        labelKey: 'jobBacklog',
        value: stats.jobBacklog,
        route: EXTENDED_KPI_ROUTES.jobBacklog,
      },
      {
        labelKey: 'onlineAiAgents',
        value: stats.onlineAiAgents,
        route: EXTENDED_KPI_ROUTES.onlineAiAgents,
      },
      {
        labelKey: 'failingConnectors',
        value: stats.failingConnectors,
        route: EXTENDED_KPI_ROUTES.failingConnectors,
      },
    ]

    return items.filter(
      (item): item is ExtendedKPIItem & { value: number | string } => item.value !== undefined
    )
  }, [extendedKPIs?.data])

  const analyticsData = analyticsOverview?.data
  const operationsData = operationsOverview?.data

  const overviewItems = useMemo(
    () => [
      { labelKey: 'alertsLast24h', value: analyticsData?.overview.alertsLast24h ?? 0 },
      { labelKey: 'resolvedLast24h', value: analyticsData?.overview.resolvedLast24h ?? 0 },
      { labelKey: 'openIncidents', value: analyticsData?.overview.openIncidents ?? 0 },
      {
        labelKey: 'criticalVulnerabilities',
        value: analyticsData?.overview.criticalVulnerabilities ?? 0,
      },
      { labelKey: 'connectedSources', value: analyticsData?.overview.connectedSources ?? 0 },
      { labelKey: 'completedReports', value: analyticsData?.overview.completedReports ?? 0 },
    ],
    [analyticsData]
  )

  const threatOperationItems = useMemo(
    () => [
      { labelKey: 'alertsThisWeek', value: analyticsData?.threatOperations.totalAlerts7d ?? 0 },
      {
        labelKey: 'criticalAlertsThisWeek',
        value: analyticsData?.threatOperations.criticalAlerts7d ?? 0,
      },
      { labelKey: 'openCases', value: analyticsData?.threatOperations.openCases ?? 0 },
      { labelKey: 'openIncidents', value: analyticsData?.threatOperations.openIncidents ?? 0 },
      {
        labelKey: 'activeAttackPaths',
        value: analyticsData?.threatOperations.activeAttackPaths ?? 0,
      },
      {
        labelKey: 'highVulnerabilities',
        value: analyticsData?.threatOperations.highVulnerabilities ?? 0,
      },
    ],
    [analyticsData]
  )

  const governanceItems = useMemo(
    () => [
      { labelKey: 'passedControls', value: analyticsData?.governance.passedControls ?? 0 },
      { labelKey: 'failedControls', value: analyticsData?.governance.failedControls ?? 0 },
      {
        labelKey: 'notAssessedControls',
        value: analyticsData?.governance.notAssessedControls ?? 0,
      },
      { labelKey: 'complianceScore', value: `${analyticsData?.governance.complianceScore ?? 0}%` },
      {
        labelKey: 'availableTemplates',
        value: analyticsData?.governance.availableTemplates ?? 0,
      },
      { labelKey: 'totalFrameworks', value: analyticsData?.governance.totalFrameworks ?? 0 },
    ],
    [analyticsData]
  )

  const automationItems = useMemo(
    () => [
      { labelKey: 'onlineAiAgents', value: analyticsData?.automation.onlineAgents ?? 0 },
      { labelKey: 'aiSessions24h', value: analyticsData?.automation.aiSessions24h ?? 0 },
      { labelKey: 'pendingJobs', value: analyticsData?.automation.pendingJobs ?? 0 },
      { labelKey: 'runningJobs', value: analyticsData?.automation.runningJobs ?? 0 },
      { labelKey: 'failedJobs', value: analyticsData?.automation.failedJobs ?? 0 },
      {
        labelKey: 'healthyConnectors',
        value: analyticsData?.automation.healthyConnectors ?? 0,
      },
    ],
    [analyticsData]
  )

  const infrastructureItems = useMemo(
    () => [
      {
        labelKey: 'enabledConnectors',
        value: analyticsData?.infrastructure.enabledConnectors ?? 0,
      },
      {
        labelKey: 'healthyConnectors',
        value: analyticsData?.infrastructure.healthyConnectors ?? 0,
      },
      {
        labelKey: 'failingConnectors',
        value: analyticsData?.infrastructure.failingConnectors ?? 0,
      },
      { labelKey: 'totalJobs', value: analyticsData?.infrastructure.totalJobs ?? 0 },
      { labelKey: 'delayedJobs', value: analyticsData?.infrastructure.delayedJobs ?? 0 },
      {
        labelKey: 'generatedReports30d',
        value: analyticsData?.infrastructure.generatedReports30d ?? 0,
      },
    ],
    [analyticsData]
  )

  const incidentStatusItems = useMemo(
    () =>
      buildDashboardIncidentStatusItems(operationsData?.incidentStatus, status =>
        tIncidents(lookup(INCIDENT_STATUS_LABEL_KEYS, status))
      ),
    [operationsData?.incidentStatus, tIncidents]
  )

  const caseAgingItems = useMemo(
    () => buildDashboardCaseAgingItems(operationsData?.caseAging),
    [operationsData?.caseAging]
  )

  const topRuleItems = useMemo(
    () =>
      buildDashboardRulePerformanceItems(
        operationsData?.rulePerformance.topRules,
        DashboardRulePerformanceMetric.HIT_COUNT
      ),
    [operationsData?.rulePerformance.topRules]
  )

  const noisyRuleItems = useMemo(
    () =>
      buildDashboardRulePerformanceItems(
        operationsData?.rulePerformance.noisyRules,
        DashboardRulePerformanceMetric.FALSE_POSITIVE_RATE
      ),
    [operationsData?.rulePerformance.noisyRules]
  )

  const connectorSyncItems = useMemo(
    () => buildDashboardConnectorSyncItems(operationsData?.connectorSync),
    [operationsData?.connectorSync]
  )

  const connectorFailureItems = useMemo(
    () => buildDashboardConnectorFailureItems(operationsData?.connectorSync.topFailingConnectors),
    [operationsData?.connectorSync.topFailingConnectors]
  )

  const runtimeBacklogItems = useMemo(
    () => buildDashboardRuntimeBacklogItems(operationsData?.runtimeBacklog),
    [operationsData?.runtimeBacklog]
  )

  const automationQualityItems = useMemo(
    () => buildDashboardAutomationQualityItems(operationsData?.automationQuality),
    [operationsData?.automationQuality]
  )

  const exposureSummaryItems = useMemo(
    () => buildDashboardExposureSummaryItems(operationsData?.exposureSummary),
    [operationsData?.exposureSummary]
  )

  return {
    t,
    kpis,
    kpisLoading,
    trends,
    trendsLoading,
    severityDistribution,
    severityLoading,
    mitre,
    mitreLoading,
    assets,
    assetsLoading,
    healthLoading,
    healthServices,
    healthPercent,
    handleServiceClick,
    canAccessRoute,
    canViewAlertAnalytics,
    canViewPipelineHealth,
    navigateToRoute,
    extendedKPIItems,
    extendedKPIsLoading,
    analyticsOverview: analyticsData,
    analyticsOverviewLoading,
    operationsOverview: operationsData,
    operationsOverviewLoading,
    overviewItems,
    threatOperationItems,
    incidentStatusItems,
    caseAgingItems,
    topRuleItems,
    noisyRuleItems,
    connectorSyncItems,
    connectorFailureItems,
    runtimeBacklogItems,
    automationQualityItems,
    exposureSummaryItems,
    governanceItems,
    automationItems,
    infrastructureItems,
    densityOptions,
    densityLabelKeys: DASHBOARD_DENSITY_LABEL_KEYS,
    panelDensity,
    panelGapClass,
    panelStackClass,
    handleDensityChange,
    isPanelOpen,
    handlePanelOpenChange,
    isUpdatingPreferences: canUpdateSettings && updatePreferences.isPending,
    dailySummary,
    isDailySummaryLoading,
    generateDailySummary,
    aiTCommon,
  }
}
