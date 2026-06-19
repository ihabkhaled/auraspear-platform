'use client'

import { AlertTriangle, CheckCircle2, FlaskConical, ShieldCheck } from 'lucide-react'
import { KpiCard } from '@/components/common'
import { useDetectionRuleKpiCards } from '@/hooks'
import type { DetectionRuleKpiCardsProps } from '@/types'

export function DetectionRuleKpiCards({ stats }: DetectionRuleKpiCardsProps) {
  const { t } = useDetectionRuleKpiCards({ stats })

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4">
      <KpiCard
        label={t('kpiTotal')}
        value={stats?.totalRules ?? 0}
        icon={<ShieldCheck className="h-5 w-5" />}
        accentColor="var(--primary)"
      />
      <KpiCard
        label={t('kpiEnabled')}
        value={stats?.activeRules ?? 0}
        icon={<CheckCircle2 className="h-5 w-5" />}
        accentColor="var(--status-success)"
      />
      <KpiCard
        label={t('kpiTesting')}
        value={stats?.testingRules ?? 0}
        icon={<FlaskConical className="h-5 w-5" />}
        accentColor="var(--status-info)"
      />
      <KpiCard
        label={t('kpiMatches30d')}
        value={stats?.totalMatches ?? 0}
        icon={<AlertTriangle className="h-5 w-5" />}
        accentColor="var(--status-warning)"
      />
    </div>
  )
}
