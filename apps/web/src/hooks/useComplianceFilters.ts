import { useTranslations } from 'next-intl'

export function useComplianceFilters() {
  const t = useTranslations('compliance')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
