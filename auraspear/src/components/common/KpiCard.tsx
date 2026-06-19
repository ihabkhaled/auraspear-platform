'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { KPICardProps } from '@/types'

export function KpiCard({
  label,
  value,
  trend,
  trendLabel,
  icon,
  accentColor,
  onClick,
}: KPICardProps) {
  const isTrendPositive = trend !== undefined && trend >= 0

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        onClick && 'hover:bg-muted/50 cursor-pointer transition-colors'
      )}
      onClick={onClick}
    >
      {accentColor && (
        <div
          className="pointer-events-none absolute inset-0 opacity-5 blur-2xl"
          style={{ backgroundColor: accentColor }}
        />
      )}
      <CardContent className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: accentColor
              ? `color-mix(in srgb, ${accentColor} 12%, transparent)`
              : undefined,
            color: accentColor,
          }}
        >
          {icon}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-muted-foreground text-sm">{label}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            {trend !== undefined && (
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  isTrendPositive ? 'text-status-success' : 'text-status-error'
                )}
              >
                {isTrendPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(trend)}%
              </span>
            )}
          </div>
          {trendLabel && <p className="text-muted-foreground text-xs">{trendLabel}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
