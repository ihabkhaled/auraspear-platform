'use client'

import { Activity } from 'lucide-react'
import { Progress } from '@/components/ui'
import { useSidebarHealthFooter } from '@/hooks'
import { cn } from '@/lib/utils'
import type { SidebarHealthFooterProps } from '@/types'

export function SidebarHealthFooter({
  collapsed,
  healthPercent,
  servicesOnline,
  totalServices,
  maxLatencyMs,
}: SidebarHealthFooterProps) {
  const { t, statusClass, bgClass } = useSidebarHealthFooter(healthPercent)

  if (collapsed) {
    return (
      <div className="border-sidebar-border border-t p-3">
        <div className="flex items-center justify-center">
          <div className="relative">
            <Activity className={cn('h-4 w-4', statusClass)} />
            <span className={cn('absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full', bgClass)} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="border-sidebar-border border-t p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs font-medium">{t('systemHealth')}</span>
          <span className={cn('text-xs font-bold', statusClass)}>{healthPercent}%</span>
        </div>
        <Progress value={healthPercent} className="h-1.5" />
        <div className="text-muted-foreground flex items-center justify-between text-[10px]">
          <div className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', bgClass)} />
            <span>
              {t('servicesOnline')}: {servicesOnline}/{totalServices}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="bg-status-info h-1.5 w-1.5 rounded-full" />
            <span>
              {t('lag')}: {maxLatencyMs}ms
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
