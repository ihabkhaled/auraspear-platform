'use client'

import { Brain, Database } from 'lucide-react'
import { Badge } from '@/components/ui'
import { useUebaMlModelCard } from '@/hooks'
import {
  ML_MODEL_STATUS_LABEL_KEYS,
  ML_MODEL_STATUS_CLASSES,
  ML_MODEL_TYPE_LABEL_KEYS,
} from '@/lib/constants/ueba'
import { formatDate, lookup } from '@/lib/utils'
import type { UebaMlModelCardProps } from '@/types'

export function UebaMlModelCard({ model }: UebaMlModelCardProps) {
  const { t } = useUebaMlModelCard()

  return (
    <div className="bg-card border-border flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Brain className="text-muted-foreground h-4 w-4" />
          <span className="text-sm font-medium">{model.name}</span>
        </div>
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${lookup(ML_MODEL_STATUS_CLASSES, model.status)}`}
        >
          {t(lookup(ML_MODEL_STATUS_LABEL_KEYS, model.status))}
        </span>
      </div>

      {model.description && <p className="text-muted-foreground text-xs">{model.description}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="secondary">{t(lookup(ML_MODEL_TYPE_LABEL_KEYS, model.modelType))}</Badge>

        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <span>{t('accuracy')}:</span>
          <span className="font-medium">{model.accuracy}%</span>
        </div>

        <div className="text-muted-foreground flex items-center gap-1 text-xs">
          <Database className="h-3 w-3" />
          <span>{model.dataPointsProcessed.toLocaleString()}</span>
        </div>
      </div>

      {model.lastTrainedAt && (
        <p className="text-muted-foreground text-xs">
          {t('lastTrained')}: {formatDate(model.lastTrainedAt)}
        </p>
      )}
    </div>
  )
}
