import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import api from '@/lib/api'
import { aiHandoffService } from '@/services/ai-handoff.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

describe('aiHandoffService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('promote', () => {
    it('should call POST /ai-handoffs/promote with data', async () => {
      const result = { finding: {}, link: {}, createdEntityId: 'case-001', targetModule: 'case' }
      mockPost.mockResolvedValue({ data: { data: result } })

      const data = { findingId: 'f-1', targetModule: 'case', title: 'New Case' }
      const response = await aiHandoffService.promote(data)

      expect(mockPost).toHaveBeenCalledWith('/ai-handoffs/promote', data)
      expect(response.createdEntityId).toBe('case-001')
    })

    it('should propagate errors', async () => {
      mockPost.mockRejectedValue(new Error('Not found'))
      await expect(aiHandoffService.promote({ findingId: 'x', targetModule: 'case' })).rejects.toThrow('Not found')
    })
  })

  describe('getHistory', () => {
    it('should call GET /ai-handoffs/history with params and normalize response', async () => {
      const history = [{ id: 'h-1', findingId: 'f-1', findingTitle: 'Test', linkedModule: 'case' }]
      mockGet.mockResolvedValue({ data: { data: history, total: 1 } })

      const result = await aiHandoffService.getHistory({ limit: 10, offset: 0 })

      expect(mockGet).toHaveBeenCalledWith('/ai-handoffs/history', { params: { limit: 10, offset: 0 } })
      expect(result.data).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should handle empty response', async () => {
      mockGet.mockResolvedValue({ data: { data: [], total: 0 } })
      const result = await aiHandoffService.getHistory()
      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should call GET /ai-handoffs/stats and extract data', async () => {
      const stats = { totalPromotions: 5, byTarget: [], byAgent: [], last24h: 2 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await aiHandoffService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/ai-handoffs/stats')
      expect(result.totalPromotions).toBe(5)
    })
  })

  describe('getFindingLinks', () => {
    it('should call GET /ai-handoffs/findings/:id/links', async () => {
      const links = [{ id: 'link-1', findingId: 'f-1', linkedModule: 'case' }]
      mockGet.mockResolvedValue({ data: { data: links } })

      const result = await aiHandoffService.getFindingLinks('f-1')

      expect(mockGet).toHaveBeenCalledWith('/ai-handoffs/findings/f-1/links')
      expect(result).toHaveLength(1)
    })
  })
})
