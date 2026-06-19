import { useTranslations } from 'next-intl'

export function useSecurityIndicators() {
  const t = useTranslations('connectors')

  return { t }
}
