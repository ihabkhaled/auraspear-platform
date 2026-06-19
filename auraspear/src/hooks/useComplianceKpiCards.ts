import { useTranslations } from 'next-intl'
import type { ComplianceKpiCardsProps } from '@/types'

export function useComplianceKpiCards({ stats }: ComplianceKpiCardsProps) {
  const t = useTranslations('compliance')

  const avgScoreDisplay =
    stats?.avgComplianceScore !== null && stats?.avgComplianceScore !== undefined
      ? `${Math.round(stats.avgComplianceScore)}%`
      : '-'

  return {
    t,
    avgScoreDisplay,
  }
}
