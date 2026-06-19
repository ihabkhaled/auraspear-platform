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

const mockGet = api.get as Mock
const mockPost = api.post as Mock
const mockPatch = api.patch as Mock
const mockDelete = api.delete as Mock

describe('agentConfigService — Chat methods', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── listChatThreads ─────────────────────────────────────────────

  describe('listChatThreads', () => {
    it('should call GET /ai-chat/threads with params', async () => {
      const threads = [{ id: 'thread-1', title: 'Thread 1' }]
      mockGet.mockResolvedValue({
        data: { data: threads, nextCursor: null, hasMore: false },
      })

      const result = await agentConfigService.listChatThreads({ limit: 20 })

      expect(mockGet).toHaveBeenCalledWith('/ai-chat/threads', { params: { limit: 20 } })
      expect(result.data).toEqual(threads)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it('should call GET /ai-chat/threads without params when none provided', async () => {
      const threads = [{ id: 'thread-1' }]
      mockGet.mockResolvedValue({
        data: { data: threads, nextCursor: null, hasMore: false },
      })

      await agentConfigService.listChatThreads()

      expect(mockGet).toHaveBeenCalledWith('/ai-chat/threads', { params: undefined })
    })

    it('should unwrap double-wrapped response when data.data is not an array', async () => {
      const threads = [{ id: 'thread-2', title: 'Thread 2' }]
      mockGet.mockResolvedValue({
        data: {
          data: { data: threads, nextCursor: 'cursor-abc', hasMore: true },
        },
      })

      const result = await agentConfigService.listChatThreads({ limit: 10 })

      expect(result.data).toEqual(threads)
      expect(result.nextCursor).toBe('cursor-abc')
      expect(result.hasMore).toBe(true)
    })

    it('should pass cursor param for pagination', async () => {
      mockGet.mockResolvedValue({
        data: { data: [], nextCursor: null, hasMore: false },
      })

      await agentConfigService.listChatThreads({ limit: 20, cursor: 'cursor-123' })

      expect(mockGet).toHaveBeenCalledWith('/ai-chat/threads', {
        params: { limit: 20, cursor: 'cursor-123' },
      })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(agentConfigService.listChatThreads()).rejects.toThrow('Network Error')
    })
  })

  // ─── createChatThread ─────────────────────────────────────────────

  describe('createChatThread', () => {
    it('should call POST /ai-chat/threads with data', async () => {
      const newThread = { id: 'thread-new', connectorId: 'conn-1', model: 'claude-3' }
      mockPost.mockResolvedValue({ data: { data: newThread } })

      const input = { connectorId: 'conn-1', model: 'claude-3' }
      const result = await agentConfigService.createChatThread(input)

      expect(mockPost).toHaveBeenCalledWith('/ai-chat/threads', input)
      expect(result.data).toEqual(newThread)
    })

    it('should call POST /ai-chat/threads with empty object', async () => {
      mockPost.mockResolvedValue({ data: { data: { id: 'thread-empty' } } })

      await agentConfigService.createChatThread({})

      expect(mockPost).toHaveBeenCalledWith('/ai-chat/threads', {})
    })

    it('should include systemPrompt when provided', async () => {
      mockPost.mockResolvedValue({ data: { data: { id: 'thread-sp' } } })

      const input = { systemPrompt: 'You are a security analyst.' }
      await agentConfigService.createChatThread(input)

      expect(mockPost).toHaveBeenCalledWith('/ai-chat/threads', {
        systemPrompt: 'You are a security analyst.',
      })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Forbidden'))

      await expect(agentConfigService.createChatThread({})).rejects.toThrow('Forbidden')
    })
  })

  // ─── getChatMessages ──────────────────────────────────────────────

  describe('getChatMessages', () => {
    it('should call GET /ai-chat/threads/:id/messages with params', async () => {
      const messages = [{ id: 'msg-1', role: 'user', content: 'Hello' }]
      mockGet.mockResolvedValue({
        data: { data: messages, nextCursor: null, hasMore: false },
      })

      const result = await agentConfigService.getChatMessages('thread-1', {
        limit: 30,
        direction: 'older',
      })

      expect(mockGet).toHaveBeenCalledWith('/ai-chat/threads/thread-1/messages', {
        params: { limit: 30, direction: 'older' },
      })
      expect(result.data).toEqual(messages)
    })

    it('should unwrap double-wrapped response for messages', async () => {
      const messages = [{ id: 'msg-2', role: 'assistant', content: 'Hi' }]
      mockGet.mockResolvedValue({
        data: {
          data: { data: messages, nextCursor: 'msg-cursor', hasMore: true },
        },
      })

      const result = await agentConfigService.getChatMessages('thread-2')

      expect(result.data).toEqual(messages)
      expect(result.nextCursor).toBe('msg-cursor')
      expect(result.hasMore).toBe(true)
    })

    it('should pass cursor for pagination', async () => {
      mockGet.mockResolvedValue({
        data: { data: [], nextCursor: null, hasMore: false },
      })

      await agentConfigService.getChatMessages('thread-1', {
        limit: 30,
        cursor: 'cursor-xyz',
        direction: 'older',
      })

      expect(mockGet).toHaveBeenCalledWith('/ai-chat/threads/thread-1/messages', {
        params: { limit: 30, cursor: 'cursor-xyz', direction: 'older' },
      })
    })

    it('should propagate API errors', async () => {
      mockGet.mockRejectedValue(new Error('Thread not found'))

      await expect(agentConfigService.getChatMessages('invalid-id')).rejects.toThrow(
        'Thread not found'
      )
    })
  })

  // ─── sendChatMessage ──────────────────────────────────────────────

  describe('sendChatMessage', () => {
    it('should call POST /ai-chat/threads/:id/messages with content', async () => {
      const newMsg = { id: 'msg-new', role: 'user', content: 'What is this alert?' }
      mockPost.mockResolvedValue({ data: { data: newMsg } })

      const result = await agentConfigService.sendChatMessage('thread-1', 'What is this alert?')

      expect(mockPost).toHaveBeenCalledWith('/ai-chat/threads/thread-1/messages', {
        content: 'What is this alert?',
      })
      expect(result.data).toEqual(newMsg)
    })

    it('should include model and connectorId overrides', async () => {
      mockPost.mockResolvedValue({ data: { data: { id: 'msg-override' } } })

      await agentConfigService.sendChatMessage('thread-1', 'Hello', {
        model: 'gpt-4',
        connectorId: 'conn-2',
      })

      expect(mockPost).toHaveBeenCalledWith('/ai-chat/threads/thread-1/messages', {
        content: 'Hello',
        model: 'gpt-4',
        connectorId: 'conn-2',
      })
    })

    it('should include only model override when connectorId is absent', async () => {
      mockPost.mockResolvedValue({ data: { data: { id: 'msg-model' } } })

      await agentConfigService.sendChatMessage('thread-1', 'Test', { model: 'claude-3' })

      expect(mockPost).toHaveBeenCalledWith('/ai-chat/threads/thread-1/messages', {
        content: 'Test',
        model: 'claude-3',
      })
    })

    it('should propagate API errors', async () => {
      mockPost.mockRejectedValue(new Error('Rate limited'))

      await expect(agentConfigService.sendChatMessage('thread-1', 'Hello')).rejects.toThrow(
        'Rate limited'
      )
    })
  })

  // ─── updateChatThread ─────────────────────────────────────────────

  describe('updateChatThread', () => {
    it('should call PATCH /ai-chat/threads/:id with data', async () => {
      const updated = { id: 'thread-1', connectorId: 'conn-new', model: 'gpt-4' }
      mockPatch.mockResolvedValue({ data: { data: updated } })

      const result = await agentConfigService.updateChatThread('thread-1', {
        connectorId: 'conn-new',
        model: 'gpt-4',
      })

      expect(mockPatch).toHaveBeenCalledWith('/ai-chat/threads/thread-1', {
        connectorId: 'conn-new',
        model: 'gpt-4',
      })
      expect(result.data).toEqual(updated)
    })

    it('should call PATCH with only model when connectorId is absent', async () => {
      mockPatch.mockResolvedValue({ data: { data: { id: 'thread-1' } } })

      await agentConfigService.updateChatThread('thread-1', { model: 'claude-3' })

      expect(mockPatch).toHaveBeenCalledWith('/ai-chat/threads/thread-1', {
        model: 'claude-3',
      })
    })

    it('should propagate API errors', async () => {
      mockPatch.mockRejectedValue(new Error('Not found'))

      await expect(
        agentConfigService.updateChatThread('bad-id', { model: 'gpt-4' })
      ).rejects.toThrow('Not found')
    })
  })

  // ─── archiveChatThread ────────────────────────────────────────────

  describe('archiveChatThread', () => {
    it('should call DELETE /ai-chat/threads/:id', async () => {
      mockDelete.mockResolvedValue({ data: { data: undefined } })

      await agentConfigService.archiveChatThread('thread-1')

      expect(mockDelete).toHaveBeenCalledWith('/ai-chat/threads/thread-1')
    })

    it('should propagate API errors', async () => {
      mockDelete.mockRejectedValue(new Error('Forbidden'))

      await expect(agentConfigService.archiveChatThread('thread-1')).rejects.toThrow('Forbidden')
    })
  })
})
