'use client'

import { Bot, Crosshair, Plus } from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Button, ScrollArea } from '@/components/ui'
import { useHuntChatPanel } from '@/hooks'
import type { HuntChatPanelProps } from '@/types'
import { ChatMessage } from './ChatMessage'
import { HuntInputArea } from './HuntInputArea'

export function HuntChatPanel({
  messages,
  onSend,
  disabled = false,
  hasSession = false,
  onNewHunt,
}: HuntChatPanelProps) {
  const { t, bottomRef } = useHuntChatPanel(messages)

  return (
    <div className="border-border flex w-full shrink-0 flex-col overflow-hidden border-e lg:w-[450px]">
      <div className="border-border flex items-center gap-2 border-b px-4 py-3">
        <div className="from-primary/80 to-primary/40 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br">
          <Bot className="text-primary-foreground h-3.5 w-3.5" />
        </div>
        <h2 className="text-sm font-semibold">{t('chatTitle')}</h2>
        {hasSession && onNewHunt && (
          <Button variant="outline" size="sm" className="ml-auto gap-1.5" onClick={onNewHunt}>
            <Plus className="h-3.5 w-3.5" />
            {t('newSession')}
          </Button>
        )}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-1 px-1 py-4">
          {messages.length === 0 && (
            <EmptyState
              icon={<Crosshair className="h-6 w-6" />}
              title={t('emptyTitle')}
              description={t('emptyDescription')}
              className="py-16"
            />
          )}
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      <HuntInputArea onSend={onSend} disabled={disabled} />
    </div>
  )
}
