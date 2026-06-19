'use client'

import { PlusCircle, CheckCircle, XCircle, AlertTriangle, Search, Circle } from 'lucide-react'
import { AlertTimelineEventType } from '@/enums'
import { useAlertTimelineComponent } from '@/hooks'
import { formatTimestamp, cn } from '@/lib/utils'
import type { AlertTimelineProps, AlertTimelineEvent } from '@/types'

function TimelineIcon({ type, className }: { type: AlertTimelineEventType; className?: string }) {
  const iconClass = cn('h-4 w-4', className)

  switch (type) {
    case AlertTimelineEventType.CREATED:
      return <PlusCircle className={iconClass} />
    case AlertTimelineEventType.ACKNOWLEDGED:
      return <CheckCircle className={iconClass} />
    case AlertTimelineEventType.CLOSED:
    case AlertTimelineEventType.RESOLVED:
      return <XCircle className={iconClass} />
    case AlertTimelineEventType.ESCALATED:
      return <AlertTriangle className={iconClass} />
    case AlertTimelineEventType.INVESTIGATED:
      return <Search className={iconClass} />
    default:
      return <Circle className={iconClass} />
  }
}

function TimelineEntry({
  event,
  isLast,
  getEventColor,
}: {
  event: AlertTimelineEvent
  isLast: boolean
  getEventColor: (type: AlertTimelineEventType) => string
}) {
  const colorClass = getEventColor(event.type)

  return (
    <div className="relative flex gap-3 pb-6">
      {!isLast && <div className="bg-border absolute start-[7px] top-6 h-full w-px" />}
      <div className="relative z-10 flex shrink-0 items-center justify-center">
        <TimelineIcon type={event.type} className={colorClass} />
      </div>
      <div className="flex-1 pt-0.5">
        <p className="text-sm font-medium">{event.detail}</p>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
          <span>{formatTimestamp(event.timestamp)}</span>
          {event.actor && (
            <>
              <span className="text-muted-foreground">-</span>
              <span>{event.actor}</span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function AlertTimeline({ alert }: AlertTimelineProps) {
  const { t, derivedTimeline, getEventColor } = useAlertTimelineComponent(alert)

  if (derivedTimeline.length === 0) {
    return <p className="text-muted-foreground text-sm">{t('noTimeline')}</p>
  }

  return (
    <div className="space-y-0">
      <h4 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
        {t('timeline')}
      </h4>
      <div>
        {derivedTimeline.map((event, index) => (
          <TimelineEntry
            key={event.id}
            event={event}
            isLast={index === derivedTimeline.length - 1}
            getEventColor={getEventColor}
          />
        ))}
      </div>
    </div>
  )
}
