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
import { agentConfigService } from '@/services/agent-config.service'
import type { DispatchAgentTaskInput } from '@/types'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

afterEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────
// Orchestrator integration methods on agentConfigService
// ─────────────────────────────────────────────────────────────────────────────

describe('agentConfigService — orchestrator integration', () => {
  // ─── dispatchAgentTask ──────────────────────────────────────────

  describe('dispatchAgentTask', () => {
    it('should POST to correct endpoint with payload', async () => {
      const taskResult = { jobId: 'job-123', status: 'pending' }
      mockPost.mockResolvedValue({ data: { data: taskResult } })

      const payload: DispatchAgentTaskInput = {
        actionType: 'enrich',
        payload: { alertId: 'alert-1' },
        targetId: 'alert-1',
        targetType: 'alert',
      }
      const result = await agentConfigService.dispatchAgentTask('orchestrator', payload)

      expect(mockPost).toHaveBeenCalledWith('/agent-config/agents/orchestrator/dispatch', payload)
      expect(result.data).toEqual(taskResult)
    })

    it('should handle errors gracefully', async () => {
      mockPost.mockRejectedValue(new Error('Agent disabled'))

      const payload: DispatchAgentTaskInput = {
        actionType: 'triage',
        payload: { alertId: 'alert-2' },
      }

      await expect(agentConfigService.dispatchAgentTask('orchestrator', payload)).rejects.toThrow(
        'Agent disabled'
      )
    })
  })

  // ─── getAgentExecutionHistory ───────────────────────────────────

  describe('getAgentExecutionHistory', () => {
    it('should GET with pagination params', async () => {
      const history = [
        {
          id: 'exec-1',
          agentId: 'orchestrator',
          actionType: 'enrich',
          status: 'completed',
          startedAt: '2026-03-24T10:00:00Z',
          completedAt: '2026-03-24T10:00:05Z',
          durationMs: 5000,
          tokensUsed: 120,
        },
        {
          id: 'exec-2',
          agentId: 'orchestrator',
          actionType: 'triage',
          status: 'failed',
          startedAt: '2026-03-24T09:00:00Z',
          error: 'Timeout',
        },
      ]
      mockGet.mockResolvedValue({ data: { data: history } })

      const params = { page: 1, limit: 10 }
      const result = await agentConfigService.getAgentExecutionHistory('orchestrator', params)

      expect(mockGet).toHaveBeenCalledWith('/agent-config/agents/orchestrator/history', { params })
      expect(result.data).toEqual(history)
    })

    it('should work without pagination params', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      const result = await agentConfigService.getAgentExecutionHistory('orchestrator')

      expect(mockGet).toHaveBeenCalledWith('/agent-config/agents/orchestrator/history', {
        params: undefined,
      })
      expect(result.data).toEqual([])
    })
  })

  // ─── getOrchestratorStats ───────────────────────────────────────

  describe('getOrchestratorStats', () => {
    it('should return stats object', async () => {
      const stats = {
        totalDispatches24h: 42,
        successCount24h: 38,
        failureCount24h: 4,
        pendingApprovals: 2,
        activeAgents: 5,
        totalAgents: 8,
      }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await agentConfigService.getOrchestratorStats()

      expect(mockGet).toHaveBeenCalledWith('/agent-config/orchestrator/stats')
      expect(result.data).toEqual(stats)
    })

    it('should handle errors', async () => {
      mockGet.mockRejectedValue(new Error('Service unavailable'))

      await expect(agentConfigService.getOrchestratorStats()).rejects.toThrow('Service unavailable')
    })
  })
})
