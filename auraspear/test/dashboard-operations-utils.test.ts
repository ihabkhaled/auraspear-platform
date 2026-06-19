import { describe, expect, it } from 'vitest'
import { ConnectorType, DashboardRulePerformanceMetric, IncidentStatus } from '@/enums'
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

describe('dashboard operations utils', () => {
  it('builds incident status items with proportional progress', () => {
    const items = buildDashboardIncidentStatusItems(
      [
        { status: IncidentStatus.OPEN, count: 8 },
        { status: IncidentStatus.IN_PROGRESS, count: 4 },
      ],
      status => status
    )

    expect(items).toEqual([
      { id: IncidentStatus.OPEN, label: IncidentStatus.OPEN, value: 8, progress: 100 },
      { id: IncidentStatus.IN_PROGRESS, label: IncidentStatus.IN_PROGRESS, value: 4, progress: 50 },
    ])
  })

  it('formats top rule items as counts and noisy rule items as percentages', () => {
    const rules = [
      {
        id: 'rule-1',
        name: 'Credential Abuse',
        hitCount: 20,
        falsePositiveCount: 5,
        falsePositiveRate: 25,
        lastTriggeredAt: null,
        createdAt: '2026-03-18T10:00:00.000Z',
      },
      {
        id: 'rule-2',
        name: 'Admin Login Spike',
        hitCount: 10,
        falsePositiveCount: 6,
        falsePositiveRate: 60,
        lastTriggeredAt: null,
        createdAt: '2026-03-17T10:00:00.000Z',
      },
    ]

    const hitCountItems = buildDashboardRulePerformanceItems(
      rules,
      DashboardRulePerformanceMetric.HIT_COUNT
    )

    expect(hitCountItems).toEqual([
      {
        id: 'rule-1',
        label: 'Credential Abuse',
        value: 20,
        progress: 100,
        hitCount: 20,
        falsePositiveCount: 5,
        falsePositiveRate: '25.0%',
        createdAt: '2026-03-18T10:00:00.000Z',
        lastTriggeredAt: null,
      },
      {
        id: 'rule-2',
        label: 'Admin Login Spike',
        value: 10,
        progress: 50,
        hitCount: 10,
        falsePositiveCount: 6,
        falsePositiveRate: '60.0%',
        createdAt: '2026-03-17T10:00:00.000Z',
        lastTriggeredAt: null,
      },
    ])

    const fpItems = buildDashboardRulePerformanceItems(
      rules,
      DashboardRulePerformanceMetric.FALSE_POSITIVE_RATE
    )

    expect(fpItems).toEqual([
      {
        id: 'rule-1',
        label: 'Credential Abuse',
        value: '25.0%',
        progress: 42,
        hitCount: 20,
        falsePositiveCount: 5,
        falsePositiveRate: '25.0%',
        createdAt: '2026-03-18T10:00:00.000Z',
        lastTriggeredAt: null,
      },
      {
        id: 'rule-2',
        label: 'Admin Login Spike',
        value: '60.0%',
        progress: 100,
        hitCount: 10,
        falsePositiveCount: 6,
        falsePositiveRate: '60.0%',
        createdAt: '2026-03-17T10:00:00.000Z',
        lastTriggeredAt: null,
      },
    ])
  })

  it('builds connector failure items using connector labels', () => {
    const items = buildDashboardConnectorFailureItems([
      { connectorType: ConnectorType.WAZUH, failures: 4 },
      { connectorType: ConnectorType.MISP, failures: 2 },
    ])

    expect(items).toEqual([
      { id: ConnectorType.WAZUH, label: 'Wazuh', value: 4, progress: 100 },
      { id: ConnectorType.MISP, label: 'MISP', value: 2, progress: 50 },
    ])
  })

  it('builds dashboard narrative items for the operational summaries', () => {
    expect(
      buildDashboardCaseAgingItems({
        openCases: 12,
        unassignedCases: 3,
        agedOverSevenDays: 4,
        agedOverFourteenDays: 1,
        meanOpenAgeHours: 18,
      })
    ).toEqual([
      { labelKey: 'openCases', value: 12 },
      { labelKey: 'unassignedCases', value: 3 },
      { labelKey: 'agedOverSevenDays', value: 4 },
      { labelKey: 'agedOverFourteenDays', value: 1 },
      { labelKey: 'meanOpenAgeHours', value: '18h' },
    ])

    expect(
      buildDashboardConnectorSyncItems({
        completedRuns7d: 9,
        failedRuns7d: 2,
        runningSyncs: 1,
        topFailingConnectors: [],
      })
    ).toEqual([
      { labelKey: 'completedRuns7d', value: 9 },
      { labelKey: 'failedRuns7d', value: 2 },
      { labelKey: 'runningSyncs', value: 1 },
    ])

    expect(
      buildDashboardRuntimeBacklogItems({
        pendingJobs: 6,
        retryingJobs: 1,
        failedJobs: 2,
        staleRunningJobs: 1,
        queuedConnectorSyncJobs: 2,
        queuedReportJobs: 3,
      })
    ).toEqual([
      { labelKey: 'pendingJobs', value: 6 },
      { labelKey: 'retryingJobs', value: 1 },
      { labelKey: 'failedJobs', value: 2 },
      { labelKey: 'staleRunningJobs', value: 1 },
      { labelKey: 'queuedConnectorSyncJobs', value: 2 },
      { labelKey: 'queuedReportJobs', value: 3 },
    ])

    expect(
      buildDashboardAutomationQualityItems({
        aiSessions24h: 11,
        successfulAiSessions24h: 8,
        failedAiSessions24h: 3,
        averageAiDurationSeconds: 5.4,
        completedSoarRuns30d: 10,
        failedSoarRuns30d: 2,
        averageSoarCompletionRate: 92.3,
      })
    ).toEqual([
      { labelKey: 'aiSessions24h', value: 11 },
      { labelKey: 'successfulAiSessions24h', value: 8 },
      { labelKey: 'failedAiSessions24h', value: 3 },
      { labelKey: 'averageAiDurationSeconds', value: '5.4s' },
      { labelKey: 'completedSoarRuns30d', value: 10 },
      { labelKey: 'failedSoarRuns30d', value: 2 },
      { labelKey: 'averageSoarCompletionRate', value: '92.3%' },
    ])

    expect(
      buildDashboardExposureSummaryItems({
        criticalVulnerabilities: 7,
        exploitAvailableVulnerabilities: 4,
        openCloudFindings: 12,
        criticalCloudFindings: 3,
        passedControls: 40,
        failedControls: 5,
      })
    ).toEqual([
      { labelKey: 'criticalVulnerabilities', value: 7 },
      { labelKey: 'exploitAvailableVulnerabilities', value: 4 },
      { labelKey: 'openCloudFindings', value: 12 },
      { labelKey: 'criticalCloudFindings', value: 3 },
      { labelKey: 'passedControls', value: 40 },
      { labelKey: 'failedControls', value: 5 },
    ])
  })
})
