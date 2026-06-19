'use client'

import { BarChart3 } from 'lucide-react'
import { EmptyState } from '@/components/common'
import { Progress } from '@/components/ui'
import { formatRelativeTime } from '@/lib/utils'
import type { DashboardMetricBarListProps } from '@/types'

export function DashboardMetricBarList({
  items,
  emptyTitle,
  emptyDescription,
  hitCountLabel,
  falsePositiveCountLabel,
  falsePositiveRateLabel,
  createdAtLabel,
  lastTriggeredAtLabel,
}: DashboardMetricBarListProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    )
  }

  const showExtras = Boolean(
    hitCountLabel ??
    falsePositiveCountLabel ??
    falsePositiveRateLabel ??
    createdAtLabel ??
    lastTriggeredAtLabel
  )

  return (
    <div className="space-y-4">
      {items.map(item => (
        <div key={item.id} className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium">{item.label}</p>
            <p className="text-muted-foreground shrink-0 text-sm font-semibold">{item.value}</p>
          </div>
          {showExtras && (
            <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-0.5 text-xs">
              {hitCountLabel !== null && item.hitCount !== null && (
                <span>
                  {hitCountLabel}:{' '}
                  <span className="text-foreground font-medium">{item.hitCount}</span>
                </span>
              )}
              {falsePositiveCountLabel !== null && item.falsePositiveCount !== null && (
                <span>
                  {falsePositiveCountLabel}:{' '}
                  <span className="text-foreground font-medium">{item.falsePositiveCount}</span>
                </span>
              )}
              {falsePositiveRateLabel !== null && item.falsePositiveRate !== null && (
                <span>
                  {falsePositiveRateLabel}:{' '}
                  <span className="text-foreground font-medium">{item.falsePositiveRate}</span>
                </span>
              )}
              {createdAtLabel !== null && item.createdAt && (
                <span>
                  {createdAtLabel}:{' '}
                  <span className="text-foreground font-medium">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </span>
              )}
              {lastTriggeredAtLabel !== null && item.lastTriggeredAt && (
                <span>
                  {lastTriggeredAtLabel}:{' '}
                  <span className="text-foreground font-medium">
                    {formatRelativeTime(item.lastTriggeredAt)}
                  </span>
                </span>
              )}
            </div>
          )}
          <Progress value={item.progress} className="h-1.5" />
        </div>
      ))}
    </div>
  )
}
