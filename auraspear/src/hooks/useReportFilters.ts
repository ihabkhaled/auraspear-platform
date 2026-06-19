import { useTranslations } from 'next-intl'

export function useReportFilters() {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
