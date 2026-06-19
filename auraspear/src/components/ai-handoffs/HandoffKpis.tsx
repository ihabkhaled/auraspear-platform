import { ArrowRightLeft, Clock, Target } from 'lucide-react'
import { KpiCard } from '@/components/common'
import type { AiHandoffStats, TranslationFn } from '@/types'

export function HandoffKpis({
  t,
  stats,
}: {
  t: TranslationFn
  stats: AiHandoffStats | null
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <KpiCard
        label={t('kpi.totalPromotions')}
        value={String(stats?.totalPromotions ?? 0)}
        accentColor={undefined}
        icon={<ArrowRightLeft className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.last24h')}
        value={String(stats?.last24h ?? 0)}
        accentColor={undefined}
        icon={<Clock className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.targetTypes')}
        value={String(stats?.byTarget?.length ?? 0)}
        accentColor={undefined}
        icon={<Target className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.agentsInvolved')}
        value={String(stats?.byAgent?.length ?? 0)}
        accentColor={undefined}
        icon={<Target className="h-4 w-4" />}
      />
    </div>
  )
}
