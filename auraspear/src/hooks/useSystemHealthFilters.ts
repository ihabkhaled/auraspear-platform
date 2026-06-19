import { useTranslations } from 'next-intl'

export function useSystemHealthFilters() {
  const t = useTranslations('systemHealth')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
