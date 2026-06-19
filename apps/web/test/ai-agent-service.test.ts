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
import { aiAgentService } from '@/services/ai-agent.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('aiAgentService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getAgents ─────────────────────────────────────────────────

  describe('getAgents', () => {
    it('should call GET /ai-agents without params', async () => {
      const agents = [{ id: 'agent-1', name: 'Threat Analyst' }]
      mockGet.mockResolvedValue({ data: { data: agents } })

      const result = await aiAgentService.getAgents()

      expect(mockGet).toHaveBeenCalledWith('/ai-agents', { params: undefined })
      expect(result.data).toEqual(agents)
    })

    it('should call GET /ai-agents with search params', async () => {
      const agents = [{ id: 'agent-2', name: 'Log Analyzer' }]
      mockGet.mockResolvedValue({ data: { data: agents } })

      const params = { search: 'log', status: 'active', page: 1, limit: 10 }
      const result = await aiAgentService.getAgents(params)

      expect(mockGet).toHaveBeenCalledWith('/ai-agents', { params })
      expect(result.data).toEqual(agents)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(aiAgentService.getAgents()).rejects.toThrow('Network error')
    })
  })

  // ─── getAgentById ──────────────────────────────────────────────

  describe('getAgentById', () => {
    it('should call GET /ai-agents/:id', async () => {
      const agent = { id: 'agent-1', name: 'Threat Analyst', status: 'running' }
      mockGet.mockResolvedValue({ data: { data: agent } })

      const result = await aiAgentService.getAgentById('agent-1')

      expect(mockGet).toHaveBeenCalledWith('/ai-agents/agent-1')
      expect(result.data).toEqual(agent)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(aiAgentService.getAgentById('agent-999')).rejects.toThrow('Not found')
    })
  })

  // ─── getAgentStats ─────────────────────────────────────────────

  describe('getAgentStats', () => {
    it('should call GET /ai-agents/stats', async () => {
      const stats = { totalAgents: 5, activeAgents: 3, totalSessions: 120 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await aiAgentService.getAgentStats()

      expect(mockGet).toHaveBeenCalledWith('/ai-agents/stats')
      expect(result.data).toEqual(stats)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(aiAgentService.getAgentStats()).rejects.toThrow('Server error')
    })
  })

  // ─── getAgentSessions ──────────────────────────────────────────

  describe('getAgentSessions', () => {
    it('should call GET /ai-agents/:agentId/sessions without params', async () => {
      const sessions = [{ id: 'sess-1', startedAt: '2026-01-01T00:00:00Z' }]
      mockGet.mockResolvedValue({ data: { data: sessions } })

      const result = await aiAgentService.getAgentSessions('agent-1')

      expect(mockGet).toHaveBeenCalledWith('/ai-agents/agent-1/sessions', { params: undefined })
      expect(result.data).toEqual(sessions)
    })

    it('should call GET /ai-agents/:agentId/sessions with params', async () => {
      const sessions = [{ id: 'sess-2', status: 'completed' }]
      mockGet.mockResolvedValue({ data: { data: sessions } })

      const params = { page: 2, limit: 10 }
      const result = await aiAgentService.getAgentSessions('agent-1', params)

      expect(mockGet).toHaveBeenCalledWith('/ai-agents/agent-1/sessions', { params })
      expect(result.data).toEqual(sessions)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Forbidden'))

      await expect(aiAgentService.getAgentSessions('agent-1')).rejects.toThrow('Forbidden')
    })
  })

  // ─── updateSoul ────────────────────────────────────────────────

  describe('updateSoul', () => {
    it('should call PATCH /ai-agents/:id/soul with soulMd data', async () => {
      const agent = { id: 'agent-1', name: 'Threat Analyst', soulMd: '# Updated soul' }
      mockPatch.mockResolvedValue({ data: { data: agent } })

      const input = { soulMd: '# Updated soul' }
      const result = await aiAgentService.updateSoul('agent-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/ai-agents/agent-1/soul', input)
      expect(result.data).toEqual(agent)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Validation failed'))

      await expect(aiAgentService.updateSoul('agent-1', { soulMd: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  // ─── stopAgent ─────────────────────────────────────────────────

  describe('stopAgent', () => {
    it('should call POST /ai-agents/:id/stop', async () => {
      const agent = { id: 'agent-1', status: 'stopped' }
      mockPost.mockResolvedValue({ data: { data: agent } })

      const result = await aiAgentService.stopAgent('agent-1')

      expect(mockPost).toHaveBeenCalledWith('/ai-agents/agent-1/stop')
      expect(result.data).toEqual(agent)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Agent not running'))

      await expect(aiAgentService.stopAgent('agent-1')).rejects.toThrow('Agent not running')
    })
  })

  // ─── createAgent ───────────────────────────────────────────────

  describe('createAgent', () => {
    it('should call POST /ai-agents with data', async () => {
      const agent = { id: 'agent-3', name: 'New Agent' }
      mockPost.mockResolvedValue({ data: { data: agent } })

      const input = { name: 'New Agent', type: 'analyzer', model: 'claude-3' }
      const result = await aiAgentService.createAgent(input)

      expect(mockPost).toHaveBeenCalledWith('/ai-agents', input)
      expect(result.data).toEqual(agent)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(aiAgentService.createAgent({ name: '' })).rejects.toThrow('Validation failed')
    })
  })

  // ─── updateAgent ───────────────────────────────────────────────

  describe('updateAgent', () => {
    it('should call PATCH /ai-agents/:id with data', async () => {
      const agent = { id: 'agent-1', name: 'Renamed Agent' }
      mockPatch.mockResolvedValue({ data: { data: agent } })

      const input = { name: 'Renamed Agent' }
      const result = await aiAgentService.updateAgent('agent-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/ai-agents/agent-1', input)
      expect(result.data).toEqual(agent)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(aiAgentService.updateAgent('agent-1', { name: 'x' })).rejects.toThrow(
        'Forbidden'
      )
    })
  })

  // ─── deleteAgent ───────────────────────────────────────────────

  describe('deleteAgent', () => {
    it('should call DELETE /ai-agents/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await aiAgentService.deleteAgent('agent-1')

      expect(mockDelete).toHaveBeenCalledWith('/ai-agents/agent-1')
      expect(result.data).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(aiAgentService.deleteAgent('agent-999')).rejects.toThrow('Not found')
    })
  })

  describe('runAgent', () => {
    it('should call POST /ai-agents/:id/run with prompt data', async () => {
      const response = { queued: true, jobId: 'job-1', sessionId: 'session-1' }
      mockPost.mockResolvedValue({ data: { data: response } })

      const input = { prompt: 'Summarize the queue backlog' }
      const result = await aiAgentService.runAgent('agent-1', input)

      expect(mockPost).toHaveBeenCalledWith('/ai-agents/agent-1/run', input)
      expect(result.data).toEqual(response)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Forbidden'))

      await expect(
        aiAgentService.runAgent('agent-1', { prompt: 'Investigate this alert' })
      ).rejects.toThrow('Forbidden')
    })
  })
})
