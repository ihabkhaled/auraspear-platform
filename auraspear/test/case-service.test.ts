import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
// Mock the api module before importing the service
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import { CaseSeverity } from '@/enums'
import api from '@/lib/api'
import { caseService } from '@/services/case.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('caseService', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── getCases ─────────────────────────────────────────────────

  describe('getCases', () => {
    it('should call GET /cases without params', async () => {
      const cases = [{ id: 'case-1', title: 'Phishing investigation' }]
      mockGet.mockResolvedValue({ data: { data: cases } })

      const result = await caseService.getCases()

      expect(mockGet).toHaveBeenCalledWith('/cases', { params: undefined })
      expect(result.data).toEqual(cases)
    })

    it('should call GET /cases with search params', async () => {
      const cases = [{ id: 'case-2', title: 'Malware case' }]
      mockGet.mockResolvedValue({ data: { data: cases } })

      const params = { search: 'malware', status: 'open', page: 1, limit: 20 }
      const result = await caseService.getCases(params)

      expect(mockGet).toHaveBeenCalledWith('/cases', { params })
      expect(result.data).toEqual(cases)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network error'))

      await expect(caseService.getCases()).rejects.toThrow('Network error')
    })
  })

  // ─── getCase ──────────────────────────────────────────────────

  describe('getCase', () => {
    it('should call GET /cases/:id', async () => {
      const caseData = { id: 'case-1', title: 'Phishing investigation' }
      mockGet.mockResolvedValue({ data: { data: caseData } })

      const result = await caseService.getCase('case-1')

      expect(mockGet).toHaveBeenCalledWith('/cases/case-1')
      expect(result.data).toEqual(caseData)
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Not found'))

      await expect(caseService.getCase('case-999')).rejects.toThrow('Not found')
    })
  })

  // ─── createCase ───────────────────────────────────────────────

  describe('createCase', () => {
    it('should call POST /cases with data', async () => {
      const caseData = { id: 'case-3', title: 'New Case' }
      mockPost.mockResolvedValue({ data: { data: caseData } })

      const input = { title: 'New Case', description: 'Test case', severity: CaseSeverity.HIGH }
      const result = await caseService.createCase(input)

      expect(mockPost).toHaveBeenCalledWith('/cases', input)
      expect(result.data).toEqual(caseData)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(
        caseService.createCase({ title: '', description: '', severity: CaseSeverity.LOW })
      ).rejects.toThrow('Validation failed')
    })
  })

  // ─── updateCase ───────────────────────────────────────────────

  describe('updateCase', () => {
    it('should call PATCH /cases/:id with data', async () => {
      const caseData = { id: 'case-1', title: 'Updated Case' }
      mockPatch.mockResolvedValue({ data: { data: caseData } })

      const input = { title: 'Updated Case' }
      const result = await caseService.updateCase('case-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/cases/case-1', input)
      expect(result.data).toEqual(caseData)
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Forbidden'))

      await expect(caseService.updateCase('case-1', { title: 'x' })).rejects.toThrow('Forbidden')
    })
  })

  // ─── Comments ─────────────────────────────────────────────────

  describe('createComment', () => {
    it('should call POST /cases/:caseId/comments and extract data.data', async () => {
      const comment = { id: 'cmt-1', body: 'Investigation notes' }
      mockPost.mockResolvedValue({ data: { data: comment } })

      const input = { body: 'Investigation notes', mentionedUserIds: [] }
      const result = await caseService.createComment('case-1', input)

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/comments', input)
      expect(result).toEqual(comment)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(
        caseService.createComment('case-1', { body: '', mentionedUserIds: [] })
      ).rejects.toThrow('Validation failed')
    })
  })

  describe('getComments', () => {
    it('should call GET /cases/:caseId/comments', async () => {
      const comments = [{ id: 'cmt-1', body: 'Note' }]
      mockGet.mockResolvedValue({ data: { data: comments } })

      const result = await caseService.getComments('case-1')

      expect(mockGet).toHaveBeenCalledWith('/cases/case-1/comments', { params: undefined })
      expect(result.data).toEqual(comments)
    })
  })

  // ─── AI Case Copilot ─────────────────────────────────────────

  describe('aiSummarize', () => {
    it('should call POST /cases/:caseId/ai/summarize with connector', async () => {
      const aiResult = { text: 'Case summary', confidence: 0.9 }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const result = await caseService.aiSummarize('case-1', 'bedrock-connector')

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/ai/summarize', {
        connector: 'bedrock-connector',
      })
      expect(result).toEqual(aiResult)
    })

    it('should call without connector when not provided', async () => {
      const aiResult = { text: 'Summary', confidence: 0.85 }
      mockPost.mockResolvedValue({ data: { data: aiResult } })

      const result = await caseService.aiSummarize('case-1')

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/ai/summarize', {
        connector: undefined,
      })
      expect(result).toEqual(aiResult)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('AI unavailable'))

      await expect(caseService.aiSummarize('case-1')).rejects.toThrow('AI unavailable')
    })
  })

  // ─── Tasks ──────────────────────────────────────────────────────

  describe('createTask', () => {
    it('should call POST /cases/:caseId/tasks', async () => {
      const taskData = { id: 'task-1', title: 'Investigate alert' }
      mockPost.mockResolvedValue({ data: { data: taskData } })

      const input = { title: 'Investigate alert' }
      const result = await caseService.createTask('case-1', input)

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/tasks', input)
      expect(result).toEqual(taskData)
    })

    it('should pass assignee when provided', async () => {
      const taskData = { id: 'task-2', title: 'Review logs', assignee: 'user-1' }
      mockPost.mockResolvedValue({ data: { data: taskData } })

      const input = { title: 'Review logs', assignee: 'user-1' }
      await caseService.createTask('case-2', input)

      expect(mockPost).toHaveBeenCalledWith('/cases/case-2/tasks', input)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Server error'))

      await expect(caseService.createTask('case-1', { title: 'Failing task' })).rejects.toThrow(
        'Server error'
      )
    })
  })

  describe('updateTask', () => {
    it('should call PATCH /cases/:caseId/tasks/:taskId', async () => {
      const taskData = { id: 'task-1', title: 'Updated title', status: 'completed' }
      mockPatch.mockResolvedValue({ data: { data: taskData } })

      const input = { title: 'Updated title', status: 'completed' }
      const result = await caseService.updateTask('case-1', 'task-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/cases/case-1/tasks/task-1', input)
      expect(result).toEqual(taskData)
    })

    it('should support partial updates with only status', async () => {
      const taskData = { id: 'task-1', status: 'in_progress' }
      mockPatch.mockResolvedValue({ data: { data: taskData } })

      const input = { status: 'in_progress' }
      await caseService.updateTask('case-3', 'task-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/cases/case-3/tasks/task-1', input)
    })

    it('should support setting assignee to null', async () => {
      const taskData = { id: 'task-1', assignee: null }
      mockPatch.mockResolvedValue({ data: { data: taskData } })

      const input = { assignee: null }
      await caseService.updateTask('case-1', 'task-1', input)

      expect(mockPatch).toHaveBeenCalledWith('/cases/case-1/tasks/task-1', input)
    })
  })

  describe('deleteTask', () => {
    it('should call DELETE /cases/:caseId/tasks/:taskId', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await caseService.deleteTask('case-1', 'task-1')

      expect(mockDelete).toHaveBeenCalledWith('/cases/case-1/tasks/task-1')
      expect(result).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Not found'))

      await expect(caseService.deleteTask('case-1', 'nonexistent')).rejects.toThrow('Not found')
    })
  })

  // ─── Artifacts ──────────────────────────────────────────────────

  describe('createArtifact', () => {
    it('should call POST /cases/:caseId/artifacts', async () => {
      const artifactData = { id: 'art-1', type: 'ip', value: '192.168.1.1' }
      mockPost.mockResolvedValue({ data: { data: artifactData } })

      const input = { type: 'ip', value: '192.168.1.1' }
      const result = await caseService.createArtifact('case-1', input)

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/artifacts', input)
      expect(result).toEqual(artifactData)
    })

    it('should pass source when provided', async () => {
      const artifactData = { id: 'art-2', type: 'hash', value: 'abc123', source: 'MISP' }
      mockPost.mockResolvedValue({ data: { data: artifactData } })

      const input = { type: 'hash', value: 'abc123', source: 'MISP' }
      await caseService.createArtifact('case-2', input)

      expect(mockPost).toHaveBeenCalledWith('/cases/case-2/artifacts', input)
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Validation failed'))

      await expect(caseService.createArtifact('case-1', { type: 'ip', value: '' })).rejects.toThrow(
        'Validation failed'
      )
    })
  })

  describe('deleteArtifact', () => {
    it('should call DELETE /cases/:caseId/artifacts/:artifactId', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await caseService.deleteArtifact('case-1', 'art-1')

      expect(mockDelete).toHaveBeenCalledWith('/cases/case-1/artifacts/art-1')
      expect(result).toEqual({ deleted: true })
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Forbidden'))

      await expect(caseService.deleteArtifact('case-1', 'art-99')).rejects.toThrow('Forbidden')
    })
  })
})
