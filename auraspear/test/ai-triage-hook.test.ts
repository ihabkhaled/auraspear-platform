import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import { Permission } from '@/enums'
import api from '@/lib/api'
import { hasPermission } from '@/lib/permissions'
import { alertService } from '@/services/alert.service'

const mockPost = api.post as Mock

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test the underlying logic used by useAiAlertTriage
// (Hook tests for React hooks with useMutation need a test renderer like
// renderHook from @testing-library/react. Here we test the service calls
// and permission logic that the hook orchestrates.)
// ─────────────────────────────────────────────────────────────────────────────

describe('AI Alert Triage — service calls', () => {
  const ALERT_ID = 'alert-123'

  describe('triageSummarize', () => {
    it('should call the correct endpoint', async () => {
      const triageResult = { result: 'Summary text', confidence: 0.9, model: 'claude-3' }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageSummarize(ALERT_ID)

      expect(mockPost).toHaveBeenCalledWith(`/alerts/${ALERT_ID}/ai/summarize`, { connector: undefined })
      expect(result).toEqual(triageResult)
    })

    it('should propagate errors for error handling in hook', async () => {
      mockPost.mockRejectedValue(new Error('AI feature disabled'))

      await expect(alertService.triageSummarize(ALERT_ID)).rejects.toThrow('AI feature disabled')
    })
  })

  describe('triageExplainSeverity', () => {
    it('should call the correct endpoint', async () => {
      const triageResult = { result: 'Severity explanation' }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageExplainSeverity(ALERT_ID)

      expect(mockPost).toHaveBeenCalledWith(`/alerts/${ALERT_ID}/ai/explain-severity`, { connector: undefined })
      expect(result).toEqual(triageResult)
    })
  })

  describe('triageFalsePositiveScore', () => {
    it('should call the correct endpoint', async () => {
      const triageResult = { result: 'FP analysis' }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageFalsePositiveScore(ALERT_ID)

      expect(mockPost).toHaveBeenCalledWith(`/alerts/${ALERT_ID}/ai/false-positive-score`, { connector: undefined })
      expect(result).toEqual(triageResult)
    })
  })

  describe('triageNextAction', () => {
    it('should call the correct endpoint', async () => {
      const triageResult = { result: 'Next actions list' }
      mockPost.mockResolvedValue({ data: { data: triageResult } })

      const result = await alertService.triageNextAction(ALERT_ID)

      expect(mockPost).toHaveBeenCalledWith(`/alerts/${ALERT_ID}/ai/next-action`, { connector: undefined })
      expect(result).toEqual(triageResult)
    })
  })
})

describe('AI Alert Triage — permission gating', () => {
  it('canTriage should be true when user has AI_ALERT_TRIAGE permission', () => {
    const permissions = [Permission.AI_ALERT_TRIAGE, Permission.ALERTS_VIEW]
    const canTriage = hasPermission(permissions, Permission.AI_ALERT_TRIAGE)
    expect(canTriage).toBe(true)
  })

  it('canTriage should be false when user lacks AI_ALERT_TRIAGE permission', () => {
    const permissions = [Permission.ALERTS_VIEW, Permission.ALERTS_ACKNOWLEDGE]
    const canTriage = hasPermission(permissions, Permission.AI_ALERT_TRIAGE)
    expect(canTriage).toBe(false)
  })

  it('canTriage should be false with empty permissions array', () => {
    const canTriage = hasPermission([], Permission.AI_ALERT_TRIAGE)
    expect(canTriage).toBe(false)
  })
})
