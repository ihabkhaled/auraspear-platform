import { useTranslations } from 'next-intl'

export function useIntelStatsGrid() {
  const t = useTranslations('intel')

  return { t }
}
