import { useTranslations } from 'next-intl'

export function useSoarFilters() {
  const t = useTranslations('soar')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
