import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

import api from '@/lib/api'
import { aiOpsService } from '@/services/ai-ops.service'

const mockGet = api.get as Mock

describe('aiOpsService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getWorkspace', () => {
    it('should call GET /ai-ops/workspace and extract data', async () => {
      const workspace = {
        agents: { total: 10, online: 3, totalSessions24h: 25 },
        orchestration: { dispatches24h: 50, success24h: 45, failures24h: 5, pendingApprovals: 3 },
        findings: { total: 120, proposed: 30, applied: 60, dismissed: 25, highConfidence: 80 },
        chat: { totalThreads: 15, totalMessages: 200, legalHoldCount: 2 },
        usage24h: { totalTokens: 500000, estimatedCost: 15.5, requests: 100 },
        audit: { totalLogs24h: 300, uniqueActors24h: 8 },
        recentActivity: [],
      }
      mockGet.mockResolvedValue({ data: { data: workspace } })

      const result = await aiOpsService.getWorkspace()

      expect(mockGet).toHaveBeenCalledWith('/ai-ops/workspace')
      expect(result).toEqual(workspace)
    })

    it('should extract data from proxy-wrapped response', async () => {
      const workspace = {
        agents: { total: 0, online: 0, totalSessions24h: 0 },
        orchestration: { dispatches24h: 0, success24h: 0, failures24h: 0, pendingApprovals: 0 },
        findings: { total: 0, proposed: 0, applied: 0, dismissed: 0, highConfidence: 0 },
        chat: { totalThreads: 0, totalMessages: 0, legalHoldCount: 0 },
        usage24h: { totalTokens: 0, estimatedCost: 0, requests: 0 },
        audit: { totalLogs24h: 0, uniqueActors24h: 0 },
        recentActivity: [],
      }
      // Proxy wraps as { data: workspace } since workspace doesn't have a 'data' key at top level
      mockGet.mockResolvedValue({ data: { data: workspace } })

      const result = await aiOpsService.getWorkspace()

      expect(result.agents.total).toBe(0)
      expect(result.recentActivity).toEqual([])
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(aiOpsService.getWorkspace()).rejects.toThrow('Network error')
    })
  })
})
