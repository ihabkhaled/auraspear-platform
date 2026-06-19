'use client'

import { Blocks, Clock, Coins, Cpu, Hash, Zap } from 'lucide-react'
import {
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from '@/components/ui'
import { getSessionStatusBadgeProps } from '@/lib/ai-agent.utils'
import { cn } from '@/lib/utils'
import type { AiAgentSessionDetailDialogProps } from '@/types'

export function AiAgentSessionDetailDialog({
  session,
  open,
  onClose,
  t,
  formattedDuration,
  formattedCost,
  formattedTokens,
  formattedStartedAt,
  formattedCompletedAt,
}: AiAgentSessionDetailDialogProps) {
  if (!session) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('sessionDetailTitle')}</DialogTitle>
          <DialogDescription>{t('sessionDetailDescription')}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="flex flex-col gap-4 pe-4">
            <div className="flex items-center gap-2">
              <Badge
                variant={getSessionStatusBadgeProps(session.status).variant}
                className={cn('capitalize', getSessionStatusBadgeProps(session.status).className)}
              >
                {session.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                <Hash className="text-muted-foreground h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('colTokens')}</p>
                  <p className="text-foreground font-mono text-sm font-semibold">
                    {formattedTokens}
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                <Coins className="text-muted-foreground h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('colCost')}</p>
                  <p className="text-foreground font-mono text-sm font-semibold">{formattedCost}</p>
                </div>
              </div>
              <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                <Zap className="text-muted-foreground h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('sessionDuration')}</p>
                  <p className="text-foreground font-mono text-sm font-semibold">
                    {formattedDuration}
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                <Clock className="text-muted-foreground h-4 w-4 shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">{t('sessionStarted')}</p>
                  <p className="text-foreground text-xs font-medium">{formattedStartedAt}</p>
                </div>
              </div>
            </div>

            {(session.provider ?? session.model) && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {session.provider && (
                  <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                    <Blocks className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">{t('sessionProvider')}</p>
                      <p className="text-foreground text-sm font-semibold uppercase">
                        {session.provider}
                      </p>
                    </div>
                  </div>
                )}
                {session.model && (
                  <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                    <Cpu className="text-muted-foreground h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-muted-foreground text-xs">{t('colModel')}</p>
                      <p className="text-foreground font-mono text-xs font-medium">
                        {session.model}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {session.errorMessage && (
              <div className="bg-status-error border-status-error flex flex-col gap-1 rounded-lg border p-3">
                <p className="text-status-error text-sm font-semibold">{t('sessionError')}</p>
                <p className="text-status-error text-xs whitespace-pre-wrap">
                  {session.errorMessage}
                </p>
              </div>
            )}

            {session.completedAt && (
              <div className="text-muted-foreground text-xs">
                {t('sessionCompleted')}: {formattedCompletedAt}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <p className="text-foreground text-sm font-semibold">{t('sessionInput')}</p>
              <div className="bg-muted/50 border-border rounded-lg border p-3">
                <p className="text-foreground text-sm whitespace-pre-wrap">{session.input}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-foreground text-sm font-semibold">{t('sessionOutput')}</p>
              <div className="bg-muted/50 border-border rounded-lg border p-3">
                <p className="text-foreground text-sm whitespace-pre-wrap">
                  {session.output ?? '—'}
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
