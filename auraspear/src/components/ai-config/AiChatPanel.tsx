'use client'

import {
  Bot,
  ChevronDown,
  Loader2,
  MessageSquare,
  Plus,
  Send,
  Trash2,
  User,
} from 'lucide-react'
import { AiConnectorSelect, VirtualizedList } from '@/components/common'
import {
  Badge,
  Button,
  Separator,
  Textarea,
} from '@/components/ui'
import { useAiChat } from '@/hooks'
import { useAiConnectorStore } from '@/stores'
import { formatTimestamp, cn } from '@/lib/utils'
import type { AiChatMessage, AiChatThread, EmbeddedUser } from '@/types'

function ThreadItem({
  thread,
  isSelected,
  onSelect,
}: {
  thread: AiChatThread
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        'w-full rounded-lg p-3 text-start transition-colors',
        isSelected
          ? 'bg-primary/10 border-primary border'
          : 'hover:bg-muted border border-transparent'
      )}
      onClick={onSelect}
    >
      <p className="truncate text-sm font-medium">{thread.title ?? 'Untitled Chat'}</p>
      <div className="mt-1 flex items-center gap-2">
        {thread.user && (
          <span className="text-muted-foreground truncate text-xs">{thread.user.name}</span>
        )}
        <span className="text-muted-foreground text-xs">{thread.provider ?? 'default'}</span>
        <span className="text-muted-foreground text-xs">{String(thread.messageCount)} msgs</span>
      </div>
      <p className="text-muted-foreground mt-0.5 text-xs">
        {formatTimestamp(thread.lastActivityAt)}
      </p>
    </button>
  )
}

function ChatMessage({
  message,
  threadUser,
}: {
  message: AiChatMessage
  threadUser?: EmbeddedUser | undefined
}) {
  const isUser = message.role === 'user'
  const initials = threadUser?.name
    ? threadUser.name
        .split(' ')
        .slice(0, 2)
        .map(p => p.charAt(0).toUpperCase())
        .join('')
    : null
  return (
    <div className={cn('flex gap-3 py-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <Bot className="text-primary h-4 w-4" />
        </div>
      )}
      <div className="max-w-[80%]">
        {isUser && threadUser && (
          <p className="text-muted-foreground mb-1 text-end text-xs font-medium">
            {threadUser.name}
          </p>
        )}
        <div
          className={cn(
            'rounded-lg px-4 py-2.5',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
          )}
        >
          <p className="break-words text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          {!isUser && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {message.model && (
                <Badge variant="outline" className="text-xs">
                  {message.model}
                </Badge>
              )}
              {message.requestedModel &&
                message.model &&
                message.requestedModel !== message.model && (
                  <Badge variant="warning" className="text-xs">
                    requested: {message.requestedModel}
                  </Badge>
                )}
              {message.fallbackModel && (
                <Badge variant="destructive" className="text-xs">
                  fallback: {message.fallbackModel}
                </Badge>
              )}
              {message.status === 'failed' && (
                <Badge variant="destructive" className="text-xs">
                  failed
                </Badge>
              )}
              {message.durationMs !== null &&
                message.durationMs !== undefined &&
                message.durationMs > 0 && (
                  <span className="text-muted-foreground text-xs">
                    {String(message.durationMs)}ms
                  </span>
                )}
            </div>
          )}
        </div>
        <p
          className={cn(
            'mt-1 text-xs',
            isUser ? 'text-end' : 'text-start',
            'text-muted-foreground'
          )}
        >
          {formatTimestamp(message.createdAt)}
        </p>
      </div>
      {isUser && (
        <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          {initials ? (
            <span className="text-muted-foreground text-xs font-semibold">{initials}</span>
          ) : (
            <User className="text-muted-foreground h-4 w-4" />
          )}
        </div>
      )}
    </div>
  )
}

export function AiChatPanel() {
  const {
    t,
    threads,
    threadsLoading,
    hasMoreThreads,
    fetchMoreThreads,
    isFetchingMoreThreads,
    selectedThreadId,
    handleSelectThread,
    selectedThread,
    messages,
    messagesLoading,
    hasOlderMessages,
    fetchOlderMessages,
    isFetchingOlder,
    messageInput,
    setMessageInput,
    handleSendMessage,
    handleKeyDown,
    isSending,
    createThread,
    isCreatingThread,
    updateThread,
    archiveThread,
    mobileThreadsOpen,
    setMobileThreadsOpen,
  } = useAiChat()

  const connectorSelection = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = connectorSelection === 'default' ? undefined : connectorSelection

  return (
    <div className="border-border relative flex h-[calc(100vh-12rem)] min-h-[400px] max-h-[600px] overflow-hidden rounded-lg border sm:flex-row">
      {/* Thread sidebar — overlay on mobile, static on sm+ */}
      <div
        className={cn(
          'border-border absolute inset-0 z-20 flex flex-col bg-background transition-transform duration-200 sm:relative sm:inset-auto sm:z-auto sm:w-72 sm:shrink-0 sm:translate-x-0 sm:border-e',
          mobileThreadsOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        )}
      >
        <div className="border-border space-y-2 border-b p-3">
          <div className="flex items-center justify-between sm:hidden">
            <p className="text-sm font-semibold">{t('chatTitle')}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setMobileThreadsOpen(false)}
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </div>
          <AiConnectorSelect
            placeholder={t('featureProvider')}
            className="h-9 w-full"
            showDisabledState
          />
          <Button
            className="w-full"
            size="sm"
            onClick={() => createThread(connectorValue ? { connectorId: connectorValue } : {})}
            disabled={isCreatingThread}
          >
            {isCreatingThread ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="mr-1.5 h-3.5 w-3.5" />
            )}
            {t('newChat')}
          </Button>
        </div>

        {/* Virtualized thread list */}
        <div className="flex-1">
          {threadsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          )}
          {!threadsLoading && threads.length === 0 && (
            <p className="text-muted-foreground px-3 py-8 text-center text-xs">{t('noChats')}</p>
          )}
          {!threadsLoading && threads.length > 0 && (
            <VirtualizedList<AiChatThread>
              data={threads}
              overscan={100}
              className="h-full"
              endReached={() => {
                if (hasMoreThreads && !isFetchingMoreThreads) {
                  void fetchMoreThreads()
                }
              }}
              components={{
                Footer: () =>
                  isFetchingMoreThreads ? (
                    <div className="flex justify-center py-2">
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    </div>
                  ) : null,
              }}
              itemContent={(_index, threadItem) => (
                <div className="px-2 py-0.5">
                  <ThreadItem
                    thread={threadItem}
                    isSelected={threadItem.id === selectedThreadId}
                    onSelect={() => handleSelectThread(threadItem.id)}
                  />
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedThreadId ? (
          <>
            {/* Header with model switcher */}
            <div className="border-border flex items-center gap-1.5 border-b px-2 py-2 sm:gap-3 sm:px-4">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 sm:hidden"
                onClick={() => setMobileThreadsOpen(true)}
                aria-label="Open threads"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {selectedThread?.title ?? 'Untitled Chat'}
                </p>
                {selectedThread?.user && (
                  <p className="text-muted-foreground hidden truncate text-xs sm:block">
                    {t('chatCreatedBy')}: {selectedThread.user.name}
                  </p>
                )}
              </div>
              <AiConnectorSelect
                value={selectedThread?.connectorId ?? selectedThread?.provider ?? 'default'}
                onChange={v => {
                  if (selectedThreadId) {
                    updateThread({
                      threadId: selectedThreadId,
                      data: { connectorId: v },
                    })
                  }
                }}
                className="h-7 w-28 sm:h-8 sm:w-44"
                showDisabledState
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => archiveThread(selectedThreadId)}>
                <Trash2 className="text-destructive h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Virtualized message area */}
            <div className="relative flex-1">
              {/* Sending indicator overlay */}
              {isSending && (
                <div className="bg-background/40 absolute inset-0 z-10 flex items-end justify-center pb-4">
                  <div className="bg-card flex items-center gap-2 rounded-lg border px-4 py-2 shadow-lg">
                    <Loader2 className="text-primary h-4 w-4 animate-spin" />
                    <span className="text-muted-foreground text-sm">AI is thinking...</span>
                  </div>
                </div>
              )}

              {/* Initial loading */}
              {messagesLoading && (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                </div>
              )}

              {/* Empty state */}
              {!messagesLoading && messages.length === 0 && (
                <div className="flex h-full flex-col items-center justify-center">
                  <Bot className="text-muted-foreground mb-3 h-8 w-8" />
                  <p className="text-muted-foreground text-sm">{t('chatPlaceholder')}</p>
                </div>
              )}

              {/* Virtuoso: only renders visible messages + overscan */}
              {!messagesLoading && messages.length > 0 && (
                <VirtualizedList<AiChatMessage>
                  data={messages}
                  initialTopMostItemIndex={messages.length - 1}
                  followOutput="smooth"
                  alignToBottom
                  overscan={200}
                  className="h-full"
                  startReached={() => {
                    if (hasOlderMessages && !isFetchingOlder) {
                      void fetchOlderMessages()
                    }
                  }}
                  components={{
                    Header: () =>
                      isFetchingOlder ? (
                        <div className="flex justify-center py-3">
                          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                        </div>
                      ) : null,
                  }}
                  itemContent={(_index, msg) => (
                    <div className="px-4">
                      <ChatMessage key={msg.id} message={msg} threadUser={selectedThread?.user} />
                    </div>
                  )}
                />
              )}
            </div>

            {/* Input */}
            <Separator />
            <div className="flex items-end gap-2 p-2 sm:p-3">
              <Textarea
                value={messageInput}
                onChange={e => setMessageInput(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chatPlaceholder')}
                rows={2}
                className="min-h-[50px] min-w-0 flex-1 resize-none sm:min-h-[60px]"
                disabled={isSending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isSending || !messageInput.trim()}
                size="icon"
                className="h-10 w-10 shrink-0"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <MessageSquare className="text-muted-foreground h-12 w-12" />
            <p className="text-muted-foreground text-sm">{t('chatDescription')}</p>
            <p className="text-muted-foreground text-xs">{t('noChats')}</p>
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden"
              onClick={() => setMobileThreadsOpen(true)}
            >
              <MessageSquare className="me-1.5 h-3.5 w-3.5" />
              {t('chatTitle')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
