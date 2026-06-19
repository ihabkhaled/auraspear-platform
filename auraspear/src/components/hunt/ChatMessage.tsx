'use client'

import { Bot, User } from 'lucide-react'
import { Button } from '@/components/ui'
import { MessageRole } from '@/enums'
import { useChatMessage } from '@/hooks'
import { formatTimestamp } from '@/lib/utils'
import type { ChatMessageProps } from '@/types'
import { ReasoningSteps } from './ReasoningSteps'

export function ChatMessage({ message }: ChatMessageProps) {
  const { t } = useChatMessage()

  if (message.role === MessageRole.SYSTEM) {
    return (
      <div className="flex justify-center px-4 py-2">
        <div className="bg-muted/50 text-muted-foreground max-w-md rounded-lg px-4 py-2 text-center text-xs">
          {message.content}
        </div>
      </div>
    )
  }

  if (message.role === MessageRole.USER) {
    return (
      <div className="flex justify-end gap-3 px-4 py-2">
        <div className="flex max-w-[80%] flex-col items-end gap-1">
          <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-none px-4 py-3 text-sm shadow-[0_0_12px_hsl(var(--primary)/0.3)]">
            {message.content}
          </div>
          <span className="text-muted-foreground text-[10px]">
            {formatTimestamp(message.timestamp)}
          </span>
        </div>
        <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <User className="text-primary h-4 w-4" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 px-4 py-2">
      <div className="from-primary/80 to-primary/40 relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br">
        <Bot className="text-primary-foreground h-4 w-4" />
      </div>
      <div className="flex max-w-[80%] flex-col gap-1">
        <div className="border-primary/20 bg-card relative overflow-hidden rounded-2xl rounded-tl-none border px-4 py-3 text-sm">
          <div className="from-primary/5 pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent" />
          <div className="relative">{message.content}</div>
          {message.reasoningSteps && message.reasoningSteps.length > 0 && (
            <div className="border-border/50 mt-3 border-t pt-3">
              <ReasoningSteps steps={message.reasoningSteps} />
            </div>
          )}
          {message.actions && message.actions.length > 0 && (
            <div className="border-border/50 mt-3 flex flex-wrap gap-2 border-t pt-3">
              {message.actions.map(action => (
                <Button key={action} variant="outline" size="xs" className="text-xs">
                  {action}
                </Button>
              ))}
            </div>
          )}
        </div>
        <span className="text-muted-foreground text-[10px]">
          {t('aiAssistant')} &middot; {formatTimestamp(message.timestamp)}
        </span>
      </div>
    </div>
  )
}
