import { useTranslations } from 'next-intl'

export function useNormalizationFilters() {
  const t = useTranslations('normalization')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
