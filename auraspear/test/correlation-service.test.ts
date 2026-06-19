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
import { correlationService } from '@/services/correlation.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('correlationService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getRules ──────────────────────────────────────────────────

  describe('getRules', () => {
    it('should call GET /correlation without params', async () => {
      const rules = [{ id: 'rule-1', name: 'Brute force detection' }]
      mockGet.mockResolvedValue({ data: { data: rules } })

      const result = await correlationService.getRules()

      expect(mockGet).toHaveBeenCalledWith('/correlation', { params: undefined })
      expect(result.data).toEqual(rules)
    })

    it('should call GET /correlation with search params', async () => {
      const rules = [{ id: 'rule-2', name: 'Lateral movement' }]
      mockGet.mockResolvedValue({ data: { data: rules } })

      const params = { search: 'lateral', status: 'active', page: 1, limit: 20 }
      const result = await correlationService.getRules(params)

      expect(mockGet).toHaveBeenCalledWith('/correlation', { params })
      expect(result.data).toEqual(rules)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(correlationService.getRules()).rejects.toThrow('Network error')
    })
  })

  // ─── getRuleById ───────────────────────────────────────────────

  describe('getRuleById', () => {
    it('should call GET /correlation/:id', async () => {
      const rule = { id: 'rule-1', name: 'DDoS detection', conditions: [] }
      mockGet.mockResolvedValue({ data: { data: rule } })

      const result = await correlationService.getRuleById('rule-1')

      expect(mockGet).toHaveBeenCalledWith('/correlation/rule-1')
      expect(result.data).toEqual(rule)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(correlationService.getRuleById('rule-999')).rejects.toThrow('Not found')
    })
  })

  // ─── createRule ────────────────────────────────────────────────

  describe('createRule', () => {
    it('should call POST /correlation with data', async () => {
      const rule = { id: 'rule-3', name: 'New rule' }
      mockPost.mockResolvedValue({ data: { data: rule } })

      const input = { name: 'New rule', logic: 'AND', conditions: [] }
      const result = await correlationService.createRule(input)

      expect(mockPost).toHaveBeenCalledWith('/correlation', input)
      expect(result.data).toEqual(rule)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(correlationService.createRule({ name: '' })).rejects.toThrow('Validation failed')
    })
  })

  // ─── updateRule ────────────────────────────────────────────────

  describe('updateRule', () => {
    it('should call PATCH /correlation/:id with data', async () => {
      const rule = { id: 'rule-1', name: 'Updated rule', enabled: false }
      mockPatch.mockResolvedValue({ data: { data: rule } })

      const input = { enabled: false }
      const result = await correlationService.updateRule('rule-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/correlation/rule-1', input)
      expect(result.data).toEqual(rule)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(correlationService.updateRule('rule-1', { name: 'x' })).rejects.toThrow(
        'Forbidden'
      )
    })
  })

  // ─── deleteRule ────────────────────────────────────────────────

  describe('deleteRule', () => {
    it('should call DELETE /correlation/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await correlationService.deleteRule('rule-1')

      expect(mockDelete).toHaveBeenCalledWith('/correlation/rule-1')
      expect(result.data).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(correlationService.deleteRule('rule-999')).rejects.toThrow('Not found')
    })
  })

  // ─── getCorrelationStats ───────────────────────────────────────

  describe('getCorrelationStats', () => {
    it('should call GET /correlation/stats', async () => {
      const stats = { totalRules: 15, activeRules: 12, matchesLast24h: 230 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await correlationService.getCorrelationStats()

      expect(mockGet).toHaveBeenCalledWith('/correlation/stats')
      expect(result.data).toEqual(stats)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(correlationService.getCorrelationStats()).rejects.toThrow('Server error')
    })
  })
})
