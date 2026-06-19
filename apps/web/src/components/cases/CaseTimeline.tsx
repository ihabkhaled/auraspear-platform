'use client'

import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui'
import { useCaseTimeline } from '@/hooks'
import { getTypeColor } from '@/lib/case.utils'
import { cn, formatTimestamp } from '@/lib/utils'
import type { CaseTimelineProps } from '@/types'

export function CaseTimeline({ entries }: CaseTimelineProps) {
  const { t, expanded, toggleExpanded, resolveDescription } = useCaseTimeline()

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground text-sm">{t('noTimeline')}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          'overflow-y-auto transition-[max-height] duration-300',
          expanded ? 'max-h-[70vh] sm:max-h-[600px]' : 'max-h-[30vh] sm:max-h-[200px]'
        )}
      >
        <div className="flex flex-col">
          {entries.map((entry, index) => {
            const isLast = index === entries.length - 1
            const color = getTypeColor(entry.type)

            return (
              <div key={entry.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  {!isLast && <div className="bg-border w-px flex-1" />}
                </div>

                <div className={cn('flex flex-col gap-1 pb-6', isLast && 'pb-0')}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{entry.actor}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {resolveDescription(entry.description)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {entries.length > 3 && (
        <Button variant="ghost" size="sm" className="self-center" onClick={toggleExpanded}>
          {expanded ? (
            <>
              <ChevronUp className="me-1 h-4 w-4" />
              {t('showLess')}
            </>
          ) : (
            <>
              <ChevronDown className="me-1 h-4 w-4" />
              {t('showMore')}
            </>
          )}
        </Button>
      )}
    </div>
  )
}
