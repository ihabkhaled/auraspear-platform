import { useTranslations } from 'next-intl'
import type { ReportKpiCardsProps } from '@/types'

export function useReportKpiCards({ stats }: ReportKpiCardsProps) {
  const t = useTranslations('reports')

  return { t, stats }
}
