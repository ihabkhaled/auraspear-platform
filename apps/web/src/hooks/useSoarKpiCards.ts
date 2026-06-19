import { useTranslations } from 'next-intl'
import type { SoarKpiCardsProps } from '@/types'

export function useSoarKpiCards({ stats }: SoarKpiCardsProps) {
  const t = useTranslations('soar')

  const avgDurationDisplay =
    stats?.avgDurationSeconds !== null && stats?.avgDurationSeconds !== undefined
      ? `${Math.round(stats.avgDurationSeconds)}s`
      : '-'

  const successRateDisplay =
    stats?.successRate !== null && stats?.successRate !== undefined
      ? `${Math.round(stats.successRate)}%`
      : '-'

  return {
    t,
    avgDurationDisplay,
    successRateDisplay,
  }
}
