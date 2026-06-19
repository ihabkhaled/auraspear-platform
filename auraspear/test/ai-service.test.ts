import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import api from '@/lib/api'
import { alertService } from '@/services/alert.service'
import { dashboardService } from '@/services/dashboard.service'
import { entityService } from '@/services/entity.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// AI-related methods across services
// ─────────────────────────────────────────────────────────────────────────────

describe('AI-related service methods', () => {
  // ─── alertService.triageSummarize ──────────────────────────────────

  describe('alertService.triageSummarize', () => {
    it('should call POST /alerts/:id/ai/summarize', async () => {
      const triageResult = {
        result: 'Alert summary...',
        confidence: 0.92,
        model: 'claude-3',
      }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageSummarize('alert-1')

      expect(mockPost).toHaveBeenCalledWith('/alerts/alert-1/ai/summarize', { connector: undefined })
      expect(result).toEqual(triageResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Forbidden'))

      await expect(alertService.triageSummarize('alert-1')).rejects.toThrow('Forbidden')
    })
  })

  // ─── alertService.triageExplainSeverity ────────────────────────────

  describe('alertService.triageExplainSeverity', () => {
    it('should call POST /alerts/:id/ai/explain-severity', async () => {
      const triageResult = { result: 'Severity explanation...', confidence: 0.88 }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageExplainSeverity('alert-1')

      expect(mockPost).toHaveBeenCalledWith('/alerts/alert-1/ai/explain-severity', { connector: undefined })
      expect(result).toEqual(triageResult)
    })
  })

  // ─── alertService.triageFalsePositiveScore ─────────────────────────

  describe('alertService.triageFalsePositiveScore', () => {
    it('should call POST /alerts/:id/ai/false-positive-score', async () => {
      const triageResult = { result: 'FP Score: 25%', confidence: 0.85 }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageFalsePositiveScore('alert-1')

      expect(mockPost).toHaveBeenCalledWith('/alerts/alert-1/ai/false-positive-score', { connector: undefined })
      expect(result).toEqual(triageResult)
    })
  })

  // ─── alertService.triageNextAction ─────────────────────────────────

  describe('alertService.triageNextAction', () => {
    it('should call POST /alerts/:id/ai/next-action', async () => {
      const triageResult = { result: 'Next steps: 1. Isolate host...' }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageNextAction('alert-1')

      expect(mockPost).toHaveBeenCalledWith('/alerts/alert-1/ai/next-action', { connector: undefined })
      expect(result).toEqual(triageResult)
    })
  })

  // ─── dashboardService.aiDailySummary ───────────────────────────────

  describe('dashboardService.aiDailySummary', () => {
    it('should call POST /dashboard/ai/daily-summary', async () => {
      const summary = { result: 'Daily summary: 42 alerts processed...' }
      mockPost.mockResolvedValue({ data: { data: summary } })

      const result = await dashboardService.aiDailySummary()

      expect(mockPost).toHaveBeenCalledWith('/dashboard/ai/daily-summary', { connector: undefined })
      expect(result).toEqual(summary)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('AI service unavailable'))

      await expect(dashboardService.aiDailySummary()).rejects.toThrow('AI service unavailable')
    })
  })

  // ─── dashboardService.aiExplainAnomaly ─────────────────────────────

  describe('dashboardService.aiExplainAnomaly', () => {
    it('should call POST /dashboard/ai/explain-anomaly with data', async () => {
      const explanation = { result: 'Anomaly analysis...' }
      mockPost.mockResolvedValue({ data: { data: explanation } })

      const input = { metric: 'alert_count', value: 150, previousValue: 50, timeRange: '24h' }
      const result = await dashboardService.aiExplainAnomaly(input)

      expect(mockPost).toHaveBeenCalledWith('/dashboard/ai/explain-anomaly', input)
      expect(result).toEqual(explanation)
    })
  })

  // ─── entityService.getTopRisky ─────────────────────────────────────

  describe('entityService.getTopRisky', () => {
    it('should call GET /entities/top-risky', async () => {
      const entities = [
        { id: 'e-1', value: '192.168.1.100', riskScore: 95 },
        { id: 'e-2', value: 'malware.exe', riskScore: 88 },
      ]
      mockGet.mockResolvedValue({ data: { data: entities } })

      const result = await entityService.getTopRisky()

      expect(mockGet).toHaveBeenCalledWith('/entities/top-risky')
      expect(result.data).toEqual(entities)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Forbidden'))

      await expect(entityService.getTopRisky()).rejects.toThrow('Forbidden')
    })
  })

  // ─── entityService.aiExplainRisk ───────────────────────────────────

  describe('entityService.aiExplainRisk', () => {
    it('should call POST /entities/:id/ai/explain-risk', async () => {
      const explanation = { result: 'This IP has high risk because...' }
      mockPost.mockResolvedValue({ data: { data: explanation } })

      const result = await entityService.aiExplainRisk('e-1')

      expect(mockPost).toHaveBeenCalledWith('/entities/e-1/ai/explain-risk')
      expect(result).toEqual(explanation)
    })
  })
})
