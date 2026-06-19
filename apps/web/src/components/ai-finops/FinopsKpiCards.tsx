import { DollarSign, Hash, TrendingUp, Wallet } from 'lucide-react'
import { KpiCard } from '@/components/common'
import type { TranslationFn } from '@/types'

export function FinopsKpiCards({
  t,
  formattedCost,
  formattedTokens,
  formattedRequests,
  formattedProjection,
  budgetLabel,
  budgetPct,
}: {
  t: TranslationFn
  formattedCost: string
  formattedTokens: string
  formattedRequests: string
  formattedProjection: string
  budgetLabel: string
  budgetPct: number
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        label={t('kpi.totalCost')}
        value={formattedCost}
        accentColor={undefined}
        icon={<DollarSign className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.totalTokens')}
        value={formattedTokens}
        accentColor={undefined}
        icon={<Hash className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.totalRequests')}
        value={formattedRequests}
        accentColor={undefined}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.projected')}
        value={formattedProjection}
        accentColor={undefined}
        icon={<TrendingUp className="h-4 w-4" />}
      />
      <KpiCard
        label={t('kpi.budget')}
        value={budgetLabel}
        accentColor={undefined}
        icon={<Wallet className="h-4 w-4" />}
        trendLabel={budgetPct > 0 ? `${String(budgetPct)}% ${t('kpi.budgetUsed')}` : undefined}
      />
    </div>
  )
}
