import { useTranslations } from 'next-intl'
import type { SystemHealthKpiCardsProps } from '@/types'

export function useSystemHealthKpiCards({ stats }: Pick<SystemHealthKpiCardsProps, 'stats'>) {
  const t = useTranslations('systemHealth')

  const avgResponseTime =
    stats?.avgResponseTimeMs !== null && stats?.avgResponseTimeMs !== undefined
      ? `${stats.avgResponseTimeMs.toFixed(0)}ms`
      : '-'

  const uptimePercent =
    stats?.totalServices && stats.totalServices > 0
      ? `${(((stats.totalServices - (stats.downServices ?? 0)) / stats.totalServices) * 100).toFixed(1)}%`
      : '-'

  return { t, avgResponseTime, uptimePercent }
}
