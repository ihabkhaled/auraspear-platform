'use client'

import { Activity, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { KpiCard } from '@/components/common'
import { useSystemHealthKpiCards } from '@/hooks'
import type { SystemHealthKpiCardsProps } from '@/types'

export function SystemHealthKpiCards({ stats }: SystemHealthKpiCardsProps) {
  const { t, avgResponseTime } = useSystemHealthKpiCards({ stats })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      <KpiCard
        label={t('kpiTotalServices')}
        value={stats?.totalServices ?? 0}
        icon={<Activity className="h-5 w-5" />}
        accentColor="var(--primary)"
      />
      <KpiCard
        label={t('kpiHealthy')}
        value={stats?.healthyServices ?? 0}
        icon={<CheckCircle2 className="h-5 w-5" />}
        accentColor="var(--status-success)"
      />
      <KpiCard
        label={t('kpiDegraded')}
        value={stats?.degradedServices ?? 0}
        icon={<AlertTriangle className="h-5 w-5" />}
        accentColor="var(--status-warning)"
      />
      <KpiCard
        label={t('kpiDown')}
        value={stats?.downServices ?? 0}
        icon={<XCircle className="h-5 w-5" />}
        accentColor="var(--status-error)"
      />
      <KpiCard
        label={t('kpiAvgResponseTime')}
        value={avgResponseTime}
        icon={<Clock className="h-5 w-5" />}
        accentColor="var(--status-info)"
      />
    </div>
  )
}
