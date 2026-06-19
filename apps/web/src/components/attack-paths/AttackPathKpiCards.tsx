'use client'

import { Network, Shield, Target } from 'lucide-react'
import { KpiCard } from '@/components/common'
import type { AttackPathKpiCardsProps } from '@/types'

export function AttackPathKpiCards({ stats, t }: AttackPathKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <KpiCard
        label={t('kpiActivePaths')}
        value={stats?.activePaths ?? 0}
        icon={<Network className="h-5 w-5" />}
        accentColor="var(--status-error)"
      />
      <KpiCard
        label={t('kpiAssetsAtRisk')}
        value={stats?.assetsAtRisk ?? 0}
        icon={<Target className="h-5 w-5" />}
        accentColor="var(--status-warning)"
      />
      <KpiCard
        label={t('kpiKillChainCoverage')}
        value={`${stats?.avgKillChainCoverage ?? 0}%`}
        icon={<Shield className="h-5 w-5" />}
        accentColor="var(--primary)"
      />
    </div>
  )
}
