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
import { huntService } from '@/services/hunt.service'

const mockGet = api.get as Mock
const mockPost = api.post as Mock

beforeEach(() => {
  vi.clearAllMocks()
})

describe('huntService', () => {
  describe('createSession', () => {
    it('should call POST /hunt/sessions with data', async () => {
      const mockSession = { id: 's1', query: 'malware', timeRange: '24h' }
      mockPost.mockResolvedValue({ data: { data: mockSession } })

      const result = await huntService.createSession({ query: 'malware', timeRange: '24h' })

      expect(mockPost).toHaveBeenCalledWith('/hunt/sessions', {
        query: 'malware',
        timeRange: '24h',
      })
      expect(result.data).toEqual(mockSession)
    })

    it('should propagate errors', async () => {
      mockPost.mockRejectedValue(new Error('Failed to create'))

      await expect(huntService.createSession({ query: 'test', timeRange: '1h' })).rejects.toThrow(
        'Failed to create'
      )
    })
  })

  describe('getSession', () => {
    it('should call GET /hunt/sessions/:id', async () => {
      const mockSession = { id: 's1', query: 'scan', status: 'complete' }
      mockGet.mockResolvedValue({ data: { data: mockSession } })

      const result = await huntService.getSession('s1')

      expect(mockGet).toHaveBeenCalledWith('/hunt/sessions/s1')
      expect(result.data).toEqual(mockSession)
    })
  })

  describe('sendMessage', () => {
    it('should transform AI response into HuntMessage format', async () => {
      mockPost.mockResolvedValue({
        data: {
          data: {
            result: 'Found suspicious activity',
            reasoning: ['Analyzed logs', 'Found IOC match'],
            confidence: 0.9,
          },
        },
      })

      const result = await huntService.sendMessage('s1', 'check for malware')

      expect(mockPost).toHaveBeenCalledWith('/hunt/messages', { query: 'check for malware' })
      expect(result.data.content).toBe('Found suspicious activity')
      expect(result.data.role).toBe('ai')
      const { reasoningSteps } = result.data
      expect(reasoningSteps).toHaveLength(2)
      expect(reasoningSteps?.[0]?.label).toBe('Analyzed logs')
      expect(reasoningSteps?.[0]?.status).toBe('completed')
      expect(reasoningSteps?.[1]?.label).toBe('Found IOC match')
    })

    it('should include complete action when confidence >= 0.8', async () => {
      mockPost.mockResolvedValue({
        data: { data: { result: 'Done', reasoning: [], confidence: 0.85 } },
      })

      const result = await huntService.sendMessage('s1', 'test')

      expect(result.data.actions).toContain('complete')
    })

    it('should not include complete action when confidence < 0.8', async () => {
      mockPost.mockResolvedValue({
        data: { data: { result: 'Partial', reasoning: [], confidence: 0.5 } },
      })

      const result = await huntService.sendMessage('s1', 'test')

      expect(result.data.actions).toEqual([])
    })

    it('should handle null AI response', async () => {
      mockPost.mockResolvedValue({ data: { data: null } })

      const result = await huntService.sendMessage('s1', 'test')

      expect(result.data.content).toBe('')
      expect(result.data.reasoningSteps).toEqual([])
      expect(result.data.actions).toEqual([])
    })
  })

  describe('getEvents', () => {
    it('should call GET /hunt/sessions/:id/events with pagination', async () => {
      const mockEvents = [{ id: 'e1', type: 'alert' }]
      mockGet.mockResolvedValue({ data: { data: mockEvents } })

      const result = await huntService.getEvents('s1', 2, 25)

      expect(mockGet).toHaveBeenCalledWith('/hunt/sessions/s1/events', {
        params: { page: 2, limit: 25 },
      })
      expect(result.data).toEqual(mockEvents)
    })

    it('should use default pagination', async () => {
      mockGet.mockResolvedValue({ data: { data: [] } })

      await huntService.getEvents('s1')

      expect(mockGet).toHaveBeenCalledWith('/hunt/sessions/s1/events', {
        params: { page: 1, limit: 50 },
      })
    })
  })
})
