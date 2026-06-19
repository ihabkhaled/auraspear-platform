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

const mockGet = api.get as Mock
const mockPost = api.post as Mock

describe('alertService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getAlerts ──────────────────────────────────────────────────

  describe('getAlerts', () => {
    it('should call GET /alerts without params', async () => {
      const alerts = [{ id: 'a-1', title: 'Suspicious login' }]
      mockGet.mockResolvedValue({ data: { data: alerts } })

      const result = await alertService.getAlerts()

      expect(mockGet).toHaveBeenCalledWith('/alerts', { params: undefined })
      expect(result.data).toEqual(alerts)
    })

    it('should call GET /alerts with search params', async () => {
      const alerts = [{ id: 'a-2', title: 'Malware detected' }]
      mockGet.mockResolvedValue({ data: { data: alerts } })

      const params = { search: 'malware', severity: 'critical', page: 1, limit: 20 }
      const result = await alertService.getAlerts(params)

      expect(mockGet).toHaveBeenCalledWith('/alerts', { params })
      expect(result.data).toEqual(alerts)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(alertService.getAlerts()).rejects.toThrow('Network error')
    })
  })

  // ─── getAlertById ───────────────────────────────────────────────

  describe('getAlertById', () => {
    it('should call GET /alerts/:id', async () => {
      const alert = { id: 'a-1', title: 'Suspicious login' }
      mockGet.mockResolvedValue({ data: { data: alert } })

      const result = await alertService.getAlertById('a-1')

      expect(mockGet).toHaveBeenCalledWith('/alerts/a-1')
      expect(result.data).toEqual(alert)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(alertService.getAlertById('a-999')).rejects.toThrow('Not found')
    })
  })

  // ─── investigateAlert ───────────────────────────────────────────

  describe('investigateAlert', () => {
    it('should call POST /alerts/:id/investigate', async () => {
      const investigation = { id: 'inv-1', summary: 'Investigated' }
      mockPost.mockResolvedValue({ data: { data: investigation } })

      const result = await alertService.investigateAlert('a-1')

      expect(mockPost).toHaveBeenCalledWith('/alerts/a-1/investigate')
      expect(result.data).toEqual(investigation)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Server error'))

      await expect(alertService.investigateAlert('a-1')).rejects.toThrow('Server error')
    })
  })

  // ─── bulkAcknowledge ────────────────────────────────────────────

  describe('bulkAcknowledge', () => {
    it('should call POST /alerts/bulk/acknowledge with ids', async () => {
      const result_ = { acknowledged: 3, failed: 0 }
      mockPost.mockResolvedValue({ data: { data: result_ } })

      const ids = ['a-1', 'a-2', 'a-3']
      const result = await alertService.bulkAcknowledge(ids)

      expect(mockPost).toHaveBeenCalledWith('/alerts/bulk/acknowledge', { ids })
      expect(result.data).toEqual(result_)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Forbidden'))

      await expect(alertService.bulkAcknowledge(['a-1'])).rejects.toThrow('Forbidden')
    })
  })

  // ─── bulkClose ──────────────────────────────────────────────────

  describe('bulkClose', () => {
    it('should call POST /alerts/bulk/close with ids and resolution', async () => {
      const result_ = { closed: 2, failed: 0 }
      mockPost.mockResolvedValue({ data: { data: result_ } })

      const ids = ['a-1', 'a-2']
      const resolution = 'false_positive'
      const result = await alertService.bulkClose(ids, resolution)

      expect(mockPost).toHaveBeenCalledWith('/alerts/bulk/close', { ids, resolution })
      expect(result.data).toEqual(result_)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(alertService.bulkClose([], 'resolved')).rejects.toThrow('Validation failed')
    })
  })

  // ─── triageSummarize ────────────────────────────────────────────

  describe('triageSummarize', () => {
    it('should call POST /alerts/:id/ai/summarize with connector', async () => {
      const triageResult = { text: 'Summary of alert', confidence: 0.92 }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageSummarize('a-1', 'bedrock-connector')

      expect(mockPost).toHaveBeenCalledWith('/alerts/a-1/ai/summarize', {
        connector: 'bedrock-connector',
      })
      expect(result).toEqual(triageResult)
    })

    it('should call without connector when not provided', async () => {
      const triageResult = { text: 'Summary', confidence: 0.85 }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageSummarize('a-1')

      expect(mockPost).toHaveBeenCalledWith('/alerts/a-1/ai/summarize', {
        connector: undefined,
      })
      expect(result).toEqual(triageResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('AI service unavailable'))

      await expect(alertService.triageSummarize('a-1')).rejects.toThrow('AI service unavailable')
    })
  })

  // ─── triageExplainSeverity ──────────────────────────────────────

  describe('triageExplainSeverity', () => {
    it('should call POST /alerts/:id/ai/explain-severity with connector', async () => {
      const triageResult = { text: 'Severity explanation', confidence: 0.88 }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageExplainSeverity('a-1', 'openai-connector')

      expect(mockPost).toHaveBeenCalledWith('/alerts/a-1/ai/explain-severity', {
        connector: 'openai-connector',
      })
      expect(result).toEqual(triageResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Timeout'))

      await expect(alertService.triageExplainSeverity('a-1')).rejects.toThrow('Timeout')
    })
  })

  // ─── getAlertTimeline ───────────────────────────────────────────

  describe('getAlertTimeline', () => {
    it('should call GET /alerts/:id/timeline', async () => {
      const timeline = [{ id: 'tl-1', event: 'Alert created' }]
      mockGet.mockResolvedValue({ data: { data: timeline } })

      const result = await alertService.getAlertTimeline('a-1')

      expect(mockGet).toHaveBeenCalledWith('/alerts/a-1/timeline')
      expect(result.data).toEqual(timeline)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(alertService.getAlertTimeline('a-999')).rejects.toThrow('Not found')
    })
  })
})
