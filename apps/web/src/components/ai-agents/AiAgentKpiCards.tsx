'use client'

import { Bot, DollarSign, Hash, Wifi, Zap } from 'lucide-react'
import { KpiCard } from '@/components/common'
import { useAiAgentKpiCards } from '@/hooks'
import type { AiAgentKpiCardsProps } from '@/types'

export function AiAgentKpiCards(props: AiAgentKpiCardsProps) {
  const { t, totalAgents, onlineAgents, totalSessions, formattedTokens, formattedCost } =
    useAiAgentKpiCards(props)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        label={t('kpiTotalAgents')}
        value={totalAgents}
        icon={<Bot className="h-5 w-5" />}
        accentColor="var(--primary)"
      />
      <KpiCard
        label={t('kpiOnline')}
        value={onlineAgents}
        icon={<Wifi className="h-5 w-5" />}
        accentColor="var(--status-success)"
      />
      <KpiCard
        label={t('kpiTotalSessions')}
        value={totalSessions}
        icon={<Zap className="h-5 w-5" />}
        accentColor="var(--status-info)"
      />
      <KpiCard
        label={t('kpiTotalTokens')}
        value={formattedTokens}
        icon={<Hash className="h-5 w-5" />}
        accentColor={undefined}
      />
      <KpiCard
        label={t('kpiTotalCost')}
        value={formattedCost}
        icon={<DollarSign className="h-5 w-5" />}
        accentColor="var(--status-warning)"
      />
    </div>
  )
}
