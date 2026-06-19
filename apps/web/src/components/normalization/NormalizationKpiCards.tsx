'use client'

import { AlertTriangle, CheckCircle2, Layers, XCircle } from 'lucide-react'
import { KpiCard } from '@/components/common'
import { useNormalizationKpiCards } from '@/hooks'
import type { NormalizationKpiCardsProps } from '@/types'

export function NormalizationKpiCards({ stats }: NormalizationKpiCardsProps) {
  const { t, totalProcessedDisplay } = useNormalizationKpiCards({ stats })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <KpiCard
        label={t('kpiTotal')}
        value={stats?.totalPipelines ?? 0}
        icon={<Layers className="h-5 w-5" />}
        accentColor="var(--primary)"
      />
      <KpiCard
        label={t('kpiActive')}
        value={stats?.activePipelines ?? 0}
        icon={<CheckCircle2 className="h-5 w-5" />}
        accentColor="var(--status-success)"
      />
      <KpiCard
        label={t('kpiError')}
        value={stats?.errorPipelines ?? 0}
        icon={<XCircle className="h-5 w-5" />}
        accentColor="var(--status-error)"
      />
      <KpiCard
        label={t('kpiTotalProcessed')}
        value={totalProcessedDisplay}
        icon={<AlertTriangle className="h-5 w-5" />}
        accentColor="var(--status-info)"
      />
    </div>
  )
}
