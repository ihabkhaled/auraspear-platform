'use client'

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useServiceHealthCard } from '@/hooks'
import { getStatusDotClass, getStatusBgHint, getStatusLabel } from '@/lib/health-utils'
import { cn } from '@/lib/utils'
import type { ServiceHealthCardProps } from '@/types'

export function ServiceHealthCard({ service }: ServiceHealthCardProps) {
  const { t } = useServiceHealthCard()

  const latencyDisplay = service.latencyMs >= 0 ? `${service.latencyMs}ms` : '-'

  return (
    <Card className={cn('transition-colors', getStatusBgHint(service.status))}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'inline-block h-2.5 w-2.5 rounded-full',
              getStatusDotClass(service.status)
            )}
          />
          {service.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-muted-foreground">{t('services.status')}</span>
          <span className="font-medium">{getStatusLabel(service.status, t)}</span>

          <span className="text-muted-foreground">{t('services.type')}</span>
          <span className="font-mono text-xs">{service.type}</span>

          <span className="text-muted-foreground">{t('services.latency')}</span>
          <span className="font-mono text-xs">{latencyDisplay}</span>
        </div>
      </CardContent>
    </Card>
  )
}
