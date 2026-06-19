'use client'

import { AlertTriangle, CheckCircle2, ClipboardList, ShieldCheck } from 'lucide-react'
import { KpiCard } from '@/components/common'
import { useComplianceKpiCards } from '@/hooks'
import type { ComplianceKpiCardsProps } from '@/types'

export function ComplianceKpiCards({ stats }: ComplianceKpiCardsProps) {
  const { t, avgScoreDisplay } = useComplianceKpiCards({ stats })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <KpiCard
        label={t('kpiFrameworks')}
        value={stats?.totalFrameworks ?? 0}
        icon={<ClipboardList className="h-5 w-5" />}
        accentColor="var(--primary)"
      />
      <KpiCard
        label={t('kpiAvgScore')}
        value={avgScoreDisplay}
        icon={<ShieldCheck className="h-5 w-5" />}
        accentColor="var(--status-success)"
      />
      <KpiCard
        label={t('kpiPassed')}
        value={stats?.passedControls ?? 0}
        icon={<CheckCircle2 className="h-5 w-5" />}
        accentColor="var(--status-success)"
      />
      <KpiCard
        label={t('kpiFailed')}
        value={stats?.failedControls ?? 0}
        icon={<AlertTriangle className="h-5 w-5" />}
        accentColor="var(--status-error)"
      />
      <KpiCard
        label={t('kpiNotAssessed')}
        value={stats?.notAssessedControls ?? 0}
        icon={<ClipboardList className="h-5 w-5" />}
        accentColor={undefined}
      />
    </div>
  )
}
