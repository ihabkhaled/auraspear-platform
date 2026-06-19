import { useTranslations } from 'next-intl'

export function useCloudSecurityFilters() {
  const t = useTranslations('cloudSecurity')
  const tCommon = useTranslations('common')

  return { t, tCommon }
}
