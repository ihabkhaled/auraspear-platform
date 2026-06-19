import { useTranslations } from 'next-intl'
import type { CorrelationKpiCardsProps } from '@/types'

export function useCorrelationKpiCards({ stats }: CorrelationKpiCardsProps) {
  const t = useTranslations('correlation')

  return {
    t,
    stats,
  }
}
