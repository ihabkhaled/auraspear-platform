import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import api from '@/lib/api'
import { dashboardService } from '@/services/dashboard.service'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockGet = api.get as Mock
const mockPost = api.post as Mock

describe('dashboardService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getKPIs ──────────────────────────────────────────────────

  describe('getKPIs', () => {
    it('should call GET /dashboard/kpis', async () => {
      const kpis = [{ label: 'Total Alerts', value: 142 }]
      mockGet.mockResolvedValue({ data: { data: kpis } })

      const result = await dashboardService.getKPIs()

      expect(mockGet).toHaveBeenCalledWith('/dashboard/kpis')
      expect(result.data).toEqual(kpis)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(dashboardService.getKPIs()).rejects.toThrow('Server error')
    })
  })

  // ─── getAlertTrends ───────────────────────────────────────────

  describe('getAlertTrends', () => {
    it('should call GET /dashboard/alert-trends', async () => {
      const trends = [{ date: '2026-01-01', count: 15 }]
      mockGet.mockResolvedValue({ data: { data: trends } })

      const result = await dashboardService.getAlertTrends()

      expect(mockGet).toHaveBeenCalledWith('/dashboard/alert-trends')
      expect(result.data).toEqual(trends)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(dashboardService.getAlertTrends()).rejects.toThrow('Network error')
    })
  })

  // ─── getSeverityDistribution ──────────────────────────────────

  describe('getSeverityDistribution', () => {
    it('should call GET /dashboard/severity-distribution', async () => {
      const distribution = [{ severity: 'critical', count: 5 }]
      mockGet.mockResolvedValue({ data: { data: distribution } })

      const result = await dashboardService.getSeverityDistribution()

      expect(mockGet).toHaveBeenCalledWith('/dashboard/severity-distribution')
      expect(result.data).toEqual(distribution)
    })
  })

  // ─── aiDailySummary ───────────────────────────────────────────

  describe('aiDailySummary', () => {
    it('should call POST /dashboard/ai/daily-summary with connector', async () => {
      const aiResult = { text: 'Daily summary', model: 'claude-3' }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const result = await dashboardService.aiDailySummary('bedrock-connector')

      expect(mockPost).toHaveBeenCalledWith('/dashboard/ai/daily-summary', {
        connector: 'bedrock-connector',
      })
      expect(result).toEqual(aiResult)
    })

    it('should call without connector when not provided', async () => {
      const aiResult = { text: 'Summary', model: 'rule-based' }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const result = await dashboardService.aiDailySummary()

      expect(mockPost).toHaveBeenCalledWith('/dashboard/ai/daily-summary', {
        connector: undefined,
      })
      expect(result).toEqual(aiResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('AI unavailable'))

      await expect(dashboardService.aiDailySummary()).rejects.toThrow('AI unavailable')
    })
  })

  // ─── aiExplainAnomaly ─────────────────────────────────────────

  describe('aiExplainAnomaly', () => {
    it('should call POST /dashboard/ai/explain-anomaly with data and connector', async () => {
      const aiResult = { text: 'Anomaly explanation', confidence: 0.87 }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const input = { metric: 'alert_count', value: 500, previousValue: 50, timeRange: '24h' }
      const result = await dashboardService.aiExplainAnomaly(input, 'openai-connector')

      expect(mockPost).toHaveBeenCalledWith('/dashboard/ai/explain-anomaly', {
        ...input,
        connector: 'openai-connector',
      })
      expect(result).toEqual(aiResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Server error'))

      const input = { metric: 'alert_count', value: 500, previousValue: 50, timeRange: '24h' }
      await expect(dashboardService.aiExplainAnomaly(input)).rejects.toThrow('Server error')
    })
  })

  // ─── getOperationsOverview ────────────────────────────────────

  it('calls the operations overview endpoint', async () => {
    const payload = {
      tenantId: 'tenant-1',
      incidentStatus: [],
      caseAging: {
        openCases: 0,
        unassignedCases: 0,
        agedOverSevenDays: 0,
        agedOverFourteenDays: 0,
        meanOpenAgeHours: 0,
      },
      rulePerformance: {
        activeRules: 0,
        topRules: [],
        noisyRules: [],
      },
      connectorSync: {
        completedRuns7d: 0,
        failedRuns7d: 0,
        runningSyncs: 0,
        topFailingConnectors: [],
      },
      runtimeBacklog: {
        pendingJobs: 0,
        retryingJobs: 0,
        failedJobs: 0,
        staleRunningJobs: 0,
        queuedConnectorSyncJobs: 0,
        queuedReportJobs: 0,
      },
      automationQuality: {
        aiSessions24h: 0,
        successfulAiSessions24h: 0,
        failedAiSessions24h: 0,
        averageAiDurationSeconds: 0,
        completedSoarRuns30d: 0,
        failedSoarRuns30d: 0,
        averageSoarCompletionRate: 0,
      },
      exposureSummary: {
        criticalVulnerabilities: 0,
        exploitAvailableVulnerabilities: 0,
        openCloudFindings: 0,
        criticalCloudFindings: 0,
        passedControls: 0,
        failedControls: 0,
      },
    }

    mockGet.mockResolvedValue({ data: { data: payload } })

    const result = await dashboardService.getOperationsOverview()

    expect(mockGet).toHaveBeenCalledWith('/dashboard/operations-overview')
    expect(result).toEqual({ data: payload })
  })
})
