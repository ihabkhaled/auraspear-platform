'use client'

import { CheckCircle, Clock } from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import { useUebaAnomalyCard } from '@/hooks'
import { UEBA_RISK_LEVEL_LABEL_KEYS } from '@/lib/constants/ueba'
import { formatRelativeTime, lookup } from '@/lib/utils'
import type { UebaAnomalyCardProps } from '@/types'

export function UebaAnomalyCard({ anomaly, onResolve, resolving }: UebaAnomalyCardProps) {
  const { t, severityVariant, handleResolve } = useUebaAnomalyCard({
    anomaly,
    onResolve,
  })

  return (
    <div className="bg-card border-border flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{anomaly.anomalyType}</span>
        <Badge variant={severityVariant}>
          {t(lookup(UEBA_RISK_LEVEL_LABEL_KEYS, anomaly.severity))}
        </Badge>
      </div>

      <p className="text-muted-foreground text-xs">{anomaly.description}</p>

      <div className="flex items-center justify-between gap-2">
        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(anomaly.detectedAt)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-xs font-medium">
            {t('score')}: {anomaly.score}
          </span>
          {anomaly.resolved ? (
            <span className="bg-status-success inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-white">
              <CheckCircle className="h-3 w-3" />
              {t('resolved')}
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={handleResolve} disabled={resolving}>
              {resolving ? t('resolving') : t('resolve')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
