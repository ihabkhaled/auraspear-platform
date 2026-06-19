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
import { knowledgeService } from '@/services/knowledge.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

afterEach(() => {
  vi.clearAllMocks()
})

describe('knowledgeService', () => {
  // ─── getAll ────────────────────────────────────────────────────────

  describe('getAll', () => {
    it('should call GET /runbooks without params', async () => {
      const runbooks = [{ id: 'rb-1', title: 'Incident Response' }]
      mockGet.mockResolvedValue({ data: { data: runbooks } })

      const result = await knowledgeService.getAll()

      expect(mockGet).toHaveBeenCalledWith('/runbooks', { params: undefined })
      expect(result.data).toEqual(runbooks)
    })

    it('should call GET /runbooks with search params', async () => {
      const runbooks = [{ id: 'rb-1', title: 'Phishing Runbook' }]
      mockGet.mockResolvedValue({ data: { data: runbooks } })

      const params = { category: 'incident_response', page: 1, limit: 10 }
      const result = await knowledgeService.getAll(params)

      expect(mockGet).toHaveBeenCalledWith('/runbooks', { params })
      expect(result.data).toEqual(runbooks)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Unauthorized'))

      await expect(knowledgeService.getAll()).rejects.toThrow('Unauthorized')
    })
  })

  // ─── getById ───────────────────────────────────────────────────────

  describe('getById', () => {
    it('should call GET /runbooks/:id', async () => {
      const runbook = { id: 'rb-1', title: 'Incident Response', content: '# Steps' }
      mockGet.mockResolvedValue({ data: { data: runbook } })

      const result = await knowledgeService.getById('rb-1')

      expect(mockGet).toHaveBeenCalledWith('/runbooks/rb-1')
      expect(result.data).toEqual(runbook)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(knowledgeService.getById('nonexistent')).rejects.toThrow('Not found')
    })
  })

  // ─── create ────────────────────────────────────────────────────────

  describe('create', () => {
    it('should call POST /runbooks with data', async () => {
      const runbook = { id: 'rb-new', title: 'New Runbook' }
      mockPost.mockResolvedValue({ data: { data: runbook } })

      const input = { title: 'New Runbook', content: '# Content', category: 'general' }
      const result = await knowledgeService.create(input)

      expect(mockPost).toHaveBeenCalledWith('/runbooks', input)
      expect(result.data).toEqual(runbook)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(knowledgeService.create({ title: '', content: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  // ─── update ────────────────────────────────────────────────────────

  describe('update', () => {
    it('should call PATCH /runbooks/:id with data', async () => {
      const runbook = { id: 'rb-1', title: 'Updated Runbook' }
      mockPatch.mockResolvedValue({ data: { data: runbook } })

      const input = { title: 'Updated Runbook' }
      const result = await knowledgeService.update('rb-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/runbooks/rb-1', input)
      expect(result.data).toEqual(runbook)
    })
  })

  // ─── delete ────────────────────────────────────────────────────────

  describe('delete', () => {
    it('should call DELETE /runbooks/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: { deleted: true } } })

      const result = await knowledgeService.delete('rb-1')

      expect(mockDelete).toHaveBeenCalledWith('/runbooks/rb-1')
      expect(result.data).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(knowledgeService.delete('nonexistent')).rejects.toThrow('Not found')
    })
  })

  // ─── search ────────────────────────────────────────────────────────

  describe('search', () => {
    it('should call GET /runbooks/search with query param', async () => {
      const results = [{ id: 'rb-1', title: 'Phishing Response' }]
      mockGet.mockResolvedValue({ data: { data: results } })

      const result = await knowledgeService.search('phishing')

      expect(mockGet).toHaveBeenCalledWith('/runbooks/search', { params: { q: 'phishing' } })
      expect(result.data).toEqual(results)
    })

    it('should return empty array for no matches', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      const result = await knowledgeService.search('nonexistent')

      expect(result.data).toEqual([])
    })
  })

  // ─── aiGenerate ────────────────────────────────────────────────────

  describe('aiGenerate', () => {
    it('should call POST /runbooks/ai/generate with description', async () => {
      const aiResponse = { result: '# Generated Runbook', model: 'claude-3' }
      mockPost.mockResolvedValue({ data: { data: aiResponse } })

      const result = await knowledgeService.aiGenerate('Create a ransomware response playbook')

      expect(mockPost).toHaveBeenCalledWith('/runbooks/ai/generate', {
        description: 'Create a ransomware response playbook',
      })
      expect(result).toEqual(aiResponse)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('AI not available'))

      await expect(knowledgeService.aiGenerate('test')).rejects.toThrow('AI not available')
    })
  })

  // ─── aiSearch ──────────────────────────────────────────────────────

  describe('aiSearch', () => {
    it('should call POST /runbooks/ai/search with query', async () => {
      const aiResponse = { result: 'Relevant runbooks found', model: 'claude-3' }
      mockPost.mockResolvedValue({ data: { data: aiResponse } })

      const result = await knowledgeService.aiSearch('how to respond to phishing')

      expect(mockPost).toHaveBeenCalledWith('/runbooks/ai/search', {
        query: 'how to respond to phishing',
      })
      expect(result).toEqual(aiResponse)
    })
  })
})
