'use client'

import { useCallback, useState } from 'react'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'
import type { AiChatMessage, AiChatThread } from '@/types'

export function useAiChat() {
  const t = useTranslations('aiConfig')
  const tErrors = useTranslations('errors')
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [mobileThreadsOpen, setMobileThreadsOpen] = useState(false)

  // Thread list with cursor-based infinite loading
  const threadsQuery = useInfiniteQuery({
    queryKey: ['ai-chat-threads', tenantId],
    queryFn: ({ pageParam }) => {
      const params: { limit: number; cursor?: string } = { limit: 20 }
      if (pageParam) {
        params.cursor = pageParam as string
      }
      return agentConfigService.listChatThreads(params)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.nextCursor : undefined),
  })

  const threads: AiChatThread[] = threadsQuery.data
    ? threadsQuery.data.pages.flatMap(page => page.data)
    : []
  const hasMoreThreads = threadsQuery.hasNextPage ?? false

  // Auto-select latest thread when none is explicitly selected
  const effectiveThreadId = selectedThreadId ?? threads.at(0)?.id ?? null

  // Messages with cursor-based infinite query (loads older on scroll up)
  const messagesQuery = useInfiniteQuery({
    queryKey: ['ai-chat-messages', tenantId, effectiveThreadId],
    queryFn: ({ pageParam }) => {
      const params: { limit: number; cursor?: string; direction?: string } = {
        limit: 30,
        direction: 'older',
      }
      if (pageParam) {
        params.cursor = pageParam as string
      }
      return agentConfigService.getChatMessages(effectiveThreadId ?? '', params)
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    enabled: Boolean(effectiveThreadId),
  })

  // Flatten all pages into a single messages array (chronological order)
  const allMessages: AiChatMessage[] = messagesQuery.data
    ? [...messagesQuery.data.pages].reverse().flatMap(page => page.data)
    : []

  // Reset when selecting a thread
  const handleSelectThread = useCallback(
    (threadId: string) => {
      setSelectedThreadId(threadId)
      setMobileThreadsOpen(false)
      void queryClient.resetQueries({ queryKey: ['ai-chat-messages', tenantId, threadId] })
    },
    [queryClient, tenantId]
  )

  // Create thread
  const createThreadMutation = useMutation({
    mutationFn: (data: { connectorId?: string; model?: string; systemPrompt?: string }) =>
      agentConfigService.createChatThread(data),
    onSuccess: result => {
      const newThread = result?.data as AiChatThread | undefined
      if (newThread) {
        setSelectedThreadId(newThread.id)
      }
      setMobileThreadsOpen(false)
      Toast.success(t('chatCreated'))
      void queryClient.invalidateQueries({ queryKey: ['ai-chat-threads', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  // Send message with per-message model override
  const sendMessageMutation = useMutation({
    mutationFn: ({
      threadId,
      content,
      model,
      connectorId,
    }: {
      threadId: string
      content: string
      model?: string
      connectorId?: string
    }) => {
      const overrides: { model?: string; connectorId?: string } = {}
      if (model) overrides.model = model
      if (connectorId) overrides.connectorId = connectorId
      return agentConfigService.sendChatMessage(threadId, content, overrides)
    },
    onSuccess: () => {
      setMessageInput('')
      void queryClient.invalidateQueries({
        queryKey: ['ai-chat-messages', tenantId, effectiveThreadId],
      })
      void queryClient.invalidateQueries({ queryKey: ['ai-chat-threads', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  // Update thread (change model/connector mid-chat)
  const updateThreadMutation = useMutation({
    mutationFn: ({
      threadId,
      data,
    }: {
      threadId: string
      data: { connectorId?: string; model?: string }
    }) => agentConfigService.updateChatThread(threadId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-chat-threads', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  // Archive thread
  const archiveThreadMutation = useMutation({
    mutationFn: (threadId: string) => agentConfigService.archiveChatThread(threadId),
    onSuccess: () => {
      Toast.success(t('chatArchived'))
      setSelectedThreadId(null)
      void queryClient.invalidateQueries({ queryKey: ['ai-chat-threads', tenantId] })
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleSendMessage = () => {
    if (!effectiveThreadId || !messageInput.trim()) return
    sendMessageMutation.mutate({ threadId: effectiveThreadId, content: messageInput.trim() })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const selectedThread = threads.find(thread => thread.id === effectiveThreadId) ?? null

  return {
    t,
    threads,
    threadsLoading: threadsQuery.isLoading,
    hasMoreThreads,
    fetchMoreThreads: threadsQuery.fetchNextPage,
    isFetchingMoreThreads: threadsQuery.isFetchingNextPage,
    selectedThreadId: effectiveThreadId,
    handleSelectThread,
    selectedThread,
    messages: allMessages,
    messagesLoading: messagesQuery.isLoading,
    messagesFetching: messagesQuery.isFetching,
    hasOlderMessages: messagesQuery.hasNextPage ?? false,
    fetchOlderMessages: messagesQuery.fetchNextPage,
    isFetchingOlder: messagesQuery.isFetchingNextPage,
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleKeyDown,
    isSending: sendMessageMutation.isPending,
    createThread: createThreadMutation.mutate,
    isCreatingThread: createThreadMutation.isPending,
    updateThread: updateThreadMutation.mutate,
    archiveThread: archiveThreadMutation.mutate,
    mobileThreadsOpen,
    setMobileThreadsOpen,
  }
}
