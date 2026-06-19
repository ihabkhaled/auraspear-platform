'use client'

import { useTranslations } from 'next-intl'
import { useMsspPortfolio, useMsspComparison } from './useMsspDashboard'

export function useMsspDashboardPage() {
  const t = useTranslations('msspDashboard')

  const { data: portfolioData, isFetching: portfolioLoading } = useMsspPortfolio()
  const { data: comparisonData, isFetching: comparisonLoading } = useMsspComparison()

  return {
    t,
    portfolioData,
    portfolioLoading,
    comparisonData,
    comparisonLoading,
  }
}
