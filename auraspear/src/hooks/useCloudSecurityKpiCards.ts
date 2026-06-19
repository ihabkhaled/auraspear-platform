import { useTranslations } from 'next-intl'

export function useCloudSecurityKpiCards() {
  const t = useTranslations('cloudSecurity')

  return { t }
}
