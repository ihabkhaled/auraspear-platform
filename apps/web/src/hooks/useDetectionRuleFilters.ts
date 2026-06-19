import { useTranslations } from 'next-intl'

export function useDetectionRuleFilters() {
  const t = useTranslations('detectionRules')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
