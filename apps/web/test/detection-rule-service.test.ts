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
import { detectionRuleService } from '@/services/detection-rule.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('detectionRuleService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── Rules ──────────────────────────────────────────────────────

  describe('listRules', () => {
    it('should call GET /detection-rules without params', async () => {
      const rules = [{ id: 'rule-1', name: 'Brute Force Detection' }]
      mockGet.mockResolvedValue({ data: { data: rules } })

      const result = await detectionRuleService.listRules()

      expect(mockGet).toHaveBeenCalledWith('/detection-rules', { params: undefined })
      expect(result).toEqual({ data: rules })
    })

    it('should call GET /detection-rules with search params', async () => {
      const rules = [{ id: 'rule-2', name: 'Lateral Movement' }]
      mockGet.mockResolvedValue({ data: { data: rules } })

      const params = { search: 'lateral', severity: 'high', page: 1 }
      const result = await detectionRuleService.listRules(params)

      expect(mockGet).toHaveBeenCalledWith('/detection-rules', { params })
      expect(result).toEqual({ data: rules })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(detectionRuleService.listRules()).rejects.toThrow('Network error')
    })
  })

  describe('getRuleById', () => {
    it('should call GET /detection-rules/:id', async () => {
      const rule = { id: 'rule-1', name: 'Brute Force Detection' }
      mockGet.mockResolvedValue({ data: { data: rule } })

      const result = await detectionRuleService.getRuleById('rule-1')

      expect(mockGet).toHaveBeenCalledWith('/detection-rules/rule-1')
      expect(result).toEqual({ data: rule })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(detectionRuleService.getRuleById('rule-999')).rejects.toThrow('Not found')
    })
  })

  describe('createRule', () => {
    it('should call POST /detection-rules', async () => {
      const rule = { id: 'rule-3', name: 'New Rule' }
      mockPost.mockResolvedValue({ data: { data: rule } })

      const input = { name: 'New Rule', logic: 'sigma', severity: 'medium' }
      const result = await detectionRuleService.createRule(input)

      expect(mockPost).toHaveBeenCalledWith('/detection-rules', input)
      expect(result).toEqual({ data: rule })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(detectionRuleService.createRule({ name: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  describe('updateRule', () => {
    it('should call PATCH /detection-rules/:id', async () => {
      const rule = { id: 'rule-1', name: 'Updated Rule' }
      mockPatch.mockResolvedValue({ data: { data: rule } })

      const input = { name: 'Updated Rule' }
      const result = await detectionRuleService.updateRule('rule-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/detection-rules/rule-1', input)
      expect(result).toEqual({ data: rule })
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(detectionRuleService.updateRule('rule-1', { name: 'x' })).rejects.toThrow(
        'Forbidden'
      )
    })
  })

  describe('deleteRule', () => {
    it('should call DELETE /detection-rules/:id', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await detectionRuleService.deleteRule('rule-1')

      expect(mockDelete).toHaveBeenCalledWith('/detection-rules/rule-1')
      expect(result).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(detectionRuleService.deleteRule('rule-999')).rejects.toThrow('Not found')
    })
  })

  // ─── toggleRule ─────────────────────────────────────────────────

  describe('toggleRule', () => {
    it('should call PATCH /detection-rules/:id/toggle with enabled flag', async () => {
      const rule = { id: 'rule-1', enabled: false }
      mockPatch.mockResolvedValue({ data: { data: rule } })

      const result = await detectionRuleService.toggleRule('rule-1', false)

      expect(mockPatch).toHaveBeenCalledWith('/detection-rules/rule-1/toggle', { enabled: false })
      expect(result).toEqual({ data: rule })
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(detectionRuleService.toggleRule('rule-1', true)).rejects.toThrow('Forbidden')
    })
  })

  // ─── simulateRule ─────────────────────────────────────────────

  describe('simulateRule', () => {
    it('should call POST /detection-rules/:id/simulate with events', async () => {
      const simResult = { matches: 3, totalEvents: 10 }
      mockPost.mockResolvedValue({ data: { data: simResult } })

      const events = [{ source: 'syslog', message: 'failed login' }]
      const result = await detectionRuleService.simulateRule('rule-1', events)

      expect(mockPost).toHaveBeenCalledWith('/detection-rules/rule-1/simulate', { events })
      expect(result).toEqual({ data: simResult })
    })
  })

  // ─── aiDraftRule ──────────────────────────────────────────────

  describe('aiDraftRule', () => {
    it('should call POST /detection-rules/ai/draft with description and connector', async () => {
      const aiResult = { draftRule: 'title: Brute Force', confidence: 0.9 }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const result = await detectionRuleService.aiDraftRule('Detect brute force', 'bedrock')

      expect(mockPost).toHaveBeenCalledWith('/detection-rules/ai/draft', {
        description: 'Detect brute force',
        connector: 'bedrock',
      })
      expect(result).toEqual(aiResult)
    })

    it('should call without connector when not provided', async () => {
      const aiResult = { draftRule: 'title: Lateral Movement', confidence: 0.85 }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const result = await detectionRuleService.aiDraftRule('Detect lateral movement')

      expect(mockPost).toHaveBeenCalledWith('/detection-rules/ai/draft', {
        description: 'Detect lateral movement',
        connector: undefined,
      })
      expect(result).toEqual(aiResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('AI service unavailable'))

      await expect(detectionRuleService.aiDraftRule('desc')).rejects.toThrow(
        'AI service unavailable'
      )
    })
  })

  // ─── aiTuning ─────────────────────────────────────────────────

  describe('aiTuning', () => {
    it('should call POST /detection-rules/:ruleId/ai/tuning with connector', async () => {
      const aiResult = { suggestions: ['Adjust threshold'], confidence: 0.88 }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const result = await detectionRuleService.aiTuning('rule-1', 'openai')

      expect(mockPost).toHaveBeenCalledWith('/detection-rules/rule-1/ai/tuning', {
        connector: 'openai',
      })
      expect(result).toEqual(aiResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Timeout'))

      await expect(detectionRuleService.aiTuning('rule-1')).rejects.toThrow('Timeout')
    })
  })

  // ─── Stats ──────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should call GET /detection-rules/stats', async () => {
      const stats = { totalRules: 150, enabledRules: 120, disabledRules: 30 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await detectionRuleService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/detection-rules/stats')
      expect(result).toEqual({ data: stats })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(detectionRuleService.getStats()).rejects.toThrow('Server error')
    })
  })
})
