import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { AiAgentKpiCardsProps } from '@/types'

export function useAiAgentKpiCards({ stats }: AiAgentKpiCardsProps) {
  const t = useTranslations('aiAgents')

  const formattedTokens = useMemo(
    () => (stats?.totalTokens ?? 0).toLocaleString(),
    [stats?.totalTokens]
  )

  const formattedCost = useMemo(() => `$${(stats?.totalCost ?? 0).toFixed(2)}`, [stats?.totalCost])

  return {
    t,
    totalAgents: stats?.totalAgents ?? 0,
    onlineAgents: stats?.onlineAgents ?? 0,
    totalSessions: stats?.totalSessions ?? 0,
    formattedTokens,
    formattedCost,
  }
}
