import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))
import api from '@/lib/api'
import { caseService } from '@/services/case.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

beforeEach(() => {
  vi.clearAllMocks()
})

describe('caseService - comments', () => {
  describe('getComments', () => {
    it('should call GET /cases/:id/comments with params', async () => {
      const mockComments = [{ id: 'c1', body: 'First comment', authorId: 'user-1' }]
      mockGet.mockResolvedValue({ data: { data: mockComments, total: 1 } })

      const result = await caseService.getComments('case-1', { page: 1, limit: 15 })

      expect(mockGet).toHaveBeenCalledWith('/cases/case-1/comments', {
        params: { page: 1, limit: 15 },
      })
      expect(result.data).toEqual(mockComments)
    })

    it('should work without params', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await caseService.getComments('case-1')

      expect(mockGet).toHaveBeenCalledWith('/cases/case-1/comments', {
        params: undefined,
      })
    })
  })

  describe('createComment', () => {
    it('should call POST /cases/:id/comments', async () => {
      const newComment = { id: 'c2', body: 'New comment', authorId: 'user-1' }
      mockPost.mockResolvedValue({ data: { data: newComment } })

      const result = await caseService.createComment('case-1', {
        body: 'New comment',
        mentionedUserIds: [],
      })

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/comments', {
        body: 'New comment',
        mentionedUserIds: [],
      })
      expect(result).toEqual(newComment)
    })

    it('should include mentioned user IDs', async () => {
      mockPost.mockResolvedValue({ data: { data: { id: 'c3' } } })

      await caseService.createComment('case-1', {
        body: 'Hello @alice',
        mentionedUserIds: ['user-alice'],
      })

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/comments', {
        body: 'Hello @alice',
        mentionedUserIds: ['user-alice'],
      })
    })
  })

  describe('updateComment', () => {
    it('should call PATCH /cases/:id/comments/:commentId', async () => {
      const updated = { id: 'c1', body: 'Updated body', isEdited: true }
      mockPatch.mockResolvedValue({ data: { data: updated } })

      const result = await caseService.updateComment('case-1', 'c1', {
        body: 'Updated body',
        mentionedUserIds: [],
      })

      expect(mockPatch).toHaveBeenCalledWith('/cases/case-1/comments/c1', {
        body: 'Updated body',
        mentionedUserIds: [],
      })
      expect(result).toEqual(updated)
    })
  })

  describe('deleteComment', () => {
    it('should call DELETE /cases/:id/comments/:commentId', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await caseService.deleteComment('case-1', 'c1')

      expect(mockDelete).toHaveBeenCalledWith('/cases/case-1/comments/c1')
      expect(result).toEqual({ deleted: true })
    })
  })

  describe('searchMentionableUsers', () => {
    it('should call GET mentionable-users with query', async () => {
      const users = [{ id: 'u1', name: 'Alice', email: 'alice@test.com' }]
      mockGet.mockResolvedValue({ data: { data: users } })

      const result = await caseService.searchMentionableUsers('case-1', 'ali')

      expect(mockGet).toHaveBeenCalledWith('/cases/case-1/comments/mentionable-users', {
        params: { query: 'ali', limit: 10 },
      })
      expect(result).toEqual(users)
    })

    it('should pass custom limit', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await caseService.searchMentionableUsers('case-1', 'bob', 5)

      expect(mockGet).toHaveBeenCalledWith('/cases/case-1/comments/mentionable-users', {
        params: { query: 'bob', limit: 5 },
      })
    })
  })
})

describe('caseService - tasks', () => {
  describe('createTask', () => {
    it('should call POST /cases/:id/tasks', async () => {
      const task = { id: 't1', title: 'Review', status: 'pending' }
      mockPost.mockResolvedValue({ data: { data: task } })

      const result = await caseService.createTask('case-1', { title: 'Review' })

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/tasks', { title: 'Review' })
      expect(result).toEqual(task)
    })
  })

  describe('updateTask', () => {
    it('should call PATCH /cases/:id/tasks/:taskId', async () => {
      const updated = { id: 't1', title: 'Review', status: 'done' }
      mockPatch.mockResolvedValue({ data: { data: updated } })

      const result = await caseService.updateTask('case-1', 't1', { status: 'done' })

      expect(mockPatch).toHaveBeenCalledWith('/cases/case-1/tasks/t1', { status: 'done' })
      expect(result).toEqual(updated)
    })
  })

  describe('deleteTask', () => {
    it('should call DELETE /cases/:id/tasks/:taskId', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await caseService.deleteTask('case-1', 't1')

      expect(mockDelete).toHaveBeenCalledWith('/cases/case-1/tasks/t1')
      expect(result).toEqual({ deleted: true })
    })
  })
})

describe('caseService - artifacts', () => {
  describe('createArtifact', () => {
    it('should call POST /cases/:id/artifacts', async () => {
      const artifact = { id: 'a1', type: 'ip', value: '1.2.3.4' }
      mockPost.mockResolvedValue({ data: { data: artifact } })

      const result = await caseService.createArtifact('case-1', {
        type: 'ip',
        value: '1.2.3.4',
      })

      expect(mockPost).toHaveBeenCalledWith('/cases/case-1/artifacts', {
        type: 'ip',
        value: '1.2.3.4',
      })
      expect(result).toEqual(artifact)
    })
  })

  describe('deleteArtifact', () => {
    it('should call DELETE /cases/:id/artifacts/:artifactId', async () => {
      mockDelete.mockResolvedValue({ data: { deleted: true } })

      const result = await caseService.deleteArtifact('case-1', 'a1')

      expect(mockDelete).toHaveBeenCalledWith('/cases/case-1/artifacts/a1')
      expect(result).toEqual({ deleted: true })
    })
  })
})
