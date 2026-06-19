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
import { soarService } from '@/services/soar.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('soarService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── Playbooks ──────────────────────────────────────────────────

  describe('getPlaybooks', () => {
    it('should call GET /soar/playbooks without params', async () => {
      const playbooks = [{ id: 'pb-1', name: 'Phishing Response' }]
      mockGet.mockResolvedValue({ data: { data: playbooks } })

      const result = await soarService.getPlaybooks()

      expect(mockGet).toHaveBeenCalledWith('/soar/playbooks', { params: undefined })
      expect(result).toEqual({ data: playbooks })
    })

    it('should call GET /soar/playbooks with search params', async () => {
      const playbooks = [{ id: 'pb-2', name: 'Malware Containment' }]
      mockGet.mockResolvedValue({ data: { data: playbooks } })

      const params = { search: 'malware', page: 1 }
      const result = await soarService.getPlaybooks(params)

      expect(mockGet).toHaveBeenCalledWith('/soar/playbooks', { params })
      expect(result).toEqual({ data: playbooks })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(soarService.getPlaybooks()).rejects.toThrow('Network error')
    })
  })

  describe('getPlaybookById', () => {
    it('should call GET /soar/playbooks/:id', async () => {
      const playbook = { id: 'pb-1', name: 'Phishing Response' }
      mockGet.mockResolvedValue({ data: { data: playbook } })

      const result = await soarService.getPlaybookById('pb-1')

      expect(mockGet).toHaveBeenCalledWith('/soar/playbooks/pb-1')
      expect(result).toEqual({ data: playbook })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(soarService.getPlaybookById('pb-999')).rejects.toThrow('Not found')
    })
  })

  describe('createPlaybook', () => {
    it('should call POST /soar/playbooks', async () => {
      const playbook = { id: 'pb-3', name: 'New Playbook' }
      mockPost.mockResolvedValue({ data: { data: playbook } })

      const input = { name: 'New Playbook', description: 'Test playbook' }
      const result = await soarService.createPlaybook(input)

      expect(mockPost).toHaveBeenCalledWith('/soar/playbooks', input)
      expect(result).toEqual({ data: playbook })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(soarService.createPlaybook({ name: '' })).rejects.toThrow('Validation failed')
    })
  })

  describe('updatePlaybook', () => {
    it('should call PATCH /soar/playbooks/:id', async () => {
      const playbook = { id: 'pb-1', name: 'Updated Playbook' }
      mockPatch.mockResolvedValue({ data: { data: playbook } })

      const input = { name: 'Updated Playbook' }
      const result = await soarService.updatePlaybook('pb-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/soar/playbooks/pb-1', input)
      expect(result).toEqual({ data: playbook })
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(soarService.updatePlaybook('pb-1', { name: 'x' })).rejects.toThrow('Forbidden')
    })
  })

  describe('deletePlaybook', () => {
    it('should call DELETE /soar/playbooks/:id', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await soarService.deletePlaybook('pb-1')

      expect(mockDelete).toHaveBeenCalledWith('/soar/playbooks/pb-1')
      expect(result).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(soarService.deletePlaybook('pb-999')).rejects.toThrow('Not found')
    })
  })

  // ─── Execution ──────────────────────────────────────────────────

  describe('executePlaybook', () => {
    it('should call POST /soar/playbooks/:id/execute', async () => {
      const execution = { id: 'exec-1', playbookId: 'pb-1', status: 'running' }
      mockPost.mockResolvedValue({ data: { data: execution } })

      const result = await soarService.executePlaybook('pb-1')

      expect(mockPost).toHaveBeenCalledWith('/soar/playbooks/pb-1/execute')
      expect(result).toEqual({ data: execution })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Execution failed'))

      await expect(soarService.executePlaybook('pb-1')).rejects.toThrow('Execution failed')
    })
  })

  describe('getExecutions', () => {
    it('should call GET /soar/executions without params', async () => {
      const executions = [{ id: 'exec-1', status: 'completed' }]
      mockGet.mockResolvedValue({ data: { data: executions } })

      const result = await soarService.getExecutions()

      expect(mockGet).toHaveBeenCalledWith('/soar/executions', { params: undefined })
      expect(result).toEqual({ data: executions })
    })

    it('should call GET /soar/executions with search params', async () => {
      const executions = [{ id: 'exec-2', status: 'failed' }]
      mockGet.mockResolvedValue({ data: { data: executions } })

      const params = { status: 'failed', page: 1 }
      const result = await soarService.getExecutions(params)

      expect(mockGet).toHaveBeenCalledWith('/soar/executions', { params })
      expect(result).toEqual({ data: executions })
    })
  })

  // ─── Stats ──────────────────────────────────────────────────────

  describe('getStats', () => {
    it('should call GET /soar/stats', async () => {
      const stats = { totalPlaybooks: 10, totalExecutions: 50 }
      mockGet.mockResolvedValue({ data: { data: stats } })

      const result = await soarService.getStats()

      expect(mockGet).toHaveBeenCalledWith('/soar/stats')
      expect(result).toEqual({ data: stats })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Server error'))

      await expect(soarService.getStats()).rejects.toThrow('Server error')
    })
  })

  // ─── AI Draft Playbook ────────────────────────────────────────

  describe('aiDraftPlaybook', () => {
    it('should call POST /soar/ai/draft-playbook with description and connector', async () => {
      const draft = { result: 'Generated playbook YAML', confidence: 0.9 }
      mockPost.mockResolvedValue({ data: { data: draft } })

      const result = await soarService.aiDraftPlaybook('Phishing response playbook', 'bedrock')

      expect(mockPost).toHaveBeenCalledWith('/soar/ai/draft-playbook', {
        description: 'Phishing response playbook',
        connector: 'bedrock',
      })
      expect(result).toEqual(draft)
    })

    it('should call without connector when not provided', async () => {
      const draft = { result: 'Generated playbook', confidence: 0.85 }
      mockPost.mockResolvedValue({ data: { data: draft } })

      const result = await soarService.aiDraftPlaybook('Malware containment')

      expect(mockPost).toHaveBeenCalledWith('/soar/ai/draft-playbook', {
        description: 'Malware containment',
        connector: undefined,
      })
      expect(result).toEqual(draft)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('AI service unavailable'))

      await expect(soarService.aiDraftPlaybook('test')).rejects.toThrow('AI service unavailable')
    })
  })
})
