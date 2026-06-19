'use client'

import { ScrollArea } from '@/components/ui'
import type { HuntResultsPanelProps } from '@/types'
import { HuntEventTable } from './HuntEventTable'
import { HuntStatsGrid } from './HuntStatsGrid'
import { HuntStatusBar } from './HuntStatusBar'

export function HuntResultsPanel({
  sessionId,
  status,
  eventsFound,
  uniqueIps,
  threatScore,
  events,
  loading = false,
  page,
  totalPages,
  total,
  onPageChange,
}: HuntResultsPanelProps) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <HuntStatusBar sessionId={sessionId} status={status} />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          <HuntStatsGrid
            eventsFound={eventsFound}
            uniqueIps={uniqueIps}
            threatScore={threatScore}
          />
          <HuntEventTable
            events={events}
            loading={loading}
            page={page ?? 1}
            totalPages={totalPages ?? 1}
            total={total ?? 0}
            onPageChange={onPageChange ?? (() => {})}
          />
        </div>
      </ScrollArea>
    </div>
  )
}
