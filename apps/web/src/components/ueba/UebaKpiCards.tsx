'use client'

import { AlertTriangle, Brain, ShieldAlert, Users } from 'lucide-react'
import { KpiCard } from '@/components/common'
import { useUebaKpiCards } from '@/hooks'
import type { UebaKpiCardsProps } from '@/types'

export function UebaKpiCards({ stats }: UebaKpiCardsProps) {
  const { t, totalEntities, criticalRisk, highRisk, anomalies24h, activeModels } = useUebaKpiCards({
    stats,
  })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <KpiCard
        label={t('kpiEntities')}
        value={totalEntities}
        icon={<Users className="h-5 w-5" />}
        accentColor="var(--primary)"
      />
      <KpiCard
        label={t('kpiCritical')}
        value={criticalRisk}
        icon={<ShieldAlert className="h-5 w-5" />}
        accentColor="var(--severity-critical)"
      />
      <KpiCard
        label={t('kpiHigh')}
        value={highRisk}
        icon={<AlertTriangle className="h-5 w-5" />}
        accentColor="var(--severity-high)"
      />
      <KpiCard
        label={t('kpiAnomalies')}
        value={anomalies24h}
        icon={<AlertTriangle className="h-5 w-5" />}
        accentColor="var(--status-warning)"
      />
      <KpiCard
        label={t('kpiModels')}
        value={activeModels}
        icon={<Brain className="h-5 w-5" />}
        accentColor="var(--status-success)"
      />
    </div>
  )
}
