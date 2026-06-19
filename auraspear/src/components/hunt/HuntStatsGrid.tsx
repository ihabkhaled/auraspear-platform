'use client'

import { Activity, Globe, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { useHuntStatsGrid } from '@/hooks'
import { formatNumber } from '@/lib/utils'
import type { HuntStatsGridProps } from '@/types'

export function HuntStatsGrid({ eventsFound, uniqueIps, threatScore }: HuntStatsGridProps) {
  const { t } = useHuntStatsGrid()

  const stats = [
    {
      key: 'eventsFound',
      label: t('statsEventsFound'),
      value: formatNumber(eventsFound),
      icon: Activity,
      colorVar: 'var(--status-info)',
    },
    {
      key: 'uniqueIps',
      label: t('statsUniqueIps'),
      value: formatNumber(uniqueIps),
      icon: Globe,
      colorVar: 'var(--status-warning)',
    },
    {
      key: 'threatScore',
      label: t('statsThreatScore'),
      value: String(threatScore),
      icon: ShieldAlert,
      colorVar: 'var(--status-error)',
    },
  ] as const

  return (
    <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
      {stats.map(stat => {
        const Icon = stat.icon

        return (
          <Card key={stat.key} className="relative overflow-hidden py-4">
            <CardContent className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: `color-mix(in srgb, ${stat.colorVar} 12%, transparent)`,
                  color: stat.colorVar,
                }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground text-xs">{stat.label}</span>
                <span className="text-xl font-bold tracking-tight">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
