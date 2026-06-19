import { describe, it, expect, vi, afterEach, type Mock } from 'vitest'
// Mock services before importing hooks
vi.mock('@/services', () => ({
  agentConfigService: {
    listChatThreads: vi.fn(),
    createChatThread: vi.fn(),
    getChatMessages: vi.fn(),
    sendChatMessage: vi.fn(),
    updateChatThread: vi.fn(),
    archiveChatThread: vi.fn(),
  },
}))
// Mock React hooks used by useAiChat
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    useState: vi.fn((init: unknown) => [init, vi.fn()]),
    useCallback: vi.fn((fn: unknown) => fn),
    useEffect: vi.fn(),
  }
})
// Mock @tanstack/react-query to capture mutation/query configs
const mockInvalidateQueries = vi.fn()
const mockResetQueries = vi.fn()
vi.mock('@tanstack/react-query', () => {
  const useInfiniteQueryMock = vi.fn((opts: Record<string, unknown>) => ({
    queryKey: opts['queryKey'],
    queryFn: opts['queryFn'],
    data: undefined,
    isLoading: false,
    isFetching: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    _opts: opts,
  }))
  const useMutationMock = vi.fn((opts: Record<string, unknown>) => ({
    mutationFn: opts['mutationFn'],
    onSuccess: opts['onSuccess'],
    onError: opts['onError'],
    mutate: vi.fn(),
    isPending: false,
    _opts: opts,
  }))
  return {
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries,
      resetQueries: mockResetQueries,
    }),
    useInfiniteQuery: useInfiniteQueryMock,
    useMutation: useMutationMock,
  }
})
// Mock stores
vi.mock('@/stores', () => ({
  useTenantStore: vi.fn((selector: (s: { currentTenantId: string | null }) => unknown) =>
    selector({ currentTenantId: 'test-tenant-id' })
  ),
}))
// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: vi.fn(() => (key: string) => key),
}))
// Mock Toast
vi.mock('@/components/common', () => ({
  Toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))
// Mock api-error
vi.mock('@/lib/api-error', () => ({
  getErrorKey: vi.fn(() => 'someError'),
}))

import { useInfiniteQuery, useMutation } from '@tanstack/react-query'
import { Toast } from '@/components/common'
import { useAiChat } from '@/hooks/useAiChat'
import { agentConfigService } from '@/services'

const mockUseInfiniteQuery = useInfiniteQuery as unknown as Mock
const mockUseMutation = useMutation as unknown as Mock
const mockToastSuccess = (Toast as unknown as { success: Mock }).success
const mockToastError = (Toast as unknown as { error: Mock }).error
const mockListChatThreads = agentConfigService.listChatThreads as Mock
const mockCreateChatThread = agentConfigService.createChatThread as Mock
const mockSendChatMessage = agentConfigService.sendChatMessage as Mock
const mockArchiveChatThread = agentConfigService.archiveChatThread as Mock

describe('useAiChat hook', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  // ─── Return shape ────────────────────────────────────────────────

  describe('return shape', () => {
    it('should return expected properties', () => {
      const result = useAiChat() as unknown as Record<string, unknown>

      expect(result).toHaveProperty('t')
      expect(result).toHaveProperty('threads')
      expect(result).toHaveProperty('threadsLoading')
      expect(result).toHaveProperty('hasMoreThreads')
      expect(result).toHaveProperty('selectedThreadId')
      expect(result).toHaveProperty('handleSelectThread')
      expect(result).toHaveProperty('selectedThread')
      expect(result).toHaveProperty('messages')
      expect(result).toHaveProperty('messagesLoading')
      expect(result).toHaveProperty('messagesFetching')
      expect(result).toHaveProperty('hasOlderMessages')
      expect(result).toHaveProperty('messageInput')
      expect(result).toHaveProperty('setMessageInput')
      expect(result).toHaveProperty('handleSendMessage')
      expect(result).toHaveProperty('handleKeyDown')
      expect(result).toHaveProperty('isSending')
      expect(result).toHaveProperty('createThread')
      expect(result).toHaveProperty('isCreatingThread')
      expect(result).toHaveProperty('updateThread')
      expect(result).toHaveProperty('archiveThread')
    })

    it('should return empty threads array when no data', () => {
      const result = useAiChat() as unknown as { threads: unknown[]; messages: unknown[] }

      expect(result.threads).toEqual([])
      expect(result.messages).toEqual([])
    })

    it('should return null selectedThreadId initially', () => {
      const result = useAiChat() as unknown as { selectedThreadId: string | null }

      expect(result.selectedThreadId).toBeNull()
    })
  })

  // ─── Threads infinite query ──────────────────────────────────────

  describe('threads query', () => {
    it('should configure threadsQuery with correct queryKey', () => {
      useAiChat()

      // First call is threadsQuery, second is messagesQuery
      const threadsCall = mockUseInfiniteQuery.mock.calls.at(0) as [Record<string, unknown>]
      expect(threadsCall[0]['queryKey']).toEqual(['ai-chat-threads', 'test-tenant-id'])
    })

    it('should call listChatThreads from queryFn with limit', async () => {
      mockListChatThreads.mockResolvedValue({
        data: [],
        nextCursor: null,
        hasMore: false,
      })

      useAiChat()

      const threadsCall = mockUseInfiniteQuery.mock.calls.at(0) as [Record<string, unknown>]
      const queryFn = threadsCall[0]['queryFn'] as (ctx: {
        pageParam: string | undefined
      }) => Promise<unknown>

      await queryFn({ pageParam: undefined })

      expect(mockListChatThreads).toHaveBeenCalledWith({ limit: 20 })
    })

    it('should pass cursor when pageParam is provided', async () => {
      mockListChatThreads.mockResolvedValue({
        data: [],
        nextCursor: null,
        hasMore: false,
      })

      useAiChat()

      const threadsCall = mockUseInfiniteQuery.mock.calls.at(0) as [Record<string, unknown>]
      const queryFn = threadsCall[0]['queryFn'] as (ctx: {
        pageParam: string | undefined
      }) => Promise<unknown>

      await queryFn({ pageParam: 'cursor-abc' })

      expect(mockListChatThreads).toHaveBeenCalledWith({ limit: 20, cursor: 'cursor-abc' })
    })
  })

  // ─── Create thread mutation ──────────────────────────────────────

  describe('createThread mutation', () => {
    it('should call createChatThread via mutationFn', async () => {
      mockCreateChatThread.mockResolvedValue({ data: { id: 'thread-new' } })

      useAiChat()

      // createThreadMutation is the 1st useMutation call
      const createCall = mockUseMutation.mock.calls.at(0) as [Record<string, unknown>]
      const mutationFn = createCall[0]['mutationFn'] as (
        data: Record<string, unknown>
      ) => Promise<unknown>

      await mutationFn({ connectorId: 'conn-1', model: 'claude-3' })

      expect(mockCreateChatThread).toHaveBeenCalledWith({
        connectorId: 'conn-1',
        model: 'claude-3',
      })
    })

    it('should show success toast on success', () => {
      useAiChat()

      const createCall = mockUseMutation.mock.calls.at(0) as [Record<string, unknown>]
      const onSuccess = createCall[0]['onSuccess'] as (result: Record<string, unknown>) => void

      onSuccess({ data: { id: 'thread-created' } })

      expect(mockToastSuccess).toHaveBeenCalledWith('chatCreated')
    })

    it('should invalidate threads query on success', () => {
      useAiChat()

      const createCall = mockUseMutation.mock.calls.at(0) as [Record<string, unknown>]
      const onSuccess = createCall[0]['onSuccess'] as (result: Record<string, unknown>) => void

      onSuccess({ data: { id: 'thread-created' } })

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['ai-chat-threads', 'test-tenant-id'],
      })
    })

    it('should show error toast on failure', () => {
      useAiChat()

      const createCall = mockUseMutation.mock.calls.at(0) as [Record<string, unknown>]
      const onError = createCall[0]['onError'] as (error: unknown) => void

      onError(new Error('Failed'))

      expect(mockToastError).toHaveBeenCalled()
    })
  })

  // ─── Send message mutation ───────────────────────────────────────

  describe('sendMessage mutation', () => {
    it('should call sendChatMessage via mutationFn', async () => {
      mockSendChatMessage.mockResolvedValue({ data: { id: 'msg-1' } })

      useAiChat()

      // sendMessageMutation is the 2nd useMutation call
      const sendCall = mockUseMutation.mock.calls.at(1) as [Record<string, unknown>]
      const mutationFn = sendCall[0]['mutationFn'] as (args: {
        threadId: string
        content: string
        model?: string
        connectorId?: string
      }) => Promise<unknown>

      await mutationFn({ threadId: 'thread-1', content: 'Hello' })

      expect(mockSendChatMessage).toHaveBeenCalledWith('thread-1', 'Hello', {})
    })

    it('should pass model and connectorId overrides', async () => {
      mockSendChatMessage.mockResolvedValue({ data: { id: 'msg-2' } })

      useAiChat()

      const sendCall = mockUseMutation.mock.calls.at(1) as [Record<string, unknown>]
      const mutationFn = sendCall[0]['mutationFn'] as (args: {
        threadId: string
        content: string
        model?: string
        connectorId?: string
      }) => Promise<unknown>

      await mutationFn({
        threadId: 'thread-1',
        content: 'Test',
        model: 'gpt-4',
        connectorId: 'conn-2',
      })

      expect(mockSendChatMessage).toHaveBeenCalledWith('thread-1', 'Test', {
        model: 'gpt-4',
        connectorId: 'conn-2',
      })
    })

    it('should invalidate both messages and threads on success', () => {
      useAiChat()

      const sendCall = mockUseMutation.mock.calls.at(1) as [Record<string, unknown>]
      const onSuccess = sendCall[0]['onSuccess'] as () => void

      onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledTimes(2)
    })

    it('should show error toast on failure', () => {
      useAiChat()

      const sendCall = mockUseMutation.mock.calls.at(1) as [Record<string, unknown>]
      const onError = sendCall[0]['onError'] as (error: unknown) => void

      onError(new Error('Send failed'))

      expect(mockToastError).toHaveBeenCalled()
    })
  })

  // ─── Update thread mutation ──────────────────────────────────────

  describe('updateThread mutation', () => {
    it('should configure mutationFn correctly', async () => {
      const mockUpdateChatThread = agentConfigService.updateChatThread as Mock
      mockUpdateChatThread.mockResolvedValue({ data: { id: 'thread-1' } })

      useAiChat()

      // updateThreadMutation is the 3rd useMutation call
      const updateCall = mockUseMutation.mock.calls.at(2) as [Record<string, unknown>]
      const mutationFn = updateCall[0]['mutationFn'] as (args: {
        threadId: string
        data: { connectorId?: string; model?: string }
      }) => Promise<unknown>

      await mutationFn({ threadId: 'thread-1', data: { model: 'gpt-4' } })

      expect(mockUpdateChatThread).toHaveBeenCalledWith('thread-1', { model: 'gpt-4' })
    })

    it('should invalidate threads on success', () => {
      useAiChat()

      const updateCall = mockUseMutation.mock.calls.at(2) as [Record<string, unknown>]
      const onSuccess = updateCall[0]['onSuccess'] as () => void

      onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['ai-chat-threads', 'test-tenant-id'],
      })
    })
  })

  // ─── Archive thread mutation ─────────────────────────────────────

  describe('archiveThread mutation', () => {
    it('should call archiveChatThread via mutationFn', async () => {
      mockArchiveChatThread.mockResolvedValue({ data: undefined })

      useAiChat()

      // archiveThreadMutation is the 4th useMutation call
      const archiveCall = mockUseMutation.mock.calls.at(3) as [Record<string, unknown>]
      const mutationFn = archiveCall[0]['mutationFn'] as (threadId: string) => Promise<unknown>

      await mutationFn('thread-1')

      expect(mockArchiveChatThread).toHaveBeenCalledWith('thread-1')
    })

    it('should show success toast on success', () => {
      useAiChat()

      const archiveCall = mockUseMutation.mock.calls.at(3) as [Record<string, unknown>]
      const onSuccess = archiveCall[0]['onSuccess'] as () => void

      onSuccess()

      expect(mockToastSuccess).toHaveBeenCalledWith('chatArchived')
    })

    it('should invalidate threads on success', () => {
      useAiChat()

      const archiveCall = mockUseMutation.mock.calls.at(3) as [Record<string, unknown>]
      const onSuccess = archiveCall[0]['onSuccess'] as () => void

      onSuccess()

      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['ai-chat-threads', 'test-tenant-id'],
      })
    })

    it('should show error toast on failure', () => {
      useAiChat()

      const archiveCall = mockUseMutation.mock.calls.at(3) as [Record<string, unknown>]
      const onError = archiveCall[0]['onError'] as (error: unknown) => void

      onError(new Error('Archive failed'))

      expect(mockToastError).toHaveBeenCalled()
    })
  })

  // ─── handleSelectThread ──────────────────────────────────────────

  describe('handleSelectThread', () => {
    it('should be a function', () => {
      const result = useAiChat() as unknown as {
        handleSelectThread: (id: string) => void
      }

      expect(typeof result.handleSelectThread).toBe('function')
    })
  })

  // ─── handleSendMessage ───────────────────────────────────────────

  describe('handleSendMessage', () => {
    it('should be a function', () => {
      const result = useAiChat() as unknown as {
        handleSendMessage: () => void
      }

      expect(typeof result.handleSendMessage).toBe('function')
    })
  })

  // ─── handleKeyDown ───────────────────────────────────────────────

  describe('handleKeyDown', () => {
    it('should be a function', () => {
      const result = useAiChat() as unknown as {
        handleKeyDown: (e: unknown) => void
      }

      expect(typeof result.handleKeyDown).toBe('function')
    })
  })

  // ─── Messages query configuration ───────────────────────────────

  describe('messages query', () => {
    it('should configure messagesQuery with correct queryKey including threadId', () => {
      useAiChat()

      // Second call is messagesQuery
      const messagesCall = mockUseInfiniteQuery.mock.calls.at(1) as [Record<string, unknown>]
      expect(messagesCall[0]['queryKey']).toEqual([
        'ai-chat-messages',
        'test-tenant-id',
        null, // selectedThreadId is initially null
      ])
    })

    it('should disable messagesQuery when no thread is selected', () => {
      useAiChat()

      const messagesCall = mockUseInfiniteQuery.mock.calls.at(1) as [Record<string, unknown>]
      expect(messagesCall[0]['enabled']).toBe(false)
    })
  })
})
