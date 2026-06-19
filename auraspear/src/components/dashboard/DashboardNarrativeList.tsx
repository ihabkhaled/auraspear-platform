'use client'

import { cn } from '@/lib/utils'
import type { DashboardNarrativeListProps } from '@/types'

export function DashboardNarrativeList({ items, t }: DashboardNarrativeListProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map(item => (
        <div
          key={item.labelKey}
          className={cn(
            'bg-muted/40 border-border rounded-xl border p-4',
            'hover:bg-muted/60 transition-colors'
          )}
        >
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t(item.labelKey)}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
        </div>
      ))}
    </div>
  )
}
