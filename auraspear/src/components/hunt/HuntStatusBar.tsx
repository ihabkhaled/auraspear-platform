'use client'

import { useHuntStatusBar } from '@/hooks'
import { HUNT_STATUS_CONFIG } from '@/lib/constants/hunt'
import { cn, lookup } from '@/lib/utils'
import type { HuntStatusBarProps } from '@/types'

export function HuntStatusBar({ sessionId, status }: HuntStatusBarProps) {
  const { t } = useHuntStatusBar()
  const config = lookup(HUNT_STATUS_CONFIG, status)

  return (
    <div className="border-border bg-card/50 flex items-center justify-between border-b px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {config.animate && (
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                  config.dotClass
                )}
              />
            )}
            <span
              className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', config.dotClass)}
            />
          </span>
          <span className="text-muted-foreground text-xs">{t(config.labelKey)}</span>
        </div>
      </div>
      <span className="text-muted-foreground font-mono text-xs">{sessionId}</span>
    </div>
  )
}
