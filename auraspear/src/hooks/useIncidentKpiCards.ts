import { useTranslations } from 'next-intl'
import { formatAvgResolveHours } from '@/lib/incident.utils'
import type { IncidentStats } from '@/types'

export function useIncidentKpiCards(stats: IncidentStats | undefined) {
  const t = useTranslations('incidents')

  const avgResolveDisplay = formatAvgResolveHours(stats?.avgResolveHours)

  return {
    t,
    open: stats?.open ?? 0,
    inProgress: stats?.inProgress ?? 0,
    contained: stats?.contained ?? 0,
    resolved30d: stats?.resolved30d ?? 0,
    avgResolveDisplay,
  }
}
