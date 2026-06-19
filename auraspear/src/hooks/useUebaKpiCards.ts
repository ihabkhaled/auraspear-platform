import { useTranslations } from 'next-intl'
import type { UebaKpiCardsProps } from '@/types'

export function useUebaKpiCards({ stats }: UebaKpiCardsProps) {
  const t = useTranslations('ueba')

  return {
    t,
    totalEntities: stats?.totalEntities ?? 0,
    criticalRisk: stats?.criticalRiskEntities ?? 0,
    highRisk: stats?.highRiskEntities ?? 0,
    anomalies24h: stats?.anomalies24h ?? 0,
    activeModels: stats?.activeModels ?? 0,
  }
}
