import { DashboardRulePerformanceMetric } from '@/enums'
import type { IncidentStatus } from '@/enums'
import { CONNECTOR_META } from '@/lib/constants/connectors.constants'
import { formatPercentage, lookup } from '@/lib/utils'
import type {
  DashboardAutomationQuality,
  DashboardCaseAgingMetrics,
  DashboardConnectorFailureEntry,
  DashboardConnectorSyncSummary,
  DashboardExposureSummary,
  DashboardIncidentStatusEntry,
  DashboardMetricBarListItem,
  DashboardNarrativeItem,
  DashboardRulePerformanceEntry,
  DashboardRuntimeBacklog,
} from '@/types'

const EMPTY_PROGRESS = 0
const FULL_PROGRESS = 100

function buildProgressValue(value: number, maxValue: number): number {
  if (value <= 0 || maxValue <= 0) {
    return EMPTY_PROGRESS
  }

  const rawProgress = Math.round((value / maxValue) * FULL_PROGRESS)
  return Math.max(12, rawProgress)
}

function getMaxValue(values: number[]): number {
  let currentMax = 0

  for (const value of values) {
    if (value > currentMax) {
      currentMax = value
    }
  }

  return currentMax
}

function resolveConnectorLabel(
  connectorType: DashboardConnectorFailureEntry['connectorType']
): string {
  const connectorMeta = lookup(CONNECTOR_META, connectorType)
  return connectorMeta?.label ?? connectorType
}

export function buildDashboardIncidentStatusItems(
  items: DashboardIncidentStatusEntry[] | undefined,
  resolveStatusLabel: (status: IncidentStatus) => string
): DashboardMetricBarListItem[] {
  if (!items || items.length === 0) {
    return []
  }

  const maxValue = getMaxValue(items.map(item => item.count))

  return items.map(item => ({
    id: item.status,
    label: resolveStatusLabel(item.status),
    value: item.count,
    progress: buildProgressValue(item.count, maxValue),
  }))
}

export function buildDashboardRulePerformanceItems(
  items: DashboardRulePerformanceEntry[] | undefined,
  metric: DashboardRulePerformanceMetric
): DashboardMetricBarListItem[] {
  if (!items || items.length === 0) {
    return []
  }

  const values = items.map(item =>
    metric === DashboardRulePerformanceMetric.HIT_COUNT ? item.hitCount : item.falsePositiveRate
  )
  const maxValue = getMaxValue(values)

  return items.map(item => {
    const rawValue =
      metric === DashboardRulePerformanceMetric.HIT_COUNT ? item.hitCount : item.falsePositiveRate
    const value =
      metric === DashboardRulePerformanceMetric.HIT_COUNT ? rawValue : formatPercentage(rawValue)

    return {
      id: item.id,
      label: item.name,
      value,
      progress: buildProgressValue(rawValue, maxValue),
      hitCount: item.hitCount,
      falsePositiveCount: item.falsePositiveCount,
      falsePositiveRate: formatPercentage(item.falsePositiveRate),
      createdAt: item.createdAt,
      lastTriggeredAt: item.lastTriggeredAt,
    }
  })
}

export function buildDashboardConnectorFailureItems(
  items: DashboardConnectorFailureEntry[] | undefined
): DashboardMetricBarListItem[] {
  if (!items || items.length === 0) {
    return []
  }

  const maxValue = getMaxValue(items.map(item => item.failures))

  return items.map(item => ({
    id: item.connectorType,
    label: resolveConnectorLabel(item.connectorType),
    value: item.failures,
    progress: buildProgressValue(item.failures, maxValue),
  }))
}

export function buildDashboardCaseAgingItems(
  caseAging: DashboardCaseAgingMetrics | undefined
): DashboardNarrativeItem[] {
  if (!caseAging) {
    return []
  }

  return [
    { labelKey: 'openCases', value: caseAging.openCases },
    { labelKey: 'unassignedCases', value: caseAging.unassignedCases },
    { labelKey: 'agedOverSevenDays', value: caseAging.agedOverSevenDays },
    { labelKey: 'agedOverFourteenDays', value: caseAging.agedOverFourteenDays },
    { labelKey: 'meanOpenAgeHours', value: `${caseAging.meanOpenAgeHours}h` },
  ]
}

export function buildDashboardConnectorSyncItems(
  connectorSync: DashboardConnectorSyncSummary | undefined
): DashboardNarrativeItem[] {
  if (!connectorSync) {
    return []
  }

  return [
    { labelKey: 'completedRuns7d', value: connectorSync.completedRuns7d },
    { labelKey: 'failedRuns7d', value: connectorSync.failedRuns7d },
    { labelKey: 'runningSyncs', value: connectorSync.runningSyncs },
  ]
}

export function buildDashboardRuntimeBacklogItems(
  runtimeBacklog: DashboardRuntimeBacklog | undefined
): DashboardNarrativeItem[] {
  if (!runtimeBacklog) {
    return []
  }

  return [
    { labelKey: 'pendingJobs', value: runtimeBacklog.pendingJobs },
    { labelKey: 'retryingJobs', value: runtimeBacklog.retryingJobs },
    { labelKey: 'failedJobs', value: runtimeBacklog.failedJobs },
    { labelKey: 'staleRunningJobs', value: runtimeBacklog.staleRunningJobs },
    { labelKey: 'queuedConnectorSyncJobs', value: runtimeBacklog.queuedConnectorSyncJobs },
    { labelKey: 'queuedReportJobs', value: runtimeBacklog.queuedReportJobs },
  ]
}

export function buildDashboardAutomationQualityItems(
  automationQuality: DashboardAutomationQuality | undefined
): DashboardNarrativeItem[] {
  if (!automationQuality) {
    return []
  }

  return [
    { labelKey: 'aiSessions24h', value: automationQuality.aiSessions24h },
    {
      labelKey: 'successfulAiSessions24h',
      value: automationQuality.successfulAiSessions24h,
    },
    { labelKey: 'failedAiSessions24h', value: automationQuality.failedAiSessions24h },
    {
      labelKey: 'averageAiDurationSeconds',
      value: `${automationQuality.averageAiDurationSeconds}s`,
    },
    { labelKey: 'completedSoarRuns30d', value: automationQuality.completedSoarRuns30d },
    { labelKey: 'failedSoarRuns30d', value: automationQuality.failedSoarRuns30d },
    {
      labelKey: 'averageSoarCompletionRate',
      value: formatPercentage(automationQuality.averageSoarCompletionRate),
    },
  ]
}

export function buildDashboardExposureSummaryItems(
  exposureSummary: DashboardExposureSummary | undefined
): DashboardNarrativeItem[] {
  if (!exposureSummary) {
    return []
  }

  return [
    {
      labelKey: 'criticalVulnerabilities',
      value: exposureSummary.criticalVulnerabilities,
    },
    {
      labelKey: 'exploitAvailableVulnerabilities',
      value: exposureSummary.exploitAvailableVulnerabilities,
    },
    { labelKey: 'openCloudFindings', value: exposureSummary.openCloudFindings },
    { labelKey: 'criticalCloudFindings', value: exposureSummary.criticalCloudFindings },
    { labelKey: 'passedControls', value: exposureSummary.passedControls },
    { labelKey: 'failedControls', value: exposureSummary.failedControls },
  ]
}
