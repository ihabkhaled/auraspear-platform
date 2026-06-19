'use client'

import { Plus } from 'lucide-react'
import { Button, Input, ScrollArea } from '@/components/ui'
import { useIncidentTimelineComponent } from '@/hooks'
import {
  INCIDENT_ACTOR_TYPE_CLASSES,
  INCIDENT_TIMELINE_DOT_CLASSES,
} from '@/lib/constants/incidents'
import { cn, formatRelativeTime, lookup } from '@/lib/utils'
import type { IncidentTimelineProps } from '@/types'

export function IncidentTimeline({ incidentId }: IncidentTimelineProps) {
  const { t, entries, isLoading, newEvent, setNewEvent, handleAddEntry, isAdding, canAddTimeline } =
    useIncidentTimelineComponent(incidentId)

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{t('incidentTimeline')}</h3>

      {canAddTimeline && (
        <div className="flex items-center gap-2">
          <Input
            placeholder={t('timelineEvent')}
            value={newEvent}
            onChange={e => setNewEvent(e.currentTarget.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddEntry()
              }
            }}
            className="flex-1"
          />
          <Button
            size="sm"
            onClick={handleAddEntry}
            disabled={isAdding || newEvent.trim().length === 0}
          >
            <Plus className="h-4 w-4" />
            {t('addTimelineEntry')}
          </Button>
        </div>
      )}

      {isLoading && (
        <div className="text-muted-foreground py-4 text-center text-sm">{t('loading')}</div>
      )}
      {!isLoading && entries.length === 0 && (
        <div className="text-muted-foreground py-4 text-center text-sm">{t('timelineEmpty')}</div>
      )}
      {!isLoading && entries.length > 0 && (
        <ScrollArea className="max-h-80">
          <div className="relative space-y-0 ps-6">
            <div className="bg-border absolute start-2.5 top-0 h-full w-px" />

            {entries.map(entry => {
              const dotClass =
                lookup(INCIDENT_TIMELINE_DOT_CLASSES, entry.actorType) ?? 'bg-muted-foreground'
              const actorClass =
                lookup(INCIDENT_ACTOR_TYPE_CLASSES, entry.actorType) ??
                'bg-muted text-muted-foreground'

              return (
                <div key={entry.id} className="relative flex gap-3 pb-4">
                  <div
                    className={cn(
                      'ring-background absolute start-[-18px] top-1.5 h-2.5 w-2.5 rounded-full ring-2',
                      dotClass
                    )}
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex rounded px-1.5 py-0.5 text-xs font-medium',
                          actorClass
                        )}
                      >
                        {entry.actorName}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {formatRelativeTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm">{entry.event}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
