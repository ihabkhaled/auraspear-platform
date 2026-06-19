'use client'

import { AlertTriangle, Cloud, Link2, ShieldAlert } from 'lucide-react'
import { KpiCard } from '@/components/common'
import { useCloudSecurityKpiCards } from '@/hooks'
import type { CloudSecurityKpiCardsProps } from '@/types'

export function CloudSecurityKpiCards({ stats }: CloudSecurityKpiCardsProps) {
  const { t } = useCloudSecurityKpiCards()

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label={t('kpiAccounts')}
        value={stats?.totalAccounts ?? 0}
        icon={<Cloud className="h-5 w-5" />}
        accentColor="var(--primary)"
      />
      <KpiCard
        label={t('kpiOpenFindings')}
        value={stats?.openFindings ?? 0}
        icon={<ShieldAlert className="h-5 w-5" />}
        accentColor="var(--status-error)"
      />
      <KpiCard
        label={t('kpiCriticalFindings')}
        value={stats?.criticalFindings ?? 0}
        icon={<AlertTriangle className="h-5 w-5" />}
        accentColor="var(--severity-critical)"
      />
      <KpiCard
        label={t('kpiConnected')}
        value={stats?.connectedAccounts ?? 0}
        icon={<Link2 className="h-5 w-5" />}
        accentColor="var(--status-success)"
      />
    </div>
  )
}
