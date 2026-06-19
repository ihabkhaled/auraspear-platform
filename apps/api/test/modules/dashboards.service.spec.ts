import {
  AiAgentSessionStatus,
  AiAgentStatus,
  AttackPathStatus,
  ConnectorType,
  ComplianceControlStatus,
  IncidentStatus,
  SoarExecutionStatus,
  SyncJobStatus,
  VulnerabilitySeverity,
} from '../../src/common/enums'
import { toDay, nowDate } from '../../src/common/utils/date-time.utility'
import { DashboardsService } from '../../src/modules/dashboards/dashboards.service'
import { JobStatus } from '../../src/modules/jobs/enums/job.enums'

const mockAppLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}

function createMockRepository() {
  return {
    countOpenCases: jest.fn(),
    countAlertsSince: jest.fn(),
    countResolvedAlertsSince: jest.fn(),
    getAvgResolutionMsSince: jest.fn(),
    countAlertsBetween: jest.fn(),
    countAlertsBetweenExclusiveEnd: jest.fn(),
    countCriticalAlertsBetween: jest.fn(),
    countCriticalAlertsBetweenExclusiveEnd: jest.fn(),
    countCasesCreatedBetween: jest.fn(),
    countCasesCreatedBetweenExclusiveEnd: jest.fn(),
    getAvgResolutionMsBetween: jest.fn(),
    getAvgResolutionMsBetweenExclusiveEnd: jest.fn(),
    getAlertCountsByDateAndSeverity: jest.fn(),
    groupAlertsBySeveritySince: jest.fn(),
    getTopMitreTechniques: jest.fn(),
    getTopTargetedAssets: jest.fn(),
    findEnabledConnectors: jest.fn(),
    countOpenIncidents: jest.fn(),
    countVulnerabilitiesBySeverity: jest.fn(),
    countExploitAvailableVulnerabilities: jest.fn(),
    countAttackPathsByStatus: jest.fn(),
    countAiAgentsByStatus: jest.fn(),
    countAiAgentSessionsSince: jest.fn(),
    countJobsByStatus: jest.fn(),
    countJobs: jest.fn(),
    countDelayedJobs: jest.fn(),
    countComplianceFrameworks: jest.fn(),
    countComplianceControlsByStatus: jest.fn(),
    countCompletedReports: jest.fn(),
    countCompletedReportsSince: jest.fn(),
    countAvailableReportTemplates: jest.fn(),
    groupIncidentsByStatus: jest.fn(),
    countUnassignedOpenCases: jest.fn(),
    countOpenCasesOlderThan: jest.fn(),
    getAverageOpenCaseAgeHours: jest.fn(),
    countActiveDetectionRules: jest.fn(),
    findTopDetectionRules: jest.fn(),
    findTopNoisyDetectionRules: jest.fn(),
    groupConnectorSyncJobsByStatusSince: jest.fn(),
    getTopFailingConnectorTypes: jest.fn(),
    countJobsByTypeAndStatuses: jest.fn(),
    countStaleRunningJobs: jest.fn(),
    groupAiAgentSessionsByStatusSince: jest.fn(),
    getAverageAiSessionDurationMsSince: jest.fn(),
    groupSoarExecutionsByStatusSince: jest.fn(),
    getAverageSoarCompletionRateSince: jest.fn(),
    countCloudFindingsByStatus: jest.fn(),
    countCloudFindingsBySeverity: jest.fn(),
  }
}

function createMockConnectorsService() {
  return {
    getEnabledConnectors: jest.fn(),
  }
}

const TENANT_ID = 'tenant-001'

describe('DashboardsService', () => {
  let service: DashboardsService
  let repository: ReturnType<typeof createMockRepository>
  let connectorsService: ReturnType<typeof createMockConnectorsService>

  beforeEach(() => {
    repository = createMockRepository()
    connectorsService = createMockConnectorsService()
    service = new DashboardsService(
      repository as never,
      connectorsService as never,
      mockAppLogger as never
    )
    jest.clearAllMocks()
  })

  /* ------------------------------------------------------------------ */
  /* getSummary                                                          */
  /* ------------------------------------------------------------------ */

  describe('getSummary', () => {
    it('should return all KPI fields with correct values', async () => {
      // openCases
      repository.countOpenCases.mockResolvedValueOnce(12)
      // alertsLast24h
      repository.countAlertsSince.mockResolvedValueOnce(45)
      // resolvedLast24h
      repository.countResolvedAlertsSince.mockResolvedValueOnce(8)
      // avgResolutionTime (overall MTTR)
      repository.getAvgResolutionMsSince.mockResolvedValueOnce([{ avg_ms: 300000 }])
      // alertsCurrentWeek
      repository.countAlertsBetween.mockResolvedValueOnce(150)
      // criticalCurrentWeek
      repository.countCriticalAlertsBetween.mockResolvedValueOnce(20)
      // casesCurrentWeek
      repository.countCasesCreatedBetween.mockResolvedValueOnce(10)
      // mttrCurrentWeek
      repository.getAvgResolutionMsBetween.mockResolvedValueOnce([{ avg_ms: 240000 }])
      // alertsPreviousWeek
      repository.countAlertsBetweenExclusiveEnd.mockResolvedValueOnce(100)
      // criticalPreviousWeek
      repository.countCriticalAlertsBetweenExclusiveEnd.mockResolvedValueOnce(10)
      // casesPreviousWeek
      repository.countCasesCreatedBetweenExclusiveEnd.mockResolvedValueOnce(8)
      // mttrPreviousWeek
      repository.getAvgResolutionMsBetweenExclusiveEnd.mockResolvedValueOnce([{ avg_ms: 200000 }])
      // getEnabledConnectors
      connectorsService.getEnabledConnectors.mockResolvedValueOnce([
        { type: 'wazuh', name: 'Wazuh' },
        { type: 'misp', name: 'MISP' },
      ])

      const result = await service.getSummary(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.totalAlerts).toBe(150)
      expect(result.criticalAlerts).toBe(20)
      expect(result.openCases).toBe(12)
      expect(result.alertsLast24h).toBe(45)
      expect(result.resolvedLast24h).toBe(8)
      expect(result.meanTimeToRespond).toBe('5m')
      expect(result.connectedSources).toBe(2)
      // Trend: (150 - 100) / 100 * 100 = 50.0
      expect(result.totalAlertsTrend).toBe(50)
      // Trend: (20 - 10) / 10 * 100 = 100.0
      expect(result.criticalAlertsTrend).toBe(100)
      // Trend: (10 - 8) / 8 * 100 = 25.0
      expect(result.openCasesTrend).toBe(25)
      // Trend: (240000 - 200000) / 200000 * 100 = 20.0
      expect(result.mttrTrend).toBe(20)
    })

    it('should return N/A for MTTR when no resolved alerts exist', async () => {
      repository.countOpenCases.mockResolvedValue(0)
      repository.countAlertsSince.mockResolvedValue(0)
      repository.countResolvedAlertsSince.mockResolvedValue(0)
      // avgResolutionTime — no resolved alerts
      repository.getAvgResolutionMsSince.mockResolvedValueOnce([{ avg_ms: null }])
      // Current week
      repository.countAlertsBetween.mockResolvedValue(0)
      repository.countCriticalAlertsBetween.mockResolvedValue(0)
      repository.countCasesCreatedBetween.mockResolvedValue(0)
      // mttrCurrentWeek
      repository.getAvgResolutionMsBetween.mockResolvedValueOnce([{ avg_ms: null }])
      // Previous week
      repository.countAlertsBetweenExclusiveEnd.mockResolvedValue(0)
      repository.countCriticalAlertsBetweenExclusiveEnd.mockResolvedValue(0)
      repository.countCasesCreatedBetweenExclusiveEnd.mockResolvedValue(0)
      // mttrPreviousWeek
      repository.getAvgResolutionMsBetweenExclusiveEnd.mockResolvedValueOnce([{ avg_ms: null }])
      connectorsService.getEnabledConnectors.mockResolvedValueOnce([])

      const result = await service.getSummary(TENANT_ID)

      expect(result.meanTimeToRespond).toBe('N/A')
    })

    it('should calculate trend as 100 when previousValue is 0 and currentValue > 0', async () => {
      repository.countOpenCases.mockResolvedValue(0)
      repository.countAlertsSince.mockResolvedValueOnce(0)
      repository.countResolvedAlertsSince.mockResolvedValueOnce(0)
      repository.getAvgResolutionMsSince.mockResolvedValue([{ avg_ms: null }])
      repository.countAlertsBetween.mockResolvedValueOnce(15)
      repository.countCriticalAlertsBetween.mockResolvedValueOnce(5)
      repository.countCasesCreatedBetween.mockResolvedValue(0)
      repository.getAvgResolutionMsBetween.mockResolvedValue([{ avg_ms: null }])
      repository.countAlertsBetweenExclusiveEnd.mockResolvedValueOnce(0)
      repository.countCriticalAlertsBetweenExclusiveEnd.mockResolvedValueOnce(0)
      repository.countCasesCreatedBetweenExclusiveEnd.mockResolvedValue(0)
      repository.getAvgResolutionMsBetweenExclusiveEnd.mockResolvedValue([{ avg_ms: null }])
      connectorsService.getEnabledConnectors.mockResolvedValueOnce([])

      const result = await service.getSummary(TENANT_ID)

      // prev=0, curr=15 → 100
      expect(result.totalAlertsTrend).toBe(100)
      // prev=0, curr=5 → 100
      expect(result.criticalAlertsTrend).toBe(100)
    })

    it('should calculate trend as 0 when both current and previous are 0', async () => {
      repository.countOpenCases.mockResolvedValue(0)
      repository.countAlertsSince.mockResolvedValue(0)
      repository.countResolvedAlertsSince.mockResolvedValue(0)
      repository.getAvgResolutionMsSince.mockResolvedValue([{ avg_ms: null }])
      repository.countAlertsBetween.mockResolvedValue(0)
      repository.countCriticalAlertsBetween.mockResolvedValue(0)
      repository.countCasesCreatedBetween.mockResolvedValue(0)
      repository.getAvgResolutionMsBetween.mockResolvedValue([{ avg_ms: null }])
      repository.countAlertsBetweenExclusiveEnd.mockResolvedValue(0)
      repository.countCriticalAlertsBetweenExclusiveEnd.mockResolvedValue(0)
      repository.countCasesCreatedBetweenExclusiveEnd.mockResolvedValue(0)
      repository.getAvgResolutionMsBetweenExclusiveEnd.mockResolvedValue([{ avg_ms: null }])
      connectorsService.getEnabledConnectors.mockResolvedValueOnce([])

      const result = await service.getSummary(TENANT_ID)

      expect(result.totalAlertsTrend).toBe(0)
      expect(result.criticalAlertsTrend).toBe(0)
      expect(result.openCasesTrend).toBe(0)
      expect(result.mttrTrend).toBe(0)
    })

    it('should calculate negative trend when current is less than previous', async () => {
      repository.countOpenCases.mockResolvedValueOnce(5)
      repository.countAlertsSince.mockResolvedValueOnce(10)
      repository.countResolvedAlertsSince.mockResolvedValueOnce(2)
      repository.getAvgResolutionMsSince.mockResolvedValueOnce([{ avg_ms: 180000 }])
      repository.countAlertsBetween.mockResolvedValueOnce(80)
      repository.countCriticalAlertsBetween.mockResolvedValueOnce(5)
      repository.countCasesCreatedBetween.mockResolvedValueOnce(3)
      repository.getAvgResolutionMsBetween.mockResolvedValueOnce([{ avg_ms: 150000 }])
      repository.countAlertsBetweenExclusiveEnd.mockResolvedValueOnce(100)
      repository.countCriticalAlertsBetweenExclusiveEnd.mockResolvedValueOnce(10)
      repository.countCasesCreatedBetweenExclusiveEnd.mockResolvedValueOnce(6)
      repository.getAvgResolutionMsBetweenExclusiveEnd.mockResolvedValueOnce([{ avg_ms: 200000 }])
      connectorsService.getEnabledConnectors.mockResolvedValueOnce([
        { type: 'wazuh', name: 'Wazuh' },
      ])

      const result = await service.getSummary(TENANT_ID)

      // (80 - 100) / 100 * 100 = -20
      expect(result.totalAlertsTrend).toBe(-20)
      // (5 - 10) / 10 * 100 = -50
      expect(result.criticalAlertsTrend).toBe(-50)
      // (3 - 6) / 6 * 100 = -50
      expect(result.openCasesTrend).toBe(-50)
      // (150000 - 200000) / 200000 * 100 = -25
      expect(result.mttrTrend).toBe(-25)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getAlertTrend                                                       */
  /* ------------------------------------------------------------------ */

  describe('getAlertTrend', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(toDay('2026-03-20T12:00:00Z').toDate())
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should return a zero-filled 7-day trend that includes today', async () => {
      repository.getAlertCountsByDateAndSeverity.mockResolvedValueOnce([
        { date: '2026-03-14', severity: 'critical', count: 5n },
        { date: '2026-03-14', severity: 'high', count: 10n },
        { date: '2026-03-18', severity: 'medium', count: 20n },
        { date: '2026-03-20', severity: 'low', count: 3n },
        { date: '2026-03-20', severity: 'info', count: 7n },
      ])

      const result = await service.getAlertTrend(TENANT_ID, 7)

      expect(repository.getAlertCountsByDateAndSeverity).toHaveBeenCalledWith(
        TENANT_ID,
        toDay('2026-03-14T00:00:00.000Z').toDate(),
        toDay('2026-03-21T00:00:00.000Z').toDate()
      )
      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.days).toBe(7)
      expect(result.trend).toEqual([
        {
          date: '2026-03-14',
          critical: 5,
          high: 10,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-15',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-16',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-17',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-18',
          critical: 0,
          high: 0,
          medium: 20,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-19',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-20',
          critical: 0,
          high: 0,
          medium: 0,
          low: 3,
          info: 7,
        },
      ])
    })

    it('should convert bigint counts to number', async () => {
      repository.getAlertCountsByDateAndSeverity.mockResolvedValueOnce([
        { date: '2026-03-20', severity: 'critical', count: 999n },
      ])

      const result = await service.getAlertTrend(TENANT_ID, 30)

      const today = result.trend.find(entry => entry.date === '2026-03-20')
      expect(today?.critical).toBe(999)
      expect(typeof today?.critical).toBe('number')
    })

    it('should return a zero-filled trend when there is no data', async () => {
      repository.getAlertCountsByDateAndSeverity.mockResolvedValueOnce([])

      const result = await service.getAlertTrend(TENANT_ID, 7)

      expect(result.trend).toEqual([
        {
          date: '2026-03-14',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-15',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-16',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-17',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-18',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-19',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
        {
          date: '2026-03-20',
          critical: 0,
          high: 0,
          medium: 0,
          low: 0,
          info: 0,
        },
      ])
    })

    it('should aggregate multiple severities for the same date', async () => {
      repository.getAlertCountsByDateAndSeverity.mockResolvedValueOnce([
        { date: '2026-03-18', severity: 'critical', count: 2n },
        { date: '2026-03-18', severity: 'high', count: 8n },
        { date: '2026-03-18', severity: 'medium', count: 15n },
        { date: '2026-03-18', severity: 'low', count: 30n },
        { date: '2026-03-18', severity: 'info', count: 50n },
      ])

      const result = await service.getAlertTrend(TENANT_ID, 7)

      const entry = result.trend.find(day => day.date === '2026-03-18')
      expect(entry).toEqual({
        date: '2026-03-18',
        critical: 2,
        high: 8,
        medium: 15,
        low: 30,
        info: 50,
      })
      expect(result.trend).toHaveLength(7)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getSeverityDistribution                                             */
  /* ------------------------------------------------------------------ */

  describe('getSeverityDistribution', () => {
    it('should return distribution with counts and percentages', async () => {
      repository.groupAlertsBySeveritySince.mockResolvedValueOnce([
        { severity: 'critical', _count: 10 },
        { severity: 'high', _count: 30 },
        { severity: 'medium', _count: 40 },
        { severity: 'low', _count: 15 },
        { severity: 'info', _count: 5 },
      ])

      const result = await service.getSeverityDistribution(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.distribution).toHaveLength(5)

      const critical = result.distribution.find(d => d.severity === 'critical')
      expect(critical).toEqual({ severity: 'critical', count: 10, percentage: 10 })

      const high = result.distribution.find(d => d.severity === 'high')
      expect(high).toEqual({ severity: 'high', count: 30, percentage: 30 })

      const medium = result.distribution.find(d => d.severity === 'medium')
      expect(medium).toEqual({ severity: 'medium', count: 40, percentage: 40 })
    })

    it('should handle empty distribution (total=0 gives percentage=0)', async () => {
      repository.groupAlertsBySeveritySince.mockResolvedValueOnce([])

      const result = await service.getSeverityDistribution(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.distribution).toEqual([])
    })

    it('should calculate percentages correctly with rounding', async () => {
      // 7 + 3 = 10 total => 70% and 30%
      repository.groupAlertsBySeveritySince.mockResolvedValueOnce([
        { severity: 'critical', _count: 7 },
        { severity: 'high', _count: 3 },
      ])

      const result = await service.getSeverityDistribution(TENANT_ID)

      expect(result.distribution).toEqual([
        { severity: 'critical', count: 7, percentage: 70 },
        { severity: 'high', count: 3, percentage: 30 },
      ])
    })

    it('should handle uneven percentage splits', async () => {
      // 1 + 2 = 3 total => 33.3% and 66.7%
      repository.groupAlertsBySeveritySince.mockResolvedValueOnce([
        { severity: 'low', _count: 1 },
        { severity: 'high', _count: 2 },
      ])

      const result = await service.getSeverityDistribution(TENANT_ID)

      const low = result.distribution.find(d => d.severity === 'low')
      const high = result.distribution.find(d => d.severity === 'high')
      // Math.round((1/3) * 1000) / 10 = Math.round(333.33) / 10 = 333 / 10 = 33.3
      expect(low?.percentage).toBe(33.3)
      // Math.round((2/3) * 1000) / 10 = Math.round(666.67) / 10 = 667 / 10 = 66.7
      expect(high?.percentage).toBe(66.7)
    })
  })

  /* ------------------------------------------------------------------ */
  /* getMitreTopTechniques                                               */
  /* ------------------------------------------------------------------ */

  describe('getMitreTopTechniques', () => {
    it('should return technique IDs and counts', async () => {
      repository.getTopMitreTechniques.mockResolvedValueOnce([
        { technique: 'T1059', count: 10n },
        { technique: 'T1053', count: 8n },
        { technique: 'T1071', count: 5n },
      ])

      const result = await service.getMitreTopTechniques(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.techniques).toEqual([
        { id: 'T1059', count: 10 },
        { id: 'T1053', count: 8 },
        { id: 'T1071', count: 5 },
      ])
    })

    it('should convert bigint counts to number', async () => {
      repository.getTopMitreTechniques.mockResolvedValueOnce([{ technique: 'T1059', count: 1234n }])

      const result = await service.getMitreTopTechniques(TENANT_ID)

      expect(result.techniques[0]?.count).toBe(1234)
      expect(typeof result.techniques[0]?.count).toBe('number')
    })

    it('should return empty techniques array when no data', async () => {
      repository.getTopMitreTechniques.mockResolvedValueOnce([])

      const result = await service.getMitreTopTechniques(TENANT_ID)

      expect(result.techniques).toEqual([])
    })
  })

  /* ------------------------------------------------------------------ */
  /* getTopTargetedAssets                                                 */
  /* ------------------------------------------------------------------ */

  describe('getTopTargetedAssets', () => {
    it('should return hostname, alertCount, criticalCount, and lastSeen', async () => {
      const lastSeen = toDay('2026-03-10T12:00:00Z').toDate()
      repository.getTopTargetedAssets.mockResolvedValueOnce([
        { hostname: 'web-01', alert_count: 50n, critical_count: 5n, last_seen: lastSeen },
        { hostname: 'db-01', alert_count: 30n, critical_count: 2n, last_seen: lastSeen },
      ])

      const result = await service.getTopTargetedAssets(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.assets).toEqual([
        { hostname: 'web-01', alertCount: 50, criticalCount: 5, lastSeen },
        { hostname: 'db-01', alertCount: 30, criticalCount: 2, lastSeen },
      ])
    })

    it('should convert bigint fields to number', async () => {
      repository.getTopTargetedAssets.mockResolvedValueOnce([
        {
          hostname: 'app-01',
          alert_count: 9999n,
          critical_count: 100n,
          last_seen: nowDate(),
        },
      ])

      const result = await service.getTopTargetedAssets(TENANT_ID)

      expect(typeof result.assets[0]?.alertCount).toBe('number')
      expect(typeof result.assets[0]?.criticalCount).toBe('number')
      expect(result.assets[0]?.alertCount).toBe(9999)
      expect(result.assets[0]?.criticalCount).toBe(100)
    })

    it('should return empty assets array when no data', async () => {
      repository.getTopTargetedAssets.mockResolvedValueOnce([])

      const result = await service.getTopTargetedAssets(TENANT_ID)

      expect(result.assets).toEqual([])
    })
  })

  /* ------------------------------------------------------------------ */
  /* getPipelineHealth                                                    */
  /* ------------------------------------------------------------------ */

  describe('getPipelineHealth', () => {
    it('should return healthy status when lastTestOk is true', async () => {
      repository.findEnabledConnectors.mockResolvedValueOnce([
        {
          type: 'wazuh',
          name: 'Wazuh SIEM',
          lastTestAt: toDay('2026-03-10T10:00:00Z').toDate(),
          lastTestOk: true,
          lastError: null,
        },
      ])

      const result = await service.getPipelineHealth(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.pipelines).toHaveLength(1)
      expect(result.pipelines[0]?.status).toBe('healthy')
      expect(result.pipelines[0]?.name).toBe('Wazuh SIEM')
      expect(result.pipelines[0]?.type).toBe('wazuh')
    })

    it('should return down status when lastTestOk is false', async () => {
      repository.findEnabledConnectors.mockResolvedValueOnce([
        {
          type: 'misp',
          name: 'MISP Feed',
          lastTestAt: toDay('2026-03-10T09:00:00Z').toDate(),
          lastTestOk: false,
          lastError: 'Connection refused',
        },
      ])

      const result = await service.getPipelineHealth(TENANT_ID)

      expect(result.pipelines[0]?.status).toBe('down')
      expect(result.pipelines[0]?.lastError).toBe('Connection refused')
    })

    it('should return unknown status when lastTestOk is null', async () => {
      repository.findEnabledConnectors.mockResolvedValueOnce([
        {
          type: 'graylog',
          name: 'Graylog',
          lastTestAt: null,
          lastTestOk: null,
          lastError: null,
        },
      ])

      const result = await service.getPipelineHealth(TENANT_ID)

      expect(result.pipelines[0]?.status).toBe('unknown')
      expect(result.pipelines[0]?.lastChecked).toBeNull()
    })

    it('should handle multiple connectors with mixed statuses', async () => {
      repository.findEnabledConnectors.mockResolvedValueOnce([
        {
          type: 'wazuh',
          name: 'Wazuh',
          lastTestAt: nowDate(),
          lastTestOk: true,
          lastError: null,
        },
        {
          type: 'misp',
          name: 'MISP',
          lastTestAt: nowDate(),
          lastTestOk: false,
          lastError: 'Timeout',
        },
        {
          type: 'graylog',
          name: 'Graylog',
          lastTestAt: null,
          lastTestOk: null,
          lastError: null,
        },
      ])

      const result = await service.getPipelineHealth(TENANT_ID)

      expect(result.pipelines).toHaveLength(3)
      expect(result.pipelines[0]?.status).toBe('healthy')
      expect(result.pipelines[1]?.status).toBe('down')
      expect(result.pipelines[2]?.status).toBe('unknown')
    })

    it('should handle empty connectors list', async () => {
      repository.findEnabledConnectors.mockResolvedValueOnce([])

      const result = await service.getPipelineHealth(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.pipelines).toEqual([])
    })
  })

  /* ------------------------------------------------------------------ */
  /* getAnalyticsOverview                                               */
  /* ------------------------------------------------------------------ */

  describe('getAnalyticsOverview', () => {
    it('should return grouped analytics sections', async () => {
      repository.countAlertsSince.mockResolvedValueOnce(21)
      repository.countResolvedAlertsSince.mockResolvedValueOnce(8)
      repository.countOpenCases.mockResolvedValueOnce(13)
      repository.countOpenIncidents.mockResolvedValueOnce(5)
      repository.countVulnerabilitiesBySeverity.mockResolvedValueOnce(4).mockResolvedValueOnce(9)
      repository.countAttackPathsByStatus.mockResolvedValueOnce(3)
      repository.countAiAgentsByStatus.mockResolvedValueOnce(6)
      repository.countAiAgentSessionsSince.mockResolvedValueOnce(17)
      repository.countJobsByStatus
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(1)
      repository.countJobs.mockResolvedValueOnce(24)
      repository.countDelayedJobs.mockResolvedValueOnce(4)
      repository.countComplianceFrameworks.mockResolvedValueOnce(6)
      repository.countComplianceControlsByStatus
        .mockResolvedValueOnce(41)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(4)
      repository.countCompletedReports.mockResolvedValueOnce(12)
      repository.countCompletedReportsSince.mockResolvedValueOnce(9)
      repository.countAvailableReportTemplates.mockResolvedValueOnce(7)
      repository.countAlertsBetween.mockResolvedValueOnce(64)
      repository.countCriticalAlertsBetween.mockResolvedValueOnce(11)
      repository.findEnabledConnectors.mockResolvedValueOnce([
        {
          type: 'wazuh',
          name: 'Wazuh',
          lastTestAt: toDay('2026-03-10T10:00:00Z').toDate(),
          lastTestOk: true,
          lastError: null,
        },
        {
          type: 'misp',
          name: 'MISP',
          lastTestAt: toDay('2026-03-10T10:00:00Z').toDate(),
          lastTestOk: false,
          lastError: 'Timeout',
        },
      ])

      const result = await service.getAnalyticsOverview(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.overview).toEqual({
        alertsLast24h: 21,
        resolvedLast24h: 8,
        openCases: 13,
        openIncidents: 5,
        criticalVulnerabilities: 4,
        connectedSources: 2,
        completedReports: 12,
      })
      expect(result.threatOperations).toEqual({
        totalAlerts7d: 64,
        criticalAlerts7d: 11,
        openCases: 13,
        openIncidents: 5,
        criticalVulnerabilities: 4,
        highVulnerabilities: 9,
        activeAttackPaths: 3,
      })
      expect(result.automation).toEqual({
        onlineAgents: 6,
        aiSessions24h: 17,
        pendingJobs: 2,
        runningJobs: 7,
        failedJobs: 1,
        healthyConnectors: 1,
        failingConnectors: 1,
      })
      expect(result.governance).toEqual({
        totalFrameworks: 6,
        passedControls: 41,
        failedControls: 5,
        notAssessedControls: 4,
        complianceScore: 82,
        availableTemplates: 7,
      })
      expect(result.infrastructure).toEqual({
        enabledConnectors: 2,
        healthyConnectors: 1,
        failingConnectors: 1,
        totalJobs: 24,
        delayedJobs: 4,
        generatedReports30d: 9,
      })

      expect(repository.countOpenIncidents).toHaveBeenCalledWith(TENANT_ID)
      expect(repository.countVulnerabilitiesBySeverity).toHaveBeenNthCalledWith(
        1,
        TENANT_ID,
        VulnerabilitySeverity.CRITICAL
      )
      expect(repository.countVulnerabilitiesBySeverity).toHaveBeenNthCalledWith(
        2,
        TENANT_ID,
        VulnerabilitySeverity.HIGH
      )
      expect(repository.countAttackPathsByStatus).toHaveBeenCalledWith(
        TENANT_ID,
        AttackPathStatus.ACTIVE
      )
      expect(repository.countAiAgentsByStatus).toHaveBeenCalledWith(TENANT_ID, AiAgentStatus.ONLINE)
      expect(repository.countJobsByStatus).toHaveBeenNthCalledWith(1, TENANT_ID, JobStatus.PENDING)
      expect(repository.countJobsByStatus).toHaveBeenNthCalledWith(2, TENANT_ID, JobStatus.RUNNING)
      expect(repository.countJobsByStatus).toHaveBeenNthCalledWith(3, TENANT_ID, JobStatus.FAILED)
      expect(repository.countComplianceControlsByStatus).toHaveBeenNthCalledWith(
        1,
        TENANT_ID,
        ComplianceControlStatus.PASSED
      )
    })
  })

  /* ------------------------------------------------------------------ */
  /* getOperationsOverview                                              */
  /* ------------------------------------------------------------------ */

  describe('getOperationsOverview', () => {
    it('should return operational metrics for daily SOC workflows', async () => {
      repository.groupIncidentsByStatus.mockResolvedValueOnce([
        { status: IncidentStatus.OPEN, _count: 4 },
        { status: IncidentStatus.IN_PROGRESS, _count: 3 },
        { status: IncidentStatus.RESOLVED, _count: 2 },
      ])
      repository.countOpenCases.mockResolvedValueOnce(12)
      repository.countUnassignedOpenCases.mockResolvedValueOnce(5)
      repository.countOpenCasesOlderThan.mockResolvedValueOnce(4).mockResolvedValueOnce(2)
      repository.getAverageOpenCaseAgeHours.mockResolvedValueOnce([{ avg_hours: 19.4 }])
      repository.countActiveDetectionRules.mockResolvedValueOnce(8)
      repository.findTopDetectionRules.mockResolvedValueOnce([
        {
          id: 'rule-1',
          name: 'Credential Abuse',
          hitCount: 40,
          falsePositiveCount: 4,
          lastTriggeredAt: toDay('2026-03-20T08:00:00Z').toDate(),
        },
      ])
      repository.findTopNoisyDetectionRules.mockResolvedValueOnce([
        {
          id: 'rule-2',
          name: 'Admin Login Spike',
          hitCount: 10,
          falsePositiveCount: 6,
          lastTriggeredAt: toDay('2026-03-20T07:00:00Z').toDate(),
        },
      ])
      repository.groupConnectorSyncJobsByStatusSince.mockResolvedValueOnce([
        { status: SyncJobStatus.COMPLETED, _count: 9 },
        { status: SyncJobStatus.FAILED, _count: 3 },
        { status: SyncJobStatus.RUNNING, _count: 1 },
      ])
      repository.getTopFailingConnectorTypes.mockResolvedValueOnce([
        { connectorType: ConnectorType.WAZUH, failures: 2 },
        { connectorType: ConnectorType.MISP, failures: 1 },
      ])
      repository.countJobsByStatus
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5)
      repository.countStaleRunningJobs.mockResolvedValueOnce(1)
      repository.countJobsByTypeAndStatuses.mockResolvedValueOnce(3).mockResolvedValueOnce(2)
      repository.groupAiAgentSessionsByStatusSince.mockResolvedValueOnce([
        { status: AiAgentSessionStatus.COMPLETED, _count: 12 },
        { status: AiAgentSessionStatus.FAILED, _count: 2 },
      ])
      repository.getAverageAiSessionDurationMsSince.mockResolvedValueOnce([{ avg_ms: 5400 }])
      repository.groupSoarExecutionsByStatusSince.mockResolvedValueOnce([
        { status: SoarExecutionStatus.COMPLETED, _count: 11 },
        { status: SoarExecutionStatus.FAILED, _count: 1 },
      ])
      repository.getAverageSoarCompletionRateSince.mockResolvedValueOnce([{ avg_percentage: 92.3 }])
      repository.countVulnerabilitiesBySeverity.mockResolvedValueOnce(6)
      repository.countExploitAvailableVulnerabilities.mockResolvedValueOnce(4)
      repository.countCloudFindingsByStatus.mockResolvedValueOnce(13)
      repository.countCloudFindingsBySeverity.mockResolvedValueOnce(3)
      repository.countComplianceControlsByStatus.mockResolvedValueOnce(28).mockResolvedValueOnce(6)

      const result = await service.getOperationsOverview(TENANT_ID)

      expect(result.tenantId).toBe(TENANT_ID)
      expect(result.incidentStatus).toEqual([
        { status: IncidentStatus.OPEN, count: 4 },
        { status: IncidentStatus.IN_PROGRESS, count: 3 },
        { status: IncidentStatus.RESOLVED, count: 2 },
      ])
      expect(result.caseAging).toEqual({
        openCases: 12,
        unassignedCases: 5,
        agedOverSevenDays: 4,
        agedOverFourteenDays: 2,
        meanOpenAgeHours: 19,
      })
      expect(result.rulePerformance.activeRules).toBe(8)
      expect(result.rulePerformance.topRules[0]).toMatchObject({
        id: 'rule-1',
        hitCount: 40,
        falsePositiveRate: 10,
      })
      expect(result.rulePerformance.noisyRules[0]).toMatchObject({
        id: 'rule-2',
        falsePositiveRate: 60,
      })
      expect(result.connectorSync).toEqual({
        completedRuns7d: 9,
        failedRuns7d: 3,
        runningSyncs: 1,
        topFailingConnectors: [
          { connectorType: ConnectorType.WAZUH, failures: 2 },
          { connectorType: ConnectorType.MISP, failures: 1 },
        ],
      })
      expect(result.runtimeBacklog).toEqual({
        pendingJobs: 7,
        retryingJobs: 2,
        failedJobs: 5,
        staleRunningJobs: 1,
        queuedConnectorSyncJobs: 3,
        queuedReportJobs: 2,
      })
      expect(result.automationQuality).toEqual({
        aiSessions24h: 14,
        successfulAiSessions24h: 12,
        failedAiSessions24h: 2,
        averageAiDurationSeconds: 5.4,
        completedSoarRuns30d: 11,
        failedSoarRuns30d: 1,
        averageSoarCompletionRate: 92.3,
      })
      expect(result.exposureSummary).toEqual({
        criticalVulnerabilities: 6,
        exploitAvailableVulnerabilities: 4,
        openCloudFindings: 13,
        criticalCloudFindings: 3,
        passedControls: 28,
        failedControls: 6,
      })
    })
  })
})
