import { useTranslations } from 'next-intl'
import type { NormalizationKpiCardsProps } from '@/types'

export function useNormalizationKpiCards({ stats }: Pick<NormalizationKpiCardsProps, 'stats'>) {
  const t = useTranslations('normalization')

  const totalProcessedDisplay =
    stats?.totalEventsProcessed !== null && stats?.totalEventsProcessed !== undefined
      ? stats.totalEventsProcessed.toLocaleString()
      : '-'

  return { t, totalProcessedDisplay }
}
